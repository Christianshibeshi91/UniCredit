'use strict';

const { db, firebaseEnabled, FieldValue } = require('../config/firebase');
const { createTransactionDocument, toApiResponse: txToApi } = require('../models/transaction.model');
const { NotFoundError, InsufficientBalanceError } = require('../utils/errors');
const { centsToDisplay } = require('../utils/currency');
const { decodeCursor, encodeCursor } = require('../utils/crypto');

/**
 * Wallet Service
 * Handles balance operations using Firestore transactions for atomicity.
 * ALL monetary values are integer cents.
 */

/**
 * Get user balance.
 * @param {string} userId
 * @returns {Object} { balanceCents, displayBalance, tier }
 */
async function getBalance(userId) {
  if (!firebaseEnabled) {
    return { balanceCents: 0, displayBalance: '$0.00', tier: 'STANDARD' };
  }

  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new NotFoundError('User not found');
  }

  const data = userDoc.data();
  const balanceCents = data.balance_cents || 0;

  return {
    balanceCents,
    displayBalance: centsToDisplay(balanceCents),
    tier: data.tier || 'STANDARD',
  };
}

/**
 * Credit user balance atomically and create a transaction record.
 * @param {string} userId
 * @param {number} amountCents - Positive integer cents to credit.
 * @param {string} description
 * @param {string} category
 * @param {string} [referenceId]
 * @param {string} [referenceType]
 * @returns {Object} { newBalanceCents }
 */
async function creditBalance(userId, amountCents, description, category, referenceId = null, referenceType = null) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('amountCents must be a positive integer');
  }

  if (!firebaseEnabled) {
    return { newBalanceCents: amountCents };
  }

  const userRef = db.collection('users').doc(userId);

  const newBalanceCents = await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) {
      throw new NotFoundError('User not found');
    }

    // Increment balance
    transaction.update(userRef, {
      balance_cents: FieldValue.increment(amountCents),
      updated_at: new Date().toISOString(),
    });

    // Create transaction record
    const txDoc = createTransactionDocument({
      userId,
      amountCents,
      type: 'credit',
      description,
      category,
      referenceId,
      referenceType,
    });
    const txRef = db.collection('transactions').doc();
    transaction.set(txRef, txDoc);

    // Atomically increment platform-wide total volume counter
    const statsRef = db.collection('settings').doc('platform_stats');
    transaction.set(statsRef, {
      total_volume_cents: FieldValue.increment(amountCents),
      updated_at: new Date().toISOString(),
    }, { merge: true });

    return (userDoc.data().balance_cents || 0) + amountCents;
  });

  return { newBalanceCents };
}

/**
 * Debit user balance atomically and create a transaction record.
 * Throws InsufficientBalanceError if balance < amountCents.
 * @param {string} userId
 * @param {number} amountCents - Positive integer cents to debit.
 * @param {string} description
 * @param {string} category
 * @param {string} [referenceId]
 * @param {string} [referenceType]
 * @returns {Object} { newBalanceCents }
 */
async function debitBalance(userId, amountCents, description, category, referenceId = null, referenceType = null) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('amountCents must be a positive integer');
  }

  if (!firebaseEnabled) {
    return { newBalanceCents: 0 };
  }

  const userRef = db.collection('users').doc(userId);

  const newBalanceCents = await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) {
      throw new NotFoundError('User not found');
    }

    const currentBalance = userDoc.data().balance_cents || 0;
    if (currentBalance < amountCents) {
      throw new InsufficientBalanceError('Insufficient balance');
    }

    // Decrement balance
    transaction.update(userRef, {
      balance_cents: FieldValue.increment(-amountCents),
      updated_at: new Date().toISOString(),
    });

    // Create transaction record (negative amount for debit)
    const txDoc = createTransactionDocument({
      userId,
      amountCents, // createTransactionDocument handles the sign based on type
      type: 'debit',
      description,
      category,
      referenceId,
      referenceType,
    });
    const txRef = db.collection('transactions').doc();
    transaction.set(txRef, txDoc);

    return currentBalance - amountCents;
  });

  return { newBalanceCents };
}

/**
 * Get paginated transaction history for a user.
 * @param {string} userId
 * @param {Object} options
 * @param {string} [options.cursor]
 * @param {number} [options.limit=20]
 * @param {string} [options.category]
 * @param {string} [options.type]
 * @returns {Object} { data, pagination }
 */
async function getTransactions(userId, { cursor, limit = 20, category, type } = {}) {
  if (!firebaseEnabled) {
    return { data: [], pagination: { nextCursor: null, hasMore: false, limit } };
  }

  let query = db.collection('transactions')
    .where('user_id', '==', userId)
    .orderBy('created_at', 'desc');

  if (category) {
    query = query.where('category', '==', category);
  }
  if (type) {
    query = query.where('type', '==', type);
  }

  // Apply cursor
  const cursorData = decodeCursor(cursor);
  if (cursorData && cursorData.created_at) {
    query = query.startAfter(cursorData.created_at);
  }

  const snap = await query.limit(limit + 1).get();
  const docs = snap.docs;
  const hasMore = docs.length > limit;
  const pageItems = hasMore ? docs.slice(0, limit) : docs;

  const data = pageItems.map(d => txToApi(d.id, d.data()));

  let nextCursor = null;
  if (hasMore && pageItems.length > 0) {
    const lastDoc = pageItems[pageItems.length - 1];
    nextCursor = encodeCursor({ created_at: lastDoc.data().created_at });
  }

  return {
    data,
    pagination: { nextCursor, hasMore, limit },
  };
}

module.exports = {
  getBalance,
  creditBalance,
  debitBalance,
  getTransactions,
};
