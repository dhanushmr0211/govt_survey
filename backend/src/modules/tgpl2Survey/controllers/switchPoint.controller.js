const { createSwitchPoint, getSwitchPointsByCcms, getLastSwitchPointByCcms } = require('../models/switchPoint.model');

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

module.exports = {
  createSwitchPointHandler,
  getSwitchPointsHandler,
  getLastSwitchPointHandler
};
