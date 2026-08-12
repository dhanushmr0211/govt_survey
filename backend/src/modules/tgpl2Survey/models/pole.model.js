const { query } = require('../../../config/db');

async function createPole(projectId, data, createdBy) {
  const result = await query(
    `INSERT INTO tgpl2_poles (
      project_id, ward_id, ccms_id, switch_point_id, pole_number, road_type, road_width,
      pole_defective, arm_deteriorated, image_url_1, image_url_2, latitude, longitude, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
    [
      projectId,
      data.ward_id,
      data.ccms_id,
      data.switch_point_id,
      data.pole_number,
      data.road_type,
      data.road_width,
      data.pole_defective || false,
      data.arm_deteriorated || false,
      data.image_url_1,
      data.image_url_2,
      data.latitude,
      data.longitude,
      createdBy
    ]
  );
  return result.rows[0];
}

async function getPoles(projectId, status, limit, offset) {
  const result = await query(
    `SELECT p.*, w.name as ward_name, c.ccms_number, sp.switch_point_number
     FROM tgpl2_poles p
     JOIN tgpl2_wards w ON p.ward_id = w.id
     JOIN tgpl2_ccms_points c ON p.ccms_id = c.id
     JOIN tgpl2_switch_points sp ON p.switch_point_id = sp.id
     WHERE p.project_id = $1 AND p.status = $2 AND p.is_deleted IS NOT TRUE
     ORDER BY p.created_at DESC LIMIT $3 OFFSET $4`,
    [projectId, status, limit, offset]
  );
  return result.rows;
}

async function updatePole(id, projectId, data) {
  const allowedFields = [
    'ward_id', 'ccms_id', 'switch_point_id', 'pole_number', 'road_type', 'road_width',
    'pole_defective', 'arm_deteriorated', 'image_url_1', 'image_url_2', 'latitude', 'longitude', 'status'
  ];

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
      `SELECT * FROM tgpl2_poles WHERE id = $1 AND project_id = $2 AND is_deleted = FALSE`,
      [id, projectId]
    );
    return existing.rows[0];
  }

  const queryText = `
    UPDATE tgpl2_poles
    SET ${setClauses.join(', ')}, updated_at = NOW()
    WHERE id = $1 AND project_id = $2 AND is_deleted = FALSE
    RETURNING *
  `;

  const result = await query(queryText, values);
  return result.rows[0];
}

async function confirmPole(id, projectId, userId) {
  const result = await query(
    `UPDATE tgpl2_poles 
     SET status = 'CONFIRMED', confirmed_by = $3, confirmed_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND project_id = $2 AND is_deleted IS NOT TRUE
     RETURNING *`,
    [id, projectId, userId]
  );
  return result.rows[0];
}

module.exports = {
  createPole,
  getPoles,
  updatePole,
  confirmPole
};
