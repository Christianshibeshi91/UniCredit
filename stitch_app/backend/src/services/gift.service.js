'use strict';

const { db, firebaseEnabled, FieldValue } = require('../config/firebase');
const { createGiftDocument, toApiResponse, toClaimPreviewResponse } = require('../models/gift.model');
const { createTransactionDocument } = require('../models/transaction.model');
const { generateToken, hashSHA256 } = require('../utils/crypto');
const { sanitizeString } = require('../utils/sanitize');
const { centsToDisplay } = require('../utils/currency');
const {
  NotFoundError,
  InsufficientBalanceError,
  AlreadyClaimedError,
  GiftExpiredError,
  AccessDeniedError,
  ValidationError,
} = require('../utils/errors');

/**
 * Gift Service
 * Handles gift creation, claiming, media attachment, and lifecycle management.
 */

/**
 * Send a gift from one user to another.
 * Debits sender's balance atomically and creates the gift.
 * @param {Object} params
 * @returns {Object} { giftId, newBalanceCents, displayBalance }
 */
async function sendGift({ senderId, recipientEmail, amountCents, message, occasion, scheduledAt }) {
  if (!firebaseEnabled) {
    return { giftId: `gift_${Date.now()}`, newBalanceCents: 0, displayBalance: '$0.00' };
  }

  // Get sender info
  const senderRef = db.collection('users').doc(senderId);
  const senderDoc = await senderRef.get();
  if (!senderDoc.exists) {
    throw new NotFoundError('User not found');
  }

  const senderData = senderDoc.data();
  const senderName = senderData.name || 'A UniCredit User';

  // Validate scheduled time is in the future
  if (scheduledAt) {
    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      throw new ValidationError('Scheduled delivery time must be in the future');
    }
  }

  // Get gift expiration days from settings
  let expirationDays = 90;
  try {
    const settingDoc = await db.collection('settings').doc('gift_expiration_days').get();
    if (settingDoc.exists) {
      expirationDays = settingDoc.data().value || 90;
    }
  } catch {
    // Use default
  }

  // Generate claim token
  const claimToken = generateToken();
  const claimTokenHash = hashSHA256(claimToken);

  // Sanitize user input
  const safeMessage = sanitizeString(message || 'Enjoy your gift!');
  const safeOccasion = occasion ? sanitizeString(occasion) : null;

  // Create gift document
  const giftData = createGiftDocument({
    senderId,
    senderName,
    recipientEmail,
    amountCents,
    message: safeMessage,
    occasion: safeOccasion,
    claimToken,
    claimTokenHash,
    scheduledAt: scheduledAt || null,
    expirationDays,
  });

  // Atomic: debit sender + create gift + create transaction
  let giftId;
  let newBalanceCents;

  await db.runTransaction(async (transaction) => {
    const freshSenderDoc = await transaction.get(senderRef);
    if (!freshSenderDoc.exists) {
      throw new NotFoundError('User not found');
    }

    const currentBalance = freshSenderDoc.data().balance_cents || 0;
    if (currentBalance < amountCents) {
      throw new InsufficientBalanceError('Insufficient balance');
    }

    // Debit sender
    transaction.update(senderRef, {
      balance_cents: FieldValue.increment(-amountCents),
      updated_at: new Date().toISOString(),
    });

    // Create gift
    const giftRef = db.collection('gifts').doc();
    giftId = giftRef.id;
    transaction.set(giftRef, giftData);

    // Create debit transaction for sender
    const txDoc = createTransactionDocument({
      userId: senderId,
      amountCents,
      type: 'debit',
      description: `Sent Gift to ${sanitizeString(recipientEmail)}`,
      category: 'gift_sent',
      referenceId: giftRef.id,
      referenceType: 'gift',
    });
    const txRef = db.collection('transactions').doc();
    transaction.set(txRef, txDoc);

    newBalanceCents = currentBalance - amountCents;
  });

  return {
    giftId,
    newBalanceCents,
    displayBalance: centsToDisplay(newBalanceCents),
  };
}

/**
 * Preview a gift before claiming (public endpoint via claim token).
 * @param {string} claimToken - Plain-text claim token from email link.
 * @returns {Object} Claim preview data.
 */
async function previewGift(claimToken) {
  if (!firebaseEnabled) {
    throw new NotFoundError('Gift not found or has expired');
  }

  const tokenHash = hashSHA256(claimToken);

  const snap = await db.collection('gifts')
    .where('claim_token_hash', '==', tokenHash)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new NotFoundError('Gift not found or has expired');
  }

  const doc = snap.docs[0];
  const data = doc.data();

  if (data.status === 'claimed') {
    throw new AlreadyClaimedError('This gift has already been claimed');
  }

  if (data.status === 'expired' || new Date(data.expires_at) < new Date()) {
    throw new NotFoundError('Gift not found or has expired');
  }

  return toClaimPreviewResponse(data);
}

/**
 * Claim a gift and credit it to the recipient's wallet.
 * @param {string} claimToken - Plain-text claim token.
 * @param {string} recipientUserId - Authenticated user ID claiming the gift.
 * @returns {Object} Claim result with credited amount.
 */
async function claimGift(claimToken, recipientUserId) {
  if (!firebaseEnabled) {
    throw new NotFoundError('Gift not found or has expired');
  }

  const tokenHash = hashSHA256(claimToken);

  const snap = await db.collection('gifts')
    .where('claim_token_hash', '==', tokenHash)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new NotFoundError('Gift not found or has expired');
  }

  const giftDoc = snap.docs[0];
  const giftData = giftDoc.data();
  const giftId = giftDoc.id;

  if (giftData.status === 'claimed') {
    throw new AlreadyClaimedError('This gift has already been claimed');
  }

  if (giftData.status === 'expired' || new Date(giftData.expires_at) < new Date()) {
    throw new GiftExpiredError('This gift has expired');
  }

  const recipientRef = db.collection('users').doc(recipientUserId);
  const giftRef = db.collection('gifts').doc(giftId);
  const amountCents = giftData.amount_cents;

  let newBalanceCents;

  await db.runTransaction(async (transaction) => {
    const recipientDoc = await transaction.get(recipientRef);
    if (!recipientDoc.exists) {
      throw new NotFoundError('User not found');
    }

    // Re-read gift inside transaction
    const freshGift = await transaction.get(giftRef);
    if (!freshGift.exists || freshGift.data().status !== 'pending') {
      throw new AlreadyClaimedError('This gift has already been claimed');
    }

    // Credit recipient
    transaction.update(recipientRef, {
      balance_cents: FieldValue.increment(amountCents),
      updated_at: new Date().toISOString(),
    });

    // Update gift status
    transaction.update(giftRef, {
      status: 'claimed',
      recipient_user_id: recipientUserId,
      claimed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Create credit transaction for recipient
    const txDoc = createTransactionDocument({
      userId: recipientUserId,
      amountCents,
      type: 'credit',
      description: `Gift from ${giftData.sender_name}`,
      category: 'gift_received',
      referenceId: giftId,
      referenceType: 'gift',
    });
    const txRef = db.collection('transactions').doc();
    transaction.set(txRef, txDoc);

    newBalanceCents = (recipientDoc.data().balance_cents || 0) + amountCents;
  });

  return {
    success: true,
    creditedCents: amountCents,
    displayCredited: centsToDisplay(amountCents),
    newBalanceCents,
    displayBalance: centsToDisplay(newBalanceCents),
    giftId,
    senderName: giftData.sender_name,
    occasion: giftData.occasion,
    message: giftData.message,
  };
}

/**
 * Get gift details. Only accessible by sender or recipient.
 * @param {string} giftId
 * @param {string} requesterId - Authenticated user ID requesting the gift.
 * @returns {Object} Gift API response.
 */
async function getGift(giftId, requesterId) {
  if (!firebaseEnabled) {
    throw new NotFoundError('Gift not found');
  }

  const giftDoc = await db.collection('gifts').doc(giftId).get();
  if (!giftDoc.exists) {
    throw new NotFoundError('Gift not found');
  }

  const data = giftDoc.data();

  // IDOR protection: only sender or recipient can view
  if (data.sender_id !== requesterId && data.recipient_user_id !== requesterId) {
    throw new AccessDeniedError('Access denied');
  }

  return toApiResponse(giftId, data);
}

/**
 * Update media references on a gift.
 * Only the sender can attach media.
 * @param {string} giftId
 * @param {string} senderId - Must match the gift's sender.
 * @param {string} [videoKey]
 * @param {string} [audioKey]
 */
async function updateGiftMedia(giftId, senderId, videoKey, audioKey) {
  if (!firebaseEnabled) {
    return;
  }

  const giftRef = db.collection('gifts').doc(giftId);
  const giftDoc = await giftRef.get();

  if (!giftDoc.exists) {
    throw new NotFoundError('Gift not found');
  }

  const data = giftDoc.data();
  if (data.sender_id !== senderId) {
    throw new AccessDeniedError('Only the sender can attach media to a gift');
  }

  // Validate media keys match sender pattern
  if (videoKey && !videoKey.startsWith(`gifts/${senderId}/`)) {
    throw new ValidationError('Invalid video key: must match gifts/{userId}/* pattern');
  }
  if (audioKey && !audioKey.startsWith(`gifts/${senderId}/`)) {
    throw new ValidationError('Invalid audio key: must match gifts/{userId}/* pattern');
  }

  const updates = { updated_at: new Date().toISOString() };
  if (videoKey !== undefined) updates.video_key = videoKey;
  if (audioKey !== undefined) updates.audio_key = audioKey;

  await giftRef.update(updates);
}

/**
 * Process expired gifts: set status to expired and refund senders.
 * Called by the gift expiration background job.
 * @returns {Object} { expired, refunded }
 */
async function processExpiredGifts() {
  if (!firebaseEnabled) {
    return { expired: 0, refunded: 0 };
  }

  const now = new Date().toISOString();
  const snap = await db.collection('gifts')
    .where('status', '==', 'pending')
    .where('expires_at', '<=', now)
    .get();

  let expired = 0;
  let refunded = 0;

  for (const doc of snap.docs) {
    const giftData = doc.data();
    const giftId = doc.id;

    try {
      const senderRef = db.collection('users').doc(giftData.sender_id);
      const giftRef = db.collection('gifts').doc(giftId);

      await db.runTransaction(async (transaction) => {
        // Expire the gift
        transaction.update(giftRef, {
          status: 'expired',
          updated_at: new Date().toISOString(),
        });

        // Refund sender
        transaction.update(senderRef, {
          balance_cents: FieldValue.increment(giftData.amount_cents),
          updated_at: new Date().toISOString(),
        });

        // Create refund transaction
        const txDoc = createTransactionDocument({
          userId: giftData.sender_id,
          amountCents: giftData.amount_cents,
          type: 'credit',
          description: `Gift Refund (expired) - ${giftData.recipient_email}`,
          category: 'gift_refund',
          referenceId: giftId,
          referenceType: 'gift',
        });
        const txRef = db.collection('transactions').doc();
        transaction.set(txRef, txDoc);
      });

      expired++;
      refunded++;
    } catch (err) {
      console.error(`Failed to expire gift ${giftId}:`, err.message);
    }
  }

  return { expired, refunded };
}

/**
 * Process scheduled gift deliveries that are due.
 * Called by the scheduled delivery background job.
 * @returns {Object} { delivered }
 */
async function processScheduledDeliveries() {
  if (!firebaseEnabled) {
    return { delivered: 0 };
  }

  const now = new Date().toISOString();
  const snap = await db.collection('gifts')
    .where('status', '==', 'pending')
    .where('scheduled_at', '<=', now)
    .where('notification_sent_at', '==', null)
    .get();

  let delivered = 0;

  for (const doc of snap.docs) {
    try {
      const giftData = doc.data();
      const notificationService = require('./notification.service');

      await notificationService.sendGiftNotificationEmail(giftData, giftData.sender_name);

      await db.collection('gifts').doc(doc.id).update({
        notification_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      delivered++;
    } catch (err) {
      console.error(`Failed to deliver scheduled gift ${doc.id}:`, err.message);
    }
  }

  return { delivered };
}

module.exports = {
  sendGift,
  previewGift,
  claimGift,
  getGift,
  updateGiftMedia,
  processExpiredGifts,
  processScheduledDeliveries,
};
