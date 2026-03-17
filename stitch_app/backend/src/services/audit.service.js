'use strict';

const { db, firebaseEnabled } = require('../config/firebase');
const { createAuditLogDocument, toApiResponse } = require('../models/auditLog.model');
const { decodeCursor, encodeCursor } = require('../utils/crypto');

/**
 * Audit Service
 * Records and retrieves admin action audit logs.
 * Audit logs are append-only and never deleted.
 */

/**
 * Log an admin action.
 * @param {Object} params
 * @param {string} params.actorId - Admin user ID.
 * @param {string} params.actorEmail - Admin email.
 * @param {string} params.action - Action performed.
 * @param {string} params.targetType - Type of target entity.
 * @param {string} params.targetId - ID of target entity.
 * @param {*} [params.beforeValue] - State before the action.
 * @param {*} [params.afterValue] - State after the action.
 * @param {string} [params.ipAddress] - Request source IP.
 * @param {string} [params.requestId] - Request correlation ID.
 */
async function log({ actorId, actorEmail, action, targetType, targetId, beforeValue, afterValue, ipAddress, requestId }) {
  const doc = createAuditLogDocument({
    actorId,
    actorEmail,
    action,
    targetType,
    targetId,
    beforeValue,
    afterValue,
    ipAddress,
    requestId,
  });

  if (firebaseEnabled) {
    await db.collection('audit_log').add(doc);
  }
  // In non-Firebase mode, audit is logged to console only
  console.log('Audit:', JSON.stringify(doc));
}

/**
 * Get paginated audit log entries with optional filters.
 * @param {Object} options
 * @param {string} [options.cursor] - Pagination cursor.
 * @param {number} [options.limit=50] - Page size.
 * @param {string} [options.actorId] - Filter by admin user.
 * @param {string} [options.targetType] - Filter by target type.
 * @returns {Object} { data: AuditLogEntry[], pagination }
 */
async function getAuditLog({ cursor, limit = 50, actorId, targetType } = {}) {
  if (!firebaseEnabled) {
    return { data: [], pagination: { nextCursor: null, hasMore: false, limit } };
  }

  let query = db.collection('audit_log').orderBy('created_at', 'desc');

  if (actorId) {
    query = query.where('actor_id', '==', actorId);
  }
  if (targetType) {
    query = query.where('target_type', '==', targetType);
  }

  // Apply cursor
  const cursorData = decodeCursor(cursor);
  if (cursorData && cursorData.created_at) {
    query = query.startAfter(cursorData.created_at);
  }

  // Fetch one extra to determine hasMore
  const snap = await query.limit(limit + 1).get();
  const docs = snap.docs;
  const hasMore = docs.length > limit;
  const pageItems = hasMore ? docs.slice(0, limit) : docs;

  const data = pageItems.map(d => toApiResponse(d.id, d.data()));

  let nextCursor = null;
  if (hasMore && pageItems.length > 0) {
    const lastDoc = pageItems[pageItems.length - 1];
    nextCursor = encodeCursor({ created_at: lastDoc.data().created_at });
  }

  return {
    data,
    pagination: { nextCursor, hasMore, limit },
  };
}

module.exports = {
  log,
  getAuditLog,
};
