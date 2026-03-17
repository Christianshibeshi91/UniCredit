'use strict';

const { createQueue, createWorker } = require('./queue');

const QUEUE_NAME = 'session-cleanup';

/**
 * Session Cleanup Job
 * Runs hourly.
 * Safety net: Redis TTL handles processed session expiration automatically.
 * This job cleans up orphaned BullMQ completed jobs older than 7 days.
 */

let queue = null;

function initialize() {
  queue = createQueue(QUEUE_NAME);
  if (!queue) return;

  // Create worker
  createWorker(QUEUE_NAME, async (job) => {
    console.log(`Processing session cleanup job ${job.id}...`);

    // BullMQ auto-removes completed jobs based on queue config (removeOnComplete).
    // This job serves as a safety net for any manual cleanup needed.

    // Clean up old completed jobs from all queues
    const { queues: allQueues } = require('./queue');
    let cleaned = 0;

    for (const [name, q] of Object.entries(allQueues)) {
      try {
        const removed = await q.clean(7 * 24 * 60 * 60 * 1000, 1000, 'completed');
        cleaned += removed.length;
      } catch (err) {
        console.error(`Failed to clean queue ${name}:`, err.message);
      }
    }

    console.log(`Session cleanup complete: ${cleaned} old jobs removed`);
    return { cleaned };
  }, {
    concurrency: 1,
  });

  // Schedule hourly
  queue.add('hourly-cleanup', {}, {
    repeat: {
      pattern: '0 * * * *', // Top of every hour
    },
    attempts: 1,
  }).catch((err) => {
    console.error('Failed to schedule session cleanup job:', err.message);
  });

  console.log('Session cleanup job scheduled (hourly)');
}

module.exports = { initialize, QUEUE_NAME };
