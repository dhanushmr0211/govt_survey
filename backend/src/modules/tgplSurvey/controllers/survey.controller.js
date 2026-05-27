const { getPoles, updatePole, confirmPole } = require('../models/pole.model');

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
  updatePoleHandler,
  confirmPoleHandler
};
