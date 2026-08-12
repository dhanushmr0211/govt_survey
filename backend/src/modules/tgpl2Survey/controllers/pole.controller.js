const { createPole, getPoles, updatePole, confirmPole } = require('../models/pole.model');
const { query } = require('../../../config/db');
const { ROLES } = require('../../../constants/roles');

async function createPoleHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const createdBy = req.user.id;
    const pole = await createPole(Number(projectId), req.body, createdBy);
    res.status(201).json({ pole });
  } catch (error) {
    next(error);
  }
}

async function getPolesHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;
    const polesList = await getPoles(Number(projectId), status, Number(limit), Number(offset));
    res.json({ poles: polesList });
  } catch (error) {
    next(error);
  }
}

async function updatePoleHandler(req, res, next) {
  try {
    const { id, projectId } = req.params;
    const data = req.body;

    const currentRes = await query(`SELECT status, created_by FROM tgpl2_poles WHERE id = $1 AND project_id = $2`, [Number(id), Number(projectId)]);
    const current = currentRes.rows[0];
    if (!current) return res.status(404).json({ message: 'Pole not found' });

    // Permissions check
    const isMasterAdmin = req.user?.role === ROLES.MASTER_ADMIN;
    const permissions = req.projectSections || {};
    const statusLower = (current.status || '').toLowerCase();

    if (!isMasterAdmin) {
      if (statusLower === 'pending') {
        const isMobileSurveyor = req.projectRole === ROLES.MOBILE_USER;
        const isCreator = current.created_by === req.user?.id;
        const canEditPending = permissions.section_i || (isMobileSurveyor && isCreator);
        if (!canEditPending) {
          return res.status(403).json({ message: 'Forbidden: You do not have permission to edit pending survey data' });
        }
      }
      if (statusLower === 'confirmed' && !permissions.section_j) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to edit confirmed data' });
      }
    }

    const updated = await updatePole(Number(id), Number(projectId), data);
    res.json({ pole: updated });
  } catch (error) {
    next(error);
  }
}

async function confirmPoleHandler(req, res, next) {
  try {
    const { id, projectId } = req.params;
    const userId = req.user.id;
    const confirmed = await confirmPole(Number(id), Number(projectId), userId);
    res.json({ pole: confirmed });
  } catch (error) {
    next(error);
  }
}

async function deletePoleHandler(req, res, next) {
  try {
    const { id, projectId } = req.params;
    const userId = req.user.id;

    const userEmail = (req.user?.email || '').toLowerCase().trim();
    if (userEmail !== 'pratheekar1997@gmail.com' && userEmail !== 'prelectricals01@gmail.com') {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to delete submissions.' });
    }

    await query(
      `UPDATE tgpl2_poles SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $1 WHERE id = $2 AND project_id = $3`,
      [userId, Number(id), Number(projectId)]
    );
    res.json({ message: 'Pole successfully deleted.' });
  } catch (error) {
    next(error);
  }
}

async function validateMoveHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { id, ward_id, ccms_id, switch_point_id } = req.body;

    const targetWardId = Number(ward_id);
    const targetCcmsId = Number(ccms_id);
    const targetSpId = Number(switch_point_id);

    const poleRes = await query(
      `SELECT p.pole_number, p.ward_id, w.name as ward_name, p.ccms_id, p.switch_point_id
       FROM tgpl2_poles p
       JOIN tgpl2_wards w ON p.ward_id = w.id
       WHERE p.id = $1 AND p.project_id = $2`,
      [Number(id), Number(projectId)]
    );
    const pole = poleRes.rows[0];
    if (!pole) return res.status(404).json({ message: 'Pole not found' });

    const locationChanged =
      Number(pole.ward_id) !== targetWardId ||
      Number(pole.ccms_id) !== targetCcmsId ||
      Number(pole.switch_point_id) !== targetSpId;

    if (!locationChanged) {
      return res.json({ shouldWarn: false });
    }

    // Verify if target switch point belongs to the target ccms
    const spCheck = await query(
      `SELECT id FROM tgpl2_switch_points 
       WHERE id = $1 AND ccms_id = $2 AND is_deleted IS NOT TRUE`,
      [targetSpId, targetCcmsId]
    );

    if (spCheck.rows.length > 0) {
      return res.json({ shouldWarn: false });
    } else {
      const wardRes = await query(`SELECT name FROM tgpl2_wards WHERE id = $1`, [targetWardId]);
      const targetWardName = wardRes.rows[0]?.name || 'N/A';
      return res.json({
        shouldWarn: true,
        action: 'create',
        message: `Pole No. "${pole.pole_number || 'N/A'}" is shifting from Ward "${pole.ward_name}".
The target Switch Point hierarchy does not exist in the destination. A new Switch Point assignment will be linked. Proceed?`
      });
    }
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createPoleHandler,
  getPolesHandler,
  updatePoleHandler,
  confirmPoleHandler,
  deletePoleHandler,
  validateMoveHandler
};
