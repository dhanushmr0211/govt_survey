const { query } = require('../../../config/db');

async function createCcms(projectId, data, createdBy) {
  const result = await query(
    `INSERT INTO tgpl2_ccms_points (
      project_id, ward_id, dtc_number, ward_number, dtc_capacity, ccms_number, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      projectId,
      data.ward_id,
      data.dtc_number,
      data.ward_number,
      data.dtc_capacity,
      data.ccms_number,
      createdBy
    ]
  );
  return result.rows[0];
}

async function getCcmsByWard(projectId, wardId) {
  const result = await query(
    `SELECT * FROM tgpl2_ccms_points 
     WHERE project_id = $1 AND ward_id = $2 AND is_deleted IS NOT TRUE
     ORDER BY created_at DESC`,
    [projectId, wardId]
  );
  return result.rows;
}

async function getLastCcmsByWard(projectId, wardId) {
  const result = await query(
    `SELECT * FROM tgpl2_ccms_points 
     WHERE project_id = $1 AND ward_id = $2 AND is_deleted IS NOT TRUE
     ORDER BY created_at DESC LIMIT 1`,
    [projectId, wardId]
  );
  return result.rows[0];
}

module.exports = {
  createCcms,
  getCcmsByWard,
  getLastCcmsByWard
};
