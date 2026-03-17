'use strict';

const { ValidationError } = require('../utils/errors');

/**
 * Joi schema validation middleware factory.
 * Validates req.body, req.params, and req.query against provided schemas.
 *
 * @param {Object} schemas - Object with optional body, params, and query Joi schemas.
 * @param {import('joi').Schema} [schemas.body] - Body validation schema.
 * @param {import('joi').Schema} [schemas.params] - Params validation schema.
 * @param {import('joi').Schema} [schemas.query] - Query validation schema.
 * @returns {Function} Express middleware.
 */
function validate(schemas) {
  return (req, res, next) => {
    const validationOptions = {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    };

    if (schemas.body) {
      const { error, value } = schemas.body.validate(req.body, validationOptions);
      if (error) {
        const message = error.details.map(d => d.message).join('; ');
        throw new ValidationError(message);
      }
      req.body = value;
    }

    if (schemas.params) {
      const { error, value } = schemas.params.validate(req.params, {
        ...validationOptions,
        allowUnknown: true,
      });
      if (error) {
        const message = error.details.map(d => d.message).join('; ');
        throw new ValidationError(message);
      }
      req.params = { ...req.params, ...value };
    }

    if (schemas.query) {
      const { error, value } = schemas.query.validate(req.query, validationOptions);
      if (error) {
        const message = error.details.map(d => d.message).join('; ');
        throw new ValidationError(message);
      }
      req.query = value;
    }

    next();
  };
}

module.exports = validate;
