'use strict';

const Joi = require('joi');
const validate = require('../../../backend/src/middleware/validate');
const { ValidationError } = require('../../../backend/src/utils/errors');

describe('Validate Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
    };
    res = {};
    next = jest.fn();
  });

  describe('body validation', () => {
    const schemas = {
      body: Joi.object({
        email: Joi.string().email().required(),
        name: Joi.string().max(50).optional(),
      }),
    };

    test('calls next() on valid body', () => {
      req.body = { email: 'test@example.com', name: 'Bob' };
      validate(schemas)(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('replaces req.body with validated value (strips unknown)', () => {
      req.body = { email: 'test@example.com', extra: 'field' };
      validate(schemas)(req, res, next);
      expect(req.body.email).toBe('test@example.com');
      expect(req.body.extra).toBeUndefined();
    });

    test('throws ValidationError on invalid body', () => {
      req.body = { email: 'not-email' };
      expect(() => validate(schemas)(req, res, next)).toThrow(ValidationError);
    });

    test('throws ValidationError with all error messages joined', () => {
      req.body = {};
      try {
        validate(schemas)(req, res, next);
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err.message).toBeTruthy();
      }
    });

    test('does not call next() on validation failure', () => {
      req.body = {};
      try {
        validate(schemas)(req, res, next);
      } catch {
        // Expected
      }
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('params validation', () => {
    const schemas = {
      params: Joi.object({
        id: Joi.string().min(1).required(),
      }),
    };

    test('calls next() on valid params', () => {
      req.params = { id: 'user123' };
      validate(schemas)(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('throws ValidationError on invalid params', () => {
      req.params = { id: '' };
      expect(() => validate(schemas)(req, res, next)).toThrow(ValidationError);
    });

    test('allows unknown params (Express route params)', () => {
      req.params = { id: 'user123', extra: 'value' };
      validate(schemas)(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('query validation', () => {
    const schemas = {
      query: Joi.object({
        limit: Joi.number().integer().min(1).max(100).default(20),
        cursor: Joi.string().optional().allow(''),
      }),
    };

    test('calls next() on valid query', () => {
      req.query = { limit: 10 };
      validate(schemas)(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('applies defaults', () => {
      req.query = {};
      validate(schemas)(req, res, next);
      expect(req.query.limit).toBe(20);
    });

    test('throws ValidationError on invalid query', () => {
      req.query = { limit: 200 };
      expect(() => validate(schemas)(req, res, next)).toThrow(ValidationError);
    });

    test('strips unknown query params', () => {
      req.query = { limit: 10, unknown: 'value' };
      validate(schemas)(req, res, next);
      expect(req.query.unknown).toBeUndefined();
    });
  });

  describe('combined validation', () => {
    const schemas = {
      body: Joi.object({
        value: Joi.number().required(),
      }),
      params: Joi.object({
        id: Joi.string().required(),
      }),
      query: Joi.object({
        format: Joi.string().valid('json', 'xml').default('json'),
      }),
    };

    test('validates all three parts', () => {
      req.body = { value: 42 };
      req.params = { id: 'abc' };
      req.query = { format: 'json' };
      validate(schemas)(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('fails on invalid body even if params and query are valid', () => {
      req.body = {};
      req.params = { id: 'abc' };
      req.query = {};
      expect(() => validate(schemas)(req, res, next)).toThrow(ValidationError);
    });
  });

  describe('no-schema passthrough', () => {
    test('calls next() when no schemas provided', () => {
      validate({})(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
