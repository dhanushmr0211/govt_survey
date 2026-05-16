const { query } = require('./src/config/db');

async function migrate() {
  console.log('🚀 Starting scope columns migration...');
  try {
    // Add district_scope column
    await query(`
      ALTER TABLE project_users 
      ADD COLUMN IF NOT EXISTS district_scope JSONB DEFAULT NULL
    `);
    console.log('✅ Added district_scope column');

    // Add ulb_scope column
    await query(`
      ALTER TABLE project_users 
      ADD COLUMN IF NOT EXISTS ulb_scope JSONB DEFAULT NULL
    `);
    console.log('✅ Added ulb_scope column');

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit();
  }
}

migrate();
