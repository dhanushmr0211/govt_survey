const express = require('express');
const { authenticate } = require('../../../middleware/auth');
const { requireRole } = require('../../../middleware/roleGuard');
const { ROLES } = require('../../../constants/roles');

const {
  createCcmsHandler,
  getCcmsHandler,
  getLastCcmsHandler,
  confirmCcmsHandler,
  updateCcmsHandler,
  deleteCcmsHandler
} = require('../controllers/ccms.controller');

const {
  createSwitchPointHandler,
  getSwitchPointsHandler,
  getLastSwitchPointHandler,
  confirmSwitchPointHandler,
  updateSwitchPointHandler,
  deleteSwitchPointHandler
} = require('../controllers/switchPoint.controller');

const {
  createPoleHandler,
  getPolesHandler,
  updatePoleHandler,
  confirmPoleHandler,
  deletePoleHandler,
  validateMoveHandler
} = require('../controllers/pole.controller');

const {
  getWardsSummaryHandler,
  getWardDetailsHandler,
  getPendingSubmissionsHandler,
  getConfirmedSubmissionsHandler,
  getTodaySubmissionsHandler,
  getEmployeeTrackingHandler,
  getMobileUserTrackingHandler,
  getMyStatsHandler,
  downloadReportHandler
} = require('../controllers/summary.controller');

const { uploadFileHandler, getFilesHandler, deleteFileHandler } = require('../../../controllers/entityFileController');
const { upload } = require('../../../utils/upload');

const tgpl2SurveyRouter = express.Router({ mergeParams: true });

tgpl2SurveyRouter.use(authenticate);

// Wards / CCMS
tgpl2SurveyRouter.get('/wards', async (req, res, next) => {
  try {
    const { query } = require('../../../config/db');
    const result = await query(`SELECT * FROM tgpl2_wards WHERE project_id = $1 AND is_deleted IS NOT TRUE ORDER BY name ASC`, [Number(req.params.projectId)]);
    res.json({ ulbs: result.rows }); // Returned as "ulbs" for frontend compatibility
  } catch (error) {
    next(error);
  }
});
tgpl2SurveyRouter.post('/ccms', createCcmsHandler);
tgpl2SurveyRouter.get('/ccms', getCcmsHandler);
tgpl2SurveyRouter.get('/ccms/last', getLastCcmsHandler);
tgpl2SurveyRouter.post('/ccms/:id/confirm', requireRole(ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.CLIENT), confirmCcmsHandler);
tgpl2SurveyRouter.patch('/ccms/:id', updateCcmsHandler);
tgpl2SurveyRouter.delete('/ccms/:id', deleteCcmsHandler);

// Switch Points
tgpl2SurveyRouter.post('/switch-points', createSwitchPointHandler);
tgpl2SurveyRouter.get('/switch-points', getSwitchPointsHandler);
tgpl2SurveyRouter.get('/switch-points/last', getLastSwitchPointHandler);
tgpl2SurveyRouter.post('/switch-points/:id/confirm', requireRole(ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.CLIENT), confirmSwitchPointHandler);
tgpl2SurveyRouter.patch('/switch-points/:id', updateSwitchPointHandler);
tgpl2SurveyRouter.delete('/switch-points/:id', deleteSwitchPointHandler);

// Poles
tgpl2SurveyRouter.post('/poles', createPoleHandler);
tgpl2SurveyRouter.get('/poles', getPolesHandler);
tgpl2SurveyRouter.patch('/poles/:id', updatePoleHandler);
tgpl2SurveyRouter.post('/poles/:id/confirm', requireRole(ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.CLIENT), confirmPoleHandler);
tgpl2SurveyRouter.delete('/poles/:id', deletePoleHandler);
tgpl2SurveyRouter.post('/validate-move', validateMoveHandler);

// Files
tgpl2SurveyRouter.post('/files', upload.single('file'), uploadFileHandler);
tgpl2SurveyRouter.get('/files', getFilesHandler);
tgpl2SurveyRouter.delete('/files/:id', deleteFileHandler);

// Tracking / Queues
tgpl2SurveyRouter.get('/my-stats', getMyStatsHandler);
tgpl2SurveyRouter.get('/employee-tracking', getEmployeeTrackingHandler);
tgpl2SurveyRouter.get('/mobile-user-tracking', getMobileUserTrackingHandler);
tgpl2SurveyRouter.get('/queue/pending', getPendingSubmissionsHandler);
tgpl2SurveyRouter.get('/queue/confirmed', getConfirmedSubmissionsHandler);
tgpl2SurveyRouter.get('/queue/today', getTodaySubmissionsHandler);
tgpl2SurveyRouter.get('/summary/wards', getWardsSummaryHandler);
tgpl2SurveyRouter.get('/summary/wards/:wardId/details', getWardDetailsHandler);
tgpl2SurveyRouter.get('/report/download', downloadReportHandler);

module.exports = { tgpl2SurveyRouter };
