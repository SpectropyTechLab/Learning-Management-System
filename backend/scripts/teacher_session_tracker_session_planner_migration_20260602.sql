-- Teacher Session Tracker session-wise planner migration
-- Makes lesson planner uploads target one micro-schedule session at a time.

BEGIN;

ALTER TABLE program_micro_schedule_rows
  ADD COLUMN IF NOT EXISTS planned_date DATE;

ALTER TABLE program_lesson_planner_uploads
  ADD COLUMN IF NOT EXISTS micro_schedule_upload_id INTEGER REFERENCES program_micro_schedule_uploads(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS target_session_no INTEGER;

CREATE INDEX IF NOT EXISTS idx_program_lesson_planner_uploads_micro_schedule
  ON program_lesson_planner_uploads(micro_schedule_upload_id);

CREATE INDEX IF NOT EXISTS idx_program_lesson_planner_uploads_target_session
  ON program_lesson_planner_uploads(target_session_no);

DROP INDEX IF EXISTS uq_program_lesson_planner_uploads_scope_version;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'program_lesson_planner_uploads'::regclass
      AND conname = 'program_lesson_planner_uploads_program_id_source_type_version_no_key'
  ) THEN
    ALTER TABLE program_lesson_planner_uploads
      DROP CONSTRAINT program_lesson_planner_uploads_program_id_source_type_version_no_key;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'program_lesson_planner_uploads'::regclass
      AND conname = 'program_lesson_planner_uploads_program_id_source_type_version_key'
  ) THEN
    ALTER TABLE program_lesson_planner_uploads
      DROP CONSTRAINT program_lesson_planner_uploads_program_id_source_type_version_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_program_lesson_planner_uploads_micro_session
  ON program_lesson_planner_uploads(micro_schedule_upload_id, target_session_no)
  WHERE micro_schedule_upload_id IS NOT NULL AND target_session_no IS NOT NULL;

COMMIT;
