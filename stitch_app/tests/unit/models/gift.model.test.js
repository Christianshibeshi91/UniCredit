'use strict';

/**
 * Tests for BUG-004: gift.model.js toApiResponse uses correct field names.
 */

const { createGiftDocument, toApiResponse, toClaimPreviewResponse } = require('../../../backend/src/models/gift.model');

describe('Gift Model', () => {
  describe('createGiftDocument', () => {
    test('creates document with video_key and audio_key fields', () => {
      const doc = createGiftDocument({
        senderId: 'sender1',
        senderName: 'Alice',
        recipientEmail: 'bob@example.com',
        amountCents: 5000,
        claimToken: 'tok_123',
        claimTokenHash: 'hash_123',
      });

      expect(doc).toHaveProperty('video_key', null);
      expect(doc).toHaveProperty('audio_key', null);
      // Should NOT have video_url or audio_url
      expect(doc).not.toHaveProperty('video_url');
      expect(doc).not.toHaveProperty('audio_url');
    });
  });

  describe('toApiResponse (BUG-004)', () => {
    test('maps video_key and audio_key correctly', () => {
      const data = {
        sender_name: 'Alice',
        recipient_email: 'bob@example.com',
        amount_cents: 5000,
        message: 'Happy birthday!',
        occasion: 'birthday',
        status: 'pending',
        video_key: 'videos/abc123.mp4',
        audio_key: 'audio/def456.mp3',
        scheduled_at: null,
        expires_at: '2025-06-01T00:00:00Z',
        claimed_at: null,
        created_at: '2025-03-01T00:00:00Z',
      };

      const result = toApiResponse('gift1', data);

      expect(result.videoKey).toBe('videos/abc123.mp4');
      expect(result.audioKey).toBe('audio/def456.mp3');
      // Should NOT have videoUrl or audioUrl
      expect(result).not.toHaveProperty('videoUrl');
      expect(result).not.toHaveProperty('audioUrl');
    });

    test('returns null for missing video_key and audio_key', () => {
      const data = {
        sender_name: 'Alice',
        recipient_email: 'bob@example.com',
        amount_cents: 5000,
        message: 'Enjoy!',
        occasion: null,
        status: 'pending',
        scheduled_at: null,
        expires_at: '2025-06-01T00:00:00Z',
        claimed_at: null,
        created_at: '2025-03-01T00:00:00Z',
      };

      const result = toApiResponse('gift2', data);

      expect(result.videoKey).toBeNull();
      expect(result.audioKey).toBeNull();
    });
  });

  describe('toClaimPreviewResponse (BUG-004)', () => {
    test('maps video_key and audio_key correctly', () => {
      const data = {
        sender_name: 'Alice',
        amount_cents: 5000,
        message: 'Enjoy!',
        occasion: 'birthday',
        video_key: 'videos/abc.mp4',
        audio_key: null,
        status: 'pending',
        expires_at: '2025-06-01T00:00:00Z',
      };

      const result = toClaimPreviewResponse(data);

      expect(result.videoKey).toBe('videos/abc.mp4');
      expect(result.audioKey).toBeNull();
      expect(result).not.toHaveProperty('videoUrl');
      expect(result).not.toHaveProperty('audioUrl');
    });
  });
});
