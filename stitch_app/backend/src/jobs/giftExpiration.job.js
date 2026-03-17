'use strict';

const { createQueue, createWorker } = require('./queue');
const giftService = require('../services/gift.service');

const QUEUE_NAME = 'gift-expiration';

/**
 * Gift Expiration Job
 * Runs daily at 02:00 UTC.
 * Finds pending gifts that have expired, sets status to expired,
 * and refunds the sender's balance.
 */

let queue = null;

function initialize() {
  queue = createQueue(QUEUE_NAME);
  if (!queue) return;

  // Create worker
  createWorker(QUEUE_NAME, async (job) => {
    console.log(`Processing gift expiration job ${job.id}...`);

    const result = await giftService.processExpiredGifts();

    console.log(`Gift expiration complete: ${result.expired} gifts expired, ${result.refunded} refunded`);
    return result;
  }, {
    concurrency: 1,
  });

  // Schedule daily at 02:00 UTC
  queue.add('daily-expiration', {}, {
    repeat: {
      pattern: '0 2 * * *', // Cron: daily at 02:00
    },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000, // 1 minute
    },
  }).catch((err) => {
    console.error('Failed to schedule gift expiration job:', err.message);
  });

  console.log('Gift expiration job scheduled (daily at 02:00 UTC)');
}

module.exports = { initialize, QUEUE_NAME };
