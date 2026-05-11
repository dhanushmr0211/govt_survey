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
        sp.switch_point_number as identifier
      FROM switch_points sp
      JOIN users u ON sp.created_by = u.id
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
        p.pole_number as identifier
      FROM poles p
      JOIN switch_points sp ON p.switch_point_id = sp.id
      JOIN users u ON p.created_by = u.id
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
        sp.switch_point_number as identifier,
        sp.confirmed_by
      FROM switch_points sp
      JOIN users u ON sp.created_by = u.id
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
        p.pole_number as identifier,
        p.confirmed_by
      FROM poles p
      JOIN switch_points sp ON p.switch_point_id = sp.id
      JOIN users u ON p.created_by = u.id
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
        sp.switch_point_number as identifier
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
        p.pole_number as identifier
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

module.exports = { getDistrictSummary, getWardSummary, getWardDetails, getPendingSubmissions, getTodaySubmissions, getConfirmedSubmissions, getMyStats, getEmployeeTracking, getMobileUserTracking };
