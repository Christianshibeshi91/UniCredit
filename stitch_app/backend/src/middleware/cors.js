const cors = require('cors');

/**
 * CORS middleware configured from ALLOWED_ORIGINS environment variable.
 *
 * ALLOWED_ORIGINS must be a comma-separated list of allowed origins.
 * If not set in production, the server will crash at startup (fail-secure).
 * In development, defaults to localhost origins.
 */
function createCorsMiddleware() {
  const env = process.env.NODE_ENV || 'development';
  const originsEnv = process.env.ALLOWED_ORIGINS;

  // Parse allowed origins
  let allowedOrigins;
  if (originsEnv) {
    allowedOrigins = originsEnv.split(',').map((o) => o.trim()).filter(Boolean);
  } else if (env === 'production') {
    // Auto-detect Vercel deployment URLs
    allowedOrigins = [];
    if (process.env.VERCEL_URL) {
      allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
    }
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      allowedOrigins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
    }
    if (allowedOrigins.length === 0) {
      console.warn('[CORS] No ALLOWED_ORIGINS or VERCEL_URL set in production');
    }
  } else {
    allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:8080',
    ];
  }

  const corsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, server-to-server, health checks)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Request-Id'],
    maxAge: 86400, // Cache preflight for 24 hours
  };

  return cors(corsOptions);
}

module.exports = { createCorsMiddleware };
