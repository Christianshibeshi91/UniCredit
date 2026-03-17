'use strict';

// Mock Firebase
const mockTransaction = {
  get: jest.fn(),
  update: jest.fn(),
  set: jest.fn(),
};
const mockRunTransaction = jest.fn(async (fn) => fn(mockTransaction));
const mockDocGet = jest.fn();
const mockDocUpdate = jest.fn();
const mockDocRef = { get: mockDocGet, update: mockDocUpdate, id: 'gift-auto-id' };
const mockLimitGet = jest.fn();
const mockLimit = jest.fn().mockReturnValue({ get: mockLimitGet });
const mockWhere = jest.fn().mockReturnValue({
  limit: mockLimit,
  where: jest.fn().mockReturnValue({
    limit: mockLimit,
    get: mockLimitGet,
    where: jest.fn().mockReturnValue({
      get: mockLimitGet,
    }),
  }),
  get: mockLimitGet,
});
const mockDoc = jest.fn().mockReturnValue(mockDocRef);
const mockCollection = jest.fn().mockReturnValue({
  doc: mockDoc,
  where: mockWhere,
});

jest.mock('../../../backend/src/config/firebase', () => ({
  db: {
    collection: mockCollection,
    runTransaction: mockRunTransaction,
  },
  firebaseEnabled: true,
  FieldValue: {
    increment: jest.fn((val) => `increment(${val})`),
  },
}));

// Mock notification service
jest.mock('../../../backend/src/services/notification.service', () => ({
  sendGiftNotificationEmail: jest.fn().mockResolvedValue(undefined),
}));

const giftService = require('../../../backend/src/services/gift.service');
const {
  NotFoundError,
  InsufficientBalanceError,
  AlreadyClaimedError,
  GiftExpiredError,
  AccessDeniedError,
  ValidationError,
} = require('../../../backend/src/utils/errors');

describe('Gift Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendGift', () => {
    test('creates gift and debits sender atomically', async () => {
      // Sender exists with balance
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ name: 'Sender', balance_cents: 10000 }),
      });

      // Settings doc
      mockLimitGet.mockResolvedValue({ docs: [] });

      // Transaction mocks
      mockTransaction.get.mockResolvedValue({
        exists: true,
        data: () => ({ balance_cents: 10000 }),
      });

      const result = await giftService.sendGift({
        senderId: 'sender123',
        recipientEmail: 'friend@example.com',
        amountCents: 5000,
        message: 'Happy Birthday!',
        occasion: 'Birthday',
      });

      expect(result.giftId).toBeDefined();
      expect(result.newBalanceCents).toBe(5000);
    });

    test('throws InsufficientBalanceError when balance too low', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ name: 'Sender', balance_cents: 1000 }),
      });

      mockTransaction.get.mockResolvedValue({
        exists: true,
        data: () => ({ balance_cents: 1000 }),
      });

      await expect(giftService.sendGift({
        senderId: 'sender123',
        recipientEmail: 'friend@example.com',
        amountCents: 5000,
      })).rejects.toThrow(InsufficientBalanceError);
    });

    test('throws NotFoundError for non-existent sender', async () => {
      mockDocGet.mockResolvedValue({ exists: false });

      await expect(giftService.sendGift({
        senderId: 'nonexistent',
        recipientEmail: 'friend@example.com',
        amountCents: 5000,
      })).rejects.toThrow(NotFoundError);
    });

    test('rejects scheduledAt in the past', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ name: 'Sender', balance_cents: 10000 }),
      });

      await expect(giftService.sendGift({
        senderId: 'sender123',
        recipientEmail: 'friend@example.com',
        amountCents: 5000,
        scheduledAt: '2020-01-01T00:00:00Z',
      })).rejects.toThrow(ValidationError);
    });
  });

  describe('previewGift', () => {
    test('returns preview for valid claim token', async () => {
      mockLimitGet.mockResolvedValue({
        docs: [{
          id: 'gift-1',
          data: () => ({
            sender_name: 'Alice',
            amount_cents: 5000,
            message: 'Enjoy!',
            occasion: 'Birthday',
            status: 'pending',
            expires_at: new Date(Date.now() + 86400000).toISOString(),
          }),
        }],
      });

      const result = await giftService.previewGift('valid-claim-token');
      expect(result).toBeDefined();
      expect(result.senderName).toBe('Alice');
    });

    test('throws NotFoundError for non-existent gift', async () => {
      mockLimitGet.mockResolvedValue({ empty: true, docs: [] });

      await expect(giftService.previewGift('invalid-token')).rejects.toThrow(NotFoundError);
    });

    test('throws AlreadyClaimedError for claimed gift', async () => {
      mockLimitGet.mockResolvedValue({
        docs: [{
          id: 'gift-1',
          data: () => ({
            status: 'claimed',
            expires_at: new Date(Date.now() + 86400000).toISOString(),
          }),
        }],
      });

      await expect(giftService.previewGift('claimed-token')).rejects.toThrow(AlreadyClaimedError);
    });

    test('throws NotFoundError for expired gift', async () => {
      mockLimitGet.mockResolvedValue({
        docs: [{
          id: 'gift-1',
          data: () => ({
            status: 'expired',
            expires_at: new Date(Date.now() - 86400000).toISOString(),
          }),
        }],
      });

      await expect(giftService.previewGift('expired-token')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getGift', () => {
    test('returns gift for sender', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          sender_id: 'sender123',
          recipient_user_id: 'recipient456',
          amount_cents: 5000,
          status: 'pending',
          created_at: '2024-01-01T00:00:00Z',
        }),
      });

      const result = await giftService.getGift('gift-1', 'sender123');
      expect(result).toBeDefined();
    });

    test('returns gift for recipient', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          sender_id: 'sender123',
          recipient_user_id: 'recipient456',
          amount_cents: 5000,
          status: 'claimed',
          created_at: '2024-01-01T00:00:00Z',
        }),
      });

      const result = await giftService.getGift('gift-1', 'recipient456');
      expect(result).toBeDefined();
    });

    test('throws AccessDeniedError for unauthorized user (IDOR protection)', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          sender_id: 'sender123',
          recipient_user_id: 'recipient456',
          amount_cents: 5000,
          status: 'pending',
        }),
      });

      await expect(giftService.getGift('gift-1', 'attacker789')).rejects.toThrow(AccessDeniedError);
    });

    test('throws NotFoundError for non-existent gift', async () => {
      mockDocGet.mockResolvedValue({ exists: false });

      await expect(giftService.getGift('nonexistent', 'user123')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateGiftMedia', () => {
    test('updates media for gift sender', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ sender_id: 'sender123' }),
      });
      mockDocUpdate.mockResolvedValue(undefined);

      await expect(
        giftService.updateGiftMedia('gift-1', 'sender123', 'gifts/sender123/video.mp4')
      ).resolves.not.toThrow();
    });

    test('throws AccessDeniedError for non-sender', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ sender_id: 'sender123' }),
      });

      await expect(
        giftService.updateGiftMedia('gift-1', 'attacker789', 'gifts/attacker789/video.mp4')
      ).rejects.toThrow(AccessDeniedError);
    });

    test('throws NotFoundError for non-existent gift', async () => {
      mockDocGet.mockResolvedValue({ exists: false });

      await expect(
        giftService.updateGiftMedia('nonexistent', 'user123', 'gifts/user123/video.mp4')
      ).rejects.toThrow(NotFoundError);
    });

    test('rejects video key that does not match sender pattern', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ sender_id: 'sender123' }),
      });

      await expect(
        giftService.updateGiftMedia('gift-1', 'sender123', 'gifts/otheruser/video.mp4')
      ).rejects.toThrow(ValidationError);
    });

    test('rejects audio key that does not match sender pattern', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ sender_id: 'sender123' }),
      });

      await expect(
        giftService.updateGiftMedia('gift-1', 'sender123', undefined, 'gifts/otheruser/audio.aac')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('claimGift', () => {
    test('claims gift and credits recipient', async () => {
      // Simulate where().limit().get() for finding the gift by claim token hash
      mockLimitGet.mockResolvedValue({
        docs: [{
          id: 'gift-1',
          data: () => ({
            sender_id: 'sender123',
            sender_name: 'Alice',
            amount_cents: 5000,
            status: 'pending',
            message: 'Enjoy!',
            occasion: 'Birthday',
            expires_at: new Date(Date.now() + 86400000).toISOString(),
          }),
        }],
      });

      // Transaction mocks: first get = recipient, second get = fresh gift
      mockTransaction.get
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ balance_cents: 1000 }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ status: 'pending' }),
        });

      const result = await giftService.claimGift('valid-claim-token', 'recipient123');

      expect(result.success).toBe(true);
      expect(result.creditedCents).toBe(5000);
      expect(result.displayCredited).toBe('$50.00');
      expect(result.newBalanceCents).toBe(6000);
      expect(result.giftId).toBe('gift-1');
      expect(result.senderName).toBe('Alice');
    });

    test('throws NotFoundError for non-existent claim token', async () => {
      mockLimitGet.mockResolvedValue({ empty: true, docs: [] });

      await expect(
        giftService.claimGift('invalid-token', 'user123')
      ).rejects.toThrow(NotFoundError);
    });

    test('throws AlreadyClaimedError for already claimed gift', async () => {
      mockLimitGet.mockResolvedValue({
        docs: [{
          id: 'gift-1',
          data: () => ({
            status: 'claimed',
            expires_at: new Date(Date.now() + 86400000).toISOString(),
          }),
        }],
      });

      await expect(
        giftService.claimGift('claimed-token', 'user123')
      ).rejects.toThrow(AlreadyClaimedError);
    });

    test('throws GiftExpiredError for expired gift', async () => {
      mockLimitGet.mockResolvedValue({
        docs: [{
          id: 'gift-1',
          data: () => ({
            status: 'pending',
            expires_at: new Date(Date.now() - 86400000).toISOString(),
          }),
        }],
      });

      await expect(
        giftService.claimGift('expired-token', 'user123')
      ).rejects.toThrow(GiftExpiredError);
    });

    test('throws GiftExpiredError for gift with expired status', async () => {
      mockLimitGet.mockResolvedValue({
        docs: [{
          id: 'gift-1',
          data: () => ({
            status: 'expired',
            expires_at: new Date(Date.now() + 86400000).toISOString(),
          }),
        }],
      });

      await expect(
        giftService.claimGift('expired-status-token', 'user123')
      ).rejects.toThrow(GiftExpiredError);
    });
  });

  describe('processExpiredGifts', () => {
    test('returns zero counts when no expired gifts', async () => {
      mockLimitGet.mockResolvedValue({ docs: [] });

      // Mock the chained where().where().get()
      mockWhere.mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ docs: [] }),
        }),
        get: jest.fn().mockResolvedValue({ docs: [] }),
      });

      const result = await giftService.processExpiredGifts();
      expect(result.expired).toBe(0);
      expect(result.refunded).toBe(0);
    });
  });

  describe('processScheduledDeliveries', () => {
    test('returns zero when no scheduled gifts due', async () => {
      mockWhere.mockReturnValue({
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ docs: [] }),
          }),
        }),
        get: jest.fn().mockResolvedValue({ docs: [] }),
      });

      const result = await giftService.processScheduledDeliveries();
      expect(result.delivered).toBe(0);
    });
  });
});
