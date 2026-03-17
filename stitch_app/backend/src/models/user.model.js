'use strict';

/**
 * User document schema and helpers for Firestore.
 * Collection: users
 * Document ID: Firebase Auth UID
 */

/**
 * Create a new user document object.
 * @param {Object} params
 * @returns {Object} Firestore document data.
 */
function createUserDocument({ name, email, passwordHash, authProvider = 'email', photoUrl = null }) {
  const now = new Date().toISOString();
  return {
    name: name || email.split('@')[0],
    email,
    password_hash: passwordHash || '',
    balance_cents: 0,
    tier: 'STANDARD',
    role: 'user',
    status: 'active',
    photo_url: photoUrl || null,
    auth_provider: authProvider,
    notification_preferences: {
      email: true,
      push: false,
    },
    fcm_tokens: [],
    reset_token_hash: null,
    reset_token_expires_at: null,
    suspended_at: null,
    suspended_by: null,
    suspended_reason: null,
    created_at: now,
    updated_at: now,
    last_login_at: null,
  };
}

/**
 * Convert a Firestore user document to a safe API response (no password_hash).
 * @param {string} id - Document ID.
 * @param {Object} data - Document data.
 * @returns {Object} API-safe user object.
 */
function toApiResponse(id, data) {
  return {
    id,
    name: data.name,
    email: data.email,
    balanceCents: data.balance_cents || 0,
    tier: data.tier || 'STANDARD',
    role: data.role || 'user',
    status: data.status || 'active',
    photoUrl: data.photo_url || null,
    authProvider: data.auth_provider || 'email',
    createdAt: data.created_at,
    lastLoginAt: data.last_login_at || null,
  };
}

/**
 * Convert a Firestore user document to an auth response (includes token data).
 * @param {string} id - Document ID.
 * @param {Object} data - Document data.
 * @returns {Object} Auth response user object.
 */
function toAuthResponse(id, data) {
  return {
    id,
    name: data.name,
    email: data.email,
    balanceCents: data.balance_cents || 0,
    tier: data.tier || 'STANDARD',
    role: data.role || 'user',
    createdAt: data.created_at,
  };
}

/**
 * Calculate tier based on total transaction volume.
 * @param {number} totalCreditCents - Total credits in cents.
 * @returns {string} Tier: STANDARD, GOLD, or PLATINUM.
 */
function calculateTier(totalCreditCents) {
  if (totalCreditCents >= 100_000_00) return 'PLATINUM'; // $100,000
  if (totalCreditCents >= 10_000_00) return 'GOLD';      // $10,000
  return 'STANDARD';
}

module.exports = {
  createUserDocument,
  toApiResponse,
  toAuthResponse,
  calculateTier,
};
