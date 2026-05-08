const { query } = require('../config/db');

async function create(recordId, bucketName, objectName, contentType) {
  const result = await query(
    `INSERT INTO survey_images (record_id, bucket_name, object_name, content_type)
     VALUES ($1, $2, $3, $4)
     RETURNING id, record_id, bucket_name, object_name, content_type, created_at`,
    [recordId, bucketName, objectName, contentType]
  );
  return result.rows[0];
}

async function findById(id) {
  const result = await query(
    'SELECT id, record_id, bucket_name, object_name, content_type, created_at FROM survey_images WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function countByRecordId(recordId) {
  const result = await query(
    'SELECT COUNT(*)::int AS total FROM survey_images WHERE record_id = $1',
    [recordId]
  );
  return result.rows[0].total;
}

async function findByRecordId(recordId, limit, offset) {
  const result = await query(
    'SELECT id, record_id, bucket_name, object_name, content_type, created_at FROM survey_images WHERE record_id = $1 ORDER BY id DESC LIMIT $2 OFFSET $3',
    [recordId, limit, offset]
  );
  return result.rows;
}

async function deleteById(id) {
  const result = await query('DELETE FROM survey_images WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
}

async function findAll() {
  const result = await query('SELECT id, record_id, bucket_name, object_name, content_type, created_at FROM survey_images ORDER BY id DESC');
  return result.rows;
}

module.exports = { create, findById, findByRecordId, deleteById, findAll, countByRecordId };
