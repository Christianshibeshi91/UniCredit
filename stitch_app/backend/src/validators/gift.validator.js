'use strict';

const Joi = require('joi');

/**
 * Gift endpoint validation schemas.
 */

const sendGiftSchema = {
  body: Joi.object({
    recipientEmail: Joi.string().email().max(254).required()
      .messages({
        'any.required': 'Recipient email and amount required',
        'string.email': 'Invalid recipient email',
      }),
    amountCents: Joi.number().integer().min(1).max(5_000_000).required()
      .messages({
        'any.required': 'Recipient email and amount required',
        'number.min': 'Invalid amount. Must be between $0.01 and $50,000.00.',
        'number.max': 'Invalid amount. Must be between $0.01 and $50,000.00.',
      }),
    message: Joi.string().max(2000).optional().allow('', null).default('Enjoy your gift!'),
    occasion: Joi.string().max(100).optional().allow('', null),
    scheduledAt: Joi.string().isoDate().optional().allow(null),
  }),
};

const updateGiftMediaSchema = {
  body: Joi.object({
    videoKey: Joi.string().max(500).optional().allow(null)
      .pattern(/^gifts\/[a-zA-Z0-9_]+\//)
      .messages({ 'string.pattern.base': 'Invalid video key format' }),
    audioKey: Joi.string().max(500).optional().allow(null)
      .pattern(/^gifts\/[a-zA-Z0-9_]+\//)
      .messages({ 'string.pattern.base': 'Invalid audio key format' }),
  }).or('videoKey', 'audioKey'),
};

module.exports = {
  sendGiftSchema,
  updateGiftMediaSchema,
};
