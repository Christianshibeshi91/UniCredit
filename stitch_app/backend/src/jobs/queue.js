'use strict';

const { getRedisClient, isRedisEnabled } = require('../config/redis');

let Queue, Worker;

try {
  const bullmq = require('bullmq');
  Queue = bullmq.Queue;
  Worker = bullmq.Worker;
} catch {
  // BullMQ not installed -- jobs disabled
}

const queues = {};
const workers = {};

/**
 * Create a BullMQ queue.
 * @param {string} name - Queue name.
 * @returns {Object|null} BullMQ Queue instance or null if Redis not available.
 */
function createQueue(name) {
  if (!Queue || !isRedisEnabled()) {
    console.log(`Queue ${name}: skipped (Redis or BullMQ not available)`);
    return null;
  }

  const redis = getRedisClient();
  const queue = new Queue(name, {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });

  queues[name] = queue;
  return queue;
}

/**
 * Create a BullMQ worker.
 * @param {string} name - Queue name to process.
 * @param {Function} processor - Job processor function.
 * @param {Object} [options] - Worker options.
 * @returns {Object|null} BullMQ Worker instance or null.
 */
function createWorker(name, processor, options = {}) {
  if (!Worker || !isRedisEnabled()) {
    console.log(`Worker ${name}: skipped (Redis or BullMQ not available)`);
    return null;
  }

  const redis = getRedisClient();
  const worker = new Worker(name, processor, {
    connection: redis,
    concurrency: options.concurrency || 1,
    ...options,
  });

  worker.on('completed', (job) => {
    console.log(`Job ${name}:${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${name}:${job?.id} failed:`, err.message);
  });

  workers[name] = worker;
  return worker;
}

/**
 * Close all queues and workers gracefully.
 */
async function closeAll() {
  for (const [name, worker] of Object.entries(workers)) {
    try {
      await worker.close();
      console.log(`Worker ${name} closed`);
    } catch (err) {
      console.error(`Error closing worker ${name}:`, err.message);
    }
  }

  for (const [name, queue] of Object.entries(queues)) {
    try {
      await queue.close();
      console.log(`Queue ${name} closed`);
    } catch (err) {
      console.error(`Error closing queue ${name}:`, err.message);
    }
  }
}

module.exports = {
  createQueue,
  createWorker,
  closeAll,
  queues,
  workers,
};
