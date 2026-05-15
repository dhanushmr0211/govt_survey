const { z } = require('zod');

const projectService = require('../services/projectService');
const { accessibleProjectIds } = require('../middleware/projectAccess');
const { parsePagination, paginationMeta } = require('../utils/pagination');



async function listProjects(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const projectIds = await accessibleProjectIds(Number(req.user.sub), req.user.role);
    console.log('accessibleProjectIds for user', req.user.sub, ':', projectIds);
    
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

module.exports = { listProjects };