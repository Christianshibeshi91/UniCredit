'use strict';

const { Router } = require('express');
const adminController = require('../controllers/admin.controller');
const { authMiddleware } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const { adminRateLimit } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const {
  adminUsersQuery,
  suspendUserSchema,
  resolveFraudFlagSchema,
  blockFraudFlagSchema,
  updateSettingSchema,
  fraudFlagsQuery,
  auditLogQuery,
} = require('../validators/admin.validator');

const router = Router();

// All admin routes require authentication + admin role
router.use(authMiddleware);
router.use(adminOnly);
router.use(adminRateLimit);

// Stats
router.get('/stats', adminController.getStats);

// User management
router.get('/users', validate(adminUsersQuery), adminController.getUsers);
router.get('/users/:id', adminController.getUserDetail);
router.put('/users/:id/suspend', validate(suspendUserSchema), adminController.suspendUser);
router.put('/users/:id/reinstate', adminController.reinstateUser);

// Fraud flags
router.get('/fraud-flags', validate(fraudFlagsQuery), adminController.getFraudFlags);
router.put('/fraud-flags/:id/resolve', validate(resolveFraudFlagSchema), adminController.resolveFraudFlag);
router.put('/fraud-flags/:id/block', validate(blockFraudFlagSchema), adminController.blockFraudFlag);

// Settings
router.put('/settings/:key', validate(updateSettingSchema), adminController.updateSetting);

// Audit log
router.get('/audit-log', validate(auditLogQuery), adminController.getAuditLog);

module.exports = router;
