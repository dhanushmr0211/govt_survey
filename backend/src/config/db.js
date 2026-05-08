const { Pool } = require('pg');
const { env } = require('./env');

const basePoolOptions = {
  max: 50,
  min: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
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
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

module.exports = { pool, query };
