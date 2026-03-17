'use strict';

const authService = require('../services/auth.service');

/**
 * Auth Controller
 * Maps HTTP requests to auth service calls.
 */

async function register(req, res, next) {
  try {
    const { email, password, name } = req.body;
    const result = await authService.register(email, password, name);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function googleAuth(req, res, next) {
  try {
    const { idToken, email, displayName, photoUrl } = req.body;
    const result = await authService.googleAuth(idToken, email, displayName, photoUrl);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.userId);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.userId, currentPassword, newPassword);
    res.json({ data: { success: true, message: 'Password updated successfully' } });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    await authService.forgotPassword(email);
    // Always return success to prevent email enumeration
    res.json({ data: { message: 'If that email exists, reset instructions have been sent.' } });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    await authService.resetPassword(token, newPassword);
    res.json({ data: { success: true, message: 'Password has been reset. Please log in.' } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  googleAuth,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
};
