const issueModel = require('../models/issueModel');
const surveyModel = require('../models/surveyModel');
const { SURVEY_STATUS } = require('../constants/status');

async function listIssues(limit, offset) {
  const [issues, total] = await Promise.all([
    issueModel.findAllIssues(limit, offset),
    issueModel.countAll(),
  ]);
  return { issues, total };
}

async function listIssuesForProjects(projectIds, limit, offset) {
  const [issues, total] = await Promise.all([
    issueModel.findByProjectIds(projectIds, limit, offset),
    issueModel.countByProjectIds(projectIds),
  ]);
  return { issues, total };
}

async function createIssue(data, raisedBy) {
  const issue = await issueModel.createIssueRecord(data, raisedBy);
  await surveyModel.updateStatus(data.record_id, SURVEY_STATUS.ISSUE_OPEN);
  return issue;
}

async function resolveIssue(id, resolvedBy) {
  const issue = await issueModel.resolveIssueRecord(id, resolvedBy);
  if (issue) {
    await surveyModel.updateStatus(issue.record_id, SURVEY_STATUS.ISSUE_RESOLVED);
  }
  return issue;
}

module.exports = { listIssues, listIssuesForProjects, createIssue, resolveIssue };