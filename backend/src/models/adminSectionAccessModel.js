const { query } = require('../config/db');

async function setSectionAccess(userId, sectionA, sectionB, sectionC, sectionD = false, sectionE = false, sectionF = false) {
  const existing = await query('SELECT 1 FROM admin_section_access WHERE admin_id = $1', [userId]);
  if (existing.rows.length > 0) {
    const result = await query(
      'UPDATE admin_section_access SET section_a = $2, section_b = $3, section_c = $4, section_d = $5, section_e = $6, section_f = $7 WHERE admin_id = $1 RETURNING *',
      [userId, sectionA, sectionB, sectionC, sectionD, sectionE, sectionF]
    );
    return result.rows[0];
  } else {
    const result = await query(
      'INSERT INTO admin_section_access (admin_id, section_a, section_b, section_c, section_d, section_e, section_f) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [userId, sectionA, sectionB, sectionC, sectionD, sectionE, sectionF]
    );
    return result.rows[0];
  }
}

async function getSectionAccess(userId) {
  const result = await query('SELECT section_a, section_b, section_c, section_d, section_e, section_f FROM admin_section_access WHERE admin_id = $1', [userId]);
  return result.rows[0] || { section_a: false, section_b: false, section_c: false, section_d: false, section_e: false, section_f: false };
}

module.exports = { setSectionAccess, getSectionAccess };
