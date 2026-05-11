const { getDistrictSummary, getWardSummary, getWardDetails, getPendingSubmissions, getTodaySubmissions, getConfirmedSubmissions, getMyStats, getEmployeeTracking, getMobileUserTracking } = require('../models/summary.model');
const { canAccessProject } = require('../../../middleware/projectAccess');

async function getDistrictSummaryHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { date, mode } = req.query;
    
    const allowedProject = await canAccessProject(Number(req.user.sub), req.user.role, Number(projectId));
    if (!allowedProject) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this project' });
    }
    
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
    
    const allowedProject = await canAccessProject(Number(req.user.sub), req.user.role, Number(projectId));
    if (!allowedProject) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this project' });
    }
    
    const user = req.user;
    const isMasterAdmin = user.role === 'MASTER_ADMIN';
    const hasSectionC = user.section_c;

    if (!isMasterAdmin && !hasSectionC) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access this section' });
    }

    const { page = 1, limit = 50, userId } = req.query;
    const { rows, total } = await getPendingSubmissions(Number(projectId), Number(page), Number(limit), userId ? Number(userId) : null);
    res.json({ queue: rows, total });
  } catch (error) { next(error); }
}

async function getTodaySubmissionsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    
    const allowedProject = await canAccessProject(Number(req.user.sub), req.user.role, Number(projectId));
    if (!allowedProject) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this project' });
    }
    
    const user = req.user;
    const isMasterAdmin = user.role === 'MASTER_ADMIN';
    const hasSectionB = user.section_b;
    const hasSectionC = user.section_c;

    if (!isMasterAdmin && !hasSectionB && !hasSectionC) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access this section' });
    }

    const { page = 1, limit = 50 } = req.query;
    const { rows, total } = await getTodaySubmissions(Number(projectId), Number(page), Number(limit));
    res.json({ queue: rows, total });
  } catch (error) { next(error); }
}

async function getConfirmedSubmissionsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    
    const allowedProject = await canAccessProject(Number(req.user.sub), req.user.role, Number(projectId));
    if (!allowedProject) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this project' });
    }
    
    const user = req.user;
    const isMasterAdmin = user.role === 'MASTER_ADMIN';
    const hasSectionC = user.section_c;

    if (!isMasterAdmin && !hasSectionC) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access this section' });
    }

    const { page = 1, limit = 50, userId, confirmedBy } = req.query;
    const { rows, total } = await getConfirmedSubmissions(Number(projectId), Number(page), Number(limit), userId ? Number(userId) : null, confirmedBy ? Number(confirmedBy) : null);
    res.json({ queue: rows, total });
  } catch (error) { next(error); }
}

async function getMyStatsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const userId = req.user.sub;
    
    const stats = await getMyStats(Number(projectId), Number(userId));
    res.json({ stats });
  } catch (error) { next(error); }
}

async function getEmployeeTrackingHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    
    const allowedProject = await canAccessProject(Number(req.user.sub), req.user.role, Number(projectId));
    if (!allowedProject) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this project' });
    }
    
    const user = req.user;
    const isMasterAdmin = user.role === 'MASTER_ADMIN';
    
    if (!isMasterAdmin && !user.section_e) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to employee tracking' });
    }

    const tracking = await getEmployeeTracking(Number(projectId));
    res.json({ tracking });
  } catch (error) { next(error); }
}

async function getMobileUserTrackingHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    
    const allowedProject = await canAccessProject(Number(req.user.sub), req.user.role, Number(projectId));
    if (!allowedProject) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this project' });
    }
    
    const user = req.user;
    const isMasterAdmin = user.role === 'MASTER_ADMIN';
    
    if (!isMasterAdmin && !user.section_f) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to mobile user tracking' });
    }

    const tracking = await getMobileUserTracking(Number(projectId));
    res.json({ tracking });
  } catch (error) { next(error); }
}

module.exports = { getDistrictSummaryHandler, getWardSummaryHandler, getWardDetailsHandler, getPendingSubmissionsHandler, getTodaySubmissionsHandler, getConfirmedSubmissionsHandler, getMyStatsHandler, getEmployeeTrackingHandler, getMobileUserTrackingHandler };
