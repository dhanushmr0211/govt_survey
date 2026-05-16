const { z } = require('zod');

const projectService = require('../services/projectService');
const projectUserModel = require('../models/projectUserModel');
const { ROLES } = require('../constants/roles');
const { parsePagination, paginationMeta } = require('../utils/pagination');

async function listProjects(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const userId = Number(req.user.sub);
    const userRole = req.user.role;

    let projects = [];
    let total = 0;

    if (userRole === ROLES.MASTER_ADMIN) {
      const result = await projectService.listProjects(limit, offset);
      projects = result.projects.map(p => ({
        ...p,
        project_role: ROLES.MASTER_ADMIN,
        section_a: true, section_b: true, section_c: true, section_d: true,
        section_e: true, section_f: true, section_g: true, section_h: true
      }));
      total = result.total;
    } else {
      // For MEMBER role, fetch only assigned projects with their roles
      projects = await projectUserModel.getProjectsWithRoles(userId);
      total = projects.length; // Simplified for now since project list is usually small
    }
    
    return res.json({
      projects,
      pagination: paginationMeta(page, limit, total),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listProjects };