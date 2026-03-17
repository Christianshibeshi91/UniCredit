'use strict';

/**
 * Base application error class.
 * All custom errors extend this so the global error handler can distinguish
 * operational errors from unexpected programmer errors.
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message safe to return to clients.
   * @param {number} statusCode - HTTP status code.
   * @param {string} code - Machine-readable error code for client-side handling.
   */
  constructor(message, statusCode, code) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_REQUIRED');
  }
}

class TokenExpiredError extends AppError {
  constructor(message = 'Invalid or expired token') {
    super(message, 401, 'TOKEN_EXPIRED');
  }
}

class InvalidCredentialsError extends AppError {
  constructor(message = 'Invalid email or password') {
    super(message, 401, 'INVALID_CREDENTIALS');
  }
}

class InvalidTokenError extends AppError {
  constructor(message = 'Reset token is invalid or has expired') {
    super(message, 400, 'INVALID_TOKEN');
  }
}

class AccessDeniedError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'ACCESS_DENIED');
  }
}

class AdminRequiredError extends AppError {
  constructor(message = 'Admin access required') {
    super(message, 403, 'ADMIN_REQUIRED');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

class InsufficientBalanceError extends AppError {
  constructor(message = 'Insufficient balance') {
    super(message, 400, 'INSUFFICIENT_BALANCE');
  }
}

class AlreadyClaimedError extends AppError {
  constructor(message = 'This gift has already been claimed') {
    super(message, 400, 'ALREADY_CLAIMED');
  }
}

class GiftExpiredError extends AppError {
  constructor(message = 'This gift has expired') {
    super(message, 400, 'GIFT_EXPIRED');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please try again later.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

class WebhookVerificationError extends AppError {
  constructor(message = 'Webhook verification failed') {
    super(message, 400, 'WEBHOOK_VERIFICATION_FAILED');
  }
}

class AuthFailedError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTH_FAILED');
  }
}

module.exports = {
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
};
