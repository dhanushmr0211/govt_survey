const { pool } = require('./src/config/db');

async function runMigration() {
  try {
    console.log('Adding deleted_by column...');
    await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_by INT REFERENCES users(id) ON DELETE SET NULL;');

    console.log('Adding unique constraint on name...');
    try {
      await pool.query('ALTER TABLE projects ADD CONSTRAINT projects_name_key UNIQUE (name);');
    } catch (e) {
      if (e.code === '42P07' || e.message.includes('already exists')) {
        console.log('Unique constraint already exists.');
      } else {
        throw e;
      }
    }

    console.log('Creating indexes...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_projects_is_deleted ON projects(is_deleted);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(project_type);');

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
