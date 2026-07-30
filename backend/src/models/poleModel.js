const { query, dbStorage, tgplPool } = require('../config/db');

async function createPole(rawData) {
  const data = { ...rawData };
  for (const key in data) {
    if (data[key] === '') {
      data[key] = null;
    }
  }
  const isTgpl = dbStorage.getStore() === tgplPool;
  if (isTgpl) {
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
        req_led_wattage, req_dedicated_wire, created_by,
        survey_type, light_type_3, light_capacity_3, light_type_4, light_capacity_4, light_type_5, light_capacity_5
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25,
        $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35,
        $36, $37, $38, $39, $40,
        $41, $42, $43, $44, $45, $46, $47
      ) RETURNING *`,
      [
        data.project_id,
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
        data.created_by,
        data.survey_type || 'survey',
        data.light_type_3,
        data.light_capacity_3,
        data.light_type_4,
        data.light_capacity_4,
        data.light_type_5,
        data.light_capacity_5
      ]
    );
    return result.rows[0];
  }

  const result = await query(
    `INSERT INTO poles
      (project_id, switch_point_id, latitude, longitude, ward_number, switch_point_number, conductor_type, pole_number, pole_type, pole_height_mtrs, pole_condition, pole_to_pole_distance_mtrs, arm_type, arm_status, present_arm_no, present_arm_length_mtrs, how_many_lights_in_pole, light_mounting_height, light_type, light_capacity, light_type_2, light_capacity_2, light_working_status, road_category, road_type, road_width_mtrs, pole_earthing_exists, created_by, offline_submission_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
     RETURNING *`,
    [
      data.project_id,
      data.switch_point_id,
      data.latitude,
      data.longitude,
      data.ward_number,
      data.switch_point_number,
      data.conductor_type,
      data.pole_number,
      data.pole_type,
      data.pole_height_mtrs,
      data.pole_condition,
      data.pole_to_pole_distance_mtrs,
      data.arm_type,
      data.arm_status,
      data.present_arm_no,
      data.present_arm_length_mtrs,
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
      data.created_by,
      data.offline_submission_id || null
    ]
  );
  return result.rows[0];
}

module.exports = { createPole };
