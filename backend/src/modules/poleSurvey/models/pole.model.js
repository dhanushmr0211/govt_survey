const { query } = require('../../../config/db');

async function createPole(projectId, data, createdBy) {
  const result = await query(
    `INSERT INTO poles
      (project_id, switch_point_id, latitude, longitude, ward_number, switch_point_number, conductor_type, pole_number, pole_type, pole_height_mtrs, pole_condition, pole_to_pole_distance_mtrs, arm_type, arm_status, present_arm_no, present_arm_length_mtrs, how_many_lights_in_pole, light_mounting_height, light_type, light_capacity, light_working_status, road_category, road_type, road_width_mtrs, pole_earthing_exists, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
     RETURNING *`,
    [projectId, data.switch_point_id, data.latitude, data.longitude, data.ward_number, data.switch_point_number, data.conductor_type, data.pole_number, data.pole_type, data.pole_height_mtrs, data.pole_condition, data.pole_to_pole_distance_mtrs, data.arm_type, data.arm_status, data.present_arm_no, data.present_arm_length_mtrs, data.how_many_lights_in_pole, data.light_mounting_height, data.light_type, data.light_capacity, data.light_working_status, data.road_category, data.road_type, data.road_width_mtrs, data.pole_earthing_exists, createdBy]
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
  const result = await query(
    `UPDATE poles 
     SET ward_number = COALESCE($3, ward_number),
         switch_point_number = COALESCE($4, switch_point_number),
         conductor_type = COALESCE($5, conductor_type),
         pole_number = COALESCE($6, pole_number),
         pole_type = COALESCE($7, pole_type),
         pole_height_mtrs = COALESCE($8, pole_height_mtrs),
         pole_condition = COALESCE($9, pole_condition),
         pole_to_pole_distance_mtrs = COALESCE($10, pole_to_pole_distance_mtrs),
         arm_type = COALESCE($11, arm_type),
         arm_status = COALESCE($12, arm_status),
         present_arm_no = COALESCE($13, present_arm_no),
         present_arm_length_mtrs = COALESCE($14, present_arm_length_mtrs),
         how_many_lights_in_pole = COALESCE($15, how_many_lights_in_pole),
         light_mounting_height = COALESCE($16, light_mounting_height),
         light_type = COALESCE($17, light_type),
         light_capacity = COALESCE($18, light_capacity),
         light_working_status = COALESCE($19, light_working_status),
         road_category = COALESCE($20, road_category),
         road_type = COALESCE($21, road_type),
         road_width_mtrs = COALESCE($22, road_width_mtrs),
         pole_earthing_exists = COALESCE($23, pole_earthing_exists),
         updated_at = NOW()
     WHERE id = $1 AND project_id = $2 AND is_deleted IS NOT TRUE
     RETURNING *`,
    [id, projectId, data.ward_number, data.switch_point_number, data.conductor_type, data.pole_number, data.pole_type, data.pole_height_mtrs, data.pole_condition, data.pole_to_pole_distance_mtrs, data.arm_type, data.arm_status, data.present_arm_no, data.present_arm_length_mtrs, data.how_many_lights_in_pole, data.light_mounting_height, data.light_type, data.light_capacity, data.light_working_status, data.road_category, data.road_type, data.road_width_mtrs, data.pole_earthing_exists]
  );
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
