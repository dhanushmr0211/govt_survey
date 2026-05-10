const { query } = require('../config/db');

async function run() {
  try {
    console.log('Adding section_d column...');
    await query('ALTER TABLE admin_section_access ADD COLUMN section_d BOOLEAN DEFAULT FALSE');
    console.log('Column added successfully');
  } catch (error) {
    console.error('Failed to add column:', error);
  }
  process.exit(0);
}

run();
