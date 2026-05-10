const { query } = require('../config/db');

async function check() {
  const userRes = await query("SELECT id, name, role FROM users WHERE name ILIKE '%SANGAMESH%'");
  console.log('Users found:', userRes.rows);
  
  if (userRes.rows.length > 0) {
    const userId = userRes.rows[0].id;
    const projectRes = await query("SELECT * FROM project_users WHERE user_id = $1", [userId]);
    console.log('Project assignments:', projectRes.rows);
  }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
