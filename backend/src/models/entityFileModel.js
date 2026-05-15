const { query } = require('../config/db');

async function createEntityFile(projectId, entityType, entityId, url, uploadedBy) {
  const result = await query(
    `INSERT INTO entity_files (project_id, entity_type, entity_id, url, uploaded_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [projectId, entityType, entityId, url, uploadedBy]
  );
  return result.rows[0];
}

async function getFilesForEntity(projectId, entityType, entityId) {
  const result = await query(
    'SELECT * FROM entity_files WHERE project_id = $1 AND entity_type = $2 AND entity_id = $3 ORDER BY uploaded_at DESC',
    [projectId, entityType, entityId]
  );
  return result.rows;
}

async function getFileById(id) {
  const result = await query(
    'SELECT * FROM entity_files WHERE id = $1',
    [id]
  );
  return result.rows[0];
}

async function deleteEntityFile(id) {
  const result = await query(
    'DELETE FROM entity_files WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0];
}

module.exports = { createEntityFile, getFilesForEntity, getFileById, deleteEntityFile };
