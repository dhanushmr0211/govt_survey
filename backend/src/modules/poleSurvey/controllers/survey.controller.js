const { getSwitchPointsByWard, updateSwitchPoint, confirmSwitchPoint } = require('../models/switchPoint.model');
const { getPoles, updatePole, confirmPole } = require('../models/pole.model');

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

async function updateSwitchPointHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { projectId } = req.params;
    const data = req.body;
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
    
    // If switch point fields are present, update switch point first
    if (data.switch_point_id && (data.switch_point_type || data.meter_exists !== undefined || data.meter_type || data.meter_rr_number || data.meter_serial_number || data.meter_condition)) {
      await updateSwitchPoint(data.switch_point_id, projectId, data);
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
  updateSwitchPointHandler,
  updatePoleHandler,
  confirmSwitchPointHandler,
  confirmPoleHandler
};
