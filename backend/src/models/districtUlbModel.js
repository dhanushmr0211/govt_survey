const { query } = require('../config/db');

async function searchUlbs(searchTerm) {
  const result = await query(
    `SELECT u.id, u.name, u.type, d.name as district_name 
     FROM ulbs u
     JOIN districts d ON u.district_id = d.id
     WHERE u.name ILIKE $1
     ORDER BY u.name <-> $2
     LIMIT 20`,
    [`%${searchTerm}%`, searchTerm]
  );
  return result.rows;
}

async function getProjectStructure(projectId) {
  const districts = await query(
    'SELECT id, name FROM districts WHERE project_id = $1 ORDER BY name',
    [projectId]
  );
  const ulbs = await query(
    `SELECT u.id, u.name, u.district_id 
     FROM ulbs u
     JOIN districts d ON u.district_id = d.id
     WHERE d.project_id = $1
     ORDER BY u.name`,
    [projectId]
  );
  return {
    districts: districts.rows,
    ulbs: ulbs.rows
  };
}

module.exports = { searchUlbs, getProjectStructure };
