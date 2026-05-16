const { query } = require('../../../config/db');

async function getDistrictSummary(projectId, date = null, mode = 'exact') {
  let dateFilter = '';
  const params = [projectId];
  
  if (date) {
    if (date === 'till_yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      dateFilter = 'AND sp.created_at::date <= $2';
      params.push(yesterdayStr);
    } else {
      const operator = mode === 'cumulative' ? '<=' : '=';
      dateFilter = `AND sp.created_at::date ${operator} $2`;
      params.push(date);
    }
  }

  const sql = `
    SELECT 
      d.id as district_id,
      d.name as district_name,
      u.id as ulb_id,
      u.name as ulb_name,
      COUNT(DISTINCT sp.id) as total_switch_points,
      COUNT(DISTINCT p.id) as total_poles
    FROM districts d
    JOIN ulbs u ON u.district_id = d.id
    LEFT JOIN switch_points sp ON sp.ulb_id = u.id AND sp.is_deleted = FALSE ${dateFilter}
    LEFT JOIN poles p ON p.switch_point_id = sp.id AND p.is_deleted = FALSE
    WHERE d.project_id = $1
    GROUP BY d.id, u.id
    ORDER BY d.name, u.name;
  `;
  
  const result = await query(sql, params);
  return result.rows;
}

async function getWardSummary(ulbId, date = null, mode = 'exact') {
  let dateFilter = '';
  const params = [ulbId];
  
  if (date) {
    if (date === 'till_yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      dateFilter = 'AND sp.created_at::date <= $2';
      params.push(yesterdayStr);
    } else {
      const operator = mode === 'cumulative' ? '<=' : '=';
      dateFilter = `AND sp.created_at::date ${operator} $2`;
      params.push(date);
    }
  }

  const sql = `
    SELECT 
      sp.ward_number,
      COUNT(DISTINCT sp.id) as total_switch_points,
      COUNT(DISTINCT p.id) as total_poles
    FROM switch_points sp
    LEFT JOIN poles p ON p.switch_point_id = sp.id AND p.is_deleted = FALSE
    WHERE sp.ulb_id = $1 AND sp.is_deleted = FALSE ${dateFilter}
    GROUP BY sp.ward_number
    ORDER BY sp.ward_number;
  `;
  
  const result = await query(sql, params);
  return result.rows;
}

async function getWardDetails(ulbId, wardNumber) {
  const sql = `
    SELECT 
      sp.ward_number,
      sp.id as switch_point_id,
      sp.switch_point_number,
      sp.switch_point_type,
      sp.meter_exists,
      sp.meter_type,
      sp.meter_condition,
      sp.meter_rr_number,
      sp.meter_serial_number,
      sp.confirmed_by as sp_confirmed_by,
      sp.confirmed_at as sp_confirmed_at,
      u1.name as sp_confirmed_by_name,
      p.id as pole_id,
      p.pole_number,
      p.pole_type,
      p.pole_condition,
      p.light_type,
      p.light_working_status,
      p.pole_height_mtrs,
      p.arm_type,
      p.arm_status,
      p.road_category,
      p.road_type,
      p.conductor_type,
      p.pole_to_pole_distance_mtrs,
      p.present_arm_no,
      p.present_arm_length_mtrs,
      p.how_many_lights_in_pole,
      p.light_mounting_height,
      p.light_capacity,
      p.road_width_mtrs,
      p.pole_earthing_exists,
      p.confirmed_by as pole_confirmed_by,
      p.confirmed_at as pole_confirmed_at,
      u2.name as pole_confirmed_by_name
    FROM switch_points sp
    LEFT JOIN poles p ON p.switch_point_id = sp.id AND p.is_deleted = FALSE
    LEFT JOIN users u1 ON sp.confirmed_by = u1.id
    LEFT JOIN users u2 ON p.confirmed_by = u2.id
    WHERE sp.ulb_id = $1 AND sp.ward_number = $2 AND sp.is_deleted = FALSE
    ORDER BY sp.switch_point_number, p.pole_number;
  `;
  
  const result = await query(sql, [ulbId, wardNumber]);
  return result.rows;
}

async function getPendingSubmissions(projectId, page = 1, limit = 50, userId = null) {
  const offset = (page - 1) * limit;
  const sql = `
    SELECT *, COUNT(*) OVER() AS total_count FROM (
      SELECT 
        'switch_point' as type,
        sp.id,
        sp.created_by as user_id,
        u.name as user_name,
        sp.created_at,
        sp.ward_number,
        sp.switch_point_number::text as identifier,
        ulb.name as ulb_name,
        sp.switch_point_number::text as switch_point_number,
        sp.switch_point_type,
        sp.meter_exists,
        sp.meter_type,
        sp.meter_rr_number,
        sp.meter_serial_number,
        sp.meter_condition,
        NULL as conductor_type,
        NULL as pole_type,
        NULL as pole_height_mtrs,
        NULL as pole_condition,
        NULL as pole_to_pole_distance_mtrs,
        NULL as arm_type,
        NULL as arm_status,
        NULL as present_arm_no,
        NULL as present_arm_length_mtrs,
        NULL as how_many_lights_in_pole,
        NULL as light_mounting_height,
        NULL as light_type,
        NULL as light_capacity,
        NULL as light_working_status,
        NULL as road_category,
        NULL as road_type,
        NULL as road_width_mtrs,
        NULL as pole_earthing_exists
      FROM switch_points sp
      JOIN users u ON sp.created_by = u.id
      LEFT JOIN ulbs ulb ON sp.ulb_id = ulb.id
      WHERE sp.project_id = $1 AND sp.status = 'PENDING' AND sp.is_deleted = FALSE
      AND ($4::int IS NULL OR sp.created_by = $4)
      
      UNION ALL
      
      SELECT 
        'pole' as type,
        p.id,
        p.created_by as user_id,
        u.name as user_name,
        p.created_at,
        sp.ward_number,
        p.pole_number::text as identifier,
        ulb.name as ulb_name,
        p.switch_point_number::text as switch_point_number,
        NULL as switch_point_type,
        NULL as meter_exists,
        NULL as meter_type,
        NULL as meter_rr_number,
        NULL as meter_serial_number,
        NULL as meter_condition,
        p.conductor_type,
        p.pole_type,
        p.pole_height_mtrs,
        p.pole_condition,
        p.pole_to_pole_distance_mtrs,
        p.arm_type,
        p.arm_status,
        p.present_arm_no,
        p.present_arm_length_mtrs,
        p.how_many_lights_in_pole,
        p.light_mounting_height,
        p.light_type,
        p.light_capacity,
        p.light_working_status,
        p.road_category,
        p.road_type,
        p.road_width_mtrs,
        p.pole_earthing_exists
      FROM poles p
      JOIN switch_points sp ON p.switch_point_id = sp.id
      JOIN users u ON p.created_by = u.id
      LEFT JOIN ulbs ulb ON sp.ulb_id = ulb.id
      WHERE p.project_id = $1 AND p.status = 'PENDING' AND p.is_deleted = FALSE
      AND ($4::int IS NULL OR p.created_by = $4)
    ) combined
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `;
  
  const result = await query(sql, [projectId, limit, offset, userId]);
  const total = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;
  return { rows: result.rows, total };
}

async function getConfirmedSubmissions(projectId, page = 1, limit = 50, userId = null, confirmedBy = null) {
  const offset = (page - 1) * limit;
  const sql = `
    SELECT *, COUNT(*) OVER() AS total_count FROM (
      SELECT 
        'switch_point' as type,
        sp.id,
        sp.created_by as user_id,
        u.name as user_name,
        sp.created_at,
        sp.ward_number,
        sp.switch_point_number::text as identifier,
        ulb.name as ulb_name,
        sp.switch_point_number::text as switch_point_number,
        sp.confirmed_by,
        sp.confirmed_at,
        u2.name as confirmed_by_name,
        sp.switch_point_type,
        sp.meter_exists,
        sp.meter_type,
        sp.meter_rr_number,
        sp.meter_serial_number,
        sp.meter_condition,
        NULL::text as conductor_type,
        NULL::text as pole_type,
        NULL::numeric as pole_height_mtrs,
        NULL::text as pole_condition,
        NULL::numeric as pole_to_pole_distance_mtrs,
        NULL::text as arm_type,
        NULL::text as arm_status,
        NULL::text as present_arm_no,
        NULL::numeric as present_arm_length_mtrs,
        NULL::text as how_many_lights_in_pole,
        NULL::text as light_mounting_height,
        NULL::text as light_type,
        NULL::text as light_capacity,
        NULL::text as light_working_status,
        NULL::text as road_category,
        NULL::text as road_type,
        NULL::numeric as road_width_mtrs,
        NULL::text as pole_earthing_exists
      FROM switch_points sp
      JOIN users u ON sp.created_by = u.id
      LEFT JOIN users u2 ON sp.confirmed_by = u2.id
      LEFT JOIN ulbs ulb ON sp.ulb_id = ulb.id
      WHERE sp.project_id = $1 AND sp.status = 'CONFIRMED' AND sp.is_deleted = FALSE
      AND ($4::int IS NULL OR sp.created_by = $4)
      AND ($5::int IS NULL OR sp.confirmed_by = $5)
      
      UNION ALL
      
      SELECT 
        'pole' as type,
        p.id,
        p.created_by as user_id,
        u.name as user_name,
        p.created_at,
        sp.ward_number,
        p.pole_number::text as identifier,
        ulb.name as ulb_name,
        p.switch_point_number::text as switch_point_number,
        p.confirmed_by,
        p.confirmed_at,
        u3.name as confirmed_by_name,
        NULL::text as switch_point_type,
        NULL::boolean as meter_exists,
        NULL::text as meter_type,
        NULL::text as meter_rr_number,
        NULL::text as meter_serial_number,
        NULL::text as meter_condition,
        p.conductor_type,
        p.pole_type,
        p.pole_height_mtrs,
        p.pole_condition,
        p.pole_to_pole_distance_mtrs,
        p.arm_type,
        p.arm_status,
        p.present_arm_no,
        p.present_arm_length_mtrs,
        p.how_many_lights_in_pole,
        p.light_mounting_height,
        p.light_type,
        p.light_capacity,
        p.light_working_status,
        p.road_category,
        p.road_type,
        p.road_width_mtrs,
        p.pole_earthing_exists
      FROM poles p
      JOIN switch_points sp ON p.switch_point_id = sp.id
      JOIN users u ON p.created_by = u.id
      LEFT JOIN users u3 ON p.confirmed_by = u3.id
      LEFT JOIN ulbs ulb ON sp.ulb_id = ulb.id
      WHERE p.project_id = $1 AND p.status = 'CONFIRMED' AND p.is_deleted = FALSE
      AND ($4::int IS NULL OR p.created_by = $4)
      AND ($5::int IS NULL OR p.confirmed_by = $5)
    ) combined
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `;
  
  const result = await query(sql, [projectId, limit, offset, userId, confirmedBy]);
  const total = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;
  return { rows: result.rows, total };
}

async function getTodaySubmissions(projectId, page = 1, limit = 50) {
  const today = new Date().toISOString().split('T')[0];
  const offset = (page - 1) * limit;
  const sql = `
    SELECT *, COUNT(*) OVER() AS total_count FROM (
      SELECT 
        'switch_point' as type,
        sp.id,
        sp.created_by as user_id,
        u.name as user_name,
        sp.created_at,
        sp.ward_number,
        sp.switch_point_number::text as identifier,
        sp.switch_point_number::text as switch_point_number,
        sp.switch_point_type,
        sp.meter_exists,
        sp.meter_type,
        sp.meter_rr_number,
        sp.meter_serial_number,
        sp.meter_condition,
        NULL as conductor_type,
        NULL as pole_type,
        NULL as pole_height_mtrs,
        NULL as pole_condition,
        NULL as pole_to_pole_distance_mtrs,
        NULL as arm_type,
        NULL as arm_status,
        NULL as present_arm_no,
        NULL as present_arm_length_mtrs,
        NULL as how_many_lights_in_pole,
        NULL as light_mounting_height,
        NULL as light_type,
        NULL as light_capacity,
        NULL as light_working_status,
        NULL as road_category,
        NULL as road_type,
        NULL as road_width_mtrs,
        NULL as pole_earthing_exists
      FROM switch_points sp
      JOIN users u ON sp.created_by = u.id
      WHERE sp.project_id = $1 AND sp.created_at::date = $2 AND sp.is_deleted = FALSE
      
      UNION ALL
      
      SELECT 
        'pole' as type,
        p.id,
        p.created_by as user_id,
        u.name as user_name,
        p.created_at,
        sp.ward_number,
        p.pole_number::text as identifier,
        p.switch_point_number::text as switch_point_number,
        NULL as switch_point_type,
        NULL as meter_exists,
        NULL as meter_type,
        NULL as meter_rr_number,
        NULL as meter_serial_number,
        NULL as meter_condition,
        p.conductor_type,
        p.pole_type,
        p.pole_height_mtrs,
        p.pole_condition,
        p.pole_to_pole_distance_mtrs,
        p.arm_type,
        p.arm_status,
        p.present_arm_no,
        p.present_arm_length_mtrs,
        p.how_many_lights_in_pole,
        p.light_mounting_height,
        p.light_type,
        p.light_capacity,
        p.light_working_status,
        p.road_category,
        p.road_type,
        p.road_width_mtrs,
        p.pole_earthing_exists
      FROM poles p
      JOIN switch_points sp ON p.switch_point_id = sp.id
      JOIN users u ON p.created_by = u.id
      WHERE p.project_id = $1 AND p.created_at::date = $2 AND p.is_deleted = FALSE
    ) combined
    ORDER BY created_at DESC
    LIMIT $3 OFFSET $4
  `;
  
  const result = await query(sql, [projectId, today, limit, offset]);
  const total = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;
  return { rows: result.rows, total };
}

async function getMyStats(projectId, userId) {
  const spResult = await query(
    'SELECT COUNT(*) as total FROM switch_points WHERE project_id = $1 AND created_by = $2 AND is_deleted = FALSE',
    [projectId, userId]
  );
  const poleResult = await query(
    'SELECT COUNT(*) as total FROM poles WHERE project_id = $1 AND created_by = $2 AND is_deleted = FALSE',
    [projectId, userId]
  );
  return {
    switch_points: parseInt(spResult.rows[0].total, 10),
    poles: parseInt(poleResult.rows[0].total, 10)
  };
}

async function getEmployeeTracking(projectId) {
  const sql = `
    SELECT 
      u.id, 
      u.email,
      u.name,
      (
        SELECT COUNT(*) FROM poles p 
        WHERE p.confirmed_by = u.id AND p.project_id = $1 AND p.is_deleted = FALSE
      ) + 
      (
        SELECT COUNT(*) FROM switch_points sp 
        WHERE sp.confirmed_by = u.id AND sp.project_id = $1 AND sp.is_deleted = FALSE
      ) as total_resolved,
      (
        SELECT COUNT(*) FROM poles p 
        WHERE p.confirmed_by = u.id AND p.project_id = $1 AND p.confirmed_at::date = CURRENT_DATE AND p.is_deleted = FALSE
      ) + 
      (
        SELECT COUNT(*) FROM switch_points sp 
        WHERE sp.confirmed_by = u.id AND sp.project_id = $1 AND sp.confirmed_at::date = CURRENT_DATE AND sp.is_deleted = FALSE
      ) as today_resolved
    FROM users u
    WHERE u.role = 'EMPLOYEE'
    ORDER BY total_resolved DESC;
  `;
  const result = await query(sql, [projectId]);
  return result.rows;
}

async function getMobileUserTracking(projectId) {
  const sql = `
    SELECT 
      u.id, 
      u.email,
      u.name,
      COALESCE(SUM(stats.total_count), 0) as total,
      COALESCE(SUM(stats.today_count), 0) as today_total
    FROM users u
    LEFT JOIN (
      SELECT created_by, COUNT(*) as total_count, COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) as today_count
      FROM (
        SELECT created_by, created_at FROM switch_points WHERE project_id = $1 AND is_deleted = FALSE
        UNION ALL
        SELECT created_by, created_at FROM poles WHERE project_id = $1 AND is_deleted = FALSE
      ) combined
      GROUP BY created_by
    ) stats ON u.id = stats.created_by
    WHERE u.role = 'MOBILE_USER'
    GROUP BY u.id, u.email, u.name
    ORDER BY total DESC;
  `;
  const result = await query(sql, [projectId]);
  return result.rows;
}

async function getReportData(projectId, districtId, tillDate, ulbId) {
  const params = [projectId, tillDate || null, districtId || null, ulbId || null];
  
  const spSql = `
    SELECT 
      sp.*,
      u.name as user_name,
      ulb.name as ulb_name,
      d.name as district_name
    FROM switch_points sp
    JOIN users u ON sp.created_by = u.id
    JOIN ulbs ulb ON sp.ulb_id = ulb.id
    JOIN districts d ON ulb.district_id = d.id
    WHERE sp.project_id = $1 AND sp.status = 'CONFIRMED' AND sp.is_deleted = FALSE
    AND ($2::date IS NULL OR sp.created_at::date <= $2)
    AND ($3::int IS NULL OR ulb.district_id = $3)
    AND ($4::int IS NULL OR sp.ulb_id = $4)
    ORDER BY sp.created_at DESC
  `;
  
  const spResult = await query(spSql, params);

  const pSql = `
    SELECT 
      p.*,
      u.name as user_name,
      ulb.name as ulb_name,
      d.name as district_name,
      sp.switch_point_number
    FROM poles p
    JOIN switch_points sp ON p.switch_point_id = sp.id
    JOIN users u ON p.created_by = u.id
    JOIN ulbs ulb ON sp.ulb_id = ulb.id
    JOIN districts d ON ulb.district_id = d.id
    WHERE p.project_id = $1 AND p.status = 'CONFIRMED' AND p.is_deleted = FALSE
    AND ($2::date IS NULL OR p.created_at::date <= $2)
    AND ($3::int IS NULL OR ulb.district_id = $3)
    AND ($4::int IS NULL OR sp.ulb_id = $4)
    ORDER BY p.created_at DESC
  `;
  
  const pResult = await query(pSql, params);

  return {
    switchPoints: spResult.rows,
    poles: pResult.rows
  };
}

module.exports = { getDistrictSummary, getWardSummary, getWardDetails, getPendingSubmissions, getTodaySubmissions, getConfirmedSubmissions, getMyStats, getEmployeeTracking, getMobileUserTracking, getReportData };
