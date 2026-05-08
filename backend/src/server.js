const { createApp } = require('./app');
const { env } = require('./config/env');
const { pool } = require('./config/db');
const { startWorker } = require('./jobs/issueEscalator');

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`Server running on port ${env.port} (${env.nodeEnv})`);
  startWorker();
});

// ── Graceful shutdown ───────────────────────────────────────────────
const SHUTDOWN_TIMEOUT_MS = 10_000;

async function shutdown(signal) {
  console.log(`\n${signal} received — starting graceful shutdown…`);

  // Stop accepting new connections
  server.close(async () => {
    console.log('HTTP server closed');

    try {
      await pool.end();
      console.log('Database pool drained');
    } catch (err) {
      console.error('Error draining database pool:', err);
    }

    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    console.error(`Shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms — forcing exit`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  // Let the process continue but log for debugging
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception — shutting down:', err);
  shutdown('uncaughtException');
});

