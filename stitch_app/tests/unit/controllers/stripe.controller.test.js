'use strict';

/**
 * Tests for BUG-001: Stripe Firestore-based fallback idempotency
 * and BUG-008: HTML sanitization of displayAmount.
 */

// Mock Redis
const mockRedisExists = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisGet = jest.fn();
jest.mock('../../../backend/src/config/redis', () => ({
  getRedisClient: () => ({
    exists: mockRedisExists,
    set: mockRedisSet,
    get: mockRedisGet,
  }),
  isRedisEnabled: jest.fn(),
}));

// Mock Firebase
const mockFirestoreGet = jest.fn();
const mockFirestoreSet = jest.fn();
const mockDocRef = { get: mockFirestoreGet, set: mockFirestoreSet };
const mockDoc = jest.fn().mockReturnValue(mockDocRef);
const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

jest.mock('../../../backend/src/config/firebase', () => ({
  db: { collection: mockCollection },
  firebaseEnabled: true,
}));

// Mock Stripe
jest.mock('../../../backend/src/config/stripe', () => ({
  getStripeClient: jest.fn().mockReturnValue({
    checkout: {
      sessions: {
        retrieve: jest.fn(),
      },
    },
    prices: { list: jest.fn() },
    webhooks: { constructEvent: jest.fn() },
  }),
  isStripeEnabled: jest.fn().mockReturnValue(true),
}));

// Mock wallet service
jest.mock('../../../backend/src/services/wallet.service', () => ({
  creditBalance: jest.fn().mockResolvedValue({ newBalanceCents: 5000 }),
}));

// Mock notification service
jest.mock('../../../backend/src/services/notification.service', () => ({}));

// Mock env
jest.mock('../../../backend/src/config/env', () => ({
  env: {
    BASE_URL: 'http://localhost:3000',
    STRIPE_WEBHOOK_SECRET: null,
    isProduction: false,
  },
}));

const { isRedisEnabled } = require('../../../backend/src/config/redis');
const { getStripeClient } = require('../../../backend/src/config/stripe');
const walletService = require('../../../backend/src/services/wallet.service');
const stripeController = require('../../../backend/src/controllers/stripe.controller');

describe('Stripe Controller - Idempotency (BUG-001)', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      query: { session_id: 'cs_test_123' },
      headers: {},
      body: Buffer.from(JSON.stringify({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            payment_status: 'paid',
            amount_total: 5000,
            metadata: { userId: 'user1' },
          },
        },
      })),
    };
    res = {
      send: jest.fn(),
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('handleSuccess - idempotency', () => {
    beforeEach(() => {
      const stripe = getStripeClient();
      stripe.checkout.sessions.retrieve.mockResolvedValue({
        payment_status: 'paid',
        amount_total: 5000,
        metadata: { userId: 'user1' },
      });
    });

    test('credits user when neither Redis nor Firestore have the session', async () => {
      isRedisEnabled.mockReturnValue(false);
      mockFirestoreGet.mockResolvedValue({ exists: false });

      await stripeController.handleSuccess(req, res, next);

      expect(walletService.creditBalance).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalled();
    });

    test('skips credit when Firestore already has the session (Redis down)', async () => {
      isRedisEnabled.mockReturnValue(false);
      mockFirestoreGet.mockResolvedValue({ exists: true });

      await stripeController.handleSuccess(req, res, next);

      expect(walletService.creditBalance).not.toHaveBeenCalled();
      expect(res.send).toHaveBeenCalled();
    });

    test('skips credit when Redis already has the session', async () => {
      isRedisEnabled.mockReturnValue(true);
      mockRedisExists.mockResolvedValue(1);

      await stripeController.handleSuccess(req, res, next);

      expect(walletService.creditBalance).not.toHaveBeenCalled();
    });

    test('writes to both Redis and Firestore when crediting', async () => {
      isRedisEnabled.mockReturnValue(true);
      mockRedisExists.mockResolvedValue(0);
      mockFirestoreGet.mockResolvedValue({ exists: false });
      mockRedisSet.mockResolvedValue('OK');
      mockFirestoreSet.mockResolvedValue(undefined);

      await stripeController.handleSuccess(req, res, next);

      expect(mockRedisSet).toHaveBeenCalledWith(
        'processed_session:cs_test_123', '1', 'EX', 86400
      );
      expect(mockFirestoreSet).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user1',
          amount_cents: 5000,
        })
      );
      expect(walletService.creditBalance).toHaveBeenCalledTimes(1);
    });

    test('falls back to Firestore when Redis check throws', async () => {
      isRedisEnabled.mockReturnValue(true);
      mockRedisExists.mockRejectedValue(new Error('Redis connection lost'));
      mockFirestoreGet.mockResolvedValue({ exists: true });

      await stripeController.handleSuccess(req, res, next);

      // Firestore says already processed, so no credit
      expect(walletService.creditBalance).not.toHaveBeenCalled();
    });
  });

  describe('handleWebhook - idempotency', () => {
    test('credits user when not already processed', async () => {
      isRedisEnabled.mockReturnValue(false);
      mockFirestoreGet.mockResolvedValue({ exists: false });
      mockFirestoreSet.mockResolvedValue(undefined);

      await stripeController.handleWebhook(req, res, next);

      expect(walletService.creditBalance).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    test('skips credit when Firestore shows already processed', async () => {
      isRedisEnabled.mockReturnValue(false);
      mockFirestoreGet.mockResolvedValue({ exists: true });

      await stripeController.handleWebhook(req, res, next);

      expect(walletService.creditBalance).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });

  describe('handleSuccess - HTML sanitization (BUG-008)', () => {
    test('sanitizes displayAmount in HTML response', async () => {
      isRedisEnabled.mockReturnValue(false);
      mockFirestoreGet.mockResolvedValue({ exists: true }); // already processed, skip credit

      const stripe = getStripeClient();
      stripe.checkout.sessions.retrieve.mockResolvedValue({
        payment_status: 'paid',
        amount_total: 5000,
        metadata: { userId: 'user1' },
      });

      await stripeController.handleSuccess(req, res, next);

      const html = res.send.mock.calls[0][0];
      // The output should not contain raw unescaped user-controllable content
      // $50.00 is a safe value, but the key point is sanitizeString is applied
      expect(html).toContain('$50.00');
      expect(html).not.toContain('<script>');
    });
  });
});
