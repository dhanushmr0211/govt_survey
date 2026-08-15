const { query } = require('../../../config/db');

async function getWardsSummary(projectId) {
  // Aggregate stats per ward for TGPL-2 project
  const result = await query(
    `SELECT 
      w.id as ward_id,
      w.name as ward_name,
      COUNT(DISTINCT c.id) FILTER (WHERE c.is_deleted IS NOT TRUE) as total_ccms,
      COUNT(DISTINCT sp.id) FILTER (WHERE sp.is_deleted IS NOT TRUE) as total_switch_points,
      COUNT(p.id) FILTER (WHERE p.is_deleted IS NOT TRUE) as total_poles,
      COUNT(p.id) FILTER (WHERE p.status = 'PENDING' AND p.is_deleted IS NOT TRUE) as pending_poles,
      COUNT(p.id) FILTER (WHERE p.status = 'CONFIRMED' AND p.is_deleted IS NOT TRUE) as confirmed_poles
     FROM tgpl2_wards w
     LEFT JOIN tgpl2_ccms_points c ON w.id = c.ward_id AND c.project_id = $1
     LEFT JOIN tgpl2_switch_points sp ON c.id = sp.ccms_id AND sp.project_id = $1
     LEFT JOIN tgpl2_poles p ON sp.id = p.switch_point_id AND p.project_id = $1
     WHERE w.project_id = $1 AND w.is_deleted IS NOT TRUE
     GROUP BY w.id, w.name
     ORDER BY w.name ASC`,
    [projectId]
  );
  return result.rows;
}

async function getWardDetails(projectId, wardId) {
  const result = await query(
    `SELECT
      c.id AS ccms_id,
      c.ccms_number,
      c.dtc_number,
      c.dtc_capacity,
      c.ward_id,
      c.created_by,
      c.created_at,
      sp.id AS switch_point_id,
      sp.switch_point_number,
      sp.meter_status,
      sp.meter_type,
      sp.rr_number,
      sp.serial_number,
      sp.ward_id AS switch_point_ward_id,
      p.id AS pole_id,
      p.pole_number,
      p.pole_type,
      p.pole_condition,
      p.survey_type,
      p.ward_number,
      p.ccms_number AS pole_ccms_number,
      p.light_type,
      p.light_type_2,
      p.light_type_3,
      p.light_type_4,
      p.light_type_5,
      p.light_capacity,
      p.light_capacity_2,
      p.light_capacity_3,
      p.light_capacity_4,
      p.light_capacity_5,
      p.how_many_lights_in_pole,
      p.arm_type,
      p.arm_status,
      p.present_arm_no,
      p.present_arm_length,
      p.conductor_type,
      p.pole_to_pole_distance,
      p.pole_earthing_exists,
      p.pole_defective,
      p.arm_deteriorated,
      p.meter_dimensional_status,
      p.req_arm_number,
      p.req_arm_length,
      p.req_led_lights_no,
      p.req_led_wattage,
      p.req_dedicated_wire,
      p.light_working_status,
      p.road_type,
      p.road_width_mtrs,
      p.latitude AS pole_latitude,
      p.longitude AS pole_longitude,
      p.created_by AS pole_created_by,
      p.created_at AS pole_created_at,
      p.confirmed_by AS pole_confirmed_by,
      p.confirmed_at AS pole_confirmed_at,
      p.status,
      p.image_url_1,
      p.image_url_2,
      p.how_many_lights_in_pole,
      p.arm_type,
      p.arm_status,
      p.present_arm_no,
      p.present_arm_length,
      p.conductor_type,
      p.pole_to_pole_distance,
      p.pole_earthing_exists,
      p.pole_defective,
      p.arm_deteriorated,
      p.meter_dimensional_status,
      p.req_arm_number,
      p.req_arm_length,
      p.req_led_lights_no,
      p.req_led_wattage,
      p.req_dedicated_wire
     FROM tgpl2_ccms_points c
     LEFT JOIN tgpl2_switch_points sp
       ON c.id = sp.ccms_id
      AND sp.project_id = $1
      AND sp.is_deleted IS NOT TRUE
     LEFT JOIN tgpl2_poles p
       ON sp.id = p.switch_point_id
      AND p.project_id = $1
      AND p.is_deleted IS NOT TRUE
     WHERE c.ward_id = $2
       AND c.project_id = $1
       AND c.is_deleted IS NOT TRUE
     ORDER BY c.ccms_number ASC, sp.switch_point_number ASC, p.pole_number ASC`,
    [projectId, wardId]
  );
  return result.rows;
}

async function getPendingSubmissions(projectId) {
  const result = await query(
    `SELECT p.*, w.name as ward_name, c.ccms_number, sp.switch_point_number, p.created_by::text as surveyor_name
     FROM tgpl2_poles p
     LEFT JOIN tgpl2_wards w ON p.ward_id = w.id
     LEFT JOIN tgpl2_ccms_points c ON p.ccms_id = c.id
     LEFT JOIN tgpl2_switch_points sp ON p.switch_point_id = sp.id
     WHERE p.project_id = $1 AND COALESCE(UPPER(p.status), 'PENDING') = 'PENDING' AND p.is_deleted IS NOT TRUE
     ORDER BY p.created_at DESC`,
    [projectId]
  );
  return result.rows;
}

async function getConfirmedSubmissions(projectId) {
  const result = await query(
    `SELECT p.*, w.name as ward_name, c.ccms_number, sp.switch_point_number, p.created_by::text as surveyor_name
     FROM tgpl2_poles p
     LEFT JOIN tgpl2_wards w ON p.ward_id = w.id
     LEFT JOIN tgpl2_ccms_points c ON p.ccms_id = c.id
     LEFT JOIN tgpl2_switch_points sp ON p.switch_point_id = sp.id
     WHERE p.project_id = $1 AND UPPER(p.status) = 'CONFIRMED' AND p.is_deleted IS NOT TRUE
     ORDER BY p.confirmed_at DESC LIMIT 500`,
    [projectId]
  );
  return result.rows;
}

async function getTodaySubmissions(projectId, userId) {
  const result = await query(
    `SELECT p.*, w.name as ward_name, c.ccms_number, sp.switch_point_number
     FROM tgpl2_poles p
     LEFT JOIN tgpl2_wards w ON p.ward_id = w.id
     LEFT JOIN tgpl2_ccms_points c ON p.ccms_id = c.id
     LEFT JOIN tgpl2_switch_points sp ON p.switch_point_id = sp.id
     WHERE p.project_id = $1 AND p.created_by = $2 AND p.created_at::date = NOW()::date AND p.is_deleted IS NOT TRUE
     ORDER BY p.created_at DESC`,
    [projectId, userId]
  );
  return result.rows;
}

async function getEmployeeTracking(projectId) {
  const result = await query(
    `SELECT 
      p.confirmed_by as employee_id,
      p.confirmed_by::text as employee_name,
      COUNT(p.id) as confirmed_count
     FROM tgpl2_poles p
     WHERE p.project_id = $1 AND UPPER(p.status) = 'CONFIRMED' AND p.confirmed_by IS NOT NULL AND p.is_deleted IS NOT TRUE
     GROUP BY p.confirmed_by
     ORDER BY confirmed_count DESC`,
    [projectId]
  );
  return result.rows;
}

async function getMobileUserTracking(projectId) {
  const result = await query(
    `SELECT 
      p.created_by as surveyor_id,
      p.created_by::text as surveyor_name,
      COUNT(p.id) as submitted_count
     FROM tgpl2_poles p
     WHERE p.project_id = $1 AND p.is_deleted IS NOT TRUE
     GROUP BY p.created_by
     ORDER BY submitted_count DESC`,
    [projectId]
  );
  return result.rows;
}

async function getMyStats(projectId, userId) {
  const totalCcmsResult = await query(
    `SELECT COUNT(id) as total_ccms_units
     FROM tgpl2_ccms_points
     WHERE project_id = $1 AND created_by = $2 AND is_deleted IS NOT TRUE`,
    [projectId, userId]
  );

  const polesResult = await query(
    `SELECT 
      COUNT(id) as total_poles,
      COUNT(id) FILTER (WHERE created_at::date = NOW()::date) as today_poles
     FROM tgpl2_poles
     WHERE project_id = $1 AND created_by = $2 AND is_deleted IS NOT TRUE`,
    [projectId, userId]
  );

  const spResult = await query(
    `SELECT 
      COUNT(id) as total_switch_points,
      COUNT(id) FILTER (WHERE created_at::date = NOW()::date) as today_switch_points
     FROM tgpl2_switch_points
     WHERE project_id = $1 AND created_by = $2 AND is_deleted IS NOT TRUE`,
    [projectId, userId]
  );

  const todayCcmsResult = await query(
    `SELECT COUNT(id) as today_ccms_units
     FROM tgpl2_ccms_points
     WHERE project_id = $1 AND created_by = $2 AND is_deleted IS NOT TRUE
       AND created_at::date = NOW()::date`,
    [projectId, userId]
  );

  return {
    total: {
      ccms_units: Number(totalCcmsResult.rows[0].total_ccms_units || 0),
      poles: Number(polesResult.rows[0].total_poles || 0),
      switch_points: Number(spResult.rows[0].total_switch_points || 0)
    },
    today: {
      ccms_units: Number(todayCcmsResult.rows[0].today_ccms_units || 0),
      poles: Number(polesResult.rows[0].today_poles || 0),
      switch_points: Number(spResult.rows[0].today_switch_points || 0)
    }
  };
}

async function getReportData(projectId) {
  const result = await query(
    `SELECT 
      w.name as ward_name,
      c.ccms_number,
      c.dtc_number,
      c.dtc_capacity,
      sp.switch_point_number,
      sp.meter_status,
      sp.meter_type,
      sp.rr_number,
      sp.serial_number,
      p.pole_number,
      p.road_type,
      p.road_width,
      p.pole_defective,
      p.arm_deteriorated,
      p.image_url_1,
      p.image_url_2,
      p.latitude,
      p.longitude,
      p.status,
      p.created_at,
      p.created_by::text as surveyor_name
     FROM tgpl2_poles p
     LEFT JOIN tgpl2_wards w ON p.ward_id = w.id
     LEFT JOIN tgpl2_ccms_points c ON p.ccms_id = c.id
     LEFT JOIN tgpl2_switch_points sp ON p.switch_point_id = sp.id
     WHERE p.project_id = $1 AND p.is_deleted IS NOT TRUE
     ORDER BY w.name ASC, c.ccms_number ASC, sp.switch_point_number ASC, p.pole_number ASC`,
    [projectId]
  );
  return result.rows;
}

module.exports = {
  getWardsSummary,
  getWardDetails,
  getPendingSubmissions,
  getConfirmedSubmissions,
  getTodaySubmissions,
  getEmployeeTracking,
  getMobileUserTracking,
  getMyStats,
  getReportData
};
