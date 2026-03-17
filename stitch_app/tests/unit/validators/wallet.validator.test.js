'use strict';

/**
 * Tests for BUG-007: Wallet transaction query parameter validation.
 */

const { transactionsQuerySchema } = require('../../../backend/src/validators/wallet.validator');

describe('Wallet Validator (BUG-007)', () => {
  const schema = transactionsQuerySchema.query;

  test('accepts valid query with all params', () => {
    const { error, value } = schema.validate({
      cursor: 'abc123',
      limit: 50,
      category: 'top_up',
      type: 'credit',
    });

    expect(error).toBeUndefined();
    expect(value.limit).toBe(50);
    expect(value.category).toBe('top_up');
    expect(value.type).toBe('credit');
  });

  test('accepts empty query (all optional)', () => {
    const { error, value } = schema.validate({});

    expect(error).toBeUndefined();
    expect(value.limit).toBe(20); // default
  });

  test('rejects limit below 1', () => {
    const { error } = schema.validate({ limit: 0 });
    expect(error).toBeDefined();
  });

  test('rejects limit above 100', () => {
    const { error } = schema.validate({ limit: 101 });
    expect(error).toBeDefined();
  });

  test('rejects invalid category', () => {
    const { error } = schema.validate({ category: 'nonexistent' });
    expect(error).toBeDefined();
  });

  test('rejects invalid type', () => {
    const { error } = schema.validate({ type: 'refund' });
    expect(error).toBeDefined();
  });

  test('accepts all valid categories', () => {
    const validCategories = ['gift_card', 'gift_sent', 'gift_received', 'gift_refund', 'top_up', 'general'];
    for (const category of validCategories) {
      const { error } = schema.validate({ category });
      expect(error).toBeUndefined();
    }
  });

  test('accepts both valid types', () => {
    for (const type of ['credit', 'debit']) {
      const { error } = schema.validate({ type });
      expect(error).toBeUndefined();
    }
  });

  test('rejects non-integer limit', () => {
    const { error } = schema.validate({ limit: 10.5 });
    expect(error).toBeDefined();
  });
});
