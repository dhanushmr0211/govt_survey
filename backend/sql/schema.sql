-- DROP EXISTING TABLES & ENUMS TO START FRESH
DROP TABLE IF EXISTS issue_escalation_log CASCADE;
DROP TABLE IF EXISTS issues CASCADE;
DROP TABLE IF EXISTS poles CASCADE;
DROP TABLE IF EXISTS switch_points CASCADE;
DROP TABLE IF EXISTS ulbs CASCADE;
DROP TABLE IF EXISTS districts CASCADE;
DROP TABLE IF EXISTS entity_files CASCADE;
DROP TABLE IF EXISTS admin_section_access CASCADE;
DROP TABLE IF EXISTS project_users CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS survey_images CASCADE;
DROP TABLE IF EXISTS survey_records CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS project_type_enum CASCADE;
DROP TYPE IF EXISTS issue_status CASCADE;
DROP TYPE IF EXISTS survey_status CASCADE;

-- ENUMs
CREATE TYPE user_role AS ENUM ('MASTER_ADMIN', 'ADMIN', 'EMPLOYEE', 'CLIENT', 'MOBILE_USER');
CREATE TYPE project_type_enum AS ENUM ('POLE_SURVEY', 'METER_SURVEY', 'PIPELINE_SURVEY');
CREATE TYPE issue_status AS ENUM ('OPEN', 'RESOLVED');
CREATE TYPE survey_status AS ENUM ('PENDING', 'CONFIRMED', 'ISSUE_OPEN');

-- CORE PLATFORM
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'EMPLOYEE',
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  project_type project_type_enum NOT NULL DEFAULT 'POLE_SURVEY',
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_users (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_role TEXT NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS admin_section_access (
  id SERIAL PRIMARY KEY,
  admin_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section_a BOOLEAN DEFAULT FALSE,
  section_b BOOLEAN DEFAULT FALSE,
  section_c BOOLEAN DEFAULT FALSE
);

-- SHARED FILES (Replaces hardcoded image columns)
CREATE TABLE IF NOT EXISTS entity_files (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- e.g., 'switch_point', 'pole'
  entity_id INT NOT NULL,
  url TEXT NOT NULL,
  uploaded_by INT REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- MODULE: POLE SURVEY
CREATE TABLE IF NOT EXISTS districts (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ulbs (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  district_id INT NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP
);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_ulbs_name ON ulbs USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS switch_points (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  ulb_id INT NOT NULL REFERENCES ulbs(id) ON DELETE CASCADE,
  ward_number TEXT NOT NULL,
  switch_point_number TEXT NOT NULL,
  latitude DECIMAL,
  longitude DECIMAL,
  switch_point_type TEXT,
  meter_exists BOOLEAN,
  meter_type TEXT,
  meter_rr_number TEXT,
  meter_serial_number TEXT,
  meter_condition TEXT,
  status survey_status DEFAULT 'PENDING',
  confirmed_by INT REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMP,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  updated_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS poles (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  switch_point_id INT NOT NULL REFERENCES switch_points(id) ON DELETE CASCADE,
  latitude DECIMAL,
  longitude DECIMAL,
  ward_number TEXT,
  switch_point_number TEXT,
  conductor_type TEXT,
  pole_number TEXT,
  pole_type TEXT,
  pole_height_mtrs NUMERIC,
  pole_condition TEXT,
  pole_to_pole_distance_mtrs NUMERIC,
  arm_type TEXT,
  arm_status TEXT,
  present_arm_no TEXT,
  present_arm_length_mtrs NUMERIC,
  how_many_lights_in_pole TEXT,
  light_mounting_height TEXT,
  light_type TEXT,
  light_capacity TEXT,
  light_working_status TEXT,
  road_category TEXT,
  road_type TEXT,
  road_width_mtrs NUMERIC,
  pole_earthing_exists TEXT,
  status survey_status DEFAULT 'PENDING',
  confirmed_by INT REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMP,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  updated_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP
);

-- WORKFLOW & ISSUES
CREATE TABLE IF NOT EXISTS issues (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- e.g., 'switch_point', 'pole'
  entity_id INT NOT NULL,
  raised_by INT REFERENCES users(id) ON DELETE SET NULL,
  raised_at TIMESTAMP DEFAULT NOW(),
  issue_note TEXT NOT NULL,
  current_level INT DEFAULT 0,
  resolved_by INT REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,
  status issue_status DEFAULT 'OPEN'
);

CREATE TABLE IF NOT EXISTS issue_escalation_log (
  id SERIAL PRIMARY KEY,
  issue_id INT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  from_level INT NOT NULL,
  to_level INT NOT NULL,
  escalated_at TIMESTAMP DEFAULT NOW(),
  escalated_by INT REFERENCES users(id) ON DELETE SET NULL
);

-- INDICES
CREATE INDEX IF NOT EXISTS idx_districts_project_id ON districts(project_id);
CREATE INDEX IF NOT EXISTS idx_ulbs_project_id ON ulbs(project_id);
CREATE INDEX IF NOT EXISTS idx_switch_points_project_id ON switch_points(project_id);
CREATE INDEX IF NOT EXISTS idx_poles_project_id ON poles(project_id);
CREATE INDEX IF NOT EXISTS idx_entity_files_project_id ON entity_files(project_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_issues_project_id ON issues(project_id, entity_type, entity_id);
