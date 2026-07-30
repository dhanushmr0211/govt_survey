-- Migration: Add offline_submission_id and image_url_3 columns and unique indexes
-- Created: 2026-07-29

-- 1. Add offline_submission_id to switch_points if missing
ALTER TABLE switch_points 
  ADD COLUMN IF NOT EXISTS offline_submission_id TEXT;

-- 2. Add offline_submission_id and image_url_3 to poles if missing
ALTER TABLE poles 
  ADD COLUMN IF NOT EXISTS offline_submission_id TEXT,
  ADD COLUMN IF NOT EXISTS image_url_3 TEXT;

-- 3. Create unique partial indexes to guarantee idempotency on non-null offline_submission_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_switch_points_offline_submission_id_uniq 
  ON switch_points (offline_submission_id) 
  WHERE offline_submission_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_poles_offline_submission_id_uniq 
  ON poles (offline_submission_id) 
  WHERE offline_submission_id IS NOT NULL;
