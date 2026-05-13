const { query } = require('../config/db');

async function run() {
  const result = await query("SELECT id, role FROM users WHERE name = 'DHANUSH M R'");
  console.log(result.rows);
}

run();
