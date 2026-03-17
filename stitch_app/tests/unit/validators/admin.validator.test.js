'use strict';

const {
  adminUsersQuery,
  suspendUserSchema,
  resolveFraudFlagSchema,
  blockFraudFlagSchema,
  updateSettingSchema,
  fraudFlagsQuery,
  auditLogQuery,
} = require('../../../backend/src/validators/admin.validator');

function validateQuery(schema, query) {
  return schema.query.validate(query, { abortEarly: false, allowUnknown: false, stripUnknown: true });
}

function validateBody(schema, body) {
  return schema.body.validate(body, { abortEarly: false, allowUnknown: false, stripUnknown: true });
}

describe('Admin Validators', () => {
  describe('adminUsersQuery', () => {
    test('accepts empty query (defaults applied)', () => {
      const { error, value } = validateQuery(adminUsersQuery, {});
      expect(error).toBeUndefined();
      expect(value.limit).toBe(50);
    });

    test('accepts valid query with all params', () => {
      const { error, value } = validateQuery(adminUsersQuery, {
        cursor: 'abc123',
        limit: 25,
        search: 'test@example.com',
        status: 'active',
      });
      expect(error).toBeUndefined();
      expect(value.limit).toBe(25);
      expect(value.status).toBe('active');
    });

    test('accepts suspended status', () => {
      const { error } = validateQuery(adminUsersQuery, { status: 'suspended' });
      expect(error).toBeUndefined();
    });

    test('rejects invalid status', () => {
      const { error } = validateQuery(adminUsersQuery, { status: 'banned' });
      expect(error).toBeDefined();
    });

    test('rejects limit > 100', () => {
      const { error } = validateQuery(adminUsersQuery, { limit: 101 });
      expect(error).toBeDefined();
    });

    test('rejects limit < 1', () => {
      const { error } = validateQuery(adminUsersQuery, { limit: 0 });
      expect(error).toBeDefined();
    });

    test('rejects search > 200 chars', () => {
      const { error } = validateQuery(adminUsersQuery, { search: 'a'.repeat(201) });
      expect(error).toBeDefined();
    });
  });

  describe('suspendUserSchema', () => {
    test('accepts valid suspension reason', () => {
      const { error, value } = validateBody(suspendUserSchema, {
        reason: 'Suspicious activity detected',
      });
      expect(error).toBeUndefined();
      expect(value.reason).toBe('Suspicious activity detected');
    });

    test('rejects missing reason', () => {
      const { error } = validateBody(suspendUserSchema, {});
      expect(error).toBeDefined();
    });

    test('rejects reason > 500 chars', () => {
      const { error } = validateBody(suspendUserSchema, {
        reason: 'a'.repeat(501),
      });
      expect(error).toBeDefined();
    });
  });

  describe('resolveFraudFlagSchema', () => {
    test('accepts with notes', () => {
      const { error } = validateBody(resolveFraudFlagSchema, {
        notes: 'False positive confirmed',
      });
      expect(error).toBeUndefined();
    });

    test('accepts without notes', () => {
      const { error } = validateBody(resolveFraudFlagSchema, {});
      expect(error).toBeUndefined();
    });

    test('accepts empty notes', () => {
      const { error } = validateBody(resolveFraudFlagSchema, { notes: '' });
      expect(error).toBeUndefined();
    });

    test('rejects notes > 1000 chars', () => {
      const { error } = validateBody(resolveFraudFlagSchema, {
        notes: 'a'.repeat(1001),
      });
      expect(error).toBeDefined();
    });
  });

  describe('blockFraudFlagSchema', () => {
    test('accepts with notes', () => {
      const { error } = validateBody(blockFraudFlagSchema, {
        notes: 'Confirmed fraud',
      });
      expect(error).toBeUndefined();
    });

    test('accepts without notes', () => {
      const { error } = validateBody(blockFraudFlagSchema, {});
      expect(error).toBeUndefined();
    });

    test('rejects notes > 1000 chars', () => {
      const { error } = validateBody(blockFraudFlagSchema, {
        notes: 'a'.repeat(1001),
      });
      expect(error).toBeDefined();
    });
  });

  describe('updateSettingSchema', () => {
    test('accepts number value', () => {
      const { error, value } = validateBody(updateSettingSchema, { value: 0.85 });
      expect(error).toBeUndefined();
      expect(value.value).toBe(0.85);
    });

    test('accepts boolean value', () => {
      const { error, value } = validateBody(updateSettingSchema, { value: true });
      expect(error).toBeUndefined();
      expect(value.value).toBe(true);
    });

    test('accepts string value', () => {
      const { error, value } = validateBody(updateSettingSchema, { value: 'test' });
      expect(error).toBeUndefined();
      expect(value.value).toBe('test');
    });

    test('accepts integer value', () => {
      const { error, value } = validateBody(updateSettingSchema, { value: 291 });
      expect(error).toBeUndefined();
      expect(value.value).toBe(291);
    });

    test('rejects missing value', () => {
      const { error } = validateBody(updateSettingSchema, {});
      expect(error).toBeDefined();
    });

    test('rejects string value > 500 chars', () => {
      const { error } = validateBody(updateSettingSchema, {
        value: 'a'.repeat(501),
      });
      expect(error).toBeDefined();
    });

    test('rejects null value', () => {
      const { error } = validateBody(updateSettingSchema, { value: null });
      expect(error).toBeDefined();
    });
  });

  describe('fraudFlagsQuery', () => {
    test('accepts empty query (defaults applied)', () => {
      const { error, value } = validateQuery(fraudFlagsQuery, {});
      expect(error).toBeUndefined();
      expect(value.limit).toBe(20);
      expect(value.status).toBe('open');
    });

    test('accepts valid statuses', () => {
      for (const status of ['open', 'reviewing', 'resolved', 'blocked']) {
        const { error } = validateQuery(fraudFlagsQuery, { status });
        expect(error).toBeUndefined();
      }
    });

    test('rejects invalid status', () => {
      const { error } = validateQuery(fraudFlagsQuery, { status: 'invalid' });
      expect(error).toBeDefined();
    });

    test('rejects limit > 100', () => {
      const { error } = validateQuery(fraudFlagsQuery, { limit: 101 });
      expect(error).toBeDefined();
    });
  });

  describe('auditLogQuery', () => {
    test('accepts empty query (defaults applied)', () => {
      const { error, value } = validateQuery(auditLogQuery, {});
      expect(error).toBeUndefined();
      expect(value.limit).toBe(50);
    });

    test('accepts valid target types', () => {
      for (const targetType of ['user', 'setting', 'fraud_flag', 'gift']) {
        const { error } = validateQuery(auditLogQuery, { targetType });
        expect(error).toBeUndefined();
      }
    });

    test('rejects invalid targetType', () => {
      const { error } = validateQuery(auditLogQuery, { targetType: 'transaction' });
      expect(error).toBeDefined();
    });

    test('accepts actorId', () => {
      const { error } = validateQuery(auditLogQuery, { actorId: 'user123' });
      expect(error).toBeUndefined();
    });

    test('rejects actorId > 128 chars', () => {
      const { error } = validateQuery(auditLogQuery, {
        actorId: 'a'.repeat(129),
      });
      expect(error).toBeDefined();
    });
  });
});
