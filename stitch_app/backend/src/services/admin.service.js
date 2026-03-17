'use strict';

const { db, firebaseEnabled, FieldValue } = require('../config/firebase');
const { toApiResponse: userToApi } = require('../models/user.model');
const { toApiResponse: txToApi } = require('../models/transaction.model');
const { toApiResponse: giftToApi } = require('../models/gift.model');
const { toApiResponse: fraudToApi } = require('../models/fraudFlag.model');
const { validateSettingValue } = require('../models/setting.model');
const { centsToDisplay } = require('../utils/currency');
const { sanitizeString } = require('../utils/sanitize');
const { decodeCursor, encodeCursor } = require('../utils/crypto');
const { NotFoundError, ValidationError } = require('../utils/errors');
const auditService = require('./audit.service');

/**
 * Admin Service
 * Handles platform-wide stats, user management, fraud flags, and settings.
 */

/**
 * Get platform-wide metrics.
 * @returns {Object} Stats.
 */
async function getStats() {
  if (!firebaseEnabled) {
    return {
      totalVolumeCents: 0,
      displayVolume: '$0.00',
      totalUsers: 0,
      totalTransactions: 0,
      openFraudFlags: 0,
      recentFraudFlags: [],
    };
  }

  // Count users
  const usersSnap = await db.collection('users').count().get();
  const totalUsers = usersSnap.data().count;

  // Count transactions (count query, not full scan)
  const txCountSnap = await db.collection('transactions').count().get();
  const totalTransactions = txCountSnap.data().count;

  // Read pre-aggregated total volume from platform_stats document
  let totalVolumeCents = 0;
  const statsDoc = await db.collection('settings').doc('platform_stats').get();
  if (statsDoc.exists) {
    totalVolumeCents = statsDoc.data().total_volume_cents || 0;
  }

  // Get open fraud flags
  const flagsSnap = await db.collection('fraud_flags')
    .where('status', '==', 'open')
    .orderBy('created_at', 'desc')
    .limit(10)
    .get();

  const recentFraudFlags = flagsSnap.docs.map((d) => fraudToApi(d.id, d.data()));

  return {
    totalVolumeCents,
    displayVolume: centsToDisplay(totalVolumeCents),
    totalUsers,
    totalTransactions,
    openFraudFlags: recentFraudFlags.length,
    recentFraudFlags,
  };
}

/**
 * List users with pagination and optional search/filter.
 * @param {Object} options
 * @returns {Object} { data, pagination }
 */
async function getUsers({ cursor, limit = 50, search, status } = {}) {
  if (!firebaseEnabled) {
    return { data: [], pagination: { nextCursor: null, hasMore: false, limit } };
  }

  let query = db.collection('users').orderBy('created_at', 'desc');

  if (status) {
    query = query.where('status', '==', status);
  }

  const cursorData = decodeCursor(cursor);
  if (cursorData && cursorData.created_at) {
    query = query.startAfter(cursorData.created_at);
  }

  const snap = await query.limit(limit + 1).get();
  let docs = snap.docs;

  // Client-side search filter (Firestore doesn't support partial text search natively)
  if (search) {
    const searchLower = search.toLowerCase();
    docs = docs.filter((d) => {
      const data = d.data();
      return (
        (data.name && data.name.toLowerCase().includes(searchLower)) ||
        (data.email && data.email.toLowerCase().includes(searchLower))
      );
    });
  }

  const hasMore = docs.length > limit;
  const pageItems = hasMore ? docs.slice(0, limit) : docs;

  const data = pageItems.map((d) => {
    const apiUser = userToApi(d.id, d.data());
    apiUser.status = d.data().status || 'active';
    apiUser.lastLoginAt = d.data().last_login_at || null;
    return apiUser;
  });

  let nextCursor = null;
  if (hasMore && pageItems.length > 0) {
    const lastDoc = pageItems[pageItems.length - 1];
    nextCursor = encodeCursor({ created_at: lastDoc.data().created_at });
  }

  return { data, pagination: { nextCursor, hasMore, limit } };
}

/**
 * Get detailed user information including recent transactions, gifts, and fraud flags.
 * @param {string} userId
 * @returns {Object} User detail.
 */
async function getUserDetail(userId) {
  if (!firebaseEnabled) {
    throw new NotFoundError('User not found');
  }

  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new NotFoundError('User not found');
  }

  const user = userToApi(userId, userDoc.data());
  user.status = userDoc.data().status || 'active';
  user.authProvider = userDoc.data().auth_provider || 'email';
  user.lastLoginAt = userDoc.data().last_login_at || null;

  // Recent transactions
  const txSnap = await db.collection('transactions')
    .where('user_id', '==', userId)
    .orderBy('created_at', 'desc')
    .limit(20)
    .get();
  const recentTransactions = txSnap.docs.map((d) => txToApi(d.id, d.data()));

  // Sent gifts
  const giftsSnap = await db.collection('gifts')
    .where('sender_id', '==', userId)
    .orderBy('created_at', 'desc')
    .limit(10)
    .get();
  const sentGifts = giftsSnap.docs.map((d) => giftToApi(d.id, d.data()));

  // Fraud flags
  const flagsSnap = await db.collection('fraud_flags')
    .where('user_id', '==', userId)
    .orderBy('created_at', 'desc')
    .limit(10)
    .get();
  const fraudFlags = flagsSnap.docs.map((d) => fraudToApi(d.id, d.data()));

  return { user, recentTransactions, sentGifts, fraudFlags };
}

/**
 * Suspend a user account.
 * @param {string} adminId - Admin performing the action.
 * @param {string} adminEmail - Admin's email for audit log.
 * @param {string} targetUserId - User to suspend.
 * @param {string} reason - Suspension reason.
 * @param {string} ipAddress - Request IP.
 * @param {string} requestId - Request correlation ID.
 */
async function suspendUser(adminId, adminEmail, targetUserId, reason, ipAddress, requestId) {
  if (!firebaseEnabled) {
    throw new NotFoundError('User not found');
  }

  const userRef = db.collection('users').doc(targetUserId);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    throw new NotFoundError('User not found');
  }

  const previousStatus = userDoc.data().status;
  const safeReason = sanitizeString(reason);

  await userRef.update({
    status: 'suspended',
    suspended_at: new Date().toISOString(),
    suspended_by: adminId,
    suspended_reason: safeReason,
    updated_at: new Date().toISOString(),
  });

  await auditService.log({
    actorId: adminId,
    actorEmail: adminEmail,
    action: 'suspend_user',
    targetType: 'user',
    targetId: targetUserId,
    beforeValue: { status: previousStatus },
    afterValue: { status: 'suspended', reason: safeReason },
    ipAddress,
    requestId,
  });
}

/**
 * Reinstate a suspended user account.
 * @param {string} adminId
 * @param {string} adminEmail
 * @param {string} targetUserId
 * @param {string} ipAddress
 * @param {string} requestId
 */
async function reinstateUser(adminId, adminEmail, targetUserId, ipAddress, requestId) {
  if (!firebaseEnabled) {
    throw new NotFoundError('User not found');
  }

  const userRef = db.collection('users').doc(targetUserId);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    throw new NotFoundError('User not found');
  }

  await userRef.update({
    status: 'active',
    suspended_at: null,
    suspended_by: null,
    suspended_reason: null,
    updated_at: new Date().toISOString(),
  });

  await auditService.log({
    actorId: adminId,
    actorEmail: adminEmail,
    action: 'reinstate_user',
    targetType: 'user',
    targetId: targetUserId,
    beforeValue: { status: 'suspended' },
    afterValue: { status: 'active' },
    ipAddress,
    requestId,
  });
}

/**
 * Get paginated fraud flags.
 * @param {Object} options
 * @returns {Object} { data, pagination }
 */
async function getFraudFlags({ cursor, limit = 20, status = 'open' } = {}) {
  if (!firebaseEnabled) {
    return { data: [], pagination: { nextCursor: null, hasMore: false, limit } };
  }

  let query = db.collection('fraud_flags')
    .where('status', '==', status)
    .orderBy('created_at', 'desc');

  const cursorData = decodeCursor(cursor);
  if (cursorData && cursorData.created_at) {
    query = query.startAfter(cursorData.created_at);
  }

  const snap = await query.limit(limit + 1).get();
  const docs = snap.docs;
  const hasMore = docs.length > limit;
  const pageItems = hasMore ? docs.slice(0, limit) : docs;

  const data = pageItems.map((d) => fraudToApi(d.id, d.data()));

  let nextCursor = null;
  if (hasMore && pageItems.length > 0) {
    const lastDoc = pageItems[pageItems.length - 1];
    nextCursor = encodeCursor({ created_at: lastDoc.data().created_at });
  }

  return { data, pagination: { nextCursor, hasMore, limit } };
}

/**
 * Resolve a fraud flag.
 * @param {string} adminId
 * @param {string} adminEmail
 * @param {string} flagId
 * @param {string} [notes]
 * @param {string} ipAddress
 * @param {string} requestId
 */
async function resolveFraudFlag(adminId, adminEmail, flagId, notes, ipAddress, requestId) {
  if (!firebaseEnabled) {
    throw new NotFoundError('Fraud flag not found');
  }

  const flagRef = db.collection('fraud_flags').doc(flagId);
  const flagDoc = await flagRef.get();
  if (!flagDoc.exists) {
    throw new NotFoundError('Fraud flag not found');
  }

  const previousStatus = flagDoc.data().status;

  await flagRef.update({
    status: 'resolved',
    resolved_by: adminId,
    resolved_at: new Date().toISOString(),
    resolution_notes: notes ? sanitizeString(notes) : null,
    updated_at: new Date().toISOString(),
  });

  await auditService.log({
    actorId: adminId,
    actorEmail: adminEmail,
    action: 'resolve_fraud_flag',
    targetType: 'fraud_flag',
    targetId: flagId,
    beforeValue: { status: previousStatus },
    afterValue: { status: 'resolved', notes },
    ipAddress,
    requestId,
  });
}

/**
 * Block a user via fraud flag (suspend + resolve flag).
 * @param {string} adminId
 * @param {string} adminEmail
 * @param {string} flagId
 * @param {string} [notes]
 * @param {string} ipAddress
 * @param {string} requestId
 */
async function blockFraudFlag(adminId, adminEmail, flagId, notes, ipAddress, requestId) {
  if (!firebaseEnabled) {
    throw new NotFoundError('Fraud flag not found');
  }

  const flagRef = db.collection('fraud_flags').doc(flagId);
  const flagDoc = await flagRef.get();
  if (!flagDoc.exists) {
    throw new NotFoundError('Fraud flag not found');
  }

  const flagData = flagDoc.data();
  const userId = flagData.user_id;

  // Suspend the user
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();
  if (userDoc.exists) {
    await userRef.update({
      status: 'suspended',
      suspended_at: new Date().toISOString(),
      suspended_by: adminId,
      suspended_reason: `Blocked via fraud flag: ${flagData.reason}`,
      updated_at: new Date().toISOString(),
    });
  }

  // Resolve the fraud flag as blocked
  await flagRef.update({
    status: 'blocked',
    resolved_by: adminId,
    resolved_at: new Date().toISOString(),
    resolution_notes: notes ? sanitizeString(notes) : null,
    updated_at: new Date().toISOString(),
  });

  await auditService.log({
    actorId: adminId,
    actorEmail: adminEmail,
    action: 'block_fraud_flag',
    targetType: 'fraud_flag',
    targetId: flagId,
    beforeValue: { status: flagData.status, userId },
    afterValue: { status: 'blocked', userSuspended: true, notes },
    ipAddress,
    requestId,
  });
}

/**
 * Update a platform setting.
 * @param {string} adminId
 * @param {string} adminEmail
 * @param {string} key - Setting key.
 * @param {*} value - New value.
 * @param {string} ipAddress
 * @param {string} requestId
 * @returns {Object} { key, value, previousValue }
 */
async function updateSetting(adminId, adminEmail, key, value, ipAddress, requestId) {
  // Validate setting value against known constraints
  const validation = validateSettingValue(key, value);
  if (!validation.valid) {
    throw new ValidationError(validation.error);
  }

  let previousValue = null;

  if (firebaseEnabled) {
    const settingRef = db.collection('settings').doc(key);
    const settingDoc = await settingRef.get();

    if (settingDoc.exists) {
      previousValue = settingDoc.data().value;
    }

    await settingRef.set({
      key,
      value,
      value_type: typeof value === 'boolean' ? 'boolean' : Number.isInteger(value) ? 'integer' : 'number',
      description: settingDoc.exists ? settingDoc.data().description : '',
      updated_at: new Date().toISOString(),
      updated_by: adminId,
    }, { merge: true });
  }

  await auditService.log({
    actorId: adminId,
    actorEmail: adminEmail,
    action: 'update_setting',
    targetType: 'setting',
    targetId: key,
    beforeValue: previousValue,
    afterValue: value,
    ipAddress,
    requestId,
  });

  return { key, value, previousValue };
}

module.exports = {
  getStats,
  getUsers,
  getUserDetail,
  suspendUser,
  reinstateUser,
  getFraudFlags,
  resolveFraudFlag,
  blockFraudFlag,
  updateSetting,
};
