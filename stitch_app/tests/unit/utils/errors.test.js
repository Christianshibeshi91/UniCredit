'use strict';

const {
  AppError,
  ValidationError,
  AuthenticationError,
  TokenExpiredError,
  InvalidCredentialsError,
  InvalidTokenError,
  AccessDeniedError,
  AdminRequiredError,
  NotFoundError,
  ConflictError,
  InsufficientBalanceError,
  AlreadyClaimedError,
  GiftExpiredError,
  RateLimitError,
  ServiceUnavailableError,
  WebhookVerificationError,
  AuthFailedError,
} = require('../../../backend/src/utils/errors');

describe('Error Classes', () => {
  describe('AppError (base)', () => {
    test('has correct properties', () => {
      const err = new AppError('test message', 500, 'TEST_CODE');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AppError);
      expect(err.message).toBe('test message');
      expect(err.statusCode).toBe(500);
      expect(err.code).toBe('TEST_CODE');
      expect(err.isOperational).toBe(true);
      expect(err.name).toBe('AppError');
      expect(err.stack).toBeDefined();
    });
  });

  const errorClasses = [
    { Class: ValidationError, status: 400, code: 'VALIDATION_ERROR', defaultMsg: 'Validation failed' },
    { Class: AuthenticationError, status: 401, code: 'AUTHENTICATION_REQUIRED', defaultMsg: 'Authentication required' },
    { Class: TokenExpiredError, status: 401, code: 'TOKEN_EXPIRED', defaultMsg: 'Invalid or expired token' },
    { Class: InvalidCredentialsError, status: 401, code: 'INVALID_CREDENTIALS', defaultMsg: 'Invalid email or password' },
    { Class: InvalidTokenError, status: 400, code: 'INVALID_TOKEN', defaultMsg: 'Reset token is invalid or has expired' },
    { Class: AccessDeniedError, status: 403, code: 'ACCESS_DENIED', defaultMsg: 'Access denied' },
    { Class: AdminRequiredError, status: 403, code: 'ADMIN_REQUIRED', defaultMsg: 'Admin access required' },
    { Class: NotFoundError, status: 404, code: 'NOT_FOUND', defaultMsg: 'Resource not found' },
    { Class: ConflictError, status: 409, code: 'CONFLICT', defaultMsg: 'Resource already exists' },
    { Class: InsufficientBalanceError, status: 400, code: 'INSUFFICIENT_BALANCE', defaultMsg: 'Insufficient balance' },
    { Class: AlreadyClaimedError, status: 400, code: 'ALREADY_CLAIMED', defaultMsg: 'This gift has already been claimed' },
    { Class: GiftExpiredError, status: 400, code: 'GIFT_EXPIRED', defaultMsg: 'This gift has expired' },
    { Class: RateLimitError, status: 429, code: 'RATE_LIMIT_EXCEEDED', defaultMsg: 'Too many requests. Please try again later.' },
    { Class: ServiceUnavailableError, status: 503, code: 'SERVICE_UNAVAILABLE', defaultMsg: 'Service unavailable' },
    { Class: WebhookVerificationError, status: 400, code: 'WEBHOOK_VERIFICATION_FAILED', defaultMsg: 'Webhook verification failed' },
    { Class: AuthFailedError, status: 401, code: 'AUTH_FAILED', defaultMsg: 'Authentication failed' },
  ];

  describe.each(errorClasses)(
    '$Class.name',
    ({ Class, status, code, defaultMsg }) => {
      test('extends AppError and Error', () => {
        const err = new Class();
        expect(err).toBeInstanceOf(AppError);
        expect(err).toBeInstanceOf(Error);
      });

      test('has correct default message', () => {
        const err = new Class();
        expect(err.message).toBe(defaultMsg);
      });

      test('has correct status code', () => {
        const err = new Class();
        expect(err.statusCode).toBe(status);
      });

      test('has correct error code', () => {
        const err = new Class();
        expect(err.code).toBe(code);
      });

      test('is operational', () => {
        const err = new Class();
        expect(err.isOperational).toBe(true);
      });

      test('accepts custom message', () => {
        const err = new Class('custom msg');
        expect(err.message).toBe('custom msg');
        expect(err.statusCode).toBe(status);
        expect(err.code).toBe(code);
      });

      test('has stack trace', () => {
        const err = new Class();
        expect(err.stack).toBeDefined();
        expect(err.stack).toContain(Class.name);
      });

      test('has correct name', () => {
        const err = new Class();
        expect(err.name).toBe(Class.name);
      });
    }
  );
});
