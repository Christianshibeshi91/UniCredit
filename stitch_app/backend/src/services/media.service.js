'use strict';

const { env } = require('../config/env');
const { generateRequestId } = require('../utils/crypto');
const { ValidationError, ServiceUnavailableError } = require('../utils/errors');

/**
 * Media Service
 * Handles signed URL generation for direct-to-GCS file upload and download.
 */

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ALLOWED_AUDIO_TYPES = ['audio/aac', 'audio/mp4', 'audio/webm', 'audio/ogg'];
const MAX_VIDEO_SIZE = 52_428_800; // 50 MB
const MAX_AUDIO_SIZE = 10_485_760; // 10 MB
const UPLOAD_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
const DOWNLOAD_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get the extension from a content type.
 */
function getExtension(contentType) {
  const map = {
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
    'audio/aac': 'aac',
    'audio/mp4': 'm4a',
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
  };
  return map[contentType] || 'bin';
}

/**
 * Generate a signed upload URL for direct client-to-GCS upload.
 * @param {string} userId - Authenticated user ID.
 * @param {string} fileType - "video" or "audio".
 * @param {string} contentType - MIME type.
 * @returns {Object} { signedUrl, objectKey, expiresAt, maxSizeBytes }
 */
async function generateUploadUrl(userId, fileType, contentType) {
  // Validate file type
  if (fileType === 'video') {
    if (!ALLOWED_VIDEO_TYPES.includes(contentType)) {
      throw new ValidationError(`Invalid content type for video. Allowed: ${ALLOWED_VIDEO_TYPES.join(', ')}`);
    }
  } else if (fileType === 'audio') {
    if (!ALLOWED_AUDIO_TYPES.includes(contentType)) {
      throw new ValidationError(`Invalid content type for audio. Allowed: ${ALLOWED_AUDIO_TYPES.join(', ')}`);
    }
  } else {
    throw new ValidationError('fileType must be "video" or "audio"');
  }

  if (!env.GCS_BUCKET) {
    throw new ServiceUnavailableError('Cloud storage not configured');
  }

  const ext = getExtension(contentType);
  const objectKey = `gifts/${userId}/${generateRequestId()}.${ext}`;
  const maxSizeBytes = fileType === 'video' ? MAX_VIDEO_SIZE : MAX_AUDIO_SIZE;
  const expiresAt = new Date(Date.now() + UPLOAD_EXPIRY_MS).toISOString();

  try {
    const { Storage } = require('@google-cloud/storage');
    const storage = new Storage({ projectId: env.GCS_PROJECT_ID });
    const bucket = storage.bucket(env.GCS_BUCKET);
    const file = bucket.file(objectKey);

    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + UPLOAD_EXPIRY_MS,
      contentType,
      extensionHeaders: {
        'x-goog-content-length-range': `0,${maxSizeBytes}`,
      },
    });

    return { signedUrl, objectKey, expiresAt, maxSizeBytes };
  } catch (err) {
    console.error('GCS signed URL generation failed:', err.message);
    throw new ServiceUnavailableError('Failed to generate upload URL');
  }
}

/**
 * Generate a signed download URL for a GCS object.
 * @param {string} objectKey - GCS object key.
 * @returns {Object} { signedUrl, expiresAt }
 */
async function generateDownloadUrl(objectKey) {
  if (!env.GCS_BUCKET || !objectKey) {
    return null;
  }

  try {
    const { Storage } = require('@google-cloud/storage');
    const storage = new Storage({ projectId: env.GCS_PROJECT_ID });
    const bucket = storage.bucket(env.GCS_BUCKET);
    const file = bucket.file(objectKey);

    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + DOWNLOAD_EXPIRY_MS,
    });

    return {
      signedUrl,
      expiresAt: new Date(Date.now() + DOWNLOAD_EXPIRY_MS).toISOString(),
    };
  } catch (err) {
    console.error('GCS download URL generation failed:', err.message);
    return null;
  }
}

module.exports = {
  generateUploadUrl,
  generateDownloadUrl,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_AUDIO_TYPES,
};
