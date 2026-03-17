'use strict';

/**
 * Fraud flag document schema and helpers for Firestore.
 * Collection: fraud_flags
 * Document ID: Auto-generated
 */

const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];
const VALID_STATUSES = ['open', 'reviewing', 'resolved', 'blocked'];

/**
 * Create a new fraud flag document object.
 * @param {Object} params
 * @returns {Object} Firestore document data.
 */
function createFraudFlagDocument({ userId, userName, userEmail, reason, amountCents = null, severity = 'medium' }) {
  const now = new Date().toISOString();
  return {
    user_id: userId,
    user_name: userName,
    user_email: userEmail,
    reason,
    amount_cents: amountCents,
    severity,
    status: 'open',
    resolved_by: null,
    resolved_at: null,
    resolution_notes: null,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Convert a Firestore fraud flag document to an API response.
 * @param {string} id - Document ID.
 * @param {Object} data - Document data.
 * @returns {Object} API response object.
 */
function toApiResponse(id, data) {
  return {
    id,
    userId: data.user_id,
    userName: data.user_name,
    userEmail: data.user_email,
    reason: data.reason,
    amountCents: data.amount_cents,
    severity: data.severity,
    status: data.status,
    resolvedBy: data.resolved_by,
    resolvedAt: data.resolved_at,
    resolutionNotes: data.resolution_notes,
    createdAt: data.created_at,
  };
}

module.exports = {
  VALID_SEVERITIES,
  VALID_STATUSES,
  createFraudFlagDocument,
  toApiResponse,
};
