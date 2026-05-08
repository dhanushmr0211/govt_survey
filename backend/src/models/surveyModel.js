const { query } = require('../config/db');

const BASE_COLUMNS = 'id, project_id, mobile_user_id, latitude, longitude, pole_number, ward_number, rr_number, status, confirmed_by, confirmed_at, created_at';

async function countAll() {
  const result = await query('SELECT COUNT(*)::int AS total FROM survey_records');
  return result.rows[0].total;
}

async function countByProjectIds(projectIds) {
  if (!projectIds || projectIds.length === 0) return 0;
  const result = await query(
    'SELECT COUNT(*)::int AS total FROM survey_records WHERE project_id = ANY($1)',
    [projectIds]
  );
  return result.rows[0].total;
}

async function findAllSurveys(limit, offset) {
  const result = await query(
    `SELECT ${BASE_COLUMNS} FROM survey_records ORDER BY id DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

async function findByProjectIds(projectIds, limit, offset) {
  if (!projectIds || projectIds.length === 0) {
    return [];
  }
  const result = await query(
    `SELECT ${BASE_COLUMNS} FROM survey_records WHERE project_id = ANY($1) ORDER BY id DESC LIMIT $2 OFFSET $3`,
    [projectIds, limit, offset]
  );
  return result.rows;
}

async function findById(id) {
  const result = await query(
    `SELECT ${BASE_COLUMNS} FROM survey_records WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function createSurveyRecord(data) {
  const result = await query(
    `INSERT INTO survey_records
      (project_id, mobile_user_id, latitude, longitude, pole_number, ward_number, rr_number, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${BASE_COLUMNS}`,
    [
      data.project_id,
      data.mobile_user_id ?? null,
      data.latitude ?? null,
      data.longitude ?? null,
      data.pole_number ?? null,
      data.ward_number ?? null,
      data.rr_number ?? null,
      data.status,
    ]
  );

  return result.rows[0];
}

async function confirmSurveyRecord(id, confirmedBy) {
  const result = await query(
    `UPDATE survey_records
     SET status = 'CONFIRMED', confirmed_by = $2, confirmed_at = NOW()
     WHERE id = $1
     RETURNING ${BASE_COLUMNS}`,
    [id, confirmedBy]
  );
  return result.rows[0] || null;
}

async function updateStatus(id, status) {
  const result = await query(
    `UPDATE survey_records
     SET status = $2
     WHERE id = $1
     RETURNING id, status`,
    [id, status]
  );
  return result.rows[0] || null;
}

module.exports = { findAllSurveys, findByProjectIds, findById, createSurveyRecord, confirmSurveyRecord, updateStatus, countAll, countByProjectIds };
