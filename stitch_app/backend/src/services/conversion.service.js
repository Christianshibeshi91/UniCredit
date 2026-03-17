'use strict';

const { db, firebaseEnabled } = require('../config/firebase');
const walletService = require('./wallet.service');
const { applyExchangeRate, centsToDisplay } = require('../utils/currency');
const { sanitizeString } = require('../utils/sanitize');

/**
 * Conversion Service
 * Handles gift card to UniCredit balance conversion.
 */

/**
 * Get the current exchange rate from settings.
 * @returns {number} Exchange rate (e.g., 0.9).
 */
async function getExchangeRate() {
  if (!firebaseEnabled) {
    return 0.9; // Default rate
  }

  try {
    const rateDoc = await db.collection('settings').doc('exchange_rate').get();
    if (rateDoc.exists) {
      return rateDoc.data().value || 0.9;
    }
  } catch {
    // Use default on error
  }

  return 0.9;
}

/**
 * Convert a gift card to UniCredit balance.
 * @param {string} userId - Authenticated user ID.
 * @param {string} merchant - Gift card merchant.
 * @param {string} cardNumber - Gift card number (stored temporarily for validation).
 * @param {string} [pin] - Gift card PIN.
 * @param {number} amountCents - Gift card value in integer cents.
 * @returns {Object} { creditedCents, displayCredited, newBalanceCents, displayBalance, exchangeRate }
 */
async function convertGiftCard(userId, merchant, cardNumber, pin, amountCents) {
  const exchangeRate = await getExchangeRate();
  const creditedCents = applyExchangeRate(amountCents, exchangeRate);

  const safeMerchant = sanitizeString(merchant);
  const description = `${safeMerchant} Gift Card Conversion`;

  const { newBalanceCents } = await walletService.creditBalance(
    userId,
    creditedCents,
    description,
    'gift_card',
  );

  return {
    success: true,
    creditedCents,
    displayCredited: centsToDisplay(creditedCents),
    newBalanceCents,
    displayBalance: centsToDisplay(newBalanceCents),
    exchangeRate,
  };
}

module.exports = {
  getExchangeRate,
  convertGiftCard,
};
