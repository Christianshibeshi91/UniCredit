'use strict';

const {
  VALID_TYPES,
  VALID_CATEGORIES,
  createTransactionDocument,
  toApiResponse,
} = require('../../../backend/src/models/transaction.model');

describe('Transaction Model', () => {
  describe('constants', () => {
    test('VALID_TYPES contains credit and debit', () => {
      expect(VALID_TYPES).toContain('credit');
      expect(VALID_TYPES).toContain('debit');
      expect(VALID_TYPES).toHaveLength(2);
    });

    test('VALID_CATEGORIES contains expected categories', () => {
      expect(VALID_CATEGORIES).toContain('gift_card');
      expect(VALID_CATEGORIES).toContain('gift_sent');
      expect(VALID_CATEGORIES).toContain('gift_received');
      expect(VALID_CATEGORIES).toContain('gift_refund');
      expect(VALID_CATEGORIES).toContain('top_up');
      expect(VALID_CATEGORIES).toContain('general');
    });
  });

  describe('createTransactionDocument', () => {
    test('creates credit transaction with positive amount', () => {
      const doc = createTransactionDocument({
        userId: 'user123',
        amountCents: 5000,
        type: 'credit',
        description: 'Gift card conversion',
        category: 'gift_card',
      });
      expect(doc.user_id).toBe('user123');
      expect(doc.amount_cents).toBe(5000);
      expect(doc.type).toBe('credit');
      expect(doc.description).toBe('Gift card conversion');
      expect(doc.category).toBe('gift_card');
      expect(doc.created_at).toBeDefined();
    });

    test('creates debit transaction with negative amount', () => {
      const doc = createTransactionDocument({
        userId: 'user123',
        amountCents: 5000,
        type: 'debit',
        description: 'Sent gift',
        category: 'gift_sent',
      });
      expect(doc.amount_cents).toBe(-5000);
      expect(doc.type).toBe('debit');
    });

    test('enforces negative sign for debit even if passed positive amount', () => {
      const doc = createTransactionDocument({
        userId: 'user123',
        amountCents: 3000,
        type: 'debit',
        description: 'Debit',
      });
      expect(doc.amount_cents).toBe(-3000);
    });

    test('enforces positive sign for credit even if passed negative amount', () => {
      const doc = createTransactionDocument({
        userId: 'user123',
        amountCents: -3000,
        type: 'credit',
        description: 'Credit',
      });
      expect(doc.amount_cents).toBe(3000);
    });

    test('defaults category to general', () => {
      const doc = createTransactionDocument({
        userId: 'user123',
        amountCents: 1000,
        type: 'credit',
        description: 'Test',
      });
      expect(doc.category).toBe('general');
    });

    test('defaults reference fields to null', () => {
      const doc = createTransactionDocument({
        userId: 'user123',
        amountCents: 1000,
        type: 'credit',
        description: 'Test',
      });
      expect(doc.reference_id).toBeNull();
      expect(doc.reference_type).toBeNull();
    });

    test('includes reference fields when provided', () => {
      const doc = createTransactionDocument({
        userId: 'user123',
        amountCents: 1000,
        type: 'credit',
        description: 'Test',
        referenceId: 'gift-abc',
        referenceType: 'gift',
      });
      expect(doc.reference_id).toBe('gift-abc');
      expect(doc.reference_type).toBe('gift');
    });

    test('sets created_at to ISO timestamp', () => {
      const before = new Date().toISOString();
      const doc = createTransactionDocument({
        userId: 'user123',
        amountCents: 1000,
        type: 'credit',
        description: 'Test',
      });
      const after = new Date().toISOString();
      expect(doc.created_at >= before).toBe(true);
      expect(doc.created_at <= after).toBe(true);
    });
  });

  describe('toApiResponse', () => {
    test('maps Firestore document to API response', () => {
      const response = toApiResponse('tx-123', {
        amount_cents: 5000,
        type: 'credit',
        description: 'Gift card conversion',
        category: 'gift_card',
        reference_id: 'ref-1',
        created_at: '2024-01-01T00:00:00Z',
      });

      expect(response.id).toBe('tx-123');
      expect(response.amountCents).toBe(5000);
      expect(response.displayAmount).toBe('+$50.00');
      expect(response.type).toBe('credit');
      expect(response.description).toBe('Gift card conversion');
      expect(response.category).toBe('gift_card');
      expect(response.referenceId).toBe('ref-1');
      expect(response.createdAt).toBe('2024-01-01T00:00:00Z');
    });

    test('displays negative amount for debit', () => {
      const response = toApiResponse('tx-456', {
        amount_cents: -3000,
        type: 'debit',
        description: 'Sent gift',
        category: 'gift_sent',
        created_at: '2024-01-01T00:00:00Z',
      });

      expect(response.amountCents).toBe(-3000);
      expect(response.displayAmount).toBe('-$30.00');
    });

    test('defaults category to general when missing', () => {
      const response = toApiResponse('tx-789', {
        amount_cents: 1000,
        type: 'credit',
        description: 'Test',
        created_at: '2024-01-01T00:00:00Z',
      });
      expect(response.category).toBe('general');
    });

    test('defaults referenceId to null when missing', () => {
      const response = toApiResponse('tx-789', {
        amount_cents: 1000,
        type: 'credit',
        description: 'Test',
        created_at: '2024-01-01T00:00:00Z',
      });
      expect(response.referenceId).toBeNull();
    });
  });
});
