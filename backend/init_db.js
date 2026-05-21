const fs = require('fs');
const path = require('path');
const { pool } = require('./src/config/db');
const { env } = require('./src/config/env');

async function initDb() {
  console.log('🔍 Checking database connection safety...');
  
  // Strict Safety Checks
  const host = (env.dbHost || '').trim();
  const dbName = (env.dbName || '').trim();
  
  console.log(`- DB Host configured: "${host}"`);
  console.log(`- DB Name configured: "${dbName}"`);
  console.log(`- SSL configured: ${env.dbSsl}`);

  // 1. Block the known production database IP explicitly
  if (host === '8.231.74.223') {
    console.error('\n❌ ERROR: TARGET DATABASE IS THE PRODUCTION CLOUD SQL HOST (8.231.74.223)!');
    console.error('Operation aborted to protect production data. Please change your .env file to point to a local database.\n');
    process.exit(1);
  }

  // 2. Block any host that is not local, local container, or localhost/127.0.0.1
  const allowedLocalHosts = ['localhost', '127.0.0.1', 'db', 'localhost.localdomain', '::1'];
  const isLocalHost = allowedLocalHosts.includes(host.toLowerCase()) || host === '';
  
  if (!isLocalHost) {
    console.error(`\n❌ ERROR: TARGET DATABASE HOST "${host}" IS NOT A RECOGNIZED LOCAL HOST!`);
    console.error('For safety, init_db.js can only be run on local databases (localhost, 127.0.0.1, or "db" for Docker).\n');
    process.exit(1);
  }

  // 3. Make sure we don't accidentally run it in production environment
  if (env.nodeEnv === 'production') {
    console.error('\n❌ ERROR: NODE_ENV IS SET TO "production"!');
    console.error('Operation aborted for safety.\n');
    process.exit(1);
  }

  console.log('✅ Safety checks passed! Proceeding with database initialization...');

  try {
    const schemaPath = path.join(__dirname, 'sql', 'schema.sql');
    const seedPath = path.join(__dirname, 'sql', 'seed.sql');

    console.log(`\n📖 Reading ${schemaPath}...`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log(`📖 Reading ${seedPath}...`);
    const seedSql = fs.readFileSync(seedPath, 'utf8');

    console.log('\n🔨 Applying schema.sql...');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Execute the multi-statement schema SQL
      await client.query(schemaSql);
      console.log('✅ Schema applied successfully.');

      console.log('🌱 Applying seed.sql...');
      // Execute the multi-statement seed SQL
      await client.query(seedSql);
      console.log('✅ Seed data applied successfully.');
      
      await client.query('COMMIT');
      console.log('\n🎉 Local database initialized and seeded successfully!');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('\n❌ Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDb();
