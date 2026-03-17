'use strict';

const { getStripeClient, isStripeEnabled } = require('../config/stripe');
const { getRedisClient, isRedisEnabled } = require('../config/redis');
const { db, firebaseEnabled } = require('../config/firebase');
const { env } = require('../config/env');
const walletService = require('../services/wallet.service');
const notificationService = require('../services/notification.service');
const { ServiceUnavailableError, ValidationError, WebhookVerificationError } = require('../utils/errors');
const { centsToDisplay } = require('../utils/currency');
const { sanitizeString } = require('../utils/sanitize');

/**
 * Check if a Stripe session has already been processed.
 * Uses Redis first; falls back to Firestore when Redis is unavailable.
 * @param {string} sessionId - Stripe session ID.
 * @returns {Promise<boolean>} True if already processed.
 */
async function isSessionProcessed(sessionId) {
  // 1. Check Redis
  if (isRedisEnabled()) {
    try {
      const redis = getRedisClient();
      const exists = await redis.exists(`processed_session:${sessionId}`);
      if (exists) return true;
    } catch (err) {
      console.warn('Redis check failed, falling back to Firestore:', err.message);
    }
  }

  // 2. Fallback: Check Firestore
  if (firebaseEnabled) {
    const doc = await db.collection('processed_sessions').doc(sessionId).get();
    if (doc.exists) return true;
  }

  return false;
}

/**
 * Mark a Stripe session as processed in both Redis and Firestore.
 * Writes to both stores for consistency.
 * @param {string} sessionId - Stripe session ID.
 * @param {string} userId - User who was credited.
 * @param {number} amountCents - Amount credited.
 */
async function markSessionProcessed(sessionId, userId, amountCents) {
  // Write to Redis (best-effort)
  if (isRedisEnabled()) {
    try {
      const redis = getRedisClient();
      await redis.set(`processed_session:${sessionId}`, '1', 'EX', 86400);
    } catch (err) {
      console.warn('Redis mark-processed failed:', err.message);
    }
  }

  // Write to Firestore (durable fallback)
  if (firebaseEnabled) {
    await db.collection('processed_sessions').doc(sessionId).set({
      user_id: userId,
      amount_cents: amountCents,
      processed_at: new Date().toISOString(),
    });
  }
}

/**
 * Stripe Controller
 * Handles pricing, checkout sessions, webhooks, and redirect pages.
 */

async function getPrices(req, res, next) {
  try {
    if (!isStripeEnabled()) {
      throw new ServiceUnavailableError('Stripe not configured');
    }

    const stripe = getStripeClient();
    const listParams = { active: true };
    if (env.STRIPE_PRODUCT_ID) {
      listParams.product = env.STRIPE_PRODUCT_ID;
    }

    const prices = await stripe.prices.list(listParams);
    const formatted = prices.data.map((p) => ({
      id: p.id,
      amountCents: p.unit_amount,
      displayAmount: centsToDisplay(p.unit_amount),
      currency: p.currency,
    })).sort((a, b) => a.amountCents - b.amountCents);

    res.json({ data: formatted });
  } catch (err) {
    next(err);
  }
}

async function createCheckoutSession(req, res, next) {
  try {
    if (!isStripeEnabled()) {
      throw new ServiceUnavailableError('Stripe not configured');
    }

    const { priceId } = req.body;
    if (!priceId) {
      throw new ValidationError('priceId required');
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: `${env.BASE_URL}/api/v1/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.BASE_URL}/api/v1/stripe/cancel`,
      metadata: { userId: req.userId },
    });

    res.json({ data: { url: session.url, sessionId: session.id } });
  } catch (err) {
    next(err);
  }
}

async function handleSuccess(req, res, next) {
  try {
    if (!isStripeEnabled()) {
      return res.status(503).send('Stripe not configured');
    }

    const { session_id } = req.query;
    if (!session_id) {
      return res.status(400).send('Missing session ID');
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const userId = session.metadata?.userId;

    if (session.payment_status === 'paid' && userId) {
      const amountCents = session.amount_total;

      // Check idempotency via Redis + Firestore fallback
      const alreadyProcessed = await isSessionProcessed(session_id);

      if (!alreadyProcessed) {
        // Mark as processed BEFORE crediting (both Redis and Firestore)
        await markSessionProcessed(session_id, userId, amountCents);

        // Credit user
        await walletService.creditBalance(
          userId,
          amountCents,
          'Wallet Top-Up via Stripe',
          'top_up',
          session_id,
          'stripe_session',
        );
      }

      const displayAmount = sanitizeString(centsToDisplay(amountCents));
      res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px">
        <h1 style="color:#135BEC">Payment Successful!</h1>
        <p>${displayAmount} has been added to your wallet.</p>
        <p>You may close this tab and return to the app.</p>
      </body></html>`);
    } else {
      res.send('<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>Payment not complete.</h2></body></html>');
    }
  } catch (err) {
    console.error('Stripe success error:', err.message);
    res.status(500).send('Payment verification failed. Please contact support.');
  }
}

function handleCancel(req, res) {
  res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px">
    <h1>Payment Cancelled</h1>
    <p>You may close this tab and return to the app.</p>
  </body></html>`);
}

async function handleWebhook(req, res, next) {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    let event;
    const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

    if (webhookSecret) {
      const sig = req.headers['stripe-signature'];
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        throw new WebhookVerificationError('Webhook verification failed');
      }
    } else if (env.isProduction) {
      // In production, webhook verification is mandatory
      throw new WebhookVerificationError('Webhook secret not configured');
    } else {
      // In development, parse without verification but log warning
      console.warn('Webhook signature verification skipped -- set STRIPE_WEBHOOK_SECRET for production');
      event = JSON.parse(req.body.toString());
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const sessionId = session.id;
      const userId = session.metadata?.userId;

      if (session.payment_status === 'paid' && userId) {
        // Check idempotency via Redis + Firestore fallback
        const alreadyProcessed = await isSessionProcessed(sessionId);

        if (!alreadyProcessed) {
          const amountCents = session.amount_total;

          // Mark as processed BEFORE crediting (both Redis and Firestore)
          await markSessionProcessed(sessionId, userId, amountCents);

          await walletService.creditBalance(
            userId,
            amountCents,
            'Wallet Top-Up via Stripe',
            'top_up',
            sessionId,
            'stripe_session',
          );

          console.log(`Credited ${centsToDisplay(amountCents)} to user ${userId} via webhook`);
        } else {
          console.log(`Session ${sessionId} already processed, skipping`);
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPrices,
  createCheckoutSession,
  handleSuccess,
  handleCancel,
  handleWebhook,
};
