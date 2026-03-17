'use strict';

const errorHandler = require('../../../backend/src/middleware/errorHandler');
const {
  AppError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  AccessDeniedError,
  InsufficientBalanceError,
  RateLimitError,
  ServiceUnavailableError,
} = require('../../../backend/src/utils/errors');

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      requestId: 'req-123',
      method: 'POST',
      originalUrl: '/api/v1/test',
      userId: 'user456',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    // Suppress console output during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('handles ValidationError (400)', () => {
    const err = new ValidationError('Name is required');

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Name is required',
        requestId: 'req-123',
      },
    });
  });

  test('handles AuthenticationError (401)', () => {
    const err = new AuthenticationError();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
        requestId: 'req-123',
      },
    });
  });

  test('handles NotFoundError (404)', () => {
    const err = new NotFoundError('User not found');

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'NOT_FOUND',
        message: 'User not found',
        requestId: 'req-123',
      },
    });
  });

  test('handles AccessDeniedError (403)', () => {
    const err = new AccessDeniedError();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('handles InsufficientBalanceError (400)', () => {
    const err = new InsufficientBalanceError();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        code: 'INSUFFICIENT_BALANCE',
      }),
    }));
  });

  test('handles RateLimitError (429)', () => {
    const err = new RateLimitError();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
  });

  test('handles ServiceUnavailableError (503)', () => {
    const err = new ServiceUnavailableError();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
  });

  test('handles non-operational errors as 500 with generic message', () => {
    const err = new Error('database connection failed');

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again later.',
        requestId: 'req-123',
      },
    });
  });

  test('never exposes internal error message to client', () => {
    const err = new Error('SELECT * FROM users WHERE password = "leaked"');

    errorHandler(err, req, res, next);

    const response = res.json.mock.calls[0][0];
    expect(response.error.message).not.toContain('SELECT');
    expect(response.error.message).not.toContain('leaked');
    expect(response.error.message).toBe('An unexpected error occurred. Please try again later.');
  });

  test('never exposes stack trace to client', () => {
    const err = new Error('internal error');

    errorHandler(err, req, res, next);

    const response = res.json.mock.calls[0][0];
    expect(response.error.stack).toBeUndefined();
    expect(JSON.stringify(response)).not.toContain('at ');
  });

  test('logs stack trace for non-operational errors', () => {
    const err = new Error('internal error');

    errorHandler(err, req, res, next);

    expect(console.error).toHaveBeenCalledWith(
      'Unhandled error:',
      expect.objectContaining({
        stack: expect.any(String),
      })
    );
  });

  test('logs warning for client errors', () => {
    const err = new ValidationError('bad input');

    errorHandler(err, req, res, next);

    expect(console.warn).toHaveBeenCalledWith(
      'Client error:',
      expect.objectContaining({
        requestId: 'req-123',
        statusCode: 400,
      })
    );
  });

  test('uses "unknown" requestId when not set', () => {
    delete req.requestId;
    const err = new NotFoundError();

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          requestId: 'unknown',
        }),
      })
    );
  });

  test('handles error with custom statusCode', () => {
    const err = new AppError('Custom error', 418, 'TEAPOT');

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'TEAPOT',
        message: 'Custom error',
        requestId: 'req-123',
      },
    });
  });
});
