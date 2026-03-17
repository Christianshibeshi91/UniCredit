'use strict';

const { Router } = require('express');
const userController = require('../controllers/user.controller');
const { authMiddleware } = require('../middleware/auth');
const { generalRateLimit } = require('../middleware/rateLimiter');

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

router.get('/:id', generalRateLimit, userController.getUser);
router.put('/:id', generalRateLimit, userController.updateUser);

module.exports = router;
