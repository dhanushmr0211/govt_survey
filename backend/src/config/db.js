const pg = require('pg');
const { Pool } = pg;

// Override parsing for type 1114 (timestamp without time zone)
// to interpret database strings as UTC instead of local timezone
pg.types.setTypeParser(1114, function(stringValue) {
  return new Date(stringValue + 'Z');
});

const { env } = require('./env');
const { AsyncLocalStorage } = require('async_hooks');

const dbStorage = new AsyncLocalStorage();

const basePoolOptions = {
  max: env.nodeEnv === 'production' ? 15 : 50,
  min: env.nodeEnv === 'production' ? 1 : 5,
  idleTimeoutMillis: env.nodeEnv === 'production' ? 10_000 : 30_000,
  connectionTimeoutMillis: 30_000,
  statement_timeout: 60_000, // Increase statement timeout to 60s for large reports
  allowExitOnIdle: env.nodeEnv === 'production',
};

// 1. Default (I-DECK / govt_survey) Pool
const pool = env.cloudSqlConnectionName
  ? new Pool({
      ...basePoolOptions,
      host: `/cloudsql/${env.cloudSqlConnectionName}`,
      user: env.dbUser,
      password: env.dbPassword,
      database: env.dbName,
      port: 5432,
      ssl: false,
    })
  : env.dbHost
  ? new Pool({
      ...basePoolOptions,
      host: env.dbHost,
      port: env.dbPort,
      user: env.dbUser,
      password: env.dbPassword,
      database: env.dbName,
      ssl: env.dbSsl ? { rejectUnauthorized: false } : false,
    })
  : new Pool({
      ...basePoolOptions,
      connectionString: env.databaseUrl,
      ssl: env.dbSsl ? { rejectUnauthorized: false } : false,
    });

// 2. TGPL (tgpl_survey) Pool
const tgplPool = env.cloudSqlConnectionName
  ? new Pool({
      ...basePoolOptions,
      host: `/cloudsql/${env.cloudSqlConnectionName}`,
      user: env.dbUser,
      password: env.dbPassword,
      database: 'tgpl_survey',
      port: 5432,
      ssl: false,
    })
  : env.dbHost
  ? new Pool({
      ...basePoolOptions,
      host: env.dbHost,
      port: env.dbPort,
      user: env.dbUser,
      password: env.dbPassword,
      database: 'tgpl_survey',
      ssl: env.dbSsl ? { rejectUnauthorized: false } : false,
    })
  : new Pool({
      ...basePoolOptions,
      connectionString: env.databaseUrl ? env.databaseUrl.replace(/\/[^/]+$/, '/tgpl_survey') : undefined,
      ssl: env.dbSsl ? { rejectUnauthorized: false } : false,
    });

// Context-aware Query Function
async function query(text, params) {
  const start = Date.now();
  // Get active pool from AsyncLocalStorage context, fall back to default pool
  const activePool = dbStorage.getStore() || pool;
  const client = await activePool.connect();
  try {
    const res = await client.query(text, params);
    const duration = Date.now() - start;
    if (duration > 500) {
      console.warn(`[SLOW QUERY] ${duration}ms - Query: ${text.replace(/\s+/g, ' ').trim()}`);
    }
    return res;
  } finally {
    client.release();
  }
}

module.exports = { pool, tgplPool, dbStorage, query };

