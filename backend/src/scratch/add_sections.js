const { query } = require('../config/db');

async function run() {
  try {
    await query('ALTER TABLE admin_section_access ADD COLUMN IF NOT EXISTS section_e BOOLEAN DEFAULT FALSE');
    await query('ALTER TABLE admin_section_access ADD COLUMN IF NOT EXISTS section_f BOOLEAN DEFAULT FALSE');
    console.log('Columns added successfully!');
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

run();
