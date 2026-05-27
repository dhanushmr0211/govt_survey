const express = require('express');
const { authenticate } = require('../../../middleware/auth');
const { requireRole } = require('../../../middleware/roleGuard');
const { ROLES } = require('../../../constants/roles');
const {
  getPolesHandler,
  updatePoleHandler,
  confirmPoleHandler
} = require('../controllers/survey.controller');

const { 
  searchUlbsHandler, 
  createPoleHandler 
} = require('../../../controllers/surveyDataController');
const { uploadFileHandler, getFilesHandler, deleteFileHandler } = require('../../../controllers/entityFileController');
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

const tgplSurveyRouter = express.Router({ mergeParams: true });

tgplSurveyRouter.use(authenticate);

tgplSurveyRouter.get('/ulbs/search', searchUlbsHandler);

// Data Submission (TGPL only has poles)
tgplSurveyRouter.post('/pole', createPoleHandler);

// Queue / Inspection
tgplSurveyRouter.get('/poles', getPolesHandler);
tgplSurveyRouter.patch('/poles/:id', updatePoleHandler);
tgplSurveyRouter.post('/poles/:id/confirm', requireRole(ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.CLIENT), confirmPoleHandler);

// Reports / Summary
tgplSurveyRouter.get('/my-stats', getMyStatsHandler);
tgplSurveyRouter.get('/employee-tracking', getEmployeeTrackingHandler);
tgplSurveyRouter.get('/mobile-user-tracking', getMobileUserTrackingHandler);
tgplSurveyRouter.get('/report/download', downloadReportHandler);
tgplSurveyRouter.get('/summary/districts', getDistrictSummaryHandler);
tgplSurveyRouter.get('/summary/ulbs/:ulbId/wards', getWardSummaryHandler);
tgplSurveyRouter.get('/summary/ulbs/:ulbId/wards/:wardNumber/details', getWardDetailsHandler);
tgplSurveyRouter.get('/queue/pending', getPendingSubmissionsHandler);
tgplSurveyRouter.get('/queue/confirmed', getConfirmedSubmissionsHandler);
tgplSurveyRouter.get('/queue/today', getTodaySubmissionsHandler);

// Files
tgplSurveyRouter.post('/files', upload.single('file'), uploadFileHandler);
tgplSurveyRouter.get('/files', getFilesHandler);
tgplSurveyRouter.delete('/files/:id', deleteFileHandler);

module.exports = { tgplSurveyRouter };
