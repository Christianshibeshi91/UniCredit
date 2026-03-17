'use strict';

const mediaService = require('../services/media.service');
const { ValidationError } = require('../utils/errors');

/**
 * Upload Controller
 * Handles signed URL generation for media uploads.
 */

async function generateSignedUrl(req, res, next) {
  try {
    const { fileType, contentType } = req.body;

    if (!fileType || !contentType) {
      throw new ValidationError('fileType and contentType are required');
    }

    if (!['video', 'audio'].includes(fileType)) {
      throw new ValidationError('fileType must be "video" or "audio"');
    }

    const result = await mediaService.generateUploadUrl(req.userId, fileType, contentType);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generateSignedUrl,
};
