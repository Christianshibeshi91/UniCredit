'use strict';

// Mock Firebase config
const mockTransaction = {
  get: jest.fn(),
  update: jest.fn(),
  set: jest.fn(),
};
const mockRunTransaction = jest.fn(async (fn) => fn(mockTransaction));
const mockGet = jest.fn();
const mockLimit = jest.fn().mockReturnValue({ get: mockGet });
const mockStartAfter = jest.fn().mockReturnValue({ limit: mockLimit });
const mockOrderBy = jest.fn().mockReturnValue({
  limit: mockLimit,
  startAfter: mockStartAfter,
  where: jest.fn().mockReturnValue({
    limit: mockLimit,
    startAfter: mockStartAfter,
    where: jest.fn().mockReturnValue({
      limit: mockLimit,
      startAfter: mockStartAfter,
    }),
  }),
});
const mockWhere = jest.fn().mockReturnValue({
  orderBy: mockOrderBy,
  limit: mockLimit,
});
const mockDoc = jest.fn().mockReturnValue({ get: jest.fn() });
const mockCollection = jest.fn().mockReturnValue({
  doc: mockDoc,
  where: mockWhere,
  orderBy: mockOrderBy,
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

const walletService = require('../../../backend/src/services/wallet.service');
const { NotFoundError, InsufficientBalanceError } = require('../../../backend/src/utils/errors');

describe('Wallet Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBalance', () => {
    test('returns balance from Firestore', async () => {
      const mockUserGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ balance_cents: 15000, tier: 'GOLD' }),
      });
      mockDoc.mockReturnValueOnce({ get: mockUserGet });

      const result = await walletService.getBalance('user123');

      expect(result.balanceCents).toBe(15000);
      expect(result.displayBalance).toBe('$150.00');
      expect(result.tier).toBe('GOLD');
    });

    test('throws NotFoundError for non-existent user', async () => {
      const mockUserGet = jest.fn().mockResolvedValue({ exists: false });
      mockDoc.mockReturnValueOnce({ get: mockUserGet });

      await expect(walletService.getBalance('nonexistent')).rejects.toThrow(NotFoundError);
    });

    test('defaults balance to 0 if field missing', async () => {
      const mockUserGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({}),
      });
      mockDoc.mockReturnValueOnce({ get: mockUserGet });

      const result = await walletService.getBalance('user123');
      expect(result.balanceCents).toBe(0);
      expect(result.displayBalance).toBe('$0.00');
      expect(result.tier).toBe('STANDARD');
    });
  });

  describe('creditBalance', () => {
    test('credits balance atomically via transaction', async () => {
      mockTransaction.get.mockResolvedValue({
        exists: true,
        data: () => ({ balance_cents: 5000 }),
      });

      const result = await walletService.creditBalance('user123', 1000, 'Test credit', 'general');

      expect(result.newBalanceCents).toBe(6000);
      expect(mockTransaction.update).toHaveBeenCalled();
      expect(mockTransaction.set).toHaveBeenCalled();
    });

    test('throws on non-integer amountCents', async () => {
      await expect(
        walletService.creditBalance('user123', 10.5, 'Bad amount', 'general')
      ).rejects.toThrow('amountCents must be a positive integer');
    });

    test('throws on zero amountCents', async () => {
      await expect(
        walletService.creditBalance('user123', 0, 'Zero', 'general')
      ).rejects.toThrow('amountCents must be a positive integer');
    });

    test('throws on negative amountCents', async () => {
      await expect(
        walletService.creditBalance('user123', -100, 'Negative', 'general')
      ).rejects.toThrow('amountCents must be a positive integer');
    });

    test('throws NotFoundError if user does not exist in transaction', async () => {
      mockTransaction.get.mockResolvedValue({ exists: false });

      await expect(
        walletService.creditBalance('nonexistent', 1000, 'Test', 'general')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('debitBalance', () => {
    test('debits balance atomically', async () => {
      mockTransaction.get.mockResolvedValue({
        exists: true,
        data: () => ({ balance_cents: 5000 }),
      });

      const result = await walletService.debitBalance('user123', 1000, 'Test debit', 'general');

      expect(result.newBalanceCents).toBe(4000);
      expect(mockTransaction.update).toHaveBeenCalled();
      expect(mockTransaction.set).toHaveBeenCalled();
    });

    test('throws InsufficientBalanceError if balance too low', async () => {
      mockTransaction.get.mockResolvedValue({
        exists: true,
        data: () => ({ balance_cents: 500 }),
      });

      await expect(
        walletService.debitBalance('user123', 1000, 'Too much', 'general')
      ).rejects.toThrow(InsufficientBalanceError);
    });

    test('throws on non-integer amountCents', async () => {
      await expect(
        walletService.debitBalance('user123', 10.5, 'Bad amount', 'general')
      ).rejects.toThrow('amountCents must be a positive integer');
    });

    test('throws on zero amountCents', async () => {
      await expect(
        walletService.debitBalance('user123', 0, 'Zero', 'general')
      ).rejects.toThrow('amountCents must be a positive integer');
    });

    test('throws NotFoundError if user does not exist in transaction', async () => {
      mockTransaction.get.mockResolvedValue({ exists: false });

      await expect(
        walletService.debitBalance('nonexistent', 1000, 'Test', 'general')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getTransactions', () => {
    test('returns paginated transactions', async () => {
      const mockDocs = [
        {
          id: 'tx1',
          data: () => ({
            amount_cents: 1000,
            type: 'credit',
            description: 'Test',
            category: 'general',
            created_at: '2024-01-01T00:00:00Z',
          }),
        },
      ];
      mockGet.mockResolvedValue({ docs: mockDocs });

      const result = await walletService.getTransactions('user123', { limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('tx1');
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.limit).toBe(20);
    });

    test('returns hasMore=true when more results exist', async () => {
      // 21 docs means limit+1 returned, so hasMore=true
      const mockDocs = Array.from({ length: 21 }, (_, i) => ({
        id: `tx${i}`,
        data: () => ({
          amount_cents: 100,
          type: 'credit',
          description: 'Test',
          category: 'general',
          created_at: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
        }),
      }));
      mockGet.mockResolvedValue({ docs: mockDocs });

      const result = await walletService.getTransactions('user123', { limit: 20 });

      expect(result.data).toHaveLength(20);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.nextCursor).toBeTruthy();
    });

    test('returns empty data when no transactions', async () => {
      mockGet.mockResolvedValue({ docs: [] });

      const result = await walletService.getTransactions('user123');

      expect(result.data).toEqual([]);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.nextCursor).toBeNull();
    });
  });
});
