const { getPoles, updatePole, confirmPole } = require('../models/pole.model');
const { query } = require('../../../config/db');

async function getPolesHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;
    const poles = await getPoles(Number(projectId), status, Number(limit), Number(offset));
    res.json({ poles });
  } catch (error) {
    next(error);
  }
}

async function getCcmsListHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { ulb_id } = req.query; // ulb_id is the ward_id in TGPL context

    if (!ulb_id) {
      return res.status(400).json({ message: 'ulb_id is required' });
    }
    if (isNaN(Number(ulb_id))) {
      return res.status(400).json({ message: 'ulb_id must be a valid number' });
    }

    const result = await query(
      `SELECT ccms_number, MAX(id) as id 
       FROM poles 
       WHERE project_id = $1 AND ward_id = $2 AND ccms_number IS NOT NULL AND ccms_number != '' AND is_deleted = FALSE
       GROUP BY ccms_number 
       ORDER BY MAX(created_at) DESC 
       LIMIT 10`,
      [Number(projectId), Number(ulb_id)]
    );

    const ccmsList = result.rows.map(row => ({
      id: row.id,
      ccms_number: row.ccms_number
    }));

    res.json({ ccms: ccmsList });
  } catch (error) {
    next(error);
  }
}

async function updatePoleHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { projectId } = req.params;
    const data = req.body;
    
    const updated = await updatePole(id, projectId, data);
    res.json({ pole: updated });
  } catch (error) {
    next(error);
  }
}

async function confirmPoleHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { projectId } = req.params;
    const userId = req.user.id;
    const confirmed = await confirmPole(id, projectId, userId);
    res.json({ pole: confirmed });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPolesHandler,
  getCcmsListHandler,
  updatePoleHandler,
  confirmPoleHandler
};
