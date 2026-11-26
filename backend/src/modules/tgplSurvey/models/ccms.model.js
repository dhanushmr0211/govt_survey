const { query } = require('../../../config/db');

/**
 * Creates a new CCMS Survey record in tgpl_ccms table.
 * All strings are safely trimmed to prevent leading/trailing whitespace.
 */
async function createCcmsRecord(projectId, data, createdBy) {
  const trimStr = (val) => (val !== undefined && val !== null ? String(val).trim() : '');

  const bescomImg = trimStr(data.bescom_meter_image_url);
  const ccmsMeterImg = trimStr(data.ccms_meter_image_url);
  const ccmsBoxImg = trimStr(data.ccms_box_image_url);

  const lat = data.latitude != null && !isNaN(Number(data.latitude)) ? Number(data.latitude) : 0;
  const lng = data.longitude != null && !isNaN(Number(data.longitude)) ? Number(data.longitude) : 0;
  const offlineSubId = trimStr(data.offline_submission_id) || null;

  try {
    const result = await query(
      `INSERT INTO tgpl_ccms (
        project_id, ward_id, ward_number, ccms_number, installed_pole_number,
        supply_input, ccms_phase, dtc_number, rr_number, bescom_meter_sl_number,
        is_ct_meter, bescom_meter_status, ccms_uid_no, ccms_meter_no, ccms_imei_no,
        latitude, longitude, earthing_completed, ccms_landmark,
        ccms_meter_voltage, ccms_meter_current, ccms_meter_pf, ccms_meter_power_kw,
        bescom_meter_reading_no, bescom_meter_voltage, bescom_meter_current,
        bescom_meter_pf, bescom_meter_power_kw,
        bescom_meter_image_url, ccms_meter_image_url, ccms_box_image_url,
        created_by, offline_submission_id
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19,
        $20, $21, $22, $23,
        $24, $25, $26,
        $27, $28,
        $29, $30, $31,
        $32, $33
      ) RETURNING *`,
      [
        Number(projectId) || 3,
        Number(data.ward_id) || null,
        trimStr(data.ward_number),
        trimStr(data.ccms_number),
        trimStr(data.installed_pole_number),
        trimStr(data.supply_input),
        trimStr(data.ccms_phase),
        trimStr(data.dtc_number),
        trimStr(data.rr_number),
        trimStr(data.bescom_meter_sl_number),
        trimStr(data.is_ct_meter),
        trimStr(data.bescom_meter_status),
        trimStr(data.ccms_uid_no),
        trimStr(data.ccms_meter_no),
        trimStr(data.ccms_imei_no),
        lat,
        lng,
        trimStr(data.earthing_completed),
        trimStr(data.ccms_landmark),
        trimStr(data.ccms_meter_voltage),
        trimStr(data.ccms_meter_current),
        trimStr(data.ccms_meter_pf),
        trimStr(data.ccms_meter_power_kw),
        trimStr(data.bescom_meter_reading_no),
        trimStr(data.bescom_meter_voltage),
        trimStr(data.bescom_meter_current),
        trimStr(data.bescom_meter_pf),
        trimStr(data.bescom_meter_power_kw),
        bescomImg,
        ccmsMeterImg,
        ccmsBoxImg,
        createdBy || null,
        offlineSubId,
      ]
    );
    return result.rows[0];
  } catch (err) {
    if (err.message && err.message.includes('offline_submission_id')) {
      const fallbackResult = await query(
        `INSERT INTO tgpl_ccms (
          project_id, ward_id, ward_number, ccms_number, installed_pole_number,
          supply_input, ccms_phase, dtc_number, rr_number, bescom_meter_sl_number,
          is_ct_meter, bescom_meter_status, ccms_uid_no, ccms_meter_no, ccms_imei_no,
          latitude, longitude, earthing_completed, ccms_landmark,
          ccms_meter_voltage, ccms_meter_current, ccms_meter_pf, ccms_meter_power_kw,
          bescom_meter_reading_no, bescom_meter_voltage, bescom_meter_current,
          bescom_meter_pf, bescom_meter_power_kw,
          bescom_meter_image_url, ccms_meter_image_url, ccms_box_image_url,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          $16, $17, $18, $19,
          $20, $21, $22, $23,
          $24, $25, $26,
          $27, $28,
          $29, $30, $31,
          $32
        ) RETURNING *`,
        [
          Number(projectId) || 3,
          Number(data.ward_id) || null,
          trimStr(data.ward_number),
          trimStr(data.ccms_number),
          trimStr(data.installed_pole_number),
          trimStr(data.supply_input),
          trimStr(data.ccms_phase),
          trimStr(data.dtc_number),
          trimStr(data.rr_number),
          trimStr(data.bescom_meter_sl_number),
          trimStr(data.is_ct_meter),
          trimStr(data.bescom_meter_status),
          trimStr(data.ccms_uid_no),
          trimStr(data.ccms_meter_no),
          trimStr(data.ccms_imei_no),
          lat,
          lng,
          trimStr(data.earthing_completed),
          trimStr(data.ccms_landmark),
          trimStr(data.ccms_meter_voltage),
          trimStr(data.ccms_meter_current),
          trimStr(data.ccms_meter_pf),
          trimStr(data.ccms_meter_power_kw),
          trimStr(data.bescom_meter_reading_no),
          trimStr(data.bescom_meter_voltage),
          trimStr(data.bescom_meter_current),
          trimStr(data.bescom_meter_pf),
          trimStr(data.bescom_meter_power_kw),
          bescomImg,
          ccmsMeterImg,
          ccmsBoxImg,
          createdBy || null,
        ]
      );
      return fallbackResult.rows[0];
    }
    throw err;
  }
}

/**
 * Returns distinct CCMS numbers from tgpl_ccms for the given ward.
 * wardId can be numeric ID or ward name string.
 */
async function getCcmsByWard(projectId, wardId) {
  const raw = String(wardId || '').trim();
  const numId = /^[0-9]+$/.test(raw) ? parseInt(raw, 10) : null;
  const result = await query(
    `SELECT c.ccms_number, MAX(c.id) as id, MAX(c.created_at) as created_at
     FROM tgpl_ccms c
     LEFT JOIN wards w ON c.ward_id = w.id
     WHERE (c.project_id = $1 OR c.project_id IS NULL)
       AND (
         ($2::int IS NOT NULL AND (c.ward_id = $2 OR w.id = $2))
         OR LOWER(TRIM(w.name)) = LOWER($3)
         OR LOWER(TRIM(c.ward_number)) = LOWER($3)
       )
       AND c.is_deleted = FALSE
     GROUP BY c.ccms_number
     ORDER BY MAX(c.created_at) DESC`,
    [Number(projectId) || 3, numId, raw]
  );
  return result.rows;
}

/**
 * Returns the most recently created CCMS record from tgpl_ccms in the ward.
 */
async function getLastCcmsByWard(projectId, wardId) {
  const raw = String(wardId || '').trim();
  const numId = /^[0-9]+$/.test(raw) ? parseInt(raw, 10) : null;
  const result = await query(
    `SELECT c.* FROM tgpl_ccms c
     LEFT JOIN wards w ON c.ward_id = w.id
     WHERE (c.project_id = $1 OR c.project_id IS NULL)
       AND (
         ($2::int IS NOT NULL AND (c.ward_id = $2 OR w.id = $2))
         OR LOWER(TRIM(w.name)) = LOWER($3)
         OR LOWER(TRIM(c.ward_number)) = LOWER($3)
       )
       AND c.is_deleted = FALSE
     ORDER BY c.created_at DESC LIMIT 1`,
    [Number(projectId) || 3, numId, raw]
  );
  return result.rows[0] || null;
}

/**
 * Returns all CCMS records for a ward with full details (for the CCMS POINTS view).
 */
async function getAllCcmsRecordsByWard(projectId, wardId) {
  const raw = String(wardId || '').trim();
  const numId = /^[0-9]+$/.test(raw) ? parseInt(raw, 10) : null;
  const result = await query(
    `SELECT c.*, w.name as ulb_name, w.name as ward_name,
            u_cr.name as created_by_name,
            u_conf.name as confirmed_by_name
     FROM tgpl_ccms c
     LEFT JOIN wards w ON c.ward_id = w.id
     LEFT JOIN users u_cr ON c.created_by = u_cr.id
     LEFT JOIN users u_conf ON c.confirmed_by = u_conf.id
     WHERE (c.project_id = $1 OR c.project_id IS NULL)
       AND (
         ($2::int IS NOT NULL AND (c.ward_id = $2 OR w.id = $2))
         OR LOWER(TRIM(w.name)) = LOWER($3)
         OR LOWER(TRIM(c.ward_number)) = LOWER($3)
       )
       AND c.is_deleted = FALSE
     ORDER BY c.created_at DESC`,
    [Number(projectId) || 3, numId, raw]
  );
  return result.rows;
}

async function getCcmsById(id, projectId) {
  const result = await query(
    `SELECT c.*, w.name as ulb_name,
            u_cr.name as created_by_name,
            u_conf.name as confirmed_by_name
     FROM tgpl_ccms c
     JOIN wards w ON c.ward_id = w.id
     LEFT JOIN users u_cr ON c.created_by = u_cr.id
     LEFT JOIN users u_conf ON c.confirmed_by = u_conf.id
     WHERE c.id = $1 AND c.project_id = $2 AND c.is_deleted = FALSE`,
    [Number(id), Number(projectId) || 3]
  );
  return result.rows[0] || null;
}

async function confirmCcmsRecord(id, projectId, userId) {
  const result = await query(
    `UPDATE tgpl_ccms
     SET status = 'CONFIRMED', confirmed_by = $1, confirmed_at = NOW(), updated_at = NOW()
     WHERE id = $2 AND project_id = $3
     RETURNING *`,
    [userId, Number(id), Number(projectId) || 3]
  );
  return result.rows[0];
}

async function deleteCcmsRecord(id, projectId, userId) {
  const result = await query(
    `UPDATE tgpl_ccms
     SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $1, updated_at = NOW()
     WHERE id = $2 AND project_id = $3
     RETURNING id`,
    [userId, Number(id), Number(projectId) || 3]
  );
  return result.rows[0];
}

async function updateCcmsRecord(id, projectId, data) {
  const trimStr = (val) => (val !== undefined && val !== null ? String(val).trim() : '');

  const allowedFields = [
    'ward_id', 'ward_number', 'ccms_number', 'installed_pole_number',
    'supply_input', 'ccms_phase', 'dtc_number', 'rr_number', 'bescom_meter_sl_number',
    'is_ct_meter', 'bescom_meter_status', 'ccms_uid_no', 'ccms_meter_no', 'ccms_imei_no',
    'latitude', 'longitude', 'earthing_completed', 'ccms_landmark',
    'ccms_meter_voltage', 'ccms_meter_current', 'ccms_meter_pf', 'ccms_meter_power_kw',
    'bescom_meter_reading_no', 'bescom_meter_voltage', 'bescom_meter_current',
    'bescom_meter_pf', 'bescom_meter_power_kw',
    'bescom_meter_image_url', 'ccms_meter_image_url', 'ccms_box_image_url'
  ];

  const numericFields = new Set(['ward_id', 'latitude', 'longitude']);

  const setClauses = [];
  const values = [Number(id), Number(projectId) || 3];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      values.push(numericFields.has(field) ? (data[field] != null ? Number(data[field]) : null) : trimStr(data[field]));
      setClauses.push(`${field} = $${values.length}`);
    }
  }

  if (setClauses.length === 0) return null;
  setClauses.push('updated_at = NOW()');

  const sql = `UPDATE tgpl_ccms
               SET ${setClauses.join(', ')}
               WHERE id = $1 AND project_id = $2
               RETURNING *`;

  const result = await query(sql, values);
  return result.rows[0];
}

module.exports = {
  createCcmsRecord,
  getCcmsByWard,
  getLastCcmsByWard,
  getAllCcmsRecordsByWard,
  getCcmsById,
  confirmCcmsRecord,
  deleteCcmsRecord,
  updateCcmsRecord
};
