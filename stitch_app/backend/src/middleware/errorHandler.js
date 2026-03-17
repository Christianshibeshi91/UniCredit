'use strict';

const { AppError } = require('../utils/errors');

/**
 * Global error handler middleware.
 * Catches all errors thrown by routes/middleware and returns a standardized response.
 * Stack traces and internal details are NEVER returned to the client.
 * They are logged server-side only.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  // Determine if this is an operational error we anticipated
  const isOperational = err instanceof AppError;

  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = isOperational
    ? err.message
    : 'An unexpected error occurred. Please try again later.';

  // Log the full error server-side
  const logPayload = {
    requestId: req.requestId || 'unknown',
    method: req.method,
    path: req.originalUrl,
    statusCode,
    code,
    message: err.message,
    userId: req.userId || undefined,
  };

  if (!isOperational) {
    // Unexpected errors get full stack trace in logs
    logPayload.stack = err.stack;
    console.error('Unhandled error:', logPayload);
  } else if (statusCode >= 500) {
    console.error('Server error:', logPayload);
  } else {
    console.warn('Client error:', logPayload);
  }

  // Return standardized error response
  res.status(statusCode).json({
    error: {
      code,
      message,
      requestId: req.requestId || 'unknown',
    },
  });
}

module.exports = errorHandler;
