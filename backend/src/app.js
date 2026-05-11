const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { env } = require('./config/env');
const { pool } = require('./config/db');
const { authRouter } = require('./routes/auth.routes');
const { projectRouter } = require('./routes/project.routes');
const { poleSurveyRouter } = require('./modules/poleSurvey/routes/poleSurvey.routes');
const { issueRouter } = require('./routes/issue.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { requestId } = require('./middleware/requestId');

function createApp() {
  const app = express();

  app.disable('x-powered-by');

  // Attach a unique correlation ID to every request (before logging)
  app.use(requestId);

  app.use(helmet());
  app.use(compression());
  app.use(
    cors({
      origin: function (origin, callback) {
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
  const apiRouter = express.Router();
  apiRouter.use('/auth', authRouter);
  apiRouter.use('/projects', projectRouter);
  apiRouter.use('/projects/:projectId/pole-survey', poleSurveyRouter);
  apiRouter.use('/projects/:projectId/issues', issueRouter);
  app.use('/api/v1', apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
