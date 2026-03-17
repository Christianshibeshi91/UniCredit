'use strict';

/**
 * Integration test setup.
 * Configures environment, mocks Firebase/Redis/Stripe/SendGrid,
 * and provides test helpers.
 */

// Set test environment BEFORE any imports
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { randomUUID, createHash } = require('crypto');

// ─── In-memory data stores ───────────────────────────────────────────────────

const stores = {
  users: new Map(),
  transactions: new Map(),
  gifts: new Map(),
  fraud_flags: new Map(),
  settings: new Map(),
  audit_log: new Map(),
};

let docIdCounter = 0;
function nextId() {
  return `doc_${++docIdCounter}_${randomUUID().slice(0, 8)}`;
}

function resetStores() {
  for (const store of Object.values(stores)) {
    store.clear();
  }
  docIdCounter = 0;
}

// ─── Firestore Mock ──────────────────────────────────────────────────────────

function createMockFirestore() {
  function makeDocRef(collectionName, docId) {
    return {
      id: docId,
      get: jest.fn(async () => {
        const store = stores[collectionName];
        const data = store ? store.get(docId) : undefined;
        return {
          exists: !!data,
          id: docId,
          data: () => data ? { ...data } : undefined,
        };
      }),
      set: jest.fn(async (data, options) => {
        const store = stores[collectionName];
        if (options && options.merge && store.has(docId)) {
          const existing = store.get(docId);
          store.set(docId, { ...existing, ...data });
        } else {
          store.set(docId, { ...data });
        }
      }),
      update: jest.fn(async (data) => {
        const store = stores[collectionName];
        const existing = store.get(docId);
        if (!existing) throw new Error(`Document ${docId} not found`);
        // Handle FieldValue.increment
        const updated = { ...existing };
        for (const [key, value] of Object.entries(data)) {
          if (value && value._type === 'increment') {
            updated[key] = (updated[key] || 0) + value._value;
          } else {
            updated[key] = value;
          }
        }
        store.set(docId, updated);
      }),
      delete: jest.fn(async () => {
        stores[collectionName].delete(docId);
      }),
    };
  }

  function makeQuery(collectionName) {
    let filters = [];
    let orderByField = null;
    let orderByDir = 'asc';
    let limitCount = null;
    let startAfterValue = null;

    const queryObj = {
      where: jest.fn((field, op, value) => {
        filters.push({ field, op, value });
        return queryObj;
      }),
      orderBy: jest.fn((field, direction) => {
        orderByField = field;
        orderByDir = direction || 'asc';
        return queryObj;
      }),
      limit: jest.fn((n) => {
        limitCount = n;
        return queryObj;
      }),
      startAfter: jest.fn((value) => {
        startAfterValue = value;
        return queryObj;
      }),
      count: jest.fn(() => ({
        get: jest.fn(async () => ({
          data: () => ({ count: stores[collectionName].size }),
        })),
      })),
      get: jest.fn(async () => {
        const store = stores[collectionName];
        let docs = Array.from(store.entries()).map(([id, data]) => ({
          id,
          data: () => ({ ...data }),
          exists: true,
        }));

        // Apply filters
        for (const f of filters) {
          docs = docs.filter(d => {
            const val = d.data()[f.field];
            switch (f.op) {
              case '==': return val === f.value;
              case '!=': return val !== f.value;
              case '<': return val < f.value;
              case '<=': return val <= f.value;
              case '>': return val > f.value;
              case '>=': return val >= f.value;
              default: return true;
            }
          });
        }

        // Apply ordering
        if (orderByField) {
          docs.sort((a, b) => {
            const aVal = a.data()[orderByField];
            const bVal = b.data()[orderByField];
            if (aVal < bVal) return orderByDir === 'desc' ? 1 : -1;
            if (aVal > bVal) return orderByDir === 'desc' ? -1 : 1;
            return 0;
          });
        }

        // Apply startAfter
        if (startAfterValue) {
          const idx = docs.findIndex(d => d.data()[orderByField] === startAfterValue);
          if (idx >= 0) {
            docs = docs.slice(idx + 1);
          }
        }

        // Apply limit
        if (limitCount) {
          docs = docs.slice(0, limitCount);
        }

        return {
          empty: docs.length === 0,
          docs,
          size: docs.length,
          forEach: (fn) => docs.forEach(fn),
        };
      }),
    };
    return queryObj;
  }

  function makeCollectionRef(name) {
    return {
      doc: jest.fn((id) => {
        const docId = id || nextId();
        return makeDocRef(name, docId);
      }),
      add: jest.fn(async (data) => {
        const id = nextId();
        stores[name].set(id, { ...data });
        return { id };
      }),
      where: (...args) => {
        const q = makeQuery(name);
        return q.where(...args);
      },
      orderBy: (...args) => {
        const q = makeQuery(name);
        return q.orderBy(...args);
      },
      count: () => makeQuery(name).count(),
      get: () => makeQuery(name).get(),
    };
  }

  const db = {
    collection: jest.fn((name) => makeCollectionRef(name)),
    runTransaction: jest.fn(async (fn) => {
      // Simple transaction mock -- executes synchronously
      const transaction = {
        get: async (ref) => ref.get(),
        set: (ref, data) => ref.set(data),
        update: (ref, data) => ref.update(data),
      };
      return fn(transaction);
    }),
  };

  return db;
}

// ─── FieldValue mock ─────────────────────────────────────────────────────────

const FieldValue = {
  increment: (n) => ({ _type: 'increment', _value: n }),
  delete: () => null,
  serverTimestamp: () => new Date().toISOString(),
};

// ─── Firebase Admin mock ─────────────────────────────────────────────────────

const mockAuth = {
  createUser: jest.fn(async ({ email, displayName }) => ({
    uid: nextId(),
    email,
    displayName,
  })),
  getUserByEmail: jest.fn(async () => { throw { code: 'auth/user-not-found' }; }),
  verifyIdToken: jest.fn(async () => ({ email: 'test@gmail.com' })),
  updateUser: jest.fn(async () => {}),
};

// ─── Install mocks BEFORE loading app ────────────────────────────────────────

const mockDb = createMockFirestore();

jest.mock('../../backend/src/config/firebase', () => ({
  admin: { auth: () => mockAuth, firestore: { FieldValue } },
  db: mockDb,
  firebaseEnabled: true,
  FieldValue,
}));

jest.mock('../../backend/src/config/redis', () => ({
  initializeRedis: jest.fn(async () => ({ redisClient: null, redisEnabled: false })),
  getRedisClient: jest.fn(() => null),
  isRedisEnabled: jest.fn(() => false),
  setRedisClient: jest.fn(),
  closeRedis: jest.fn(async () => {}),
}));

jest.mock('../../backend/src/config/stripe', () => ({
  getStripeClient: jest.fn(() => null),
  isStripeEnabled: jest.fn(() => false),
}));

jest.mock('../../backend/src/config/sendgrid', () => ({
  getSendGridClient: jest.fn(() => null),
  isSendGridEnabled: jest.fn(() => false),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create a test user and return their token and ID.
 */
async function createTestUser({
  email = 'test@example.com',
  password = 'password123',
  name = 'Test User',
  role = 'user',
  balanceCents = 0,
  status = 'active',
  authProvider = 'email',
} = {}) {
  const userId = nextId();
  const passwordHash = await bcrypt.hash(password, 4); // fewer rounds for test speed

  stores.users.set(userId, {
    name,
    email,
    password_hash: passwordHash,
    balance_cents: balanceCents,
    tier: 'STANDARD',
    role,
    status,
    photo_url: null,
    auth_provider: authProvider,
    notification_preferences: { email: true, push: false },
    fcm_tokens: [],
    reset_token_hash: null,
    reset_token_expires_at: null,
    suspended_at: null,
    suspended_by: null,
    suspended_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login_at: null,
  });

  // Mock createUser to return this userId for this email
  mockAuth.createUser.mockImplementationOnce(async () => ({
    uid: userId,
    email,
    displayName: name,
  }));

  const token = jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '24h' });

  return { userId, token, email, password };
}

/**
 * Create a test gift.
 */
function createTestGift({
  senderId,
  recipientEmail = 'recipient@test.com',
  amountCents = 5000,
  status = 'pending',
} = {}) {
  const giftId = nextId();
  const claimToken = randomUUID();
  const claimTokenHash = createHash('sha256').update(claimToken).digest('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  stores.gifts.set(giftId, {
    sender_id: senderId,
    sender_name: 'Test Sender',
    recipient_email: recipientEmail,
    recipient_user_id: null,
    amount_cents: amountCents,
    message: 'Test gift message',
    occasion: 'Birthday',
    status,
    claim_token: claimToken,
    claim_token_hash: claimTokenHash,
    video_key: null,
    audio_key: null,
    scheduled_at: null,
    notification_sent_at: null,
    claimed_at: null,
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });

  return { giftId, claimToken, claimTokenHash };
}

/**
 * Create a test fraud flag.
 */
function createTestFraudFlag({
  userId,
  severity = 'high',
  status = 'open',
} = {}) {
  const flagId = nextId();

  stores.fraud_flags.set(flagId, {
    user_id: userId,
    user_name: 'Flagged User',
    user_email: 'flagged@test.com',
    reason: 'Suspicious activity',
    amount_cents: 50000,
    severity,
    status,
    resolved_by: null,
    resolved_at: null,
    resolution_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return { flagId };
}

module.exports = {
  stores,
  resetStores,
  createTestUser,
  createTestGift,
  createTestFraudFlag,
  mockDb,
  mockAuth,
  FieldValue,
};
