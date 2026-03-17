'use strict';

/**
 * Integration Tests: Input Validation
 * Tests that all endpoints properly reject malicious and malformed input.
 * Covers XSS payloads, SQL injection attempts, oversized inputs, type confusion.
 */

const { stores, resetStores, createTestUser } = require('./setup');
const request = require('supertest');
const app = require('../../backend/src/app');

beforeEach(() => {
  resetStores();
  jest.clearAllMocks();
});

describe('Input Validation Integration', () => {
  // ─── XSS Payloads ─────────────────────────────────────────────────────────

  describe('XSS Prevention', () => {
    it('should sanitize script tags in registration name', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'xss1@test.com',
          password: 'password123',
          name: '<script>document.cookie</script>',
        })
        .expect(201);

      expect(res.body.data.user.name).not.toContain('<script>');
      expect(res.body.data.user.name).toContain('&lt;script&gt;');
    });

    it('should sanitize img/onerror XSS in gift message via HTML entity encoding', async () => {
      const { token } = await createTestUser({ balanceCents: 50000 });

      const res = await request(app)
        .post('/api/v1/gifts/send')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientEmail: 'victim@test.com',
          amountCents: 1000,
          message: '<img src=x onerror=alert(1)>',
          occasion: '"><svg onload=alert(1)>',
        })
        .expect(200);

      const giftId = res.body.data.giftId;
      const giftData = stores.gifts.get(giftId);
      // Angle brackets are HTML-entity-escaped, neutralizing XSS
      expect(giftData.message).not.toContain('<img');
      expect(giftData.message).toContain('&lt;img');
      expect(giftData.occasion).not.toContain('<svg');
      expect(giftData.occasion).toContain('&lt;svg');
    });
  });

  // ─── SQL Injection Attempts ────────────────────────────────────────────────

  describe('Injection Prevention', () => {
    it('should safely handle SQL injection in email field', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: "admin@test.com' OR '1'='1",
          password: 'password123',
        })
        .expect(400); // Invalid email format

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should safely handle NoSQL injection in login', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: { $gt: '' },
          password: { $gt: '' },
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should safely handle prototype pollution in body', async () => {
      const { token } = await createTestUser({ role: 'admin' });

      const res = await request(app)
        .put('/api/v1/admin/settings/exchange_rate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          value: 0.85,
          __proto__: { isAdmin: true },
          constructor: { prototype: { isAdmin: true } },
        })
        .expect(200); // Extra fields stripped by Joi

      // The prototype pollution should NOT have taken effect
      expect(({}).isAdmin).toBeUndefined();
    });
  });

  // ─── Type Confusion ────────────────────────────────────────────────────────

  describe('Type Confusion Prevention', () => {
    it('should reject array where string expected', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: ['test@test.com'],
          password: 'password123',
        })
        .expect(400);
    });

    it('should reject number where string expected for password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@test.com',
          password: 12345678,
        })
        .expect(400);
    });

    it('should reject string where number expected for amountCents', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .post('/api/v1/convert')
        .set('Authorization', `Bearer ${token}`)
        .send({
          merchant: 'Amazon',
          cardNumber: 'CARD-1234',
          amountCents: 'not-a-number',
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject float where integer expected for amountCents', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .post('/api/v1/convert')
        .set('Authorization', `Bearer ${token}`)
        .send({
          merchant: 'Amazon',
          cardNumber: 'CARD-1234',
          amountCents: 99.99,
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject negative amountCents', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .post('/api/v1/convert')
        .set('Authorization', `Bearer ${token}`)
        .send({
          merchant: 'Amazon',
          cardNumber: 'CARD-1234',
          amountCents: -5000,
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ─── Oversized Input ───────────────────────────────────────────────────────

  describe('Oversized Input Prevention', () => {
    it('should reject extremely long email', async () => {
      const longEmail = 'a'.repeat(300) + '@test.com';

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: longEmail,
          password: 'password123',
        })
        .expect(400);
    });

    it('should reject extremely long password', async () => {
      const longPassword = 'a'.repeat(200);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'long@test.com',
          password: longPassword,
        })
        .expect(400);
    });

    it('should reject extremely long gift message', async () => {
      const { token } = await createTestUser({ balanceCents: 50000 });

      const res = await request(app)
        .post('/api/v1/gifts/send')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientEmail: 'recipient@test.com',
          amountCents: 1000,
          message: 'x'.repeat(3000), // Max is 2000
        })
        .expect(400);
    });

    it('should reject extremely long name', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'longname@test.com',
          password: 'password123',
          name: 'A'.repeat(200), // Max is 100
        })
        .expect(400);
    });
  });

  // ─── Unknown Fields ────────────────────────────────────────────────────────

  describe('Unknown Field Stripping', () => {
    it('should strip unknown fields from registration body', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'strip@test.com',
          password: 'password123',
          name: 'Strip User',
          role: 'admin',             // Should be stripped
          balance_cents: 9999999,    // Should be stripped
          isAdmin: true,             // Should be stripped
        })
        .expect(201);

      // User should not be admin
      expect(res.body.data.user.role).toBe('user');
      expect(res.body.data.user.balanceCents).toBe(0);
    });

    it('should strip unknown fields from conversion body', async () => {
      const { token } = await createTestUser();
      stores.settings.set('exchange_rate', { value: 0.9 });

      const res = await request(app)
        .post('/api/v1/convert')
        .set('Authorization', `Bearer ${token}`)
        .send({
          merchant: 'Amazon',
          cardNumber: 'CARD-1234',
          amountCents: 5000,
          exchangeRate: 1.0,  // Should be stripped - rate comes from server
          creditedCents: 999999, // Should be stripped
        })
        .expect(200);

      // Exchange rate should be 0.9 from settings, not 1.0
      expect(res.body.data.exchangeRate).toBe(0.9);
    });
  });

  // ─── 404 Handler ───────────────────────────────────────────────────────────

  describe('404 Handler', () => {
    it('should return proper 404 for unknown routes', async () => {
      const res = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error.requestId).toBeDefined();
    });

    it('should return 404 for wrong HTTP method', async () => {
      const res = await request(app)
        .delete('/api/v1/auth/login')
        .expect(404);
    });
  });

  // ─── Content-Type Enforcement ──────────────────────────────────────────────

  describe('Content-Type Handling', () => {
    it('should reject non-JSON content type for JSON endpoints', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'text/plain')
        .send('email=test@test.com&password=pass123')
        .expect(400);
    });
  });
});
