const { query } = require('../config/db');

async function check() {
  try {
    const result = await query("SELECT * FROM admin_section_access LIMIT 1");
    console.log('Table exists, rows:', result.rows);
  } catch (error) {
    console.error('Error checking table:', error.message);
  }
  process.exit(0);
}

check();
