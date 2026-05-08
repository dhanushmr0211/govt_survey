const { query } = require('../../../config/db');

async function searchUlbs(projectId, searchTerm) {
  const result = await query(
    `SELECT u.id, u.name, u.type, d.name as district_name 
     FROM ulbs u
     JOIN districts d ON u.district_id = d.id
     WHERE u.project_id = $1 AND u.name ILIKE $2 AND u.is_deleted = FALSE AND d.is_deleted = FALSE
     ORDER BY u.name <-> $3
     LIMIT 20`,
    [projectId, `%${searchTerm}%`, searchTerm]
  );
  return result.rows;
}

module.exports = { searchUlbs };
