'use strict';

const rateLimit = require('express-rate-limit');
const { getRedisClient, isRedisEnabled } = require('../config/redis');

/**
 * Create a rate limiter middleware with Redis store (if available) or in-memory fallback.
 *
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds.
 * @param {number} options.max - Maximum requests per window.
 * @param {Function} [options.keyGenerator] - Custom key generator (default: req.ip).
 * @param {string} [options.message] - Error message on limit exceeded.
 * @returns {Function} Express middleware.
 */
function createRateLimiter({ windowMs, max, keyGenerator, message = 'Too many requests. Please try again later.' }) {
  const options = {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator || ((req) => req.ip),
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
      },
    },
  };

  // Use Redis store if available
  if (isRedisEnabled()) {
    try {
      const RedisStore = require('rate-limit-redis');
      const client = getRedisClient();
      options.store = new RedisStore({
        sendCommand: (...args) => client.call(...args),
      });
    } catch {
      // Fall back to in-memory if rate-limit-redis is not available
    }
  }

  return rateLimit(options);
}

/**
 * Pre-configured rate limiters for different tiers.
 */

// Auth endpoints: 15 requests per 15 minutes per IP
const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many requests. Please try again later.',
});

// Password reset: 5 requests per hour per IP
const passwordResetRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many requests. Please try again later.',
});

// Financial endpoints: 10 requests per minute per user
const financialRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.userId || req.ip,
  message: 'Too many requests. Please try again later.',
});

// General API: 100 requests per minute per user
const generalRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.userId || req.ip,
  message: 'Too many requests. Please try again later.',
});

// Admin endpoints: 60 requests per minute per user
const adminRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.userId || req.ip,
  message: 'Too many requests. Please try again later.',
});

module.exports = {
  createRateLimiter,
  authRateLimit,
  passwordResetRateLimit,
  financialRateLimit,
  generalRateLimit,
  adminRateLimit,
};
