'use strict';

const { randomUUID, createHash, randomBytes } = require('crypto');

/**
 * Generate a UUID v4 token.
 * @returns {string} UUID v4 string.
 */
function generateToken() {
  return randomUUID();
}

/**
 * Generate a cryptographically secure random hex string.
 * @param {number} [bytes=32] - Number of random bytes.
 * @returns {string} Hex-encoded random string.
 */
function generateRandomHex(bytes = 32) {
  return randomBytes(bytes).toString('hex');
}

/**
 * Hash a string using SHA-256.
 * Used for storing password reset tokens and gift claim tokens securely.
 * @param {string} value - The value to hash.
 * @returns {string} SHA-256 hex digest.
 */
function hashSHA256(value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('hashSHA256 requires a non-empty string');
  }
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Generate a UUID v4 for request IDs.
 * @returns {string} UUID v4 string.
 */
function generateRequestId() {
  return randomUUID();
}

/**
 * Encode a cursor object to base64.
 * @param {Object} cursorData - Data to encode (e.g., { created_at: '...' }).
 * @returns {string} Base64-encoded cursor string.
 */
function encodeCursor(cursorData) {
  return Buffer.from(JSON.stringify(cursorData)).toString('base64');
}

/**
 * Decode a base64 cursor string back to an object.
 * @param {string} cursor - Base64-encoded cursor string.
 * @returns {Object|null} Decoded cursor data, or null if invalid.
 */
function decodeCursor(cursor) {
  if (!cursor || typeof cursor !== 'string') {
    return null;
  }
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

module.exports = {
  generateToken,
  generateRandomHex,
  hashSHA256,
  generateRequestId,
  encodeCursor,
  decodeCursor,
};
