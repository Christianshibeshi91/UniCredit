'use strict';

const { Router } = require('express');
const { firebaseEnabled } = require('../config/firebase');
const { isStripeEnabled } = require('../config/stripe');
const { isRedisEnabled, getRedisClient } = require('../config/redis');

const router = Router();

// GET /health -- basic health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '3.0.0',
    firebase: firebaseEnabled,
    redis: isRedisEnabled(),
    stripe: isStripeEnabled(),
    timestamp: new Date().toISOString(),
  });
});

// GET /health/ready -- readiness probe (503 if critical dependencies are down)
router.get('/health/ready', async (req, res) => {
  const issues = [];

  if (!firebaseEnabled) {
    issues.push('firebase: not connected');
  }

  if (isRedisEnabled()) {
    try {
      const redis = getRedisClient();
      await redis.ping();
    } catch {
      issues.push('redis: connection refused');
    }
  } else if (process.env.NODE_ENV === 'production') {
    issues.push('redis: not configured');
  }

  if (issues.length > 0) {
    return res.status(503).json({ ready: false, issues });
  }

  res.json({ ready: true });
});

// GET /health/live -- liveness probe (always 200 if process is running)
router.get('/health/live', (req, res) => {
  res.json({ alive: true });
});

module.exports = router;
