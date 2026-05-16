const projectService = require('../services/projectService');
const projectUserModel = require('../models/projectUserModel');
const districtUlbModel = require('../models/districtUlbModel');
const { ROLES } = require('../constants/roles');
const { parsePagination, paginationMeta } = require('../utils/pagination');

async function listProjects(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const userId = Number(req.user.sub);
    const userRole = req.user.role;

    if (isNaN(userId)) {
      return res.status(401).json({ message: 'Invalid user session' });
    }

    let projects = [];
    let total = 0;

    if (userRole === ROLES.MASTER_ADMIN) {
      const result = await projectService.listProjects(limit, offset);
      projects = result.projects.map(p => ({
        ...p,
        project_role: ROLES.MASTER_ADMIN,
        section_a: true, section_b: true, section_c: true, section_d: true,
        section_e: true, section_f: true, section_g: true, section_h: true,
        section_i: true
      }));
      total = result.total;
    } else {
      // For MEMBER role, fetch only assigned projects with their roles
      projects = await projectUserModel.getProjectsWithRoles(userId);
      console.log(`[DEBUG] Projects for user ${userId}:`, JSON.stringify(projects));
      total = projects.length; // Simplified for now since project list is usually small
    }
    
    console.log(`[DEBUG] Final Response projects:`, Array.isArray(projects), projects.length);
    console.log(`[listProjects DEBUG] User: ${userId}, Role: ${userRole}, Projects Found: ${projects.length}`);
    return res.json({
      projects,
      pagination: paginationMeta(page, limit, total),
    });
  } catch (error) {
    return next(error);
  }
}

async function getProjectStructure(req, res, next) {
  try {
    const { projectId } = req.params;
    const structure = await districtUlbModel.getProjectStructure(Number(projectId));
    return res.json(structure);
  } catch (error) {
    return next(error);
  }
}

module.exports = { listProjects, getProjectStructure };