const { query } = require('../config/db');

async function findById(id) {
  const result = await query('SELECT id, name, email, role, phone, avatar_url, created_at, is_deleted FROM users WHERE id = $1 AND is_deleted IS NOT TRUE', [id]);
  return result.rows[0] || null;
}

async function findByEmail(email) {
  const result = await query('SELECT id, name, email, password, role, phone, avatar_url FROM users WHERE email = $1 AND is_deleted IS NOT TRUE', [email]);
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
  const result = await query('SELECT COUNT(*)::int AS total FROM users WHERE is_deleted IS NOT TRUE');
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
           COALESCE(asa.section_h, false) AS section_h,
           COALESCE(asa.section_i, false) AS section_i,
           COALESCE(asa.section_j, false) AS section_j
    FROM users u
    LEFT JOIN admin_section_access asa ON u.id = asa.admin_id
    WHERE u.is_deleted IS NOT TRUE
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
     WHERE u.role = 'MOBILE_USER' AND pu.project_id = ANY($1) AND u.is_deleted IS NOT TRUE
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
            pu.project_role AS project_role,
            COALESCE(pu.section_a, false) AS section_a,
            COALESCE(pu.section_b, false) AS section_b,
            COALESCE(pu.section_c, false) AS section_c,
            COALESCE(pu.section_d, false) AS section_d,
            COALESCE(pu.section_e, false) AS section_e,
            COALESCE(pu.section_f, false) AS section_f,
            COALESCE(pu.section_g, false) AS section_g,
            COALESCE(pu.section_h, false) AS section_h,
            COALESCE(pu.section_i, false) AS section_i,
            COALESCE(pu.section_j, false) AS section_j,
            pu.district_scope,
            pu.ulb_scope
     FROM users u
     JOIN project_users pu ON u.id = pu.user_id
     LEFT JOIN admin_section_access asa ON u.id = asa.admin_id
     WHERE pu.project_id = $1 AND u.is_deleted IS NOT TRUE
     ORDER BY u.id DESC`,
    [projectId]
  );
  return result.rows;
}

async function changePassword(id, passwordHash) {
  const result = await query(
    'UPDATE users SET password = $2, updated_at = NOW() WHERE id = $1 RETURNING id',
    [id, passwordHash]
  );
  return result.rows[0] || null;
}

async function updateAvatar(id, avatarUrl) {
  const result = await query(
    'UPDATE users SET avatar_url = $2, updated_at = NOW() WHERE id = $1 RETURNING id, avatar_url',
    [id, avatarUrl]
  );
  return result.rows[0] || null;
}

module.exports = { findById, findByEmail, create, findAll, countAll, softDelete, findMobileUsersByProjects, touch, findByProject, changePassword, updateAvatar };
