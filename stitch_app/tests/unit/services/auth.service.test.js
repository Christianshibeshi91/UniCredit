'use strict';

const bcrypt = require('bcryptjs');

// Mock env
jest.mock('../../../backend/src/config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-key-for-unit-tests',
    NODE_ENV: 'test',
  },
}));

// Mock Firebase
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockDocRef = { get: mockGet, set: mockSet, update: mockUpdate };
const mockSnap = { empty: false, docs: [] };
const mockLimitFn = jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(mockSnap) });
const mockWhere = jest.fn().mockReturnValue({ limit: mockLimitFn });
const mockCollection = jest.fn().mockReturnValue({
  doc: jest.fn().mockReturnValue(mockDocRef),
  where: mockWhere,
});

const mockCreateUser = jest.fn();
const mockGetUserByEmail = jest.fn();
const mockVerifyIdToken = jest.fn();
const mockUpdateUser = jest.fn();

jest.mock('../../../backend/src/config/firebase', () => ({
  db: {
    collection: mockCollection,
  },
  firebaseEnabled: true,
  admin: {
    auth: () => ({
      createUser: mockCreateUser,
      getUserByEmail: mockGetUserByEmail,
      verifyIdToken: mockVerifyIdToken,
      updateUser: mockUpdateUser,
    }),
  },
}));

// Mock notification service
jest.mock('../../../backend/src/services/notification.service', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const authService = require('../../../backend/src/services/auth.service');
const {
  ConflictError,
  InvalidCredentialsError,
  NotFoundError,
  InvalidTokenError,
} = require('../../../backend/src/utils/errors');

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    test('registers a new user successfully', async () => {
      // Simulate no existing user
      const emptySnap = { empty: true, docs: [] };
      mockLimitFn.mockReturnValueOnce({ get: jest.fn().mockResolvedValue(emptySnap) });

      mockCreateUser.mockResolvedValue({ uid: 'firebase-uid-1' });
      mockSet.mockResolvedValue(undefined);

      const result = await authService.register('new@example.com', 'password123', 'Test User');

      expect(result.token).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('new@example.com');
    });

    test('throws ConflictError for existing email', async () => {
      const existingSnap = { empty: false, docs: [{ id: 'existing-user' }] };
      mockLimitFn.mockReturnValueOnce({ get: jest.fn().mockResolvedValue(existingSnap) });

      await expect(
        authService.register('existing@example.com', 'password123')
      ).rejects.toThrow(ConflictError);
    });

    test('throws ConflictError when Firebase Auth email exists', async () => {
      const emptySnap = { empty: true, docs: [] };
      mockLimitFn.mockReturnValueOnce({ get: jest.fn().mockResolvedValue(emptySnap) });

      const fbError = new Error('Email already exists');
      fbError.code = 'auth/email-already-exists';
      mockCreateUser.mockRejectedValue(fbError);

      await expect(
        authService.register('dup@example.com', 'password123')
      ).rejects.toThrow(ConflictError);
    });

    test('sanitizes display name', async () => {
      const emptySnap = { empty: true, docs: [] };
      mockLimitFn.mockReturnValueOnce({ get: jest.fn().mockResolvedValue(emptySnap) });
      mockCreateUser.mockResolvedValue({ uid: 'uid-2' });

      const result = await authService.register('user@example.com', 'password123', '<b>XSS</b>');
      // Name should be sanitized
      expect(result.user.name).not.toContain('<b>');
    });
  });

  describe('login', () => {
    test('logs in with valid credentials', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      const userSnap = {
        empty: false,
        docs: [{
          id: 'user-id-1',
          data: () => ({
            email: 'user@example.com',
            name: 'Test',
            password_hash: passwordHash,
            role: 'user',
            status: 'active',
            balance_cents: 5000,
            tier: 'STANDARD',
            created_at: '2024-01-01T00:00:00Z',
          }),
        }],
      };
      mockLimitFn.mockReturnValueOnce({ get: jest.fn().mockResolvedValue(userSnap) });
      mockUpdate.mockResolvedValue(undefined);

      const result = await authService.login('user@example.com', 'correct-password');

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('user@example.com');
    });

    test('throws InvalidCredentialsError for wrong password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      const userSnap = {
        empty: false,
        docs: [{
          id: 'user-id-1',
          data: () => ({
            email: 'user@example.com',
            password_hash: passwordHash,
            status: 'active',
          }),
        }],
      };
      mockLimitFn.mockReturnValueOnce({ get: jest.fn().mockResolvedValue(userSnap) });

      await expect(
        authService.login('user@example.com', 'wrong-password')
      ).rejects.toThrow(InvalidCredentialsError);
    });

    test('throws InvalidCredentialsError for non-existent email', async () => {
      const emptySnap = { empty: true, docs: [] };
      mockLimitFn.mockReturnValueOnce({ get: jest.fn().mockResolvedValue(emptySnap) });

      await expect(
        authService.login('nobody@example.com', 'password')
      ).rejects.toThrow(InvalidCredentialsError);
    });

    test('throws InvalidCredentialsError for suspended user', async () => {
      const passwordHash = await bcrypt.hash('password', 4);
      const userSnap = {
        empty: false,
        docs: [{
          id: 'user-id-1',
          data: () => ({
            email: 'user@example.com',
            password_hash: passwordHash,
            status: 'suspended',
          }),
        }],
      };
      mockLimitFn.mockReturnValueOnce({ get: jest.fn().mockResolvedValue(userSnap) });

      await expect(
        authService.login('user@example.com', 'password')
      ).rejects.toThrow(InvalidCredentialsError);
    });

    test('throws InvalidCredentialsError for Google-only account (no password_hash)', async () => {
      const userSnap = {
        empty: false,
        docs: [{
          id: 'user-id-1',
          data: () => ({
            email: 'user@example.com',
            password_hash: '',
            status: 'active',
          }),
        }],
      };
      mockLimitFn.mockReturnValueOnce({ get: jest.fn().mockResolvedValue(userSnap) });

      await expect(
        authService.login('user@example.com', 'password')
      ).rejects.toThrow(InvalidCredentialsError);
    });
  });

  describe('googleAuth', () => {
    // googleAuth uses https.get internally. We need to mock the https module.
    // Since auth.service.js requires https at the top, we need to mock it via jest.mock.
    // However, the mock needs to be set up before the module loads, which is tricky.
    // Instead, we test the Firebase Admin verification path by making the https call fail
    // and having verifyIdToken succeed.

    test('authenticates existing user via Firebase Admin verifyIdToken', async () => {
      // Firebase Admin verifyIdToken succeeds (Google tokeninfo will fail naturally since https is real)
      mockVerifyIdToken.mockResolvedValue({
        email: 'google@example.com',
      });

      // Existing user found
      const existingUserSnap = {
        empty: false,
        docs: [{
          id: 'google-user-id',
          data: () => ({
            name: 'Google User',
            email: 'google@example.com',
            role: 'user',
            status: 'active',
            balance_cents: 0,
            tier: 'STANDARD',
            created_at: '2024-01-01T00:00:00Z',
          }),
        }],
      };
      mockLimitFn.mockReturnValueOnce({ get: jest.fn().mockResolvedValue(existingUserSnap) });
      mockUpdate.mockResolvedValue(undefined);

      const result = await authService.googleAuth(
        'valid-google-id-token', 'google@example.com', 'Google User', null
      );

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('google@example.com');
    });

    test('creates new user if not found during Google auth', async () => {
      mockVerifyIdToken.mockResolvedValue({
        email: 'newgoogle@example.com',
      });

      // No existing user
      const emptySnap = { empty: true, docs: [] };
      mockLimitFn.mockReturnValueOnce({ get: jest.fn().mockResolvedValue(emptySnap) });

      // getUserByEmail throws (no existing Firebase user)
      mockGetUserByEmail.mockRejectedValue(new Error('not found'));
      // createUser succeeds
      mockCreateUser.mockResolvedValue({ uid: 'new-google-uid' });
      mockSet.mockResolvedValue(undefined);

      const result = await authService.googleAuth(
        'valid-token', 'newgoogle@example.com', 'New Google User', 'https://photo.url/pic.jpg'
      );

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('newgoogle@example.com');
    });

    test('throws AuthFailedError for suspended Google user', async () => {
      mockVerifyIdToken.mockResolvedValue({
        email: 'suspended@example.com',
      });

      const suspendedSnap = {
        empty: false,
        docs: [{
          id: 'suspended-user-id',
          data: () => ({
            email: 'suspended@example.com',
            status: 'suspended',
          }),
        }],
      };
      mockLimitFn.mockReturnValueOnce({ get: jest.fn().mockResolvedValue(suspendedSnap) });

      const { AuthFailedError } = require('../../../backend/src/utils/errors');
      await expect(
        authService.googleAuth('token', 'suspended@example.com', 'User', null)
      ).rejects.toThrow(AuthFailedError);
    });

    test('throws AuthFailedError when both verification methods fail', async () => {
      // Both Google tokeninfo and Firebase verifyIdToken fail
      mockVerifyIdToken.mockRejectedValue(new Error('verification failed'));

      const { AuthFailedError } = require('../../../backend/src/utils/errors');
      await expect(
        authService.googleAuth('bad-token', 'user@example.com', 'User', null)
      ).rejects.toThrow(AuthFailedError);
    });

    test('uses existing Firebase user if getUserByEmail succeeds', async () => {
      mockVerifyIdToken.mockResolvedValue({
        email: 'existing-firebase@example.com',
      });

      // No Firestore user
      const emptySnap = { empty: true, docs: [] };
      mockLimitFn.mockReturnValueOnce({ get: jest.fn().mockResolvedValue(emptySnap) });

      // getUserByEmail succeeds (existing Firebase Auth user)
      mockGetUserByEmail.mockResolvedValue({ uid: 'existing-firebase-uid' });
      mockSet.mockResolvedValue(undefined);

      const result = await authService.googleAuth(
        'token', 'existing-firebase@example.com', 'User', null
      );

      expect(result.token).toBeDefined();
      expect(mockCreateUser).not.toHaveBeenCalled(); // Should not create new user
    });
  });

  describe('changePassword', () => {
    test('changes password for valid current password', async () => {
      const hash = await bcrypt.hash('oldpass', 4);
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ password_hash: hash }),
      });
      mockUpdate.mockResolvedValue(undefined);
      mockUpdateUser.mockResolvedValue(undefined);

      await expect(
        authService.changePassword('user123', 'oldpass', 'newpass123')
      ).resolves.not.toThrow();
    });

    test('throws NotFoundError for missing user', async () => {
      mockGet.mockResolvedValue({ exists: false });

      await expect(
        authService.changePassword('nonexistent', 'old', 'new')
      ).rejects.toThrow(NotFoundError);
    });

    test('throws InvalidCredentialsError for wrong current password', async () => {
      const hash = await bcrypt.hash('correct', 4);
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ password_hash: hash }),
      });

      await expect(
        authService.changePassword('user123', 'wrong', 'newpass')
      ).rejects.toThrow(InvalidCredentialsError);
    });

    test('throws InvalidCredentialsError for Google-only accounts', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ password_hash: '' }),
      });

      await expect(
        authService.changePassword('user123', 'any', 'newpass')
      ).rejects.toThrow(InvalidCredentialsError);
    });
  });

  describe('getCurrentUser', () => {
    test('returns user profile', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          name: 'Test User',
          email: 'test@example.com',
          balance_cents: 5000,
          tier: 'STANDARD',
          role: 'user',
          photo_url: null,
          auth_provider: 'email',
          created_at: '2024-01-01T00:00:00Z',
        }),
      });

      const result = await authService.getCurrentUser('user123');

      expect(result.id).toBe('user123');
      expect(result.name).toBe('Test User');
      expect(result.email).toBe('test@example.com');
      expect(result.balanceCents).toBe(5000);
      expect(result.tier).toBe('STANDARD');
      expect(result.role).toBe('user');
    });

    test('throws NotFoundError for non-existent user', async () => {
      mockGet.mockResolvedValue({ exists: false });

      await expect(authService.getCurrentUser('nonexistent')).rejects.toThrow(NotFoundError);
    });

    test('defaults balance to 0 and tier to STANDARD when missing', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          name: 'Test',
          email: 'test@example.com',
          created_at: '2024-01-01T00:00:00Z',
        }),
      });

      const result = await authService.getCurrentUser('user123');
      expect(result.balanceCents).toBe(0);
      expect(result.tier).toBe('STANDARD');
      expect(result.role).toBe('user');
    });
  });

  describe('forgotPassword', () => {
    test('silently succeeds for non-existent email (anti-enumeration)', async () => {
      const emptySnap = { empty: true, docs: [] };
      mockLimitFn.mockReturnValueOnce({ get: jest.fn().mockResolvedValue(emptySnap) });

      await expect(authService.forgotPassword('nobody@example.com')).resolves.not.toThrow();
    });

    test('generates reset token for existing email', async () => {
      const userSnap = {
        empty: false,
        docs: [{ id: 'user-id-1', data: () => ({ email: 'user@example.com' }) }],
      };
      mockLimitFn.mockReturnValueOnce({ get: jest.fn().mockResolvedValue(userSnap) });
      mockUpdate.mockResolvedValue(undefined);

      await expect(authService.forgotPassword('user@example.com')).resolves.not.toThrow();

      // Should have updated user with reset token hash
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          reset_token_hash: expect.any(String),
          reset_token_expires_at: expect.any(String),
        })
      );
    });
  });

  describe('resetPassword', () => {
    test('resets password with valid token', async () => {
      const { hashSHA256 } = require('../../../backend/src/utils/crypto');
      const rawToken = 'valid-reset-token';
      const tokenHash = hashSHA256(rawToken);
      const futureDate = new Date(Date.now() + 3600000).toISOString();

      const snap = {
        empty: false,
        docs: [{
          id: 'user-id-1',
          data: () => ({
            reset_token_hash: tokenHash,
            reset_token_expires_at: futureDate,
          }),
        }],
      };
      mockLimitFn.mockReturnValueOnce({ get: jest.fn().mockResolvedValue(snap) });
      mockUpdate.mockResolvedValue(undefined);
      mockUpdateUser.mockResolvedValue(undefined);

      await expect(
        authService.resetPassword(rawToken, 'newPassword123')
      ).resolves.not.toThrow();

      // Should have set reset_token_hash to null (single-use)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          reset_token_hash: null,
          reset_token_expires_at: null,
        })
      );
    });

    test('throws InvalidTokenError for non-existent token', async () => {
      const emptySnap = { empty: true, docs: [] };
      mockLimitFn.mockReturnValueOnce({ get: jest.fn().mockResolvedValue(emptySnap) });

      await expect(
        authService.resetPassword('bogus-token', 'newpass')
      ).rejects.toThrow(InvalidTokenError);
    });

    test('throws InvalidTokenError for expired token', async () => {
      const { hashSHA256 } = require('../../../backend/src/utils/crypto');
      const rawToken = 'expired-token';
      const tokenHash = hashSHA256(rawToken);
      const pastDate = new Date(Date.now() - 3600000).toISOString();

      const snap = {
        empty: false,
        docs: [{
          id: 'user-id-1',
          data: () => ({
            reset_token_hash: tokenHash,
            reset_token_expires_at: pastDate,
          }),
        }],
      };
      mockLimitFn.mockReturnValueOnce({ get: jest.fn().mockResolvedValue(snap) });

      await expect(
        authService.resetPassword(rawToken, 'newpass')
      ).rejects.toThrow(InvalidTokenError);
    });
  });
});
