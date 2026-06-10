const { query } = require('../../../config/db');

async function createPole(projectId, data, createdBy) {
  const result = await query(
    `INSERT INTO poles
      (project_id, switch_point_id, latitude, longitude, ward_number, switch_point_number, conductor_type, pole_number, pole_type, pole_height_mtrs, pole_condition, pole_to_pole_distance_mtrs, arm_type, arm_status, present_arm_no, present_arm_length_mtrs, how_many_lights_in_pole, light_mounting_height, light_type, light_capacity, light_type_2, light_capacity_2, light_working_status, road_category, road_type, road_width_mtrs, pole_earthing_exists, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
     RETURNING *`,
    [projectId, data.switch_point_id, data.latitude, data.longitude, data.ward_number, data.switch_point_number, data.conductor_type, data.pole_number, data.pole_type, data.pole_height_mtrs, data.pole_condition, data.pole_to_pole_distance_mtrs, data.arm_type, data.arm_status, data.present_arm_no, data.present_arm_length_mtrs, data.how_many_lights_in_pole, data.light_mounting_height, data.light_type, data.light_capacity, data.light_type_2, data.light_capacity_2, data.light_working_status, data.road_category, data.road_type, data.road_width_mtrs, data.pole_earthing_exists, createdBy]
  );
  return result.rows[0];
}

async function getPoles(projectId, status, limit, offset) {
  const result = await query(
    `SELECT p.*, u.name as ulb_name,
            sp.switch_point_number as sp_number, 
            sp.switch_point_type, 
            sp.meter_exists, 
            sp.meter_type, 
            sp.meter_rr_number, 
            sp.meter_serial_number, 
            sp.meter_condition
     FROM poles p
     JOIN switch_points sp ON p.switch_point_id = sp.id
     JOIN ulbs u ON sp.ulb_id = u.id
     WHERE p.project_id = $1 AND p.status = $2 AND p.is_deleted IS NOT TRUE 
     ORDER BY p.created_at DESC LIMIT $3 OFFSET $4`,
    [projectId, status, limit, offset]
  );
  return result.rows;
}

async function updatePole(id, projectId, data) {
  const allowedFields = [
    'ward_number', 'switch_point_number', 'conductor_type', 'pole_number', 'pole_type',
    'pole_height_mtrs', 'pole_condition', 'pole_to_pole_distance_mtrs', 'arm_type',
    'arm_status', 'present_arm_no', 'present_arm_length_mtrs', 'how_many_lights_in_pole',
    'light_mounting_height', 'light_type', 'light_capacity', 'light_type_2',
    'light_capacity_2', 'light_working_status', 'road_category', 'road_type',
    'road_width_mtrs', 'pole_earthing_exists', 'switch_point_id', 'latitude', 'longitude'
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
      `SELECT * FROM poles WHERE id = $1 AND project_id = $2 AND is_deleted IS NOT TRUE`,
      [id, projectId]
    );
    return existing.rows[0];
  }

  const queryText = `
    UPDATE poles 
    SET ${setClauses.join(', ')}, updated_at = NOW()
    WHERE id = $1 AND project_id = $2 AND is_deleted IS NOT TRUE
    RETURNING *
  `;

  const result = await query(queryText, values);
  return result.rows[0];
}

async function confirmPole(id, projectId, userId) {
  const result = await query(
    `UPDATE poles 
     SET status = 'CONFIRMED', confirmed_by = $3, confirmed_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND project_id = $2 AND is_deleted IS NOT TRUE
     RETURNING *`,
    [id, projectId, userId]
  );
  return result.rows[0];
}

module.exports = { createPole, getPoles, updatePole, confirmPole };
