'use strict';

const { db, firebaseEnabled } = require('../config/firebase');
const { toApiResponse } = require('../models/user.model');
const { sanitizeString } = require('../utils/sanitize');
const { NotFoundError, AccessDeniedError } = require('../utils/errors');

/**
 * User Controller
 * Handles user profile read and update operations.
 */

async function getUser(req, res, next) {
  try {
    const { id } = req.params;

    // IDOR protection: users can only access their own profile; admins can access any
    if (id !== req.userId && req.userRole !== 'admin') {
      throw new AccessDeniedError('Access denied');
    }

    if (!firebaseEnabled) {
      throw new NotFoundError('User not found');
    }

    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) {
      throw new NotFoundError('User not found');
    }

    res.json({ data: toApiResponse(id, userDoc.data()) });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { id } = req.params;

    // IDOR protection
    if (id !== req.userId && req.userRole !== 'admin') {
      throw new AccessDeniedError('Access denied');
    }

    if (!firebaseEnabled) {
      throw new NotFoundError('User not found');
    }

    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) {
      throw new NotFoundError('User not found');
    }

    const updates = { updated_at: new Date().toISOString() };

    if (req.body.name !== undefined) {
      updates.name = sanitizeString(req.body.name);
    }
    if (req.body.email !== undefined) {
      updates.email = req.body.email; // Email format validated by Joi
    }

    await db.collection('users').doc(id).update(updates);

    const updatedDoc = await db.collection('users').doc(id).get();
    res.json({ data: toApiResponse(id, updatedDoc.data()) });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUser,
  updateUser,
};
