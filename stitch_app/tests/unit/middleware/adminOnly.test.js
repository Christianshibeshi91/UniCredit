'use strict';

/**
 * Tests for BUG-002: JWT Role Re-Verification in adminOnly middleware.
 */

// Mock Redis
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
jest.mock('../../../backend/src/config/redis', () => ({
  getRedisClient: () => ({
    get: mockRedisGet,
    set: mockRedisSet,
  }),
  isRedisEnabled: jest.fn(),
}));

// Mock Firebase
const mockDocGet = jest.fn();
const mockDocRef = { get: mockDocGet };
const mockDoc = jest.fn().mockReturnValue(mockDocRef);
const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

jest.mock('../../../backend/src/config/firebase', () => ({
  db: { collection: mockCollection },
  firebaseEnabled: true,
}));

const { isRedisEnabled } = require('../../../backend/src/config/redis');
const adminOnly = require('../../../backend/src/middleware/adminOnly');
const { getUserRoleAndStatus } = require('../../../backend/src/services/userStatus.service');

describe('adminOnly middleware (BUG-002)', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { userId: 'user123', userRole: 'admin' };
    res = {};
    next = jest.fn();
  });

  test('allows active admin user', async () => {
    isRedisEnabled.mockReturnValue(false);
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ role: 'admin', status: 'active' }),
    });

    await adminOnly(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  test('rejects suspended admin with 403', async () => {
    isRedisEnabled.mockReturnValue(false);
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ role: 'admin', status: 'suspended' }),
    });

    await adminOnly(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 })
    );
  });

  test('rejects demoted user (role changed from admin to user)', async () => {
    isRedisEnabled.mockReturnValue(false);
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ role: 'user', status: 'active' }),
    });

    await adminOnly(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, code: 'ADMIN_REQUIRED' })
    );
  });

  test('uses Redis cache when available', async () => {
    isRedisEnabled.mockReturnValue(true);
    mockRedisGet.mockResolvedValue(JSON.stringify({ role: 'admin', status: 'active' }));

    await adminOnly(req, res, next);

    expect(next).toHaveBeenCalledWith();
    // Should not have hit Firestore
    expect(mockDocGet).not.toHaveBeenCalled();
  });

  test('caches Firestore result in Redis', async () => {
    isRedisEnabled.mockReturnValue(true);
    mockRedisGet.mockResolvedValue(null); // cache miss
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ role: 'admin', status: 'active' }),
    });
    mockRedisSet.mockResolvedValue('OK');

    await adminOnly(req, res, next);

    expect(mockRedisSet).toHaveBeenCalledWith(
      'user_role:user123',
      JSON.stringify({ role: 'admin', status: 'active' }),
      'EX',
      300
    );
  });

  test('falls back to JWT claim when Firestore user not found', async () => {
    isRedisEnabled.mockReturnValue(false);
    mockDocGet.mockResolvedValue({ exists: false });

    // JWT says admin
    req.userRole = 'admin';
    await adminOnly(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  test('rejects when Firestore unavailable and JWT says non-admin', async () => {
    isRedisEnabled.mockReturnValue(false);
    mockDocGet.mockResolvedValue({ exists: false });

    req.userRole = 'user';
    await adminOnly(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 })
    );
  });
});

describe('getUserRoleAndStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns role and status from Firestore', async () => {
    isRedisEnabled.mockReturnValue(false);
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ role: 'admin', status: 'active' }),
    });

    const result = await getUserRoleAndStatus('user123');

    expect(result).toEqual({ role: 'admin', status: 'active' });
  });

  test('returns null when user does not exist', async () => {
    isRedisEnabled.mockReturnValue(false);
    mockDocGet.mockResolvedValue({ exists: false });

    const result = await getUserRoleAndStatus('nonexistent');

    expect(result).toBeNull();
  });

  test('defaults role to user and status to active', async () => {
    isRedisEnabled.mockReturnValue(false);
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({}), // no role or status fields
    });

    const result = await getUserRoleAndStatus('user123');

    expect(result).toEqual({ role: 'user', status: 'active' });
  });
});
