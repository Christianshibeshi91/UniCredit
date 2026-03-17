'use strict';

const path = require('path');

// Load .env from backend root
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Environment variable loading and validation.
 * Fail-secure: crash on startup if required secrets are missing.
 */

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3000,
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
  LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // Security (required)
  JWT_SECRET: process.env.JWT_SECRET,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:5000'],

  // Firebase
  FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || null,

  // Redis
  REDIS_URL: process.env.REDIS_URL || null,

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || null,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || null,
  STRIPE_PRODUCT_ID: process.env.STRIPE_PRODUCT_ID || null,

  // SendGrid
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || null,
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || 'noreply@unicredit.app',
  SENDGRID_FROM_NAME: process.env.SENDGRID_FROM_NAME || 'UniCredit',

  // Google Cloud Storage
  GCS_BUCKET: process.env.GCS_BUCKET || null,
  GCS_PROJECT_ID: process.env.GCS_PROJECT_ID || null,

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || null,

  // Monitoring
  SENTRY_DSN: process.env.SENTRY_DSN || null,
};

/**
 * Computed properties
 */
env.isProduction = env.NODE_ENV === 'production';
env.isDevelopment = env.NODE_ENV === 'development';
env.isTest = env.NODE_ENV === 'test';

/**
 * Validate that all required environment variables are set.
 * In production, additional variables are mandatory.
 * Crashes the process if validation fails (fail-secure).
 */
function validateEnv() {
  const errors = [];

  // Always required
  if (!env.JWT_SECRET) {
    errors.push('JWT_SECRET is required');
  }

  if (env.isProduction) {
    // Reject placeholder values in production
    if (env.JWT_SECRET === 'dev-secret-change-in-production') {
      errors.push('JWT_SECRET must be changed from default in production');
    }

    // Production-required secrets (hard requirements)
    if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      errors.push('FIREBASE_SERVICE_ACCOUNT_JSON is required in production');
    }

    // Production-recommended secrets (soft warnings)
    const recommended = [
      ['STRIPE_WEBHOOK_SECRET', env.STRIPE_WEBHOOK_SECRET],
      ['REDIS_URL', env.REDIS_URL],
    ];
    for (const [name, value] of recommended) {
      if (!value) {
        console.warn(`WARNING: ${name} is not set — feature will be degraded`);
      }
    }
  }

  if (errors.length > 0) {
    console.error('FATAL: Environment validation failed:');
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
}

module.exports = { env, validateEnv };
