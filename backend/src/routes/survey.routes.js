const express = require('express');

const { authenticate } = require('../middleware/auth');
const { searchUlbsHandler, createSwitchPointHandler, createPoleHandler } = require('../controllers/surveyDataController');
const { uploadImage, getImagesByRecord, deleteImage } = require('../controllers/imageController');
const { upload } = require('../utils/upload');

const surveyRouter = express.Router();

surveyRouter.use(authenticate);

// ULB search
surveyRouter.get('/ulbs/search', searchUlbsHandler);

// Mobile Data Capture
surveyRouter.post('/switch-point', createSwitchPointHandler);
surveyRouter.post('/pole', createPoleHandler);

// Images
surveyRouter.post('/images', upload.single('image'), uploadImage);
surveyRouter.get('/images/:recordId', getImagesByRecord);
surveyRouter.delete('/images/:id', deleteImage);

module.exports = { surveyRouter };