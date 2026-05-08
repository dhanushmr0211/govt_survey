const { searchUlbs } = require('../models/location.model');
const { createSwitchPoint, getSwitchPoints, updateSwitchPoint, confirmSwitchPoint, getSwitchPointsByWard } = require('../models/switchPoint.model');
const { createPole, getPoles, updatePole, confirmPole } = require('../models/pole.model');
const { parsePagination, paginationMeta } = require('../../../utils/pagination');

async function searchUlbsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { q } = req.query;
    if (!projectId || !q) return res.status(400).json({ error: 'Project ID and search term are required' });
    const ulbs = await searchUlbs(projectId, q);
    res.json({ ulbs });
  } catch (error) { next(error); }
}

async function createSwitchPointHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const data = req.body;
    const createdBy = Number(req.user.sub);
    const newSwitchPoint = await createSwitchPoint(projectId, data, createdBy);
    res.status(201).json({ switchPoint: newSwitchPoint });
  } catch (error) { next(error); }
}

async function createPoleHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const data = req.body;
    const createdBy = Number(req.user.sub);
    if (!data.switch_point_id) return res.status(400).json({ error: 'switch_point_id is required' });
    const newPole = await createPole(projectId, data, createdBy);
    res.status(201).json({ pole: newPole });
  } catch (error) { next(error); }
}

async function getSwitchPointsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { status = 'PENDING', ward_number } = req.query;
    const { page, limit, offset } = parsePagination(req.query);
    
    let switchPoints;
    if (ward_number) {
      switchPoints = await getSwitchPointsByWard(Number(projectId), ward_number);
    } else {
      switchPoints = await getSwitchPoints(Number(projectId), status, limit, offset);
    }
    
    res.json({ switchPoints, pagination: paginationMeta(page, limit, switchPoints.length) });
  } catch (error) { next(error); }
}

async function getPolesHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { status = 'PENDING' } = req.query;
    const { page, limit, offset } = parsePagination(req.query);
    const poles = await getPoles(Number(projectId), status, limit, offset);
    res.json({ poles, pagination: paginationMeta(page, limit, poles.length) });
  } catch (error) { next(error); }
}

async function updateSwitchPointHandler(req, res, next) {
  try {
    const { projectId, id } = req.params;
    const data = req.body;
    const updated = await updateSwitchPoint(Number(id), Number(projectId), data);
    if (!updated) return res.status(404).json({ error: 'Switch point not found' });
    res.json({ switchPoint: updated });
  } catch (error) { next(error); }
}

async function updatePoleHandler(req, res, next) {
  try {
    const { projectId, id } = req.params;
    const data = req.body;
    const updated = await updatePole(Number(id), Number(projectId), data);
    if (!updated) return res.status(404).json({ error: 'Pole not found' });
    res.json({ pole: updated });
  } catch (error) { next(error); }
}

async function confirmSwitchPointHandler(req, res, next) {
  try {
    const { projectId, id } = req.params;
    const userId = Number(req.user.sub);
    const updated = await confirmSwitchPoint(Number(id), Number(projectId), userId);
    if (!updated) return res.status(404).json({ error: 'Switch point not found' });
    res.json({ switchPoint: updated });
  } catch (error) { next(error); }
}

async function confirmPoleHandler(req, res, next) {
  try {
    const { projectId, id } = req.params;
    const userId = Number(req.user.sub);
    const updated = await confirmPole(Number(id), Number(projectId), userId);
    if (!updated) return res.status(404).json({ error: 'Pole not found' });
    res.json({ pole: updated });
  } catch (error) { next(error); }
}

module.exports = {
  searchUlbsHandler,
  createSwitchPointHandler,
  createPoleHandler,
  getSwitchPointsHandler,
  getPolesHandler,
  updateSwitchPointHandler,
  updatePoleHandler,
  confirmSwitchPointHandler,
  confirmPoleHandler
};
