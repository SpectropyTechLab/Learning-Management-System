-- Teacher Session Tracker upload scope migration
-- Adds grade_id and subject_id to tracker upload tables so uploads are scoped by:
-- program -> grade -> subject -> version

BEGIN;

ALTER TABLE program_micro_schedule_uploads
  ADD COLUMN IF NOT EXISTS grade_id INTEGER REFERENCES grades(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS subject_id INTEGER REFERENCES subjects(id) ON DELETE RESTRICT;

ALTER TABLE program_lesson_planner_uploads
  ADD COLUMN IF NOT EXISTS grade_id INTEGER REFERENCES grades(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS subject_id INTEGER REFERENCES subjects(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_program_micro_schedule_uploads_grade
  ON program_micro_schedule_uploads(grade_id);

CREATE INDEX IF NOT EXISTS idx_program_micro_schedule_uploads_subject
  ON program_micro_schedule_uploads(subject_id);

CREATE INDEX IF NOT EXISTS idx_program_lesson_planner_uploads_grade
  ON program_lesson_planner_uploads(grade_id);

CREATE INDEX IF NOT EXISTS idx_program_lesson_planner_uploads_subject
  ON program_lesson_planner_uploads(subject_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'program_micro_schedule_uploads'::regclass
      AND conname = 'program_micro_schedule_uploads_program_id_version_no_key'
  ) THEN
    ALTER TABLE program_micro_schedule_uploads
      DROP CONSTRAINT program_micro_schedule_uploads_program_id_version_no_key;
  END IF;

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

CREATE UNIQUE INDEX IF NOT EXISTS uq_program_micro_schedule_uploads_scope_version
  ON program_micro_schedule_uploads(program_id, grade_id, subject_id, version_no)
  WHERE grade_id IS NOT NULL AND subject_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_program_lesson_planner_uploads_scope_version
  ON program_lesson_planner_uploads(program_id, grade_id, subject_id, source_type, version_no)
  WHERE grade_id IS NOT NULL AND subject_id IS NOT NULL;

COMMIT;
