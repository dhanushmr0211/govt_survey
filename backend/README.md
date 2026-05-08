# Govt Survey Backend

Secure Express backend for the survey platform.

## Features
- JWT authentication
- Password hashing with bcrypt
- Google Cloud SQL/Postgres access through `pg`
- Security middleware: `helmet`, `cors`, `hpp`, rate limiting
- Base routes for auth, health, projects, surveys, and issues

## Structure
- `src/controllers` for request handlers
- `src/services` for DB/business logic
- `src/routes` for route wiring
- `src/utils/upload.js` for file upload configuration

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your values.
3. Start the server:
   ```bash
   npm run dev
   ```

## Notes
- All tables in `sql/schema.sql` are stored in the same Google Cloud SQL PostgreSQL database through one connection pool.
- For Cloud SQL socket connections, set `CLOUD_SQL_CONNECTION_NAME`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` in `.env`.
- If you are not using Cloud SQL yet, the app still supports `DATABASE_URL` as a fallback for local/dev connections.
- For Google Cloud Postgres, prefer private IP or Cloud SQL connector in production.
- Keep database access behind TLS and store secrets in a secret manager.
