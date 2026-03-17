'use strict';

const { Router } = require('express');
const convertController = require('../controllers/convert.controller');
const { authMiddleware, checkNotSuspended } = require('../middleware/auth');
const { financialRateLimit } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { convertSchema } = require('../validators/convert.validator');

const router = Router();

// Conversion requires authentication + suspension check + financial rate limit
router.post('/', authMiddleware, checkNotSuspended, financialRateLimit, validate(convertSchema), convertController.convertGiftCard);

module.exports = router;
