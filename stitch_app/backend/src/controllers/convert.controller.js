'use strict';

const conversionService = require('../services/conversion.service');

/**
 * Convert Controller
 * Handles gift card conversion operations.
 */

async function convertGiftCard(req, res, next) {
  try {
    const { merchant, cardNumber, pin, amountCents } = req.body;
    const result = await conversionService.convertGiftCard(
      req.userId,
      merchant,
      cardNumber,
      pin,
      amountCents,
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  convertGiftCard,
};
