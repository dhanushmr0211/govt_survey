const { query, pool } = require('../../../config/db');
const { getLocalDateString } = require('../../../utils/date');

async function getDistrictSummary(projectId, date = null, mode = 'exact', districtScope = null, ulbScope = null, fromDate = null, toDate = null) {
  let dateFilter = '';
  const tgplParams = [];
  let pIdx = 1;
  
  if (fromDate && toDate) {
    dateFilter = `AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date BETWEEN $${pIdx} AND $${pIdx + 1}`;
    tgplParams.push(fromDate, toDate);
    pIdx += 2;
  } else if (date) {
    if (date === 'till_yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);
      dateFilter = `AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date <= $${pIdx}`;
      tgplParams.push(yesterdayStr);
    } else {
      const operator = mode === 'cumulative' ? '<=' : '=';
      dateFilter = `AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date ${operator} $${pIdx}`;
      tgplParams.push(date);
    }
    pIdx++;
  }

  const tgplSql = `
    SELECT 
      1 as district_id,
      'Wards' as district_name,
      w.id as ulb_id,
      w.name as ulb_name,
      0 as total_switch_points,
      COALESCE((
        SELECT COUNT(p.id) FROM poles p
        WHERE p.ward_id = w.id AND p.is_deleted = FALSE ${dateFilter}
      ), 0) as total_poles
    FROM wards w
    WHERE w.is_deleted = FALSE
    ORDER BY w.name;
  `;
  const result = await query(tgplSql, tgplParams);
  return result.rows;
}

async function getWardSummary(ulbId, date = null, mode = 'exact', fromDate = null, toDate = null) {
  let dateFilter = '';
  const tgplParams = [ulbId];
  let pIdx = 2;
  
  if (fromDate && toDate) {
    dateFilter = `AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date BETWEEN $${pIdx} AND $${pIdx + 1}`;
    tgplParams.push(fromDate, toDate);
  } else if (date) {
    if (date === 'till_yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);
      dateFilter = `AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date <= $${pIdx}`;
      tgplParams.push(yesterdayStr);
    } else {
      const operator = mode === 'cumulative' ? '<=' : '=';
      dateFilter = `AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date ${operator} $${pIdx}`;
      tgplParams.push(date);
    }
  }

  const tgplSql = `
    SELECT 
      w.name as ward_number,
      0 as total_switch_points,
      COALESCE((
        SELECT COUNT(p.id) FROM poles p
        WHERE p.ward_id = w.id AND p.is_deleted = FALSE ${dateFilter}
      ), 0) as total_poles
    FROM wards w
    WHERE w.id = $1 AND w.is_deleted = FALSE;
  `;
  const result = await query(tgplSql, tgplParams);
  return result.rows;
}

async function getWardDetails(ulbId, wardNumber, date = null, mode = 'exact', fromDate = null, toDate = null) {
  let dateFilter = '';
  const tgplParams = [ulbId];
  let pIdx = 2;
  
  if (fromDate && toDate) {
    dateFilter = `AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date BETWEEN $${pIdx} AND $${pIdx + 1}`;
    tgplParams.push(fromDate, toDate);
  } else if (date) {
    if (date === 'till_yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);
      dateFilter = `AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date <= $${pIdx}`;
      tgplParams.push(yesterdayStr);
    } else {
      const operator = mode === 'cumulative' ? '<=' : '=';
      dateFilter = `AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date ${operator} $${pIdx}`;
      tgplParams.push(date);
    }
  }

  const tgplSql = `
    SELECT 
      w.name as ward_number,
      NULL::int as switch_point_id,
      NULL as switch_point_number,
      NULL as switch_point_type,
      NULL::boolean as meter_exists,
      p.meter_type,
      NULL as meter_condition,
      p.meter_rr_number,
      p.meter_serial_number,
      NULL::int as sp_confirmed_by,
      NULL::timestamp as sp_confirmed_at,
      NULL as sp_confirmed_by_name,
      NULL::numeric as sp_latitude,
      NULL::numeric as sp_longitude,
      p.id as pole_id,
      p.pole_number,
      p.pole_type,
      NULL as pole_condition,
      p.light_type,
      p.light_working_status,
      p.pole_height as pole_height_mtrs,
      p.arm_type,
      p.arm_status,
      p.road_category,
      p.road_type,
      p.conductor_type,
      p.pole_to_pole_distance as pole_to_pole_distance_mtrs,
      p.present_arm_no,
      p.present_arm_length as present_arm_length_mtrs,
      p.how_many_lights_in_pole,
      p.light_mounting_height,
      p.light_capacity,
      p.road_width_mtrs,
      p.pole_earthing_exists,
      p.confirmed_by as pole_confirmed_by,
      p.confirmed_at as pole_confirmed_at,
      u.name as pole_confirmed_by_name,
      p.latitude as pole_latitude,
      p.longitude as pole_longitude,
      p.image_url_1,
      p.image_url_2,
      p.dtc_number,
      p.dtc_capacity,
      p.ccms_number,
      p.meter_dimensional_status,
      p.req_arm_number,
      p.req_arm_length,
      p.req_led_lights_no,
      p.req_led_wattage,
      p.req_dedicated_wire
    FROM poles p
    JOIN wards w ON p.ward_id = w.id
    LEFT JOIN users u ON p.confirmed_by = u.id
    WHERE p.ward_id = $1 AND p.is_deleted = FALSE ${dateFilter}
    ORDER BY p.id DESC;
  `;
  const result = await query(tgplSql, tgplParams);
  return result.rows;
}

async function getPendingSubmissions(projectId, page = 1, limit = 50, userId = null, districtScope = null, ulbScope = null, fromDate = null, toDate = null, dateField = 'created_at', type = null) {
  const offset = (page - 1) * limit;
  let scopeFilter = '';
  const params = [projectId, limit, offset, userId];
  let pIdx = 5;

  if (ulbScope && Array.isArray(ulbScope) && ulbScope.length > 0) {
    scopeFilter += ` AND p.ward_id = ANY($${pIdx})`;
    params.push(ulbScope);
    pIdx++;
  }

  const submissionDateColumn = dateField === 'confirmed_at' ? 'confirmed_at' : 'created_at';
  let pDateFilter = '';
  if (fromDate && toDate) {
    const startIdx = params.length + 1;
    pDateFilter = ` AND (timezone('Asia/Kolkata', timezone('UTC', p.${submissionDateColumn})))::date BETWEEN $${startIdx} AND $${startIdx + 1}`;
    params.push(fromDate, toDate);
  }

  let queryBody = '';
  if (type === 'switch_point') {
    queryBody = `
      SELECT 
        'switch_point' as type,
        NULL::int as id,
        NULL::int as user_id,
        NULL::text as user_name,
        NULL::timestamp as created_at,
        NULL::text as ward_number,
        NULL::text as identifier,
        NULL::text as ulb_name,
        NULL::text as switch_point_number,
        NULL::text as switch_point_type,
        NULL::boolean as meter_exists,
        NULL::text as meter_type,
        NULL::text as meter_rr_number,
        NULL::text as meter_serial_number,
        NULL::text as meter_condition,
        NULL::numeric as latitude,
        NULL::numeric as longitude,
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
      LIMIT 0
    `;
  } else {
    queryBody = `
      SELECT 
        'pole' as type,
        p.id,
        p.created_by as user_id,
        u.name as user_name,
        p.created_at,
        w.name as ward_number,
        p.pole_number::text as identifier,
        w.name as ulb_name,
        p.ccms_number::text as switch_point_number,
        NULL::text as switch_point_type,
        NULL::boolean as meter_exists,
        p.meter_type,
        p.meter_rr_number,
        p.meter_serial_number,
        NULL::text as meter_condition,
        p.latitude,
        p.longitude,
        p.conductor_type,
        p.pole_type,
        p.pole_height as pole_height_mtrs,
        NULL::text as pole_condition,
        p.pole_to_pole_distance as pole_to_pole_distance_mtrs,
        p.arm_type,
        p.arm_status,
        p.present_arm_no,
        p.present_arm_length as present_arm_length_mtrs,
        p.how_many_lights_in_pole,
        p.light_mounting_height,
        p.light_type,
        p.light_capacity,
        p.light_working_status,
        p.road_category,
        p.road_type,
        p.road_width_mtrs,
        p.pole_earthing_exists,
        p.dtc_number,
        p.dtc_capacity,
        p.ccms_number,
        p.meter_dimensional_status,
        p.req_arm_number,
        p.req_arm_length,
        p.req_led_lights_no,
        p.req_led_wattage,
        p.req_dedicated_wire
      FROM poles p
      JOIN users u ON p.created_by = u.id
      JOIN wards w ON p.ward_id = w.id
      WHERE p.project_id = $1 AND p.status = 'PENDING' AND p.is_deleted = FALSE
      AND ($4::int IS NULL OR p.created_by = $4)
      ${pDateFilter}
      ${scopeFilter}
    `;
  }

  const sql = `
    SELECT *, COUNT(*) OVER() AS total_count FROM (
      ${queryBody}
    ) combined
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `;

  const result = await query(sql, params);
  const total = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;
  return { rows: result.rows, total };
}

async function getConfirmedSubmissions(projectId, page = 1, limit = 50, userId = null, confirmedBy = null, districtScope = null, ulbScope = null, fromDate = null, toDate = null, dateField = 'created_at', type = null) {
  const offset = (page - 1) * limit;
  let scopeFilter = '';
  const params = [projectId, limit, offset, userId, confirmedBy];
  let pIdx = 6;

  if (ulbScope && Array.isArray(ulbScope) && ulbScope.length > 0) {
    scopeFilter += ` AND p.ward_id = ANY($${pIdx})`;
    params.push(ulbScope);
    pIdx++;
  }

  const submissionDateColumn = dateField === 'confirmed_at' ? 'confirmed_at' : 'created_at';
  let pDateFilter = '';
  if (fromDate && toDate) {
    const startIdx = params.length + 1;
    pDateFilter = ` AND (timezone('Asia/Kolkata', timezone('UTC', p.${submissionDateColumn})))::date BETWEEN $${startIdx} AND $${startIdx + 1}`;
    params.push(fromDate, toDate);
  }

  let queryBody = '';
  if (type === 'switch_point') {
    queryBody = `
      SELECT 
        'switch_point' as type,
        NULL::int as id,
        NULL::int as user_id,
        NULL::text as user_name,
        NULL::timestamp as created_at,
        NULL::text as ward_number,
        NULL::text as identifier,
        NULL::text as ulb_name,
        NULL::text as switch_point_number,
        NULL::int as confirmed_by,
        NULL::timestamp as confirmed_at,
        NULL::text as confirmed_by_name,
        NULL::text as switch_point_type,
        NULL::boolean as meter_exists,
        NULL::text as meter_type,
        NULL::text as meter_rr_number,
        NULL::text as meter_serial_number,
        NULL::text as meter_condition,
        NULL::numeric as latitude,
        NULL::numeric as longitude,
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
      LIMIT 0
    `;
  } else {
    queryBody = `
      SELECT 
        'pole' as type,
        p.id,
        p.created_by as user_id,
        u.name as user_name,
        p.created_at,
        w.name as ward_number,
        p.pole_number::text as identifier,
        w.name as ulb_name,
        p.ccms_number::text as switch_point_number,
        p.confirmed_by,
        p.confirmed_at,
        u2.name as confirmed_by_name,
        NULL::text as switch_point_type,
        NULL::boolean as meter_exists,
        p.meter_type,
        p.meter_rr_number,
        p.meter_serial_number,
        NULL::text as meter_condition,
        p.latitude,
        p.longitude,
        p.conductor_type,
        p.pole_type,
        p.pole_height as pole_height_mtrs,
        NULL::text as pole_condition,
        p.pole_to_pole_distance as pole_to_pole_distance_mtrs,
        p.arm_type,
        p.arm_status,
        p.present_arm_no,
        p.present_arm_length as present_arm_length_mtrs,
        p.how_many_lights_in_pole,
        p.light_mounting_height,
        p.light_type,
        p.light_capacity,
        p.light_working_status,
        p.road_category,
        p.road_type,
        p.road_width_mtrs,
        p.pole_earthing_exists,
        p.dtc_number,
        p.dtc_capacity,
        p.ccms_number,
        p.meter_dimensional_status,
        p.req_arm_number,
        p.req_arm_length,
        p.req_led_lights_no,
        p.req_led_wattage,
        p.req_dedicated_wire
      FROM poles p
      JOIN users u ON p.created_by = u.id
      JOIN users u2 ON p.confirmed_by = u2.id
      JOIN wards w ON p.ward_id = w.id
      WHERE p.project_id = $1 AND p.status = 'CONFIRMED' AND p.is_deleted = FALSE
      AND ($4::int IS NULL OR p.created_by = $4)
      AND ($5::int IS NULL OR p.confirmed_by = $5)
      ${pDateFilter}
      ${scopeFilter}
    `;
  }

  const sql = `
    SELECT *, COUNT(*) OVER() AS total_count FROM (
      ${queryBody}
    ) combined
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `;

  const result = await query(sql, params);
  const total = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;
  return { rows: result.rows, total };
}

async function getTodaySubmissions(projectId, page = 1, limit = 50, userId = null, districtScope = null, ulbScope = null) {
  const today = getLocalDateString();
  const offset = (page - 1) * limit;
  let scopeFilter = '';
  const params = [projectId, today, limit, offset, userId];
  let pIdx = 6;

  if (ulbScope && Array.isArray(ulbScope) && ulbScope.length > 0) {
    scopeFilter += ` AND p.ward_id = ANY($${pIdx})`;
    params.push(ulbScope);
    pIdx++;
  }

  const sql = `
    SELECT *, COUNT(*) OVER() AS total_count FROM (
      SELECT 
        'pole' as type,
        p.id,
        p.created_by as user_id,
        u.name as user_name,
        p.created_at,
        w.name as ward_number,
        p.pole_number::text as identifier,
        w.name as ulb_name,
        p.ccms_number::text as switch_point_number,
        NULL::text as switch_point_type,
        NULL::boolean as meter_exists,
        p.meter_type,
        p.meter_rr_number,
        p.meter_serial_number,
        NULL::text as meter_condition,
        p.latitude,
        p.longitude,
        p.conductor_type,
        p.pole_type,
        p.pole_height as pole_height_mtrs,
        NULL::text as pole_condition,
        p.pole_to_pole_distance as pole_to_pole_distance_mtrs,
        p.arm_type,
        p.arm_status,
        p.present_arm_no,
        p.present_arm_length as present_arm_length_mtrs,
        p.how_many_lights_in_pole,
        p.light_mounting_height,
        p.light_type,
        p.light_capacity,
        p.light_working_status,
        p.road_category,
        p.road_type,
        p.road_width_mtrs,
        p.pole_earthing_exists,
        p.dtc_number,
        p.dtc_capacity,
        p.ccms_number,
        p.meter_dimensional_status,
        p.req_arm_number,
        p.req_arm_length,
        p.req_led_lights_no,
        p.req_led_wattage,
        p.req_dedicated_wire
      FROM poles p
      JOIN users u ON p.created_by = u.id
      JOIN wards w ON p.ward_id = w.id
      WHERE p.project_id = $1 AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date = $2 AND p.is_deleted = FALSE
      AND ($5::int IS NULL OR p.created_by = $5)
      ${scopeFilter}
    ) combined
    ORDER BY created_at DESC
    LIMIT $3 OFFSET $4
  `;

  const result = await query(sql, params);
  const total = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;
  return { rows: result.rows, total };
}

async function getMyStats(projectId, userId, date = null) {
  const todayStr = getLocalDateString();
  
  // Total stats
  const totalPoleResult = await query(
    'SELECT COUNT(*) as total FROM poles WHERE project_id = $1 AND created_by = $2 AND is_deleted = FALSE',
    [projectId, userId]
  );

  // Today's stats
  const todayPoleResult = await query(
    `SELECT COUNT(*) as total FROM poles 
     WHERE project_id = $1 AND created_by = $2 AND is_deleted = FALSE
     AND (timezone('Asia/Kolkata', timezone('UTC', created_at)))::date = $3`,
    [projectId, userId, todayStr]
  );

  // Date-wise stats (custom date if passed, otherwise default to today)
  const targetDate = date || todayStr;
  const dateWisePoleResult = await query(
    `SELECT COUNT(*) as total FROM poles 
     WHERE project_id = $1 AND created_by = $2 AND is_deleted = FALSE
     AND (timezone('Asia/Kolkata', timezone('UTC', created_at)))::date = $3`,
    [projectId, userId, targetDate]
  );

  return {
    total: {
      switch_points: 0,
      poles: parseInt(totalPoleResult.rows[0].total, 10)
    },
    today: {
      switch_points: 0,
      poles: parseInt(todayPoleResult.rows[0].total, 10)
    },
    dateWise: {
      date: targetDate,
      switch_points: 0,
      poles: parseInt(dateWisePoleResult.rows[0].total, 10)
    }
  };
}

async function getEmployeeTracking(projectId) {
  const usersResult = await pool.query(
    `SELECT u.id, u.email, u.name 
     FROM project_users pu
     JOIN users u ON u.id = pu.user_id
     WHERE pu.project_id = $1 AND pu.project_role = 'EMPLOYEE' AND u.is_deleted = FALSE`,
    [projectId]
  );
  const users = usersResult.rows;
  if (users.length === 0) return [];
  
  const userIds = users.map(u => u.id);
  
  const statsResult = await query(
    `SELECT 
      p.confirmed_by as id,
      COUNT(p.id) as total_poles_resolved,
      COUNT(CASE WHEN (timezone('Asia/Kolkata', timezone('UTC', p.confirmed_at)))::date = (timezone('Asia/Kolkata', NOW()))::date THEN p.id END) as today_poles_resolved
     FROM poles p
     WHERE p.confirmed_by = ANY($1) AND p.project_id = $2 AND p.is_deleted = FALSE
     GROUP BY p.confirmed_by`,
    [userIds, projectId]
  );
  
  const statsMap = {};
  statsResult.rows.forEach(r => {
    statsMap[r.id] = {
      total_poles_resolved: parseInt(r.total_poles_resolved, 10),
      today_poles_resolved: parseInt(r.today_poles_resolved, 10)
    };
  });

  const result = users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    total_sp_resolved: 0,
    total_poles_resolved: statsMap[u.id]?.total_poles_resolved || 0,
    today_sp_resolved: 0,
    today_poles_resolved: statsMap[u.id]?.today_poles_resolved || 0
  }));

  result.sort((a, b) => b.total_poles_resolved - a.total_poles_resolved);
  return result;
}

async function getMobileUserTracking(projectId) {
  const usersResult = await pool.query(
    `SELECT u.id, u.email, u.name 
     FROM project_users pu
     JOIN users u ON u.id = pu.user_id
     WHERE pu.project_id = $1 AND pu.project_role = 'MOBILE_USER' AND u.is_deleted = FALSE`,
    [projectId]
  );
  const users = usersResult.rows;
  if (users.length === 0) return [];
  
  const userIds = users.map(u => u.id);
  
  const statsResult = await query(
    `SELECT 
      p.created_by as id,
      COUNT(p.id) as total_poles,
      COUNT(CASE WHEN (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date = (timezone('Asia/Kolkata', NOW()))::date THEN p.id END) as today_poles
     FROM poles p
     WHERE p.created_by = ANY($1) AND p.project_id = $2 AND p.is_deleted = FALSE
     GROUP BY p.created_by`,
    [userIds, projectId]
  );
  
  const statsMap = {};
  statsResult.rows.forEach(r => {
    statsMap[r.id] = {
      total_poles: parseInt(r.total_poles, 10),
      today_poles: parseInt(r.today_poles, 10)
    };
  });

  const result = users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    total_sp: 0,
    total_poles: statsMap[u.id]?.total_poles || 0,
    today_sp: 0,
    today_poles: statsMap[u.id]?.today_poles || 0
  }));

  result.sort((a, b) => b.total_poles - a.total_poles);
  return result;
}

async function getReportData(projectId, districtId, tillDate, ulbId, districtScope = null, ulbScope = null, fromDate = null, toDate = null) {
  const params = [projectId, tillDate || null, ulbId || null];
  let pIdx = 4;
  let scopeFilter = '';

  let pRangeFilter = '';
  if (fromDate && toDate) {
    params.push(fromDate, toDate);
    const fromIdx = params.length - 1;
    const toIdx = params.length;
    pRangeFilter = `\n    AND (($${fromIdx}::date IS NULL OR (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date >= $${fromIdx}) AND ($${toIdx}::date IS NULL OR (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date <= $${toIdx}))`;
  }

  if (ulbScope && Array.isArray(ulbScope) && ulbScope.length > 0) {
    scopeFilter += ` AND p.ward_id = ANY($${pIdx})`;
    params.push(ulbScope);
    pIdx++;
  }

  const pSql = `
    SELECT 
      p.*,
      u.name as user_name,
      w.name as ulb_name,
      'Wards' as district_name,
      p.ccms_number as switch_point_number
    FROM poles p
    JOIN users u ON p.created_by = u.id
    JOIN wards w ON p.ward_id = w.id
    WHERE p.project_id = $1 AND p.status = 'CONFIRMED' AND p.is_deleted = FALSE
    AND ($2::date IS NULL OR (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date <= $2)
    AND ($3::int IS NULL OR p.ward_id = $3)
    ${pRangeFilter}
    ${scopeFilter}
    ORDER BY p.created_at DESC
  `;
  
  const pResult = await query(pSql, params);

  return {
    switchPoints: [],
    poles: pResult.rows
  };
}

module.exports = {
  getDistrictSummary,
  getWardSummary,
  getWardDetails,
  getPendingSubmissions,
  getConfirmedSubmissions,
  getTodaySubmissions,
  getMyStats,
  getEmployeeTracking,
  getMobileUserTracking,
  getReportData
};
