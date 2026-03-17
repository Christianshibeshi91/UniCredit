'use strict';

const {
  sendGiftSchema,
  updateGiftMediaSchema,
} = require('../../../backend/src/validators/gift.validator');

function validateBody(schema, body) {
  return schema.body.validate(body, { abortEarly: false, allowUnknown: false, stripUnknown: true });
}

describe('Gift Validators', () => {
  describe('sendGiftSchema', () => {
    test('accepts valid gift', () => {
      const { error, value } = validateBody(sendGiftSchema, {
        recipientEmail: 'friend@example.com',
        amountCents: 5000,
        message: 'Happy Birthday!',
        occasion: 'Birthday',
      });
      expect(error).toBeUndefined();
      expect(value.recipientEmail).toBe('friend@example.com');
      expect(value.amountCents).toBe(5000);
    });

    test('accepts minimum amount (1 cent)', () => {
      const { error } = validateBody(sendGiftSchema, {
        recipientEmail: 'friend@example.com',
        amountCents: 1,
      });
      expect(error).toBeUndefined();
    });

    test('accepts maximum amount (5,000,000 cents = $50,000)', () => {
      const { error } = validateBody(sendGiftSchema, {
        recipientEmail: 'friend@example.com',
        amountCents: 5000000,
      });
      expect(error).toBeUndefined();
    });

    test('rejects amount over maximum', () => {
      const { error } = validateBody(sendGiftSchema, {
        recipientEmail: 'friend@example.com',
        amountCents: 5000001,
      });
      expect(error).toBeDefined();
    });

    test('rejects zero amount', () => {
      const { error } = validateBody(sendGiftSchema, {
        recipientEmail: 'friend@example.com',
        amountCents: 0,
      });
      expect(error).toBeDefined();
    });

    test('rejects negative amount', () => {
      const { error } = validateBody(sendGiftSchema, {
        recipientEmail: 'friend@example.com',
        amountCents: -100,
      });
      expect(error).toBeDefined();
    });

    test('rejects non-integer amount', () => {
      const { error } = validateBody(sendGiftSchema, {
        recipientEmail: 'friend@example.com',
        amountCents: 10.5,
      });
      expect(error).toBeDefined();
    });

    test('rejects missing recipientEmail', () => {
      const { error } = validateBody(sendGiftSchema, { amountCents: 5000 });
      expect(error).toBeDefined();
    });

    test('rejects missing amountCents', () => {
      const { error } = validateBody(sendGiftSchema, {
        recipientEmail: 'friend@example.com',
      });
      expect(error).toBeDefined();
    });

    test('rejects invalid email', () => {
      const { error } = validateBody(sendGiftSchema, {
        recipientEmail: 'not-email',
        amountCents: 5000,
      });
      expect(error).toBeDefined();
    });

    test('rejects message over 2000 chars', () => {
      const { error } = validateBody(sendGiftSchema, {
        recipientEmail: 'friend@example.com',
        amountCents: 5000,
        message: 'a'.repeat(2001),
      });
      expect(error).toBeDefined();
    });

    test('accepts empty message (allowed)', () => {
      const { error } = validateBody(sendGiftSchema, {
        recipientEmail: 'friend@example.com',
        amountCents: 5000,
        message: '',
      });
      expect(error).toBeUndefined();
    });

    test('accepts null message (allowed)', () => {
      const { error } = validateBody(sendGiftSchema, {
        recipientEmail: 'friend@example.com',
        amountCents: 5000,
        message: null,
      });
      expect(error).toBeUndefined();
    });

    test('accepts scheduledAt as ISO date string', () => {
      const { error } = validateBody(sendGiftSchema, {
        recipientEmail: 'friend@example.com',
        amountCents: 5000,
        scheduledAt: '2025-12-25T00:00:00.000Z',
      });
      expect(error).toBeUndefined();
    });

    test('rejects scheduledAt with invalid date', () => {
      const { error } = validateBody(sendGiftSchema, {
        recipientEmail: 'friend@example.com',
        amountCents: 5000,
        scheduledAt: 'not-a-date',
      });
      expect(error).toBeDefined();
    });

    test('accepts occasion up to 100 chars', () => {
      const { error } = validateBody(sendGiftSchema, {
        recipientEmail: 'friend@example.com',
        amountCents: 5000,
        occasion: 'a'.repeat(100),
      });
      expect(error).toBeUndefined();
    });

    test('rejects occasion over 100 chars', () => {
      const { error } = validateBody(sendGiftSchema, {
        recipientEmail: 'friend@example.com',
        amountCents: 5000,
        occasion: 'a'.repeat(101),
      });
      expect(error).toBeDefined();
    });
  });

  describe('updateGiftMediaSchema', () => {
    test('accepts valid videoKey', () => {
      const { error } = validateBody(updateGiftMediaSchema, {
        videoKey: 'gifts/user123/video.mp4',
      });
      expect(error).toBeUndefined();
    });

    test('accepts valid audioKey', () => {
      const { error } = validateBody(updateGiftMediaSchema, {
        audioKey: 'gifts/user123/audio.aac',
      });
      expect(error).toBeUndefined();
    });

    test('accepts both videoKey and audioKey', () => {
      const { error } = validateBody(updateGiftMediaSchema, {
        videoKey: 'gifts/user123/video.mp4',
        audioKey: 'gifts/user123/audio.aac',
      });
      expect(error).toBeUndefined();
    });

    test('rejects missing both videoKey and audioKey (at least one required)', () => {
      const { error } = validateBody(updateGiftMediaSchema, {});
      expect(error).toBeDefined();
    });

    test('rejects videoKey with invalid pattern', () => {
      const { error } = validateBody(updateGiftMediaSchema, {
        videoKey: 'invalid/path/video.mp4',
      });
      expect(error).toBeDefined();
    });

    test('rejects audioKey with invalid pattern', () => {
      const { error } = validateBody(updateGiftMediaSchema, {
        audioKey: 'invalid/path/audio.aac',
      });
      expect(error).toBeDefined();
    });

    test('accepts null videoKey when audioKey is present', () => {
      const { error } = validateBody(updateGiftMediaSchema, {
        videoKey: null,
        audioKey: 'gifts/user123/audio.aac',
      });
      expect(error).toBeUndefined();
    });

    test('rejects videoKey over 500 chars', () => {
      const { error } = validateBody(updateGiftMediaSchema, {
        videoKey: 'gifts/user123/' + 'a'.repeat(487),
      });
      expect(error).toBeDefined();
    });
  });
});
