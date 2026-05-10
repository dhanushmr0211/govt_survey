const { getDistrictSummary, getWardSummary, getWardDetails, getPendingSubmissions, getTodaySubmissions } = require('../models/summary.model');

async function getDistrictSummaryHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { date, mode } = req.query; // Optional date and mode
    const summary = await getDistrictSummary(Number(projectId), date, mode);
    res.json({ summary });
  } catch (error) { next(error); }
}

async function getWardSummaryHandler(req, res, next) {
  try {
    const { ulbId } = req.params;
    const { date, mode } = req.query; // Optional date and mode
    const summary = await getWardSummary(Number(ulbId), date, mode);
    res.json({ summary });
  } catch (error) { next(error); }
}

async function getWardDetailsHandler(req, res, next) {
  try {
    const { ulbId, wardNumber } = req.params;
    const details = await getWardDetails(Number(ulbId), wardNumber);
    res.json({ details });
  } catch (error) { next(error); }
}

async function getPendingSubmissionsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const queue = await getPendingSubmissions(Number(projectId));
    res.json({ queue });
  } catch (error) { next(error); }
}

async function getTodaySubmissionsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const queue = await getTodaySubmissions(Number(projectId));
    res.json({ queue });
  } catch (error) { next(error); }
}

module.exports = { getDistrictSummaryHandler, getWardSummaryHandler, getWardDetailsHandler, getPendingSubmissionsHandler, getTodaySubmissionsHandler };
