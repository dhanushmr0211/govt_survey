const { query } = require('../../../config/db');

async function createPole(projectId, data, createdBy) {
  const result = await query(
    `INSERT INTO poles (
      project_id, ward_id, latitude, longitude, ward_number,
      dtc_number, dtc_capacity, ccms_number, meter_type, meter_rr_number,
      meter_serial_number, meter_dimensional_status, conductor_type, pole_number, pole_type,
      pole_height, pole_to_pole_distance, arm_type, arm_status, present_arm_no,
      present_arm_length, how_many_lights_in_pole, light_mounting_height, light_type, light_capacity,
      light_type_2, light_capacity_2,
      light_working_status, road_category, road_type, road_width_mtrs, pole_earthing_exists,
      image_url_1, image_url_2, req_arm_number, req_arm_length, req_led_lights_no,
      req_led_wattage, req_dedicated_wire, created_by
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15,
      $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25,
      $26, $27, $28, $29, $30,
      $31, $32, $33, $34, $35,
      $36, $37, $38, $39, $40
    ) RETURNING *`,
    [
      projectId,
      data.ward_id,
      data.latitude,
      data.longitude,
      data.ward_number,
      data.dtc_number,
      data.dtc_capacity,
      data.ccms_number,
      data.meter_type,
      data.meter_rr_number,
      data.meter_serial_number,
      data.meter_dimensional_status,
      data.conductor_type,
      data.pole_number,
      data.pole_type,
      data.pole_height,
      data.pole_to_pole_distance,
      data.arm_type,
      data.arm_status,
      data.present_arm_no,
      data.present_arm_length,
      data.how_many_lights_in_pole,
      data.light_mounting_height,
      data.light_type,
      data.light_capacity,
      data.light_type_2,
      data.light_capacity_2,
      data.light_working_status,
      data.road_category,
      data.road_type,
      data.road_width_mtrs,
      data.pole_earthing_exists,
      data.image_url_1,
      data.image_url_2,
      data.req_arm_number,
      data.req_arm_length,
      data.req_led_lights_no,
      data.req_led_wattage,
      data.req_dedicated_wire,
      createdBy
    ]
  );
  return result.rows[0];
}

async function getPoles(projectId, status, limit, offset) {
  const result = await query(
    `SELECT p.*, w.name as ulb_name,
            p.ccms_number as sp_number, 
            NULL as switch_point_type, 
            NULL::boolean as meter_exists, 
            p.meter_type, 
            p.meter_rr_number, 
            p.meter_serial_number, 
            p.meter_dimensional_status as meter_condition
     FROM poles p
     JOIN wards w ON p.ward_id = w.id
     WHERE p.project_id = $1 AND p.status = $2 AND p.is_deleted IS NOT TRUE 
     ORDER BY p.created_at DESC LIMIT $3 OFFSET $4`,
    [projectId, status, limit, offset]
  );
  return result.rows;
}

async function updatePole(id, projectId, data) {
  const result = await query(
    `UPDATE poles 
     SET ward_id = COALESCE($3, ward_id),
         ward_number = COALESCE($4, ward_number),
         dtc_number = COALESCE($5, dtc_number),
         dtc_capacity = COALESCE($6, dtc_capacity),
         ccms_number = COALESCE($7, ccms_number),
         meter_type = COALESCE($8, meter_type),
         meter_rr_number = COALESCE($9, meter_rr_number),
         meter_serial_number = COALESCE($10, meter_serial_number),
         meter_dimensional_status = COALESCE($11, meter_dimensional_status),
         conductor_type = COALESCE($12, conductor_type),
         pole_number = COALESCE($13, pole_number),
         pole_type = COALESCE($14, pole_type),
         pole_height = COALESCE($15, pole_height),
         pole_to_pole_distance = COALESCE($16, pole_to_pole_distance),
         arm_type = COALESCE($17, arm_type),
         arm_status = COALESCE($18, arm_status),
         present_arm_no = COALESCE($19, present_arm_no),
         present_arm_length = COALESCE($20, present_arm_length),
         how_many_lights_in_pole = COALESCE($21, how_many_lights_in_pole),
         light_mounting_height = COALESCE($22, light_mounting_height),
         light_type = COALESCE($23, light_type),
         light_capacity = COALESCE($24, light_capacity),
         light_type_2 = COALESCE($25, light_type_2),
         light_capacity_2 = COALESCE($26, light_capacity_2),
         light_working_status = COALESCE($27, light_working_status),
         road_category = COALESCE($28, road_category),
         road_type = COALESCE($29, road_type),
         road_width_mtrs = COALESCE($30, road_width_mtrs),
         pole_earthing_exists = COALESCE($31, pole_earthing_exists),
         req_arm_number = COALESCE($32, req_arm_number),
         req_arm_length = COALESCE($33, req_arm_length),
         req_led_lights_no = COALESCE($34, req_led_lights_no),
         req_led_wattage = COALESCE($35, req_led_wattage),
         req_dedicated_wire = COALESCE($36, req_dedicated_wire),
         image_url_1 = COALESCE($37, image_url_1),
         image_url_2 = COALESCE($38, image_url_2),
         updated_at = NOW()
     WHERE id = $1 AND project_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [
      id,
      projectId,
      data.ward_id,
      data.ward_number,
      data.dtc_number,
      data.dtc_capacity,
      data.ccms_number,
      data.meter_type,
      data.meter_rr_number,
      data.meter_serial_number,
      data.meter_dimensional_status,
      data.conductor_type,
      data.pole_number,
      data.pole_type,
      data.pole_height,
      data.pole_to_pole_distance,
      data.arm_type,
      data.arm_status,
      data.present_arm_no,
      data.present_arm_length,
      data.how_many_lights_in_pole,
      data.light_mounting_height,
      data.light_type,
      data.light_capacity,
      data.light_type_2,
      data.light_capacity_2,
      data.light_working_status,
      data.road_category,
      data.road_type,
      data.road_width_mtrs,
      data.pole_earthing_exists,
      data.req_arm_number,
      data.req_arm_length,
      data.req_led_lights_no,
      data.req_led_wattage,
      data.req_dedicated_wire,
      data.image_url_1,
      data.image_url_2
    ]
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
