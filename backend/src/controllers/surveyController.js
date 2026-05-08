const { z } = require('zod');

const surveyService = require('../services/surveyService');
const surveyModel = require('../models/surveyModel');
const { SURVEY_STATUS } = require('../constants/status');
const { accessibleProjectIds, canAccessProject } = require('../middleware/projectAccess');
const { parsePagination, paginationMeta } = require('../utils/pagination');

const surveySchema = z.object({
  project_id: z.number().int().positive(),
  mobile_user_id: z.number().int().positive().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  pole_number: z.string().trim().max(255).nullable().optional(),
  ward_number: z.string().trim().max(255).nullable().optional(),
  rr_number: z.string().trim().max(255).nullable().optional(),
  status: z.string().trim().max(100).optional().default(SURVEY_STATUS.PENDING),
});

async function listSurveys(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const projectIds = await accessibleProjectIds(Number(req.user.sub), req.user.role);
    
    let result;
    if (projectIds === null) {
      result = await surveyService.listSurveys(limit, offset);
    } else {
      result = await surveyService.listSurveysForProjects(projectIds, limit, offset);
    }
    
    return res.json({
      surveys: result.surveys,
      pagination: paginationMeta(page, limit, result.total),
    });
  } catch (error) {
    return next(error);
  }
}

async function createSurvey(req, res, next) {
  try {
    const data = surveySchema.parse(req.body);
    
    const allowed = await canAccessProject(Number(req.user.sub), req.user.role, data.project_id);
    if (!allowed) {
      return res.status(403).json({ message: 'You do not have permission to create a survey in this project' });
    }

    const survey = await surveyService.createSurvey(data);
    return res.status(201).json({ survey });
  } catch (error) {
    return next(error);
  }
}

async function confirmSurvey(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid survey ID' });
    }

    const record = await surveyModel.findById(id);
    if (!record) {
      return res.status(404).json({ message: 'Survey record not found' });
    }

    const allowed = await canAccessProject(Number(req.user.sub), req.user.role, record.project_id);
    if (!allowed) {
      return res.status(403).json({ message: 'You do not have permission to confirm this survey' });
    }

    const confirmedSurvey = await surveyService.confirmSurvey(id, Number(req.user.sub));
    return res.json({ survey: confirmedSurvey });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listSurveys, createSurvey, confirmSurvey };