const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { env } = require('./config/env');
const { pool, tgplPool } = require('./config/db');
const { authRouter } = require('./routes/auth.routes');
const { projectRouter } = require('./routes/project.routes');
const { poleSurveyRouter } = require('./modules/poleSurvey/routes/poleSurvey.routes');
const { tgplSurveyRouter } = require('./modules/tgplSurvey/routes/tgplSurvey.routes');
const { issueRouter } = require('./routes/issue.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { requestId } = require('./middleware/requestId');
const { TGPL_PROJECT_ID } = require('./constants/projects');

function createApp() {
  // Startup database migrations and performance indexing
  const migrations = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email) WHERE is_deleted IS NOT TRUE;',
    'CREATE INDEX IF NOT EXISTS idx_users_role_id ON users (role, id DESC) WHERE is_deleted IS NOT TRUE;',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_project_users_comp ON project_users (project_id, user_id);',
    'CREATE INDEX IF NOT EXISTS idx_project_users_user_id ON project_users (user_id);',
    'CREATE INDEX IF NOT EXISTS idx_poles_project_status_created ON poles (project_id, status, created_at DESC) WHERE is_deleted IS NOT TRUE;',
    'CREATE INDEX IF NOT EXISTS idx_poles_switch_point_id ON poles (switch_point_id) WHERE is_deleted IS NOT TRUE;',
    'CREATE INDEX IF NOT EXISTS idx_switch_points_project_status_created ON switch_points (project_id, status, created_at DESC) WHERE is_deleted IS NOT TRUE;',
    `CREATE INDEX IF NOT EXISTS idx_switch_points_duplicate_check ON switch_points (
      project_id, 
      ulb_id, 
      TRIM(LOWER(ward_number)), 
      TRIM(LOWER(switch_point_number))
    ) WHERE is_deleted IS NOT TRUE;`,
    'CREATE INDEX IF NOT EXISTS idx_issues_project_status_raised ON issues (project_id, status, raised_at DESC);',
    "CREATE INDEX IF NOT EXISTS idx_issues_open_status ON issues (status) WHERE status = 'OPEN';",
    'CREATE TABLE IF NOT EXISTS entity_files (id SERIAL PRIMARY KEY, project_id INT NOT NULL, entity_type TEXT NOT NULL, entity_id INT NOT NULL, url TEXT NOT NULL, uploaded_by INT, uploaded_at TIMESTAMP DEFAULT NOW());',
    'ALTER TABLE poles ADD COLUMN IF NOT EXISTS image_url_1 TEXT;',
    'ALTER TABLE poles ADD COLUMN IF NOT EXISTS image_url_2 TEXT;',
    'ALTER TABLE poles ADD COLUMN IF NOT EXISTS image_url_3 TEXT;',
    'ALTER TABLE poles ADD COLUMN IF NOT EXISTS dtc_number TEXT;',
    'ALTER TABLE poles ADD COLUMN IF NOT EXISTS dtc_capacity TEXT;',
    'ALTER TABLE poles ADD COLUMN IF NOT EXISTS ccms_number TEXT;',
    'ALTER TABLE poles ADD COLUMN IF NOT EXISTS meter_type TEXT;',
    'ALTER TABLE poles ADD COLUMN IF NOT EXISTS meter_rr_number TEXT;',
    'ALTER TABLE poles ADD COLUMN IF NOT EXISTS meter_serial_number TEXT;',
    'ALTER TABLE poles ADD COLUMN IF NOT EXISTS meter_dimensional_status TEXT;',
    'ALTER TABLE poles ADD COLUMN IF NOT EXISTS pole_height TEXT;',
    'ALTER TABLE poles ADD COLUMN IF NOT EXISTS pole_to_pole_distance TEXT;',
    'ALTER TABLE poles ADD COLUMN IF NOT EXISTS present_arm_length TEXT;',
    'ALTER TABLE poles ADD COLUMN IF NOT EXISTS req_arm_number TEXT;',
    'ALTER TABLE poles ADD COLUMN IF NOT EXISTS req_arm_length TEXT;',
    'ALTER TABLE poles ADD COLUMN IF NOT EXISTS req_led_lights_no TEXT;',
    'ALTER TABLE poles ADD COLUMN IF NOT EXISTS req_led_wattage TEXT;',
    'ALTER TABLE poles ADD COLUMN IF NOT EXISTS req_dedicated_wire TEXT;',
    'CREATE TABLE IF NOT EXISTS wards (id SERIAL PRIMARY KEY, name TEXT NOT NULL, is_deleted BOOLEAN DEFAULT FALSE);',
    `CREATE TABLE IF NOT EXISTS admin_section_access (
      id SERIAL PRIMARY KEY,
      admin_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      section_a BOOLEAN NOT NULL DEFAULT FALSE,
      section_b BOOLEAN NOT NULL DEFAULT FALSE,
      section_c BOOLEAN NOT NULL DEFAULT FALSE,
      section_d BOOLEAN NOT NULL DEFAULT FALSE,
      section_e BOOLEAN NOT NULL DEFAULT FALSE,
      section_f BOOLEAN NOT NULL DEFAULT FALSE,
      section_g BOOLEAN NOT NULL DEFAULT FALSE,
      section_h BOOLEAN NOT NULL DEFAULT FALSE,
      section_i BOOLEAN NOT NULL DEFAULT FALSE,
      section_j BOOLEAN NOT NULL DEFAULT FALSE
    );`
  ];

  (async () => {
    // Migrations for Default Pool
    for (const q of migrations) {
      try {
        await pool.query(q);
      } catch (err) {
        console.error(`[Startup Migration Failed - Default] ${q.trim().substring(0, 50)}... :`, err.message);
      }
    }

    // Migrations for TGPL Pool
    for (const q of migrations) {
      try {
        await tgplPool.query(q);
      } catch (err) {
        // Ignore failures on tgplPool that are expected (e.g. table doesn't exist yet but we're trying to add index)
        if (!err.message.includes('does not exist')) {
          console.error(`[Startup Migration Failed - TGPL] ${q.trim().substring(0, 50)}... :`, err.message);
        }
      }
    }
    console.log('[Startup Migration] Database migrations and performance indexes verified/applied successfully across all pools.');
  })();

  const app = express();

  app.disable('x-powered-by');

  // Trust Cloud Run / Google's load balancer proxy
  // Required for express-rate-limit to correctly read client IPs
  app.set('trust proxy', 1);

  // Attach a unique correlation ID to every request (before logging)
  app.use(requestId);

  app.use(helmet());
  app.use(compression());
  app.use(
    cors({
      origin: function (origin, callback) {
        // If corsOrigin is boolean true, allow all origins (CORS_ORIGIN=*)
        if (env.corsOrigin === true) {
          return callback(null, true);
        }
        const allowedOrigins = env.corsOrigin ? env.corsOrigin.split(',') : [];
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.log('Origin not allowed:', origin);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    })
  );
  app.use(hpp());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use('/uploads', express.static(require('path').join(__dirname, '../uploads')));

  // Custom morgan token for correlation IDs
  morgan.token('request-id', (req) => req.id || '-');
  const logFormat =
    env.nodeEnv === 'production'
      ? ':request-id :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
      : ':request-id :method :url :status :response-time ms';
  app.use(morgan(logFormat));

  app.use(
    rateLimit({
      windowMs: env.rateLimitWindowMs,
      max: env.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: { 
        message: 'Too many requests! You have exceeded your limit. Please wait 15 minutes before trying again.' 
      }
    })
  );

  // Serve frontend static files (React app)
  const frontendDistPath = path.join(__dirname, '../../frontend/dist');
  app.use(
    express.static(frontendDistPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        }
      },
    })
  );

  // Health check at root level (for load-balancer probes)
  app.get('/health', async (req, res, next) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
      next(error);
    }
  });

  // All domain routes under /api/v1
  const { requireProjectMember } = require('./middleware/roleGuard');
  const { dbRouter } = require('./middleware/dbRouter');
  const apiRouter = express.Router({ mergeParams: true });
  apiRouter.use(dbRouter);
  apiRouter.use('/auth', authRouter);
  apiRouter.use('/projects', projectRouter);
  apiRouter.use('/projects/:projectId/pole-survey', requireProjectMember(), (req, res, next) => {
    const projectId = String(req.params.projectId || req.headers['x-project-id']);
    if (projectId === TGPL_PROJECT_ID) {
      return tgplSurveyRouter(req, res, next);
    }
    return poleSurveyRouter(req, res, next);
  });
  apiRouter.use('/projects/:projectId/issues', requireProjectMember(), issueRouter);
  app.use('/api/v1', apiRouter);

  // Fallback to index.html for React Router (SPA)
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
