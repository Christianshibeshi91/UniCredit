'use strict';

const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { AuthenticationError, TokenExpiredError, AccessDeniedError } = require('../utils/errors');
const { getUserRoleAndStatus } = require('../services/userStatus.service');

/**
 * JWT verification middleware.
 * Extracts userId and userRole from the JWT and attaches to req.
 * Throws AuthenticationError if no valid token is present.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Authentication required');
  }

  const token = authHeader.slice(7); // Remove 'Bearer '

  if (!token) {
    throw new AuthenticationError('Authentication required');
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role || 'user';
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new TokenExpiredError('Invalid or expired token');
    }
    throw new AuthenticationError('Invalid or expired token');
  }
}

/**
 * Middleware to check that the authenticated user is not suspended.
 * Used on financial endpoints (convert, gift send, stripe checkout)
 * to enforce real-time account status without waiting for JWT expiry.
 */
async function checkNotSuspended(req, res, next) {
  try {
    const liveData = await getUserRoleAndStatus(req.userId);
    if (liveData && liveData.status === 'suspended') {
      throw new AccessDeniedError('Account suspended');
    }
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Generate a JWT token for a user.
 * @param {string} userId - User's document ID.
 * @param {string} role - User's role ('user' or 'admin').
 * @returns {string} Signed JWT token.
 */
function generateJWT(userId, role) {
  return jwt.sign({ userId, role }, env.JWT_SECRET, { expiresIn: '24h' });
}

module.exports = {
  authMiddleware,
  checkNotSuspended,
  generateJWT,
};
