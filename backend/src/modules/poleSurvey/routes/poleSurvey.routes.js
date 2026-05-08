const express = require('express');
const { authenticate } = require('../../../middleware/auth');
const {
  searchUlbsHandler,
  createSwitchPointHandler,
  createPoleHandler,
  getSwitchPointsHandler,
  getPolesHandler,
  updateSwitchPointHandler,
  updatePoleHandler,
  confirmSwitchPointHandler,
  confirmPoleHandler
} = require('../controllers/survey.controller');
const { uploadFileHandler, getFilesHandler } = require('../../../controllers/entityFileController');
const { upload } = require('../../../utils/upload');

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

// Files
poleSurveyRouter.post('/files', upload.single('file'), uploadFileHandler);
poleSurveyRouter.get('/files', getFilesHandler);

module.exports = { poleSurveyRouter };
