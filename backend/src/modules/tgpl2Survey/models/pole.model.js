const { query } = require('../../../config/db');

async function createPole(projectId, data, createdBy) {
  const result = await query(
    `INSERT INTO tgpl2_poles (
      project_id, ward_id, ward_number, ccms_id, switch_point_id, switch_point_number,
      dtc_number, dtc_capacity, ccms_number, meter_type, meter_rr_number,
      meter_serial_number, meter_dimensional_status, conductor_type, pole_number,
      pole_type, pole_height, pole_condition, pole_to_pole_distance, arm_type,
      arm_status, present_arm_no, present_arm_length, how_many_lights_in_pole,
      light_mounting_height, light_type, light_capacity, light_type_2,
      light_capacity_2, light_working_status, road_category, road_type,
      road_width_mtrs, pole_earthing_exists, pole_defective, arm_deteriorated,
      image_url_1, image_url_2, latitude, longitude, req_arm_number,
      req_arm_length, req_led_lights_no, req_led_wattage, req_dedicated_wire,
      created_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11,
      $12, $13, $14, $15,
      $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25,
      $26, $27, $28, $29,
      $30, $31, $32, $33,
      $34, $35, $36, $37,
      $38, $39, $40, $41,
      $42, $43, $44, $45, $46,
      $47
    ) RETURNING *`,
    [
      projectId,
      data.ward_id,
      data.ward_number || null,
      data.ccms_id,
      data.switch_point_id,
      data.switch_point_number || null,
      data.dtc_number || null,
      data.dtc_capacity || null,
      data.ccms_number || null,
      data.meter_type || null,
      data.meter_rr_number || null,
      data.meter_serial_number || null,
      data.meter_dimensional_status || null,
      data.conductor_type || null,
      data.pole_number,
      data.pole_type || null,
      data.pole_height || null,
      data.pole_condition || null,
      data.pole_to_pole_distance ?? data.distance_mtrs ?? null,
      data.arm_type || null,
      data.arm_status || null,
      data.present_arm_no || null,
      data.present_arm_length || null,
      data.how_many_lights_in_pole ?? data.how_many_lights ?? null,
      data.light_mounting_height || null,
      data.light_type || null,
      data.light_capacity || null,
      data.light_type_2 || null,
      data.light_capacity_2 || null,
      data.light_working_status || null,
      data.road_category || null,
      data.road_type || null,
      data.road_width_mtrs ?? data.road_width ?? null,
      data.pole_earthing_exists || null,
      data.pole_defective || false,
      data.arm_deteriorated || false,
      data.image_url_1 || null,
      data.image_url_2 || null,
      data.latitude,
      data.longitude,
      data.req_arm_number || null,
      data.req_arm_length || null,
      data.req_led_lights_no || null,
      data.req_led_wattage || null,
      data.req_dedicated_wire || null,
      createdBy
    ]
  );
  return result.rows[0];
}

async function getPoles(projectId, status, limit, offset) {
  const result = await query(
    `SELECT p.*, w.name as ward_name, c.ccms_number, sp.switch_point_number
     FROM tgpl2_poles p
     LEFT JOIN tgpl2_wards w ON p.ward_id = w.id
     LEFT JOIN tgpl2_ccms_points c ON p.ccms_id = c.id
     LEFT JOIN tgpl2_switch_points sp ON p.switch_point_id = sp.id
     WHERE p.project_id = $1 AND COALESCE(UPPER(p.status), 'PENDING') = UPPER($2) AND p.is_deleted IS NOT TRUE
     ORDER BY p.created_at DESC LIMIT $3 OFFSET $4`,
    [projectId, status, limit, offset]
  );
  return result.rows;
}

async function updatePole(id, projectId, data) {
  const allowedFields = [
    'ward_id', 'ward_number', 'ccms_id', 'switch_point_id', 'switch_point_number',
    'dtc_number', 'dtc_capacity', 'ccms_number', 'meter_type', 'meter_rr_number',
    'meter_serial_number', 'meter_dimensional_status', 'conductor_type', 'pole_number',
    'pole_type', 'pole_height', 'pole_condition', 'pole_to_pole_distance', 'arm_type',
    'arm_status', 'present_arm_no', 'present_arm_length', 'how_many_lights_in_pole',
    'light_mounting_height', 'light_type', 'light_capacity', 'light_type_2',
    'light_capacity_2', 'light_working_status', 'road_category', 'road_type',
    'road_width_mtrs', 'pole_earthing_exists', 'pole_defective', 'arm_deteriorated',
    'image_url_1', 'image_url_2', 'latitude', 'longitude', 'req_arm_number',
    'req_arm_length', 'req_led_lights_no', 'req_led_wattage', 'req_dedicated_wire', 'status'
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
      `SELECT * FROM tgpl2_poles WHERE id = $1 AND project_id = $2 AND is_deleted = FALSE`,
      [id, projectId]
    );
    return existing.rows[0];
  }

  const queryText = `
    UPDATE tgpl2_poles
    SET ${setClauses.join(', ')}, updated_at = NOW()
    WHERE id = $1 AND project_id = $2 AND is_deleted = FALSE
    RETURNING *
  `;

  const result = await query(queryText, values);
  return result.rows[0];
}

async function confirmPole(id, projectId, userId) {
  const result = await query(
    `UPDATE tgpl2_poles 
     SET status = 'CONFIRMED', confirmed_by = $3, confirmed_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND project_id = $2 AND is_deleted IS NOT TRUE
     RETURNING *`,
    [id, projectId, userId]
  );
  return result.rows[0];
}

module.exports = {
  createPole,
  getPoles,
  updatePole,
  confirmPole
};
