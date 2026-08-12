const { query } = require('../../../config/db');

async function createSwitchPoint(projectId, data, createdBy) {
  const result = await query(
    `INSERT INTO tgpl2_switch_points (
      project_id, ward_id, ccms_id, switch_point_number, meter_status, meter_type, rr_number, serial_number, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      projectId,
      data.ward_id,
      data.ccms_id,
      data.switch_point_number,
      data.meter_status,
      data.meter_type,
      data.rr_number,
      data.serial_number,
      createdBy
    ]
  );
  return result.rows[0];
}

async function getSwitchPointsByCcms(projectId, ccmsId) {
  const result = await query(
    `SELECT * FROM tgpl2_switch_points 
     WHERE project_id = $1 AND ccms_id = $2 AND is_deleted IS NOT TRUE
     ORDER BY created_at DESC`,
    [projectId, ccmsId]
  );
  return result.rows;
}

async function getLastSwitchPointByCcms(projectId, ccmsId) {
  const result = await query(
    `SELECT * FROM tgpl2_switch_points 
     WHERE project_id = $1 AND ccms_id = $2 AND is_deleted IS NOT TRUE
     ORDER BY created_at DESC LIMIT 1`,
    [projectId, ccmsId]
  );
  return result.rows[0];
}

module.exports = {
  createSwitchPoint,
  getSwitchPointsByCcms,
  getLastSwitchPointByCcms
};
