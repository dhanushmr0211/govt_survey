const express = require('express');

const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const { listProjects, getProjectStructure } = require('../controllers/projectController');
const { ROLES } = require('../constants/roles');

const projectRouter = express.Router();

projectRouter.use(authenticate);

projectRouter.get('/', listProjects);
projectRouter.get('/:projectId/structure', requireRole(ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.EMPLOYEE), getProjectStructure);

module.exports = { projectRouter };