'use strict';

/**
 * End-to-End Test Scenarios
 *
 * These tests simulate complete user journeys through the system.
 * Each scenario exercises multiple endpoints in sequence, verifying
 * data consistency across the entire flow.
 *
 * Scenarios:
 * 1. New User Onboarding: register -> convert gift card -> check balance -> send gift
 * 2. Gift Lifecycle: send gift -> preview -> claim -> verify both wallets
 * 3. Admin Moderation: create users -> flag fraud -> admin resolves/blocks -> verify suspended login denied
 * 4. Settings Impact: admin changes exchange rate -> user converts -> verify new rate applied
 * 5. Password Recovery: register -> forgot password -> reset -> login with new password
 */

const { stores, resetStores, createTestUser, createTestGift, createTestFraudFlag } = require('../integration/setup');
const request = require('supertest');
const app = require('../../backend/src/app');

beforeEach(() => {
  resetStores();
  jest.clearAllMocks();
});

describe('E2E Scenario 1: New User Onboarding', () => {
  it('should complete full onboarding: register -> convert -> check balance -> send gift', async () => {
    // Step 1: Register
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'alice@example.com', password: 'SecurePass123', name: 'Alice' })
      .expect(201);

    const { token, user } = regRes.body.data;
    expect(user.email).toBe('alice@example.com');
    expect(user.balanceCents).toBe(0);

    // Step 2: Convert a gift card to get balance
    stores.settings.set('exchange_rate', { value: 0.9 });

    const convRes = await request(app)
      .post('/api/v1/convert')
      .set('Authorization', `Bearer ${token}`)
      .send({ merchant: 'Amazon', cardNumber: 'AMZ-1234-5678', amountCents: 20000 })
      .expect(200);

    expect(convRes.body.data.creditedCents).toBe(18000); // $200 * 0.9 = $180

    // Step 3: Check balance
    const balRes = await request(app)
      .get('/api/v1/wallet/balance')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(balRes.body.data.balanceCents).toBe(18000);

    // Step 4: View profile
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(meRes.body.data.email).toBe('alice@example.com');

    // Step 5: Send a gift
    const giftRes = await request(app)
      .post('/api/v1/gifts/send')
      .set('Authorization', `Bearer ${token}`)
      .send({
        recipientEmail: 'bob@example.com',
        amountCents: 5000,
        message: 'Welcome to the platform!',
        occasion: 'Welcome',
      })
      .expect(200);

    expect(giftRes.body.data.success).toBe(true);
    expect(giftRes.body.data.newBalanceCents).toBe(13000); // 18000 - 5000

    // Step 6: Verify final balance
    const finalBal = await request(app)
      .get('/api/v1/wallet/balance')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(finalBal.body.data.balanceCents).toBe(13000);

    // Step 7: Verify transaction history shows both credit and debit
    const txRes = await request(app)
      .get('/api/v1/wallet/transactions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(txRes.body.data.length).toBe(2); // One credit (conversion), one debit (gift sent)
    const types = txRes.body.data.map(t => t.type);
    expect(types).toContain('credit');
    expect(types).toContain('debit');
  });
});

describe('E2E Scenario 2: Gift Lifecycle', () => {
  it('should complete: send -> preview -> claim -> verify both wallets', async () => {
    // Setup: Create sender and recipient
    const sender = await createTestUser({
      email: 'sender@example.com',
      name: 'Sender',
      balanceCents: 50000,
    });

    const recipient = await createTestUser({
      email: 'recipient@example.com',
      name: 'Recipient',
      balanceCents: 1000,
    });

    // Step 1: Sender sends a gift
    const sendRes = await request(app)
      .post('/api/v1/gifts/send')
      .set('Authorization', `Bearer ${sender.token}`)
      .send({
        recipientEmail: 'recipient@example.com',
        amountCents: 10000,
        message: 'Happy Birthday!',
        occasion: 'Birthday',
      })
      .expect(200);

    expect(sendRes.body.data.success).toBe(true);
    const giftId = sendRes.body.data.giftId;
    expect(sendRes.body.data.newBalanceCents).toBe(40000);

    // Step 2: Verify sender balance debited
    const senderBal = await request(app)
      .get('/api/v1/wallet/balance')
      .set('Authorization', `Bearer ${sender.token}`)
      .expect(200);
    expect(senderBal.body.data.balanceCents).toBe(40000);

    // Step 3: Retrieve claim token from store (simulating email link)
    const giftData = stores.gifts.get(giftId);
    expect(giftData).toBeDefined();
    const claimToken = giftData.claim_token;

    // Step 4: Preview gift (public, no auth)
    const previewRes = await request(app)
      .get(`/api/v1/gifts/claim/${claimToken}`)
      .expect(200);

    expect(previewRes.body.data.amountCents).toBe(10000);
    expect(previewRes.body.data.senderName).toBeDefined();
    expect(previewRes.body.data.message).toContain('Happy Birthday');
    expect(previewRes.body.data.status).toBe('pending');

    // Step 5: Recipient claims the gift
    const claimRes = await request(app)
      .post(`/api/v1/gifts/claim/${claimToken}`)
      .set('Authorization', `Bearer ${recipient.token}`)
      .expect(200);

    expect(claimRes.body.data.success).toBe(true);
    expect(claimRes.body.data.creditedCents).toBe(10000);

    // Step 6: Verify recipient balance credited
    const recipBal = await request(app)
      .get('/api/v1/wallet/balance')
      .set('Authorization', `Bearer ${recipient.token}`)
      .expect(200);
    expect(recipBal.body.data.balanceCents).toBe(11000); // 1000 + 10000

    // Step 7: Verify gift cannot be claimed again
    await request(app)
      .post(`/api/v1/gifts/claim/${claimToken}`)
      .set('Authorization', `Bearer ${recipient.token}`)
      .expect(400);

    // Step 8: Sender can view their gift
    const senderView = await request(app)
      .get(`/api/v1/gifts/${giftId}`)
      .set('Authorization', `Bearer ${sender.token}`)
      .expect(200);
    expect(senderView.body.data.status).toBe('claimed');
  });
});

describe('E2E Scenario 3: Admin Moderation', () => {
  it('should complete: create users -> flag fraud -> admin resolves/blocks -> verify', async () => {
    // Setup
    const admin = await createTestUser({
      email: 'admin@unicredit.app',
      name: 'Admin',
      role: 'admin',
    });

    const goodUser = await createTestUser({
      email: 'gooduser@example.com',
      name: 'Good User',
      balanceCents: 10000,
    });

    const badUser = await createTestUser({
      email: 'baduser@example.com',
      name: 'Bad User',
      balanceCents: 50000,
    });

    // Step 1: Create fraud flags
    const { flagId: goodFlagId } = createTestFraudFlag({
      userId: goodUser.userId,
      severity: 'low',
      status: 'open',
    });

    const { flagId: badFlagId } = createTestFraudFlag({
      userId: badUser.userId,
      severity: 'critical',
      status: 'open',
    });

    // Step 2: Admin views fraud flags
    const flagsRes = await request(app)
      .get('/api/v1/admin/fraud-flags')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    expect(flagsRes.body.data.length).toBe(2);

    // Step 3: Admin resolves the good user's flag (false positive)
    await request(app)
      .put(`/api/v1/admin/fraud-flags/${goodFlagId}/resolve`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ notes: 'Investigated - legitimate activity' })
      .expect(200);

    // Verify good user can still log in
    const goodLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'gooduser@example.com', password: 'password123' })
      .expect(200);
    expect(goodLoginRes.body.data.token).toBeDefined();

    // Step 4: Admin blocks the bad user (confirmed fraud)
    await request(app)
      .put(`/api/v1/admin/fraud-flags/${badFlagId}/block`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ notes: 'Confirmed fraudulent activity' })
      .expect(200);

    // Verify bad user is suspended
    const badUserData = stores.users.get(badUser.userId);
    expect(badUserData.status).toBe('suspended');

    // Verify bad user cannot log in
    const badLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'baduser@example.com', password: 'password123' })
      .expect(401);

    // Step 5: Admin checks stats
    const statsRes = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    expect(statsRes.body.data.totalUsers).toBeGreaterThanOrEqual(3);

    // Step 6: Admin views audit log
    const auditRes = await request(app)
      .get('/api/v1/admin/audit-log')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    expect(auditRes.body.data.length).toBeGreaterThanOrEqual(2); // resolve + block

    // Step 7: Admin reinstates the bad user (after further review)
    await request(app)
      .put(`/api/v1/admin/users/${badUser.userId}/reinstate`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    // Verify bad user can now log in again
    const reinstateLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'baduser@example.com', password: 'password123' })
      .expect(200);
    expect(reinstateLogin.body.data.token).toBeDefined();
  });
});

describe('E2E Scenario 4: Settings Impact on Conversion', () => {
  it('should apply admin-updated exchange rate to subsequent conversions', async () => {
    const admin = await createTestUser({ email: 'admin@test.com', role: 'admin' });
    const user = await createTestUser({ email: 'user@test.com', balanceCents: 0 });

    // Step 1: Admin sets exchange rate to 0.85
    await request(app)
      .put('/api/v1/admin/settings/exchange_rate')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ value: 0.85 })
      .expect(200);

    // Step 2: User converts $100 gift card
    const conv1 = await request(app)
      .post('/api/v1/convert')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ merchant: 'Amazon', cardNumber: 'CARD-001', amountCents: 10000 })
      .expect(200);

    expect(conv1.body.data.creditedCents).toBe(8500); // 10000 * 0.85
    expect(conv1.body.data.exchangeRate).toBe(0.85);

    // Step 3: Admin changes rate to 0.95
    await request(app)
      .put('/api/v1/admin/settings/exchange_rate')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ value: 0.95 })
      .expect(200);

    // Step 4: User converts another $100 gift card
    const conv2 = await request(app)
      .post('/api/v1/convert')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ merchant: 'Target', cardNumber: 'CARD-002', amountCents: 10000 })
      .expect(200);

    expect(conv2.body.data.creditedCents).toBe(9500); // 10000 * 0.95
    expect(conv2.body.data.exchangeRate).toBe(0.95);

    // Step 5: Verify total balance: 8500 + 9500 = 18000
    const balRes = await request(app)
      .get('/api/v1/wallet/balance')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(balRes.body.data.balanceCents).toBe(18000);
  });
});

describe('E2E Scenario 5: Password Recovery', () => {
  it('should complete: register -> forgot password -> reset -> login with new password', async () => {
    // Step 1: Register
    await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'recovery@example.com', password: 'OldPass123', name: 'Recovery User' })
      .expect(201);

    // Step 2: Forgot password
    await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'recovery@example.com' })
      .expect(200);

    // Step 3: Extract reset token from store
    let resetTokenHash = null;
    let userId = null;
    for (const [id, data] of stores.users.entries()) {
      if (data.email === 'recovery@example.com') {
        resetTokenHash = data.reset_token_hash;
        userId = id;
        break;
      }
    }
    expect(resetTokenHash).toBeTruthy();

    // We need the plain-text token, but it was already hashed.
    // For E2E we'll test the reset flow by manually setting a known token.
    const crypto = require('crypto');
    const knownToken = 'known-reset-token-value-for-test';
    const knownHash = crypto.createHash('sha256').update(knownToken).digest('hex');
    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    stores.users.get(userId).reset_token_hash = knownHash;
    stores.users.get(userId).reset_token_expires_at = futureExpiry;

    // Step 4: Reset password
    await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: knownToken, newPassword: 'NewPass456' })
      .expect(200);

    // Step 5: Verify old password no longer works
    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'recovery@example.com', password: 'OldPass123' })
      .expect(401);

    // Step 6: Login with new password
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'recovery@example.com', password: 'NewPass456' })
      .expect(200);

    expect(loginRes.body.data.token).toBeDefined();

    // Step 7: Verify reset token is consumed (cannot reuse)
    const resetRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: knownToken, newPassword: 'AnotherPass789' })
      .expect(400);

    expect(resetRes.body.error.code).toBe('INVALID_TOKEN');
  });
});
