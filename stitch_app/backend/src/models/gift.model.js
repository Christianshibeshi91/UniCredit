'use strict';

const { centsToDisplay } = require('../utils/currency');

/**
 * Gift document schema and helpers for Firestore.
 * Collection: gifts
 * Document ID: Auto-generated
 */

const VALID_STATUSES = ['pending', 'claimed', 'expired'];

/**
 * Create a new gift document object.
 * @param {Object} params
 * @returns {Object} Firestore document data.
 */
function createGiftDocument({
  senderId,
  senderName,
  recipientEmail,
  amountCents,
  message = 'Enjoy your gift!',
  occasion = null,
  claimToken,
  claimTokenHash,
  scheduledAt = null,
  expirationDays = 90,
}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expirationDays * 24 * 60 * 60 * 1000);

  return {
    sender_id: senderId,
    sender_name: senderName,
    recipient_email: recipientEmail,
    recipient_user_id: null,
    amount_cents: amountCents,
    message: message || 'Enjoy your gift!',
    occasion: occasion || null,
    status: 'pending',
    claim_token: claimToken,
    claim_token_hash: claimTokenHash,
    video_key: null,
    audio_key: null,
    scheduled_at: scheduledAt || null,
    notification_sent_at: null,
    claimed_at: null,
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}

/**
 * Convert a Firestore gift document to an API response.
 * Does NOT include claim_token (security: only in claim URLs).
 * @param {string} id - Document ID.
 * @param {Object} data - Document data.
 * @returns {Object} API response object.
 */
function toApiResponse(id, data) {
  return {
    id,
    senderName: data.sender_name,
    recipientEmail: data.recipient_email,
    amountCents: data.amount_cents,
    displayAmount: centsToDisplay(data.amount_cents),
    message: data.message,
    occasion: data.occasion,
    status: data.status,
    videoKey: data.video_key || null,
    audioKey: data.audio_key || null,
    scheduledAt: data.scheduled_at,
    expiresAt: data.expires_at,
    claimedAt: data.claimed_at,
    createdAt: data.created_at,
  };
}

/**
 * Convert a gift document to a claim preview response (no sensitive fields).
 * @param {Object} data - Document data.
 * @returns {Object} Claim preview response object.
 */
function toClaimPreviewResponse(data) {
  return {
    senderName: data.sender_name,
    amountCents: data.amount_cents,
    displayAmount: centsToDisplay(data.amount_cents),
    message: data.message,
    occasion: data.occasion,
    videoKey: data.video_key || null,
    audioKey: data.audio_key || null,
    status: data.status,
    expiresAt: data.expires_at,
  };
}

module.exports = {
  VALID_STATUSES,
  createGiftDocument,
  toApiResponse,
  toClaimPreviewResponse,
};
