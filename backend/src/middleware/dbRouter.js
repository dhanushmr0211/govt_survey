const { pool, tgplPool, dbStorage } = require('../config/db');
const { TGPL_PROJECT_ID } = require('../constants/projects');

function dbRouter(req, res, next) {
  let projectId = req.headers['x-project-id'];

  if (!projectId && req.originalUrl) {
    const match = req.originalUrl.match(/\/projects\/(\d+)/);
    if (match) {
      projectId = match[1];
    }
  }

  // Default to master/default pool (govt_survey)
  let activePool = pool;

  if (projectId === TGPL_PROJECT_ID) {
    activePool = tgplPool;
  }

  // Run the rest of the request within the context of the active pool
  dbStorage.run(activePool, () => {
    next();
  });
}

module.exports = { dbRouter };
