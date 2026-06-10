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
    `SELECT * FROM switch_points WHERE project_id = $1 AND status = $2 AND is_deleted IS NOT TRUE ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
    [projectId, status, limit, offset]
  );
  return result.rows;
}

async function updateSwitchPoint(id, projectId, data) {
  const allowedFields = [
    'ward_number', 'switch_point_number', 'switch_point_type', 'meter_exists',
    'meter_type', 'meter_rr_number', 'meter_serial_number', 'meter_condition',
    'ulb_id', 'latitude', 'longitude'
  ];

  const setClauses = [];
  const values = [id, projectId];
  let paramIndex = 3;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      setClauses.push(`${field} = $${paramIndex++}`);
      const val = data[field] === '' ? null : data[field];
      values.push(val);
    }
  }

  if (setClauses.length === 0) {
    const existing = await query(
      `SELECT * FROM switch_points WHERE id = $1 AND project_id = $2 AND is_deleted IS NOT TRUE`,
      [id, projectId]
    );
    return existing.rows[0];
  }

  const queryText = `
    UPDATE switch_points 
    SET ${setClauses.join(', ')}, updated_at = NOW()
    WHERE id = $1 AND project_id = $2 AND is_deleted IS NOT TRUE
    RETURNING *
  `;

  const result = await query(queryText, values);
  return result.rows[0];
}

async function confirmSwitchPoint(id, projectId, userId) {
  const result = await query(
    `UPDATE switch_points 
     SET status = 'CONFIRMED', confirmed_by = $3, confirmed_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND project_id = $2 AND is_deleted IS NOT TRUE
     RETURNING *`,
    [id, projectId, userId]
  );
  return result.rows[0];
}

async function getSwitchPointsByWard(projectId, ulbId, wardNumber) {
  const result = await query(
    `SELECT id, switch_point_number FROM switch_points WHERE project_id = $1 AND ulb_id = $2 AND ward_number = $3 AND is_deleted IS NOT TRUE ORDER BY created_at DESC LIMIT 10`,
    [projectId, ulbId, wardNumber]
  );
  return result.rows;
}

module.exports = { createSwitchPoint, getSwitchPoints, updateSwitchPoint, confirmSwitchPoint, getSwitchPointsByWard };
