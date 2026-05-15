const { pool } = require('./src/config/db');

async function fixAdminSectionAccess() {
  try {
    console.log('Adding UNIQUE constraint to admin_id in admin_section_access...');
    // We add the unique constraint so the ON CONFLICT clause works properly.
    await pool.query('ALTER TABLE admin_section_access ADD CONSTRAINT admin_section_access_admin_id_key UNIQUE (admin_id);');
    console.log('Constraint added successfully.');
  } catch (error) {
    if (error.code === '42P07' || error.message.includes('already exists')) {
      console.log('Constraint already exists.');
    } else {
      console.error('Migration failed:', error);
    }
  } finally {
    await pool.end();
  }
}

fixAdminSectionAccess();
