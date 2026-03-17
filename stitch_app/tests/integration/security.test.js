'use strict';

/**
 * Integration Tests: Security
 * Tests authentication bypass attempts, IDOR, authorization escalation,
 * token manipulation, and error information leakage.
 */

const { stores, resetStores, createTestUser, createTestGift, createTestFraudFlag } = require('./setup');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../backend/src/app');

beforeEach(() => {
  resetStores();
  jest.clearAllMocks();
});

describe('Security Integration Tests', () => {
  // ─── Authentication Bypass Attempts ────────────────────────────────────────

  describe('Authentication Bypass', () => {
    it('should reject expired JWT tokens', async () => {
      // Create a token that expired 1 hour ago
      const expiredToken = jwt.sign(
        { userId: 'test_user', role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' },
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should reject JWT signed with wrong secret', async () => {
      const fakeToken = jwt.sign(
        { userId: 'test_user', role: 'admin' },
        'wrong-secret-key',
        { expiresIn: '24h' },
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${fakeToken}`)
        .expect(401);
    });

    it('should reject empty Bearer token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer ')
        .expect(401);
    });

    it('should reject Bearer with just whitespace', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer    ')
        .expect(401);
    });

    it('should reject non-Bearer auth scheme', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Basic dGVzdDp0ZXN0')
        .expect(401);

      expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });
  });

  // ─── Authorization Escalation ──────────────────────────────────────────────

  describe('Authorization Escalation', () => {
    it('should prevent user from crafting admin JWT (role in token is verified against claims)', async () => {
      // Create a legitimate user with 'user' role
      const { userId } = await createTestUser({ role: 'user' });

      // Try to forge a token with admin role (signed with correct secret)
      const forgedToken = jwt.sign(
        { userId, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' },
      );

      // BUG-002 FIX: The adminOnly middleware now re-verifies the user's role
      // against Firestore (with Redis cache). A forged JWT with admin role
      // will be rejected because Firestore shows the user's actual role is 'user'.
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${forgedToken}`)
        .expect(403);

      expect(res.body.error.code).toBe('ADMIN_REQUIRED');
    });

    it('should prevent regular user from accessing admin user list', async () => {
      const { token } = await createTestUser({ role: 'user' });

      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.error.code).toBe('ADMIN_REQUIRED');
    });

    it('should prevent regular user from suspending another user', async () => {
      const { token: userToken } = await createTestUser({ role: 'user' });
      const { userId: targetId } = await createTestUser({ email: 'target@test.com' });

      const res = await request(app)
        .put(`/api/v1/admin/users/${targetId}/suspend`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reason: 'Attempt to suspend' })
        .expect(403);
    });

    it('should prevent regular user from changing settings', async () => {
      const { token } = await createTestUser({ role: 'user' });

      const res = await request(app)
        .put('/api/v1/admin/settings/exchange_rate')
        .set('Authorization', `Bearer ${token}`)
        .send({ value: 0.01 })
        .expect(403);
    });
  });

  // ─── IDOR (Insecure Direct Object Reference) ──────────────────────────────

  describe('IDOR Protection', () => {
    it('should prevent user A from viewing user B gift', async () => {
      const userA = await createTestUser({ email: 'usera@test.com', balanceCents: 50000 });
      const userB = await createTestUser({ email: 'userb@test.com' });

      const { giftId } = createTestGift({ senderId: userA.userId });

      // UserB should not be able to view UserA's gift
      const res = await request(app)
        .get(`/api/v1/gifts/${giftId}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .expect(403);

      expect(res.body.error.code).toBe('ACCESS_DENIED');
    });

    it('should prevent user from attaching media to another user gift', async () => {
      const sender = await createTestUser({ email: 'sender@test.com', balanceCents: 50000 });
      const attacker = await createTestUser({ email: 'attacker@test.com' });

      const { giftId } = createTestGift({ senderId: sender.userId });

      const res = await request(app)
        .patch(`/api/v1/gifts/${giftId}/media`)
        .set('Authorization', `Bearer ${attacker.token}`)
        .send({ videoKey: `gifts/${attacker.userId}/malicious.mp4` })
        .expect(403);

      expect(res.body.error.code).toBe('ACCESS_DENIED');
    });

    it('should prevent wallet balance enumeration across users', async () => {
      const userA = await createTestUser({ email: 'rich@test.com', balanceCents: 999999 });
      const userB = await createTestUser({ email: 'poor@test.com', balanceCents: 100 });

      // UserB should only see their own balance
      const res = await request(app)
        .get('/api/v1/wallet/balance')
        .set('Authorization', `Bearer ${userB.token}`)
        .expect(200);

      expect(res.body.data.balanceCents).toBe(100);
      // Should not be able to infer userA's balance
    });

    it('should prevent transaction history leakage between users', async () => {
      const userA = await createTestUser({ email: 'usera2@test.com' });
      const userB = await createTestUser({ email: 'userb2@test.com' });

      stores.settings.set('exchange_rate', { value: 0.9 });

      // UserA does a conversion
      await request(app)
        .post('/api/v1/convert')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ merchant: 'Amazon', cardNumber: 'CARD-001', amountCents: 50000 })
        .expect(200);

      // UserB should NOT see userA's transactions
      const res = await request(app)
        .get('/api/v1/wallet/transactions')
        .set('Authorization', `Bearer ${userB.token}`)
        .expect(200);

      expect(res.body.data.length).toBe(0);
    });
  });

  // ─── Error Information Leakage ─────────────────────────────────────────────

  describe('Error Information Leakage', () => {
    it('should not leak stack traces in error responses', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid')
        .expect(401);

      expect(res.body.error.stack).toBeUndefined();
      expect(res.body.stack).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('node_modules');
    });

    it('should not leak database details in error responses', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .get('/api/v1/gifts/nonexistent_id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(JSON.stringify(res.body)).not.toContain('firestore');
      expect(JSON.stringify(res.body)).not.toContain('collection');
    });

    it('should include requestId in all error responses', async () => {
      const res = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(res.body.error.requestId).toBeDefined();
      expect(typeof res.body.error.requestId).toBe('string');
    });

    it('should not reveal whether email exists on login failure', async () => {
      // Login with non-existent email
      const res1 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'doesnotexist@test.com', password: 'password123' })
        .expect(401);

      // Register, then login with wrong password
      await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'exists@test.com', password: 'password123' });

      const res2 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'exists@test.com', password: 'wrongpassword' })
        .expect(401);

      // Both should return the same generic error message
      expect(res1.body.error.message).toBe(res2.body.error.message);
    });

    it('should not reveal email existence on forgot-password', async () => {
      // Non-existent email
      const res1 = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' })
        .expect(200);

      // Existing email
      await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'existing@test.com', password: 'password123' });

      const res2 = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'existing@test.com' })
        .expect(200);

      // Both should return the same response
      expect(res1.body.data.message).toBe(res2.body.data.message);
    });
  });

  // ─── Security Headers ─────────────────────────────────────────────────────

  describe('Security Headers', () => {
    it('should set helmet security headers', async () => {
      const res = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404);

      // Helmet default headers
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
    });

    it('should set X-Request-Id header on responses', async () => {
      const res = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(res.headers['x-request-id']).toBeDefined();
    });
  });
});
