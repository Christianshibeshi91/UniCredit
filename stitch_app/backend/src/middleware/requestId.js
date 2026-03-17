'use strict';

const { generateRequestId } = require('../utils/crypto');

/**
 * Middleware to generate a UUID v4 request ID for every request.
 * The ID is attached to req.requestId and included in the response header.
 */
function requestIdMiddleware(req, res, next) {
  const id = req.headers['x-request-id'] || generateRequestId();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

module.exports = requestIdMiddleware;
