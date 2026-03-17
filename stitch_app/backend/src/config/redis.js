'use strict';

const { env } = require('./env');

let redisClient = null;
let redisEnabled = false;

/**
 * Initialize Redis client using ioredis.
 * Graceful degradation in development if Redis is not available.
 * Mandatory in production (validated by env.js).
 */
async function initializeRedis() {
  if (env.isTest) {
    return { redisClient: null, redisEnabled: false };
  }

  if (!env.REDIS_URL) {
    console.log('Redis: No REDIS_URL set, running without Redis');
    return { redisClient: null, redisEnabled: false };
  }

  try {
    const Redis = require('ioredis');
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    await redisClient.connect();
    redisEnabled = true;
    console.log('Redis connected');
  } catch (err) {
    console.error('Redis connection error:', err.message);
    if (env.isProduction) {
      process.exit(1);
    }
    redisClient = null;
  }

  return { redisClient, redisEnabled };
}

/**
 * Get the Redis client. May be null if Redis is not available.
 * @returns {import('ioredis').Redis|null}
 */
function getRedisClient() {
  return redisClient;
}

function isRedisEnabled() {
  return redisEnabled;
}

/**
 * Set the Redis client (for dependency injection in tests).
 */
function setRedisClient(client) {
  redisClient = client;
  redisEnabled = !!client;
}

/**
 * Graceful shutdown.
 */
async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
  }
}

module.exports = {
  initializeRedis,
  getRedisClient,
  isRedisEnabled,
  setRedisClient,
  closeRedis,
};
