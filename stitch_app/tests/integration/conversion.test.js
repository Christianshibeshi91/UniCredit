'use strict';

/**
 * Integration Tests: Conversion Flow
 * Tests: login -> convert gift card -> verify balance + transaction record.
 * Exercises: POST /api/v1/convert, GET /api/v1/wallet/balance, GET /api/v1/wallet/transactions
 */

const { stores, resetStores, createTestUser } = require('./setup');
const request = require('supertest');
const app = require('../../backend/src/app');

beforeEach(() => {
  resetStores();
  jest.clearAllMocks();
});

describe('Conversion Flow Integration', () => {
  // ─── Gift Card Conversion ──────────────────────────────────────────────────

  describe('POST /api/v1/convert', () => {
    it('should convert a gift card and credit balance at exchange rate', async () => {
      const { token, userId } = await createTestUser();

      // Set exchange rate in settings
      stores.settings.set('exchange_rate', { value: 0.9 });

      const res = await request(app)
        .post('/api/v1/convert')
        .set('Authorization', `Bearer ${token}`)
        .send({
          merchant: 'Amazon',
          cardNumber: 'ABC-1234-5678',
          pin: '1234',
          amountCents: 10000, // $100.00
        })
        .expect(200);

      expect(res.body.data.success).toBe(true);
      expect(res.body.data.creditedCents).toBe(9000); // $100 * 0.9 = $90
      expect(res.body.data.exchangeRate).toBe(0.9);
      expect(res.body.data.displayCredited).toBeDefined();
    });

    it('should verify balance is updated after conversion', async () => {
      const { token, userId } = await createTestUser();
      stores.settings.set('exchange_rate', { value: 0.85 });

      // Convert
      await request(app)
        .post('/api/v1/convert')
        .set('Authorization', `Bearer ${token}`)
        .send({
          merchant: 'iTunes',
          cardNumber: 'ITUN-9999',
          amountCents: 5000, // $50
        })
        .expect(200);

      // Check balance
      const balRes = await request(app)
        .get('/api/v1/wallet/balance')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(balRes.body.data.balanceCents).toBe(4250); // $50 * 0.85 = $42.50
    });

    it('should create a transaction record for the conversion', async () => {
      const { token, userId } = await createTestUser();
      stores.settings.set('exchange_rate', { value: 0.9 });

      await request(app)
        .post('/api/v1/convert')
        .set('Authorization', `Bearer ${token}`)
        .send({
          merchant: 'Google Play',
          cardNumber: 'GP-1111-2222',
          amountCents: 2500,
        })
        .expect(200);

      // Check transactions
      const txRes = await request(app)
        .get('/api/v1/wallet/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(txRes.body.data.length).toBeGreaterThan(0);
      const tx = txRes.body.data[0];
      expect(tx.type).toBe('credit');
      expect(tx.category).toBe('gift_card');
      expect(tx.amountCents).toBe(2250); // 2500 * 0.9
    });

    it('should use default 0.9 rate when no setting configured', async () => {
      const { token } = await createTestUser();
      // No exchange_rate in settings

      const res = await request(app)
        .post('/api/v1/convert')
        .set('Authorization', `Bearer ${token}`)
        .send({
          merchant: 'Visa',
          cardNumber: 'VISA-1234',
          amountCents: 10000,
        })
        .expect(200);

      expect(res.body.data.creditedCents).toBe(9000);
      expect(res.body.data.exchangeRate).toBe(0.9);
    });

    it('should reject conversion with invalid merchant', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .post('/api/v1/convert')
        .set('Authorization', `Bearer ${token}`)
        .send({
          merchant: 'FakeMerchant',
          cardNumber: 'CARD-1234',
          amountCents: 5000,
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject conversion with zero amount', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .post('/api/v1/convert')
        .set('Authorization', `Bearer ${token}`)
        .send({
          merchant: 'Amazon',
          cardNumber: 'CARD-1234',
          amountCents: 0,
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject conversion exceeding maximum amount', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .post('/api/v1/convert')
        .set('Authorization', `Bearer ${token}`)
        .send({
          merchant: 'Amazon',
          cardNumber: 'CARD-1234',
          amountCents: 5000001, // Exceeds $50,000 max
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject conversion with special characters in card number', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .post('/api/v1/convert')
        .set('Authorization', `Bearer ${token}`)
        .send({
          merchant: 'Amazon',
          cardNumber: 'CARD<script>alert(1)</script>',
          amountCents: 5000,
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject conversion without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/convert')
        .send({
          merchant: 'Amazon',
          cardNumber: 'CARD-1234',
          amountCents: 5000,
        })
        .expect(401);
    });

    it('should handle multiple sequential conversions correctly', async () => {
      const { token, userId } = await createTestUser();
      stores.settings.set('exchange_rate', { value: 0.9 });

      // First conversion: $100
      await request(app)
        .post('/api/v1/convert')
        .set('Authorization', `Bearer ${token}`)
        .send({ merchant: 'Amazon', cardNumber: 'CARD-001', amountCents: 10000 })
        .expect(200);

      // Second conversion: $50
      await request(app)
        .post('/api/v1/convert')
        .set('Authorization', `Bearer ${token}`)
        .send({ merchant: 'Target', cardNumber: 'CARD-002', amountCents: 5000 })
        .expect(200);

      // Check final balance: 9000 + 4500 = 13500
      const balRes = await request(app)
        .get('/api/v1/wallet/balance')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(balRes.body.data.balanceCents).toBe(13500);
    });
  });
});
