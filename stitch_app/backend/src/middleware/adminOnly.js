'use strict';

const { getUserRoleAndStatus } = require('../services/userStatus.service');
const { AdminRequiredError, AccessDeniedError } = require('../utils/errors');

/**
 * Admin role enforcement middleware.
 * Must be placed after authMiddleware (requires req.userId).
 * Re-verifies the user's role and status against Firestore (cached in Redis for 5 min).
 */
async function adminOnly(req, res, next) {
  try {
    const liveData = await getUserRoleAndStatus(req.userId);

    if (liveData) {
      if (liveData.status === 'suspended') {
        throw new AccessDeniedError('Account suspended');
      }
      if (liveData.role !== 'admin') {
        throw new AdminRequiredError('Admin access required');
      }
    } else {
      // Firestore unavailable or user not found -- fall back to JWT claim
      if (req.userRole !== 'admin') {
        throw new AdminRequiredError('Admin access required');
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = adminOnly;
