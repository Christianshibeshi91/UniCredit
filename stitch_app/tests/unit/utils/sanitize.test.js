'use strict';

const { sanitizeString, sanitizeObject } = require('../../../backend/src/utils/sanitize');

describe('Sanitize Utilities', () => {
  describe('sanitizeString', () => {
    test('escapes < and > (XSS prevention)', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      );
    });

    test('escapes ampersand', () => {
      expect(sanitizeString('a & b')).toBe('a &amp; b');
    });

    test('escapes double quotes', () => {
      expect(sanitizeString('"hello"')).toBe('&quot;hello&quot;');
    });

    test('escapes single quotes', () => {
      expect(sanitizeString("it's")).toBe("it&#39;s");
    });

    test('escapes forward slash', () => {
      expect(sanitizeString('a/b')).toBe('a&#x2F;b');
    });

    test('escapes backtick', () => {
      expect(sanitizeString('`code`')).toBe('&#x60;code&#x60;');
    });

    test('escapes all special chars together', () => {
      const input = '<div class="a" data-b=\'c\'>&`/';
      const result = sanitizeString(input);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain('"');
      expect(result).not.toContain("'");
      expect(result).not.toContain('`');
      // & and / are also escaped
    });

    test('leaves safe strings unchanged', () => {
      expect(sanitizeString('Hello World 123')).toBe('Hello World 123');
    });

    test('handles empty string', () => {
      expect(sanitizeString('')).toBe('');
    });

    test('returns empty string for non-string input', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString(42)).toBe('');
      expect(sanitizeString({})).toBe('');
      expect(sanitizeString([])).toBe('');
      expect(sanitizeString(true)).toBe('');
    });

    test('handles unicode characters without escaping', () => {
      expect(sanitizeString('Hello 🌍 世界')).toBe('Hello 🌍 世界');
    });

    test('handles very long strings', () => {
      const longStr = 'a'.repeat(10000);
      expect(sanitizeString(longStr)).toBe(longStr);
    });
  });

  describe('sanitizeObject', () => {
    test('sanitizes all string values', () => {
      const input = { name: '<b>Bob</b>', age: 25 };
      const result = sanitizeObject(input);
      expect(result.name).toBe('&lt;b&gt;Bob&lt;&#x2F;b&gt;');
      expect(result.age).toBe(25);
    });

    test('sanitizes only specified keys', () => {
      const input = { name: '<b>Bob</b>', title: '<i>admin</i>' };
      const result = sanitizeObject(input, ['name']);
      expect(result.name).toBe('&lt;b&gt;Bob&lt;&#x2F;b&gt;');
      expect(result.title).toBe('<i>admin</i>');
    });

    test('preserves non-string values', () => {
      const input = { count: 5, active: true, items: [1, 2], nested: { a: 1 } };
      const result = sanitizeObject(input);
      expect(result.count).toBe(5);
      expect(result.active).toBe(true);
      expect(result.items).toEqual([1, 2]);
      expect(result.nested).toEqual({ a: 1 });
    });

    test('does not mutate original object', () => {
      const input = { name: '<b>test</b>' };
      sanitizeObject(input);
      expect(input.name).toBe('<b>test</b>');
    });

    test('returns empty object for null input', () => {
      expect(sanitizeObject(null)).toEqual({});
    });

    test('returns empty object for undefined input', () => {
      expect(sanitizeObject(undefined)).toEqual({});
    });

    test('returns empty object for non-object input', () => {
      expect(sanitizeObject('string')).toEqual({});
      expect(sanitizeObject(42)).toEqual({});
    });

    test('handles empty object', () => {
      expect(sanitizeObject({})).toEqual({});
    });

    test('ignores keys not present in object when keys array given', () => {
      const input = { name: 'Bob' };
      const result = sanitizeObject(input, ['name', 'nonexistent']);
      expect(result.name).toBe('Bob');
      expect(result).not.toHaveProperty('nonexistent');
    });
  });
});
