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
    
    // Map ulb_id/ulb_name to ward_id/ward_number if present
    if (data.ulb_id) data.ward_id = Number(data.ulb_id);
    if (data.ulb_name) data.ward_number = data.ulb_name;

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

async function validateMoveHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { type, id, ulb_id, ward_number, switch_point_number, ccms_number } = req.body;

    const targetWardId = Number(ulb_id);
    const targetCcmsNum = ccms_number !== undefined ? ccms_number : switch_point_number;

    // Fetch target ward Name
    const wardRes = await query(`SELECT name FROM wards WHERE id = $1`, [targetWardId]);
    const targetWardName = wardRes.rows[0]?.name || 'N/A';

    if (type === 'pole') {
      const poleRes = await query(
        `SELECT p.pole_number, p.ward_id, w.name as ward_name, p.ccms_number 
         FROM poles p
         JOIN wards w ON p.ward_id = w.id
         WHERE p.id = $1 AND p.project_id = $2`,
        [id, projectId]
      );
      const pole = poleRes.rows[0];
      if (!pole) {
        return res.status(404).json({ message: 'Pole not found' });
      }

      const locationChanged =
        Number(pole.ward_id) !== targetWardId ||
        pole.ccms_number !== targetCcmsNum;

      if (!locationChanged) {
        return res.json({ shouldWarn: false });
      }

      if (!targetCcmsNum || targetCcmsNum === 'NO_CCMS') {
        return res.json({ shouldWarn: false });
      }

      // Check if poles exist in target ward with target CCMS number
      const ccmsRes = await query(
        `SELECT id FROM poles 
         WHERE project_id = $1 AND ward_id = $2 AND ccms_number = $3 AND is_deleted IS NOT TRUE 
         LIMIT 1`,
        [projectId, targetWardId, targetCcmsNum]
      );

      if (ccmsRes.rows.length > 0) {
        // If present, push directly without warning prompt
        return res.json({ shouldWarn: false });
      } else {
        // If not present, warn and ask to confirm creating it
        return res.json({
          shouldWarn: true,
          action: 'create',
          message: `Pole No. "${pole.pole_number || 'N/A'}" is shifting from Ward "${pole.ward_name}" (CCMS #${pole.ccms_number || 'None'}) to target Ward "${targetWardName}" (CCMS #${targetCcmsNum || 'None'}).\n\nNo matching CCMS exists in the target ward. A new CCMS group will be created. Proceed?`
        });
      }
    } else {
      return res.json({ shouldWarn: false });
    }
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPolesHandler,
  getCcmsListHandler,
  updatePoleHandler,
  confirmPoleHandler,
  validateMoveHandler
};
