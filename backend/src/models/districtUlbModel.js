const { query, dbStorage, tgplPool } = require('../config/db');

async function searchUlbs(searchTerm) {
  const isTgpl = dbStorage.getStore() === tgplPool;
  if (isTgpl) {
    const result = await query(
      `SELECT w.id, w.name, 'Ward' as type, 'Wards' as district_name
       FROM wards w
       WHERE w.name ILIKE $1 AND w.is_deleted = FALSE
       ORDER BY w.name
       LIMIT 20`,
      [`%${searchTerm}%`]
    );
    return result.rows;
  }

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
  const isTgpl = dbStorage.getStore() === tgplPool;
  if (isTgpl) {
    const wards = await query(
      'SELECT id, name FROM wards WHERE is_deleted = FALSE ORDER BY name'
    );
    return {
      districts: [{ id: 1, name: 'Wards' }],
      ulbs: wards.rows.map(w => ({ id: w.id, name: w.name, district_id: 1 }))
    };
  }

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
