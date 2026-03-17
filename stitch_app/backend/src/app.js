'use strict';

const express = require('express');
const helmet = require('helmet');
const { env } = require('./config/env');
const { createCorsMiddleware } = require('./middleware/cors');
const { createLoggerMiddleware } = require('./middleware/logger');
const requestIdMiddleware = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const walletRoutes = require('./routes/wallet.routes');
const convertRoutes = require('./routes/convert.routes');
const giftRoutes = require('./routes/gift.routes');
const stripeRoutes = require('./routes/stripe.routes');
const adminRoutes = require('./routes/admin.routes');
const uploadRoutes = require('./routes/upload.routes');

const app = express();

// ─── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: env.isProduction ? undefined : false,
}));

// ─── CORS ───────────────────────────────────────────────────────────────────────
app.use(createCorsMiddleware());

// ─── Request ID ─────────────────────────────────────────────────────────────────
app.use(requestIdMiddleware);

// ─── Request logging ────────────────────────────────────────────────────────────
app.use(createLoggerMiddleware());

// ─── Stripe webhook raw body (must be before express.json) ──────────────────────
app.use('/api/v1/stripe/webhook', express.raw({ type: 'application/json' }));

// ─── JSON body parser ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ─── Routes ─────────────────────────────────────────────────────────────────────

// Health checks (no /api/v1 prefix)
app.use('/', healthRoutes);

// API v1 routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/convert', convertRoutes);
app.use('/api/v1/gifts', giftRoutes);
app.use('/api/v1/stripe', stripeRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/uploads', uploadRoutes);

// ─── 404 handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      requestId: req.requestId,
    },
  });
});

// ─── Global error handler (must be last) ────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
