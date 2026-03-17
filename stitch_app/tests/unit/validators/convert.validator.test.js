'use strict';

const { convertSchema, ALLOWED_MERCHANTS } = require('../../../backend/src/validators/convert.validator');

function validateBody(schema, body) {
  return schema.body.validate(body, { abortEarly: false, allowUnknown: false, stripUnknown: true });
}

describe('Convert Validators', () => {
  describe('ALLOWED_MERCHANTS', () => {
    test('contains expected merchants', () => {
      expect(ALLOWED_MERCHANTS).toContain('Amazon');
      expect(ALLOWED_MERCHANTS).toContain('iTunes');
      expect(ALLOWED_MERCHANTS).toContain('Google Play');
      expect(ALLOWED_MERCHANTS).toContain('Visa');
      expect(ALLOWED_MERCHANTS).toContain('Mastercard');
      expect(ALLOWED_MERCHANTS).toContain('Steam');
      expect(ALLOWED_MERCHANTS).toContain('Netflix');
    });

    test('has 20 merchants', () => {
      expect(ALLOWED_MERCHANTS).toHaveLength(20);
    });
  });

  describe('convertSchema', () => {
    test('accepts valid conversion', () => {
      const { error, value } = validateBody(convertSchema, {
        merchant: 'Amazon',
        cardNumber: 'ABCD-1234-EFGH-5678',
        amountCents: 10000,
      });
      expect(error).toBeUndefined();
      expect(value.merchant).toBe('Amazon');
      expect(value.amountCents).toBe(10000);
    });

    test('accepts with optional pin', () => {
      const { error, value } = validateBody(convertSchema, {
        merchant: 'iTunes',
        cardNumber: 'XXXX-1234',
        pin: '1234',
        amountCents: 5000,
      });
      expect(error).toBeUndefined();
      expect(value.pin).toBe('1234');
    });

    test('accepts without pin', () => {
      const { error } = validateBody(convertSchema, {
        merchant: 'Steam',
        cardNumber: 'STEAM-CODE-123',
        amountCents: 5000,
      });
      expect(error).toBeUndefined();
    });

    test('rejects invalid merchant', () => {
      const { error } = validateBody(convertSchema, {
        merchant: 'InvalidStore',
        cardNumber: 'ABCD-1234',
        amountCents: 5000,
      });
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Invalid merchant');
    });

    test('rejects missing merchant', () => {
      const { error } = validateBody(convertSchema, {
        cardNumber: 'ABCD-1234',
        amountCents: 5000,
      });
      expect(error).toBeDefined();
    });

    test('rejects missing cardNumber', () => {
      const { error } = validateBody(convertSchema, {
        merchant: 'Amazon',
        amountCents: 5000,
      });
      expect(error).toBeDefined();
    });

    test('rejects missing amountCents', () => {
      const { error } = validateBody(convertSchema, {
        merchant: 'Amazon',
        cardNumber: 'ABCD-1234',
      });
      expect(error).toBeDefined();
    });

    test('rejects cardNumber with special chars (not alphanumeric/dash)', () => {
      const { error } = validateBody(convertSchema, {
        merchant: 'Amazon',
        cardNumber: 'ABCD 1234!@#',
        amountCents: 5000,
      });
      expect(error).toBeDefined();
    });

    test('accepts alphanumeric cardNumber with dashes', () => {
      const { error } = validateBody(convertSchema, {
        merchant: 'Amazon',
        cardNumber: 'ABC-123-DEF-456',
        amountCents: 5000,
      });
      expect(error).toBeUndefined();
    });

    test('rejects cardNumber shorter than 4 chars', () => {
      const { error } = validateBody(convertSchema, {
        merchant: 'Amazon',
        cardNumber: 'AB',
        amountCents: 5000,
      });
      expect(error).toBeDefined();
    });

    test('rejects cardNumber longer than 50 chars', () => {
      const { error } = validateBody(convertSchema, {
        merchant: 'Amazon',
        cardNumber: 'A'.repeat(51),
        amountCents: 5000,
      });
      expect(error).toBeDefined();
    });

    test('rejects zero amount', () => {
      const { error } = validateBody(convertSchema, {
        merchant: 'Amazon',
        cardNumber: 'ABCD-1234',
        amountCents: 0,
      });
      expect(error).toBeDefined();
    });

    test('rejects amount over 5,000,000 cents', () => {
      const { error } = validateBody(convertSchema, {
        merchant: 'Amazon',
        cardNumber: 'ABCD-1234',
        amountCents: 5000001,
      });
      expect(error).toBeDefined();
    });

    test('rejects non-integer amount', () => {
      const { error } = validateBody(convertSchema, {
        merchant: 'Amazon',
        cardNumber: 'ABCD-1234',
        amountCents: 10.5,
      });
      expect(error).toBeDefined();
    });

    test('rejects pin over 20 chars', () => {
      const { error } = validateBody(convertSchema, {
        merchant: 'Amazon',
        cardNumber: 'ABCD-1234',
        amountCents: 5000,
        pin: 'a'.repeat(21),
      });
      expect(error).toBeDefined();
    });

    test('validates each allowed merchant', () => {
      for (const merchant of ALLOWED_MERCHANTS) {
        const { error } = validateBody(convertSchema, {
          merchant,
          cardNumber: 'TEST-1234',
          amountCents: 1000,
        });
        expect(error).toBeUndefined();
      }
    });
  });
});
