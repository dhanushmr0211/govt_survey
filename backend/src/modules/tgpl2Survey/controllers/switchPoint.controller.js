const { createSwitchPoint, getSwitchPointsByCcms, getLastSwitchPointByCcms } = require('../models/switchPoint.model');
const { query } = require('../../../config/db');

async function createSwitchPointHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const createdBy = req.user.id;
    const sp = await createSwitchPoint(Number(projectId), req.body, createdBy);
    res.status(201).json({ switch_point: sp });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ message: 'Switch point number already exists under this CCMS unit of this ward' });
    }
    next(error);
  }
}

async function getSwitchPointsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { ccms_id } = req.query;
    if (!ccms_id) return res.status(400).json({ message: 'ccms_id is required' });
    const list = await getSwitchPointsByCcms(Number(projectId), Number(ccms_id));
    res.json({ switch_points: list });
  } catch (error) {
    next(error);
  }
}

async function getLastSwitchPointHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { ccms_id } = req.query;
    if (!ccms_id) return res.status(400).json({ message: 'ccms_id is required' });
    const sp = await getLastSwitchPointByCcms(Number(projectId), Number(ccms_id));
    res.json({ switch_point: sp });
  } catch (error) {
    next(error);
  }
}

async function confirmSwitchPointHandler(req, res, next) {
  try {
    const { id, projectId } = req.params;
    const userId = req.user.id;
    const result = await query(
      `UPDATE tgpl2_switch_points 
       SET status = 'CONFIRMED', confirmed_by = $1, confirmed_at = NOW() 
       WHERE id = $2 AND project_id = $3 
       RETURNING *`,
      [userId, Number(id), Number(projectId)]
    );
    res.json({ switchPoint: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function updateSwitchPointHandler(req, res, next) {
  try {
    const { id, projectId } = req.params;
    const { switch_point_number, meter_status, meter_type, rr_number, serial_number } = req.body;
    const result = await query(
      `UPDATE tgpl2_switch_points 
       SET switch_point_number = $1, meter_status = $2, meter_type = $3, rr_number = $4, serial_number = $5, updated_at = NOW() 
       WHERE id = $6 AND project_id = $7 
       RETURNING *`,
      [switch_point_number, meter_status, meter_type, rr_number, serial_number, Number(id), Number(projectId)]
    );
    res.json({ switchPoint: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function deleteSwitchPointHandler(req, res, next) {
  try {
    const { id, projectId } = req.params;
    await query(
      `UPDATE tgpl2_switch_points SET is_deleted = TRUE WHERE id = $1 AND project_id = $2`,
      [Number(id), Number(projectId)]
    );
    res.json({ message: 'Switch Point successfully deleted.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createSwitchPointHandler,
  getSwitchPointsHandler,
  getLastSwitchPointHandler,
  confirmSwitchPointHandler,
  updateSwitchPointHandler,
  deleteSwitchPointHandler
};
