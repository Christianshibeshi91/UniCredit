'use strict';

const walletService = require('../services/wallet.service');

/**
 * Wallet Controller
 * Handles balance and transaction history operations.
 */

async function getBalance(req, res, next) {
  try {
    const result = await walletService.getBalance(req.userId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function getTransactions(req, res, next) {
  try {
    const { cursor, limit, category, type } = req.query;
    const result = await walletService.getTransactions(req.userId, {
      cursor: cursor || null,
      limit: limit ? parseInt(limit, 10) : 20,
      category: category || null,
      type: type || null,
    });
    res.json({ data: result.data, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getBalance,
  getTransactions,
};
