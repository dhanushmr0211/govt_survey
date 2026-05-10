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

async function getPendingSubmissions(projectId) {
  const spSql = `
    SELECT 
      'switch_point' as type,
      sp.*,
      u.name as user_name,
      sp.switch_point_number as identifier
    FROM switch_points sp
    JOIN users u ON sp.created_by = u.id
    WHERE sp.project_id = $1 AND sp.status = 'PENDING' AND sp.is_deleted = FALSE
  `;
  
  const poleSql = `
    SELECT 
      'pole' as type,
      p.*,
      u.name as user_name,
      sp.ward_number,
      p.pole_number as identifier
    FROM poles p
    JOIN switch_points sp ON p.switch_point_id = sp.id
    JOIN users u ON p.created_by = u.id
    WHERE p.project_id = $1 AND p.status = 'PENDING' AND p.is_deleted = FALSE
  `;
  
  const spResult = await query(spSql, [projectId]);
  const poleResult = await query(poleSql, [projectId]);
  
  // Combine and sort by date
  const combined = [...spResult.rows, ...poleResult.rows];
  combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  return combined;
}

async function getConfirmedSubmissions(projectId) {
  const spSql = `
    SELECT 
      'switch_point' as type,
      sp.*,
      u.name as user_name,
      sp.switch_point_number as identifier
    FROM switch_points sp
    JOIN users u ON sp.created_by = u.id
    WHERE sp.project_id = $1 AND sp.status = 'CONFIRMED' AND sp.is_deleted = FALSE
  `;
  
  const poleSql = `
    SELECT 
      'pole' as type,
      p.*,
      u.name as user_name,
      sp.ward_number,
      p.pole_number as identifier
    FROM poles p
    JOIN switch_points sp ON p.switch_point_id = sp.id
    JOIN users u ON p.created_by = u.id
    WHERE p.project_id = $1 AND p.status = 'CONFIRMED' AND p.is_deleted = FALSE
  `;
  
  const spResult = await query(spSql, [projectId]);
  const poleResult = await query(poleSql, [projectId]);
  
  const combined = [...spResult.rows, ...poleResult.rows];
  combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  return combined;
}

async function getTodaySubmissions(projectId) {
  const today = new Date().toISOString().split('T')[0];
  
  const spSql = `
    SELECT 
      'switch_point' as type,
      sp.*,
      u.name as user_name,
      sp.switch_point_number as identifier
    FROM switch_points sp
    JOIN users u ON sp.created_by = u.id
    WHERE sp.project_id = $1 AND sp.created_at::date = $2 AND sp.is_deleted = FALSE
  `;
  
  const poleSql = `
    SELECT 
      'pole' as type,
      p.*,
      u.name as user_name,
      sp.ward_number,
      p.pole_number as identifier
    FROM poles p
    JOIN switch_points sp ON p.switch_point_id = sp.id
    JOIN users u ON p.created_by = u.id
    WHERE p.project_id = $1 AND p.created_at::date = $2 AND p.is_deleted = FALSE
  `;
  
  const spResult = await query(spSql, [projectId, today]);
  const poleResult = await query(poleSql, [projectId, today]);
  
  const combined = [...spResult.rows, ...poleResult.rows];
  combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  return combined;
}

module.exports = { getDistrictSummary, getWardSummary, getWardDetails, getPendingSubmissions, getTodaySubmissions, getConfirmedSubmissions };
