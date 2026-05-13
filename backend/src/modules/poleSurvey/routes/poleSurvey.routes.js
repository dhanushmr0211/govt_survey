const express = require('express');
const { authenticate } = require('../../../middleware/auth');
const {
  getSwitchPointsHandler,
  getPolesHandler,
  updateSwitchPointHandler,
  updatePoleHandler,
  confirmSwitchPointHandler,
  confirmPoleHandler
} = require('../controllers/survey.controller');

const { 
  searchUlbsHandler, 
  createSwitchPointHandler, 
  createPoleHandler 
} = require('../../../controllers/surveyDataController');
const { uploadFileHandler, getFilesHandler } = require('../../../controllers/entityFileController');
const { upload } = require('../../../utils/upload');
const {
  getDistrictSummaryHandler,
  getWardSummaryHandler,
  getWardDetailsHandler,
  getPendingSubmissionsHandler,
  downloadReportHandler,
  getTodaySubmissionsHandler,
  getConfirmedSubmissionsHandler,
  getMyStatsHandler,
  getEmployeeTrackingHandler,
  getMobileUserTrackingHandler
} = require('../controllers/summary.controller');

const poleSurveyRouter = express.Router({ mergeParams: true });

poleSurveyRouter.use(authenticate);

poleSurveyRouter.get('/ulbs/search', searchUlbsHandler);

// Data Submission
poleSurveyRouter.post('/switch-point', createSwitchPointHandler);
poleSurveyRouter.post('/pole', createPoleHandler);

// Queue / Inspection
poleSurveyRouter.get('/switch-points', getSwitchPointsHandler);
poleSurveyRouter.get('/poles', getPolesHandler);

poleSurveyRouter.patch('/switch-points/:id', updateSwitchPointHandler);
poleSurveyRouter.patch('/poles/:id', updatePoleHandler);

poleSurveyRouter.post('/switch-points/:id/confirm', confirmSwitchPointHandler);
poleSurveyRouter.post('/poles/:id/confirm', confirmPoleHandler);

// Reports / Summary
poleSurveyRouter.get('/my-stats', getMyStatsHandler);
poleSurveyRouter.get('/employee-tracking', getEmployeeTrackingHandler);
poleSurveyRouter.get('/mobile-user-tracking', getMobileUserTrackingHandler);
poleSurveyRouter.get('/report/download', downloadReportHandler);
poleSurveyRouter.get('/summary/districts', getDistrictSummaryHandler);
poleSurveyRouter.get('/summary/ulbs/:ulbId/wards', getWardSummaryHandler);
poleSurveyRouter.get('/summary/ulbs/:ulbId/wards/:wardNumber/details', getWardDetailsHandler);
poleSurveyRouter.get('/queue/pending', getPendingSubmissionsHandler);
poleSurveyRouter.get('/queue/confirmed', getConfirmedSubmissionsHandler);
poleSurveyRouter.get('/queue/today', getTodaySubmissionsHandler);

// Files
poleSurveyRouter.post('/files', upload.single('file'), uploadFileHandler);
poleSurveyRouter.get('/files', getFilesHandler);

module.exports = { poleSurveyRouter };
