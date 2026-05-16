const { Pool } = require('pg');
const { env } = require('./env');

const basePoolOptions = {
  max: 50,
  min: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 30_000, // increased from 10s to 30s
  statement_timeout: 30_000, // kill queries running longer than 30s
  allowExitOnIdle: false,
};

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

async function query(text, params) {
  const start = Date.now();
  const client = await pool.connect();
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

module.exports = { pool, query };
