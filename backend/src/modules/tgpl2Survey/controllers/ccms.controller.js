const { createCcms, getCcmsByWard, getLastCcmsByWard } = require('../models/ccms.model');
const { query } = require('../../../config/db');

async function createCcmsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const createdBy = req.user.id;
    const ccms = await createCcms(Number(projectId), req.body, createdBy);
    res.status(201).json({ ccms });
  } catch (error) {
    next(error);
  }
}

async function getCcmsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { ward_id } = req.query;
    if (!ward_id) return res.status(400).json({ message: 'ward_id is required' });
    const ccmsList = await getCcmsByWard(Number(projectId), Number(ward_id));
    res.json({ ccms: ccmsList });
  } catch (error) {
    next(error);
  }
}

async function getLastCcmsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { ward_id } = req.query;
    if (!ward_id) return res.status(400).json({ message: 'ward_id is required' });
    const ccms = await getLastCcmsByWard(Number(projectId), Number(ward_id));
    res.json({ ccms });
  } catch (error) {
    next(error);
  }
}

async function confirmCcmsHandler(req, res, next) {
  try {
    const { id, projectId } = req.params;
    const userId = req.user.id;
    const result = await query(
      `UPDATE tgpl2_ccms_points 
       SET status = 'CONFIRMED', confirmed_by = $1, confirmed_at = NOW() 
       WHERE id = $2 AND project_id = $3 
       RETURNING *`,
      [userId, Number(id), Number(projectId)]
    );
    res.json({ ccms: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function updateCcmsHandler(req, res, next) {
  try {
    const { id, projectId } = req.params;
    const { ccms_number, dtc_number, dtc_capacity, ward_number } = req.body;
    const result = await query(
      `UPDATE tgpl2_ccms_points 
       SET ccms_number = $1, dtc_number = $2, dtc_capacity = $3, ward_number = $4, updated_at = NOW() 
       WHERE id = $5 AND project_id = $6 
       RETURNING *`,
      [ccms_number, dtc_number, dtc_capacity, ward_number, Number(id), Number(projectId)]
    );
    res.json({ switchPoint: result.rows[0] }); // Named "switchPoint" to fit client expectation in SubmissionQueueView
  } catch (error) {
    next(error);
  }
}

async function deleteCcmsHandler(req, res, next) {
  try {
    const { id, projectId } = req.params;
    await query(
      `UPDATE tgpl2_ccms_points SET is_deleted = TRUE WHERE id = $1 AND project_id = $2`,
      [Number(id), Number(projectId)]
    );
    res.json({ message: 'CCMS successfully deleted.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createCcmsHandler,
  getCcmsHandler,
  getLastCcmsHandler,
  confirmCcmsHandler,
  updateCcmsHandler,
  deleteCcmsHandler
};
