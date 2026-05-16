const { query } = require('./src/config/db');

async function migrate() {
  try {
    console.log('Adding section_i to project_users...');
    await query(`
      ALTER TABLE project_users 
      ADD COLUMN IF NOT EXISTS section_i BOOLEAN DEFAULT FALSE;
    `);
    console.log('Migration successful.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
