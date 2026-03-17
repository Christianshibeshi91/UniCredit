'use strict';

const { Router } = require('express');
const walletController = require('../controllers/wallet.controller');
const { authMiddleware } = require('../middleware/auth');
const { generalRateLimit } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { transactionsQuerySchema } = require('../validators/wallet.validator');

const router = Router();

// All wallet routes require authentication
router.use(authMiddleware);

router.get('/balance', generalRateLimit, walletController.getBalance);
router.get('/transactions', generalRateLimit, validate(transactionsQuerySchema), walletController.getTransactions);

module.exports = router;
