-- Question Bank ownership scope migration
-- Adds school ownership to programs. Grade/subject/chapter/topic ownership is derived
-- through the program hierarchy, while questions already store school_id.

ALTER TABLE programs
ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_programs_school ON programs(school_id);

