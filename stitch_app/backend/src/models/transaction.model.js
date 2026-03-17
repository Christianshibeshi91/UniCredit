'use strict';

const { centsToSignedDisplay } = require('../utils/currency');

/**
 * Transaction document schema and helpers for Firestore.
 * Collection: transactions
 * Document ID: Auto-generated
 */

const VALID_TYPES = ['credit', 'debit'];
const VALID_CATEGORIES = ['gift_card', 'gift_sent', 'gift_received', 'gift_refund', 'top_up', 'general'];

/**
 * Create a new transaction document object.
 * @param {Object} params
 * @returns {Object} Firestore document data.
 */
function createTransactionDocument({ userId, amountCents, type, description, category = 'general', referenceId = null, referenceType = null }) {
  // Enforce sign matches type
  const signedAmount = type === 'debit' ? -Math.abs(amountCents) : Math.abs(amountCents);

  return {
    user_id: userId,
    amount_cents: signedAmount,
    type,
    description,
    category,
    reference_id: referenceId,
    reference_type: referenceType,
    created_at: new Date().toISOString(),
  };
}

/**
 * Convert a Firestore transaction document to an API response.
 * @param {string} id - Document ID.
 * @param {Object} data - Document data.
 * @returns {Object} API response object.
 */
function toApiResponse(id, data) {
  return {
    id,
    amountCents: data.amount_cents,
    displayAmount: centsToSignedDisplay(data.amount_cents),
    type: data.type,
    description: data.description,
    category: data.category || 'general',
    referenceId: data.reference_id || null,
    createdAt: data.created_at,
  };
}

module.exports = {
  VALID_TYPES,
  VALID_CATEGORIES,
  createTransactionDocument,
  toApiResponse,
};
