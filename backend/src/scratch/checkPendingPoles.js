const { query } = require('../config/db');

async function check() {
  const poleSql = `
    SELECT 
      'pole' as type,
      p.*,
      u.name as user_name,
      sp.ward_number,
      p.pole_number as identifier
    FROM poles p
    JOIN switch_points sp ON p.switch_point_id = sp.id
    JOIN users u ON p.created_by = u.id
    WHERE p.project_id = $1 AND p.status = 'PENDING' AND p.is_deleted = FALSE
  `;
  const res = await query(poleSql, [2]);
  console.log('Pending Poles:', res.rows);
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
