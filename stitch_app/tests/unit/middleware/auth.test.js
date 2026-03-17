'use strict';

const jwt = require('jsonwebtoken');

// Mock the env config before requiring the auth module
jest.mock('../../../backend/src/config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-key-for-unit-tests',
  },
}));

const { authMiddleware, generateJWT } = require('../../../backend/src/middleware/auth');
const { AuthenticationError, TokenExpiredError } = require('../../../backend/src/utils/errors');

describe('Auth Middleware', () => {
  describe('authMiddleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = { headers: {} };
      res = {};
      next = jest.fn();
    });

    test('calls next() with valid token', () => {
      const token = jwt.sign({ userId: 'user123', role: 'user' }, 'test-secret-key-for-unit-tests');
      req.headers.authorization = `Bearer ${token}`;

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.userId).toBe('user123');
      expect(req.userRole).toBe('user');
    });

    test('extracts admin role', () => {
      const token = jwt.sign({ userId: 'admin1', role: 'admin' }, 'test-secret-key-for-unit-tests');
      req.headers.authorization = `Bearer ${token}`;

      authMiddleware(req, res, next);

      expect(req.userRole).toBe('admin');
    });

    test('defaults to user role if not in token', () => {
      const token = jwt.sign({ userId: 'user123' }, 'test-secret-key-for-unit-tests');
      req.headers.authorization = `Bearer ${token}`;

      authMiddleware(req, res, next);

      expect(req.userRole).toBe('user');
    });

    test('throws AuthenticationError with no auth header', () => {
      expect(() => authMiddleware(req, res, next)).toThrow(AuthenticationError);
    });

    test('throws AuthenticationError with non-Bearer header', () => {
      req.headers.authorization = 'Basic abc123';
      expect(() => authMiddleware(req, res, next)).toThrow(AuthenticationError);
    });

    test('throws AuthenticationError with empty Bearer token', () => {
      req.headers.authorization = 'Bearer ';
      expect(() => authMiddleware(req, res, next)).toThrow(AuthenticationError);
    });

    test('throws AuthenticationError with invalid token', () => {
      req.headers.authorization = 'Bearer invalid-jwt-token';
      expect(() => authMiddleware(req, res, next)).toThrow(AuthenticationError);
    });

    test('throws AuthenticationError with token signed by wrong secret', () => {
      const token = jwt.sign({ userId: 'user123' }, 'wrong-secret');
      req.headers.authorization = `Bearer ${token}`;
      expect(() => authMiddleware(req, res, next)).toThrow(AuthenticationError);
    });

    test('throws TokenExpiredError with expired token', () => {
      const token = jwt.sign(
        { userId: 'user123', role: 'user' },
        'test-secret-key-for-unit-tests',
        { expiresIn: '0s' } // Already expired
      );
      // Small delay to ensure expiry
      req.headers.authorization = `Bearer ${token}`;
      expect(() => authMiddleware(req, res, next)).toThrow(TokenExpiredError);
    });

    test('does not call next() on error', () => {
      try {
        authMiddleware(req, res, next);
      } catch {
        // Expected
      }
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('generateJWT', () => {
    test('generates a valid token', () => {
      const token = generateJWT('user123', 'user');
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    test('token contains correct userId and role', () => {
      const token = generateJWT('user123', 'admin');
      const decoded = jwt.verify(token, 'test-secret-key-for-unit-tests');
      expect(decoded.userId).toBe('user123');
      expect(decoded.role).toBe('admin');
    });

    test('token has expiry', () => {
      const token = generateJWT('user123', 'user');
      const decoded = jwt.verify(token, 'test-secret-key-for-unit-tests');
      expect(decoded.exp).toBeDefined();
      // 24 hours = 86400 seconds
      expect(decoded.exp - decoded.iat).toBe(86400);
    });
  });
});
