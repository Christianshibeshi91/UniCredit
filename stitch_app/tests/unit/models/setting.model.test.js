'use strict';

const {
  KNOWN_SETTINGS,
  validateSettingValue,
  createSettingDocument,
} = require('../../../backend/src/models/setting.model');

describe('Setting Model', () => {
  describe('KNOWN_SETTINGS', () => {
    test('contains exchange_rate', () => {
      expect(KNOWN_SETTINGS.exchange_rate).toBeDefined();
      expect(KNOWN_SETTINGS.exchange_rate.valueType).toBe('number');
      expect(KNOWN_SETTINGS.exchange_rate.defaultValue).toBe(0.9);
    });

    test('contains global_rate_lock', () => {
      expect(KNOWN_SETTINGS.global_rate_lock).toBeDefined();
      expect(KNOWN_SETTINGS.global_rate_lock.valueType).toBe('boolean');
    });

    test('contains integer settings', () => {
      expect(KNOWN_SETTINGS.standard_spread.valueType).toBe('integer');
      expect(KNOWN_SETTINGS.gift_expiration_days.valueType).toBe('integer');
      expect(KNOWN_SETTINGS.max_gift_amount_cents.valueType).toBe('integer');
      expect(KNOWN_SETTINGS.max_conversion_amount_cents.valueType).toBe('integer');
    });
  });

  describe('validateSettingValue', () => {
    describe('unknown settings', () => {
      test('rejects unknown setting key', () => {
        const result = validateSettingValue('nonexistent', 42);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Unknown setting key');
      });
    });

    describe('boolean settings', () => {
      test('accepts true', () => {
        const result = validateSettingValue('global_rate_lock', true);
        expect(result.valid).toBe(true);
      });

      test('accepts false', () => {
        const result = validateSettingValue('global_rate_lock', false);
        expect(result.valid).toBe(true);
      });

      test('rejects non-boolean', () => {
        const result = validateSettingValue('global_rate_lock', 'true');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('boolean');
      });

      test('rejects number for boolean setting', () => {
        const result = validateSettingValue('global_rate_lock', 1);
        expect(result.valid).toBe(false);
      });
    });

    describe('number settings (exchange_rate)', () => {
      test('accepts valid rate', () => {
        const result = validateSettingValue('exchange_rate', 0.85);
        expect(result.valid).toBe(true);
      });

      test('accepts minimum', () => {
        const result = validateSettingValue('exchange_rate', 0.01);
        expect(result.valid).toBe(true);
      });

      test('accepts maximum', () => {
        const result = validateSettingValue('exchange_rate', 1.0);
        expect(result.valid).toBe(true);
      });

      test('rejects below minimum', () => {
        const result = validateSettingValue('exchange_rate', 0.001);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('>=');
      });

      test('rejects above maximum', () => {
        const result = validateSettingValue('exchange_rate', 1.5);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('<=');
      });

      test('rejects non-number', () => {
        const result = validateSettingValue('exchange_rate', '0.9');
        expect(result.valid).toBe(false);
      });

      test('rejects NaN', () => {
        const result = validateSettingValue('exchange_rate', NaN);
        expect(result.valid).toBe(false);
      });

      test('rejects Infinity', () => {
        const result = validateSettingValue('exchange_rate', Infinity);
        expect(result.valid).toBe(false);
      });
    });

    describe('integer settings', () => {
      test('accepts valid integer for gift_expiration_days', () => {
        const result = validateSettingValue('gift_expiration_days', 90);
        expect(result.valid).toBe(true);
      });

      test('accepts minimum for gift_expiration_days', () => {
        const result = validateSettingValue('gift_expiration_days', 1);
        expect(result.valid).toBe(true);
      });

      test('accepts maximum for gift_expiration_days', () => {
        const result = validateSettingValue('gift_expiration_days', 365);
        expect(result.valid).toBe(true);
      });

      test('rejects below minimum for gift_expiration_days', () => {
        const result = validateSettingValue('gift_expiration_days', 0);
        expect(result.valid).toBe(false);
      });

      test('rejects above maximum for gift_expiration_days', () => {
        const result = validateSettingValue('gift_expiration_days', 366);
        expect(result.valid).toBe(false);
      });

      test('rejects non-integer for integer setting', () => {
        const result = validateSettingValue('gift_expiration_days', 90.5);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('integer');
      });

      test('accepts valid standard_spread', () => {
        const result = validateSettingValue('standard_spread', 291);
        expect(result.valid).toBe(true);
      });

      test('rejects standard_spread above max', () => {
        const result = validateSettingValue('standard_spread', 10001);
        expect(result.valid).toBe(false);
      });

      test('accepts valid max_gift_amount_cents', () => {
        const result = validateSettingValue('max_gift_amount_cents', 5000000);
        expect(result.valid).toBe(true);
      });

      test('rejects max_gift_amount_cents below min', () => {
        const result = validateSettingValue('max_gift_amount_cents', 50);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('createSettingDocument', () => {
    test('creates document for known setting', () => {
      const doc = createSettingDocument({
        key: 'exchange_rate',
        value: 0.85,
        updatedBy: 'admin1',
      });
      expect(doc.key).toBe('exchange_rate');
      expect(doc.value).toBe(0.85);
      expect(doc.value_type).toBe('number');
      expect(doc.description).toBe('Gift card to UniCredit exchange rate');
      expect(doc.updated_at).toBeDefined();
      expect(doc.updated_by).toBe('admin1');
    });

    test('creates document for unknown setting', () => {
      const doc = createSettingDocument({
        key: 'custom_setting',
        value: 'hello',
      });
      expect(doc.key).toBe('custom_setting');
      expect(doc.value).toBe('hello');
      expect(doc.value_type).toBe('string');
      expect(doc.description).toBe('');
      expect(doc.updated_by).toBe('system');
    });

    test('defaults updatedBy to system', () => {
      const doc = createSettingDocument({ key: 'exchange_rate', value: 0.9 });
      expect(doc.updated_by).toBe('system');
    });

    test('sets updated_at to current ISO timestamp', () => {
      const before = new Date().toISOString();
      const doc = createSettingDocument({ key: 'exchange_rate', value: 0.9 });
      const after = new Date().toISOString();
      expect(doc.updated_at >= before).toBe(true);
      expect(doc.updated_at <= after).toBe(true);
    });

    test('creates document for boolean setting', () => {
      const doc = createSettingDocument({
        key: 'global_rate_lock',
        value: true,
      });
      expect(doc.value_type).toBe('boolean');
    });

    test('creates document for integer setting', () => {
      const doc = createSettingDocument({
        key: 'gift_expiration_days',
        value: 60,
      });
      expect(doc.value_type).toBe('integer');
    });
  });
});
