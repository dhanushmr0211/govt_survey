const { query } = require('../config/db');

async function check() {
  const res = await query("SELECT id, project_id, status, created_by, created_at FROM switch_points");
  console.log('All Switch Points:', res.rows);
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
