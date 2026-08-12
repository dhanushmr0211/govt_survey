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
      c.ccms_number,
      c.dtc_number,
      c.dtc_capacity,
      sp.switch_point_number,
      sp.meter_status,
      sp.meter_type,
      sp.rr_number,
      sp.serial_number,
      COUNT(p.id) FILTER (WHERE p.is_deleted IS NOT TRUE) as pole_count
     FROM tgpl2_ccms_points c
     LEFT JOIN tgpl2_switch_points sp ON c.id = sp.ccms_id AND sp.project_id = $1
     LEFT JOIN tgpl2_poles p ON sp.id = p.switch_point_id AND p.project_id = $1
     WHERE c.ward_id = $2 AND c.project_id = $1 AND c.is_deleted IS NOT TRUE
     GROUP BY c.id, c.ccms_number, c.dtc_number, c.dtc_capacity, sp.id, sp.switch_point_number, sp.meter_status, sp.meter_type, sp.rr_number, sp.serial_number
     ORDER BY c.ccms_number ASC, sp.switch_point_number ASC`,
    [projectId, wardId]
  );
  return result.rows;
}

async function getPendingSubmissions(projectId) {
  const result = await query(
    `SELECT p.*, w.name as ward_name, c.ccms_number, sp.switch_point_number, u.name as surveyor_name
     FROM tgpl2_poles p
     JOIN tgpl2_wards w ON p.ward_id = w.id
     JOIN tgpl2_ccms_points c ON p.ccms_id = c.id
     JOIN tgpl2_switch_points sp ON p.switch_point_id = sp.id
     LEFT JOIN users u ON p.created_by = u.id
     WHERE p.project_id = $1 AND p.status = 'PENDING' AND p.is_deleted IS NOT TRUE
     ORDER BY p.created_at DESC`,
    [projectId]
  );
  return result.rows;
}

async function getConfirmedSubmissions(projectId) {
  const result = await query(
    `SELECT p.*, w.name as ward_name, c.ccms_number, sp.switch_point_number, u.name as surveyor_name
     FROM tgpl2_poles p
     JOIN tgpl2_wards w ON p.ward_id = w.id
     JOIN tgpl2_ccms_points c ON p.ccms_id = c.id
     JOIN tgpl2_switch_points sp ON p.switch_point_id = sp.id
     LEFT JOIN users u ON p.created_by = u.id
     WHERE p.project_id = $1 AND p.status = 'CONFIRMED' AND p.is_deleted IS NOT TRUE
     ORDER BY p.confirmed_at DESC LIMIT 500`,
    [projectId]
  );
  return result.rows;
}

async function getTodaySubmissions(projectId, userId) {
  const result = await query(
    `SELECT p.*, w.name as ward_name, c.ccms_number, sp.switch_point_number
     FROM tgpl2_poles p
     JOIN tgpl2_wards w ON p.ward_id = w.id
     JOIN tgpl2_ccms_points c ON p.ccms_id = c.id
     JOIN tgpl2_switch_points sp ON p.switch_point_id = sp.id
     WHERE p.project_id = $1 AND p.created_by = $2 AND p.created_at::date = NOW()::date AND p.is_deleted IS NOT TRUE
     ORDER BY p.created_at DESC`,
    [projectId, userId]
  );
  return result.rows;
}

async function getEmployeeTracking(projectId) {
  const result = await query(
    `SELECT 
      u.id as employee_id,
      u.name as employee_name,
      COUNT(p.id) as confirmed_count
     FROM users u
     JOIN tgpl2_poles p ON p.confirmed_by = u.id
     WHERE p.project_id = $1 AND p.status = 'CONFIRMED' AND p.is_deleted IS NOT TRUE
     GROUP BY u.id, u.name
     ORDER BY confirmed_count DESC`,
    [projectId]
  );
  return result.rows;
}

async function getMobileUserTracking(projectId) {
  const result = await query(
    `SELECT 
      u.id as surveyor_id,
      u.name as surveyor_name,
      COUNT(p.id) as submitted_count
     FROM users u
     JOIN tgpl2_poles p ON p.created_by = u.id
     WHERE p.project_id = $1 AND p.is_deleted IS NOT TRUE
     GROUP BY u.id, u.name
     ORDER BY submitted_count DESC`,
    [projectId]
  );
  return result.rows;
}

async function getMyStats(projectId, userId) {
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

  return {
    total: {
      poles: Number(polesResult.rows[0].total_poles || 0),
      switch_points: Number(spResult.rows[0].total_switch_points || 0)
    },
    today: {
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
      u.name as surveyor_name
     FROM tgpl2_poles p
     JOIN tgpl2_wards w ON p.ward_id = w.id
     JOIN tgpl2_ccms_points c ON p.ccms_id = c.id
     JOIN tgpl2_switch_points sp ON p.switch_point_id = sp.id
     LEFT JOIN users u ON p.created_by = u.id
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
