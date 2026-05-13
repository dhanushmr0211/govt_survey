const { query } = require('../config/db');

async function createSwitchPoint(data) {
  const result = await query(
    `INSERT INTO switch_points
      (project_id, ulb_id, ward_number, switch_point_number, latitude, longitude, switch_point_type, meter_exists, meter_type, meter_rr_number, meter_serial_number, meter_condition, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      data.project_id,
      data.ulb_id,
      data.ward_number,
      data.switch_point_number,
      data.latitude,
      data.longitude,
      data.switch_point_type,
      data.meter_exists,
      data.meter_type,
      data.meter_rr_number,
      data.meter_serial_number,
      data.meter_condition,
      data.created_by
    ]
  );
  return result.rows[0];
}

module.exports = { createSwitchPoint };
