'use strict';

const {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../../../backend/src/validators/auth.validator');

/**
 * Helper to validate body against a schema.
 */
function validateBody(schema, body) {
  return schema.body.validate(body, { abortEarly: false, allowUnknown: false, stripUnknown: true });
}

describe('Auth Validators', () => {
  describe('registerSchema', () => {
    test('accepts valid registration', () => {
      const { error, value } = validateBody(registerSchema, {
        email: 'user@example.com',
        password: 'password123',
        name: 'Test User',
      });
      expect(error).toBeUndefined();
      expect(value.email).toBe('user@example.com');
      expect(value.password).toBe('password123');
      expect(value.name).toBe('Test User');
    });

    test('accepts registration without name', () => {
      const { error } = validateBody(registerSchema, {
        email: 'user@example.com',
        password: 'password123',
      });
      expect(error).toBeUndefined();
    });

    test('rejects missing email', () => {
      const { error } = validateBody(registerSchema, { password: 'password123' });
      expect(error).toBeDefined();
    });

    test('rejects missing password', () => {
      const { error } = validateBody(registerSchema, { email: 'user@example.com' });
      expect(error).toBeDefined();
    });

    test('rejects invalid email', () => {
      const { error } = validateBody(registerSchema, {
        email: 'not-an-email',
        password: 'password123',
      });
      expect(error).toBeDefined();
    });

    test('rejects short password (< 8 chars)', () => {
      const { error } = validateBody(registerSchema, {
        email: 'user@example.com',
        password: '1234567',
      });
      expect(error).toBeDefined();
    });

    test('rejects password > 128 chars', () => {
      const { error } = validateBody(registerSchema, {
        email: 'user@example.com',
        password: 'a'.repeat(129),
      });
      expect(error).toBeDefined();
    });

    test('rejects name > 100 chars', () => {
      const { error } = validateBody(registerSchema, {
        email: 'user@example.com',
        password: 'password123',
        name: 'a'.repeat(101),
      });
      expect(error).toBeDefined();
    });

    test('allows empty name', () => {
      const { error } = validateBody(registerSchema, {
        email: 'user@example.com',
        password: 'password123',
        name: '',
      });
      expect(error).toBeUndefined();
    });

    test('strips unknown fields', () => {
      const { error, value } = validateBody(registerSchema, {
        email: 'user@example.com',
        password: 'password123',
        admin: true,
        role: 'admin',
      });
      expect(error).toBeUndefined();
      expect(value.admin).toBeUndefined();
      expect(value.role).toBeUndefined();
    });
  });

  describe('loginSchema', () => {
    test('accepts valid login', () => {
      const { error } = validateBody(loginSchema, {
        email: 'user@example.com',
        password: 'password123',
      });
      expect(error).toBeUndefined();
    });

    test('rejects missing email', () => {
      const { error } = validateBody(loginSchema, { password: 'password123' });
      expect(error).toBeDefined();
    });

    test('rejects missing password', () => {
      const { error } = validateBody(loginSchema, { email: 'user@example.com' });
      expect(error).toBeDefined();
    });

    test('rejects empty password', () => {
      const { error } = validateBody(loginSchema, {
        email: 'user@example.com',
        password: '',
      });
      expect(error).toBeDefined();
    });

    test('rejects invalid email format', () => {
      const { error } = validateBody(loginSchema, {
        email: 'invalid',
        password: 'password123',
      });
      expect(error).toBeDefined();
    });
  });

  describe('googleAuthSchema', () => {
    test('accepts valid Google auth', () => {
      const { error } = validateBody(googleAuthSchema, {
        idToken: 'some-google-id-token',
        email: 'user@gmail.com',
        displayName: 'John Doe',
        photoUrl: 'https://example.com/photo.jpg',
      });
      expect(error).toBeUndefined();
    });

    test('accepts without optional fields', () => {
      const { error } = validateBody(googleAuthSchema, {
        idToken: 'some-google-id-token',
        email: 'user@gmail.com',
      });
      expect(error).toBeUndefined();
    });

    test('rejects missing idToken', () => {
      const { error } = validateBody(googleAuthSchema, { email: 'user@gmail.com' });
      expect(error).toBeDefined();
    });

    test('rejects missing email', () => {
      const { error } = validateBody(googleAuthSchema, { idToken: 'token' });
      expect(error).toBeDefined();
    });

    test('rejects empty idToken', () => {
      const { error } = validateBody(googleAuthSchema, {
        idToken: '',
        email: 'user@gmail.com',
      });
      expect(error).toBeDefined();
    });

    test('rejects invalid photoUrl (not a URI)', () => {
      const { error } = validateBody(googleAuthSchema, {
        idToken: 'token',
        email: 'user@gmail.com',
        photoUrl: 'not a uri',
      });
      expect(error).toBeDefined();
    });
  });

  describe('changePasswordSchema', () => {
    test('accepts valid password change', () => {
      const { error } = validateBody(changePasswordSchema, {
        currentPassword: 'oldpass123',
        newPassword: 'newpass123',
      });
      expect(error).toBeUndefined();
    });

    test('rejects missing currentPassword', () => {
      const { error } = validateBody(changePasswordSchema, {
        newPassword: 'newpass123',
      });
      expect(error).toBeDefined();
    });

    test('rejects missing newPassword', () => {
      const { error } = validateBody(changePasswordSchema, {
        currentPassword: 'oldpass123',
      });
      expect(error).toBeDefined();
    });

    test('rejects short new password', () => {
      const { error } = validateBody(changePasswordSchema, {
        currentPassword: 'oldpass123',
        newPassword: 'short',
      });
      expect(error).toBeDefined();
    });
  });

  describe('forgotPasswordSchema', () => {
    test('accepts valid email', () => {
      const { error } = validateBody(forgotPasswordSchema, {
        email: 'user@example.com',
      });
      expect(error).toBeUndefined();
    });

    test('rejects missing email', () => {
      const { error } = validateBody(forgotPasswordSchema, {});
      expect(error).toBeDefined();
    });

    test('rejects invalid email', () => {
      const { error } = validateBody(forgotPasswordSchema, { email: 'bad' });
      expect(error).toBeDefined();
    });
  });

  describe('resetPasswordSchema', () => {
    test('accepts valid reset', () => {
      const { error } = validateBody(resetPasswordSchema, {
        token: 'some-reset-token',
        newPassword: 'newpass123',
      });
      expect(error).toBeUndefined();
    });

    test('rejects missing token', () => {
      const { error } = validateBody(resetPasswordSchema, {
        newPassword: 'newpass123',
      });
      expect(error).toBeDefined();
    });

    test('rejects missing newPassword', () => {
      const { error } = validateBody(resetPasswordSchema, {
        token: 'token',
      });
      expect(error).toBeDefined();
    });

    test('rejects short new password', () => {
      const { error } = validateBody(resetPasswordSchema, {
        token: 'token',
        newPassword: '1234567',
      });
      expect(error).toBeDefined();
    });
  });
});
