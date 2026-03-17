'use strict';

const { env, validateEnv } = require('./config/env');

// Validate environment variables before anything else (fail-secure)
validateEnv();

const app = require('./app');
const { initializeRedis, closeRedis } = require('./config/redis');

// Import jobs
const giftExpirationJob = require('./jobs/giftExpiration.job');
const scheduledDeliveryJob = require('./jobs/scheduledDelivery.job');
const sessionCleanupJob = require('./jobs/sessionCleanup.job');
const { closeAll: closeJobs } = require('./jobs/queue');

/**
 * Server startup sequence:
 * 1. Validate environment (already done above -- would have crashed if invalid)
 * 2. Initialize Redis connection
 * 3. Initialize background jobs
 * 4. Start HTTP server
 */
async function start() {
  try {
    // Initialize Redis
    await initializeRedis();

    // Initialize background jobs (in-process for MVP)
    giftExpirationJob.initialize();
    scheduledDeliveryJob.initialize();
    sessionCleanupJob.initialize();

    // Start HTTP server
    const server = app.listen(env.PORT, () => {
      console.log(`UniCredit API v3.0.0 running on port ${env.PORT}`);
      console.log(`  Environment: ${env.NODE_ENV}`);
      console.log(`  Base URL: ${env.BASE_URL}`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        try {
          await closeJobs();
          await closeRedis();
          console.log('Shutdown complete');
          process.exit(0);
        } catch (err) {
          console.error('Error during shutdown:', err.message);
          process.exit(1);
        }
      });

      // Force exit after 30 seconds
      setTimeout(() => {
        console.error('Forced shutdown after 30s timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Catch unhandled rejections and uncaught exceptions
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection:', reason);
      // Do not crash -- log and continue
    });

    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err);
      // Crash on uncaught exceptions -- the process is in an undefined state
      process.exit(1);
    });

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
