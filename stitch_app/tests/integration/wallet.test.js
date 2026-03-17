'use strict';

/**
 * Integration Tests: Wallet Flow
 * Tests: GET /api/v1/wallet/balance, GET /api/v1/wallet/transactions
 * Covers balance checks, transaction history, pagination, and IDOR protection.
 */

const { stores, resetStores, createTestUser } = require('./setup');
const request = require('supertest');
const app = require('../../backend/src/app');

beforeEach(() => {
  resetStores();
  jest.clearAllMocks();
});

describe('Wallet Flow Integration', () => {
  // ─── Balance ───────────────────────────────────────────────────────────────

  describe('GET /api/v1/wallet/balance', () => {
    it('should return balance for authenticated user', async () => {
      const { token } = await createTestUser({ balanceCents: 15000 });

      const res = await request(app)
        .get('/api/v1/wallet/balance')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.balanceCents).toBe(15000);
      expect(res.body.data.displayBalance).toBeDefined();
      expect(res.body.data.tier).toBe('STANDARD');
    });

    it('should return zero balance for new user', async () => {
      const { token } = await createTestUser({ balanceCents: 0 });

      const res = await request(app)
        .get('/api/v1/wallet/balance')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.balanceCents).toBe(0);
      expect(res.body.data.displayBalance).toBe('$0.00');
    });

    it('should reject unauthenticated balance request', async () => {
      const res = await request(app)
        .get('/api/v1/wallet/balance')
        .expect(401);
    });

    it('should return only the requesting user balance (IDOR protection)', async () => {
      const user1 = await createTestUser({ email: 'user1@test.com', balanceCents: 50000 });
      const user2 = await createTestUser({ email: 'user2@test.com', balanceCents: 100 });

      // User2 should see their own balance, not user1's
      const res = await request(app)
        .get('/api/v1/wallet/balance')
        .set('Authorization', `Bearer ${user2.token}`)
        .expect(200);

      expect(res.body.data.balanceCents).toBe(100);
    });
  });

  // ─── Transactions ──────────────────────────────────────────────────────────

  describe('GET /api/v1/wallet/transactions', () => {
    it('should return empty transaction list for new user', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .get('/api/v1/wallet/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
      expect(res.body.pagination).toBeDefined();
    });

    it('should return transactions after conversion', async () => {
      const { token } = await createTestUser();
      stores.settings.set('exchange_rate', { value: 0.9 });

      // Perform a conversion to generate a transaction
      await request(app)
        .post('/api/v1/convert')
        .set('Authorization', `Bearer ${token}`)
        .send({ merchant: 'Amazon', cardNumber: 'CARD-1234', amountCents: 10000 })
        .expect(200);

      const res = await request(app)
        .get('/api/v1/wallet/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
      const tx = res.body.data[0];
      expect(tx.type).toBe('credit');
      expect(tx.amountCents).toBe(9000);
      expect(tx.description).toContain('Amazon');
      expect(tx.createdAt).toBeDefined();
    });

    it('should only show requesting user transactions (no cross-user leakage)', async () => {
      const user1 = await createTestUser({ email: 'user1@test.com' });
      const user2 = await createTestUser({ email: 'user2@test.com' });

      stores.settings.set('exchange_rate', { value: 0.9 });

      // User1 does a conversion
      await request(app)
        .post('/api/v1/convert')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ merchant: 'Amazon', cardNumber: 'CARD-001', amountCents: 10000 })
        .expect(200);

      // User2 should see no transactions
      const res = await request(app)
        .get('/api/v1/wallet/transactions')
        .set('Authorization', `Bearer ${user2.token}`)
        .expect(200);

      expect(res.body.data.length).toBe(0);
    });

    it('should reject unauthenticated transaction request', async () => {
      const res = await request(app)
        .get('/api/v1/wallet/transactions')
        .expect(401);
    });
  });
});
