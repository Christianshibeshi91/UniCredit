'use strict';

const Joi = require('joi');

/**
 * Gift card conversion endpoint validation schemas.
 */

const ALLOWED_MERCHANTS = [
  'Amazon', 'iTunes', 'Google Play', 'Visa', 'Mastercard',
  'Target', 'Walmart', 'Best Buy', 'Starbucks', 'Nike',
  'Steam', 'PlayStation', 'Xbox', 'Netflix', 'Spotify',
  'Uber', 'DoorDash', 'Sephora', 'Home Depot', 'Lowes',
];

const convertSchema = {
  body: Joi.object({
    merchant: Joi.string().valid(...ALLOWED_MERCHANTS).required()
      .messages({
        'any.required': 'Merchant and card number required',
        'any.only': 'Invalid merchant. Must be one of the supported merchants.',
      }),
    cardNumber: Joi.string().min(4).max(50).pattern(/^[a-zA-Z0-9\-]+$/).required()
      .messages({
        'any.required': 'Merchant and card number required',
        'string.pattern.base': 'Card number must be alphanumeric (dashes allowed)',
      }),
    pin: Joi.string().max(20).optional().allow('', null),
    amountCents: Joi.number().integer().min(1).max(5_000_000).required()
      .messages({
        'any.required': 'Amount is required',
        'number.min': 'Invalid amount. Must be between $0.01 and $50,000.00.',
        'number.max': 'Invalid amount. Must be between $0.01 and $50,000.00.',
      }),
  }),
};

module.exports = {
  convertSchema,
  ALLOWED_MERCHANTS,
};
