'use strict';

const giftService = require('../services/gift.service');

/**
 * Gift Controller
 * Handles gift sending, claiming, and media operations.
 */

async function sendGift(req, res, next) {
  try {
    const { recipientEmail, amountCents, message, occasion, scheduledAt } = req.body;
    const result = await giftService.sendGift({
      senderId: req.userId,
      recipientEmail,
      amountCents,
      message,
      occasion,
      scheduledAt,
    });
    res.json({ data: { success: true, ...result } });
  } catch (err) {
    next(err);
  }
}

async function getGift(req, res, next) {
  try {
    const { id } = req.params;
    const gift = await giftService.getGift(id, req.userId);
    res.json({ data: gift });
  } catch (err) {
    next(err);
  }
}

async function previewGift(req, res, next) {
  try {
    const { token } = req.params;
    const preview = await giftService.previewGift(token);
    res.json({ data: preview });
  } catch (err) {
    next(err);
  }
}

async function claimGift(req, res, next) {
  try {
    const { token } = req.params;
    const result = await giftService.claimGift(token, req.userId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function updateMedia(req, res, next) {
  try {
    const { id } = req.params;
    const { videoKey, audioKey } = req.body;
    await giftService.updateGiftMedia(id, req.userId, videoKey, audioKey);
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  sendGift,
  getGift,
  previewGift,
  claimGift,
  updateMedia,
};
