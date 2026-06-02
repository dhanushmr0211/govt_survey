const { getSwitchPointsByWard, updateSwitchPoint, confirmSwitchPoint } = require('../models/switchPoint.model');
const { getPoles, updatePole, confirmPole } = require('../models/pole.model');
const { query } = require('../../../config/db');

async function getSwitchPointsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { ward_number, ulb_id } = req.query;
    const switchPoints = await getSwitchPointsByWard(Number(projectId), Number(ulb_id), ward_number);
    res.json({ switchPoints });
  } catch (error) {
    next(error);
  }
}

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

async function validateMoveHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { type, id, ulb_id, ward_number, switch_point_number } = req.body;

    const targetUlbId = Number(ulb_id);
    const targetWard = ward_number;
    const targetSpNum = switch_point_number;

    // Fetch target ULB Name
    const ulbRes = await query(`SELECT name FROM ulbs WHERE id = $1`, [targetUlbId]);
    const targetUlbName = ulbRes.rows[0]?.name || 'N/A';

    if (type === 'pole') {
      // Get current pole info
      const poleRes = await query(
        `SELECT p.pole_number, p.ward_number, p.switch_point_number, sp.ulb_id, u.name as ulb_name 
         FROM poles p
         JOIN switch_points sp ON p.switch_point_id = sp.id
         JOIN ulbs u ON sp.ulb_id = u.id
         WHERE p.id = $1 AND p.project_id = $2`,
        [id, projectId]
      );
      const pole = poleRes.rows[0];
      if (!pole) {
        return res.status(404).json({ message: 'Pole not found' });
      }

      const locationChanged =
        Number(pole.ulb_id) !== targetUlbId ||
        pole.ward_number !== targetWard ||
        pole.switch_point_number !== targetSpNum;

      if (!locationChanged) {
        return res.json({ shouldWarn: false });
      }

      // Check if switch point exists in target ULB/ward/spNum
      const spRes = await query(
        `SELECT id FROM switch_points 
         WHERE project_id = $1 AND ulb_id = $2 AND ward_number = $3 AND switch_point_number = $4 AND is_deleted IS NOT TRUE 
         LIMIT 1`,
        [projectId, targetUlbId, targetWard, targetSpNum]
      );

      if (spRes.rows.length > 0) {
        return res.json({
          shouldWarn: true,
          action: 'shift',
          message: `Pole No. "${pole.pole_number || 'N/A'}" is shifting from ULB "${pole.ulb_name}" (Ward ${pole.ward_number}, SP #${pole.switch_point_number}) to the target ULB "${targetUlbName}" (Ward ${targetWard}, SP #${targetSpNum}).\n\nThis pole will be added under the existing target Switch Point. Proceed?`
        });
      } else {
        return res.json({
          shouldWarn: true,
          action: 'create',
          message: `Pole No. "${pole.pole_number || 'N/A'}" is shifting from ULB "${pole.ulb_name}" (Ward ${pole.ward_number}, SP #${pole.switch_point_number}) to the target ULB "${targetUlbName}" (Ward ${targetWard}, SP #${targetSpNum}).\n\nNo matching Switch Point exists in the target ward. A new Switch Point will be created. Proceed?`
        });
      }
    } else if (type === 'switch_point') {
      // Get current switch point and all associated poles
      const spRes = await query(
        `SELECT sp.switch_point_number, sp.ward_number, sp.ulb_id, u.name as ulb_name
         FROM switch_points sp
         JOIN ulbs u ON sp.ulb_id = u.id
         WHERE sp.id = $1 AND sp.project_id = $2 AND sp.is_deleted IS NOT TRUE`,
        [id, projectId]
      );
      const sp = spRes.rows[0];
      if (!sp) {
        return res.status(404).json({ message: 'Switch Point not found' });
      }

      const locationChanged =
        Number(sp.ulb_id) !== targetUlbId ||
        sp.ward_number !== targetWard ||
        sp.switch_point_number !== targetSpNum;

      if (!locationChanged) {
        return res.json({ shouldWarn: false });
      }

      // Fetch all pole numbers under this switch point
      const polesRes = await query(
        `SELECT pole_number FROM poles WHERE switch_point_id = $1 AND is_deleted IS NOT TRUE`,
        [id]
      );
      const poleNumbers = polesRes.rows.map(p => p.pole_number).filter(Boolean);
      const polesListStr = poleNumbers.length > 0 ? poleNumbers.join(', ') : 'none';

      // Check if duplicate switch point exists in target ULB/ward/spNum
      const dupRes = await query(
        `SELECT id FROM switch_points 
         WHERE project_id = $1 AND ulb_id = $2 AND ward_number = $3 AND switch_point_number = $4 AND id != $5 AND is_deleted IS NOT TRUE 
         LIMIT 1`,
        [projectId, targetUlbId, targetWard, targetSpNum, id]
      );

      if (dupRes.rows.length > 0) {
        return res.json({
          shouldWarn: true,
          action: 'merge',
          message: `Switch Point SP #${sp.switch_point_number} (ULB "${sp.ulb_name}", Ward ${sp.ward_number}) already exists in target ULB "${targetUlbName}" (Ward ${targetWard}, SP #${targetSpNum}).\n\nThis will MERGE them. The current Switch Point will be deleted, and all its associated poles (${polesListStr}) will be shifted to the target Switch Point. Proceed?`
        });
      } else {
        return res.json({
          shouldWarn: true,
          action: 'move',
          message: `Switch Point SP #${sp.switch_point_number} and all its associated poles (${polesListStr}) are shifting from ULB "${sp.ulb_name}" (Ward ${sp.ward_number}) to the target ULB "${targetUlbName}" (Ward ${targetWard}). Proceed?`
        });
      }
    }

    res.json({ shouldWarn: false });
  } catch (error) {
    next(error);
  }
}

async function updateSwitchPointHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { projectId } = req.params;
    const data = req.body;

    const existingSpRes = await query(
      `SELECT id, ulb_id, ward_number, switch_point_number, latitude, longitude 
       FROM switch_points 
       WHERE id = $1 AND project_id = $2 AND is_deleted IS NOT TRUE`,
      [id, projectId]
    );
    const existingSp = existingSpRes.rows[0];
    if (!existingSp) {
      return res.status(404).json({ message: 'Switch Point not found' });
    }

    // Check if coordinates have changed
    const incomingLat = data.latitude !== undefined && data.latitude !== null && data.latitude !== '' ? parseFloat(data.latitude) : null;
    const incomingLng = data.longitude !== undefined && data.longitude !== null && data.longitude !== '' ? parseFloat(data.longitude) : null;
    const existingLat = existingSp.latitude !== null && existingSp.latitude !== '' ? parseFloat(existingSp.latitude) : null;
    const existingLng = existingSp.longitude !== null && existingSp.longitude !== '' ? parseFloat(existingSp.longitude) : null;

    const latChanged = incomingLat !== null && incomingLat !== existingLat;
    const lngChanged = incomingLng !== null && incomingLng !== existingLng;

    if (latChanged || lngChanged) {
      const userEmail = req.user?.email;
      const isAllowedUser = userEmail && userEmail.toLowerCase().trim() === 'pratheekar1997@gmail.com';
      const isIdeckProject = Number(projectId) === 2;

      if (!isAllowedUser || !isIdeckProject) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to edit GPS coordinates.' });
      }
    }

    const targetUlbId = data.ulb_id !== undefined ? Number(data.ulb_id) : Number(existingSp.ulb_id);
    const targetWard = data.ward_number !== undefined ? data.ward_number : existingSp.ward_number;
    const targetSpNum = data.switch_point_number !== undefined ? data.switch_point_number : existingSp.switch_point_number;

    const locationChanged = 
      targetUlbId !== Number(existingSp.ulb_id) || 
      targetWard !== existingSp.ward_number || 
      targetSpNum !== existingSp.switch_point_number;

    if (locationChanged) {
      const duplicateCheck = await query(
        `SELECT id FROM switch_points 
         WHERE project_id = $1 AND ulb_id = $2 AND ward_number = $3 AND switch_point_number = $4 AND id != $5 AND is_deleted IS NOT TRUE 
         LIMIT 1`,
         [projectId, targetUlbId, targetWard, targetSpNum, id]
      );

      if (duplicateCheck.rows.length > 0) {
        const targetSpId = duplicateCheck.rows[0].id;
        
        // Merge: shift all poles to target switch point
        await query(
          `UPDATE poles 
           SET switch_point_id = $1, ward_number = $2, switch_point_number = $3 
           WHERE switch_point_id = $4`,
          [targetSpId, targetWard, targetSpNum, id]
        );

        // Soft-delete current switch point
        await query(
          `UPDATE switch_points 
           SET is_deleted = TRUE, deleted_at = NOW() 
           WHERE id = $1`,
          [id]
        );

        // Update target switch point details if any technical details were sent in body
        if (data.switch_point_type || data.meter_exists !== undefined || data.meter_type || data.meter_rr_number || data.meter_serial_number || data.meter_condition) {
          await updateSwitchPoint(targetSpId, projectId, data);
        }

        const targetSpRes = await query(`SELECT * FROM switch_points WHERE id = $1`, [targetSpId]);
        return res.json({ switchPoint: targetSpRes.rows[0] });
      }
    }

    const updated = await updateSwitchPoint(id, projectId, data);
    res.json({ switchPoint: updated });
  } catch (error) {
    next(error);
  }
}

async function updatePoleHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { projectId } = req.params;
    const data = req.body;

    const existingPoleRes = await query(
      `SELECT p.id, p.ward_number, p.switch_point_number, p.switch_point_id, p.latitude, p.longitude, sp.ulb_id 
       FROM poles p 
       JOIN switch_points sp ON p.switch_point_id = sp.id 
       WHERE p.id = $1 AND p.project_id = $2`,
      [id, projectId]
    );
    const existingPole = existingPoleRes.rows[0];
    if (!existingPole) {
      return res.status(404).json({ message: 'Pole not found' });
    }

    // Check if coordinates have changed
    const incomingLat = data.latitude !== undefined && data.latitude !== null && data.latitude !== '' ? parseFloat(data.latitude) : null;
    const incomingLng = data.longitude !== undefined && data.longitude !== null && data.longitude !== '' ? parseFloat(data.longitude) : null;
    const existingLat = existingPole.latitude !== null && existingPole.latitude !== '' ? parseFloat(existingPole.latitude) : null;
    const existingLng = existingPole.longitude !== null && existingPole.longitude !== '' ? parseFloat(existingPole.longitude) : null;

    const latChanged = incomingLat !== null && incomingLat !== existingLat;
    const lngChanged = incomingLng !== null && incomingLng !== existingLng;

    if (latChanged || lngChanged) {
      const userEmail = req.user?.email;
      const isAllowedUser = userEmail && userEmail.toLowerCase().trim() === 'pratheekar1997@gmail.com';
      const isIdeckProject = Number(projectId) === 2;

      if (!isAllowedUser || !isIdeckProject) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to edit GPS coordinates.' });
      }
    }

    const targetUlbId = data.ulb_id !== undefined ? Number(data.ulb_id) : Number(existingPole.ulb_id);
    const targetWard = data.ward_number !== undefined ? data.ward_number : existingPole.ward_number;
    const targetSpNum = data.switch_point_number !== undefined ? data.switch_point_number : existingPole.switch_point_number;

    const locationChanged = 
      targetUlbId !== Number(existingPole.ulb_id) || 
      targetWard !== existingPole.ward_number || 
      targetSpNum !== existingPole.switch_point_number;

    let targetSpId = existingPole.switch_point_id;

    if (locationChanged) {
      const spCheck = await query(
        `SELECT id FROM switch_points 
         WHERE project_id = $1 AND ulb_id = $2 AND ward_number = $3 AND switch_point_number = $4 AND is_deleted IS NOT TRUE 
         LIMIT 1`,
        [projectId, targetUlbId, targetWard, targetSpNum]
      );

      if (spCheck.rows.length > 0) {
        targetSpId = spCheck.rows[0].id;
      } else {
        const newSpRes = await query(
          `INSERT INTO switch_points 
            (project_id, ulb_id, ward_number, switch_point_number, switch_point_type, status, created_by)
           VALUES ($1, $2, $3, $4, 'DP', 'PENDING', $5) 
           RETURNING id`,
          [projectId, targetUlbId, targetWard, targetSpNum, req.user.id]
        );
        targetSpId = newSpRes.rows[0].id;
      }
      data.switch_point_id = targetSpId;
    }

    if (targetSpId && (data.switch_point_type || data.meter_exists !== undefined || data.meter_type || data.meter_rr_number || data.meter_serial_number || data.meter_condition)) {
      await updateSwitchPoint(targetSpId, projectId, data);
    }
    
    const updated = await updatePole(id, projectId, data);
    res.json({ pole: updated });
  } catch (error) {
    next(error);
  }
}

async function confirmSwitchPointHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { projectId } = req.params;
    const userId = req.user.id;
    const confirmed = await confirmSwitchPoint(id, projectId, userId);
    res.json({ switchPoint: confirmed });
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
  getSwitchPointsHandler,
  getPolesHandler,
  validateMoveHandler,
  updateSwitchPointHandler,
  updatePoleHandler,
  confirmSwitchPointHandler,
  confirmPoleHandler
};
