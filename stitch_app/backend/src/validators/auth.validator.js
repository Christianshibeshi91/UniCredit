'use strict';

const Joi = require('joi');

/**
 * Auth endpoint validation schemas.
 */

const registerSchema = {
  body: Joi.object({
    email: Joi.string().email().max(254).required()
      .messages({ 'string.email': 'Invalid email format', 'any.required': 'Email and password required' }),
    password: Joi.string().min(8).max(128).required()
      .messages({ 'string.min': 'Password must be at least 8 characters', 'any.required': 'Email and password required' }),
    name: Joi.string().max(100).optional().allow('', null),
  }),
};

const loginSchema = {
  body: Joi.object({
    email: Joi.string().email().max(254).required()
      .messages({ 'any.required': 'Email and password required' }),
    password: Joi.string().min(1).max(128).required()
      .messages({ 'any.required': 'Email and password required' }),
  }),
};

const googleAuthSchema = {
  body: Joi.object({
    idToken: Joi.string().min(1).required()
      .messages({ 'any.required': 'Google ID token and email required' }),
    email: Joi.string().email().max(254).required()
      .messages({ 'any.required': 'Google ID token and email required' }),
    displayName: Joi.string().max(100).optional().allow('', null),
    photoUrl: Joi.string().uri().max(2000).optional().allow('', null),
  }),
};

const changePasswordSchema = {
  body: Joi.object({
    currentPassword: Joi.string().min(1).max(128).required()
      .messages({ 'any.required': 'Both current and new password required' }),
    newPassword: Joi.string().min(8).max(128).required()
      .messages({ 'string.min': 'New password must be at least 8 characters', 'any.required': 'Both current and new password required' }),
  }),
};

const forgotPasswordSchema = {
  body: Joi.object({
    email: Joi.string().email().max(254).required()
      .messages({ 'any.required': 'Email is required' }),
  }),
};

const resetPasswordSchema = {
  body: Joi.object({
    token: Joi.string().min(1).required()
      .messages({ 'any.required': 'Token and new password required' }),
    newPassword: Joi.string().min(8).max(128).required()
      .messages({ 'string.min': 'New password must be at least 8 characters', 'any.required': 'Token and new password required' }),
  }),
};

module.exports = {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
