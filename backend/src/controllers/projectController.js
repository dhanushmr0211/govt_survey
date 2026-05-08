const { z } = require('zod');

const projectService = require('../services/projectService');
const { accessibleProjectIds } = require('../middleware/projectAccess');
const { parsePagination, paginationMeta } = require('../utils/pagination');

const projectSchema = z.object({
  name: z.string().trim().min(1).max(255),
  project_type: z.enum(['POLE_SURVEY', 'METER_SURVEY', 'PIPELINE_SURVEY']).optional().default('POLE_SURVEY'),
});

async function listProjects(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const projectIds = await accessibleProjectIds(Number(req.user.sub), req.user.role);
    
    let result;
    if (projectIds === null) {
      result = await projectService.listProjects(limit, offset);
    } else {
      result = await projectService.listProjectsByIds(projectIds, limit, offset);
    }
    
    return res.json({
      projects: result.projects,
      pagination: paginationMeta(page, limit, result.total),
    });
  } catch (error) {
    return next(error);
  }
}

async function createProject(req, res, next) {
  try {
    const data = projectSchema.parse(req.body);
    const userId = Number(req.user.sub);
    const project = await projectService.createProject(data.name, data.project_type, userId);
    
    // Auto-assign the creator to the project as an ADMIN (or their current role)
    const projectUserModel = require('../models/projectUserModel');
    await projectUserModel.addUserToProject(userId, project.id, req.user.role);

    return res.status(201).json({ project });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listProjects, createProject };