'use strict';

/**
 * Currency utility module.
 * ALL monetary values are integer cents. No floating-point touches money.
 */

/**
 * Convert a legacy dollar amount to integer cents.
 * Only used during migration. NOT for normal operations.
 * @param {number} dollars - Dollar amount (e.g., 12.50).
 * @returns {number} Integer cents (e.g., 1250).
 */
function dollarsToCents(dollars) {
  if (typeof dollars !== 'number' || !Number.isFinite(dollars)) {
    return 0;
  }
  return Math.round(dollars * 100);
}

/**
 * Format integer cents as a display string for API convenience fields.
 * @param {number} cents - Integer cents (e.g., 1250).
 * @returns {string} Formatted string (e.g., "$12.50").
 */
function centsToDisplay(cents) {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) {
    return '$0.00';
  }
  const dollars = cents / 100;
  // Use toLocaleString for proper formatting with commas
  return `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format cents as a signed display string for transactions.
 * @param {number} cents - Integer cents; positive for credits, negative for debits.
 * @returns {string} Formatted string (e.g., "+$12.50" or "-$12.50").
 */
function centsToSignedDisplay(cents) {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) {
    return '$0.00';
  }
  const abs = Math.abs(cents);
  const dollars = abs / 100;
  const formatted = dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return cents >= 0 ? `+$${formatted}` : `-$${formatted}`;
}

/**
 * Apply an exchange rate to an amount in cents, returning integer cents.
 * The rate is a float (e.g., 0.9), but the result is always an integer.
 * @param {number} amountCents - Amount in integer cents.
 * @param {number} rate - Exchange rate (e.g., 0.9).
 * @returns {number} Result in integer cents.
 */
function applyExchangeRate(amountCents, rate) {
  if (!Number.isInteger(amountCents) || typeof rate !== 'number' || !Number.isFinite(rate)) {
    return 0;
  }
  return Math.round(amountCents * rate);
}

/**
 * Validate that a value is a positive integer within bounds.
 * @param {*} value - Value to check.
 * @param {number} [max=5000000] - Maximum allowed value in cents ($50,000).
 * @returns {boolean} True if valid.
 */
function isValidCents(value, max = 5_000_000) {
  return Number.isInteger(value) && value > 0 && value <= max;
}

module.exports = {
  dollarsToCents,
  centsToDisplay,
  centsToSignedDisplay,
  applyExchangeRate,
  isValidCents,
};
