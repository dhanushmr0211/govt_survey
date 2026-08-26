const { query } = require('../../../config/db');

async function createInstallation(projectId, data, createdBy) {
  const result = await query(
    `INSERT INTO tgpl_installations (
      project_id, ward_id, ward_number, ccms_number, pole_number, pole_type,
      how_many_lights_in_pole,
      light_type, light_wattage, light_status, arm_status,
      light_type_2, light_wattage_2, light_status_2, arm_status_2,
      light_type_3, light_wattage_3, light_status_3, arm_status_3,
      light_type_4, light_wattage_4, light_status_4, arm_status_4,
      light_type_5, light_wattage_5, light_status_5, arm_status_5,
      dedicated_wire, infra_gap,
      latitude, longitude,
      image_url_1, image_url_2, image_url_3,
      created_by, offline_submission_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7,
      $8, $9, $10, $11,
      $12, $13, $14, $15,
      $16, $17, $18, $19,
      $20, $21, $22, $23,
      $24, $25, $26, $27,
      $28, $29,
      $30, $31,
      $32, $33, $34,
      $35, $36
    ) RETURNING *`,
    [
      projectId,
      data.ward_id,
      data.ward_number,
      data.ccms_number,
      data.pole_number,
      data.pole_type,
      data.how_many_lights_in_pole || '0',
      data.light_type || null,
      data.light_wattage || data.light_capacity || null,
      data.light_status || null,
      data.arm_status || null,
      data.light_type_2 || null,
      data.light_wattage_2 || data.light_capacity_2 || null,
      data.light_status_2 || null,
      data.arm_status_2 || null,
      data.light_type_3 || null,
      data.light_wattage_3 || data.light_capacity_3 || null,
      data.light_status_3 || null,
      data.arm_status_3 || null,
      data.light_type_4 || null,
      data.light_wattage_4 || data.light_capacity_4 || null,
      data.light_status_4 || null,
      data.arm_status_4 || null,
      data.light_type_5 || null,
      data.light_wattage_5 || data.light_capacity_5 || null,
      data.light_status_5 || null,
      data.arm_status_5 || null,
      data.dedicated_wire || data.req_dedicated_wire || null,
      data.infra_gap || 'NA',
      data.latitude,
      data.longitude,
      data.image_url_1 || null,
      data.image_url_2 || null,
      data.image_url_3 || null,
      createdBy,
      data.offline_submission_id || null
    ]
  );
  return result.rows[0];
}

async function getInstallations(projectId, status, limit, offset) {
  const result = await query(
    `SELECT i.*, w.name as ulb_name,
            i.ccms_number as sp_number
     FROM tgpl_installations i
     JOIN wards w ON i.ward_id = w.id
     WHERE i.project_id = $1 AND i.status = $2 AND i.is_deleted IS NOT TRUE 
     ORDER BY i.created_at DESC LIMIT $3 OFFSET $4`,
    [projectId, status, limit, offset]
  );
  return result.rows;
}

async function updateInstallation(id, projectId, data) {
  const allowedFields = [
    'ward_id', 'ward_number', 'ccms_number', 'pole_number', 'pole_type',
    'how_many_lights_in_pole',
    'light_type', 'light_wattage', 'light_status', 'arm_status',
    'light_type_2', 'light_wattage_2', 'light_status_2', 'arm_status_2',
    'light_type_3', 'light_wattage_3', 'light_status_3', 'arm_status_3',
    'light_type_4', 'light_wattage_4', 'light_status_4', 'arm_status_4',
    'light_type_5', 'light_wattage_5', 'light_status_5', 'arm_status_5',
    'dedicated_wire', 'infra_gap', 'latitude', 'longitude',
    'image_url_1', 'image_url_2', 'image_url_3'
  ];

  // Map legacy field names if passed
  if (data.light_capacity !== undefined && data.light_wattage === undefined) data.light_wattage = data.light_capacity;
  if (data.light_capacity_2 !== undefined && data.light_wattage_2 === undefined) data.light_wattage_2 = data.light_capacity_2;
  if (data.light_capacity_3 !== undefined && data.light_wattage_3 === undefined) data.light_wattage_3 = data.light_capacity_3;
  if (data.light_capacity_4 !== undefined && data.light_wattage_4 === undefined) data.light_wattage_4 = data.light_capacity_4;
  if (data.light_capacity_5 !== undefined && data.light_wattage_5 === undefined) data.light_wattage_5 = data.light_capacity_5;
  if (data.req_dedicated_wire !== undefined && data.dedicated_wire === undefined) data.dedicated_wire = data.req_dedicated_wire;

  const setClauses = [];
  const values = [id, projectId];
  let paramIndex = 3;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      setClauses.push(`${field} = $${paramIndex++}`);
      const val = data[field] === '' ? null : data[field];
      values.push(val);
    }
  }

  if (setClauses.length === 0) {
    const existing = await query(
      `SELECT * FROM tgpl_installations WHERE id = $1 AND project_id = $2 AND is_deleted = FALSE`,
      [id, projectId]
    );
    return existing.rows[0];
  }

  const queryText = `
    UPDATE tgpl_installations 
    SET ${setClauses.join(', ')}, updated_at = NOW()
    WHERE id = $1 AND project_id = $2 AND is_deleted = FALSE
    RETURNING *
  `;

  const result = await query(queryText, values);
  return result.rows[0];
}

async function confirmInstallation(id, projectId, userId) {
  const result = await query(
    `UPDATE tgpl_installations 
     SET status = 'CONFIRMED', confirmed_by = $3, confirmed_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND project_id = $2 AND is_deleted IS NOT TRUE
     RETURNING *`,
    [id, projectId, userId]
  );
  return result.rows[0];
}

module.exports = {
  createInstallation,
  getInstallations,
  updateInstallation,
  confirmInstallation
};
