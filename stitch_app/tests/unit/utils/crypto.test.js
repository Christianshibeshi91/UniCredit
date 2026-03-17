'use strict';

const {
  generateToken,
  generateRandomHex,
  hashSHA256,
  generateRequestId,
  encodeCursor,
  decodeCursor,
} = require('../../../backend/src/utils/crypto');

describe('Crypto Utilities', () => {
  describe('generateToken', () => {
    test('returns a valid UUID v4 string', () => {
      const token = generateToken();
      expect(token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
    });

    test('generates unique tokens on each call', () => {
      const t1 = generateToken();
      const t2 = generateToken();
      expect(t1).not.toBe(t2);
    });
  });

  describe('generateRandomHex', () => {
    test('returns 64-char hex string by default (32 bytes)', () => {
      const hex = generateRandomHex();
      expect(hex).toHaveLength(64);
      expect(hex).toMatch(/^[0-9a-f]{64}$/);
    });

    test('returns correct length for custom byte count', () => {
      const hex = generateRandomHex(16);
      expect(hex).toHaveLength(32);
      expect(hex).toMatch(/^[0-9a-f]{32}$/);
    });

    test('generates unique values', () => {
      const h1 = generateRandomHex();
      const h2 = generateRandomHex();
      expect(h1).not.toBe(h2);
    });
  });

  describe('hashSHA256', () => {
    test('hashes a string to 64-char hex', () => {
      const hash = hashSHA256('test');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    test('produces deterministic output', () => {
      const h1 = hashSHA256('hello');
      const h2 = hashSHA256('hello');
      expect(h1).toBe(h2);
    });

    test('produces different hashes for different input', () => {
      const h1 = hashSHA256('test1');
      const h2 = hashSHA256('test2');
      expect(h1).not.toBe(h2);
    });

    test('matches known SHA-256 value', () => {
      // SHA-256 of "test" is well-known
      const hash = hashSHA256('test');
      expect(hash).toBe(
        '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
      );
    });

    test('throws on empty string', () => {
      expect(() => hashSHA256('')).toThrow('hashSHA256 requires a non-empty string');
    });

    test('throws on non-string input', () => {
      expect(() => hashSHA256(null)).toThrow('hashSHA256 requires a non-empty string');
      expect(() => hashSHA256(undefined)).toThrow('hashSHA256 requires a non-empty string');
      expect(() => hashSHA256(42)).toThrow('hashSHA256 requires a non-empty string');
    });
  });

  describe('generateRequestId', () => {
    test('returns a valid UUID v4', () => {
      const id = generateRequestId();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
    });
  });

  describe('encodeCursor / decodeCursor', () => {
    test('round-trips simple object', () => {
      const data = { created_at: '2024-01-01T00:00:00.000Z' };
      const encoded = encodeCursor(data);
      expect(typeof encoded).toBe('string');
      const decoded = decodeCursor(encoded);
      expect(decoded).toEqual(data);
    });

    test('round-trips complex object', () => {
      const data = { created_at: '2024-06-15T12:30:00Z', id: 'abc123', page: 5 };
      const encoded = encodeCursor(data);
      const decoded = decodeCursor(encoded);
      expect(decoded).toEqual(data);
    });

    test('encoded cursor is valid base64', () => {
      const encoded = encodeCursor({ x: 1 });
      expect(encoded).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    test('decodeCursor returns null for null input', () => {
      expect(decodeCursor(null)).toBeNull();
    });

    test('decodeCursor returns null for undefined input', () => {
      expect(decodeCursor(undefined)).toBeNull();
    });

    test('decodeCursor returns null for empty string', () => {
      expect(decodeCursor('')).toBeNull();
    });

    test('decodeCursor returns null for non-string input', () => {
      expect(decodeCursor(42)).toBeNull();
    });

    test('decodeCursor returns null for invalid base64', () => {
      expect(decodeCursor('not-valid-base64!!!')).toBeNull();
    });

    test('decodeCursor returns null for base64 that is not valid JSON', () => {
      const notJson = Buffer.from('this is not json').toString('base64');
      expect(decodeCursor(notJson)).toBeNull();
    });
  });
});
