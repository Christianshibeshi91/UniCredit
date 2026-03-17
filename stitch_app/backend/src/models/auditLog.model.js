'use strict';

/**
 * Audit log document schema and helpers for Firestore.
 * Collection: audit_log
 * Document ID: Auto-generated
 * Append-only: entries are never deleted or modified.
 */

const VALID_ACTIONS = [
  'update_setting',
  'suspend_user',
  'reinstate_user',
  'update_user_tier',
  'resolve_fraud_flag',
  'block_fraud_flag',
  'review_fraud_flag',
];

const VALID_TARGET_TYPES = ['user', 'setting', 'fraud_flag', 'gift'];

/**
 * Create a new audit log document object.
 * @param {Object} params
 * @returns {Object} Firestore document data.
 */
function createAuditLogDocument({
  actorId,
  actorEmail,
  action,
  targetType,
  targetId,
  beforeValue = null,
  afterValue = null,
  ipAddress = 'unknown',
  requestId = 'unknown',
}) {
  return {
    actor_id: actorId,
    actor_email: actorEmail,
    action,
    target_type: targetType,
    target_id: targetId,
    before_value: beforeValue,
    after_value: afterValue,
    ip_address: ipAddress,
    request_id: requestId,
    created_at: new Date().toISOString(),
  };
}

/**
 * Convert a Firestore audit log document to an API response.
 * @param {string} id - Document ID.
 * @param {Object} data - Document data.
 * @returns {Object} API response object.
 */
function toApiResponse(id, data) {
  return {
    id,
    actorId: data.actor_id,
    actorEmail: data.actor_email,
    action: data.action,
    targetType: data.target_type,
    targetId: data.target_id,
    beforeValue: data.before_value,
    afterValue: data.after_value,
    ipAddress: data.ip_address,
    requestId: data.request_id,
    createdAt: data.created_at,
  };
}

module.exports = {
  VALID_ACTIONS,
  VALID_TARGET_TYPES,
  createAuditLogDocument,
  toApiResponse,
};
