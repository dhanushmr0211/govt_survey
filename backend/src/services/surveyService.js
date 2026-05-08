const surveyModel = require('../models/surveyModel');

async function listSurveys(limit, offset) {
  const [surveys, total] = await Promise.all([
    surveyModel.findAllSurveys(limit, offset),
    surveyModel.countAll(),
  ]);
  return { surveys, total };
}

async function listSurveysForProjects(projectIds, limit, offset) {
  const [surveys, total] = await Promise.all([
    surveyModel.findByProjectIds(projectIds, limit, offset),
    surveyModel.countByProjectIds(projectIds),
  ]);
  return { surveys, total };
}

async function createSurvey(data) {
  return surveyModel.createSurveyRecord(data);
}

async function confirmSurvey(id, confirmedBy) {
  return surveyModel.confirmSurveyRecord(id, confirmedBy);
}

module.exports = { listSurveys, listSurveysForProjects, createSurvey, confirmSurvey };