'use strict';

/**
 * Integration Tests: Admin Flow
 * Tests: login as admin -> get stats -> manage users -> adjust settings ->
 *        review fraud flags -> check audit log.
 * Exercises: GET /api/v1/admin/stats, GET /api/v1/admin/users, GET /api/v1/admin/users/:id,
 *            PUT /api/v1/admin/users/:id/suspend, PUT /api/v1/admin/users/:id/reinstate,
 *            GET /api/v1/admin/fraud-flags, PUT /api/v1/admin/fraud-flags/:id/resolve,
 *            PUT /api/v1/admin/fraud-flags/:id/block, PUT /api/v1/admin/settings/:key,
 *            GET /api/v1/admin/audit-log
 */

const { stores, resetStores, createTestUser, createTestFraudFlag } = require('./setup');
const request = require('supertest');
const app = require('../../backend/src/app');

beforeEach(() => {
  resetStores();
  jest.clearAllMocks();
});

describe('Admin Flow Integration', () => {
  // ─── Access Control ────────────────────────────────────────────────────────

  describe('Admin Access Control', () => {
    it('should deny non-admin access to admin endpoints', async () => {
      const { token } = await createTestUser({ role: 'user' });

      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.error.code).toBe('ADMIN_REQUIRED');
    });

    it('should deny unauthenticated access to admin endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .expect(401);
    });

    it('should allow admin access to admin endpoints', async () => {
      const { token } = await createTestUser({ role: 'admin' });

      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
    });
  });

  // ─── Stats ─────────────────────────────────────────────────────────────────

  describe('GET /api/v1/admin/stats', () => {
    it('should return platform statistics', async () => {
      const { token } = await createTestUser({ role: 'admin' });

      // Add some users
      await createTestUser({ email: 'user1@test.com', balanceCents: 10000 });
      await createTestUser({ email: 'user2@test.com', balanceCents: 20000 });

      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(typeof res.body.data.totalUsers).toBe('number');
      expect(typeof res.body.data.totalTransactions).toBe('number');
      expect(typeof res.body.data.totalVolumeCents).toBe('number');
      expect(typeof res.body.data.openFraudFlags).toBe('number');
    });
  });

  // ─── User Management ──────────────────────────────────────────────────────

  describe('GET /api/v1/admin/users', () => {
    it('should return paginated user list', async () => {
      const { token } = await createTestUser({ role: 'admin' });
      await createTestUser({ email: 'user1@test.com' });
      await createTestUser({ email: 'user2@test.com' });

      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3); // admin + 2 users
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter users by status', async () => {
      const { token } = await createTestUser({ role: 'admin' });
      await createTestUser({ email: 'active@test.com', status: 'active' });
      await createTestUser({ email: 'suspended@test.com', status: 'suspended' });

      const res = await request(app)
        .get('/api/v1/admin/users?status=suspended')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // All returned users should be suspended
      for (const user of res.body.data) {
        expect(user.status).toBe('suspended');
      }
    });
  });

  describe('GET /api/v1/admin/users/:id', () => {
    it('should return detailed user info including transactions and gifts', async () => {
      const { token } = await createTestUser({ role: 'admin' });
      const { userId } = await createTestUser({ email: 'detail@test.com', balanceCents: 10000 });

      const res = await request(app)
        .get(`/api/v1/admin/users/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('detail@test.com');
      expect(Array.isArray(res.body.data.recentTransactions)).toBe(true);
      expect(Array.isArray(res.body.data.sentGifts)).toBe(true);
      expect(Array.isArray(res.body.data.fraudFlags)).toBe(true);
    });

    it('should return 404 for non-existent user', async () => {
      const { token } = await createTestUser({ role: 'admin' });

      const res = await request(app)
        .get('/api/v1/admin/users/nonexistent_user_id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ─── Suspend / Reinstate ───────────────────────────────────────────────────

  describe('PUT /api/v1/admin/users/:id/suspend', () => {
    it('should suspend a user account', async () => {
      const { token: adminToken } = await createTestUser({ role: 'admin', email: 'admin@test.com' });
      const { userId: targetId, token: userToken } = await createTestUser({
        email: 'tosuspend@test.com',
      });

      const res = await request(app)
        .put(`/api/v1/admin/users/${targetId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Suspicious activity detected' })
        .expect(200);

      expect(res.body.data.success).toBe(true);

      // Verify user is now suspended
      const userData = stores.users.get(targetId);
      expect(userData.status).toBe('suspended');

      // Verify audit log was created
      expect(stores.audit_log.size).toBeGreaterThan(0);
    });

    it('should reject suspend without reason', async () => {
      const { token: adminToken } = await createTestUser({ role: 'admin' });
      const { userId: targetId } = await createTestUser({ email: 'tosuspend2@test.com' });

      const res = await request(app)
        .put(`/api/v1/admin/users/${targetId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({}) // No reason
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 when suspending non-existent user', async () => {
      const { token: adminToken } = await createTestUser({ role: 'admin' });

      const res = await request(app)
        .put('/api/v1/admin/users/nonexistent_id/suspend')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test' })
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/v1/admin/users/:id/reinstate', () => {
    it('should reinstate a suspended user', async () => {
      const { token: adminToken } = await createTestUser({ role: 'admin', email: 'admin@test.com' });
      const { userId: targetId } = await createTestUser({
        email: 'tounban@test.com',
        status: 'suspended',
      });

      // First suspend
      stores.users.get(targetId).status = 'suspended';

      const res = await request(app)
        .put(`/api/v1/admin/users/${targetId}/reinstate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.success).toBe(true);

      // Verify user is active
      const userData = stores.users.get(targetId);
      expect(userData.status).toBe('active');
    });
  });

  // ─── Fraud Flags ───────────────────────────────────────────────────────────

  describe('GET /api/v1/admin/fraud-flags', () => {
    it('should return open fraud flags', async () => {
      const { token } = await createTestUser({ role: 'admin' });
      const { userId } = await createTestUser({ email: 'flagged@test.com' });
      createTestFraudFlag({ userId, severity: 'high', status: 'open' });

      const res = await request(app)
        .get('/api/v1/admin/fraud-flags')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].severity).toBe('high');
    });

    it('should filter fraud flags by status', async () => {
      const { token } = await createTestUser({ role: 'admin' });
      const { userId } = await createTestUser({ email: 'flagged2@test.com' });
      createTestFraudFlag({ userId, status: 'open' });
      createTestFraudFlag({ userId, status: 'resolved' });

      const res = await request(app)
        .get('/api/v1/admin/fraud-flags?status=resolved')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      for (const flag of res.body.data) {
        expect(flag.status).toBe('resolved');
      }
    });
  });

  describe('PUT /api/v1/admin/fraud-flags/:id/resolve', () => {
    it('should resolve a fraud flag', async () => {
      const { token } = await createTestUser({ role: 'admin', email: 'admin@test.com' });
      const { userId } = await createTestUser({ email: 'flagged3@test.com' });
      const { flagId } = createTestFraudFlag({ userId });

      const res = await request(app)
        .put(`/api/v1/admin/fraud-flags/${flagId}/resolve`)
        .set('Authorization', `Bearer ${token}`)
        .send({ notes: 'False positive - legitimate activity' })
        .expect(200);

      expect(res.body.data.success).toBe(true);

      // Verify flag was resolved
      const flagData = stores.fraud_flags.get(flagId);
      expect(flagData.status).toBe('resolved');
      expect(flagData.resolution_notes).toContain('False positive');
    });

    it('should return 404 for non-existent fraud flag', async () => {
      const { token } = await createTestUser({ role: 'admin' });

      const res = await request(app)
        .put('/api/v1/admin/fraud-flags/nonexistent_flag_id/resolve')
        .set('Authorization', `Bearer ${token}`)
        .send({ notes: 'test' })
        .expect(404);
    });
  });

  describe('PUT /api/v1/admin/fraud-flags/:id/block', () => {
    it('should block user and resolve fraud flag', async () => {
      const { token } = await createTestUser({ role: 'admin', email: 'admin@test.com' });
      const { userId } = await createTestUser({ email: 'toblock@test.com' });
      const { flagId } = createTestFraudFlag({ userId });

      const res = await request(app)
        .put(`/api/v1/admin/fraud-flags/${flagId}/block`)
        .set('Authorization', `Bearer ${token}`)
        .send({ notes: 'Confirmed fraud' })
        .expect(200);

      expect(res.body.data.success).toBe(true);

      // Verify user was suspended
      const userData = stores.users.get(userId);
      expect(userData.status).toBe('suspended');

      // Verify flag was resolved as blocked
      const flagData = stores.fraud_flags.get(flagId);
      expect(flagData.status).toBe('blocked');
    });
  });

  // ─── Settings ──────────────────────────────────────────────────────────────

  describe('PUT /api/v1/admin/settings/:key', () => {
    it('should update exchange rate setting', async () => {
      const { token } = await createTestUser({ role: 'admin', email: 'admin@test.com' });

      const res = await request(app)
        .put('/api/v1/admin/settings/exchange_rate')
        .set('Authorization', `Bearer ${token}`)
        .send({ value: 0.85 })
        .expect(200);

      expect(res.body.data.success).toBe(true);
      expect(res.body.data.key).toBe('exchange_rate');
      expect(res.body.data.value).toBe(0.85);

      // Verify setting was stored
      const setting = stores.settings.get('exchange_rate');
      expect(setting.value).toBe(0.85);
    });

    it('should reject invalid setting key', async () => {
      const { token } = await createTestUser({ role: 'admin' });

      const res = await request(app)
        .put('/api/v1/admin/settings/invalid_key')
        .set('Authorization', `Bearer ${token}`)
        .send({ value: 123 })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject out-of-range exchange rate', async () => {
      const { token } = await createTestUser({ role: 'admin' });

      const res = await request(app)
        .put('/api/v1/admin/settings/exchange_rate')
        .set('Authorization', `Bearer ${token}`)
        .send({ value: 5.0 }) // Max is 1.0
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should update gift expiration days', async () => {
      const { token } = await createTestUser({ role: 'admin', email: 'admin@test.com' });

      const res = await request(app)
        .put('/api/v1/admin/settings/gift_expiration_days')
        .set('Authorization', `Bearer ${token}`)
        .send({ value: 60 })
        .expect(200);

      expect(res.body.data.value).toBe(60);
    });

    it('should update boolean setting (global_rate_lock)', async () => {
      const { token } = await createTestUser({ role: 'admin', email: 'admin@test.com' });

      const res = await request(app)
        .put('/api/v1/admin/settings/global_rate_lock')
        .set('Authorization', `Bearer ${token}`)
        .send({ value: true })
        .expect(200);

      expect(res.body.data.value).toBe(true);
    });

    it('should create an audit log entry when setting is updated', async () => {
      const { token } = await createTestUser({ role: 'admin', email: 'admin@test.com' });

      await request(app)
        .put('/api/v1/admin/settings/exchange_rate')
        .set('Authorization', `Bearer ${token}`)
        .send({ value: 0.75 })
        .expect(200);

      // Verify audit log was created
      expect(stores.audit_log.size).toBeGreaterThan(0);
      const auditEntries = Array.from(stores.audit_log.values());
      const settingAudit = auditEntries.find(a => a.action === 'update_setting');
      expect(settingAudit).toBeDefined();
      expect(settingAudit.target_id).toBe('exchange_rate');
    });
  });

  // ─── Audit Log ─────────────────────────────────────────────────────────────

  describe('GET /api/v1/admin/audit-log', () => {
    it('should return audit log entries', async () => {
      const { token } = await createTestUser({ role: 'admin', email: 'admin@test.com' });
      const { userId } = await createTestUser({ email: 'audited@test.com' });

      // Create some audit entries by performing admin actions
      await request(app)
        .put(`/api/v1/admin/users/${userId}/suspend`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Test suspension' });

      const res = await request(app)
        .get('/api/v1/admin/audit-log')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.pagination).toBeDefined();
    });
  });
});
