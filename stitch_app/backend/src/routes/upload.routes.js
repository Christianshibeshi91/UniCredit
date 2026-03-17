'use strict';

const { Router } = require('express');
const uploadController = require('../controllers/upload.controller');
const { authMiddleware } = require('../middleware/auth');
const { generalRateLimit } = require('../middleware/rateLimiter');

const router = Router();

// All upload routes require authentication
router.use(authMiddleware);

router.post('/signed-url', generalRateLimit, uploadController.generateSignedUrl);

module.exports = router;
