const { query, pool, tgplPool } = require('../../../config/db');

async function enrichUserNames(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;

  const userIds = [...new Set(
    rows
      .flatMap((row) => [
        row.created_by,
        row.user_id,
        row.confirmed_by,
        row.employee_id,
        row.surveyor_id,
        row.id
      ])
      .filter((id) => id !== null && id !== undefined && id !== '' && !Number.isNaN(Number(id)))
      .map((id) => Number(id))
  )];

  if (userIds.length === 0) return rows;

  const userRes = await pool.query(
    `SELECT id, name FROM users WHERE id = ANY($1)`,
    [userIds]
  );

  const userMap = Object.fromEntries(
    userRes.rows.map((user) => [String(user.id), user.name])
  );

  rows.forEach((row) => {
    const createdBy = row.created_by ?? row.user_id ?? row.surveyor_id;
    if (createdBy != null) {
      const name = userMap[String(createdBy)];
      row.user_name = name || String(createdBy);
      row.surveyor_name = name || String(createdBy);
    }

    const confirmedBy = row.confirmed_by ?? row.employee_id;
    if (confirmedBy != null) {
      const name = userMap[String(confirmedBy)];
      row.confirmed_by_name = name || String(confirmedBy);
      row.employee_name = name || String(confirmedBy);
    }
  });

  return rows;
}

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

async function buildQueueQuery(projectId, type = 'all', queueStatus = 'PENDING', page = 1, limit = 50, fromDate = null, toDate = null) {
  const normalizedType = (type || 'all').toLowerCase();
  const allowedTypes = ['all', 'pole', 'switch_point', 'ccms'];
  const effectiveType = allowedTypes.includes(normalizedType) ? normalizedType : 'all';

  const offset = (page - 1) * limit;
  const params = [projectId, queueStatus];
  let paramIndex = 3;

  let dateClauseCcms = '';
  let dateClauseSp = '';
  let dateClausePole = '';
  if (fromDate && toDate) {
    dateClauseCcms = ` AND c.created_at::date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
    dateClauseSp = ` AND sp.created_at::date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
    dateClausePole = ` AND p.created_at::date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
    params.push(fromDate, toDate);
    paramIndex += 2;
  }

  const ccmsQuery = `
    SELECT
      'ccms' as submission_type,
      c.id,
      c.project_id,
      c.ward_id,
      w.name as ward_name,
      c.ccms_number as identifier,
      c.created_by,
      c.created_by as user_id,
      c.created_at,
      c.confirmed_by,
      c.confirmed_at,
      COALESCE(UPPER(c.status), 'PENDING') as status,
      NULL::float as latitude,
      NULL::float as longitude,
      NULL as image_url_1,
      NULL as image_url_2,
      c.ccms_number,
      NULL as switch_point_number,
      NULL as pole_number,
      c.dtc_number,
      c.dtc_capacity
    FROM tgpl2_ccms_points c
    LEFT JOIN tgpl2_wards w ON w.id = c.ward_id
    WHERE c.project_id = $1
      AND c.is_deleted IS NOT TRUE
      AND COALESCE(UPPER(c.status), 'PENDING') = $2
      ${dateClauseCcms}
  `;

  const spQuery = `
    SELECT
      'switch_point' as submission_type,
      sp.id,
      sp.project_id,
      sp.ward_id,
      w.name as ward_name,
      sp.switch_point_number as identifier,
      sp.created_by,
      sp.created_by as user_id,
      sp.created_at,
      sp.confirmed_by,
      sp.confirmed_at,
      COALESCE(UPPER(sp.status), 'PENDING') as status,
      NULL::float as latitude,
      NULL::float as longitude,
      NULL as image_url_1,
      NULL as image_url_2,
      c.ccms_number,
      sp.switch_point_number,
      NULL as pole_number,
      c.dtc_number,
      c.dtc_capacity
    FROM tgpl2_switch_points sp
    LEFT JOIN tgpl2_ccms_points c ON c.id = sp.ccms_id
    LEFT JOIN tgpl2_wards w ON w.id = sp.ward_id
    WHERE sp.project_id = $1
      AND sp.is_deleted IS NOT TRUE
      AND COALESCE(UPPER(sp.status), 'PENDING') = $2
      ${dateClauseSp}
  `;

  const poleQuery = `
    SELECT
      'pole' as submission_type,
      p.id,
      p.project_id,
      p.ward_id,
      w.name as ward_name,
      p.pole_number as identifier,
      p.created_by,
      p.created_by as user_id,
      p.created_at,
      p.confirmed_by,
      p.confirmed_at,
      COALESCE(UPPER(p.status), 'PENDING') as status,
      p.latitude,
      p.longitude,
      p.image_url_1,
      p.image_url_2,
      c.ccms_number,
      sp.switch_point_number,
      p.pole_number,
      c.dtc_number,
      c.dtc_capacity
    FROM tgpl2_poles p
    LEFT JOIN tgpl2_switch_points sp ON sp.id = p.switch_point_id
    LEFT JOIN tgpl2_ccms_points c ON c.id = p.ccms_id
    LEFT JOIN tgpl2_wards w ON w.id = p.ward_id
    WHERE p.project_id = $1
      AND p.is_deleted IS NOT TRUE
      AND COALESCE(UPPER(p.status), 'PENDING') = $2
      ${dateClausePole}
  `;

  let unionSql = '';
  if (effectiveType === 'ccms') {
    unionSql = ccmsQuery;
  } else if (effectiveType === 'switch_point') {
    unionSql = spQuery;
  } else if (effectiveType === 'pole') {
    unionSql = poleQuery;
  } else {
    unionSql = `${ccmsQuery} UNION ALL ${spQuery} UNION ALL ${poleQuery}`;
  }

  const countSql = `SELECT COUNT(*) as total FROM (${unionSql}) q`;
  const countRes = await tgplPool.query(countSql, params);
  const total = Number(countRes.rows[0]?.total || 0);

  const dataSql = `
    SELECT *
    FROM (${unionSql}) q
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const dataRes = await tgplPool.query(dataSql, params);
  const enrichedRows = await enrichUserNames(dataRes.rows);
  enrichedRows.forEach((row) => {
    row.type = row.submission_type;
  });
  return { rows: enrichedRows, total };
}

async function getPendingSubmissions(projectId, type = 'all', page = 1, limit = 50, fromDate = null, toDate = null) {
  return buildQueueQuery(projectId, type, 'PENDING', page, limit, fromDate, toDate);
}

async function getConfirmedSubmissions(projectId, type = 'all', page = 1, limit = 50, fromDate = null, toDate = null) {
  return buildQueueQuery(projectId, type, 'CONFIRMED', page, limit, fromDate, toDate);
}

async function getTodaySubmissions(projectId, userId) {
  const result = await tgplPool.query(
    `SELECT p.*, w.name as ward_name, c.ccms_number, sp.switch_point_number
     FROM tgpl2_poles p
     LEFT JOIN tgpl2_wards w ON p.ward_id = w.id
     LEFT JOIN tgpl2_ccms_points c ON p.ccms_id = c.id
     LEFT JOIN tgpl2_switch_points sp ON p.switch_point_id = sp.id
     WHERE p.project_id = $1 AND p.created_by = $2 AND p.created_at::date = NOW()::date AND p.is_deleted IS NOT TRUE
     ORDER BY p.created_at DESC`,
    [projectId, userId]
  );
  return enrichUserNames(result.rows);
}

async function getEmployeeTracking(projectId) {
  const result = await tgplPool.query(
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
  return enrichUserNames(result.rows);
}

async function getMobileUserTracking(projectId) {
  const submissionsRes = await tgplPool.query(
    `SELECT 
      p.created_by as user_id,
      COUNT(*) as total_submissions,
      COUNT(CASE WHEN UPPER(COALESCE(p.status, 'PENDING')) = 'CONFIRMED' THEN 1 END) as confirmed_count,
      COUNT(CASE WHEN UPPER(COALESCE(p.status, 'PENDING')) = 'PENDING' THEN 1 END) as pending_count,
      MAX(p.created_at) as last_submission_at
     FROM tgpl2_poles p
     WHERE p.project_id = $1 AND p.is_deleted IS NOT TRUE
     GROUP BY p.created_by
     ORDER BY total_submissions DESC`,
    [projectId]
  );

  const membersRes = await pool.query(
    `SELECT pu.user_id, u.name
     FROM project_users pu
     JOIN users u ON u.id = pu.user_id
     WHERE pu.project_id = $1 AND pu.project_role = 'MOBILE_USER'`,
    [projectId]
  );

  const submissionMap = new Map(
    submissionsRes.rows
      .filter((row) => row.user_id != null)
      .map((row) => [
        String(row.user_id),
        {
          total_submissions: Number(row.total_submissions || 0),
          confirmed_count: Number(row.confirmed_count || 0),
          pending_count: Number(row.pending_count || 0),
          last_submission_at: row.last_submission_at || null
        }
      ])
  );

  const resultRows = membersRes.rows.map((member) => {
    const stats = submissionMap.get(String(member.user_id)) || {
      total_submissions: 0,
      confirmed_count: 0,
      pending_count: 0,
      last_submission_at: null
    };
    submissionMap.delete(String(member.user_id));

    return {
      user_id: member.user_id,
      surveyor_id: member.user_id,
      user_name: member.name,
      surveyor_name: member.name,
      total_submissions: stats.total_submissions,
      submitted_count: stats.total_submissions,
      confirmed_count: stats.confirmed_count,
      pending_count: stats.pending_count,
      last_submission_at: stats.last_submission_at
    };
  });

  // Include users who submitted but are not currently mapped as MOBILE_USER members
  if (submissionMap.size > 0) {
    const extraUserIds = [...submissionMap.keys()].map((id) => Number(id));
    const usersRes = await pool.query(`SELECT id, name FROM users WHERE id = ANY($1)`, [extraUserIds]);
    const usersMap = Object.fromEntries(usersRes.rows.map((user) => [String(user.id), user.name]));

    for (const [userId, stats] of submissionMap.entries()) {
      resultRows.push({
        user_id: Number(userId),
        surveyor_id: Number(userId),
        user_name: usersMap[userId] || userId,
        surveyor_name: usersMap[userId] || userId,
        total_submissions: stats.total_submissions,
        submitted_count: stats.total_submissions,
        confirmed_count: stats.confirmed_count,
        pending_count: stats.pending_count,
        last_submission_at: stats.last_submission_at
      });
    }
  }

  resultRows.sort((a, b) => {
    if (b.total_submissions !== a.total_submissions) return b.total_submissions - a.total_submissions;
    return String(a.user_name).localeCompare(String(b.user_name));
  });

  return resultRows;
}

async function getWardSummary(projectId, wardId) {
  const result = await tgplPool.query(
    `SELECT
      c.id as ccms_id,
      c.ccms_number,
      COUNT(DISTINCT sp.id) FILTER (WHERE sp.is_deleted IS NOT TRUE) as switch_point_count,
      COUNT(p.id) FILTER (WHERE p.is_deleted IS NOT TRUE) as pole_count
     FROM tgpl2_ccms_points c
     LEFT JOIN tgpl2_switch_points sp
       ON sp.ccms_id = c.id
      AND sp.project_id = $1
     LEFT JOIN tgpl2_poles p
       ON p.switch_point_id = sp.id
      AND p.project_id = $1
     WHERE c.project_id = $1
       AND c.ward_id = $2
       AND c.is_deleted IS NOT TRUE
     GROUP BY c.id, c.ccms_number
     ORDER BY c.ccms_number ASC`,
    [projectId, wardId]
  );

  return result.rows;
}

async function getCcmsSummary(projectId, ccmsId) {
  const result = await tgplPool.query(
    `SELECT
      sp.id as sp_id,
      sp.switch_point_number,
      COUNT(p.id) FILTER (WHERE p.is_deleted IS NOT TRUE) as pole_count,
      COUNT(p.id) FILTER (WHERE p.is_deleted IS NOT TRUE AND COALESCE(UPPER(p.status), 'PENDING') = 'PENDING') as pending_count,
      COUNT(p.id) FILTER (WHERE p.is_deleted IS NOT TRUE AND COALESCE(UPPER(p.status), 'PENDING') = 'CONFIRMED') as confirmed_count
     FROM tgpl2_switch_points sp
     LEFT JOIN tgpl2_poles p
       ON p.switch_point_id = sp.id
      AND p.project_id = $1
     WHERE sp.project_id = $1
       AND sp.ccms_id = $2
       AND sp.is_deleted IS NOT TRUE
     GROUP BY sp.id, sp.switch_point_number
     ORDER BY sp.switch_point_number ASC`,
    [projectId, ccmsId]
  );

  return result.rows;
}

async function getSwitchPointDetails(projectId, switchPointId) {
  const result = await tgplPool.query(
    `SELECT
      p.*,
      w.name as ward_name,
      c.ccms_number,
      sp.switch_point_number
     FROM tgpl2_poles p
     LEFT JOIN tgpl2_wards w ON w.id = p.ward_id
     LEFT JOIN tgpl2_ccms_points c ON c.id = p.ccms_id
     LEFT JOIN tgpl2_switch_points sp ON sp.id = p.switch_point_id
     WHERE p.project_id = $1
       AND p.switch_point_id = $2
       AND p.is_deleted IS NOT TRUE
     ORDER BY p.created_at DESC`,
    [projectId, switchPointId]
  );

  return enrichUserNames(result.rows);
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
  const result = await tgplPool.query(
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
      p.created_by,
      p.confirmed_by
     FROM tgpl2_poles p
     LEFT JOIN tgpl2_wards w ON p.ward_id = w.id
     LEFT JOIN tgpl2_ccms_points c ON p.ccms_id = c.id
     LEFT JOIN tgpl2_switch_points sp ON p.switch_point_id = sp.id
     WHERE p.project_id = $1 AND p.is_deleted IS NOT TRUE
     ORDER BY w.name ASC, c.ccms_number ASC, sp.switch_point_number ASC, p.pole_number ASC`,
    [projectId]
  );
  return enrichUserNames(result.rows);
}

module.exports = {
  getWardsSummary,
  getWardSummary,
  getCcmsSummary,
  getSwitchPointDetails,
  getWardDetails,
  getPendingSubmissions,
  getConfirmedSubmissions,
  getTodaySubmissions,
  getEmployeeTracking,
  getMobileUserTracking,
  getMyStats,
  getReportData
};
