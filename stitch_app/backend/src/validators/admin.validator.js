'use strict';

const Joi = require('joi');

/**
 * Admin endpoint validation schemas.
 */

const adminUsersQuery = {
  query: Joi.object({
    cursor: Joi.string().max(500).optional().allow('', null),
    limit: Joi.number().integer().min(1).max(100).default(50),
    search: Joi.string().max(200).optional().allow('', null),
    status: Joi.string().valid('active', 'suspended').optional().allow('', null),
  }),
};

const suspendUserSchema = {
  body: Joi.object({
    reason: Joi.string().max(500).required()
      .messages({ 'any.required': 'Suspension reason is required' }),
  }),
};

const resolveFraudFlagSchema = {
  body: Joi.object({
    notes: Joi.string().max(1000).optional().allow('', null),
  }),
};

const blockFraudFlagSchema = {
  body: Joi.object({
    notes: Joi.string().max(1000).optional().allow('', null),
  }),
};

const updateSettingSchema = {
  body: Joi.object({
    value: Joi.alternatives().try(
      Joi.number(),
      Joi.boolean(),
      Joi.string().max(500),
    ).required()
      .messages({ 'any.required': 'value is required' }),
  }),
};

const fraudFlagsQuery = {
  query: Joi.object({
    cursor: Joi.string().max(500).optional().allow('', null),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('open', 'reviewing', 'resolved', 'blocked').default('open'),
  }),
};

const auditLogQuery = {
  query: Joi.object({
    cursor: Joi.string().max(500).optional().allow('', null),
    limit: Joi.number().integer().min(1).max(100).default(50),
    actorId: Joi.string().max(128).optional().allow('', null),
    targetType: Joi.string().valid('user', 'setting', 'fraud_flag', 'gift').optional().allow('', null),
  }),
};

module.exports = {
  adminUsersQuery,
  suspendUserSchema,
  resolveFraudFlagSchema,
  blockFraudFlagSchema,
  updateSettingSchema,
  fraudFlagsQuery,
  auditLogQuery,
};
