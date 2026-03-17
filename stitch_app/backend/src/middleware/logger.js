/**
 * Structured request/response logger using pino-style JSON output.
 *
 * In production: JSON logs for aggregation (ELK, Datadog, etc.)
 * In development: Human-readable colored output.
 *
 * Sensitive fields (Authorization header, cookies) are never logged.
 */

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-csrf-token',
]);

/**
 * Sanitize headers — strip sensitive values.
 */
function sanitizeHeaders(headers) {
  const safe = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
      safe[key] = '[REDACTED]';
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

/**
 * Generate a short request ID.
 */
function generateRequestId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Create the logger middleware.
 */
function createLoggerMiddleware() {
  const env = process.env.NODE_ENV || 'development';
  const isDev = env !== 'production';

  return function loggerMiddleware(req, res, next) {
    const requestId = generateRequestId();
    const startTime = Date.now();

    // Attach request ID to request and response
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    // Log on response finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logEntry = {
        level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
        timestamp: new Date().toISOString(),
        requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.headers['user-agent'] || '-',
        ip: req.ip || req.connection?.remoteAddress || '-',
        contentLength: res.getHeader('content-length') || '-',
      };

      if (isDev) {
        // Human-readable dev output
        const statusColor =
          res.statusCode >= 500 ? '\x1b[31m' :
          res.statusCode >= 400 ? '\x1b[33m' :
          res.statusCode >= 300 ? '\x1b[36m' :
          '\x1b[32m';
        const reset = '\x1b[0m';

        console.log(
          `${statusColor}${req.method}${reset} ${req.originalUrl || req.url} ` +
          `${statusColor}${res.statusCode}${reset} ${duration}ms [${requestId}]`
        );
      } else {
        // Structured JSON for production log aggregation
        console.log(JSON.stringify(logEntry));
      }
    });

    // Log errors without leaking internals
    res.on('error', (err) => {
      console.error(JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        requestId,
        message: 'Response stream error',
        error: err.message,
      }));
    });

    next();
  };
}

module.exports = { createLoggerMiddleware, sanitizeHeaders };
