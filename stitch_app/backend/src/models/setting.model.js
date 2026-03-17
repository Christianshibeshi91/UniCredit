'use strict';

/**
 * Setting document schema and helpers for Firestore.
 * Collection: settings
 * Document ID: Setting key (e.g., "exchange_rate")
 */

/**
 * Known settings with their types and constraints.
 */
const KNOWN_SETTINGS = {
  exchange_rate: {
    valueType: 'number',
    min: 0.01,
    max: 1.0,
    defaultValue: 0.9,
    description: 'Gift card to UniCredit exchange rate',
  },
  global_rate_lock: {
    valueType: 'boolean',
    defaultValue: false,
    description: 'Whether exchange rate is globally locked',
  },
  standard_spread: {
    valueType: 'integer',
    min: 0,
    max: 10000,
    defaultValue: 291,
    description: 'Standard spread in basis points',
  },
  gift_expiration_days: {
    valueType: 'integer',
    min: 1,
    max: 365,
    defaultValue: 90,
    description: 'Days until unclaimed gifts expire',
  },
  max_gift_amount_cents: {
    valueType: 'integer',
    min: 100,
    max: 10_000_000,
    defaultValue: 5_000_000,
    description: 'Maximum gift amount in cents',
  },
  max_conversion_amount_cents: {
    valueType: 'integer',
    min: 100,
    max: 10_000_000,
    defaultValue: 5_000_000,
    description: 'Maximum conversion amount in cents',
  },
};

/**
 * Validate a setting value against its known constraints.
 * @param {string} key - Setting key.
 * @param {*} value - Proposed value.
 * @returns {{ valid: boolean, error?: string }} Validation result.
 */
function validateSettingValue(key, value) {
  const config = KNOWN_SETTINGS[key];
  if (!config) {
    return { valid: false, error: `Unknown setting key: ${key}` };
  }

  if (config.valueType === 'boolean') {
    if (typeof value !== 'boolean') {
      return { valid: false, error: `Setting ${key} must be a boolean` };
    }
    return { valid: true };
  }

  if (config.valueType === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return { valid: false, error: `Setting ${key} must be a number` };
    }
    if (config.min !== undefined && value < config.min) {
      return { valid: false, error: `Setting ${key} must be >= ${config.min}` };
    }
    if (config.max !== undefined && value > config.max) {
      return { valid: false, error: `Setting ${key} must be <= ${config.max}` };
    }
    return { valid: true };
  }

  if (config.valueType === 'integer') {
    if (!Number.isInteger(value)) {
      return { valid: false, error: `Setting ${key} must be an integer` };
    }
    if (config.min !== undefined && value < config.min) {
      return { valid: false, error: `Setting ${key} must be >= ${config.min}` };
    }
    if (config.max !== undefined && value > config.max) {
      return { valid: false, error: `Setting ${key} must be <= ${config.max}` };
    }
    return { valid: true };
  }

  if (config.valueType === 'string') {
    if (typeof value !== 'string') {
      return { valid: false, error: `Setting ${key} must be a string` };
    }
    return { valid: true };
  }

  return { valid: false, error: `Unsupported value type for setting ${key}` };
}

/**
 * Create a setting document object.
 * @param {Object} params
 * @returns {Object} Firestore document data.
 */
function createSettingDocument({ key, value, updatedBy = 'system' }) {
  const config = KNOWN_SETTINGS[key];
  return {
    key,
    value,
    value_type: config ? config.valueType : typeof value,
    description: config ? config.description : '',
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };
}

module.exports = {
  KNOWN_SETTINGS,
  validateSettingValue,
  createSettingDocument,
};
