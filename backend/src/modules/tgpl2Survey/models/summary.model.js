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

async function buildQueueQuery(projectId, type, queueStatus, page = 1, limit = 50, fromDate = null, toDate = null) {
  const offset = (page - 1) * limit;
  const queries = [];
  const params = [projectId];
  let paramIndex = 2;

  const dateFilter = (tableAlias) => {
    let filter = '';
    const dateCol = queueStatus === 'CONFIRMED' ? 'confirmed_at' : 'created_at';
    if (fromDate && toDate) {
      filter = ` AND (${tableAlias}.${dateCol})::date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(fromDate, toDate);
      paramIndex += 2;
    }
    return filter;
  };

  const ccmsQuery = `
    SELECT 
      'ccms' as type,
      c.id,
      c.project_id,
      c.ward_id,
      w.name as ward_name,
      c.ward_number,
      c.created_by as user_id,
      c.created_by::text as user_name,
      c.created_at,
      c.confirmed_at,
      c.confirmed_by,
      c.confirmed_by::text as confirmed_by_name,
      COALESCE(UPPER(c.status), 'PENDING') as status,
      c.is_deleted,
      c.ccms_number as identifier,
      c.ccms_number,
      c.dtc_number,
      c.dtc_capacity,
      NULL as switch_point_number,
      NULL as meter_status,
      NULL as meter_type,
      NULL as rr_number,
      NULL as serial_number,
      NULL as pole_number,
      NULL as pole_type,
      NULL as pole_condition,
      NULL as light_type,
      NULL as light_type_2,
      NULL as light_capacity,
      NULL as light_capacity_2,
      NULL as light_working_status,
      NULL as road_type,
      NULL as road_width_mtrs,
      NULL::float as latitude,
      NULL::float as longitude,
      NULL as how_many_lights_in_pole,
      NULL as arm_type,
      NULL as arm_status,
      NULL as present_arm_no,
      NULL as present_arm_length,
      NULL as conductor_type,
      NULL as pole_to_pole_distance,
      NULL as pole_earthing_exists,
      NULL::boolean as pole_defective,
      NULL::boolean as arm_deteriorated,
      NULL as meter_dimensional_status,
      NULL as req_arm_number,
      NULL as req_arm_length,
      NULL as req_led_lights_no,
      NULL as req_led_wattage,
      NULL as req_dedicated_wire,
      NULL as image_url_1,
      NULL as image_url_2
    FROM tgpl2_ccms_points c
    LEFT JOIN tgpl2_wards w ON c.ward_id = w.id

    WHERE c.project_id = $1 AND c.is_deleted IS NOT TRUE AND COALESCE(UPPER(c.status), 'PENDING') = '${queueStatus}'
    ${dateFilter('c')}
  `;

  const spQuery = `
    SELECT 
      'switch_point' as type,
      sp.id,
      sp.project_id,
      sp.ward_id,
      w.name as ward_name,
      c.ward_number,
      sp.created_by as user_id,
      sp.created_by::text as user_name,
      sp.created_at,
      sp.confirmed_at,
      sp.confirmed_by,
      sp.confirmed_by::text as confirmed_by_name,
      COALESCE(UPPER(sp.status), 'PENDING') as status,
      sp.is_deleted,
      sp.switch_point_number as identifier,
      c.ccms_number,
      c.dtc_number,
      c.dtc_capacity,
      sp.switch_point_number,
      sp.meter_status,
      sp.meter_type,
      sp.rr_number,
      sp.serial_number,
      NULL as pole_number,
      NULL as pole_type,
      NULL as pole_condition,
      NULL as light_type,
      NULL as light_type_2,
      NULL as light_capacity,
      NULL as light_capacity_2,
      NULL as light_working_status,
      NULL as road_type,
      NULL as road_width_mtrs,
      NULL::float as latitude,
      NULL::float as longitude,
      NULL as how_many_lights_in_pole,
      NULL as arm_type,
      NULL as arm_status,
      NULL as present_arm_no,
      NULL as present_arm_length,
      NULL as conductor_type,
      NULL as pole_to_pole_distance,
      NULL as pole_earthing_exists,
      NULL::boolean as pole_defective,
      NULL::boolean as arm_deteriorated,
      NULL as meter_dimensional_status,
      NULL as req_arm_number,
      NULL as req_arm_length,
      NULL as req_led_lights_no,
      NULL as req_led_wattage,
      NULL as req_dedicated_wire,
      NULL as image_url_1,
      NULL as image_url_2
    FROM tgpl2_switch_points sp
    LEFT JOIN tgpl2_ccms_points c ON sp.ccms_id = c.id
    LEFT JOIN tgpl2_wards w ON sp.ward_id = w.id

    WHERE sp.project_id = $1 AND sp.is_deleted IS NOT TRUE AND COALESCE(UPPER(sp.status), 'PENDING') = '${queueStatus}'
    ${dateFilter('sp')}
  `;

  const poleQuery = `
    SELECT 
      'pole' as type,
      p.id,
      p.project_id,
      p.ward_id,
      w.name as ward_name,
      p.ward_number,
      p.created_by as user_id,
      p.created_by::text as user_name,
      p.created_at,
      p.confirmed_at,
      p.confirmed_by,
      p.confirmed_by::text as confirmed_by_name,
      COALESCE(UPPER(p.status), 'PENDING') as status,
      p.is_deleted,
      p.pole_number as identifier,
      p.ccms_number,
      p.dtc_number,
      p.dtc_capacity,
      sp.switch_point_number,
      sp.meter_status,
      p.meter_type,
      p.meter_rr_number as rr_number,
      p.meter_serial_number as serial_number,
      p.pole_number,
      p.pole_type,
      p.pole_condition,
      p.light_type,
      p.light_type_2,
      p.light_capacity,
      p.light_capacity_2,
      p.light_working_status,
      p.road_type,
      p.road_width_mtrs,
      p.latitude,
      p.longitude,
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
      p.image_url_1,
      p.image_url_2
    FROM tgpl2_poles p
    LEFT JOIN tgpl2_switch_points sp ON p.switch_point_id = sp.id
    LEFT JOIN tgpl2_wards w ON p.ward_id = w.id

    WHERE p.project_id = $1 AND p.is_deleted IS NOT TRUE AND COALESCE(UPPER(p.status), 'PENDING') = '${queueStatus}'
    ${dateFilter('p')}
  `;

  let mainQuery = '';
  if (type === 'ccms') {
    mainQuery = ccmsQuery;
  } else if (type === 'switch_point') {
    mainQuery = spQuery;
  } else if (type === 'pole') {
    mainQuery = poleQuery;
  } else {
    // all
    mainQuery = `${ccmsQuery} UNION ALL ${spQuery} UNION ALL ${poleQuery}`;
  }

  // Count query
  const countSql = `SELECT COUNT(*) as total FROM (${mainQuery}) as q`;
  const countRes = await query(countSql, params);
  const total = Number(countRes.rows[0].total || 0);

  // Data query with ordering & limit/offset
  const dateCol = queueStatus === 'CONFIRMED' ? 'confirmed_at' : 'created_at';
  const dataSql = `${mainQuery} ORDER BY ${dateCol} DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const dataRes = await query(dataSql, params);
  return { rows: dataRes.rows, total };
}

async function getPendingSubmissions(projectId, type = 'all', page = 1, limit = 50, fromDate = null, toDate = null) {
  return buildQueueQuery(projectId, type, 'PENDING', page, limit, fromDate, toDate);
}

async function getConfirmedSubmissions(projectId, type = 'all', page = 1, limit = 50, fromDate = null, toDate = null) {
  return buildQueueQuery(projectId, type, 'CONFIRMED', page, limit, fromDate, toDate);
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
