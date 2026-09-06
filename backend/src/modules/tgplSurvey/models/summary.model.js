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
  let dateFilterP = '';
  let dateFilterI = '';
  const tgplParams = [];
  let pIdx = 1;
  
  if (fromDate && toDate) {
    dateFilterP = `AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date BETWEEN $${pIdx} AND $${pIdx + 1}`;
    dateFilterI = `AND (timezone('Asia/Kolkata', timezone('UTC', i.created_at)))::date BETWEEN $${pIdx} AND $${pIdx + 1}`;
    tgplParams.push(fromDate, toDate);
    pIdx += 2;
  } else if (date) {
    if (date === 'till_yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);
      dateFilterP = `AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date <= $${pIdx}`;
      dateFilterI = `AND (timezone('Asia/Kolkata', timezone('UTC', i.created_at)))::date <= $${pIdx}`;
      tgplParams.push(yesterdayStr);
    } else {
      const operator = mode === 'cumulative' ? '<=' : '=';
      dateFilterP = `AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date ${operator} $${pIdx}`;
      dateFilterI = `AND (timezone('Asia/Kolkata', timezone('UTC', i.created_at)))::date ${operator} $${pIdx}`;
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
        SELECT COUNT(DISTINCT ccms_number) FROM (
          SELECT p.ccms_number FROM poles p WHERE p.ward_id = w.id AND p.is_deleted = FALSE AND p.ccms_number IS NOT NULL AND p.ccms_number != '' ${dateFilterP}
          UNION
          SELECT i.ccms_number FROM tgpl_installations i WHERE i.ward_id = w.id AND i.is_deleted = FALSE AND i.ccms_number IS NOT NULL AND i.ccms_number != '' ${dateFilterI}
        ) u_ccms
      ), 0) as total_ccms,
      (
        COALESCE((SELECT COUNT(p.id) FROM poles p WHERE p.ward_id = w.id AND p.is_deleted = FALSE ${dateFilterP}), 0) +
        COALESCE((SELECT COUNT(i.id) FROM tgpl_installations i WHERE i.ward_id = w.id AND i.is_deleted = FALSE ${dateFilterI}), 0)
      ) as total_poles,
      COALESCE((
        SELECT COUNT(p.id) FROM poles p
        WHERE p.ward_id = w.id AND p.is_deleted = FALSE ${dateFilterP}
      ), 0) as total_survey_poles,
      COALESCE((
        SELECT COUNT(i.id) FROM tgpl_installations i
        WHERE i.ward_id = w.id AND i.is_deleted = FALSE ${dateFilterI}
      ), 0) as total_inst_poles
    FROM wards w
    WHERE w.is_deleted = FALSE ${scopeFilter}
    ORDER BY w.name;
  `;
  const result = await query(tgplSql, tgplParams);
  return result.rows;
}

async function getWardSummary(ulbId, date = null, mode = 'exact', _districtScope = null, ulbScope = null, fromDate = null, toDate = null) {
  let dateFilterP = '';
  let dateFilterI = '';
  const tgplParams = [ulbId];
  let pIdx = 2;
  
  if (fromDate && toDate) {
    dateFilterP = `AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date BETWEEN $${pIdx} AND $${pIdx + 1}`;
    dateFilterI = `AND (timezone('Asia/Kolkata', timezone('UTC', i.created_at)))::date BETWEEN $${pIdx} AND $${pIdx + 1}`;
    tgplParams.push(fromDate, toDate);
    pIdx += 2;
  } else if (date) {
    if (date === 'till_yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);
      dateFilterP = `AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date <= $${pIdx}`;
      dateFilterI = `AND (timezone('Asia/Kolkata', timezone('UTC', i.created_at)))::date <= $${pIdx}`;
      tgplParams.push(yesterdayStr);
    } else {
      const operator = mode === 'cumulative' ? '<=' : '=';
      dateFilterP = `AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date ${operator} $${pIdx}`;
      dateFilterI = `AND (timezone('Asia/Kolkata', timezone('UTC', i.created_at)))::date ${operator} $${pIdx}`;
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
        SELECT COUNT(DISTINCT ccms_number) FROM (
          SELECT p.ccms_number FROM poles p WHERE p.ward_id = w.id AND p.is_deleted = FALSE AND p.ccms_number IS NOT NULL AND p.ccms_number != '' ${dateFilterP}
          UNION
          SELECT i.ccms_number FROM tgpl_installations i WHERE i.ward_id = w.id AND i.is_deleted = FALSE AND i.ccms_number IS NOT NULL AND i.ccms_number != '' ${dateFilterI}
        ) u_ccms
      ), 0) as total_ccms,
      (
        COALESCE((SELECT COUNT(p.id) FROM poles p WHERE p.ward_id = w.id AND p.is_deleted = FALSE ${dateFilterP}), 0) +
        COALESCE((SELECT COUNT(i.id) FROM tgpl_installations i WHERE i.ward_id = w.id AND i.is_deleted = FALSE ${dateFilterI}), 0)
      ) as total_poles
    FROM wards w
    WHERE w.id = $1 AND w.is_deleted = FALSE ${scopeFilter};
  `;
  const result = await query(tgplSql, tgplParams);
  return result.rows;
}

async function getWardDetails(ulbId, wardNumber, date = null, mode = 'exact', _districtScope = null, ulbScope = null, fromDate = null, toDate = null) {
  let dateFilterP = '';
  let dateFilterI = '';
  const tgplParams = [ulbId];
  let pIdx = 2;
  
  if (fromDate && toDate) {
    dateFilterP = `AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date BETWEEN $${pIdx} AND $${pIdx + 1}`;
    dateFilterI = `AND (timezone('Asia/Kolkata', timezone('UTC', i.created_at)))::date BETWEEN $${pIdx} AND $${pIdx + 1}`;
    tgplParams.push(fromDate, toDate);
    pIdx += 2;
  } else if (date) {
    if (date === 'till_yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);
      dateFilterP = `AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date <= $${pIdx}`;
      dateFilterI = `AND (timezone('Asia/Kolkata', timezone('UTC', i.created_at)))::date <= $${pIdx}`;
      tgplParams.push(yesterdayStr);
    } else {
      const operator = mode === 'cumulative' ? '<=' : '=';
      dateFilterP = `AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date ${operator} $${pIdx}`;
      dateFilterI = `AND (timezone('Asia/Kolkata', timezone('UTC', i.created_at)))::date ${operator} $${pIdx}`;
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
    SELECT * FROM (
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
        p.pole_height as pole_height,
        p.pole_height as pole_height_mtrs,
        p.arm_type,
        p.arm_status,
        p.road_category,
        p.road_type,
        p.conductor_type,
        p.pole_to_pole_distance as pole_to_pole_distance,
        p.pole_to_pole_distance as pole_to_pole_distance_mtrs,
        p.present_arm_no,
        p.present_arm_length as present_arm_length,
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
        p.image_url_3,
        p.dtc_number,
        p.dtc_capacity,
        p.meter_dimensional_status,
        p.req_arm_number,
        p.req_arm_length,
        p.req_led_lights_no,
        p.req_led_wattage,
        p.req_dedicated_wire,
        'survey' as survey_type,
        p.light_type_3,
        p.light_capacity_3,
        p.light_type_4,
        p.light_capacity_4,
        p.light_type_5,
        p.light_capacity_5,
        p.light_type_6,
        p.light_capacity_6,
        NULL as light_status,
        NULL as light_status_2,
        NULL as light_status_3,
        NULL as light_status_4,
        NULL as light_status_5,
        NULL as arm_status_2,
        NULL as arm_status_3,
        NULL as arm_status_4,
        NULL as arm_status_5,
        NULL as light_wattage,
        NULL as light_wattage_2,
        NULL as light_wattage_3,
        NULL as light_wattage_4,
        NULL as light_wattage_5,
        NULL as dedicated_wire,
        NULL as infra_gap,
        p.remarks as remarks
      FROM poles p
      JOIN wards w ON p.ward_id = w.id
      WHERE p.ward_id = $1 AND p.is_deleted = FALSE ${dateFilterP} ${scopeFilter}

      UNION ALL

      SELECT 
        w.name as ward_number,
        COALESCE(i.ccms_number, 'NO_CCMS') as ccms_id,
        i.ccms_number,
        NULL as meter_type,
        NULL as meter_condition,
        NULL as meter_rr_number,
        NULL as meter_serial_number,
        i.id as pole_id,
        i.created_by as user_id,
        i.created_at,
        i.pole_number,
        i.pole_type,
        NULL as pole_condition,
        i.light_type,
        i.light_status as light_working_status,
        NULL as pole_height,
        NULL as pole_height_mtrs,
        NULL as arm_type,
        i.arm_status,
        NULL as road_category,
        NULL as road_type,
        NULL as conductor_type,
        NULL as pole_to_pole_distance,
        NULL as pole_to_pole_distance_mtrs,
        NULL as present_arm_no,
        NULL as present_arm_length,
        NULL as present_arm_length_mtrs,
        i.how_many_lights_in_pole,
        NULL as light_mounting_height,
        i.light_wattage as light_capacity,
        i.light_type_2,
        i.light_wattage_2 as light_capacity_2,
        NULL as road_width_mtrs,
        NULL as pole_earthing_exists,
        i.confirmed_by as pole_confirmed_by,
        i.confirmed_at as pole_confirmed_at,
        NULL::text as pole_confirmed_by_name,
        i.latitude as pole_latitude,
        i.longitude as pole_longitude,
        i.image_url_1,
        i.image_url_2,
        i.image_url_3,
        NULL as dtc_number,
        NULL as dtc_capacity,
        NULL as meter_dimensional_status,
        NULL as req_arm_number,
        NULL as req_arm_length,
        NULL as req_led_lights_no,
        NULL as req_led_wattage,
        i.dedicated_wire as req_dedicated_wire,
        'installation' as survey_type,
        i.light_type_3,
        i.light_wattage_3 as light_capacity_3,
        i.light_type_4,
        i.light_wattage_4 as light_capacity_4,
        i.light_type_5,
        i.light_wattage_5 as light_capacity_5,
        i.light_type_6,
        i.light_wattage_6 as light_capacity_6,
        i.light_status,
        i.light_status_2,
        i.light_status_3,
        i.light_status_4,
        i.light_status_5,
        i.arm_status_2,
        i.arm_status_3,
        i.arm_status_4,
        i.arm_status_5,
        i.light_wattage,
        i.light_wattage_2,
        i.light_wattage_3,
        i.light_wattage_4,
        i.light_wattage_5,
        i.dedicated_wire,
        i.infra_gap,
        i.remarks as remarks
      FROM tgpl_installations i
      JOIN wards w ON i.ward_id = w.id
      WHERE i.ward_id = $1 AND i.is_deleted = FALSE ${dateFilterI} ${scopeFilter}
    ) all_records
    ORDER BY created_at DESC;
  `;
  const result = await query(tgplSql, tgplParams);
  return resolveUserNames(result.rows);
}

async function getPendingSubmissions(projectId, page = 1, limit = 50, userId = null, _districtScope = null, ulbScope = null, fromDate = null, toDate = null, dateField = 'created_at', type = null, surveyType = null) {
  const offset = (page - 1) * limit;
  let scopeFilterP = '';
  let scopeFilterI = '';
  const params = [projectId, limit, offset, userId];
  let pIdx = 5;

  if (ulbScope && Array.isArray(ulbScope) && ulbScope.length > 0) {
    scopeFilterP += ` AND p.ward_id = ANY($${pIdx})`;
    scopeFilterI += ` AND i.ward_id = ANY($${pIdx})`;
    params.push(ulbScope);
    pIdx++;
  }

  const submissionDateColumn = dateField === 'confirmed_at' ? 'confirmed_at' : 'created_at';
  let pDateFilterP = '';
  let pDateFilterI = '';
  if (fromDate && toDate) {
    const startIdx = params.length + 1;
    pDateFilterP = ` AND (timezone('Asia/Kolkata', timezone('UTC', p.${submissionDateColumn})))::date BETWEEN $${startIdx} AND $${startIdx + 1}`;
    pDateFilterI = ` AND (timezone('Asia/Kolkata', timezone('UTC', i.${submissionDateColumn})))::date BETWEEN $${startIdx} AND $${startIdx + 1}`;
    params.push(fromDate, toDate);
  }

  const includeSurvey = !surveyType || surveyType === 'all' || surveyType === 'survey';
  const includeInst = !surveyType || surveyType === 'all' || surveyType === 'installation';

  const subQueries = [];

  if (includeSurvey) {
    subQueries.push(`
      SELECT 
        'pole' as type,
        p.id,
        p.ward_id as ulb_id,
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
        p.meter_dimensional_status as meter_condition,
        p.latitude,
        p.longitude,
        p.conductor_type,
        p.pole_type,
        p.pole_height as pole_height,
        p.pole_height as pole_height_mtrs,
        NULL::text as pole_condition,
        p.pole_to_pole_distance as pole_to_pole_distance,
        p.pole_to_pole_distance as pole_to_pole_distance_mtrs,
        p.arm_type,
        p.arm_status,
        p.present_arm_no,
        p.present_arm_length as present_arm_length,
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
        p.image_url_3,
        'survey' as survey_type,
        p.light_type_3,
        p.light_capacity_3,
        p.light_type_4,
        p.light_capacity_4,
        p.light_type_5,
        p.light_capacity_5,
        p.light_type_6,
        p.light_capacity_6,
        NULL as light_status,
        NULL as light_status_2,
        NULL as light_status_3,
        NULL as light_status_4,
        NULL as light_status_5,
        NULL as arm_status_2,
        NULL as arm_status_3,
        NULL as arm_status_4,
        NULL as arm_status_5,
        NULL as light_wattage,
        NULL as light_wattage_2,
        NULL as light_wattage_3,
        NULL as light_wattage_4,
        NULL as light_wattage_5,
        NULL as dedicated_wire,
        NULL as infra_gap,
        p.remarks as remarks
      FROM poles p
      JOIN wards w ON p.ward_id = w.id
      WHERE p.project_id = $1 AND p.status = 'PENDING' AND p.is_deleted = FALSE
      AND ($4::int IS NULL OR p.created_by = $4)
      ${pDateFilterP}
      ${scopeFilterP}
    `);
  }

  if (includeInst) {
    subQueries.push(`
      SELECT 
        'pole' as type,
        i.id,
        i.ward_id as ulb_id,
        i.created_by as user_id,
        NULL::text as user_name,
        i.created_at,
        w.name as ward_number,
        i.pole_number::text as identifier,
        w.name as ulb_name,
        i.ccms_number::text as switch_point_number,
        NULL::text as switch_point_type,
        NULL::boolean as meter_exists,
        NULL as meter_type,
        NULL as meter_rr_number,
        NULL as meter_serial_number,
        NULL as meter_condition,
        i.latitude,
        i.longitude,
        NULL as conductor_type,
        i.pole_type,
        NULL as pole_height,
        NULL as pole_height_mtrs,
        NULL as pole_condition,
        NULL as pole_to_pole_distance,
        NULL as pole_to_pole_distance_mtrs,
        NULL as arm_type,
        i.arm_status,
        NULL as present_arm_no,
        NULL as present_arm_length,
        NULL as present_arm_length_mtrs,
        i.how_many_lights_in_pole,
        NULL as light_mounting_height,
        i.light_type,
        i.light_wattage as light_capacity,
        i.light_type_2,
        i.light_wattage_2 as light_capacity_2,
        i.light_status as light_working_status,
        NULL as road_category,
        NULL as road_type,
        NULL as road_width_mtrs,
        NULL as pole_earthing_exists,
        NULL as dtc_number,
        NULL as dtc_capacity,
        i.ccms_number,
        NULL as meter_dimensional_status,
        NULL as req_arm_number,
        NULL as req_arm_length,
        NULL as req_led_lights_no,
        NULL as req_led_wattage,
        i.dedicated_wire as req_dedicated_wire,
        i.image_url_1,
        i.image_url_2,
        i.image_url_3,
        'installation' as survey_type,
        i.light_type_3,
        i.light_wattage_3 as light_capacity_3,
        i.light_type_4,
        i.light_wattage_4 as light_capacity_4,
        i.light_type_5,
        i.light_wattage_5 as light_capacity_5,
        i.light_type_6,
        i.light_wattage_6 as light_capacity_6,
        i.light_status,
        i.light_status_2,
        i.light_status_3,
        i.light_status_4,
        i.light_status_5,
        i.arm_status_2,
        i.arm_status_3,
        i.arm_status_4,
        i.arm_status_5,
        i.light_wattage,
        i.light_wattage_2,
        i.light_wattage_3,
        i.light_wattage_4,
        i.light_wattage_5,
        i.dedicated_wire,
        i.infra_gap,
        i.remarks as remarks
      FROM tgpl_installations i
      JOIN wards w ON i.ward_id = w.id
      WHERE i.project_id = $1 AND i.status = 'PENDING' AND i.is_deleted = FALSE
      AND ($4::int IS NULL OR i.created_by = $4)
      ${pDateFilterI}
      ${scopeFilterI}
    `);
  }

  const queryBody = subQueries.join(' UNION ALL ');

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
  let scopeFilterP = '';
  let scopeFilterI = '';
  const params = [projectId, limit, offset, userId, confirmedBy];
  let pIdx = 6;

  if (ulbScope && Array.isArray(ulbScope) && ulbScope.length > 0) {
    scopeFilterP += ` AND p.ward_id = ANY($${pIdx})`;
    scopeFilterI += ` AND i.ward_id = ANY($${pIdx})`;
    params.push(ulbScope);
    pIdx++;
  }

  const submissionDateColumn = dateField === 'confirmed_at' ? 'confirmed_at' : 'created_at';
  let pDateFilterP = '';
  let pDateFilterI = '';
  if (fromDate && toDate) {
    const startIdx = params.length + 1;
    pDateFilterP = ` AND (timezone('Asia/Kolkata', timezone('UTC', p.${submissionDateColumn})))::date BETWEEN $${startIdx} AND $${startIdx + 1}`;
    pDateFilterI = ` AND (timezone('Asia/Kolkata', timezone('UTC', i.${submissionDateColumn})))::date BETWEEN $${startIdx} AND $${startIdx + 1}`;
    params.push(fromDate, toDate);
  }

  const includeSurvey = !surveyType || surveyType === 'survey';
  const includeInst = !surveyType || surveyType === 'installation';

  const subQueries = [];

  if (includeSurvey) {
    subQueries.push(`
      SELECT 
        'pole' as type,
        p.id,
        p.ward_id as ulb_id,
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
        p.pole_height as pole_height,
        p.pole_height as pole_height_mtrs,
        NULL::text as pole_condition,
        p.pole_to_pole_distance as pole_to_pole_distance,
        p.pole_to_pole_distance as pole_to_pole_distance_mtrs,
        p.arm_type,
        p.arm_status,
        p.present_arm_no,
        p.present_arm_length as present_arm_length,
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
        p.image_url_3,
        'survey' as survey_type,
        p.light_type_3,
        p.light_capacity_3,
        p.light_type_4,
        p.light_capacity_4,
        p.light_type_5,
        p.light_capacity_5,
        p.light_type_6,
        p.light_capacity_6,
        NULL as light_status,
        NULL as light_status_2,
        NULL as light_status_3,
        NULL as light_status_4,
        NULL as light_status_5,
        NULL as arm_status_2,
        NULL as arm_status_3,
        NULL as arm_status_4,
        NULL as arm_status_5,
        NULL as light_wattage,
        NULL as light_wattage_2,
        NULL as light_wattage_3,
        NULL as light_wattage_4,
        NULL as light_wattage_5,
        NULL as dedicated_wire,
        NULL as infra_gap,
        p.remarks as remarks
      FROM poles p
      JOIN wards w ON p.ward_id = w.id
      WHERE p.project_id = $1 AND p.status = 'CONFIRMED' AND p.is_deleted = FALSE
      AND ($4::int IS NULL OR p.created_by = $4)
      AND ($5::int IS NULL OR p.confirmed_by = $5)
      ${pDateFilterP}
      ${scopeFilterP}
    `);
  }

  if (includeInst) {
    subQueries.push(`
      SELECT 
        'pole' as type,
        i.id,
        i.ward_id as ulb_id,
        i.created_by as user_id,
        NULL::text as user_name,
        i.created_at,
        w.name as ward_number,
        i.pole_number::text as identifier,
        w.name as ulb_name,
        i.ccms_number::text as switch_point_number,
        i.confirmed_by,
        i.confirmed_at,
        NULL::text as confirmed_by_name,
        NULL::text as switch_point_type,
        NULL::boolean as meter_exists,
        NULL as meter_type,
        NULL as meter_rr_number,
        NULL as meter_serial_number,
        NULL as meter_condition,
        i.latitude,
        i.longitude,
        NULL as conductor_type,
        i.pole_type,
        NULL as pole_height,
        NULL as pole_height_mtrs,
        NULL as pole_condition,
        NULL as pole_to_pole_distance,
        NULL as pole_to_pole_distance_mtrs,
        NULL as arm_type,
        i.arm_status,
        NULL as present_arm_no,
        NULL as present_arm_length,
        NULL as present_arm_length_mtrs,
        i.how_many_lights_in_pole,
        NULL as light_mounting_height,
        i.light_type,
        i.light_wattage as light_capacity,
        i.light_type_2,
        i.light_wattage_2 as light_capacity_2,
        i.light_status as light_working_status,
        NULL as road_category,
        NULL as road_type,
        NULL as road_width_mtrs,
        NULL as pole_earthing_exists,
        NULL as dtc_number,
        NULL as dtc_capacity,
        i.ccms_number,
        NULL as meter_dimensional_status,
        NULL as req_arm_number,
        NULL as req_arm_length,
        NULL as req_led_lights_no,
        NULL as req_led_wattage,
        i.dedicated_wire as req_dedicated_wire,
        i.image_url_1,
        i.image_url_2,
        i.image_url_3,
        'installation' as survey_type,
        i.light_type_3,
        i.light_wattage_3 as light_capacity_3,
        i.light_type_4,
        i.light_wattage_4 as light_capacity_4,
        i.light_type_5,
        i.light_wattage_5 as light_capacity_5,
        i.light_type_6,
        i.light_wattage_6 as light_capacity_6,
        i.light_status,
        i.light_status_2,
        i.light_status_3,
        i.light_status_4,
        i.light_status_5,
        i.arm_status_2,
        i.arm_status_3,
        i.arm_status_4,
        i.arm_status_5,
        i.light_wattage,
        i.light_wattage_2,
        i.light_wattage_3,
        i.light_wattage_4,
        i.light_wattage_5,
        i.dedicated_wire,
        i.infra_gap,
        i.remarks as remarks
      FROM tgpl_installations i
      JOIN wards w ON i.ward_id = w.id
      WHERE i.project_id = $1 AND i.status = 'CONFIRMED' AND i.is_deleted = FALSE
      AND ($4::int IS NULL OR i.created_by = $4)
      AND ($5::int IS NULL OR i.confirmed_by = $5)
      ${pDateFilterI}
      ${scopeFilterI}
    `);
  }

  const queryBody = subQueries.join(' UNION ALL ');

  const sql = `
    SELECT *, COUNT(*) OVER() AS total_count FROM (
      ${queryBody}
    ) combined
    ORDER BY confirmed_at DESC
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
  let scopeFilterP = '';
  let scopeFilterI = '';
  const params = [projectId, today, limit, offset, userId];
  let pIdx = 6;

  if (ulbScope && Array.isArray(ulbScope) && ulbScope.length > 0) {
    scopeFilterP += ` AND p.ward_id = ANY($${pIdx})`;
    scopeFilterI += ` AND i.ward_id = ANY($${pIdx})`;
    params.push(ulbScope);
    pIdx++;
  }

  const sql = `
    SELECT *, COUNT(*) OVER() AS total_count FROM (
      SELECT 
        'pole' as type,
        p.id,
        p.ward_id as ulb_id,
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
        p.pole_height as pole_height,
        p.pole_height as pole_height_mtrs,
        NULL::text as pole_condition,
        p.pole_to_pole_distance as pole_to_pole_distance,
        p.pole_to_pole_distance as pole_to_pole_distance_mtrs,
        p.arm_type,
        p.arm_status,
        p.present_arm_no,
        p.present_arm_length as present_arm_length,
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
        p.image_url_3,
        'survey' as survey_type,
        p.light_type_3,
        p.light_capacity_3,
        p.light_type_4,
        p.light_capacity_4,
        p.light_type_5,
        p.light_capacity_5,
        p.light_type_6,
        p.light_capacity_6,
        p.confirmed_by as pole_confirmed_by,
        p.confirmed_at as pole_confirmed_at,
        NULL as light_status,
        NULL as light_status_2,
        NULL as light_status_3,
        NULL as light_status_4,
        NULL as light_status_5,
        NULL as arm_status_2,
        NULL as arm_status_3,
        NULL as arm_status_4,
        NULL as arm_status_5,
        NULL as light_wattage,
        NULL as light_wattage_2,
        NULL as light_wattage_3,
        NULL as light_wattage_4,
        NULL as light_wattage_5,
        NULL as dedicated_wire,
        NULL as infra_gap,
        p.remarks as remarks
      FROM poles p
      JOIN wards w ON p.ward_id = w.id
      WHERE p.project_id = $1 AND (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date = $2 AND p.is_deleted = FALSE
      AND ($5::int IS NULL OR p.created_by = $5)
      ${scopeFilterP}

      UNION ALL

      SELECT 
        'pole' as type,
        i.id,
        i.ward_id as ulb_id,
        i.created_by as user_id,
        NULL::text as user_name,
        i.created_at,
        w.name as ward_number,
        i.pole_number::text as identifier,
        w.name as ulb_name,
        i.ccms_number::text as switch_point_number,
        NULL::text as switch_point_type,
        NULL::boolean as meter_exists,
        NULL as meter_type,
        NULL as meter_rr_number,
        NULL as meter_serial_number,
        NULL as meter_condition,
        i.latitude,
        i.longitude,
        NULL as conductor_type,
        i.pole_type,
        NULL as pole_height,
        NULL as pole_height_mtrs,
        NULL as pole_condition,
        NULL as pole_to_pole_distance,
        NULL as pole_to_pole_distance_mtrs,
        NULL as arm_type,
        i.arm_status,
        NULL as present_arm_no,
        NULL as present_arm_length,
        NULL as present_arm_length_mtrs,
        i.how_many_lights_in_pole,
        NULL as light_mounting_height,
        i.light_type,
        i.light_wattage as light_capacity,
        i.light_type_2,
        i.light_wattage_2 as light_capacity_2,
        i.light_status as light_working_status,
        NULL as road_category,
        NULL as road_type,
        NULL as road_width_mtrs,
        NULL as pole_earthing_exists,
        NULL as dtc_number,
        NULL as dtc_capacity,
        i.ccms_number,
        NULL as meter_dimensional_status,
        NULL as req_arm_number,
        NULL as req_arm_length,
        NULL as req_led_lights_no,
        NULL as req_led_wattage,
        i.dedicated_wire as req_dedicated_wire,
        i.image_url_1,
        i.image_url_2,
        i.image_url_3,
        'installation' as survey_type,
        i.light_type_3,
        i.light_wattage_3 as light_capacity_3,
        i.light_type_4,
        i.light_wattage_4 as light_capacity_4,
        i.light_type_5,
        i.light_wattage_5 as light_capacity_5,
        i.light_type_6,
        i.light_wattage_6 as light_capacity_6,
        i.confirmed_by as pole_confirmed_by,
        i.confirmed_at as pole_confirmed_at,
        i.light_status,
        i.light_status_2,
        i.light_status_3,
        i.light_status_4,
        i.light_status_5,
        i.arm_status_2,
        i.arm_status_3,
        i.arm_status_4,
        i.arm_status_5,
        i.light_wattage,
        i.light_wattage_2,
        i.light_wattage_3,
        i.light_wattage_4,
        i.light_wattage_5,
        i.dedicated_wire,
        i.infra_gap,
        i.remarks as remarks
      FROM tgpl_installations i
      JOIN wards w ON i.ward_id = w.id
      WHERE i.project_id = $1 AND (timezone('Asia/Kolkata', timezone('UTC', i.created_at)))::date = $2 AND i.is_deleted = FALSE
      AND ($5::int IS NULL OR i.created_by = $5)
      ${scopeFilterI}
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
  const totalSurvey = await query(
    `SELECT COUNT(id) as count FROM poles WHERE project_id = $1 AND created_by = $2 AND is_deleted = FALSE`,
    [projectId, userId]
  );
  const totalInst = await query(
    `SELECT COUNT(id) as count FROM tgpl_installations WHERE project_id = $1 AND created_by = $2 AND is_deleted = FALSE`,
    [projectId, userId]
  );

  // Today's stats
  const todaySurvey = await query(
    `SELECT COUNT(id) as count FROM poles WHERE project_id = $1 AND created_by = $2 AND is_deleted = FALSE AND (timezone('Asia/Kolkata', timezone('UTC', created_at)))::date = $3`,
    [projectId, userId, todayStr]
  );
  const todayInst = await query(
    `SELECT COUNT(id) as count FROM tgpl_installations WHERE project_id = $1 AND created_by = $2 AND is_deleted = FALSE AND (timezone('Asia/Kolkata', timezone('UTC', created_at)))::date = $3`,
    [projectId, userId, todayStr]
  );

  // Date-wise stats
  const targetDate = date || todayStr;
  const dateSurvey = await query(
    `SELECT COUNT(id) as count FROM poles WHERE project_id = $1 AND created_by = $2 AND is_deleted = FALSE AND (timezone('Asia/Kolkata', timezone('UTC', created_at)))::date = $3`,
    [projectId, userId, targetDate]
  );
  const dateInst = await query(
    `SELECT COUNT(id) as count FROM tgpl_installations WHERE project_id = $1 AND created_by = $2 AND is_deleted = FALSE AND (timezone('Asia/Kolkata', timezone('UTC', created_at)))::date = $3`,
    [projectId, userId, targetDate]
  );

  const tSurvey = parseInt(totalSurvey.rows[0]?.count || 0, 10);
  const tInst = parseInt(totalInst.rows[0]?.count || 0, 10);
  const tdSurvey = parseInt(todaySurvey.rows[0]?.count || 0, 10);
  const tdInst = parseInt(todayInst.rows[0]?.count || 0, 10);
  const dwSurvey = parseInt(dateSurvey.rows[0]?.count || 0, 10);
  const dwInst = parseInt(dateInst.rows[0]?.count || 0, 10);

  return {
    total: {
      switch_points: 0,
      poles: tSurvey + tInst,
      survey_poles: tSurvey,
      installation_poles: tInst
    },
    today: {
      switch_points: 0,
      poles: tdSurvey + tdInst,
      survey_poles: tdSurvey,
      installation_poles: tdInst
    },
    dateWise: {
      date: targetDate,
      switch_points: 0,
      poles: dwSurvey + dwInst,
      survey_poles: dwSurvey,
      installation_poles: dwInst
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
  
  const statsSurvey = await query(
    `SELECT 
      p.confirmed_by as id,
      COUNT(p.id) as total_survey_resolved,
      COUNT(CASE WHEN (timezone('Asia/Kolkata', timezone('UTC', p.confirmed_at)))::date = (timezone('Asia/Kolkata', NOW()))::date THEN p.id END) as today_survey_resolved
     FROM poles p
     WHERE p.confirmed_by = ANY($1) AND p.project_id = $2 AND p.is_deleted = FALSE
     GROUP BY p.confirmed_by`,
    [userIds, projectId]
  );

  const statsInst = await query(
    `SELECT 
      i.confirmed_by as id,
      COUNT(i.id) as total_inst_resolved,
      COUNT(CASE WHEN (timezone('Asia/Kolkata', timezone('UTC', i.confirmed_at)))::date = (timezone('Asia/Kolkata', NOW()))::date THEN i.id END) as today_inst_resolved
     FROM tgpl_installations i
     WHERE i.confirmed_by = ANY($1) AND i.project_id = $2 AND i.is_deleted = FALSE
     GROUP BY i.confirmed_by`,
    [userIds, projectId]
  );
  
  const statsMap = {};
  statsSurvey.rows.forEach(r => {
    if (!statsMap[r.id]) statsMap[r.id] = { total_survey_resolved: 0, today_survey_resolved: 0, total_inst_resolved: 0, today_inst_resolved: 0 };
    statsMap[r.id].total_survey_resolved = parseInt(r.total_survey_resolved, 10);
    statsMap[r.id].today_survey_resolved = parseInt(r.today_survey_resolved, 10);
  });
  statsInst.rows.forEach(r => {
    if (!statsMap[r.id]) statsMap[r.id] = { total_survey_resolved: 0, today_survey_resolved: 0, total_inst_resolved: 0, today_inst_resolved: 0 };
    statsMap[r.id].total_inst_resolved = parseInt(r.total_inst_resolved, 10);
    statsMap[r.id].today_inst_resolved = parseInt(r.today_inst_resolved, 10);
  });

  const result = users.map(u => {
    const s = statsMap[u.id] || { total_survey_resolved: 0, today_survey_resolved: 0, total_inst_resolved: 0, today_inst_resolved: 0 };
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      total_sp_resolved: 0,
      total_poles_resolved: s.total_survey_resolved + s.total_inst_resolved,
      total_survey_resolved: s.total_survey_resolved,
      total_inst_resolved: s.total_inst_resolved,
      today_sp_resolved: 0,
      today_poles_resolved: s.today_survey_resolved + s.today_inst_resolved,
      today_survey_resolved: s.today_survey_resolved,
      today_inst_resolved: s.today_inst_resolved
    };
  });

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
  
  const statsSurvey = await query(
    `SELECT 
      p.confirmed_by as id,
      COUNT(p.id) as total_survey_resolved,
      COUNT(CASE WHEN (timezone('Asia/Kolkata', timezone('UTC', p.confirmed_at)))::date = (timezone('Asia/Kolkata', NOW()))::date THEN p.id END) as today_survey_resolved
     FROM poles p
     WHERE p.confirmed_by = ANY($1) AND p.project_id = $2 AND p.is_deleted = FALSE
     GROUP BY p.confirmed_by`,
    [userIds, projectId]
  );

  const statsInst = await query(
    `SELECT 
      i.confirmed_by as id,
      COUNT(i.id) as total_inst_resolved,
      COUNT(CASE WHEN (timezone('Asia/Kolkata', timezone('UTC', i.confirmed_at)))::date = (timezone('Asia/Kolkata', NOW()))::date THEN i.id END) as today_inst_resolved
     FROM tgpl_installations i
     WHERE i.confirmed_by = ANY($1) AND i.project_id = $2 AND i.is_deleted = FALSE
     GROUP BY i.confirmed_by`,
    [userIds, projectId]
  );
  
  const statsMap = {};
  statsSurvey.rows.forEach(r => {
    if (!statsMap[r.id]) statsMap[r.id] = { total_survey_resolved: 0, today_survey_resolved: 0, total_inst_resolved: 0, today_inst_resolved: 0 };
    statsMap[r.id].total_survey_resolved = parseInt(r.total_survey_resolved, 10);
    statsMap[r.id].today_survey_resolved = parseInt(r.today_survey_resolved, 10);
  });
  statsInst.rows.forEach(r => {
    if (!statsMap[r.id]) statsMap[r.id] = { total_survey_resolved: 0, today_survey_resolved: 0, total_inst_resolved: 0, today_inst_resolved: 0 };
    statsMap[r.id].total_inst_resolved = parseInt(r.total_inst_resolved, 10);
    statsMap[r.id].today_inst_resolved = parseInt(r.today_inst_resolved, 10);
  });

  const result = users.map(u => {
    const s = statsMap[u.id] || { total_survey_resolved: 0, today_survey_resolved: 0, total_inst_resolved: 0, today_inst_resolved: 0 };
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      total_sp_resolved: 0,
      total_poles_resolved: s.total_survey_resolved + s.total_inst_resolved,
      total_survey_resolved: s.total_survey_resolved,
      total_inst_resolved: s.total_inst_resolved,
      today_sp_resolved: 0,
      today_poles_resolved: s.today_survey_resolved + s.today_inst_resolved,
      today_survey_resolved: s.today_survey_resolved,
      today_inst_resolved: s.today_inst_resolved
    };
  });

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
  
  const statsSurvey = await query(
    `SELECT 
      p.created_by as id,
      COUNT(p.id) as total_survey,
      COUNT(CASE WHEN (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date = (timezone('Asia/Kolkata', NOW()))::date THEN p.id END) as today_survey
     FROM poles p
     WHERE p.created_by = ANY($1) AND p.project_id = $2 AND p.is_deleted = FALSE
     GROUP BY p.created_by`,
    [userIds, projectId]
  );

  const statsInst = await query(
    `SELECT 
      i.created_by as id,
      COUNT(i.id) as total_inst,
      COUNT(CASE WHEN (timezone('Asia/Kolkata', timezone('UTC', i.created_at)))::date = (timezone('Asia/Kolkata', NOW()))::date THEN i.id END) as today_inst
     FROM tgpl_installations i
     WHERE i.created_by = ANY($1) AND i.project_id = $2 AND i.is_deleted = FALSE
     GROUP BY i.created_by`,
    [userIds, projectId]
  );
  
  const statsMap = {};
  statsSurvey.rows.forEach(r => {
    if (!statsMap[r.id]) statsMap[r.id] = { total_survey: 0, today_survey: 0, total_inst: 0, today_inst: 0 };
    statsMap[r.id].total_survey = parseInt(r.total_survey, 10);
    statsMap[r.id].today_survey = parseInt(r.today_survey, 10);
  });
  statsInst.rows.forEach(r => {
    if (!statsMap[r.id]) statsMap[r.id] = { total_survey: 0, today_survey: 0, total_inst: 0, today_inst: 0 };
    statsMap[r.id].total_inst = parseInt(r.total_inst, 10);
    statsMap[r.id].today_inst = parseInt(r.today_inst, 10);
  });

  const result = users.map(u => {
    const s = statsMap[u.id] || { total_survey: 0, today_survey: 0, total_inst: 0, today_inst: 0 };
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      total_sp: 0,
      total_poles: s.total_survey + s.total_inst,
      total_survey: s.total_survey,
      total_inst: s.total_inst,
      today_sp: 0,
      today_poles: s.today_survey + s.today_inst,
      today_survey: s.today_survey,
      today_inst: s.today_inst
    };
  });

  result.sort((a, b) => b.total_poles - a.total_poles);
  return result;
}

async function getReportData(projectId, districtId, tillDate, ulbId, _districtScope = null, ulbScope = null, fromDate = null, toDate = null, confirmedBy = null, reportType = null) {
  const params = [projectId, tillDate || null, ulbId || null];
  let scopeFilterP = '';
  let scopeFilterI = '';
  let pRangeFilterP = '';
  let pRangeFilterI = '';

  if (fromDate && fromDate.trim() !== '') {
    params.push(fromDate);
    const fromIdx = params.length;
    pRangeFilterP += `\n    AND (($${fromIdx}::date IS NULL OR (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date >= $${fromIdx}))`;
    pRangeFilterI += `\n    AND (($${fromIdx}::date IS NULL OR (timezone('Asia/Kolkata', timezone('UTC', i.created_at)))::date >= $${fromIdx}))`;
  }
  if (toDate && toDate.trim() !== '') {
    params.push(toDate);
    const toIdx = params.length;
    pRangeFilterP += `\n    AND (($${toIdx}::date IS NULL OR (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date <= $${toIdx}))`;
    pRangeFilterI += `\n    AND (($${toIdx}::date IS NULL OR (timezone('Asia/Kolkata', timezone('UTC', i.created_at)))::date <= $${toIdx}))`;
  }

  if (ulbScope && Array.isArray(ulbScope) && ulbScope.length > 0) {
    params.push(ulbScope);
    scopeFilterP += ` AND p.ward_id = ANY($${params.length})`;
    scopeFilterI += ` AND i.ward_id = ANY($${params.length})`;
  }

  let pConfirmedFilterP = '';
  let pConfirmedFilterI = '';
  if (confirmedBy) {
    params.push(Number(confirmedBy));
    const confIdx = params.length;
    pConfirmedFilterP = ` AND p.confirmed_by = $${confIdx}`;
    pConfirmedFilterI = ` AND i.confirmed_by = $${confIdx}`;
  }

  let poles = [];
  let installations = [];

  const normReportType = (reportType || '').toLowerCase().trim();
  const shouldFetchPoles = !normReportType || ['survey', 'surveys', 'pole', 'poles', 'all'].includes(normReportType);
  const shouldFetchInst = !normReportType || ['installation', 'installations', 'all'].includes(normReportType);

  if (shouldFetchPoles) {
    const pSql = `
      SELECT 
        p.*,
        COALESCE(p.image_url_1, img1.url_full) as image_url_1,
        COALESCE(p.image_url_2, img2.url_full) as image_url_2,
        COALESCE(p.image_url_3, img3.url_full) as image_url_3,
        p.created_by as user_id,
        NULL::text as user_name,
        w.name as ulb_name,
        'Wards' as district_name,
        p.ccms_number as switch_point_number
      FROM poles p
      JOIN wards w ON p.ward_id = w.id
      LEFT JOIN LATERAL (
        SELECT CASE WHEN url LIKE 'https://%' THEN url ELSE 'https://storage.googleapis.com/govt-survey-images/' || url END AS url_full
        FROM entity_files WHERE entity_type = 'pole' AND entity_id = p.id ORDER BY id ASC LIMIT 1 OFFSET 0
      ) img1 ON TRUE
      LEFT JOIN LATERAL (
        SELECT CASE WHEN url LIKE 'https://%' THEN url ELSE 'https://storage.googleapis.com/govt-survey-images/' || url END AS url_full
        FROM entity_files WHERE entity_type = 'pole' AND entity_id = p.id ORDER BY id ASC LIMIT 1 OFFSET 1
      ) img2 ON TRUE
      LEFT JOIN LATERAL (
        SELECT CASE WHEN url LIKE 'https://%' THEN url ELSE 'https://storage.googleapis.com/govt-survey-images/' || url END AS url_full
        FROM entity_files WHERE entity_type = 'pole' AND entity_id = p.id ORDER BY id ASC LIMIT 1 OFFSET 2
      ) img3 ON TRUE
      WHERE p.project_id = $1 AND p.status = 'CONFIRMED' AND p.is_deleted = FALSE
      AND ($2::date IS NULL OR (timezone('Asia/Kolkata', timezone('UTC', p.created_at)))::date <= $2)
      AND ($3::int IS NULL OR p.ward_id = $3)
      ${pRangeFilterP}
      ${scopeFilterP}
      ${pConfirmedFilterP}
      ORDER BY p.created_at DESC
    `;
    const pResult = await query(pSql, params);
    poles = await resolveUserNames(pResult.rows);
  }

  if (shouldFetchInst) {
    const iSql = `
      SELECT 
        i.*,
        COALESCE(i.image_url_1, img1.url_full) as image_url_1,
        COALESCE(i.image_url_2, img2.url_full) as image_url_2,
        COALESCE(i.image_url_3, img3.url_full) as image_url_3,
        i.created_by as user_id,
        NULL::text as user_name,
        w.name as ulb_name,
        'Wards' as district_name,
        i.ccms_number as switch_point_number
      FROM tgpl_installations i
      JOIN wards w ON i.ward_id = w.id
      LEFT JOIN LATERAL (
        SELECT CASE WHEN url LIKE 'https://%' THEN url ELSE 'https://storage.googleapis.com/govt-survey-images/' || url END AS url_full
        FROM entity_files WHERE entity_type = 'installation' AND entity_id = i.id ORDER BY id ASC LIMIT 1 OFFSET 0
      ) img1 ON TRUE
      LEFT JOIN LATERAL (
        SELECT CASE WHEN url LIKE 'https://%' THEN url ELSE 'https://storage.googleapis.com/govt-survey-images/' || url END AS url_full
        FROM entity_files WHERE entity_type = 'installation' AND entity_id = i.id ORDER BY id ASC LIMIT 1 OFFSET 1
      ) img2 ON TRUE
      LEFT JOIN LATERAL (
        SELECT CASE WHEN url LIKE 'https://%' THEN url ELSE 'https://storage.googleapis.com/govt-survey-images/' || url END AS url_full
        FROM entity_files WHERE entity_type = 'installation' AND entity_id = i.id ORDER BY id ASC LIMIT 1 OFFSET 2
      ) img3 ON TRUE
      WHERE i.project_id = $1 AND i.status = 'CONFIRMED' AND i.is_deleted = FALSE
      AND ($2::date IS NULL OR (timezone('Asia/Kolkata', timezone('UTC', i.created_at)))::date <= $2)
      AND ($3::int IS NULL OR i.ward_id = $3)
      ${pRangeFilterI}
      ${scopeFilterI}
      ${pConfirmedFilterI}
      ORDER BY i.created_at DESC
    `;
    const iResult = await query(iSql, params);
    installations = await resolveUserNames(iResult.rows);
  }

  return {
    switchPoints: [],
    poles,
    installations
  };
}

async function getDeletedSubmissions(projectId, page = 1, limit = 50, _districtScope = null, ulbScope = null, fromDate = null, toDate = null, type = null, surveyType = null) {
  const offset = (page - 1) * limit;
  let scopeFilterP = '';
  let scopeFilterI = '';
  const params = [projectId, limit, offset];
  let pIdx = 4;

  if (ulbScope && Array.isArray(ulbScope) && ulbScope.length > 0) {
    scopeFilterP += ` AND p.ward_id = ANY($${pIdx})`;
    scopeFilterI += ` AND i.ward_id = ANY($${pIdx})`;
    params.push(ulbScope);
    pIdx++;
  }

  let pDateFilterP = '';
  let pDateFilterI = '';
  if (fromDate && toDate) {
    const startIdx = params.length + 1;
    pDateFilterP = ` AND (timezone('Asia/Kolkata', timezone('UTC', p.deleted_at)))::date BETWEEN $${startIdx} AND $${startIdx + 1}`;
    pDateFilterI = ` AND (timezone('Asia/Kolkata', timezone('UTC', i.deleted_at)))::date BETWEEN $${startIdx} AND $${startIdx + 1}`;
    params.push(fromDate, toDate);
  }

  const includeSurvey = !surveyType || surveyType === 'survey';
  const includeInst = !surveyType || surveyType === 'installation';

  const subQueries = [];

  if (includeSurvey) {
    subQueries.push(`
      SELECT 
        'pole' as type,
        p.id,
        p.ward_id as ulb_id,
        p.created_by as user_id,
        u_cre.name as user_name,
        p.created_at,
        w.name as ward_number,
        p.pole_number::text as identifier,
        w.name as ulb_name,
        p.ccms_number::text as switch_point_number,
        p.confirmed_by,
        p.confirmed_at,
        u_conf.name as confirmed_by_name,
        p.deleted_by,
        p.deleted_at,
        u_del.name as deleted_by_name,
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
        p.pole_height as pole_height,
        p.pole_height as pole_height_mtrs,
        NULL::text as pole_condition,
        p.pole_to_pole_distance as pole_to_pole_distance,
        p.pole_to_pole_distance as pole_to_pole_distance_mtrs,
        p.arm_type,
        p.arm_status,
        p.present_arm_no,
        p.present_arm_length as present_arm_length,
        p.present_arm_length as present_arm_length_mtrs,
        p.how_many_lights_in_pole,
        p.light_mounting_height,
        p.light_type, p.light_capacity, p.light_type_2, p.light_capacity_2,
        p.light_working_status,
        p.road_category,
        p.road_type,
        p.road_width_mtrs,
        p.pole_earthing_exists,
        'survey' as survey_type,
        p.light_type_3,
        p.light_capacity_3,
        p.light_type_4,
        p.light_capacity_4,
        p.light_type_5,
        p.light_capacity_5,
        p.light_type_6,
        p.light_capacity_6,
        NULL as light_status,
        NULL as light_status_2,
        NULL as light_status_3,
        NULL as light_status_4,
        NULL as light_status_5,
        NULL as arm_status_2,
        NULL as arm_status_3,
        NULL as arm_status_4,
        NULL as arm_status_5,
        NULL as light_wattage,
        NULL as light_wattage_2,
        NULL as light_wattage_3,
        NULL as light_wattage_4,
        NULL as light_wattage_5,
        NULL as dedicated_wire,
        NULL as infra_gap,
        p.remarks as remarks
      FROM poles p
      JOIN wards w ON p.ward_id = w.id
      LEFT JOIN users u_cre ON p.created_by = u_cre.id
      LEFT JOIN users u_conf ON p.confirmed_by = u_conf.id
      LEFT JOIN users u_del ON p.deleted_by = u_del.id
      WHERE p.project_id = $1 AND p.is_deleted = TRUE
      ${pDateFilterP}
      ${scopeFilterP}
    `);
  }

  if (includeInst) {
    subQueries.push(`
      SELECT 
        'pole' as type,
        i.id,
        i.ward_id as ulb_id,
        i.created_by as user_id,
        u_cre.name as user_name,
        i.created_at,
        w.name as ward_number,
        i.pole_number::text as identifier,
        w.name as ulb_name,
        i.ccms_number::text as switch_point_number,
        i.confirmed_by,
        i.confirmed_at,
        u_conf.name as confirmed_by_name,
        i.deleted_by,
        i.deleted_at,
        u_del.name as deleted_by_name,
        NULL::text as switch_point_type,
        NULL::boolean as meter_exists,
        NULL as meter_type,
        NULL as meter_rr_number,
        NULL as meter_serial_number,
        NULL as meter_condition,
        i.latitude,
        i.longitude,
        NULL as conductor_type,
        i.pole_type,
        NULL as pole_height,
        NULL as pole_height_mtrs,
        NULL as pole_condition,
        NULL as pole_to_pole_distance,
        NULL as pole_to_pole_distance_mtrs,
        NULL as arm_type,
        i.arm_status,
        NULL as present_arm_no,
        NULL as present_arm_length,
        NULL as present_arm_length_mtrs,
        i.how_many_lights_in_pole,
        NULL as light_mounting_height,
        i.light_type, i.light_wattage as light_capacity, i.light_type_2, i.light_wattage_2 as light_capacity_2,
        i.light_status as light_working_status,
        NULL as road_category,
        NULL as road_type,
        NULL as road_width_mtrs,
        NULL as pole_earthing_exists,
        'installation' as survey_type,
        i.light_type_3,
        i.light_wattage_3 as light_capacity_3,
        i.light_type_4,
        i.light_wattage_4 as light_capacity_4,
        i.light_type_5,
        i.light_wattage_5 as light_capacity_5,
        i.light_type_6,
        i.light_wattage_6 as light_capacity_6,
        i.light_status,
        i.light_status_2,
        i.light_status_3,
        i.light_status_4,
        i.light_status_5,
        i.arm_status_2,
        i.arm_status_3,
        i.arm_status_4,
        i.arm_status_5,
        i.light_wattage,
        i.light_wattage_2,
        i.light_wattage_3,
        i.light_wattage_4,
        i.light_wattage_5,
        i.dedicated_wire,
        i.infra_gap,
        i.remarks as remarks
      FROM tgpl_installations i
      JOIN wards w ON i.ward_id = w.id
      LEFT JOIN users u_cre ON i.created_by = u_cre.id
      LEFT JOIN users u_conf ON i.confirmed_by = u_conf.id
      LEFT JOIN users u_del ON i.deleted_by = u_del.id
      WHERE i.project_id = $1 AND i.is_deleted = TRUE
      ${pDateFilterI}
      ${scopeFilterI}
    `);
  }

  const queryBody = subQueries.join(' UNION ALL ');

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

async function getMyConfirmedStats(projectId, userId) {
  const surveyResult = await query(
    `SELECT 
       COUNT(1)::int as total_survey,
       COUNT(CASE WHEN (timezone('Asia/Kolkata', timezone('UTC', confirmed_at)))::date = (timezone('Asia/Kolkata', NOW()))::date THEN 1 END)::int as today_survey
     FROM poles 
     WHERE project_id = $1 AND confirmed_by = $2 AND is_deleted = FALSE`,
    [projectId, userId]
  );
  const instResult = await query(
    `SELECT 
       COUNT(1)::int as total_installation,
       COUNT(CASE WHEN (timezone('Asia/Kolkata', timezone('UTC', confirmed_at)))::date = (timezone('Asia/Kolkata', NOW()))::date THEN 1 END)::int as today_installation
     FROM tgpl_installations 
     WHERE project_id = $1 AND confirmed_by = $2 AND is_deleted = FALSE`,
    [projectId, userId]
  );

  return {
    total_survey: surveyResult.rows[0]?.total_survey || 0,
    total_installation: instResult.rows[0]?.total_installation || 0,
    today_survey: surveyResult.rows[0]?.today_survey || 0,
    today_installation: instResult.rows[0]?.today_installation || 0
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
  getAdminTracking,
  getMobileUserTracking,
  getReportData,
  getDeletedSubmissions,
  getMyConfirmedStats
};
