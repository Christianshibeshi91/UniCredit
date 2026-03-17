'use strict';

const { Router } = require('express');
const stripeController = require('../controllers/stripe.controller');
const { authMiddleware, checkNotSuspended } = require('../middleware/auth');
const { financialRateLimit, generalRateLimit } = require('../middleware/rateLimiter');

const router = Router();

// Authenticated routes (suspension check on financial endpoint)
router.get('/prices', authMiddleware, generalRateLimit, stripeController.getPrices);
router.post('/create-checkout-session', authMiddleware, checkNotSuspended, financialRateLimit, stripeController.createCheckoutSession);

// Public redirect pages (Stripe redirect targets)
router.get('/success', stripeController.handleSuccess);
router.get('/cancel', stripeController.handleCancel);

// Webhook (public, verified by signature -- raw body parsed separately in app.js)
router.post('/webhook', stripeController.handleWebhook);

module.exports = router;
