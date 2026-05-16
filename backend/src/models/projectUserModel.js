const { query } = require('../config/db');

/**
 * Check if a user is a member of a specific project, and return their project_role and sections.
 */
async function isMember(userId, projectId) {
  const result = await query(
    `SELECT project_role, section_a, section_b, section_c, section_d, section_e, section_f, section_g, section_h, section_i,
            district_scope, ulb_scope
     FROM project_users 
     WHERE user_id = $1 AND project_id = $2 LIMIT 1`,
    [userId, projectId]
  );
  return result.rows[0] || null;
}

/**
 * Return all projects that a user belongs to, including their role and sections for each.
 */
async function getProjectsWithRoles(userId) {
  const result = await query(
    `SELECT p.id, p.name, p.project_type, pu.project_role, 
            pu.section_a, pu.section_b, pu.section_c, pu.section_d, 
            pu.section_e, pu.section_f, pu.section_g, pu.section_h, pu.section_i,
            pu.district_scope, pu.ulb_scope
     FROM project_users pu
     JOIN projects p ON pu.project_id = p.id
     WHERE pu.user_id = $1 AND p.is_deleted = FALSE`,
    [userId]
  );
  return result.rows;
}

/**
 * Return all project IDs that a user belongs to.
 */
async function getProjectIds(userId) {
  const result = await query(
    'SELECT project_id FROM project_users WHERE user_id = $1',
    [userId]
  );
  return result.rows.map((row) => row.project_id);
}

/**
 * Add or update a user's role and sections in a project.
 */
async function addUserToProject(userId, projectId, projectRole, sections = {}) {
  const result = await query(
    `INSERT INTO project_users (
        user_id, project_id, project_role, 
        section_a, section_b, section_c, section_d, 
        section_e, section_f, section_g, section_h, section_i,
        district_scope, ulb_scope
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (project_id, user_id) 
      DO UPDATE SET 
        project_role = EXCLUDED.project_role,
        section_a = EXCLUDED.section_a,
        section_b = EXCLUDED.section_b,
        section_c = EXCLUDED.section_c,
        section_d = EXCLUDED.section_d,
        section_e = EXCLUDED.section_e,
        section_f = EXCLUDED.section_f,
        section_g = EXCLUDED.section_g,
        section_h = EXCLUDED.section_h,
        section_i = EXCLUDED.section_i,
        district_scope = EXCLUDED.district_scope,
        ulb_scope = EXCLUDED.ulb_scope,
        assigned_at = NOW()
      RETURNING *`,
    [
      userId, projectId, projectRole,
      sections.section_a || false, sections.section_b || false, 
      sections.section_c || false, sections.section_d || false,
      sections.section_e || false, sections.section_f || false, 
      sections.section_g || false, sections.section_h || false, sections.section_i || false,
      JSON.stringify(sections.district_scope || []),
      JSON.stringify(sections.ulb_scope || [])
    ]
  );
  return result.rows[0] || null;
}

/**
 * Remove a user from a project.
 */
async function removeUserFromProject(userId, projectId) {
  const result = await query(
    'DELETE FROM project_users WHERE user_id = $1 AND project_id = $2 RETURNING id',
    [userId, projectId]
  );
  return result.rowCount > 0;
}

module.exports = { isMember, getProjectsWithRoles, getProjectIds, addUserToProject, removeUserFromProject };
