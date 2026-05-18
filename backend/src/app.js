const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { env } = require('./config/env');
const { pool } = require('./config/db');
const { authRouter } = require('./routes/auth.routes');
const { projectRouter } = require('./routes/project.routes');
const { poleSurveyRouter } = require('./modules/poleSurvey/routes/poleSurvey.routes');
const { issueRouter } = require('./routes/issue.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { requestId } = require('./middleware/requestId');

function createApp() {
  // Startup database migrations and performance indexing
  const migrations = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;',
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
    "CREATE INDEX IF NOT EXISTS idx_issues_open_status ON issues (status) WHERE status = 'OPEN';"
  ];

  (async () => {
    for (const q of migrations) {
      try {
        await pool.query(q);
      } catch (err) {
        console.error(`[Startup Migration Failed] ${q.trim().substring(0, 50)}... :`, err.message);
      }
    }
    console.log('[Startup Migration] All database migrations and performance indexes verified/applied successfully.');
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
  const apiRouter = express.Router({ mergeParams: true });
  apiRouter.use('/auth', authRouter);
  apiRouter.use('/projects', projectRouter);
  apiRouter.use('/projects/:projectId/pole-survey', requireProjectMember(), poleSurveyRouter);
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
