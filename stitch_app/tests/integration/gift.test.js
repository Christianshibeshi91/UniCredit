'use strict';

/**
 * Integration Tests: Gift Flow
 * Tests: send gift -> verify sender balance debited -> preview gift -> claim gift ->
 *        verify recipient balance credited -> verify IDOR protection on getGift.
 * Exercises: POST /api/v1/gifts/send, GET /api/v1/gifts/claim/:token,
 *            POST /api/v1/gifts/claim/:token, GET /api/v1/gifts/:id
 */

const { stores, resetStores, createTestUser, createTestGift } = require('./setup');
const request = require('supertest');
const app = require('../../backend/src/app');

beforeEach(() => {
  resetStores();
  jest.clearAllMocks();
});

describe('Gift Flow Integration', () => {
  // ─── Send Gift ─────────────────────────────────────────────────────────────

  describe('POST /api/v1/gifts/send', () => {
    it('should send a gift and debit sender balance', async () => {
      const { token, userId } = await createTestUser({ balanceCents: 50000 });

      const res = await request(app)
        .post('/api/v1/gifts/send')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientEmail: 'recipient@test.com',
          amountCents: 10000,
          message: 'Happy Birthday!',
          occasion: 'Birthday',
        })
        .expect(200);

      expect(res.body.data.success).toBe(true);
      expect(res.body.data.giftId).toBeDefined();
      expect(res.body.data.newBalanceCents).toBe(40000); // 50000 - 10000

      // Verify sender balance was actually debited
      const balRes = await request(app)
        .get('/api/v1/wallet/balance')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(balRes.body.data.balanceCents).toBe(40000);
    });

    it('should reject gift when sender has insufficient balance', async () => {
      const { token } = await createTestUser({ balanceCents: 5000 });

      const res = await request(app)
        .post('/api/v1/gifts/send')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientEmail: 'recipient@test.com',
          amountCents: 10000, // More than balance
        })
        .expect(400);

      expect(res.body.error.code).toBe('INSUFFICIENT_BALANCE');
    });

    it('should reject gift with zero amount', async () => {
      const { token } = await createTestUser({ balanceCents: 50000 });

      const res = await request(app)
        .post('/api/v1/gifts/send')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientEmail: 'recipient@test.com',
          amountCents: 0,
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject gift with invalid recipient email', async () => {
      const { token } = await createTestUser({ balanceCents: 50000 });

      const res = await request(app)
        .post('/api/v1/gifts/send')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientEmail: 'not-an-email',
          amountCents: 5000,
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should sanitize message to prevent XSS', async () => {
      const { token, userId } = await createTestUser({ balanceCents: 50000 });

      const res = await request(app)
        .post('/api/v1/gifts/send')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientEmail: 'recipient@test.com',
          amountCents: 1000,
          message: '<script>alert("xss")</script>Enjoy!',
          occasion: '<img onerror=alert(1) src=x>',
        })
        .expect(200);

      // Verify message was sanitized in storage
      const giftId = res.body.data.giftId;
      const giftData = stores.gifts.get(giftId);
      expect(giftData.message).not.toContain('<script>');
      expect(giftData.occasion).not.toContain('<img');
    });

    it('should reject gift without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/gifts/send')
        .send({
          recipientEmail: 'recipient@test.com',
          amountCents: 5000,
        })
        .expect(401);
    });

    it('should create a debit transaction record for sender', async () => {
      const { token, userId } = await createTestUser({ balanceCents: 50000 });

      await request(app)
        .post('/api/v1/gifts/send')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientEmail: 'recipient@test.com',
          amountCents: 10000,
        })
        .expect(200);

      // Check transaction was recorded
      const txRes = await request(app)
        .get('/api/v1/wallet/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(txRes.body.data.length).toBeGreaterThan(0);
      const debitTx = txRes.body.data.find(t => t.category === 'gift_sent');
      expect(debitTx).toBeDefined();
      expect(debitTx.type).toBe('debit');
    });
  });

  // ─── Preview Gift (public) ─────────────────────────────────────────────────

  describe('GET /api/v1/gifts/claim/:token', () => {
    it('should return gift preview for valid claim token', async () => {
      const { userId } = await createTestUser({ balanceCents: 50000 });
      const { claimToken } = createTestGift({ senderId: userId, amountCents: 5000 });

      const res = await request(app)
        .get(`/api/v1/gifts/claim/${claimToken}`)
        .expect(200);

      expect(res.body.data.senderName).toBeDefined();
      expect(res.body.data.amountCents).toBe(5000);
      expect(res.body.data.status).toBe('pending');
      // Should NOT contain claim_token in response
      expect(res.body.data.claim_token).toBeUndefined();
    });

    it('should return 404 for invalid claim token', async () => {
      const res = await request(app)
        .get('/api/v1/gifts/claim/invalid-token-value')
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return error for already-claimed gift', async () => {
      const { userId } = await createTestUser({ balanceCents: 50000 });
      const { claimToken } = createTestGift({
        senderId: userId,
        amountCents: 5000,
        status: 'claimed',
      });

      const res = await request(app)
        .get(`/api/v1/gifts/claim/${claimToken}`)
        .expect(400);

      expect(res.body.error.code).toBe('ALREADY_CLAIMED');
    });
  });

  // ─── Claim Gift ────────────────────────────────────────────────────────────

  describe('POST /api/v1/gifts/claim/:token', () => {
    it('should claim a gift and credit recipient balance', async () => {
      const sender = await createTestUser({ balanceCents: 50000 });
      const recipient = await createTestUser({
        email: 'recipient@test.com',
        balanceCents: 0,
      });

      const { claimToken, giftId } = createTestGift({
        senderId: sender.userId,
        amountCents: 10000,
        recipientEmail: recipient.email,
      });

      // Store the gift ID directly on the mock so transaction.get can retrieve it
      // (the claim flow re-reads the gift inside a transaction)

      const res = await request(app)
        .post(`/api/v1/gifts/claim/${claimToken}`)
        .set('Authorization', `Bearer ${recipient.token}`)
        .expect(200);

      expect(res.body.data.success).toBe(true);
      expect(res.body.data.creditedCents).toBe(10000);

      // Verify recipient balance was credited
      const balRes = await request(app)
        .get('/api/v1/wallet/balance')
        .set('Authorization', `Bearer ${recipient.token}`)
        .expect(200);

      expect(balRes.body.data.balanceCents).toBe(10000);

      // Verify gift status changed to claimed
      const giftData = stores.gifts.get(giftId);
      expect(giftData.status).toBe('claimed');
    });

    it('should reject claiming already-claimed gift', async () => {
      const sender = await createTestUser({ balanceCents: 50000 });
      const recipient = await createTestUser({
        email: 'recipient2@test.com',
        balanceCents: 0,
      });

      const { claimToken } = createTestGift({
        senderId: sender.userId,
        status: 'claimed',
      });

      const res = await request(app)
        .post(`/api/v1/gifts/claim/${claimToken}`)
        .set('Authorization', `Bearer ${recipient.token}`)
        .expect(400);

      expect(res.body.error.code).toBe('ALREADY_CLAIMED');
    });

    it('should require authentication to claim', async () => {
      const sender = await createTestUser({ balanceCents: 50000 });
      const { claimToken } = createTestGift({ senderId: sender.userId });

      const res = await request(app)
        .post(`/api/v1/gifts/claim/${claimToken}`)
        .expect(401);
    });
  });

  // ─── Get Gift (IDOR protection) ────────────────────────────────────────────

  describe('GET /api/v1/gifts/:id', () => {
    it('should allow sender to view their own gift', async () => {
      const { token, userId } = await createTestUser({ balanceCents: 50000 });
      const { giftId } = createTestGift({ senderId: userId });

      const res = await request(app)
        .get(`/api/v1/gifts/${giftId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.id).toBe(giftId);
    });

    it('should deny access to gift by unrelated user (IDOR protection)', async () => {
      const sender = await createTestUser({ balanceCents: 50000 });
      const unrelated = await createTestUser({
        email: 'unrelated@test.com',
        balanceCents: 0,
      });

      const { giftId } = createTestGift({ senderId: sender.userId });

      const res = await request(app)
        .get(`/api/v1/gifts/${giftId}`)
        .set('Authorization', `Bearer ${unrelated.token}`)
        .expect(403);

      expect(res.body.error.code).toBe('ACCESS_DENIED');
    });

    it('should return 404 for non-existent gift', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .get('/api/v1/gifts/nonexistent_gift_id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should reject without authentication', async () => {
      const res = await request(app)
        .get('/api/v1/gifts/some_id')
        .expect(401);
    });
  });

  // ─── Update Gift Media (IDOR protection) ───────────────────────────────────

  describe('PATCH /api/v1/gifts/:id/media', () => {
    it('should allow sender to attach media', async () => {
      const { token, userId } = await createTestUser({ balanceCents: 50000 });
      const { giftId } = createTestGift({ senderId: userId });

      const res = await request(app)
        .patch(`/api/v1/gifts/${giftId}/media`)
        .set('Authorization', `Bearer ${token}`)
        .send({ videoKey: `gifts/${userId}/video.mp4` })
        .expect(200);

      expect(res.body.data.success).toBe(true);
    });

    it('should deny non-sender from attaching media', async () => {
      const sender = await createTestUser({ balanceCents: 50000 });
      const attacker = await createTestUser({
        email: 'attacker@test.com',
        balanceCents: 0,
      });

      const { giftId } = createTestGift({ senderId: sender.userId });

      const res = await request(app)
        .patch(`/api/v1/gifts/${giftId}/media`)
        .set('Authorization', `Bearer ${attacker.token}`)
        .send({ videoKey: `gifts/${attacker.userId}/video.mp4` })
        .expect(403);

      expect(res.body.error.code).toBe('ACCESS_DENIED');
    });

    it('should reject invalid media key path pattern', async () => {
      const { token, userId } = await createTestUser({ balanceCents: 50000 });
      const { giftId } = createTestGift({ senderId: userId });

      const res = await request(app)
        .patch(`/api/v1/gifts/${giftId}/media`)
        .set('Authorization', `Bearer ${token}`)
        .send({ videoKey: 'invalid/path/video.mp4' })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
