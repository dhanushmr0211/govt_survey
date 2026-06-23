const { query, pool } = require('../../../config/db');
const { getLocalDateString } = require('../../../utils/date');

async function resolveUserNames(rows) {
  if (!rows || rows.length === 0) return rows;
  
  const userIds = new Set();
  rows.forEach(row => {
    if (row.user_id && !isNaN(Number(row.user_id))) userIds.add(Number(row.user_id));
    if (row.confirmed_by && !isNaN(Number(row.confirmed_by))) userIds.add(Number(row.confirmed_by));
    if (row.pole_confirmed_by && !isNaN(Number(row.pole_confirmed_by))) userIds.add(Number(row.pole_confirmed_by));
    if (row.deleted_by && !isNaN(Number(row.deleted_by))) userIds.add(Number(row.deleted_by));
  });
  
  if (userIds.size === 0) return rows;
  
  const userResult = await pool.query(
    'SELECT id, name FROM users WHERE id = ANY($1)',
    [Array.from(userIds)]
  );
  
  const userMap = {};
  userResult.rows.forEach(u => {
    userMap[u.id] = u.name;
  });
  
  rows.forEach(row => {
    if (row.user_id) {
      row.user_name = userMap[row.user_id] || `User #${row.user_id}`;
    }
    if (row.confirmed_by) {
      row.confirmed_by_name = userMap[row.confirmed_by] || `User #${row.confirmed_by}`;
    }
    if (row.pole_confirmed_by) {
      row.pole_confirmed_by_name = userMap[row.pole_confirmed_by] || `User #${row.pole_confirmed_by}`;
    }
    if (row.deleted_by) {
      row.deleted_by_name = userMap[row.deleted_by] || `User #${row.deleted_by}`;
    }
  });
  
  return rows;
}

async function getDistrictSummary(projectId, date = null, mode = 'exact', _districtScope = null, ulbScope = null, fromDate = null, toDate = null) {
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

  let scopeFilter = '';
  if (ulbScope && Array.isArray(ulbScope) && ulbScope.length > 0) {
    scopeFilter = `AND w.id = ANY($${pIdx})`;
    tgplParams.push(ulbScope);
    pIdx++;
  }

  const tgplSql = `
    SELECT 
      1 as district_id,
      'Wards' as district_name,
      w.id as ulb_id,
      w.name as ulb_name,
      COALESCE((
        SELECT COUNT(DISTINCT p.ccms_number) FROM poles p
        WHERE p.ward_id = w.id AND p.is_deleted = FALSE AND p.ccms_number IS NOT NULL AND p.ccms_number != '' ${dateFilter}
      ), 0) as total_ccms,
      COALESCE((
        SELECT COUNT(p.id) FROM poles p
        WHERE p.ward_id = w.id AND p.is_deleted = FALSE ${dateFilter}
      ), 0) as total_poles,
      COALESCE((
        SELECT COUNT(p.id) FROM poles p
        WHERE p.ward_id = w.id AND p.is_deleted = FALSE AND COALESCE(p.survey_type, 'survey') = 'survey' ${dateFilter}
      ), 0) as total_survey_poles,
      COALESCE((
        SELECT COUNT(p.id) FROM poles p
        WHERE p.ward_id = w.id AND p.is_deleted = FALSE AND p.survey_type = 'installation' ${dateFilter}
      ), 0) as total_inst_poles
    FROM wards w
    WHERE w.is_deleted = FALSE ${scopeFilter}
    ORDER BY w.name;
  `;
  const result = await query(tgplSql, tgplParams);
  return result.rows;
}

async function getWardSummary(ulbId, date = null, mode = 'exact', _districtScope = null, ulbScope = null, fromDate = null, toDate = null) {
  let dateFilter = '';
  const tgplParams = [ulbId];
  let pIdx = 2;
  
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

  let scopeFilter = '';
  if (ulbScope && Array.isArray(ulbScope) && ulbScope.length > 0) {
    scopeFilter = `AND w.id = ANY($${pIdx})`;
    tgplParams.push(ulbScope);
    pIdx++;
  }

  const tgplSql = `
    SELECT 
      w.name as ward_number,
      COALESCE((
        SELECT COUNT(DISTINCT p.ccms_number) FROM poles p
        WHERE p.ward_id = w.id AND p.is_deleted = FALSE AND p.ccms_number IS NOT NULL AND p.ccms_number != '' ${dateFilter}
      ), 0) as total_ccms,
      COALESCE((
        SELECT COUNT(p.id) FROM poles p
        WHERE p.ward_id = w.id AND p.is_deleted = FALSE ${dateFilter}
      ), 0) as total_poles
    FROM wards w
    WHERE w.id = $1 AND w.is_deleted = FALSE ${scopeFilter};
  `;
  const result = await query(tgplSql, tgplParams);
  return result.rows;
}

async function getWardDetails(ulbId, wardNumber, date = null, mode = 'exact', _districtScope = null, ulbScope = null, fromDate = null, toDate = null) {
  let dateFilter = '';
  const tgplParams = [ulbId];
  let pIdx = 2;
  
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

  let scopeFilter = '';
  if (ulbScope && Array.isArray(ulbScope) && ulbScope.length > 0) {
    scopeFilter = `AND w.id = ANY($${pIdx})`;
    tgplParams.push(ulbScope);
    pIdx++;
  }

  const tgplSql = `
    SELECT 
      w.name as ward_number,
      COALESCE(p.ccms_number, 'NO_CCMS') as ccms_id,
      p.ccms_number,
      p.meter_type,
      p.meter_dimensional_status as meter_condition,
      p.meter_rr_number,
      p.meter_serial_number,
      p.id as pole_id,
      p.created_by as user_id,
      p.created_at,
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
      p.light_type_2,
      p.light_capacity_2,
      p.road_width_mtrs,
      p.pole_earthing_exists,
      p.confirmed_by as pole_confirmed_by,
      p.confirmed_at as pole_confirmed_at,
      NULL::text as pole_confirmed_by_name,
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
      p.req_dedicated_wire,
      p.survey_type,
      p.light_type_3,
      p.light_capacity_3,
      p.light_type_4,
      p.light_capacity_4,
      p.light_type_5,
      p.light_capacity_5
    FROM poles p
    JOIN wards w ON p.ward_id = w.id
    WHERE p.ward_id = $1 AND p.is_deleted = FALSE ${dateFilter} ${scopeFilter}
    ORDER BY p.id DESC;
  `;
  const result = await query(tgplSql, tgplParams);
  return resolveUserNames(result.rows);
}

async function getPendingSubmissions(projectId, page = 1, limit = 50, userId = null, _districtScope = null, ulbScope = null, fromDate = null, toDate = null, dateField = 'created_at', type = null, surveyType = null) {
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

  let pSurveyTypeFilter = '';
  if (surveyType) {
    const startIdx = params.length + 1;
    if (surveyType === 'survey') {
      pSurveyTypeFilter = ` AND COALESCE(p.survey_type, 'survey') = $${startIdx}`;
      params.push('survey');
    } else if (surveyType === 'installation') {
      pSurveyTypeFilter = ` AND p.survey_type = $${startIdx}`;
      params.push('installation');
    }
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
        NULL::text as light_type_2,
        NULL::text as light_capacity_2,
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
        NULL::text as user_name,
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
        p.light_type_2,
        p.light_capacity_2,
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
        p.req_dedicated_wire,
        p.image_url_1,
        p.image_url_2,
        p.survey_type,
        p.light_type_3,
        p.light_capacity_3,
        p.light_type_4,
        p.light_capacity_4,
        p.light_type_5,
        p.light_capacity_5
      FROM poles p
      JOIN wards w ON p.ward_id = w.id
      WHERE p.project_id = $1 AND p.status = 'PENDING' AND p.is_deleted = FALSE
      AND ($4::int IS NULL OR p.created_by = $4)
      ${pDateFilter}
      ${scopeFilter}
      ${pSurveyTypeFilter}
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
  const rows = await resolveUserNames(result.rows);
  return { rows, total };
}

async function getConfirmedSubmissions(projectId, page = 1, limit = 50, userId = null, confirmedBy = null, _districtScope = null, ulbScope = null, fromDate = null, toDate = null, dateField = 'created_at', type = null, surveyType = null) {
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

  let pSurveyTypeFilter = '';
  if (surveyType) {
    const startIdx = params.length + 1;
    if (surveyType === 'survey') {
      pSurveyTypeFilter = ` AND COALESCE(p.survey_type, 'survey') = $${startIdx}`;
      params.push('survey');
    } else if (surveyType === 'installation') {
      pSurveyTypeFilter = ` AND p.survey_type = $${startIdx}`;
      params.push('installation');
    }
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
        NULL::text as light_type_2,
        NULL::text as light_capacity_2,
        NULL::text as light_working_status,
        NULL::text as road_category,
        NULL::text as road_type,
        NULL::numeric as road_width_mtrs,
        NULL::text as pole_earthing_exists,
        NULL::text as image_url_1,
        NULL::text as image_url_2
      LIMIT 0
    `;
  } else {
    queryBody = `
      SELECT 
        'pole' as type,
        p.id,
        p.created_by as user_id,
        NULL::text as user_name,
        p.created_at,
        w.name as ward_number,
        p.pole_number::text as identifier,
        w.name as ulb_name,
        p.ccms_number::text as switch_point_number,
        p.confirmed_by,
        p.confirmed_at,
        NULL::text as confirmed_by_name,
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
        p.light_type_2,
        p.light_capacity_2,
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
        p.req_dedicated_wire,
        p.image_url_1,
        p.image_url_2,
        p.survey_type,
        p.light_type_3,
        p.light_capacity_3,
        p.light_type_4,
        p.light_capacity_4,
        p.light_type_5,
        p.light_capacity_5
      FROM poles p
      JOIN wards w ON p.ward_id = w.id
      WHERE p.project_id = $1 AND p.status = 'CONFIRMED' AND p.is_deleted = FALSE
      AND ($4::int IS NULL OR p.created_by = $4)
      AND ($5::int IS NULL OR p.confirmed_by = $5)
      ${pDateFilter}
      ${scopeFilter}
      ${pSurveyTypeFilter}
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
  const rows = await resolveUserNames(result.rows);
  return { rows, total };
}

async function getTodaySubmissions(projectId, page = 1, limit = 50, userId = null, _districtScope = null, ulbScope = null) {
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
        NULL::text as user_name,
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
        p.light_type_2,
        p.light_capacity_2,
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
        p.req_dedicated_wire,
        p.image_url_1,
        p.image_url_2,
        p.survey_type,
        p.light_type_3,
        p.light_capacity_3,
        p.light_type_4,
        p.light_capacity_4,
        p.light_type_5,
        p.light_capacity_5,
        p.confirmed_by as pole_confirmed_by,
        p.confirmed_at as pole_confirmed_at
      FROM poles p
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
  const rows = await resolveUserNames(result.rows);
  return { rows, total };
}

async function getMyStats(projectId, userId, date = null) {
  const todayStr = getLocalDateString();
  
  // Total stats
  const totalResult = await query(
    `SELECT 
       COUNT(CASE WHEN COALESCE(survey_type, 'survey') = 'survey' THEN 1 END) as survey_count,
       COUNT(CASE WHEN survey_type = 'installation' THEN 1 END) as installation_count
     FROM poles 
     WHERE project_id = $1 AND created_by = $2 AND is_deleted = FALSE`,
    [projectId, userId]
  );

  // Today's stats
  const todayResult = await query(
    `SELECT 
       COUNT(CASE WHEN COALESCE(survey_type, 'survey') = 'survey' THEN 1 END) as survey_count,
       COUNT(CASE WHEN survey_type = 'installation' THEN 1 END) as installation_count
     FROM poles 
     WHERE project_id = $1 AND created_by = $2 AND is_deleted = FALSE
     AND (timezone('Asia/Kolkata', timezone('UTC', created_at)))::date = $3`,
    [projectId, userId, todayStr]
  );

  // Date-wise stats (custom date if passed, otherwise default to today)
  const targetDate = date || todayStr;
  const dateWiseResult = await query(
    `SELECT 
       COUNT(CASE WHEN COALESCE(survey_type, 'survey') = 'survey' THEN 1 END) as survey_count,
       COUNT(CASE WHEN survey_type = 'installation' THEN 1 END) as installation_count
     FROM poles 
     WHERE project_id = $1 AND created_by = $2 AND is_deleted = FALSE
     AND (timezone('Asia/Kolkata', timezone('UTC', created_at)))::date = $3`,
    [projectId, userId, targetDate]
  );

  return {
    total: {
      switch_points: 0,
      poles: parseInt(totalResult.rows[0].survey_count, 10) + parseInt(totalResult.rows[0].installation_count, 10),
      survey_poles: parseInt(totalResult.rows[0].survey_count, 10),
      installation_poles: parseInt(totalResult.rows[0].installation_count, 10)
    },
    today: {
      switch_points: 0,
      poles: parseInt(todayResult.rows[0].survey_count, 10) + parseInt(todayResult.rows[0].installation_count, 10),
      survey_poles: parseInt(todayResult.rows[0].survey_count, 10),
      installation_poles: parseInt(todayResult.rows[0].installation_count, 10)
    },
    dateWise: {
      date: targetDate,
      switch_points: 0,
      poles: parseInt(dateWiseResult.rows[0].survey_count, 10) + parseInt(dateWiseResult.rows[0].installation_count, 10),
      survey_poles: parseInt(dateWiseResult.rows[0].survey_count, 10),
      installation_poles: parseInt(dateWiseResult.rows[0].installation_count, 10)
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
      COUNT(CASE WHEN (timezone('Asia/Kolkata', timezone('UTC', p.confirmed_at)))::date = (timezone('Asia/Kolkata', NOW()))::date THEN p.id END) as today_poles_resolved,
      COUNT(CASE WHEN COALESCE(p.survey_type, 'survey') = 'survey' THEN p.id END) as total_survey_resolved,
      COUNT(CASE WHEN p.survey_type = 'installation' THEN p.id END) as total_inst_resolved,
      COUNT(CASE WHEN COALESCE(p.survey_type, 'survey') = 'survey' AND (timezone('Asia/Kolkata', timezone('UTC', p.confirmed_at)))::date = (timezone('Asia/Kolkata', NOW()))::date THEN p.id END) as today_survey_resolved,
      COUNT(CASE WHEN p.survey_type = 'installation' AND (timezone('Asia/Kolkata', timezone('UTC', p.confirmed_at)))::date = (timezone('Asia/Kolkata', NOW()))::date THEN p.id END) as today_inst_resolved
     FROM poles p
     WHERE p.confirmed_by = ANY($1) AND p.project_id = $2 AND p.is_deleted = FALSE
     GROUP BY p.confirmed_by`,
    [userIds, projectId]
  );
  
  const statsMap = {};
  statsResult.rows.forEach(r => {
    statsMap[r.id] = {
      total_poles_resolved: parseInt(r.total_poles_resolved, 10),
      today_poles_resolved: parseInt(r.today_poles_resolved, 10),
      total_survey_resolved: parseInt(r.total_survey_resolved, 10),
      total_inst_resolved: parseInt(r.total_inst_resolved, 10),
      today_survey_resolved: parseInt(r.today_survey_resolved, 10),
      today_inst_resolved: parseInt(r.today_inst_resolved, 10)
    };
  });

  const result = users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    total_sp_resolved: 0,
    total_poles_resolved: statsMap[u.id]?.total_poles_resolved || 0,
    total_survey_resolved: statsMap[u.id]?.total_survey_resolved || 0,
    total_inst_resolved: statsMap[u.id]?.total_inst_resolved || 0,
    today_sp_resolved: 0,
    today_poles_resolved: statsMap[u.id]?.today_poles_resolved || 0,
    today_survey_resolved: statsMap[u.id]?.today_survey_resolved || 0,
    today_inst_resolved: statsMap[u.id]?.today_inst_resolved || 0
  }));

  result.sort((a, b) => b.total_poles_resolved - a.total_poles_resolved);
  return result;
}

async function getAdminTracking(projectId) {
  const usersResult = await pool.query(
    `SELECT u.id, u.email, u.name 
     FROM project_users pu
     JOIN users u ON u.id = pu.user_id
     WHERE pu.project_id = $1 AND pu.project_role = 'ADMIN' AND u.is_deleted = FALSE`,
    [projectId]
  );
  const users = usersResult.rows;
  if (users.length === 0) return [];
  
  const userIds = users.map(u => u.id);
  
  const statsResult = await query(
    `SELECT 
      p.confirmed_by as id,
      COUNT(p.id) as total_poles_resolved,
      COUNT(CASE WHEN (timezone('Asia/Kolkata', timezone('UTC', p.confirmed_at)))::date = (timezone('Asia/Kolkata', NOW()))::date THEN p.id END) as today_poles_resolved,
      COUNT(CASE WHEN COALESCE(p.survey_type, 'survey') = 'survey' THEN p.id END) as total_survey_resolved,
      COUNT(CASE WHEN p.survey_type = 'installation' THEN p.id END) as total_inst_resolved,
      COUNT(CASE WHEN COALESCE(p.survey_type, 'survey') = 'survey' AND (timezone('Asia/Kolkata', timezone('UTC', p.confirmed_at)))::date = (timezone('Asia/Kolkata', NOW()))::date THEN p.id END) as today_survey_resolved,
      COUNT(CASE WHEN p.survey_type = 'installation' AND (timezone('Asia/Kolkata', timezone('UTC', p.confirmed_at)))::date = (timezone('Asia/Kolkata', NOW()))::date THEN p.id END) as today_inst_resolved
     FROM poles p
     WHERE p.confirmed_by = ANY($1) AND p.project_id = $2 AND p.is_deleted = FALSE
     GROUP BY p.confirmed_by`,
    [userIds, projectId]
  );
  
  const statsMap = {};
  statsResult.rows.forEach(r => {
    statsMap[r.id] = {
      total_poles_resolved: parseInt(r.total_poles_resolved, 10),
      today_poles_resolved: parseInt(r.today_poles_resolved, 10),
      total_survey_resolved: parseInt(r.total_survey_resolved, 10),
      total_inst_resolved: parseInt(r.total_inst_resolved, 10),
      today_survey_resolved: parseInt(r.today_survey_resolved, 10),
      today_inst_resolved: parseInt(r.today_inst_resolved, 10)
    };
  });

  const result = users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    total_sp_resolved: 0,
    total_poles_resolved: statsMap[u.id]?.total_poles_resolved || 0,
    total_survey_resolved: statsMap[u.id]?.total_survey_resolved || 0,
    total_inst_resolved: statsMap[u.id]?.total_inst_resolved || 0,
    today_sp_resolved: 0,
    today_poles_resolved: statsMap[u.id]?.today_poles_resolved || 0,
    today_survey_resolved: statsMap[u.id]?.today_survey_resolved || 0,
    today_inst_resolved: statsMap[u.id]?.today_inst_resolved || 0
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
      COUNT(CASE WHEN (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date = (timezone('Asia/Kolkata', NOW()))::date THEN p.id END) as today_poles,
      COUNT(CASE WHEN COALESCE(p.survey_type, 'survey') = 'survey' THEN p.id END) as total_survey,
      COUNT(CASE WHEN p.survey_type = 'installation' THEN p.id END) as total_inst,
      COUNT(CASE WHEN COALESCE(p.survey_type, 'survey') = 'survey' AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date = (timezone('Asia/Kolkata', NOW()))::date THEN p.id END) as today_survey,
      COUNT(CASE WHEN p.survey_type = 'installation' AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date = (timezone('Asia/Kolkata', NOW()))::date THEN p.id END) as today_inst
     FROM poles p
     WHERE p.created_by = ANY($1) AND p.project_id = $2 AND p.is_deleted = FALSE
     GROUP BY p.created_by`,
    [userIds, projectId]
  );
  
  const statsMap = {};
  statsResult.rows.forEach(r => {
    statsMap[r.id] = {
      total_poles: parseInt(r.total_poles, 10),
      today_poles: parseInt(r.today_poles, 10),
      total_survey: parseInt(r.total_survey, 10),
      total_inst: parseInt(r.total_inst, 10),
      today_survey: parseInt(r.today_survey, 10),
      today_inst: parseInt(r.today_inst, 10)
    };
  });

  const result = users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    total_sp: 0,
    total_poles: statsMap[u.id]?.total_poles || 0,
    total_survey: statsMap[u.id]?.total_survey || 0,
    total_inst: statsMap[u.id]?.total_inst || 0,
    today_sp: 0,
    today_poles: statsMap[u.id]?.today_poles || 0,
    today_survey: statsMap[u.id]?.today_survey || 0,
    today_inst: statsMap[u.id]?.today_inst || 0
  }));

  result.sort((a, b) => b.total_poles - a.total_poles);
  return result;
}

async function getReportData(projectId, districtId, tillDate, ulbId, _districtScope = null, ulbScope = null, fromDate = null, toDate = null) {
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
      p.created_by as user_id,
      NULL::text as user_name,
      w.name as ulb_name,
      'Wards' as district_name,
      p.ccms_number as switch_point_number
    FROM poles p
    JOIN wards w ON p.ward_id = w.id
    WHERE p.project_id = $1 AND p.status = 'CONFIRMED' AND p.is_deleted = FALSE
    AND ($2::date IS NULL OR (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date <= $2)
    AND ($3::int IS NULL OR p.ward_id = $3)
    ${pRangeFilter}
    ${scopeFilter}
    ORDER BY p.created_at DESC
  `;
  
  const pResult = await query(pSql, params);
  const poles = await resolveUserNames(pResult.rows);

  return {
    switchPoints: [],
    poles
  };
}

async function getDeletedSubmissions(projectId, page = 1, limit = 50, _districtScope = null, ulbScope = null, fromDate = null, toDate = null, type = null, surveyType = null) {
  const offset = (page - 1) * limit;
  let scopeFilter = '';
  const params = [projectId, limit, offset];
  let pIdx = 4;

  if (ulbScope && Array.isArray(ulbScope) && ulbScope.length > 0) {
    scopeFilter += ` AND p.ward_id = ANY($${pIdx})`;
    params.push(ulbScope);
    pIdx++;
  }

  let pDateFilter = '';
  if (fromDate && toDate) {
    const startIdx = params.length + 1;
    pDateFilter = ` AND (timezone('Asia/Kolkata', timezone('UTC', p.deleted_at)))::date BETWEEN $${startIdx} AND $${startIdx + 1}`;
    params.push(fromDate, toDate);
  }

  let pSurveyTypeFilter = '';
  if (surveyType) {
    const startIdx = params.length + 1;
    if (surveyType === 'survey') {
      pSurveyTypeFilter = ` AND COALESCE(p.survey_type, 'survey') = $${startIdx}`;
      params.push('survey');
    } else if (surveyType === 'installation') {
      pSurveyTypeFilter = ` AND p.survey_type = $${startIdx}`;
      params.push('installation');
    }
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
        NULL::int as deleted_by,
        NULL::timestamp as deleted_at,
        NULL::text as deleted_by_name,
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
        NULL::text as light_type, NULL::text as light_capacity, NULL::text as light_type_2, NULL::text as light_capacity_2,
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
        u_cre.name as user_name,
        p.created_at,
        w.name as ward_number,
        p.pole_number::text as identifier,
        w.name as ulb_name,
        p.switch_point_number::text as switch_point_number,
        p.confirmed_by,
        p.confirmed_at,
        u_conf.name as confirmed_by_name,
        p.deleted_by,
        p.deleted_at,
        u_del.name as deleted_by_name,
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
        p.pole_earthing_exists,
        p.survey_type,
        p.light_type_3,
        p.light_capacity_3,
        p.light_type_4,
        p.light_capacity_4,
        p.light_type_5,
        p.light_capacity_5
      FROM poles p
      JOIN wards w ON p.ward_id = w.id
      LEFT JOIN users u_cre ON p.created_by = u_cre.id
      LEFT JOIN users u_conf ON p.confirmed_by = u_conf.id
      LEFT JOIN users u_del ON p.deleted_by = u_del.id
      WHERE p.project_id = $1 AND p.is_deleted = TRUE
      ${pDateFilter}
      ${scopeFilter}
      ${pSurveyTypeFilter}
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
  const resolved = await resolveUserNames(result.rows);
  return { rows: resolved, total };
}

module.exports = {
  getDistrictSummary,
  getWardSummary,
  getWardDetails,
  getPendingSubmissions,
  getConfirmedSubmissions,
  getTodaySubmissions,
  getDeletedSubmissions,
  getMyStats,
  getEmployeeTracking,
  getMobileUserTracking,
  getAdminTracking,
  getReportData
};
