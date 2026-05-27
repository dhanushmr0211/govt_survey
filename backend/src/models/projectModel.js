const { pool } = require('../config/db');
const query = (text, params) => pool.query(text, params);

async function countAll() {
  const result = await query('SELECT COUNT(*)::int AS total FROM projects WHERE is_deleted IS NOT TRUE');
  return result.rows[0].total;
}

async function countByIds(projectIds) {
  if (!projectIds || projectIds.length === 0) return 0;
  const result = await query(
    'SELECT COUNT(*)::int AS total FROM projects WHERE id = ANY($1) AND is_deleted IS NOT TRUE',
    [projectIds]
  );
  return result.rows[0].total;
}

async function findAll(limit, offset) {
  const result = await query(
    'SELECT id, name, project_type, created_at, updated_at FROM projects WHERE is_deleted IS NOT TRUE ORDER BY id DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  return result.rows;
}

async function findByIds(projectIds, limit, offset) {
  if (!projectIds || projectIds.length === 0) {
    return [];
  }
  const result = await query(
    'SELECT id, name, project_type, created_at, updated_at FROM projects WHERE id = ANY($1) AND is_deleted IS NOT TRUE ORDER BY id DESC LIMIT $2 OFFSET $3',
    [projectIds, limit, offset]
  );
  return result.rows;
}

async function findById(id) {
  const result = await query('SELECT id, name, project_type, created_at, updated_at FROM projects WHERE id = $1 AND is_deleted IS NOT TRUE', [id]);
  return result.rows[0] || null;
}

async function create(name, projectType, createdBy = null) {
  const result = await query(
    'INSERT INTO projects (name, project_type, created_by) VALUES ($1, $2, $3) RETURNING id, name, project_type',
    [name, projectType, createdBy]
  );
  return result.rows[0];
}

async function softDelete(id, deletedBy = null) {
  const result = await query(
    'UPDATE projects SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $2 WHERE id = $1 RETURNING id',
    [id, deletedBy]
  );
  return result.rows[0] || null;
}

module.exports = { findAll, findByIds, findById, create, countAll, countByIds, softDelete };
