const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'stitch-app-secret-change-in-production';

// ─── Stripe Setup ────────────────────────────────────────────────────────────
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

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
const processedSessions = new Set();

// ─── Firestore Data Model Initialization ─────────────────────────────────────
async function initializeFirestore() {
    if (!firebaseEnabled) {
        console.log('⚠️  Skipping Firestore initialization (not connected)');
        return;
    }

    try {
        // Check if already initialized
        const metaDoc = await db.collection('_meta').doc('initialized').get();
        if (metaDoc.exists) {
            console.log('✅ Firestore already initialized');
            return;
        }

        console.log('🔧 Initializing Firestore data models...');

        // ─── Create Users Collection Schema ──────────────────────────────
        // Schema: { name, email, password_hash, balance, tier, role, created_at, updated_at }
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
            // Also create a Firebase Auth user
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

        // ─── Create Transactions Collection ──────────────────────────────
        // Schema: { user_id, amount, type(credit|debit), description, category, created_at }
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

        // ─── Create Gifts Collection ─────────────────────────────────────
        // Schema: { sender_id, recipient_email, amount, message, occasion, status(pending|claimed|expired), created_at }
        const seedGifts = [
            { sender_id: 'demo_user', recipient_email: 'sarah@example.com', amount: 100.00, message: 'Happy Birthday!', occasion: 'birthday', status: 'pending', created_at: new Date(Date.now() - 86400000).toISOString() },
        ];

        for (const gift of seedGifts) {
            await db.collection('gifts').add(gift);
        }
        console.log('  ✅ Gifts collection seeded (1 gift)');

        // ─── Create Fraud Flags Collection ───────────────────────────────
        // Schema: { user_id, name, reason, amount, severity(low|medium|high), status(open|reviewed|dismissed), created_at }
        const seedFraudFlags = [
            { user_id: 'flag_1', name: 'Alex Johnson', reason: 'Multiple IP logins', amount: 2450.00, severity: 'high', status: 'open', created_at: new Date().toISOString() },
            { user_id: 'flag_2', name: 'Sarah Williams', reason: 'Bulk gift card claim', amount: 820.00, severity: 'medium', status: 'open', created_at: new Date().toISOString() },
            { user_id: 'flag_3', name: 'Michael Chen', reason: 'Velocity limit hit', amount: 5000.00, severity: 'high', status: 'open', created_at: new Date().toISOString() },
        ];

        for (const flag of seedFraudFlags) {
            await db.collection('fraud_flags').add(flag);
        }
        console.log('  ✅ Fraud flags collection seeded (3 flags)');

        // ─── Create Settings Collection ──────────────────────────────────
        // Schema: { key, value, description, updated_at, updated_by }
        const seedSettings = [
            { key: 'global_rate_lock', value: true, description: '2:1 peg to all gates', updated_at: new Date().toISOString(), updated_by: 'system' },
            { key: 'standard_spread', value: 291, description: 'Standard spread in basis points', updated_at: new Date().toISOString(), updated_by: 'system' },
            { key: 'exchange_rate', value: 0.9, description: 'Gift card to UniCredit exchange rate', updated_at: new Date().toISOString(), updated_by: 'system' },
        ];

        for (const setting of seedSettings) {
            await db.collection('settings').doc(setting.key).set(setting);
        }
        console.log('  ✅ Settings collection seeded (3 settings)');

        // ─── Mark as initialized ─────────────────────────────────────────
        await db.collection('_meta').doc('initialized').set({
            initialized_at: new Date().toISOString(),
            version: '2.0.0',
            collections: ['users', 'transactions', 'gifts', 'fraud_flags', 'settings'],
        });

        console.log('✅ Firestore initialization complete!\n');
        console.log('   📊 Collections created:');
        console.log('   • users        — User profiles + auth data');
        console.log('   • transactions  — Wallet transaction history');
        console.log('   • gifts         — Sent/received gifts');
        console.log('   • fraud_flags   — Flagged suspicious activity');
        console.log('   • settings      — App configuration\n');
        console.log('   👤 Demo Accounts:');
        console.log('   • admin@unicredit.app / admin123  (Admin)');
        console.log('   • alex@example.com   / demo123   (User)\n');

    } catch (err) {
        console.error('❌ Firestore initialization error:', err.message);
    }
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));

// Raw body for Stripe webhooks
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// ─── JWT Auth Middleware ─────────────────────────────────────────────────────
function generateToken(userId, role) {
    return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
    // Public routes that don't need auth (paths are relative to /api mount)
    const publicPaths = [
        '/auth/login',
        '/auth/register',
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

// Apply auth middleware to all /api routes
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
        description,
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
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if email already exists
        const existing = await getUserByEmail(email);
        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const displayName = name || email.split('@')[0];
        const isAdmin = email.toLowerCase().includes('admin');
        let userId;

        if (firebaseEnabled) {
            // Create Firebase Auth user
            const authUser = await admin.auth().createUser({
                email,
                password,
                displayName,
            });
            userId = authUser.uid;

            // Create Firestore user doc
            await db.collection('users').doc(userId).set({
                name: displayName,
                email,
                password_hash: passwordHash,
                balance: 0,
                tier: 'STANDARD',
                role: isAdmin ? 'admin' : 'user',
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
                role: isAdmin ? 'admin' : 'user',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
        }

        const token = generateToken(userId, isAdmin ? 'admin' : 'user');
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
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Look up user by email
        const user = await getUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Verify password
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
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/me  (validate token + get current user)
app.get('/api/auth/me', async (req, res) => {
    try {
        const user = await getUser(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const { password_hash, ...safeUser } = user;
        res.json({ id: req.userId, ...safeUser });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Both current and new password required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        const user = await getUser(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const newHash = await bcrypt.hash(newPassword, 10);

        if (firebaseEnabled) {
            await db.collection('users').doc(req.userId).update({
                password_hash: newHash,
                updated_at: new Date().toISOString(),
            });
            // Also update Firebase Auth password
            await admin.auth().updateUser(req.userId, { password: newPassword });
        } else {
            inMemoryUsers[req.userId].password_hash = newHash;
        }

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── User Routes ─────────────────────────────────────────────────────────────

// GET /api/users/:id
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await getUser(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const { password_hash, ...safeUser } = user;
        res.json(safeUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/users  (upsert user — kept for backwards compatibility)
app.post('/api/users', async (req, res) => {
    try {
        const { uid, name, email } = req.body;
        if (!uid || !email) return res.status(400).json({ error: 'uid and email required' });

        if (firebaseEnabled) {
            const existing = await db.collection('users').doc(uid).get();
            if (existing.exists) {
                // Merge update
                await db.collection('users').doc(uid).set({ name, email, updated_at: new Date().toISOString() }, { merge: true });
            } else {
                await db.collection('users').doc(uid).set({
                    name: name || email.split('@')[0],
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
                inMemoryUsers[uid].name = name || inMemoryUsers[uid].name;
                inMemoryUsers[uid].email = email;
            } else {
                inMemoryUsers[uid] = { id: uid, name: name || email.split('@')[0], email, balance: 0, tier: 'STANDARD', role: 'user', created_at: new Date().toISOString() };
            }
        }
        const user = await getUser(uid);
        const { password_hash, ...safeUser } = user || {};
        res.json({ id: uid, ...safeUser });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Wallet Routes ───────────────────────────────────────────────────────────

// GET /api/wallet/balance/:userId
app.get('/api/wallet/balance/:userId', async (req, res) => {
    try {
        const user = await getUser(req.params.userId);
        res.json({ balance: user ? user.balance : 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/transactions/:userId
app.get('/api/transactions/:userId', async (req, res) => {
    try {
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
        res.status(500).json({ error: err.message });
    }
});

// ─── Convert Gift Card ───────────────────────────────────────────────────────

// POST /api/convert
app.post('/api/convert', async (req, res) => {
    try {
        const { userId, merchant, cardNumber, pin, amount } = req.body;
        if (!userId || !amount) return res.status(400).json({ error: 'userId and amount required' });

        // Get exchange rate from settings
        let exchangeRate = 0.9;
        if (firebaseEnabled) {
            const rateDoc = await db.collection('settings').doc('exchange_rate').get();
            if (rateDoc.exists) exchangeRate = rateDoc.data().value;
        }

        const addedValue = parseFloat(amount) * exchangeRate;
        const newBalance = await updateUserBalance(userId, addedValue);
        await addTransaction(userId, addedValue, 'credit', `${merchant || 'Gift Card'} Conversion`, 'gift_card');

        res.json({ success: true, addedValue: addedValue.toFixed(2), newBalance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Send Gift ───────────────────────────────────────────────────────────────

// POST /api/gifts/send
app.post('/api/gifts/send', async (req, res) => {
    try {
        const { senderId, recipientEmail, amount, message, occasion } = req.body;
        if (!senderId || !recipientEmail || !amount) return res.status(400).json({ error: 'Missing required fields' });

        const sender = await getUser(senderId);
        if (!sender || sender.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });

        await updateUserBalance(senderId, -parseFloat(amount));
        await addTransaction(senderId, -parseFloat(amount), 'debit', `Sent Gift to ${recipientEmail}`, 'gift_sent');

        const gift = {
            sender_id: senderId,
            recipient_email: recipientEmail,
            amount: parseFloat(amount),
            message,
            occasion,
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
        res.status(500).json({ error: err.message });
    }
});

// ─── Admin Routes ────────────────────────────────────────────────────────────

// Admin middleware
function adminOnly(req, res, next) {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// GET /api/admin/stats
app.get('/api/admin/stats', async (req, res) => {
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
            fraudFlags = [
                { id: 1, name: 'Alex Johnson', reason: 'Multiple IP logins', amount: 2450.00, severity: 'high' },
                { id: 2, name: 'Sarah Williams', reason: 'Bulk gift card claim', amount: 820.00, severity: 'medium' },
            ];
        }

        res.json({
            totalVolume,
            volumeGrowth: 5.2,
            users: totalUsers,
            usersGrowth: 12,
            activeConversations: totalTransactions,
            activeConvGrowth: -2,
            fraudFlags,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/users  (list all users)
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
        res.status(500).json({ error: err.message });
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
        res.status(500).json({ error: err.message });
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
        res.status(500).json({ error: err.message });
    }
});

// ─── Stripe Endpoints ─────────────────────────────────────────────────────────

// GET /api/stripe/prices
app.get('/api/stripe/prices', async (req, res) => {
    try {
        const prices = await stripe.prices.list({ product: 'prod_U4AuducLkzCtPk', active: true });
        const formatted = prices.data.map(p => ({
            id: p.id,
            amount: p.unit_amount / 100,
            currency: p.currency,
            label: `$${(p.unit_amount / 100).toFixed(0)}`,
        })).sort((a, b) => a.amount - b.amount);
        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/stripe/create-checkout-session
app.post('/api/stripe/create-checkout-session', async (req, res) => {
    try {
        const { priceId, userId, userEmail } = req.body;
        if (!priceId || !userId) return res.status(400).json({ error: 'priceId and userId required' });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'payment',
            success_url: `http://localhost:3000/api/stripe/success?session_id={CHECKOUT_SESSION_ID}&user_id=${userId}`,
            cancel_url: `http://localhost:3000/api/stripe/cancel`,
            customer_email: userEmail || undefined,
            metadata: { userId },
        });

        res.json({ url: session.url, sessionId: session.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/stripe/success (redirect landing — public)
app.get('/api/stripe/success', async (req, res) => {
    try {
        const { session_id, user_id } = req.query;
        if (!session_id || !user_id) return res.status(400).send('Missing parameters');

        const session = await stripe.checkout.sessions.retrieve(session_id);
        if (session.payment_status === 'paid') {
            const amountPaid = session.amount_total / 100;
            if (!processedSessions.has(session_id)) {
                processedSessions.add(session_id);
                await updateUserBalance(user_id, amountPaid);
                await addTransaction(user_id, amountPaid, 'credit', `Wallet Top-Up via Stripe`, 'top_up');
            }
            res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px">
        <h1 style="color:#135BEC">✅ Payment Successful!</h1>
        <p>$${amountPaid.toFixed(2)} has been added to your Stitch wallet.</p>
        <p>You may close this tab and return to the app.</p>
      </body></html>`);
        } else {
            res.send('<html><body><h2>Payment not complete.</h2></body></html>');
        }
    } catch (err) {
        res.status(500).send(`Error: ${err.message}`);
    }
});

app.get('/api/stripe/cancel', (req, res) => {
    res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px">
    <h1>❌ Payment Cancelled</h1>
    <p>You may close this tab and return to the app.</p>
  </body></html>`);
});

// POST /api/stripe/webhook (public)
app.post('/api/stripe/webhook', async (req, res) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
        if (webhookSecret && webhookSecret !== 'whsec_REPLACE_WITH_WEBHOOK_SECRET') {
            const sig = req.headers['stripe-signature'];
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } else {
            event = JSON.parse(req.body);
        }
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const sessionId = session.id;
        if (session.payment_status === 'paid' && session.metadata?.userId) {
            if (!processedSessions.has(sessionId)) {
                processedSessions.add(sessionId);
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
        stripe: !!process.env.STRIPE_SECRET_KEY,
        timestamp: new Date().toISOString(),
    });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
    console.log(`\n🚀 Stitch Backend running on http://localhost:${PORT}`);
    console.log(`   Firebase: ${firebaseEnabled ? '✅ Connected' : '⚠️  In-Memory mode'}`);
    console.log(`   Stripe:   ${process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_REPLACE_WITH_YOUR_TEST_KEY' ? '✅ Connected' : '⚠️  No key set'}`);
    console.log(`   Auth:     ✅ JWT + bcrypt\n`);

    // Initialize Firestore data models on first run
    await initializeFirestore();
});
