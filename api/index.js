'use strict';

// Vercel serverless function that wraps the Express app.
// All /api/* requests are routed here by vercel.json rewrites.
const app = require('../stitch_app/backend/src/app');

module.exports = app;
