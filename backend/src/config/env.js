const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1).optional(),
  CLOUD_SQL_CONNECTION_NAME: z.string().min(1).optional(),
  DB_HOST: z.string().min(1).optional(),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USER: z.string().min(1).optional(),
  DB_PASSWORD: z.string().min(1).optional(),
  DB_NAME: z.string().min(1).optional(),
  DB_SSL: z
    .enum(['true', 'false'])
    .optional()
    .default('true'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1d'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  GCP_PROJECT_ID: z.string().min(1),
  GCS_BUCKET_NAME: z.string().min(1),
  GCS_SIGNED_URL_EXPIRATION_SECONDS: z.coerce.number().int().positive().default(900),
  GCP_KEY_FILE: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('; ');
  throw new Error(`Invalid environment configuration: ${issues}`);
}

const usingCloudSql = Boolean(parsed.data.CLOUD_SQL_CONNECTION_NAME);
const usingDirectHost = Boolean(parsed.data.DB_HOST);

if (usingCloudSql || usingDirectHost) {
  const missing = ['DB_USER', 'DB_PASSWORD', 'DB_NAME'].filter((key) => !parsed.data[key]);

  if (missing.length > 0) {
    throw new Error(`Invalid environment configuration: missing ${missing.join(', ')} when using discrete DB settings`);
  }
} else if (!parsed.data.DATABASE_URL) {
  throw new Error('Invalid environment configuration: Must provide either DATABASE_URL, DB_HOST, or CLOUD_SQL_CONNECTION_NAME');
}

const env = {
  nodeEnv: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  databaseUrl: parsed.data.DATABASE_URL,
  cloudSqlConnectionName: parsed.data.CLOUD_SQL_CONNECTION_NAME,
  dbHost: parsed.data.DB_HOST,
  dbPort: parsed.data.DB_PORT,
  dbUser: parsed.data.DB_USER,
  dbPassword: parsed.data.DB_PASSWORD,
  dbName: parsed.data.DB_NAME,
  dbSsl: parsed.data.DB_SSL === 'true',
  jwtSecret: parsed.data.JWT_SECRET,
  jwtExpiresIn: parsed.data.JWT_EXPIRES_IN,
  corsOrigin: parsed.data.CORS_ORIGIN === '*' ? true : parsed.data.CORS_ORIGIN,
  rateLimitWindowMs: parsed.data.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: parsed.data.RATE_LIMIT_MAX,
  gcpProjectId: parsed.data.GCP_PROJECT_ID,
  gcsBucketName: parsed.data.GCS_BUCKET_NAME,
  gcsSignedUrlExpirationSeconds: parsed.data.GCS_SIGNED_URL_EXPIRATION_SECONDS,
  gcpKeyFile: parsed.data.GCP_KEY_FILE,
};

module.exports = { env };
