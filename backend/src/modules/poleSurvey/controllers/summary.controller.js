const { getDistrictSummary, getWardSummary, getWardDetails, getPendingSubmissions, getTodaySubmissions, getConfirmedSubmissions } = require('../models/summary.model');

async function getDistrictSummaryHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { date, mode } = req.query;
    
    const user = req.user;
    const isMasterAdmin = user.role === 'MASTER_ADMIN';
    const hasSectionA = user.section_a;
    const hasSectionB = user.section_b;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const isRequestForToday = date === todayStr;

    if (!isMasterAdmin && !hasSectionA) {
      if (hasSectionB && isRequestForToday) {
        // OK
      } else {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to access this section' });
      }
    }

    const summary = await getDistrictSummary(Number(projectId), date, mode);
    res.json({ summary });
  } catch (error) { next(error); }
}

async function getWardSummaryHandler(req, res, next) {
  try {
    const { ulbId } = req.params;
    const { date, mode } = req.query;
    
    const user = req.user;
    const isMasterAdmin = user.role === 'MASTER_ADMIN';
    const hasSectionA = user.section_a;
    const hasSectionB = user.section_b;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const isRequestForToday = date === todayStr;

    if (!isMasterAdmin && !hasSectionA) {
      if (hasSectionB && isRequestForToday) {
        // OK
      } else {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to access this section' });
      }
    }

    const summary = await getWardSummary(Number(ulbId), date, mode);
    res.json({ summary });
  } catch (error) { next(error); }
}

async function getWardDetailsHandler(req, res, next) {
  try {
    const { ulbId, wardNumber } = req.params;
    
    const user = req.user;
    const isMasterAdmin = user.role === 'MASTER_ADMIN';
    const hasSectionA = user.section_a;

    if (!isMasterAdmin && !hasSectionA) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access this section' });
    }

    const details = await getWardDetails(Number(ulbId), wardNumber);
    res.json({ details });
  } catch (error) { next(error); }
}

async function getPendingSubmissionsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    
    const user = req.user;
    const isMasterAdmin = user.role === 'MASTER_ADMIN';
    const hasSectionC = user.section_c;

    if (!isMasterAdmin && !hasSectionC) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access this section' });
    }

    const queue = await getPendingSubmissions(Number(projectId));
    res.json({ queue });
  } catch (error) { next(error); }
}

async function getTodaySubmissionsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    
    const user = req.user;
    const isMasterAdmin = user.role === 'MASTER_ADMIN';
    const hasSectionB = user.section_b;
    const hasSectionC = user.section_c;

    if (!isMasterAdmin && !hasSectionB && !hasSectionC) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access this section' });
    }

    const queue = await getTodaySubmissions(Number(projectId));
    res.json({ queue });
  } catch (error) { next(error); }
}

async function getConfirmedSubmissionsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    
    const user = req.user;
    const isMasterAdmin = user.role === 'MASTER_ADMIN';
    const hasSectionC = user.section_c;

    if (!isMasterAdmin && !hasSectionC) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access this section' });
    }

    const queue = await getConfirmedSubmissions(Number(projectId));
    res.json({ queue });
  } catch (error) { next(error); }
}

module.exports = { getDistrictSummaryHandler, getWardSummaryHandler, getWardDetailsHandler, getPendingSubmissionsHandler, getTodaySubmissionsHandler, getConfirmedSubmissionsHandler };
