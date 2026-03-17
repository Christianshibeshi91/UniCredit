'use strict';

const { Router } = require('express');
const giftController = require('../controllers/gift.controller');
const { authMiddleware, checkNotSuspended } = require('../middleware/auth');
const { financialRateLimit, generalRateLimit } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { sendGiftSchema, updateGiftMediaSchema } = require('../validators/gift.validator');

const router = Router();

// Public: preview a gift (GET claim token)
router.get('/claim/:token', generalRateLimit, giftController.previewGift);

// Authenticated: claim a gift (POST claim token)
router.post('/claim/:token', authMiddleware, financialRateLimit, giftController.claimGift);

// Authenticated: send a gift (suspension check on financial endpoint)
router.post('/send', authMiddleware, checkNotSuspended, financialRateLimit, validate(sendGiftSchema), giftController.sendGift);

// Authenticated: get gift details
router.get('/:id', authMiddleware, generalRateLimit, giftController.getGift);

// Authenticated: attach media to gift
router.patch('/:id/media', authMiddleware, generalRateLimit, validate(updateGiftMediaSchema), giftController.updateMedia);

module.exports = router;
