'use strict';

const Joi = require('joi');
const { VALID_TYPES, VALID_CATEGORIES } = require('../models/transaction.model');

/**
 * Wallet transaction query parameter validation schemas.
 */

const transactionsQuerySchema = {
  query: Joi.object({
    cursor: Joi.string().max(500).optional().allow('', null),
    limit: Joi.number().integer().min(1).max(100).default(20),
    category: Joi.string().valid(...VALID_CATEGORIES).optional().allow('', null),
    type: Joi.string().valid(...VALID_TYPES).optional().allow('', null),
  }),
};

module.exports = {
  transactionsQuerySchema,
};
