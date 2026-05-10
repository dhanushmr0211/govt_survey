const { query } = require('../config/db');

async function check() {
  const spSql = `
    SELECT 
      'switch_point' as type,
      sp.*,
      u.name as user_name,
      sp.switch_point_number as identifier
    FROM switch_points sp
    JOIN users u ON sp.created_by = u.id
    WHERE sp.project_id = $1 AND sp.status = 'PENDING' AND sp.is_deleted = FALSE
  `;
  const res = await query(spSql, [2]);
  console.log('Pending Submissions:', res.rows);
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
