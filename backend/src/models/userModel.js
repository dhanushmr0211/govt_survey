const { query } = require('../config/db');

async function findById(id) {
  const result = await query('SELECT id, name, email, role, phone, created_at, is_deleted FROM users WHERE id = $1 AND is_deleted = FALSE', [id]);
  return result.rows[0] || null;
}

async function findByEmail(email) {
  const result = await query('SELECT id, name, email, password, role, phone FROM users WHERE email = $1 AND is_deleted = FALSE', [email]);
  return result.rows[0] || null;
}

async function create(name, email, passwordHash, role, createdBy = null, phone = null) {
  const result = await query(
    'INSERT INTO users (name, email, password, role, created_by, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role, phone',
    [name, email, passwordHash, role, createdBy, phone]
  );
  return result.rows[0];
}

async function countAll() {
  const result = await query('SELECT COUNT(*)::int AS total FROM users WHERE is_deleted = FALSE');
  return result.rows[0].total;
}

async function findAll(limit, offset) {
  let sql = `
    SELECT u.id, u.name, u.email, u.role, u.created_at,
           COALESCE(asa.section_a, false) AS section_a,
           COALESCE(asa.section_b, false) AS section_b,
           COALESCE(asa.section_c, false) AS section_c,
           COALESCE(asa.section_d, false) AS section_d,
           COALESCE(asa.section_e, false) AS section_e,
           COALESCE(asa.section_f, false) AS section_f,
           COALESCE(asa.section_g, false) AS section_g,
           COALESCE(asa.section_h, false) AS section_h
    FROM users u
    LEFT JOIN admin_section_access asa ON u.id = asa.admin_id
    WHERE u.is_deleted = FALSE
    ORDER BY u.id DESC
  `;
  
  const params = [];
  if (limit !== undefined) {
    sql += ' LIMIT $1';
    params.push(limit);
    if (offset !== undefined) {
      sql += ' OFFSET $2';
      params.push(offset);
    }
  }
  
  const result = await query(sql, params);
  return result.rows;
}

async function softDelete(id) {
  const result = await query(
    'UPDATE users SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows[0] || null;
}

async function findMobileUsersByProjects(projectIds) {
  const result = await query(
    `SELECT DISTINCT u.id, u.name, u.email, u.role, u.created_at 
     FROM users u
     JOIN project_users pu ON pu.user_id = u.id
     WHERE u.role = 'MOBILE_USER' AND pu.project_id = ANY($1) AND u.is_deleted = FALSE
     ORDER BY u.id DESC`,
    [projectIds]
  );
  return result.rows;
}

async function touch(id) {
  const result = await query(
    'UPDATE users SET updated_at = NOW() WHERE id = $1 RETURNING id, updated_at',
    [id]
  );
  return result.rows[0] || null;
}

async function findByProject(projectId) {
  const result = await query(
    `SELECT u.id, u.name, u.email, u.role, u.created_at,
            COALESCE(asa.section_a, false) AS section_a,
            COALESCE(asa.section_b, false) AS section_b,
            COALESCE(asa.section_c, false) AS section_c,
            COALESCE(asa.section_d, false) AS section_d,
            COALESCE(asa.section_e, false) AS section_e,
            COALESCE(asa.section_f, false) AS section_f,
            COALESCE(asa.section_g, false) AS section_g,
            COALESCE(asa.section_h, false) AS section_h
     FROM users u
     JOIN project_users pu ON u.id = pu.user_id
     LEFT JOIN admin_section_access asa ON u.id = asa.admin_id
     WHERE pu.project_id = $1 AND u.is_deleted = FALSE
     ORDER BY u.id DESC`,
    [projectId]
  );
  return result.rows;
}

module.exports = { findById, findByEmail, create, findAll, countAll, softDelete, findMobileUsersByProjects, touch, findByProject };
