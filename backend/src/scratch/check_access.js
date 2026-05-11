const { query } = require('../config/db');

async function run() {
  try {
    const result = await query('SELECT * FROM admin_section_access WHERE admin_id = 10');
    console.log(result.rows[0]);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

run();
