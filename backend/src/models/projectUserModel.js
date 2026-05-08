const { query } = require('../config/db');

/**
 * Check if a user is a member of a specific project, and return their project_role.
 */
async function isMember(userId, projectId) {
  const result = await query(
    'SELECT project_role FROM project_users WHERE user_id = $1 AND project_id = $2 LIMIT 1',
    [userId, projectId]
  );
  return result.rows[0] || null;
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
 * Add or update a user's role in a project.
 */
async function addUserToProject(userId, projectId, projectRole) {
  const result = await query(
    `INSERT INTO project_users (user_id, project_id, project_role)
     VALUES ($1, $2, $3)
     ON CONFLICT (project_id, user_id) 
     DO UPDATE SET project_role = EXCLUDED.project_role, assigned_at = NOW()
     RETURNING id, project_id, user_id, project_role`,
    [userId, projectId, projectRole]
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

module.exports = { isMember, getProjectIds, addUserToProject, removeUserFromProject };
