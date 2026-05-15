const { ROLES } = require('../constants/roles');
const projectUserModel = require('../models/projectUserModel');
const { TTLCache } = require('../utils/cache');

// Cache project-access lookups for 5 minutes.
// This avoids a DB round-trip on every single authenticated request.
const projectAccessCache = new TTLCache({ ttlMs: 5 * 60 * 1000, maxSize: 5000 });

/**
 * Build a cache key for a user's accessible project IDs.
 */
function cacheKey(userId, role) {
  return `pids:${role}:${userId}`;
}

/**
 * Check whether the authenticated user has access to a specific project.
 *
 * Rules:
 *   MASTER_ADMIN → always allowed (system-wide access)
 *   CLIENT       → allowed if they are assigned to the project via project_users
 *   ADMIN        → allowed if they are assigned to manage the project via project_users
 *   EMPLOYEE     → allowed if they are in project_users for this project
 *   MOBILE_USER  → allowed if they are in project_users for this project
 *
 * @param {number} userId   - The authenticated user's ID (from req.user.sub)
 * @param {string} role     - The authenticated user's normalised role
 * @param {number} projectId
 * @returns {Promise<boolean>}
 */
async function canAccessProject(userId, role, projectId) {
  if (role === ROLES.MASTER_ADMIN) {
    return true;
  }

  // Use the cached project-ID list when available
  const ids = await accessibleProjectIds(userId, role);
  if (ids === null) return true; // unrestricted
  return ids.includes(Number(projectId));
}

/**
 * Return the list of project IDs the user is allowed to see.
 * Results are cached for 5 minutes to avoid repeated DB lookups.
 *
 * MASTER_ADMIN → null  (means "all projects", the caller should skip filtering)
 * CLIENT       → array of project IDs from the projects table (client_id)
 * Others       → array of project IDs from project_users
 */
async function accessibleProjectIds(userId, role) {
  if (role === ROLES.MASTER_ADMIN) {
    return null; // null signals "no restriction"
  }

  const key = cacheKey(userId, role);
  const cached = projectAccessCache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const ids = await projectUserModel.getProjectIds(userId);
  
  projectAccessCache.set(key, ids);
  return ids;
}

/**
 * Invalidate cached project access for a specific user.
 * Call this whenever project_users or project.client_id changes.
 */
function invalidateProjectAccess(userId) {
  projectAccessCache.delBy((key) => key.endsWith(`:${userId}`));
}

/**
 * Flush the entire project-access cache.
 * Useful after bulk operations.
 */
function invalidateAllProjectAccess() {
  projectAccessCache.clear();
}

module.exports = { canAccessProject, accessibleProjectIds, invalidateProjectAccess, invalidateAllProjectAccess };
