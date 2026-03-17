'use strict';

// Mock Firebase
const mockDocGet = jest.fn();
const mockDocUpdate = jest.fn();
const mockDocSet = jest.fn();
const mockDocRef = { get: mockDocGet, update: mockDocUpdate, set: mockDocSet, id: 'auto-id' };
const mockLimitGet = jest.fn();
const mockLimit = jest.fn().mockReturnValue({ get: mockLimitGet });
const mockStartAfter = jest.fn().mockReturnValue({ limit: mockLimit });
const mockOrderBy = jest.fn().mockReturnValue({
  limit: mockLimit,
  startAfter: mockStartAfter,
});
const mockWhere = jest.fn().mockReturnValue({
  orderBy: mockOrderBy,
  limit: mockLimit,
  count: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({ data: () => ({ count: 100 }) }),
  }),
});
const mockCountGet = jest.fn().mockResolvedValue({ data: () => ({ count: 100 }) });
const mockDoc = jest.fn().mockReturnValue(mockDocRef);
const mockCollection = jest.fn().mockReturnValue({
  doc: mockDoc,
  where: mockWhere,
  orderBy: mockOrderBy,
  count: jest.fn().mockReturnValue({ get: mockCountGet }),
  get: jest.fn().mockResolvedValue({ docs: [], size: 0 }),
});

jest.mock('../../../backend/src/config/firebase', () => ({
  db: {
    collection: mockCollection,
  },
  firebaseEnabled: true,
  FieldValue: {
    increment: jest.fn((val) => `increment(${val})`),
  },
}));

// Mock audit service
const mockAuditLog = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../backend/src/services/audit.service', () => ({
  log: mockAuditLog,
}));

const adminService = require('../../../backend/src/services/admin.service');
const { NotFoundError, ValidationError } = require('../../../backend/src/utils/errors');

describe('Admin Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('suspendUser', () => {
    test('suspends an active user', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'active', email: 'user@example.com' }),
      });
      mockDocUpdate.mockResolvedValue(undefined);

      await expect(
        adminService.suspendUser('admin1', 'admin@example.com', 'user123', 'Fraud detected', '1.2.3.4', 'req-1')
      ).resolves.not.toThrow();

      expect(mockDocUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'suspended',
          suspended_by: 'admin1',
        })
      );
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'suspend_user',
          actorId: 'admin1',
          targetId: 'user123',
        })
      );
    });

    test('throws NotFoundError for non-existent user', async () => {
      mockDocGet.mockResolvedValue({ exists: false });

      await expect(
        adminService.suspendUser('admin1', 'admin@example.com', 'nonexistent', 'reason', '1.2.3.4', 'req-1')
      ).rejects.toThrow(NotFoundError);
    });

    test('sanitizes suspension reason', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'active' }),
      });
      mockDocUpdate.mockResolvedValue(undefined);

      await adminService.suspendUser(
        'admin1', 'admin@example.com', 'user123', '<script>xss</script>', '1.2.3.4', 'req-1'
      );

      const updateCall = mockDocUpdate.mock.calls[0][0];
      expect(updateCall.suspended_reason).not.toContain('<script>');
    });
  });

  describe('reinstateUser', () => {
    test('reinstates a suspended user', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'suspended' }),
      });
      mockDocUpdate.mockResolvedValue(undefined);

      await expect(
        adminService.reinstateUser('admin1', 'admin@example.com', 'user123', '1.2.3.4', 'req-1')
      ).resolves.not.toThrow();

      expect(mockDocUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          suspended_at: null,
          suspended_by: null,
          suspended_reason: null,
        })
      );
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'reinstate_user',
        })
      );
    });

    test('throws NotFoundError for non-existent user', async () => {
      mockDocGet.mockResolvedValue({ exists: false });

      await expect(
        adminService.reinstateUser('admin1', 'admin@example.com', 'nonexistent', '1.2.3.4', 'req-1')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('resolveFraudFlag', () => {
    test('resolves a fraud flag', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'open', user_id: 'user123' }),
      });
      mockDocUpdate.mockResolvedValue(undefined);

      await expect(
        adminService.resolveFraudFlag('admin1', 'admin@example.com', 'flag-1', 'False positive', '1.2.3.4', 'req-1')
      ).resolves.not.toThrow();

      expect(mockDocUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'resolved',
          resolved_by: 'admin1',
        })
      );
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'resolve_fraud_flag',
          targetType: 'fraud_flag',
        })
      );
    });

    test('throws NotFoundError for non-existent flag', async () => {
      mockDocGet.mockResolvedValue({ exists: false });

      await expect(
        adminService.resolveFraudFlag('admin1', 'admin@example.com', 'nonexistent', null, '1.2.3.4', 'req-1')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('blockFraudFlag', () => {
    test('blocks user and resolves flag', async () => {
      // First call: get fraud flag
      mockDocGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ status: 'open', user_id: 'user123', reason: 'Suspicious' }),
        })
        // Second call: get user
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ status: 'active' }),
        });
      mockDocUpdate.mockResolvedValue(undefined);

      await expect(
        adminService.blockFraudFlag('admin1', 'admin@example.com', 'flag-1', 'Confirmed fraud', '1.2.3.4', 'req-1')
      ).resolves.not.toThrow();

      // Should update both user (suspend) and flag (blocked)
      expect(mockDocUpdate).toHaveBeenCalledTimes(2);

      // Verify the flag was marked as blocked
      const flagUpdate = mockDocUpdate.mock.calls.find(
        (call) => call[0].status === 'blocked'
      );
      expect(flagUpdate).toBeDefined();

      // Verify audit log
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'block_fraud_flag',
        })
      );
    });

    test('throws NotFoundError for non-existent flag', async () => {
      mockDocGet.mockResolvedValue({ exists: false });

      await expect(
        adminService.blockFraudFlag('admin1', 'admin@example.com', 'nonexistent', null, '1.2.3.4', 'req-1')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateSetting', () => {
    test('updates a valid setting', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ value: 0.9, description: 'Exchange rate' }),
      });
      mockDocSet.mockResolvedValue(undefined);

      const result = await adminService.updateSetting(
        'admin1', 'admin@example.com', 'exchange_rate', 0.85, '1.2.3.4', 'req-1'
      );

      expect(result.key).toBe('exchange_rate');
      expect(result.value).toBe(0.85);
      expect(result.previousValue).toBe(0.9);
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update_setting',
          targetType: 'setting',
        })
      );
    });

    test('throws ValidationError for invalid setting value', async () => {
      await expect(
        adminService.updateSetting('admin1', 'admin@example.com', 'exchange_rate', 2.0, '1.2.3.4', 'req-1')
      ).rejects.toThrow(ValidationError);
    });

    test('throws ValidationError for unknown setting key', async () => {
      await expect(
        adminService.updateSetting('admin1', 'admin@example.com', 'nonexistent_key', 42, '1.2.3.4', 'req-1')
      ).rejects.toThrow(ValidationError);
    });

    test('updates boolean setting', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ value: false, description: 'Rate lock' }),
      });
      mockDocSet.mockResolvedValue(undefined);

      const result = await adminService.updateSetting(
        'admin1', 'admin@example.com', 'global_rate_lock', true, '1.2.3.4', 'req-1'
      );

      expect(result.value).toBe(true);
      expect(result.previousValue).toBe(false);
    });

    test('updates integer setting', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ value: 90, description: 'Gift expiration days' }),
      });
      mockDocSet.mockResolvedValue(undefined);

      const result = await adminService.updateSetting(
        'admin1', 'admin@example.com', 'gift_expiration_days', 60, '1.2.3.4', 'req-1'
      );

      expect(result.value).toBe(60);
      expect(result.previousValue).toBe(90);
    });

    test('handles new setting (not previously existing)', async () => {
      mockDocGet.mockResolvedValue({ exists: false });
      mockDocSet.mockResolvedValue(undefined);

      const result = await adminService.updateSetting(
        'admin1', 'admin@example.com', 'exchange_rate', 0.85, '1.2.3.4', 'req-1'
      );

      expect(result.previousValue).toBeNull();
    });
  });

  describe('getUsers', () => {
    test('returns paginated users', async () => {
      const mockUserDocs = [
        {
          id: 'user1',
          data: () => ({
            name: 'User One',
            email: 'one@example.com',
            balance_cents: 1000,
            tier: 'STANDARD',
            role: 'user',
            status: 'active',
            last_login_at: '2024-01-01T00:00:00Z',
            created_at: '2024-01-01T00:00:00Z',
          }),
        },
      ];
      mockLimit.mockReturnValue({
        get: jest.fn().mockResolvedValue({ docs: mockUserDocs }),
      });

      const result = await adminService.getUsers({ limit: 50 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('active');
      expect(result.pagination).toBeDefined();
      expect(result.pagination.hasMore).toBe(false);
    });

    test('returns hasMore=true when more users exist', async () => {
      const mockUserDocs = Array.from({ length: 51 }, (_, i) => ({
        id: `user${i}`,
        data: () => ({
          name: `User ${i}`,
          email: `user${i}@example.com`,
          balance_cents: 0,
          tier: 'STANDARD',
          role: 'user',
          status: 'active',
          created_at: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
        }),
      }));
      mockLimit.mockReturnValue({
        get: jest.fn().mockResolvedValue({ docs: mockUserDocs }),
      });

      const result = await adminService.getUsers({ limit: 50 });

      expect(result.data).toHaveLength(50);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.nextCursor).toBeTruthy();
    });
  });

  describe('getUserDetail', () => {
    test('returns user with transactions, gifts, and fraud flags', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          name: 'Detail User',
          email: 'detail@example.com',
          balance_cents: 5000,
          tier: 'GOLD',
          role: 'user',
          status: 'active',
          auth_provider: 'email',
          last_login_at: '2024-06-15T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
        }),
      });

      // Mocks for the 3 sub-queries (transactions, gifts, fraud_flags)
      const emptySnap = { docs: [] };
      mockWhere.mockReturnValue({
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(emptySnap),
          }),
        }),
      });

      const result = await adminService.getUserDetail('user123');

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('detail@example.com');
      expect(result.recentTransactions).toBeDefined();
      expect(result.sentGifts).toBeDefined();
      expect(result.fraudFlags).toBeDefined();
    });

    test('throws NotFoundError for non-existent user', async () => {
      mockDocGet.mockResolvedValue({ exists: false });

      await expect(adminService.getUserDetail('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getFraudFlags', () => {
    test('returns paginated fraud flags', async () => {
      const mockFlagDocs = [
        {
          id: 'flag1',
          data: () => ({
            user_id: 'user123',
            reason: 'Suspicious',
            severity: 'medium',
            status: 'open',
            created_at: '2024-01-01T00:00:00Z',
          }),
        },
      ];
      // Set up the full chain: collection().where().orderBy().limit().get()
      mockWhere.mockReturnValue({
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ docs: mockFlagDocs }),
          }),
          startAfter: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ docs: mockFlagDocs }),
            }),
          }),
        }),
      });

      const result = await adminService.getFraudFlags({ limit: 20, status: 'open' });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.hasMore).toBe(false);
    });

    test('returns empty list when no flags', async () => {
      mockWhere.mockReturnValue({
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ docs: [] }),
          }),
          startAfter: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ docs: [] }),
            }),
          }),
        }),
      });

      const result = await adminService.getFraudFlags();

      expect(result.data).toEqual([]);
      expect(result.pagination.hasMore).toBe(false);
    });
  });

  describe('getStats', () => {
    test('returns platform stats using pre-aggregated volume counter', async () => {
      // Mock users count: collection('users').count().get()
      mockCountGet.mockResolvedValue({ data: () => ({ count: 50 }) });
      mockCollection.mockReturnValueOnce({
        count: jest.fn().mockReturnValue({ get: mockCountGet }),
        doc: mockDoc,
        where: mockWhere,
        orderBy: mockOrderBy,
      });

      // Mock transactions count: collection('transactions').count().get()
      const txCountGet = jest.fn().mockResolvedValue({ data: () => ({ count: 3 }) });
      mockCollection.mockReturnValueOnce({
        count: jest.fn().mockReturnValue({ get: txCountGet }),
        doc: mockDoc,
        where: mockWhere,
      });

      // Mock settings/platform_stats doc: collection('settings').doc('platform_stats').get()
      const statsDocGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ total_volume_cents: 3000 }),
      });
      mockCollection.mockReturnValueOnce({
        doc: jest.fn().mockReturnValue({ get: statsDocGet }),
      });

      // fraud_flags collection
      mockWhere.mockReturnValueOnce({
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ docs: [] }),
          }),
        }),
      });

      const result = await adminService.getStats();
      expect(result).toBeDefined();
      expect(result.totalUsers).toBe(50);
      expect(result.totalTransactions).toBe(3);
      expect(result.totalVolumeCents).toBe(3000);
      expect(result.displayVolume).toBe('$30.00');
    });

    test('returns zero volume when platform_stats doc does not exist', async () => {
      // Mock users count
      mockCountGet.mockResolvedValue({ data: () => ({ count: 10 }) });
      mockCollection.mockReturnValueOnce({
        count: jest.fn().mockReturnValue({ get: mockCountGet }),
        doc: mockDoc,
        where: mockWhere,
        orderBy: mockOrderBy,
      });

      // Mock transactions count
      const txCountGet = jest.fn().mockResolvedValue({ data: () => ({ count: 0 }) });
      mockCollection.mockReturnValueOnce({
        count: jest.fn().mockReturnValue({ get: txCountGet }),
        doc: mockDoc,
        where: mockWhere,
      });

      // Mock settings/platform_stats doc (doesn't exist yet)
      const statsDocGet = jest.fn().mockResolvedValue({ exists: false });
      mockCollection.mockReturnValueOnce({
        doc: jest.fn().mockReturnValue({ get: statsDocGet }),
      });

      // fraud_flags collection
      mockWhere.mockReturnValueOnce({
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ docs: [] }),
          }),
        }),
      });

      const result = await adminService.getStats();
      expect(result.totalVolumeCents).toBe(0);
      expect(result.displayVolume).toBe('$0.00');
    });
  });
});
