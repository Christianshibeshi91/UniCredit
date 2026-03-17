'use strict';

const { env } = require('./env');

let stripeClient = null;
let stripeEnabled = false;

/**
 * Initialize Stripe client.
 * Graceful degradation: Stripe features return 503 if not configured.
 */
function initializeStripe() {
  if (env.isTest) {
    return { stripeClient: null, stripeEnabled: false };
  }

  if (env.STRIPE_SECRET_KEY) {
    try {
      const Stripe = require('stripe');
      stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-04-10',
      });
      stripeEnabled = true;
      console.log('Stripe initialized');
    } catch (err) {
      console.error('Stripe initialization error:', err.message);
    }
  } else {
    console.log('Stripe: No STRIPE_SECRET_KEY set, Stripe features disabled');
  }

  return { stripeClient, stripeEnabled };
}

// Initialize on import
const stripe = initializeStripe();

function getStripeClient() {
  return stripe.stripeClient;
}

function isStripeEnabled() {
  return stripe.stripeEnabled;
}

module.exports = {
  getStripeClient,
  isStripeEnabled,
};
