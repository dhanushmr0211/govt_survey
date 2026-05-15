const express = require('express');

const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const { listProjects } = require('../controllers/projectController');
const { ROLES } = require('../constants/roles');

const projectRouter = express.Router();

projectRouter.use(authenticate);

projectRouter.get('/', requireRole(ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.CLIENT), listProjects);

module.exports = { projectRouter };