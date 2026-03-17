'use strict';

const { getRedisClient, isRedisEnabled } = require('../config/redis');
const { db, firebaseEnabled } = require('../config/firebase');

const ROLE_CACHE_TTL = 300; // 5 minutes

/**
 * Look up a user's current role and status from Firestore,
 * with a 5-minute Redis cache to avoid hitting Firestore on every request.
 * Used by both adminOnly middleware and checkNotSuspended middleware.
 *
 * @param {string} userId
 * @returns {Promise<{role: string, status: string}|null>} Role/status or null if unavailable.
 */
async function getUserRoleAndStatus(userId) {
  const cacheKey = `user_role:${userId}`;

  // 1. Check Redis cache
  if (isRedisEnabled()) {
    try {
      const redis = getRedisClient();
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn('Redis role cache read failed:', err.message);
    }
  }

  // 2. Look up from Firestore
  if (!firebaseEnabled) {
    // If Firestore is unavailable, fall back to JWT claim (fail-open only in dev)
    return null;
  }

  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    return null;
  }

  const data = userDoc.data();
  const result = {
    role: data.role || 'user',
    status: data.status || 'active',
  };

  // 3. Cache in Redis for 5 minutes
  if (isRedisEnabled()) {
    try {
      const redis = getRedisClient();
      await redis.set(cacheKey, JSON.stringify(result), 'EX', ROLE_CACHE_TTL);
    } catch (err) {
      console.warn('Redis role cache write failed:', err.message);
    }
  }

  return result;
}

module.exports = {
  getUserRoleAndStatus,
};
