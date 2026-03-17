'use strict';

const { createQueue, createWorker } = require('./queue');
const giftService = require('../services/gift.service');

const QUEUE_NAME = 'scheduled-delivery';

/**
 * Scheduled Delivery Job
 * Runs every 5 minutes.
 * Finds pending gifts with scheduled_at <= now and sends notifications.
 */

let queue = null;

function initialize() {
  queue = createQueue(QUEUE_NAME);
  if (!queue) return;

  // Create worker
  createWorker(QUEUE_NAME, async (job) => {
    console.log(`Processing scheduled delivery job ${job.id}...`);

    const result = await giftService.processScheduledDeliveries();

    console.log(`Scheduled delivery complete: ${result.delivered} gifts delivered`);
    return result;
  }, {
    concurrency: 1,
  });

  // Schedule every 5 minutes
  queue.add('check-scheduled', {}, {
    repeat: {
      pattern: '*/5 * * * *', // Every 5 minutes
    },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 30000, // 30 seconds
    },
  }).catch((err) => {
    console.error('Failed to schedule delivery job:', err.message);
  });

  console.log('Scheduled delivery job initialized (every 5 minutes)');
}

module.exports = { initialize, QUEUE_NAME };
