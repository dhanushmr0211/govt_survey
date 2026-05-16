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

    // Try to find projectId in params, query, or body
    const { projectId: paramPid } = req.params;
    const { projectId: queryPid } = req.query;
    const { projectId: bodyPid } = req.body;
    
    const rawProjectId = paramPid || queryPid || bodyPid;
    let projectId = null;

    if (rawProjectId) {
      projectId = parseInt(rawProjectId, 10);
    }

    // [DEBUG LOG] Let's see what's happening
    console.log(`[RoleGuard DEBUG] User: ${req.user.id}, Role: ${req.user.role}, ProjectID: ${projectId}, Params: ${JSON.stringify(req.params)}`);

    if (projectId && !isNaN(projectId)) {
      // Check project-specific role
      const membership = await projectUserModel.isMember(req.user.id, projectId);
      
      if (!membership) {
        console.warn(`[RoleGuard] Access denied: User ${req.user.id} is not a member of project ${projectId}`);
        return res.status(403).json({ message: 'Forbidden: You are not a member of this project' });
      }

      const userProjectRole = normalizeRole(membership.project_role);
      if (!allowedRoles.includes(userProjectRole)) {
        console.warn(`[RoleGuard] Access denied: User ${req.user.id} has role ${userProjectRole} in project ${projectId}, but needs one of: ${allowedRoles.join(', ')}`);
        return res.status(403).json({ message: 'Forbidden: Insufficient project permissions' });
      }
      
      // Attach project-specific permissions to req for controller use if needed
      req.projectRole = userProjectRole;
      req.projectSections = {
        section_a: membership.section_a,
        section_b: membership.section_b,
        section_c: membership.section_c,
        section_d: membership.section_d,
        section_e: membership.section_e,
        section_f: membership.section_f,
        section_g: membership.section_g,
        section_h: membership.section_h,
        district_scope: membership.district_scope,
        ulb_scope: membership.ulb_scope
      };
    } else {
      // Fallback to global role for non-project routes or if ID missing
      if (!allowedRoles.includes(normalizeRole(req.user.role))) {
        console.warn(`[RoleGuard] Global access denied: User ${req.user.id} with role ${req.user.role} tried to access a project route without a valid projectId, or global role is insufficient.`);
        return res.status(403).json({ message: 'Forbidden: Project ID missing or insufficient permissions' });
      }
    }

    return next();
  };
}

function requireProjectMember() {
  return requireRole(ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.CLIENT, ROLES.MOBILE_USER);
}

module.exports = { requireRole, requireProjectMember };
