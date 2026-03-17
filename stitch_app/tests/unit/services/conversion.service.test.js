'use strict';

// Mock Firebase
const mockSettingsGet = jest.fn();
jest.mock('../../../backend/src/config/firebase', () => ({
  db: {
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: mockSettingsGet,
      }),
    }),
  },
  firebaseEnabled: true,
}));

// Mock wallet service
const mockCreditBalance = jest.fn();
jest.mock('../../../backend/src/services/wallet.service', () => ({
  creditBalance: mockCreditBalance,
}));

const conversionService = require('../../../backend/src/services/conversion.service');

describe('Conversion Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getExchangeRate', () => {
    test('returns rate from settings when available', async () => {
      mockSettingsGet.mockResolvedValue({
        exists: true,
        data: () => ({ value: 0.85 }),
      });

      const rate = await conversionService.getExchangeRate();
      expect(rate).toBe(0.85);
    });

    test('returns default 0.9 when setting does not exist', async () => {
      mockSettingsGet.mockResolvedValue({ exists: false });

      const rate = await conversionService.getExchangeRate();
      expect(rate).toBe(0.9);
    });

    test('returns default 0.9 on error', async () => {
      mockSettingsGet.mockRejectedValue(new Error('db error'));

      const rate = await conversionService.getExchangeRate();
      expect(rate).toBe(0.9);
    });
  });

  describe('convertGiftCard', () => {
    test('converts gift card with correct exchange rate', async () => {
      mockSettingsGet.mockResolvedValue({
        exists: true,
        data: () => ({ value: 0.9 }),
      });
      mockCreditBalance.mockResolvedValue({ newBalanceCents: 9000 });

      const result = await conversionService.convertGiftCard(
        'user123', 'Amazon', 'ABCD-1234', null, 10000
      );

      expect(result.success).toBe(true);
      expect(result.creditedCents).toBe(9000); // 10000 * 0.9
      expect(result.displayCredited).toBe('$90.00');
      expect(result.newBalanceCents).toBe(9000);
      expect(result.exchangeRate).toBe(0.9);
    });

    test('calls wallet.creditBalance with correct params', async () => {
      mockSettingsGet.mockResolvedValue({
        exists: true,
        data: () => ({ value: 0.9 }),
      });
      mockCreditBalance.mockResolvedValue({ newBalanceCents: 9000 });

      await conversionService.convertGiftCard(
        'user123', 'Amazon', 'ABCD-1234', null, 10000
      );

      expect(mockCreditBalance).toHaveBeenCalledWith(
        'user123',
        9000,
        expect.stringContaining('Amazon'),
        'gift_card'
      );
    });

    test('sanitizes merchant name in description', async () => {
      mockSettingsGet.mockResolvedValue({
        exists: true,
        data: () => ({ value: 0.9 }),
      });
      mockCreditBalance.mockResolvedValue({ newBalanceCents: 900 });

      await conversionService.convertGiftCard(
        'user123', '<script>alert(1)</script>', 'ABCD-1234', null, 1000
      );

      // The description passed to creditBalance should be sanitized
      const description = mockCreditBalance.mock.calls[0][2];
      expect(description).not.toContain('<script>');
      expect(description).toContain('&lt;script&gt;');
    });

    test('uses default rate when settings fail', async () => {
      mockSettingsGet.mockRejectedValue(new Error('db error'));
      mockCreditBalance.mockResolvedValue({ newBalanceCents: 9000 });

      const result = await conversionService.convertGiftCard(
        'user123', 'Amazon', 'ABCD-1234', null, 10000
      );

      expect(result.exchangeRate).toBe(0.9);
      expect(result.creditedCents).toBe(9000);
    });

    test('propagates wallet service errors', async () => {
      mockSettingsGet.mockResolvedValue({
        exists: true,
        data: () => ({ value: 0.9 }),
      });
      mockCreditBalance.mockRejectedValue(new Error('Wallet error'));

      await expect(
        conversionService.convertGiftCard('user123', 'Amazon', 'ABCD', null, 10000)
      ).rejects.toThrow('Wallet error');
    });
  });
});
