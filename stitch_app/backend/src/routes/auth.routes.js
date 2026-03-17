'use strict';

const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth');
const { authRateLimit, passwordResetRateLimit } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../validators/auth.validator');

const router = Router();

// Public routes (no auth required)
router.post('/register', authRateLimit, validate(registerSchema), authController.register);
router.post('/login', authRateLimit, validate(loginSchema), authController.login);
router.post('/google', authRateLimit, validate(googleAuthSchema), authController.googleAuth);
router.post('/forgot-password', passwordResetRateLimit, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authRateLimit, validate(resetPasswordSchema), authController.resetPassword);

// Authenticated routes
router.get('/me', authMiddleware, authController.getMe);
router.post('/change-password', authMiddleware, authRateLimit, validate(changePasswordSchema), authController.changePassword);

module.exports = router;
