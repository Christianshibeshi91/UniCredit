'use strict';

const adminService = require('../services/admin.service');
const auditService = require('../services/audit.service');
const { db, firebaseEnabled } = require('../config/firebase');

/**
 * Admin Controller
 * Handles admin dashboard operations.
 */

async function getStats(req, res, next) {
  try {
    const stats = await adminService.getStats();
    res.json({ data: stats });
  } catch (err) {
    next(err);
  }
}

async function getUsers(req, res, next) {
  try {
    const { cursor, limit, search, status } = req.query;
    const result = await adminService.getUsers({
      cursor: cursor || null,
      limit: limit ? parseInt(limit, 10) : 50,
      search: search || null,
      status: status || null,
    });
    res.json({ data: result.data, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

async function getUserDetail(req, res, next) {
  try {
    const { id } = req.params;
    const detail = await adminService.getUserDetail(id);
    res.json({ data: detail });
  } catch (err) {
    next(err);
  }
}

async function suspendUser(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Get admin email for audit log
    let adminEmail = 'admin';
    if (firebaseEnabled) {
      const adminDoc = await db.collection('users').doc(req.userId).get();
      if (adminDoc.exists) adminEmail = adminDoc.data().email;
    }

    await adminService.suspendUser(
      req.userId,
      adminEmail,
      id,
      reason,
      req.ip,
      req.requestId,
    );

    res.json({ data: { success: true, message: 'User suspended' } });
  } catch (err) {
    next(err);
  }
}

async function reinstateUser(req, res, next) {
  try {
    const { id } = req.params;

    let adminEmail = 'admin';
    if (firebaseEnabled) {
      const adminDoc = await db.collection('users').doc(req.userId).get();
      if (adminDoc.exists) adminEmail = adminDoc.data().email;
    }

    await adminService.reinstateUser(
      req.userId,
      adminEmail,
      id,
      req.ip,
      req.requestId,
    );

    res.json({ data: { success: true, message: 'User reinstated' } });
  } catch (err) {
    next(err);
  }
}

async function getFraudFlags(req, res, next) {
  try {
    const { cursor, limit, status } = req.query;
    const result = await adminService.getFraudFlags({
      cursor: cursor || null,
      limit: limit ? parseInt(limit, 10) : 20,
      status: status || 'open',
    });
    res.json({ data: result.data, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

async function resolveFraudFlag(req, res, next) {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    let adminEmail = 'admin';
    if (firebaseEnabled) {
      const adminDoc = await db.collection('users').doc(req.userId).get();
      if (adminDoc.exists) adminEmail = adminDoc.data().email;
    }

    await adminService.resolveFraudFlag(
      req.userId,
      adminEmail,
      id,
      notes,
      req.ip,
      req.requestId,
    );

    res.json({ data: { success: true, message: 'Fraud flag resolved' } });
  } catch (err) {
    next(err);
  }
}

async function blockFraudFlag(req, res, next) {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    let adminEmail = 'admin';
    if (firebaseEnabled) {
      const adminDoc = await db.collection('users').doc(req.userId).get();
      if (adminDoc.exists) adminEmail = adminDoc.data().email;
    }

    await adminService.blockFraudFlag(
      req.userId,
      adminEmail,
      id,
      notes,
      req.ip,
      req.requestId,
    );

    res.json({ data: { success: true, message: 'User blocked and fraud flag resolved' } });
  } catch (err) {
    next(err);
  }
}

async function updateSetting(req, res, next) {
  try {
    const { key } = req.params;
    const { value } = req.body;

    let adminEmail = 'admin';
    if (firebaseEnabled) {
      const adminDoc = await db.collection('users').doc(req.userId).get();
      if (adminDoc.exists) adminEmail = adminDoc.data().email;
    }

    const result = await adminService.updateSetting(
      req.userId,
      adminEmail,
      key,
      value,
      req.ip,
      req.requestId,
    );

    res.json({ data: { success: true, ...result } });
  } catch (err) {
    next(err);
  }
}

async function getAuditLog(req, res, next) {
  try {
    const { cursor, limit, actorId, targetType } = req.query;
    const result = await auditService.getAuditLog({
      cursor: cursor || null,
      limit: limit ? parseInt(limit, 10) : 50,
      actorId: actorId || null,
      targetType: targetType || null,
    });
    res.json({ data: result.data, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStats,
  getUsers,
  getUserDetail,
  suspendUser,
  reinstateUser,
  getFraudFlags,
  resolveFraudFlag,
  blockFraudFlag,
  updateSetting,
  getAuditLog,
};
