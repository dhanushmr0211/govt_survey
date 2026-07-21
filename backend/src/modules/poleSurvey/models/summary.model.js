const { query } = require('../../../config/db');
const { getLocalDateString } = require('../../../utils/date');

async function getDistrictSummary(projectId, date = null, mode = 'exact', districtScope = null, ulbScope = null, fromDate = null, toDate = null) {
  let dateFilterSp = '';
  let dateFilterP = '';
  let scopeFilter = '';
  const params = [projectId];
  
  let paramIdx = 2;
  if (fromDate && toDate) {
    dateFilterSp = `AND (timezone('Asia/Kolkata', timezone('UTC', sp.created_at)))::date BETWEEN $${paramIdx} AND $${paramIdx + 1}`;
    dateFilterP = `AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date BETWEEN $${paramIdx} AND $${paramIdx + 1}`;
    params.push(fromDate, toDate);
    paramIdx += 2;
  } else if (date) {
    if (date === 'till_yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);
      dateFilterSp = `AND (timezone('Asia/Kolkata', timezone('UTC', sp.created_at)))::date <= $${paramIdx}`;
      dateFilterP = `AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date <= $${paramIdx}`;
      params.push(yesterdayStr);
    } else {
      const operator = mode === 'cumulative' ? '<=' : '=';
      dateFilterSp = `AND (timezone('Asia/Kolkata', timezone('UTC', sp.created_at)))::date ${operator} $${paramIdx}`;
      dateFilterP = `AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date ${operator} $${paramIdx}`;
      params.push(date);
    }
    paramIdx++;
  }

  if (districtScope && Array.isArray(districtScope) && districtScope.length > 0) {
    scopeFilter += ` AND d.id = ANY($${paramIdx})`;
    params.push(districtScope);
    paramIdx++;
  }

  if (ulbScope && Array.isArray(ulbScope) && ulbScope.length > 0) {
    scopeFilter += ` AND u.id = ANY($${paramIdx})`;
    params.push(ulbScope);
    paramIdx++;
  }

  const sql = `
    SELECT 
      d.id as district_id,
      d.name as district_name,
      u.id as ulb_id,
      u.name as ulb_name,
      COALESCE((
        SELECT COUNT(sp.id) FROM switch_points sp
        WHERE sp.ulb_id = u.id AND sp.is_deleted IS NOT TRUE ${dateFilterSp}
      ), 0) as total_switch_points,
      COALESCE((
        SELECT COUNT(p.id) FROM poles p
        JOIN switch_points sp ON p.switch_point_id = sp.id
        WHERE sp.ulb_id = u.id AND p.is_deleted IS NOT TRUE AND sp.is_deleted IS NOT TRUE ${dateFilterP}
      ), 0) as total_poles
    FROM districts d
    JOIN ulbs u ON u.district_id = d.id
    WHERE d.project_id = $1 ${scopeFilter}
    GROUP BY d.id, u.id
    ORDER BY d.name, u.name;
  `;
  
  const result = await query(sql, params);
  return result.rows;
}

async function getWardSummary(ulbId, date = null, mode = 'exact', fromDate = null, toDate = null) {
  let dateFilterSp = '';
  let dateFilterP = '';
  const params = [ulbId];
  
  if (fromDate && toDate) {
    dateFilterSp = "AND (timezone('Asia/Kolkata', timezone('UTC', sp.created_at)))::date BETWEEN $2 AND $3";
    dateFilterP = "AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date BETWEEN $2 AND $3";
    params.push(fromDate, toDate);
  } else if (date) {
    if (date === 'till_yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);
      dateFilterSp = "AND (timezone('Asia/Kolkata', timezone('UTC', sp.created_at)))::date <= $2";
      dateFilterP = "AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date <= $2";
      params.push(yesterdayStr);
    } else {
      const operator = mode === 'cumulative' ? '<=' : '=';
      dateFilterSp = `AND (timezone('Asia/Kolkata', timezone('UTC', sp.created_at)))::date ${operator} $2`;
      dateFilterP = `AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date ${operator} $2`;
      params.push(date);
    }
  }

  const sql = `
    WITH wards AS (
      SELECT DISTINCT ward_number 
      FROM switch_points 
      WHERE ulb_id = $1 AND is_deleted IS NOT TRUE
    ),
    ward_counts AS (
      SELECT 
        w.ward_number,
        COALESCE((
          SELECT COUNT(sp.id) FROM switch_points sp
          WHERE sp.ulb_id = $1 AND sp.ward_number = w.ward_number AND sp.is_deleted IS NOT TRUE ${dateFilterSp}
        ), 0) as total_switch_points,
        COALESCE((
          SELECT COUNT(p.id) FROM poles p
          JOIN switch_points sp ON p.switch_point_id = sp.id
          WHERE sp.ulb_id = $1 AND sp.ward_number = w.ward_number AND p.is_deleted IS NOT TRUE AND sp.is_deleted IS NOT TRUE ${dateFilterP}
        ), 0) as total_poles
      FROM wards w
    )
    SELECT * FROM ward_counts
    WHERE total_switch_points > 0 OR total_poles > 0
    ORDER BY ward_number;
  `;
  
  const result = await query(sql, params);
  return result.rows;
}
async function getWardDetails(ulbId, wardNumber, date = null, mode = 'exact', fromDate = null, toDate = null) {
  let dateFilter = '';
  const params = [ulbId, wardNumber];
  
  if (fromDate && toDate) {
    dateFilter = `AND (
      (timezone('Asia/Kolkata', timezone('UTC', sp.created_at)))::date BETWEEN $3 AND $4
      OR 
      (p.id IS NOT NULL AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date BETWEEN $3 AND $4)
    )`;
    params.push(fromDate, toDate);
  } else if (date) {
    if (date === 'till_yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);
      dateFilter = `AND (
        (timezone('Asia/Kolkata', timezone('UTC', sp.created_at)))::date <= $3
        OR 
        (p.id IS NOT NULL AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date <= $3)
      )`;
      params.push(yesterdayStr);
    } else {
      const operator = mode === 'cumulative' ? '<=' : '=';
      dateFilter = `AND (
        (timezone('Asia/Kolkata', timezone('UTC', sp.created_at)))::date ${operator} $3
        OR 
        (p.id IS NOT NULL AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date ${operator} $3)
      )`;
      params.push(date);
    }
  }

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
      sp.created_at as sp_created_at,
      sp.created_by as sp_created_by,
      u3.name as sp_created_by_name,
      sp.latitude as sp_latitude,
      sp.longitude as sp_longitude,
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
      p.light_type_2,
      p.light_capacity_2,
      p.road_width_mtrs,
      p.pole_earthing_exists,
      p.confirmed_by as pole_confirmed_by,
      p.confirmed_at as pole_confirmed_at,
      u2.name as pole_confirmed_by_name,
      p.created_at as pole_created_at,
      p.created_by as pole_created_by,
      u4.name as pole_created_by_name,
      p.latitude as pole_latitude,
      p.longitude as pole_longitude,
      ulb.name as ulb_name,
      dist.name as district_name
    FROM switch_points sp
    LEFT JOIN ulbs ulb ON sp.ulb_id = ulb.id
    LEFT JOIN districts dist ON ulb.district_id = dist.id
    LEFT JOIN poles p ON p.switch_point_id = sp.id AND p.is_deleted IS NOT TRUE
    LEFT JOIN users u1 ON sp.confirmed_by = u1.id
    LEFT JOIN users u2 ON p.confirmed_by = u2.id
    LEFT JOIN users u3 ON sp.created_by = u3.id
    LEFT JOIN users u4 ON p.created_by = u4.id
    WHERE sp.ulb_id = $1 AND sp.ward_number = $2 AND sp.is_deleted IS NOT TRUE ${dateFilter}
    ORDER BY sp.switch_point_number, p.pole_number;
  `;
  
  const result = await query(sql, params);
  return result.rows;
}

async function getPendingSubmissions(projectId, page = 1, limit = 50, userId = null, districtScope = null, ulbScope = null, fromDate = null, toDate = null, dateField = 'created_at', type = null) {
  const offset = (page - 1) * limit;
  
  let scopeFilter = '';
  const params = [projectId, limit, offset, userId];
  let pIdx = 5;

  if (districtScope && Array.isArray(districtScope) && districtScope.length > 0) {
    scopeFilter += ` AND ulb.district_id = ANY($${pIdx})`;
    params.push(districtScope);
    pIdx++;
  }
  if (ulbScope && Array.isArray(ulbScope) && ulbScope.length > 0) {
    scopeFilter += ` AND sp.ulb_id = ANY($${pIdx})`;
    params.push(ulbScope);
    pIdx++;
  }

  const submissionDateColumn = dateField === 'confirmed_at' ? 'confirmed_at' : 'created_at';
  let spDateFilter = '';
  let pDateFilter = '';
  if (fromDate && toDate) {
    const startIdx = params.length + 1;
    spDateFilter = ` AND (timezone('Asia/Kolkata', timezone('UTC', sp.${submissionDateColumn})))::date BETWEEN $${startIdx} AND $${startIdx + 1}`;
    pDateFilter = ` AND (timezone('Asia/Kolkata', timezone('UTC', p.${submissionDateColumn})))::date BETWEEN $${startIdx} AND $${startIdx + 1}`;
    params.push(fromDate, toDate);
  }

  let queryBody = '';
  if (type === 'switch_point') {
    queryBody = `
      SELECT 
        'switch_point' as type,
        sp.id,
        sp.ulb_id,
        NULL::int as switch_point_id,
        sp.created_by as user_id,
        u.name as user_name,
        sp.created_at,
        sp.ward_number,
        sp.switch_point_number::text as identifier,
        ulb.name as ulb_name,
        dist.name as district_name,
        sp.switch_point_number::text as switch_point_number,
        sp.switch_point_type,
        sp.meter_exists,
        sp.meter_type,
        sp.meter_rr_number,
        sp.meter_serial_number,
        sp.meter_condition,
        sp.latitude,
        sp.longitude,
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
        NULL as light_type_2,
        NULL as light_capacity_2,
        NULL as light_working_status,
        NULL as road_category,
        NULL as road_type,
        NULL as road_width_mtrs,
        NULL as pole_earthing_exists
      FROM switch_points sp
      JOIN users u ON sp.created_by = u.id
      LEFT JOIN ulbs ulb ON sp.ulb_id = ulb.id
      LEFT JOIN districts dist ON ulb.district_id = dist.id
      WHERE sp.project_id = $1 AND sp.status = 'PENDING' AND sp.is_deleted IS NOT TRUE
      AND ($4::int IS NULL OR sp.created_by = $4)
      ${spDateFilter}
      ${scopeFilter}
    `;
  } else if (type === 'pole') {
    queryBody = `
      SELECT 
        'pole' as type,
        p.id,
        sp.ulb_id,
        p.switch_point_id,
        p.created_by as user_id,
        u.name as user_name,
        p.created_at,
        sp.ward_number,
        p.pole_number::text as identifier,
        ulb.name as ulb_name,
        dist.name as district_name,
        p.switch_point_number::text as switch_point_number,
        NULL as switch_point_type,
        NULL as meter_exists,
        NULL as meter_type,
        NULL as meter_rr_number,
        NULL as meter_serial_number,
        NULL as meter_condition,
        p.latitude,
        p.longitude,
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
        p.light_type_2,
        p.light_capacity_2,
        p.light_working_status,
        p.road_category,
        p.road_type,
        p.road_width_mtrs,
        p.pole_earthing_exists
      FROM poles p
      JOIN switch_points sp ON p.switch_point_id = sp.id
      JOIN users u ON p.created_by = u.id
      LEFT JOIN ulbs ulb ON sp.ulb_id = ulb.id
      LEFT JOIN districts dist ON ulb.district_id = dist.id
      WHERE p.project_id = $1 AND p.status = 'PENDING' AND p.is_deleted IS NOT TRUE
      AND ($4::int IS NULL OR p.created_by = $4)
      ${pDateFilter}
      ${scopeFilter}
    `;
  } else {
    queryBody = `
      SELECT 
        'switch_point' as type,
        sp.id,
        sp.ulb_id,
        NULL::int as switch_point_id,
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
        sp.latitude,
        sp.longitude,
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
        NULL as light_type, NULL as light_capacity, NULL as light_type_2, NULL as light_capacity_2,
        NULL as light_working_status,
        NULL as road_category,
        NULL as road_type,
        NULL as road_width_mtrs,
        NULL as pole_earthing_exists
      FROM switch_points sp
      JOIN users u ON sp.created_by = u.id
      LEFT JOIN ulbs ulb ON sp.ulb_id = ulb.id
      WHERE sp.project_id = $1 AND sp.status = 'PENDING' AND sp.is_deleted IS NOT TRUE
      AND ($4::int IS NULL OR sp.created_by = $4)
      ${spDateFilter}
      ${scopeFilter}
      
      UNION ALL
      
      SELECT 
        'pole' as type,
        p.id,
        sp.ulb_id,
        p.switch_point_id,
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
        p.latitude,
        p.longitude,
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
        p.light_type, p.light_capacity, p.light_type_2, p.light_capacity_2,
        p.light_working_status,
        p.road_category,
        p.road_type,
        p.road_width_mtrs,
        p.pole_earthing_exists
      FROM poles p
      JOIN switch_points sp ON p.switch_point_id = sp.id
      JOIN users u ON p.created_by = u.id
      LEFT JOIN ulbs ulb ON sp.ulb_id = ulb.id
      WHERE p.project_id = $1 AND p.status = 'PENDING' AND p.is_deleted IS NOT TRUE
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

  if (districtScope && Array.isArray(districtScope) && districtScope.length > 0) {
    scopeFilter += ` AND ulb.district_id = ANY($${pIdx})`;
    params.push(districtScope);
    pIdx++;
  }
  if (ulbScope && Array.isArray(ulbScope) && ulbScope.length > 0) {
    scopeFilter += ` AND sp.ulb_id = ANY($${pIdx})`;
    params.push(ulbScope);
    pIdx++;
  }

  const submissionDateColumn = dateField === 'confirmed_at' ? 'confirmed_at' : 'created_at';
  let spDateFilter = '';
  let pDateFilter = '';
  if (fromDate && toDate) {
    const startIdx = params.length + 1;
    spDateFilter = ` AND (timezone('Asia/Kolkata', timezone('UTC', sp.${submissionDateColumn})))::date BETWEEN $${startIdx} AND $${startIdx + 1}`;
    pDateFilter = ` AND (timezone('Asia/Kolkata', timezone('UTC', p.${submissionDateColumn})))::date BETWEEN $${startIdx} AND $${startIdx + 1}`;
    params.push(fromDate, toDate);
  }

  let queryBody = '';
  if (type === 'switch_point') {
    queryBody = `
      SELECT 
        'switch_point' as type,
        sp.id,
        sp.ulb_id,
        NULL::int as switch_point_id,
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
        sp.latitude,
        sp.longitude,
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
        NULL::text as light_type, NULL::text as light_capacity, NULL::text as light_type_2, NULL::text as light_capacity_2,
        NULL::text as light_working_status,
        NULL::text as road_category,
        NULL::text as road_type,
        NULL::numeric as road_width_mtrs,
        NULL::text as pole_earthing_exists
      FROM switch_points sp
      JOIN users u ON sp.created_by = u.id
      LEFT JOIN users u2 ON sp.confirmed_by = u2.id
      LEFT JOIN ulbs ulb ON sp.ulb_id = ulb.id
      WHERE sp.project_id = $1 AND sp.status = 'CONFIRMED' AND sp.is_deleted IS NOT TRUE
      AND ($4::int IS NULL OR sp.created_by = $4)
      AND ($5::int IS NULL OR sp.confirmed_by = $5)
      ${spDateFilter}
      ${scopeFilter}
    `;
  } else if (type === 'pole') {
    queryBody = `
      SELECT 
        'pole' as type,
        p.id,
        sp.ulb_id,
        p.switch_point_id,
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
        p.latitude,
        p.longitude,
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
        p.light_type, p.light_capacity, p.light_type_2, p.light_capacity_2,
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
      WHERE p.project_id = $1 AND p.status = 'CONFIRMED' AND p.is_deleted IS NOT TRUE
      AND ($4::int IS NULL OR p.created_by = $4)
      AND ($5::int IS NULL OR p.confirmed_by = $5)
      ${pDateFilter}
      ${scopeFilter}
    `;
  } else {
    queryBody = `
      SELECT 
        'switch_point' as type,
        sp.id,
        sp.ulb_id,
        NULL::int as switch_point_id,
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
        sp.latitude,
        sp.longitude,
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
        NULL::text as light_type, NULL::text as light_capacity, NULL::text as light_type_2, NULL::text as light_capacity_2,
        NULL::text as light_working_status,
        NULL::text as road_category,
        NULL::text as road_type,
        NULL::numeric as road_width_mtrs,
        NULL::text as pole_earthing_exists
      FROM switch_points sp
      JOIN users u ON sp.created_by = u.id
      LEFT JOIN users u2 ON sp.confirmed_by = u2.id
      LEFT JOIN ulbs ulb ON sp.ulb_id = ulb.id
      WHERE sp.project_id = $1 AND sp.status = 'CONFIRMED' AND sp.is_deleted IS NOT TRUE
      AND ($4::int IS NULL OR sp.created_by = $4)
      AND ($5::int IS NULL OR sp.confirmed_by = $5)
      ${spDateFilter}
      ${scopeFilter}
      
      UNION ALL
      
      SELECT 
        'pole' as type,
        p.id,
        sp.ulb_id,
        p.switch_point_id,
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
        p.latitude,
        p.longitude,
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
        p.light_type, p.light_capacity, p.light_type_2, p.light_capacity_2,
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
      WHERE p.project_id = $1 AND p.status = 'CONFIRMED' AND p.is_deleted IS NOT TRUE
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

  if (districtScope && Array.isArray(districtScope) && districtScope.length > 0) {
    scopeFilter += ` AND ulb.district_id = ANY($${pIdx})`;
    params.push(districtScope);
    pIdx++;
  }
  if (ulbScope && Array.isArray(ulbScope) && ulbScope.length > 0) {
    scopeFilter += ` AND sp.ulb_id = ANY($${pIdx})`;
    params.push(ulbScope);
    pIdx++;
  }

  const sql = `
    SELECT *, COUNT(*) OVER() AS total_count FROM (
      SELECT 
        'switch_point' as type,
        sp.id,
        sp.ulb_id,
        NULL::int as switch_point_id,
        sp.created_by as user_id,
        u.name as user_name,
        sp.created_at,
        sp.confirmed_by,
        sp.confirmed_at,
        uc.name as confirmed_by_name,
        sp.ward_number,
        sp.switch_point_number::text as identifier,
        ulb.name as ulb_name,
        dist.name as district_name,
        sp.switch_point_number::text as switch_point_number,
        sp.switch_point_type,
        sp.meter_exists,
        sp.meter_type,
        sp.meter_rr_number,
        sp.meter_serial_number,
        sp.meter_condition,
        sp.latitude,
        sp.longitude,
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
        NULL as light_type, NULL as light_capacity, NULL as light_type_2, NULL as light_capacity_2,
        NULL as light_working_status,
        NULL as road_category,
        NULL as road_type,
        NULL as road_width_mtrs,
        NULL as pole_earthing_exists
      FROM switch_points sp
      JOIN users u ON sp.created_by = u.id
      LEFT JOIN users uc ON sp.confirmed_by = uc.id
      LEFT JOIN ulbs ulb ON sp.ulb_id = ulb.id
      LEFT JOIN districts dist ON ulb.district_id = dist.id
      WHERE sp.project_id = $1 AND (timezone('Asia/Kolkata', timezone('UTC', sp.created_at)))::date = $2 AND sp.is_deleted IS NOT TRUE
      AND ($5::int IS NULL OR sp.created_by = $5)
      ${scopeFilter}
      
      UNION ALL
      
      SELECT 
        'pole' as type,
        p.id,
        sp.ulb_id,
        p.switch_point_id,
        p.created_by as user_id,
        u.name as user_name,
        p.created_at,
        p.confirmed_by,
        p.confirmed_at,
        uc.name as confirmed_by_name,
        sp.ward_number,
        p.pole_number::text as identifier,
        ulb.name as ulb_name,
        dist.name as district_name,
        p.switch_point_number::text as switch_point_number,
        NULL as switch_point_type,
        NULL as meter_exists,
        NULL as meter_type,
        NULL as meter_rr_number,
        NULL as meter_serial_number,
        NULL as meter_condition,
        p.latitude,
        p.longitude,
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
        p.light_type, p.light_capacity, p.light_type_2, p.light_capacity_2,
        p.light_working_status,
        p.road_category,
        p.road_type,
        p.road_width_mtrs,
        p.pole_earthing_exists
      FROM poles p
      JOIN switch_points sp ON p.switch_point_id = sp.id
      JOIN users u ON p.created_by = u.id
      LEFT JOIN users uc ON p.confirmed_by = uc.id
      LEFT JOIN ulbs ulb ON sp.ulb_id = ulb.id
      LEFT JOIN districts dist ON ulb.district_id = dist.id
      WHERE p.project_id = $1 AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date = $2 AND p.is_deleted IS NOT TRUE
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
  const totalSpResult = await query(
    'SELECT COUNT(*) as total FROM switch_points WHERE project_id = $1 AND created_by = $2 AND is_deleted IS NOT TRUE',
    [projectId, userId]
  );
  const totalPoleResult = await query(
    'SELECT COUNT(*) as total FROM poles WHERE project_id = $1 AND created_by = $2 AND is_deleted IS NOT TRUE',
    [projectId, userId]
  );

  // Today's stats
  const todaySpResult = await query(
    `SELECT COUNT(*) as total FROM switch_points 
     WHERE project_id = $1 AND created_by = $2 AND is_deleted IS NOT TRUE
     AND (timezone('Asia/Kolkata', timezone('UTC', created_at)))::date = $3`,
    [projectId, userId, todayStr]
  );
  const todayPoleResult = await query(
    `SELECT COUNT(*) as total FROM poles 
     WHERE project_id = $1 AND created_by = $2 AND is_deleted IS NOT TRUE
     AND (timezone('Asia/Kolkata', timezone('UTC', created_at)))::date = $3`,
    [projectId, userId, todayStr]
  );

  // Date-wise stats (custom date if passed, otherwise default to today)
  const targetDate = date || todayStr;
  const dateWiseSpResult = await query(
    `SELECT COUNT(*) as total FROM switch_points 
     WHERE project_id = $1 AND created_by = $2 AND is_deleted IS NOT TRUE
     AND (timezone('Asia/Kolkata', timezone('UTC', created_at)))::date = $3`,
    [projectId, userId, targetDate]
  );
  const dateWisePoleResult = await query(
    `SELECT COUNT(*) as total FROM poles 
     WHERE project_id = $1 AND created_by = $2 AND is_deleted IS NOT TRUE
     AND (timezone('Asia/Kolkata', timezone('UTC', created_at)))::date = $3`,
    [projectId, userId, targetDate]
  );

  return {
    total: {
      switch_points: parseInt(totalSpResult.rows[0].total, 10),
      poles: parseInt(totalPoleResult.rows[0].total, 10)
    },
    today: {
      switch_points: parseInt(todaySpResult.rows[0].total, 10),
      poles: parseInt(todayPoleResult.rows[0].total, 10)
    },
    dateWise: {
      date: targetDate,
      switch_points: parseInt(dateWiseSpResult.rows[0].total, 10),
      poles: parseInt(dateWisePoleResult.rows[0].total, 10)
    }
  };
}

async function getEmployeeTracking(projectId) {
  const sql = `
    SELECT 
      u.id, 
      u.email,
      u.name,
      (
        SELECT COUNT(*) FROM switch_points sp 
        WHERE sp.confirmed_by = u.id AND sp.project_id = $1 AND sp.is_deleted IS NOT TRUE
      ) as total_sp_resolved,
      (
        SELECT COUNT(*) FROM poles p 
        WHERE p.confirmed_by = u.id AND p.project_id = $1 AND p.is_deleted IS NOT TRUE
      ) as total_poles_resolved,
      (
        SELECT COUNT(*) FROM switch_points sp 
        WHERE sp.confirmed_by = u.id AND sp.project_id = $1 AND (timezone('Asia/Kolkata', timezone('UTC', sp.confirmed_at)))::date = (timezone('Asia/Kolkata', NOW()))::date AND sp.is_deleted IS NOT TRUE
      ) as today_sp_resolved,
      (
        SELECT COUNT(*) FROM poles p 
        WHERE p.confirmed_by = u.id AND p.project_id = $1 AND (timezone('Asia/Kolkata', timezone('UTC', p.confirmed_at)))::date = (timezone('Asia/Kolkata', NOW()))::date AND p.is_deleted IS NOT TRUE
      ) as today_poles_resolved
    FROM project_users pu
    JOIN users u ON u.id = pu.user_id
    WHERE pu.project_id = $1
      AND pu.project_role = 'EMPLOYEE'
      AND u.is_deleted = FALSE
    ORDER BY (
      (SELECT COUNT(*) FROM switch_points sp WHERE sp.confirmed_by = u.id AND sp.project_id = $1 AND sp.is_deleted IS NOT TRUE) +
      (SELECT COUNT(*) FROM poles p WHERE p.confirmed_by = u.id AND p.project_id = $1 AND p.is_deleted IS NOT TRUE)
    ) DESC;
  `;
  const result = await query(sql, [projectId]);
  return result.rows;
}

async function getAdminTracking(projectId) {
  const sql = `
    SELECT 
      u.id, 
      u.email,
      u.name,
      (
        SELECT COUNT(*) FROM switch_points sp 
        WHERE sp.confirmed_by = u.id AND sp.project_id = $1 AND sp.is_deleted IS NOT TRUE
      ) as total_sp_resolved,
      (
        SELECT COUNT(*) FROM poles p 
        WHERE p.confirmed_by = u.id AND p.project_id = $1 AND p.is_deleted IS NOT TRUE
      ) as total_poles_resolved,
      (
        SELECT COUNT(*) FROM switch_points sp 
        WHERE sp.confirmed_by = u.id AND sp.project_id = $1 AND (timezone('Asia/Kolkata', timezone('UTC', sp.confirmed_at)))::date = (timezone('Asia/Kolkata', NOW()))::date AND sp.is_deleted IS NOT TRUE
      ) as today_sp_resolved,
      (
        SELECT COUNT(*) FROM poles p 
        WHERE p.confirmed_by = u.id AND p.project_id = $1 AND (timezone('Asia/Kolkata', timezone('UTC', p.confirmed_at)))::date = (timezone('Asia/Kolkata', NOW()))::date AND p.is_deleted IS NOT TRUE
      ) as today_poles_resolved
    FROM project_users pu
    JOIN users u ON u.id = pu.user_id
    WHERE pu.project_id = $1
      AND pu.project_role = 'ADMIN'
      AND u.is_deleted = FALSE
    ORDER BY (
      (SELECT COUNT(*) FROM switch_points sp WHERE sp.confirmed_by = u.id AND sp.project_id = $1 AND sp.is_deleted IS NOT TRUE) +
      (SELECT COUNT(*) FROM poles p WHERE p.confirmed_by = u.id AND p.project_id = $1 AND p.is_deleted IS NOT TRUE)
    ) DESC;
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
      (
        SELECT COUNT(*) FROM switch_points sp 
        WHERE sp.created_by = u.id AND sp.project_id = $1 AND sp.is_deleted IS NOT TRUE
      ) as total_sp,
      (
        SELECT COUNT(*) FROM poles p 
        WHERE p.created_by = u.id AND p.project_id = $1 AND p.is_deleted IS NOT TRUE
      ) as total_poles,
      (
        SELECT COUNT(*) FROM switch_points sp 
        WHERE sp.created_by = u.id AND sp.project_id = $1 AND (timezone('Asia/Kolkata', timezone('UTC', sp.created_at)))::date = (timezone('Asia/Kolkata', NOW()))::date AND sp.is_deleted IS NOT TRUE
      ) as today_sp,
      (
        SELECT COUNT(*) FROM poles p 
        WHERE p.created_by = u.id AND p.project_id = $1 AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date = (timezone('Asia/Kolkata', NOW()))::date AND p.is_deleted IS NOT TRUE
      ) as today_poles
    FROM project_users pu
    JOIN users u ON u.id = pu.user_id
    WHERE pu.project_id = $1
      AND pu.project_role = 'MOBILE_USER'
      AND u.is_deleted = FALSE
    ORDER BY (
      (SELECT COUNT(*) FROM switch_points sp WHERE sp.created_by = u.id AND sp.project_id = $1 AND sp.is_deleted IS NOT TRUE) +
      (SELECT COUNT(*) FROM poles p WHERE p.created_by = u.id AND p.project_id = $1 AND p.is_deleted IS NOT TRUE)
    ) DESC;
  `;
  const result = await query(sql, [projectId]);
  return result.rows;
}

async function getReportData(projectId, districtId, tillDate, ulbId, districtScope = null, ulbScope = null, fromDate = null, toDate = null, confirmedBy = null) {
  const params = [projectId, tillDate || null, districtId || null, ulbId || null];
  let scopeFilter = '';

  let spRangeFilter = '';
  let pRangeFilter = '';
  if (fromDate && fromDate.trim() !== '') {
    params.push(fromDate);
    const fromIdx = params.length;
    spRangeFilter += `\n    AND (($${fromIdx}::date IS NULL OR (timezone('Asia/Kolkata', timezone('UTC', sp.created_at)))::date >= $${fromIdx}))`;
    pRangeFilter += `\n    AND (($${fromIdx}::date IS NULL OR (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date >= $${fromIdx}))`;
  }
  if (toDate && toDate.trim() !== '') {
    params.push(toDate);
    const toIdx = params.length;
    spRangeFilter += `\n    AND (($${toIdx}::date IS NULL OR (timezone('Asia/Kolkata', timezone('UTC', sp.created_at)))::date <= $${toIdx}))`;
    pRangeFilter += `\n    AND (($${toIdx}::date IS NULL OR (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date <= $${toIdx}))`;
  }

  if (districtScope && Array.isArray(districtScope) && districtScope.length > 0) {
    params.push(districtScope);
    scopeFilter += ` AND d.id = ANY($${params.length})`;
  }
  if (ulbScope && Array.isArray(ulbScope) && ulbScope.length > 0) {
    params.push(ulbScope);
    scopeFilter += ` AND sp.ulb_id = ANY($${params.length})`;
  }

  let spConfirmedFilter = '';
  let pConfirmedFilter = '';
  if (confirmedBy) {
    params.push(Number(confirmedBy));
    const confIdx = params.length;
    spConfirmedFilter = ` AND sp.confirmed_by = $${confIdx}`;
    pConfirmedFilter = ` AND p.confirmed_by = $${confIdx}`;
  }

  const spSql = `
    SELECT 
      sp.*,
      u.name as user_name,
      u_conf.name as confirmed_by_name,
      ulb.name as ulb_name,
      d.name as district_name
    FROM switch_points sp
    JOIN users u ON sp.created_by = u.id
    LEFT JOIN users u_conf ON sp.confirmed_by = u_conf.id
    JOIN ulbs ulb ON sp.ulb_id = ulb.id
    JOIN districts d ON ulb.district_id = d.id
    WHERE sp.project_id = $1 AND sp.status = 'CONFIRMED' AND sp.is_deleted IS NOT TRUE
    AND ($2::date IS NULL OR (timezone('Asia/Kolkata', timezone('UTC', sp.created_at)))::date <= $2)
    AND ($3::int IS NULL OR ulb.district_id = $3)
    AND ($4::int IS NULL OR sp.ulb_id = $4)
    ${spRangeFilter}
    ${scopeFilter}
    ${spConfirmedFilter}
    ORDER BY sp.created_at DESC
  `;
  
  const spResult = await query(spSql, params);

  const pSql = `
    SELECT 
      p.*,
      u.name as user_name,
      u_conf.name as confirmed_by_name,
      ulb.name as ulb_name,
      d.name as district_name,
      sp.switch_point_number
    FROM poles p
    JOIN switch_points sp ON p.switch_point_id = sp.id
    JOIN users u ON p.created_by = u.id
    LEFT JOIN users u_conf ON p.confirmed_by = u_conf.id
    JOIN ulbs ulb ON sp.ulb_id = ulb.id
    JOIN districts d ON ulb.district_id = d.id
    WHERE p.project_id = $1 AND p.status = 'CONFIRMED' AND p.is_deleted IS NOT TRUE
    AND ($2::date IS NULL OR (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date <= $2)
    AND ($3::int IS NULL OR ulb.district_id = $3)
    AND ($4::int IS NULL OR sp.ulb_id = $4)
    ${pRangeFilter}
    ${scopeFilter}
    ${pConfirmedFilter}
    ORDER BY p.created_at DESC
  `;
  
  const pResult = await query(pSql, params);

  return {
    switchPoints: spResult.rows,
    poles: pResult.rows
  };
}

async function getDeletedSubmissions(projectId, page = 1, limit = 50, districtScope = null, ulbScope = null, fromDate = null, toDate = null, type = null) {
  const offset = (page - 1) * limit;
  
  let scopeFilter = '';
  const params = [projectId, limit, offset];
  let pIdx = 4;

  if (districtScope && Array.isArray(districtScope) && districtScope.length > 0) {
    scopeFilter += ` AND ulb.district_id = ANY($${pIdx})`;
    params.push(districtScope);
    pIdx++;
  }
  if (ulbScope && Array.isArray(ulbScope) && ulbScope.length > 0) {
    scopeFilter += ` AND sp.ulb_id = ANY($${pIdx})`;
    params.push(ulbScope);
    pIdx++;
  }

  let spDateFilter = '';
  let pDateFilter = '';
  if (fromDate && toDate) {
    const startIdx = params.length + 1;
    spDateFilter = ` AND (timezone('Asia/Kolkata', timezone('UTC', sp.deleted_at)))::date BETWEEN $${startIdx} AND $${startIdx + 1}`;
    pDateFilter = ` AND (timezone('Asia/Kolkata', timezone('UTC', p.deleted_at)))::date BETWEEN $${startIdx} AND $${startIdx + 1}`;
    params.push(fromDate, toDate);
  }

  let queryBody = '';
  if (type === 'switch_point') {
    queryBody = `
      SELECT 
        'switch_point' as type,
        sp.id,
        sp.ulb_id,
        NULL::int as switch_point_id,
        sp.created_by as user_id,
        u_cre.name as user_name,
        sp.created_at,
        sp.ward_number,
        sp.switch_point_number::text as identifier,
        ulb.name as ulb_name,
        dist.name as district_name,
        sp.switch_point_number::text as switch_point_number,
        sp.switch_point_type,
        sp.meter_exists,
        sp.meter_type,
        sp.meter_rr_number,
        sp.meter_serial_number,
        sp.meter_condition,
        sp.latitude,
        sp.longitude,
        sp.confirmed_by,
        sp.confirmed_at,
        u_conf.name as confirmed_by_name,
        sp.deleted_by,
        sp.deleted_at,
        u_del.name as deleted_by_name,
        NULL as conductor_type,
        NULL as pole_type,
        NULL::numeric as pole_height_mtrs,
        NULL as pole_condition,
        NULL::numeric as pole_to_pole_distance_mtrs,
        NULL as arm_type,
        NULL as arm_status,
        NULL as present_arm_no,
        NULL::numeric as present_arm_length_mtrs,
        NULL as how_many_lights_in_pole,
        NULL as light_mounting_height,
        NULL as light_type, NULL as light_capacity, NULL as light_type_2, NULL as light_capacity_2,
        NULL as light_working_status,
        NULL as road_category,
        NULL as road_type,
        NULL::numeric as road_width_mtrs,
        NULL as pole_earthing_exists
      FROM switch_points sp
      LEFT JOIN users u_cre ON sp.created_by = u_cre.id
      LEFT JOIN users u_conf ON sp.confirmed_by = u_conf.id
      LEFT JOIN users u_del ON sp.deleted_by = u_del.id
      LEFT JOIN ulbs ulb ON sp.ulb_id = ulb.id
      LEFT JOIN districts dist ON ulb.district_id = dist.id
      WHERE sp.project_id = $1 AND sp.is_deleted = TRUE
      ${spDateFilter}
      ${scopeFilter}
    `;
  } else if (type === 'pole') {
    queryBody = `
      SELECT 
        'pole' as type,
        p.id,
        sp.ulb_id,
        p.switch_point_id,
        p.created_by as user_id,
        u_cre.name as user_name,
        p.created_at,
        sp.ward_number,
        p.pole_number::text as identifier,
        ulb.name as ulb_name,
        dist.name as district_name,
        p.switch_point_number::text as switch_point_number,
        NULL as switch_point_type,
        NULL::boolean as meter_exists,
        NULL as meter_type,
        NULL as meter_rr_number,
        NULL as meter_serial_number,
        NULL as meter_condition,
        p.latitude,
        p.longitude,
        p.confirmed_by,
        p.confirmed_at,
        u_conf.name as confirmed_by_name,
        p.deleted_by,
        p.deleted_at,
        u_del.name as deleted_by_name,
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
        p.light_type, p.light_capacity, p.light_type_2, p.light_capacity_2,
        p.light_working_status,
        p.road_category,
        p.road_type,
        p.road_width_mtrs,
        p.pole_earthing_exists
      FROM poles p
      JOIN switch_points sp ON p.switch_point_id = sp.id
      LEFT JOIN users u_cre ON p.created_by = u_cre.id
      LEFT JOIN users u_conf ON p.confirmed_by = u_conf.id
      LEFT JOIN users u_del ON p.deleted_by = u_del.id
      LEFT JOIN ulbs ulb ON sp.ulb_id = ulb.id
      LEFT JOIN districts dist ON ulb.district_id = dist.id
      WHERE p.project_id = $1 AND p.is_deleted = TRUE
      ${pDateFilter}
      ${scopeFilter}
    `;
  } else {
    queryBody = `
      SELECT 
        'switch_point' as type,
        sp.id,
        sp.ulb_id,
        NULL::int as switch_point_id,
        sp.created_by as user_id,
        u_cre.name as user_name,
        sp.created_at,
        sp.ward_number,
        sp.switch_point_number::text as identifier,
        ulb.name as ulb_name,
        dist.name as district_name,
        sp.switch_point_number::text as switch_point_number,
        sp.switch_point_type,
        sp.meter_exists,
        sp.meter_type,
        sp.meter_rr_number,
        sp.meter_serial_number,
        sp.meter_condition,
        sp.latitude,
        sp.longitude,
        sp.confirmed_by,
        sp.confirmed_at,
        u_conf.name as confirmed_by_name,
        sp.deleted_by,
        sp.deleted_at,
        u_del.name as deleted_by_name,
        NULL as conductor_type,
        NULL as pole_type,
        NULL::numeric as pole_height_mtrs,
        NULL as pole_condition,
        NULL::numeric as pole_to_pole_distance_mtrs,
        NULL as arm_type,
        NULL as arm_status,
        NULL as present_arm_no,
        NULL::numeric as present_arm_length_mtrs,
        NULL as how_many_lights_in_pole,
        NULL as light_mounting_height,
        NULL as light_type, NULL as light_capacity, NULL as light_type_2, NULL as light_capacity_2,
        NULL as light_working_status,
        NULL as road_category,
        NULL as road_type,
        NULL::numeric as road_width_mtrs,
        NULL as pole_earthing_exists
      FROM switch_points sp
      LEFT JOIN users u_cre ON sp.created_by = u_cre.id
      LEFT JOIN users u_conf ON sp.confirmed_by = u_conf.id
      LEFT JOIN users u_del ON sp.deleted_by = u_del.id
      LEFT JOIN ulbs ulb ON sp.ulb_id = ulb.id
      LEFT JOIN districts dist ON ulb.district_id = dist.id
      WHERE sp.project_id = $1 AND sp.is_deleted = TRUE
      ${spDateFilter}
      ${scopeFilter}
      
      UNION ALL
      
      SELECT 
        'pole' as type,
        p.id,
        sp.ulb_id,
        p.switch_point_id,
        p.created_by as user_id,
        u_cre.name as user_name,
        p.created_at,
        sp.ward_number,
        p.pole_number::text as identifier,
        ulb.name as ulb_name,
        dist.name as district_name,
        p.switch_point_number::text as switch_point_number,
        NULL as switch_point_type,
        NULL::boolean as meter_exists,
        NULL as meter_type,
        NULL as meter_rr_number,
        NULL as meter_serial_number,
        NULL as meter_condition,
        p.latitude,
        p.longitude,
        p.confirmed_by,
        p.confirmed_at,
        u_conf.name as confirmed_by_name,
        p.deleted_by,
        p.deleted_at,
        u_del.name as deleted_by_name,
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
        p.light_type, p.light_capacity, p.light_type_2, p.light_capacity_2,
        p.light_working_status,
        p.road_category,
        p.road_type,
        p.road_width_mtrs,
        p.pole_earthing_exists
      FROM poles p
      JOIN switch_points sp ON p.switch_point_id = sp.id
      LEFT JOIN users u_cre ON p.created_by = u_cre.id
      LEFT JOIN users u_conf ON p.confirmed_by = u_conf.id
      LEFT JOIN users u_del ON p.deleted_by = u_del.id
      LEFT JOIN ulbs ulb ON sp.ulb_id = ulb.id
      LEFT JOIN districts dist ON ulb.district_id = dist.id
      WHERE p.project_id = $1 AND p.is_deleted = TRUE
      ${pDateFilter}
      ${scopeFilter}
    `;
  }

  const sql = `
    SELECT *, COUNT(*) OVER() AS total_count FROM (
      ${queryBody}
    ) combined
    ORDER BY deleted_at DESC
    LIMIT $2 OFFSET $3
  `;
  
  const result = await query(sql, params);
  const total = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;
  return { rows: result.rows, total };
}
async function getMyConfirmedStats(projectId, userId) {
  const sql = `
    SELECT 
      (SELECT COUNT(*)::int FROM switch_points WHERE project_id = $1 AND confirmed_by = $2 AND is_deleted IS NOT TRUE) as total_sp,
      (SELECT COUNT(*)::int FROM poles WHERE project_id = $1 AND confirmed_by = $2 AND is_deleted IS NOT TRUE) as total_poles,
      (SELECT COUNT(*)::int FROM switch_points WHERE project_id = $1 AND confirmed_by = $2 AND is_deleted IS NOT TRUE AND (timezone('Asia/Kolkata', timezone('UTC', confirmed_at)))::date = (timezone('Asia/Kolkata', NOW()))::date) as today_sp,
      (SELECT COUNT(*)::int FROM poles WHERE project_id = $1 AND confirmed_by = $2 AND is_deleted IS NOT TRUE AND (timezone('Asia/Kolkata', timezone('UTC', confirmed_at)))::date = (timezone('Asia/Kolkata', NOW()))::date) as today_poles;
  `;
  const result = await query(sql, [projectId, userId]);
  return result.rows[0];
}

module.exports = { getDistrictSummary, getWardSummary, getWardDetails, getPendingSubmissions, getTodaySubmissions, getConfirmedSubmissions, getDeletedSubmissions, getMyStats, getEmployeeTracking, getMobileUserTracking, getAdminTracking, getReportData, getMyConfirmedStats };
