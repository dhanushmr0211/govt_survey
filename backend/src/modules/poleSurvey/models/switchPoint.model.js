const { query } = require('../../../config/db');

async function createSwitchPoint(projectId, data, createdBy) {
  const result = await query(
    `INSERT INTO switch_points
      (project_id, ulb_id, ward_number, switch_point_number, latitude, longitude, switch_point_type, meter_exists, meter_type, meter_rr_number, meter_serial_number, meter_condition, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [projectId, data.ulb_id, data.ward_number, data.switch_point_number, data.latitude, data.longitude, data.switch_point_type, data.meter_exists, data.meter_type, data.meter_rr_number, data.meter_serial_number, data.meter_condition, createdBy]
  );
  return result.rows[0];
}

async function getSwitchPoints(projectId, status, limit, offset) {
  const result = await query(
    `SELECT * FROM switch_points WHERE project_id = $1 AND status = $2 AND is_deleted = FALSE ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
    [projectId, status, limit, offset]
  );
  return result.rows;
}

async function updateSwitchPoint(id, projectId, data) {
  const result = await query(
    `UPDATE switch_points 
     SET ward_number = COALESCE($3, ward_number),
         switch_point_number = COALESCE($4, switch_point_number),
         switch_point_type = COALESCE($5, switch_point_type),
         meter_exists = COALESCE($6, meter_exists),
         meter_type = COALESCE($7, meter_type),
         meter_rr_number = COALESCE($8, meter_rr_number),
         meter_serial_number = COALESCE($9, meter_serial_number),
         meter_condition = COALESCE($10, meter_condition),
         updated_at = NOW()
     WHERE id = $1 AND project_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [id, projectId, data.ward_number, data.switch_point_number, data.switch_point_type, data.meter_exists, data.meter_type, data.meter_rr_number, data.meter_serial_number, data.meter_condition]
  );
  return result.rows[0];
}

async function confirmSwitchPoint(id, projectId, userId) {
  const result = await query(
    `UPDATE switch_points 
     SET status = 'CONFIRMED', confirmed_by = $3, confirmed_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND project_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [id, projectId, userId]
  );
  return result.rows[0];
}

async function getSwitchPointsByWard(projectId, ulbId, wardNumber) {
  const result = await query(
    `SELECT id, switch_point_number FROM switch_points WHERE project_id = $1 AND ulb_id = $2 AND ward_number = $3 AND is_deleted = FALSE ORDER BY created_at DESC LIMIT 10`,
    [projectId, ulbId, wardNumber]
  );
  return result.rows;
}

module.exports = { createSwitchPoint, getSwitchPoints, updateSwitchPoint, confirmSwitchPoint, getSwitchPointsByWard };
