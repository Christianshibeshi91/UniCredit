'use strict';

/**
 * HTML entity escaping to prevent XSS in stored user-provided strings.
 * Applied to all user-provided text before storage.
 */

const ENTITY_MAP = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
};

const ENTITY_REGEX = /[<>&"'`/]/g;

/**
 * Escape HTML entities in a string.
 * @param {*} str - Input to sanitize.
 * @returns {string} Sanitized string, or empty string if input is not a string.
 */
function sanitizeString(str) {
  if (typeof str !== 'string') {
    return '';
  }
  return str.replace(ENTITY_REGEX, (char) => ENTITY_MAP[char] || char);
}

/**
 * Sanitize all string values in a flat object (one level deep).
 * Non-string values are passed through unchanged.
 * @param {Object} obj - Object with string values to sanitize.
 * @param {string[]} [keys] - Optional list of keys to sanitize. If omitted, all string values are sanitized.
 * @returns {Object} New object with sanitized string values.
 */
function sanitizeObject(obj, keys) {
  if (!obj || typeof obj !== 'object') {
    return {};
  }
  const result = { ...obj };
  const targetKeys = keys || Object.keys(result);
  for (const key of targetKeys) {
    if (typeof result[key] === 'string') {
      result[key] = sanitizeString(result[key]);
    }
  }
  return result;
}

module.exports = {
  sanitizeString,
  sanitizeObject,
};
