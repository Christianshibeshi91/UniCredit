'use strict';

const Joi = require('joi');

/**
 * Shared validation schemas and utilities.
 */

// Pagination query parameters
const paginationQuery = Joi.object({
  cursor: Joi.string().max(500).optional().allow('', null),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

// Common ID parameter
const idParam = Joi.object({
  id: Joi.string().min(1).max(128).required(),
});

// Token parameter (for claim tokens)
const tokenParam = Joi.object({
  token: Joi.string().min(1).max(128).required(),
});

// Setting key parameter
const settingKeyParam = Joi.object({
  key: Joi.string().min(1).max(100).required(),
});

module.exports = {
  paginationQuery,
  idParam,
  tokenParam,
  settingKeyParam,
};
