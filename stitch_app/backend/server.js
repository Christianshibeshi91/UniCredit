const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security: Require JWT_SECRET ────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET environment variable is required. Set it in .env');
    process.exit(1);
}

// ─── Stripe Setup ────────────────────────────────────────────────────────────
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY ? require('stripe')(STRIPE_SECRET_KEY) : null;

// ─── Firebase Admin Setup ────────────────────────────────────────────────────
let admin = null;
let db = null;
let firebaseEnabled = false;

try {
    admin = require('firebase-admin');
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
        : null;

    if (serviceAccount && !admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        db = admin.firestore();
        firebaseEnabled = true;
        console.log('✅ Firebase Admin initialized');
    } else {
        console.log('⚠️  Firebase: No service account found, running without Firestore');
    }
} catch (err) {
    console.log('⚠️  firebase-admin not installed, running without Firebase:', err.message);
}

// ─── In-memory fallback data ──────────────────────────────────────────────────
const inMemoryUsers = {};
const inMemoryTransactions = [];
const inMemoryGifts = [];
const processedSessions = new Map(); // Map<sessionId, timestamp> for TTL cleanup

// Clean up processed sessions older than 24 hours
setInterval(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [id, ts] of processedSessions) {
        if (ts < cutoff) processedSessions.delete(id);
    }
}, 60 * 60 * 1000); // Run hourly

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const rateLimitStore = new Map();

function rateLimit(windowMs, maxRequests) {
    return (req, res, next) => {
        const key = `${req.ip}:${req.path}`;
        const now = Date.now();
        const windowStart = now - windowMs;

        if (!rateLimitStore.has(key)) {
            rateLimitStore.set(key, []);
        }

        const requests = rateLimitStore.get(key).filter(ts => ts > windowStart);
        rateLimitStore.set(key, requests);

        if (requests.length >= maxRequests) {
            return res.status(429).json({ error: 'Too many requests. Please try again later.' });
        }

        requests.push(now);
        next();
    };
}

// Clean up rate limit store periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of rateLimitStore) {
        const fresh = timestamps.filter(ts => ts > now - 15 * 60 * 1000);
        if (fresh.length === 0) rateLimitStore.delete(key);
        else rateLimitStore.set(key, fresh);
    }
}, 5 * 60 * 1000);

const authRateLimit = rateLimit(15 * 60 * 1000, 15); // 15 attempts per 15 min
const financialRateLimit = rateLimit(60 * 1000, 10); // 10 per minute

// ─── Input Validation ────────────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>&"']/g, c => ({
        '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'
    })[c]);
}

function isValidAmount(amount) {
    const num = parseFloat(amount);
    return !isNaN(num) && isFinite(num) && num > 0 && num <= 50000;
}

// ─── Firestore Data Model Initialization ─────────────────────────────────────
async function initializeFirestore() {
    if (!firebaseEnabled) {
        console.log('⚠️  Skipping Firestore initialization (not connected)');
        return;
    }

    try {
        const metaDoc = await db.collection('_meta').doc('initialized').get();
        if (metaDoc.exists) {
            console.log('✅ Firestore already initialized');
            return;
        }

        console.log('🔧 Initializing Firestore data models...');

        const adminPasswordHash = await bcrypt.hash('admin123', 10);
        const demoPasswordHash = await bcrypt.hash('demo123', 10);

        const seedUsers = [
            {
                id: 'admin_user',
                data: {
                    name: 'Admin User',
                    email: 'admin@unicredit.app',
                    password_hash: adminPasswordHash,
                    balance: 10000.00,
                    tier: 'PLATINUM',
                    role: 'admin',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
            },
            {
                id: 'demo_user',
                data: {
                    name: 'Alex Rivers',
                    email: 'alex@example.com',
                    password_hash: demoPasswordHash,
                    balance: 1240.50,
                    tier: 'GOLD',
                    role: 'user',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
            },
        ];

        for (const user of seedUsers) {
            await db.collection('users').doc(user.id).set(user.data);
            try {
                await admin.auth().createUser({
                    uid: user.id,
                    email: user.data.email,
                    displayName: user.data.name,
                    password: user.id === 'admin_user' ? 'admin123' : 'demo123',
                });
            } catch (authErr) {
                if (authErr.code !== 'auth/uid-already-exists' && authErr.code !== 'auth/email-already-exists') {
                    console.log(`  ⚠️  Could not create auth user ${user.id}: ${authErr.message}`);
                }
            }
        }
        console.log('  ✅ Users collection seeded (2 users)');

        const seedTransactions = [
            { user_id: 'demo_user', amount: 500.00, type: 'credit', description: 'Amazon Gift Card Conversion', category: 'gift_card', created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
            { user_id: 'demo_user', amount: 250.00, type: 'credit', description: 'iTunes Gift Card Conversion', category: 'gift_card', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
            { user_id: 'demo_user', amount: -100.00, type: 'debit', description: 'Sent Gift to sarah@example.com', category: 'gift_sent', created_at: new Date(Date.now() - 86400000).toISOString() },
            { user_id: 'demo_user', amount: 200.00, type: 'credit', description: 'Wallet Top-Up via Stripe', category: 'top_up', created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
            { user_id: 'demo_user', amount: 390.50, type: 'credit', description: 'Google Play Gift Card Conversion', category: 'gift_card', created_at: new Date().toISOString() },
        ];

        for (const tx of seedTransactions) {
            await db.collection('transactions').add(tx);
        }
        console.log('  ✅ Transactions collection seeded (5 transactions)');

        const seedGifts = [
            { sender_id: 'demo_user', recipient_email: 'sarah@example.com', amount: 100.00, message: 'Happy Birthday!', occasion: 'birthday', status: 'pending', created_at: new Date(Date.now() - 86400000).toISOString() },
        ];

        for (const gift of seedGifts) {
            await db.collection('gifts').add(gift);
        }
        console.log('  ✅ Gifts collection seeded (1 gift)');

        const seedFraudFlags = [
            { user_id: 'flag_1', name: 'Alex Johnson', reason: 'Multiple IP logins', amount: 2450.00, severity: 'high', status: 'open', created_at: new Date().toISOString() },
            { user_id: 'flag_2', name: 'Sarah Williams', reason: 'Bulk gift card claim', amount: 820.00, severity: 'medium', status: 'open', created_at: new Date().toISOString() },
            { user_id: 'flag_3', name: 'Michael Chen', reason: 'Velocity limit hit', amount: 5000.00, severity: 'high', status: 'open', created_at: new Date().toISOString() },
        ];

        for (const flag of seedFraudFlags) {
            await db.collection('fraud_flags').add(flag);
        }
        console.log('  ✅ Fraud flags collection seeded (3 flags)');

        const seedSettings = [
            { key: 'global_rate_lock', value: true, description: '2:1 peg to all gates', updated_at: new Date().toISOString(), updated_by: 'system' },
            { key: 'standard_spread', value: 291, description: 'Standard spread in basis points', updated_at: new Date().toISOString(), updated_by: 'system' },
            { key: 'exchange_rate', value: 0.9, description: 'Gift card to UniCredit exchange rate', updated_at: new Date().toISOString(), updated_by: 'system' },
        ];

        for (const setting of seedSettings) {
            await db.collection('settings').doc(setting.key).set(setting);
        }
        console.log('  ✅ Settings collection seeded (3 settings)');

        await db.collection('_meta').doc('initialized').set({
            initialized_at: new Date().toISOString(),
            version: '2.1.0',
            collections: ['users', 'transactions', 'gifts', 'fraud_flags', 'settings'],
        });

        console.log('✅ Firestore initialization complete!\n');
        console.log('   📊 Collections: users, transactions, gifts, fraud_flags, settings\n');

    } catch (err) {
        console.error('❌ Firestore initialization error:', err.message);
    }
}

// ─── Middleware ───────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:8080,http://localhost:5000').split(',');
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, true); // Allow for now in dev — tighten in production
        }
    },
    credentials: true,
}));

// Raw body for Stripe webhooks
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));

// Logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// ─── JWT Auth Middleware ─────────────────────────────────────────────────────
function generateToken(userId, role) {
    return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '24h' });
}

function authMiddleware(req, res, next) {
    const publicPaths = [
        '/auth/login',
        '/auth/register',
        '/auth/google',
        '/stripe/webhook',
        '/stripe/success',
        '/stripe/cancel',
    ];

    if (publicPaths.some(p => req.path.startsWith(p))) {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

app.use('/api', authMiddleware);

// ─── Helper Functions ────────────────────────────────────────────────────────
async function getUser(userId) {
    if (firebaseEnabled) {
        const doc = await db.collection('users').doc(userId).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    }
    return inMemoryUsers[userId] || null;
}

async function getUserByEmail(email) {
    if (firebaseEnabled) {
        const snap = await db.collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();
        if (snap.empty) return null;
        const doc = snap.docs[0];
        return { id: doc.id, ...doc.data() };
    }
    return Object.values(inMemoryUsers).find(u => u.email === email) || null;
}

async function updateUserBalance(userId, delta) {
    if (firebaseEnabled) {
        const ref = db.collection('users').doc(userId);
        await ref.update({
            balance: admin.firestore.FieldValue.increment(delta),
            updated_at: new Date().toISOString(),
        });
        const doc = await ref.get();
        return doc.data().balance;
    } else {
        if (!inMemoryUsers[userId]) return null;
        inMemoryUsers[userId].balance += delta;
        return inMemoryUsers[userId].balance;
    }
}

async function addTransaction(userId, amount, type, description, category = 'general') {
    const tx = {
        user_id: userId,
        amount,
        type,
        description: sanitizeString(description),
        category,
        created_at: new Date().toISOString(),
    };
    if (firebaseEnabled) {
        const ref = await db.collection('transactions').add(tx);
        return { id: ref.id, ...tx };
    } else {
        const id = Date.now().toString();
        inMemoryTransactions.unshift({ id, ...tx });
        return { id, ...tx };
    }
}

// ─── Auth Routes ─────────────────────────────────────────────────────────────

// POST /api/auth/register
app.post('/api/auth/register', authRateLimit, async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        const existing = await getUserByEmail(email);
        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const displayName = sanitizeString(name || email.split('@')[0]);
        // Security: All new users are regular users. Admin role is assigned manually.
        const role = 'user';
        let userId;

        if (firebaseEnabled) {
            const authUser = await admin.auth().createUser({
                email,
                password,
                displayName,
            });
            userId = authUser.uid;

            await db.collection('users').doc(userId).set({
                name: displayName,
                email,
                password_hash: passwordHash,
                balance: 0,
                tier: 'STANDARD',
                role,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
        } else {
            userId = `user_${Date.now()}`;
            inMemoryUsers[userId] = {
                id: userId,
                name: displayName,
                email,
                password_hash: passwordHash,
                balance: 0,
                tier: 'STANDARD',
                role,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
        }

        const token = generateToken(userId, role);
        const user = await getUser(userId);
        const { password_hash, ...safeUser } = user;

        res.status(201).json({
            token,
            user: { id: userId, ...safeUser },
        });
    } catch (err) {
        if (err.code === 'auth/email-already-exists') {
            return res.status(409).json({ error: 'Email already registered' });
        }
        console.error('Register error:', err.message);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// POST /api/auth/login
app.post('/api/auth/login', authRateLimit, async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const user = await getUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = generateToken(user.id, user.role || 'user');
        const { password_hash, ...safeUser } = user;

        res.json({
            token,
            user: safeUser,
        });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// POST /api/auth/google — Google Sign-In
app.post('/api/auth/google', authRateLimit, async (req, res) => {
    try {
        const { idToken, email, displayName, photoUrl } = req.body;
        if (!idToken || !email) {
            return res.status(400).json({ error: 'Google ID token and email required' });
        }
        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Verify Google ID token via Google's tokeninfo endpoint
        let verified = false;
        try {
            const https = require('https');
            const verifyResult = await new Promise((resolve, reject) => {
                https.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, (resp) => {
                    let data = '';
                    resp.on('data', chunk => data += chunk);
                    resp.on('end', () => {
                        try {
                            resolve(JSON.parse(data));
                        } catch {
                            reject(new Error('Invalid response'));
                        }
                    });
                }).on('error', reject);
            });

            if (verifyResult.email && verifyResult.email.toLowerCase() === email.toLowerCase()) {
                verified = true;
            }
        } catch (verifyErr) {
            console.error('Google token verification error:', verifyErr.message);
        }

        // If Firebase Admin is available, also try verifying through Firebase
        if (!verified && firebaseEnabled && admin) {
            try {
                const decodedToken = await admin.auth().verifyIdToken(idToken);
                if (decodedToken.email && decodedToken.email.toLowerCase() === email.toLowerCase()) {
                    verified = true;
                }
            } catch (fbErr) {
                console.log('Firebase token verification fallback failed:', fbErr.message);
            }
        }

        if (!verified) {
            return res.status(401).json({ error: 'Google authentication failed' });
        }

        // Check if user exists
        let user = await getUserByEmail(email);
        let userId;

        if (user) {
            // Existing user — log them in
            userId = user.id;
        } else {
            // New user — create account
            const safeName = sanitizeString(displayName || email.split('@')[0]);

            if (firebaseEnabled) {
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

                await db.collection('users').doc(userId).set({
                    name: safeName,
                    email,
                    password_hash: '', // Google auth — no password
                    balance: 0,
                    tier: 'STANDARD',
                    role: 'user',
                    photo_url: photoUrl || '',
                    auth_provider: 'google',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
            } else {
                userId = `user_${Date.now()}`;
                inMemoryUsers[userId] = {
                    id: userId,
                    name: sanitizeString(displayName || email.split('@')[0]),
                    email,
                    password_hash: '',
                    balance: 0,
                    tier: 'STANDARD',
                    role: 'user',
                    photo_url: photoUrl || '',
                    auth_provider: 'google',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
            }

            user = await getUser(userId);
        }

        const token = generateToken(userId, user.role || 'user');
        const { password_hash, ...safeUser } = user;

        res.json({
            token,
            user: { id: userId, ...safeUser },
        });
    } catch (err) {
        console.error('Google auth error:', err.message);
        res.status(500).json({ error: 'Google authentication failed. Please try again.' });
    }
});

// GET /api/auth/me
app.get('/api/auth/me', async (req, res) => {
    try {
        const user = await getUser(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const { password_hash, ...safeUser } = user;
        res.json({ id: req.userId, ...safeUser });
    } catch (err) {
        console.error('Auth/me error:', err.message);
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', authRateLimit, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Both current and new password required' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }

        const user = await getUser(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const newHash = await bcrypt.hash(newPassword, 12);

        if (firebaseEnabled) {
            await db.collection('users').doc(req.userId).update({
                password_hash: newHash,
                updated_at: new Date().toISOString(),
            });
            await admin.auth().updateUser(req.userId, { password: newPassword });
        } else {
            inMemoryUsers[req.userId].password_hash = newHash;
        }

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        console.error('Change password error:', err.message);
        res.status(500).json({ error: 'Failed to change password. Please try again.' });
    }
});

// ─── User Routes ─────────────────────────────────────────────────────────────

// GET /api/users/:id — users can only access their own profile
app.get('/api/users/:id', async (req, res) => {
    try {
        // IDOR protection: users can only view their own profile, admins can view any
        if (req.params.id !== req.userId && req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const user = await getUser(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const { password_hash, ...safeUser } = user;
        res.json(safeUser);
    } catch (err) {
        console.error('Get user error:', err.message);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// POST /api/users — users can only update their own profile
app.post('/api/users', async (req, res) => {
    try {
        const { uid, name, email } = req.body;
        if (!uid || !email) return res.status(400).json({ error: 'uid and email required' });

        // IDOR protection: users can only update themselves
        if (uid !== req.userId && req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const safeName = sanitizeString(name);

        if (firebaseEnabled) {
            const existing = await db.collection('users').doc(uid).get();
            if (existing.exists) {
                await db.collection('users').doc(uid).set({ name: safeName, email, updated_at: new Date().toISOString() }, { merge: true });
            } else {
                await db.collection('users').doc(uid).set({
                    name: safeName || email.split('@')[0],
                    email,
                    balance: 0,
                    tier: 'STANDARD',
                    role: 'user',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
            }
        } else {
            if (inMemoryUsers[uid]) {
                inMemoryUsers[uid].name = safeName || inMemoryUsers[uid].name;
                inMemoryUsers[uid].email = email;
            } else {
                inMemoryUsers[uid] = { id: uid, name: safeName || email.split('@')[0], email, balance: 0, tier: 'STANDARD', role: 'user', created_at: new Date().toISOString() };
            }
        }
        const user = await getUser(uid);
        const { password_hash, ...safeUser } = user || {};
        res.json({ id: uid, ...safeUser });
    } catch (err) {
        console.error('Upsert user error:', err.message);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// ─── Wallet Routes ───────────────────────────────────────────────────────────

// GET /api/wallet/balance/:userId — IDOR protected
app.get('/api/wallet/balance/:userId', async (req, res) => {
    try {
        if (req.params.userId !== req.userId && req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const user = await getUser(req.params.userId);
        res.json({ balance: user ? user.balance : 0 });
    } catch (err) {
        console.error('Balance error:', err.message);
        res.status(500).json({ error: 'Failed to fetch balance' });
    }
});

// GET /api/transactions/:userId — IDOR protected
app.get('/api/transactions/:userId', async (req, res) => {
    try {
        if (req.params.userId !== req.userId && req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (firebaseEnabled) {
            const snap = await db.collection('transactions')
                .where('user_id', '==', req.params.userId)
                .get();
            const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            txs.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
            return res.json(txs.slice(0, 20));
        }
        const txs = inMemoryTransactions.filter(t => t.user_id === req.params.userId).slice(0, 20);
        res.json(txs);
    } catch (err) {
        console.error('Transactions error:', err.message);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// ─── Convert Gift Card ───────────────────────────────────────────────────────

// POST /api/convert — uses authenticated user, not body userId
app.post('/api/convert', financialRateLimit, async (req, res) => {
    try {
        const { merchant, cardNumber, pin, amount } = req.body;

        if (!isValidAmount(amount)) {
            return res.status(400).json({ error: 'Invalid amount. Must be between $0.01 and $50,000.' });
        }
        if (!merchant || !cardNumber) {
            return res.status(400).json({ error: 'Merchant and card number required' });
        }

        // Use authenticated user ID, not body userId (IDOR fix)
        const userId = req.userId;

        let exchangeRate = 0.9;
        if (firebaseEnabled) {
            const rateDoc = await db.collection('settings').doc('exchange_rate').get();
            if (rateDoc.exists) exchangeRate = rateDoc.data().value;
        }

        const addedValue = parseFloat(amount) * exchangeRate;
        const newBalance = await updateUserBalance(userId, addedValue);
        await addTransaction(userId, addedValue, 'credit', `${sanitizeString(merchant)} Conversion`, 'gift_card');

        res.json({ success: true, addedValue: addedValue.toFixed(2), newBalance });
    } catch (err) {
        console.error('Convert error:', err.message);
        res.status(500).json({ error: 'Conversion failed. Please try again.' });
    }
});

// ─── Send Gift ───────────────────────────────────────────────────────────────

// POST /api/gifts/send — uses authenticated user as sender (IDOR fix)
app.post('/api/gifts/send', financialRateLimit, async (req, res) => {
    try {
        const { recipientEmail, amount, message, occasion } = req.body;

        if (!recipientEmail || !amount) {
            return res.status(400).json({ error: 'Recipient email and amount required' });
        }
        if (!EMAIL_REGEX.test(recipientEmail)) {
            return res.status(400).json({ error: 'Invalid recipient email' });
        }
        if (!isValidAmount(amount)) {
            return res.status(400).json({ error: 'Invalid amount. Must be between $0.01 and $50,000.' });
        }

        // Use authenticated user ID as sender (IDOR fix)
        const senderId = req.userId;
        const parsedAmount = parseFloat(amount);

        const sender = await getUser(senderId);
        if (!sender || sender.balance < parsedAmount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        await updateUserBalance(senderId, -parsedAmount);
        await addTransaction(senderId, -parsedAmount, 'debit', `Sent Gift to ${sanitizeString(recipientEmail)}`, 'gift_sent');

        const gift = {
            sender_id: senderId,
            recipient_email: recipientEmail,
            amount: parsedAmount,
            message: sanitizeString(message || ''),
            occasion: sanitizeString(occasion || ''),
            status: 'pending',
            created_at: new Date().toISOString(),
        };

        let giftId;
        if (firebaseEnabled) {
            const ref = await db.collection('gifts').add(gift);
            giftId = ref.id;
        } else {
            giftId = `gift_${Date.now()}`;
            inMemoryGifts.push({ id: giftId, ...gift });
        }

        res.json({ success: true, giftId });
    } catch (err) {
        console.error('Send gift error:', err.message);
        res.status(500).json({ error: 'Failed to send gift. Please try again.' });
    }
});

// ─── Admin Routes ────────────────────────────────────────────────────────────

function adminOnly(req, res, next) {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// GET /api/admin/stats — now requires admin role
app.get('/api/admin/stats', adminOnly, async (req, res) => {
    try {
        let totalUsers = 0;
        let totalTransactions = 0;
        let totalVolume = 0;
        let fraudFlags = [];

        if (firebaseEnabled) {
            const usersSnap = await db.collection('users').count().get();
            totalUsers = usersSnap.data().count;

            const txSnap = await db.collection('transactions').get();
            totalTransactions = txSnap.size;
            txSnap.docs.forEach(d => {
                if (d.data().amount > 0) totalVolume += d.data().amount;
            });

            const flagsSnap = await db.collection('fraud_flags')
                .where('status', '==', 'open')
                .get();
            fraudFlags = flagsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            fraudFlags.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
            fraudFlags = fraudFlags.slice(0, 10);
        } else {
            totalUsers = Object.keys(inMemoryUsers).length;
            totalTransactions = inMemoryTransactions.length;
            totalVolume = inMemoryTransactions.reduce((sum, t) => t.amount > 0 ? sum + t.amount : sum, 0);
        }

        res.json({
            totalVolume,
            users: totalUsers,
            activeConversations: totalTransactions,
            fraudFlags,
        });
    } catch (err) {
        console.error('Admin stats error:', err.message);
        res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
});

// GET /api/admin/users
app.get('/api/admin/users', adminOnly, async (req, res) => {
    try {
        if (firebaseEnabled) {
            const snap = await db.collection('users').limit(50).get();
            const users = snap.docs.map(d => {
                const { password_hash, ...data } = d.data();
                return { id: d.id, ...data };
            });
            return res.json(users);
        }
        const users = Object.values(inMemoryUsers).map(({ password_hash, ...u }) => u);
        res.json(users);
    } catch (err) {
        console.error('Admin users error:', err.message);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// GET /api/admin/fraud-flags
app.get('/api/admin/fraud-flags', adminOnly, async (req, res) => {
    try {
        if (firebaseEnabled) {
            const snap = await db.collection('fraud_flags').get();
            const flags = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            flags.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
            return res.json(flags.slice(0, 20));
        }
        res.json([]);
    } catch (err) {
        console.error('Fraud flags error:', err.message);
        res.status(500).json({ error: 'Failed to fetch fraud flags' });
    }
});

// PUT /api/admin/settings/:key
app.put('/api/admin/settings/:key', adminOnly, async (req, res) => {
    try {
        const { value } = req.body;
        if (value === undefined) return res.status(400).json({ error: 'value required' });

        if (firebaseEnabled) {
            await db.collection('settings').doc(req.params.key).update({
                value,
                updated_at: new Date().toISOString(),
                updated_by: req.userId,
            });
        }
        res.json({ success: true, key: req.params.key, value });
    } catch (err) {
        console.error('Settings error:', err.message);
        res.status(500).json({ error: 'Failed to update setting' });
    }
});

// ─── Stripe Endpoints ─────────────────────────────────────────────────────────

// GET /api/stripe/prices
app.get('/api/stripe/prices', async (req, res) => {
    try {
        if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
        const prices = await stripe.prices.list({ product: 'prod_U4AuducLkzCtPk', active: true });
        const formatted = prices.data.map(p => ({
            id: p.id,
            amount: p.unit_amount / 100,
            currency: p.currency,
            label: `$${(p.unit_amount / 100).toFixed(0)}`,
        })).sort((a, b) => a.amount - b.amount);
        res.json(formatted);
    } catch (err) {
        console.error('Stripe prices error:', err.message);
        res.status(500).json({ error: 'Failed to fetch prices' });
    }
});

// POST /api/stripe/create-checkout-session
app.post('/api/stripe/create-checkout-session', financialRateLimit, async (req, res) => {
    try {
        if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

        const { priceId, userEmail } = req.body;
        // Use authenticated userId, not body userId (IDOR fix)
        const userId = req.userId;
        if (!priceId) return res.status(400).json({ error: 'priceId required' });

        const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'payment',
            success_url: `${BASE_URL}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${BASE_URL}/api/stripe/cancel`,
            customer_email: userEmail || undefined,
            metadata: { userId },
        });

        res.json({ url: session.url, sessionId: session.id });
    } catch (err) {
        console.error('Stripe checkout error:', err.message);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// GET /api/stripe/success — uses session metadata for userId (tamper-proof)
app.get('/api/stripe/success', async (req, res) => {
    try {
        if (!stripe) return res.status(503).send('Stripe not configured');
        const { session_id } = req.query;
        if (!session_id) return res.status(400).send('Missing session ID');

        const session = await stripe.checkout.sessions.retrieve(session_id);
        // Get userId from trusted session metadata, not from query param
        const userId = session.metadata?.userId;

        if (session.payment_status === 'paid' && userId) {
            const amountPaid = session.amount_total / 100;
            if (!processedSessions.has(session_id)) {
                processedSessions.set(session_id, Date.now());
                await updateUserBalance(userId, amountPaid);
                await addTransaction(userId, amountPaid, 'credit', 'Wallet Top-Up via Stripe', 'top_up');
            }
            res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px">
        <h1 style="color:#135BEC">Payment Successful!</h1>
        <p>$${amountPaid.toFixed(2)} has been added to your wallet.</p>
        <p>You may close this tab and return to the app.</p>
      </body></html>`);
        } else {
            res.send('<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>Payment not complete.</h2></body></html>');
        }
    } catch (err) {
        console.error('Stripe success error:', err.message);
        res.status(500).send('Payment verification failed. Please contact support.');
    }
});

app.get('/api/stripe/cancel', (req, res) => {
    res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px">
    <h1>Payment Cancelled</h1>
    <p>You may close this tab and return to the app.</p>
  </body></html>`);
});

// POST /api/stripe/webhook
app.post('/api/stripe/webhook', async (req, res) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
        if (webhookSecret && webhookSecret !== 'whsec_REPLACE_WITH_WEBHOOK_SECRET') {
            const sig = req.headers['stripe-signature'];
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } else {
            // In development without webhook secret, still parse but log warning
            console.warn('⚠️  Webhook signature verification skipped — set STRIPE_WEBHOOK_SECRET for production');
            event = JSON.parse(req.body);
        }
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: 'Webhook verification failed' });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const sessionId = session.id;
        if (session.payment_status === 'paid' && session.metadata?.userId) {
            if (!processedSessions.has(sessionId)) {
                processedSessions.set(sessionId, Date.now());
                const userId = session.metadata.userId;
                const amount = session.amount_total / 100;
                await updateUserBalance(userId, amount);
                await addTransaction(userId, amount, 'credit', 'Wallet Top-Up via Stripe', 'top_up');
                console.log(`✅ Credited $${amount} to user ${userId}`);
            } else {
                console.log(`⏭️  Session ${sessionId} already processed, skipping`);
            }
        }
    }

    res.json({ received: true });
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        firebase: firebaseEnabled,
        stripe: !!STRIPE_SECRET_KEY,
        timestamp: new Date().toISOString(),
    });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
    console.log(`\n🚀 Stitch Backend running on http://localhost:${PORT}`);
    console.log(`   Firebase: ${firebaseEnabled ? '✅ Connected' : '⚠️  In-Memory mode'}`);
    console.log(`   Stripe:   ${STRIPE_SECRET_KEY ? '✅ Connected' : '⚠️  No key set'}`);
    console.log(`   Auth:     ✅ JWT (24h) + bcrypt (12 rounds)\n`);

    await initializeFirestore();
});
