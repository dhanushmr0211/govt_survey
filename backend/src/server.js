const { createApp } = require('./app');
const { env } = require('./config/env');
const { pool } = require('./config/db');
const { startWorker } = require('./jobs/issueEscalator');

try {
  const app = createApp();
  const port = process.env.PORT || env.port || 3000;

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${port} (${env.nodeEnv})`);
    startWorker();
  });

  // Attach shutdown handlers to the server instance
  process.on('SIGTERM', () => shutdown('SIGTERM', server));
  process.on('SIGINT', () => shutdown('SIGINT', server));
} catch (error) {
  console.error('❌ FATAL: Server failed to start:', error.message);
  process.exit(1);
}

// ── Graceful shutdown ───────────────────────────────────────────────
const SHUTDOWN_TIMEOUT_MS = 10_000;

async function shutdown(signal, server) {
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

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  // Uncaught exceptions should generally lead to process termination
  process.exit(1);
});

