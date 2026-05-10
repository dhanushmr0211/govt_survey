const { query } = require('../config/db');

async function check() {
  const spRes = await query("SELECT id, project_id, status, created_by, created_at FROM switch_points");
  console.log('All Switch Points:', spRes.rows);
  
  const poleRes = await query("SELECT id, project_id, switch_point_id, status, created_by, created_at FROM poles");
  console.log('All Poles:', poleRes.rows);
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
