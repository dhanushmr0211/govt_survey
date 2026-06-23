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

    console.log(`\n[listProjects] === START === UserId: ${userId}, Role: ${userRole}`);

    if (isNaN(userId)) {
      console.error('[listProjects] Invalid userId');
      return res.status(401).json({ message: 'Invalid user session' });
    }

    let projects = [];
    let total = 0;

    if (userRole === ROLES.MASTER_ADMIN) {
      console.log('[listProjects] User is MASTER_ADMIN, fetching all projects');
      const result = await projectService.listProjects(limit, offset);
      projects = result.projects.map(p => ({
        ...p,
        project_role: ROLES.MASTER_ADMIN,
        section_a: true, section_b: true, section_c: true, section_d: true,
        section_e: true, section_f: true, section_g: true, section_h: true,
        section_i: true, section_j: true, section_k: true
      }));
      total = result.total;
      console.log(`[listProjects] MASTER_ADMIN found ${projects.length} projects`);
    } else {
      console.log(`[listProjects] User is ${userRole}, fetching assigned projects from project_users`);
      const allProjects = await projectUserModel.getProjectsWithRoles(userId);
      projects = allProjects.filter(p => !p.is_blocked);
      console.log(`[listProjects] Query returned ${projects.length} active projects for user ${userId} (out of ${allProjects.length} total)`);
      if (projects.length > 0) {
        console.log('[listProjects] Project data:', JSON.stringify(projects, null, 2));
      }
      total = projects.length;
    }
    
    console.log(`[listProjects] === END === Returning ${projects.length} projects, Role: ${userRole}`);
    return res.json({
      projects,
      pagination: paginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error('[listProjects] ERROR:', error);
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