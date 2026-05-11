const { z } = require('zod');
const issueModel = require('../models/issueModel');
const { parsePagination, paginationMeta } = require('../utils/pagination');

const createIssueSchema = z.object({
  entity_type: z.string().min(1),
  entity_id: z.number().int().positive(),
  issue_note: z.string().trim().min(1).max(2000),
});

async function createIssueHandler(req, res, next) {
  try {
    const projectId = Number(req.params.projectId);
    const data = createIssueSchema.parse(req.body);
    const raisedBy = Number(req.user.sub);

    const issue = await issueModel.createIssue(
      projectId,
      data.entity_type,
      data.entity_id,
      raisedBy,
      data.issue_note
    );

    return res.status(201).json({ issue });
  } catch (error) {
    return next(error);
  }
}

async function getIssuesHandler(req, res, next) {
  try {
    const projectId = Number(req.params.projectId);
    const { page, limit, offset } = parsePagination(req.query);
    const { resolvedBy, status } = req.query;

    const issues = await issueModel.getIssuesByProject(projectId, limit, offset, resolvedBy ? Number(resolvedBy) : null, status || null);

    return res.json({
      issues,
      pagination: paginationMeta(page, limit, issues.length), // Assuming simplistic pagination for now
    });
  } catch (error) {
    return next(error);
  }
}

async function resolveIssueHandler(req, res, next) {
  try {
    const projectId = Number(req.params.projectId);
    const issueId = Number(req.params.id);
    const resolvedBy = Number(req.user.sub);

    const resolvedIssue = await issueModel.resolveIssue(issueId, projectId, resolvedBy);

    if (!resolvedIssue) {
      return res.status(400).json({ message: 'Issue not found, already resolved, or does not belong to project' });
    }

    return res.json({ issue: resolvedIssue });
  } catch (error) {
    return next(error);
  }
}

module.exports = { createIssueHandler, getIssuesHandler, resolveIssueHandler };