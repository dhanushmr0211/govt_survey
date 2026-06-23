const { pool } = require('../config/db');
const query = (text, params) => pool.query(text, params);

async function setSectionAccess(userId, sectionA, sectionB, sectionC, sectionD = false, sectionE = false, sectionF = false, sectionG = false, sectionH = false, sectionI = false, sectionJ = false, sectionK = false) {
  const result = await query(
    `INSERT INTO admin_section_access (admin_id, section_a, section_b, section_c, section_d, section_e, section_f, section_g, section_h, section_i, section_j, section_k) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
     ON CONFLICT (admin_id) 
     DO UPDATE SET 
       section_a = EXCLUDED.section_a, 
       section_b = EXCLUDED.section_b, 
       section_c = EXCLUDED.section_c, 
       section_d = EXCLUDED.section_d, 
       section_e = EXCLUDED.section_e, 
       section_f = EXCLUDED.section_f, 
       section_g = EXCLUDED.section_g, 
       section_h = EXCLUDED.section_h, 
       section_i = EXCLUDED.section_i, 
       section_j = EXCLUDED.section_j, 
       section_k = EXCLUDED.section_k 
     RETURNING *`,
    [userId, sectionA, sectionB, sectionC, sectionD, sectionE, sectionF, sectionG, sectionH, sectionI, sectionJ, sectionK]
  );
  return result.rows[0];
}

async function getSectionAccess(userId) {
  const result = await query('SELECT section_a, section_b, section_c, section_d, section_e, section_f, section_g, section_h, section_i, section_j, section_k FROM admin_section_access WHERE admin_id = $1', [userId]);
  return result.rows[0] || { section_a: false, section_b: false, section_c: false, section_d: false, section_e: false, section_f: false, section_g: false, section_h: false, section_i: false, section_j: false, section_k: false };
}

module.exports = { setSectionAccess, getSectionAccess };
