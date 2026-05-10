const { query } = require('../config/db');

async function setSectionAccess(userId, sectionA, sectionB, sectionC, sectionD = false) {
  const result = await query(
    'INSERT INTO admin_section_access (admin_id, section_a, section_b, section_c, section_d) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [userId, sectionA, sectionB, sectionC, sectionD]
  );
  return result.rows[0];
}

async function getSectionAccess(userId) {
  const result = await query('SELECT section_a, section_b, section_c, section_d FROM admin_section_access WHERE admin_id = $1', [userId]);
  return result.rows[0] || { section_a: false, section_b: false, section_c: false, section_d: false };
}

module.exports = { setSectionAccess, getSectionAccess };
