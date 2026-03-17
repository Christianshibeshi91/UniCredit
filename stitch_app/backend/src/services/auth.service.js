'use strict';

const bcrypt = require('bcryptjs');
const https = require('https');
const { db, firebaseEnabled, admin } = require('../config/firebase');
const { env } = require('../config/env');
const { generateJWT } = require('../middleware/auth');
const { createUserDocument, toAuthResponse } = require('../models/user.model');
const { sanitizeString } = require('../utils/sanitize');
const { generateToken, hashSHA256 } = require('../utils/crypto');
const {
  ConflictError,
  InvalidCredentialsError,
  NotFoundError,
  InvalidTokenError,
  AuthFailedError,
} = require('../utils/errors');
const notificationService = require('./notification.service');

const BCRYPT_ROUNDS = 12;

/**
 * Auth Service
 * Handles registration, login, Google OAuth, password change, and password reset.
 */

/**
 * Register a new user with email and password.
 * @param {string} email
 * @param {string} password
 * @param {string} [name]
 * @returns {Object} { token, user }
 */
async function register(email, password, name) {
  const displayName = sanitizeString(name || email.split('@')[0]);
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  if (firebaseEnabled) {
    // Check for existing email
    const existing = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!existing.empty) {
      throw new ConflictError('Email already registered');
    }

    // Create Firebase Auth user
    let userId;
    try {
      const authUser = await admin.auth().createUser({
        email,
        password,
        displayName,
      });
      userId = authUser.uid;
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        throw new ConflictError('Email already registered');
      }
      throw err;
    }

    // Create Firestore user document
    const userDoc = createUserDocument({
      name: displayName,
      email,
      passwordHash,
      authProvider: 'email',
    });

    await db.collection('users').doc(userId).set(userDoc);

    const token = generateJWT(userId, 'user');
    const user = toAuthResponse(userId, userDoc);

    return { token, user };
  }

  // In-memory fallback (development only)
  const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const userDoc = createUserDocument({ name: displayName, email, passwordHash });
  const token = generateJWT(userId, 'user');
  const user = toAuthResponse(userId, userDoc);

  return { token, user };
}

/**
 * Log in with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Object} { token, user }
 */
async function login(email, password) {
  let userId, userData;

  if (firebaseEnabled) {
    const snap = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (snap.empty) {
      throw new InvalidCredentialsError('Invalid email or password');
    }

    const doc = snap.docs[0];
    userId = doc.id;
    userData = doc.data();
  } else {
    throw new InvalidCredentialsError('Invalid email or password');
  }

  // Check for suspended users
  if (userData.status === 'suspended') {
    throw new InvalidCredentialsError('Account is suspended. Contact support.');
  }

  // Verify password
  if (!userData.password_hash) {
    throw new InvalidCredentialsError('Invalid email or password');
  }

  const validPassword = await bcrypt.compare(password, userData.password_hash);
  if (!validPassword) {
    throw new InvalidCredentialsError('Invalid email or password');
  }

  // Update last login
  if (firebaseEnabled) {
    await db.collection('users').doc(userId).update({
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  const token = generateJWT(userId, userData.role || 'user');
  const user = toAuthResponse(userId, userData);

  return { token, user };
}

/**
 * Authenticate or register with Google OAuth.
 * @param {string} idToken - Google ID token.
 * @param {string} email - User's email from Google.
 * @param {string} [displayName] - Display name.
 * @param {string} [photoUrl] - Profile photo URL.
 * @returns {Object} { token, user }
 */
async function googleAuth(idToken, email, displayName, photoUrl) {
  // Verify Google ID token
  let verified = false;

  // Method 1: Google tokeninfo endpoint
  try {
    const verifyResult = await new Promise((resolve, reject) => {
      https.get(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
        (resp) => {
          let data = '';
          resp.on('data', (chunk) => { data += chunk; });
          resp.on('end', () => {
            try { resolve(JSON.parse(data)); }
            catch { reject(new Error('Invalid response')); }
          });
        }
      ).on('error', reject);
    });

    if (verifyResult.email && verifyResult.email.toLowerCase() === email.toLowerCase()) {
      verified = true;
    }
  } catch {
    // Fall through to Firebase verification
  }

  // Method 2: Firebase Admin SDK
  if (!verified && firebaseEnabled && admin) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      if (decodedToken.email && decodedToken.email.toLowerCase() === email.toLowerCase()) {
        verified = true;
      }
    } catch {
      // Verification failed
    }
  }

  if (!verified) {
    throw new AuthFailedError('Google authentication failed');
  }

  // Check if user exists
  let userId, userData;

  if (firebaseEnabled) {
    const snap = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!snap.empty) {
      // Existing user
      const doc = snap.docs[0];
      userId = doc.id;
      userData = doc.data();

      // Check for suspended users
      if (userData.status === 'suspended') {
        throw new AuthFailedError('Account is suspended. Contact support.');
      }

      // Update last login
      await db.collection('users').doc(userId).update({
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } else {
      // New user
      const safeName = sanitizeString(displayName || email.split('@')[0]);

      try {
        const authUser = await admin.auth().getUserByEmail(email);
        userId = authUser.uid;
      } catch {
        const authUser = await admin.auth().createUser({
          email,
          displayName: safeName,
        });
        userId = authUser.uid;
      }

      userData = createUserDocument({
        name: safeName,
        email,
        passwordHash: '',
        authProvider: 'google',
        photoUrl: photoUrl || null,
      });

      await db.collection('users').doc(userId).set(userData);
    }
  } else {
    throw new AuthFailedError('Google authentication not available without Firebase');
  }

  const token = generateJWT(userId, userData.role || 'user');
  const user = toAuthResponse(userId, userData);

  return { token, user };
}

/**
 * Change a user's password.
 * @param {string} userId
 * @param {string} currentPassword
 * @param {string} newPassword
 */
async function changePassword(userId, currentPassword, newPassword) {
  if (!firebaseEnabled) {
    throw new NotFoundError('User not found');
  }

  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new NotFoundError('User not found');
  }

  const userData = userDoc.data();

  if (!userData.password_hash) {
    throw new InvalidCredentialsError('Cannot change password for Google-authenticated accounts');
  }

  const validPassword = await bcrypt.compare(currentPassword, userData.password_hash);
  if (!validPassword) {
    throw new InvalidCredentialsError('Current password is incorrect');
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await db.collection('users').doc(userId).update({
    password_hash: newHash,
    updated_at: new Date().toISOString(),
  });

  // Update Firebase Auth password
  try {
    await admin.auth().updateUser(userId, { password: newPassword });
  } catch {
    // Non-critical: Firestore password hash is the source of truth
  }
}

/**
 * Request a password reset email.
 * Always returns success to prevent email enumeration.
 * @param {string} email
 */
async function forgotPassword(email) {
  if (!firebaseEnabled) return;

  const snap = await db.collection('users')
    .where('email', '==', email)
    .limit(1)
    .get();

  if (snap.empty) {
    // Silently succeed to prevent email enumeration
    return;
  }

  const doc = snap.docs[0];
  const userId = doc.id;

  // Generate reset token
  const resetToken = generateToken();
  const resetTokenHash = hashSHA256(resetToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  await db.collection('users').doc(userId).update({
    reset_token_hash: resetTokenHash,
    reset_token_expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });

  // Send reset email
  await notificationService.sendPasswordResetEmail(email, resetToken);
}

/**
 * Reset password using a token from the reset email.
 * @param {string} token - Plain-text reset token.
 * @param {string} newPassword
 */
async function resetPassword(token, newPassword) {
  if (!firebaseEnabled) {
    throw new InvalidTokenError('Reset token is invalid or has expired');
  }

  const tokenHash = hashSHA256(token);

  // Find user with this reset token
  const snap = await db.collection('users')
    .where('reset_token_hash', '==', tokenHash)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new InvalidTokenError('Reset token is invalid or has expired');
  }

  const doc = snap.docs[0];
  const userId = doc.id;
  const userData = doc.data();

  // Check expiry
  if (!userData.reset_token_expires_at || new Date(userData.reset_token_expires_at) < new Date()) {
    throw new InvalidTokenError('Reset token is invalid or has expired');
  }

  // Hash new password
  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // Update password and invalidate token (single-use)
  await db.collection('users').doc(userId).update({
    password_hash: newHash,
    reset_token_hash: null,
    reset_token_expires_at: null,
    updated_at: new Date().toISOString(),
  });

  // Update Firebase Auth
  try {
    await admin.auth().updateUser(userId, { password: newPassword });
  } catch {
    // Non-critical
  }
}

/**
 * Get current user profile.
 * @param {string} userId
 * @returns {Object} User profile data.
 */
async function getCurrentUser(userId) {
  if (!firebaseEnabled) {
    throw new NotFoundError('User not found');
  }

  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new NotFoundError('User not found');
  }

  const data = userDoc.data();
  return {
    id: userId,
    name: data.name,
    email: data.email,
    balanceCents: data.balance_cents || 0,
    tier: data.tier || 'STANDARD',
    role: data.role || 'user',
    photoUrl: data.photo_url || null,
    authProvider: data.auth_provider || 'email',
    createdAt: data.created_at,
  };
}

module.exports = {
  register,
  login,
  googleAuth,
  changePassword,
  forgotPassword,
  resetPassword,
  getCurrentUser,
};
