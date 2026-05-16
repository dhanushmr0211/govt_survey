const projectUserModel = require('../models/projectUserModel');
const { ROLES, normalizeRole } = require('../constants/roles');

function requireRole(...roles) {
  const allowedRoles = roles.map(normalizeRole);

  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not authenticated' });
    }

    // MASTER_ADMIN bypasses all role checks
    if (req.user.role === ROLES.MASTER_ADMIN) {
      return next();
    }

    const { projectId: rawProjectId } = req.params;
    let projectId = null;

    if (rawProjectId) {
      projectId = parseInt(rawProjectId, 10);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID format' });
      }
    }

    if (projectId) {
      // Check project-specific role
      const membership = await projectUserModel.isMember(req.user.id, projectId);
      if (!membership || !allowedRoles.includes(normalizeRole(membership.project_role))) {
        return res.status(403).json({ message: 'Forbidden: Insufficient project permissions' });
      }
      
      // Attach project-specific permissions to req for controller use if needed
      req.projectRole = normalizeRole(membership.project_role);
      req.projectSections = {
        section_a: membership.section_a,
        section_b: membership.section_b,
        section_c: membership.section_c,
        section_d: membership.section_d,
        section_e: membership.section_e,
        section_f: membership.section_f,
        section_g: membership.section_g,
        section_h: membership.section_h
      };
    } else {
      // Fallback to global role for non-project routes
      if (!allowedRoles.includes(normalizeRole(req.user.role))) {
        return res.status(403).json({ message: 'Forbidden: Insufficient global permissions' });
      }
    }

    return next();
  };
}

function requireProjectMember() {
  return requireRole(ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.CLIENT, ROLES.MOBILE_USER);
}

module.exports = { requireRole, requireProjectMember };
