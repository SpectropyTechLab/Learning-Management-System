-- SPECTROPY Studio curriculum hierarchy and authoring schema.
-- Safe to run in Supabase after the LMS base schema.

CREATE TABLE IF NOT EXISTS public.boards (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES public.clients(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(40) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_boards_client_code
  ON public.boards (COALESCE(client_id, 0), LOWER(code));
CREATE INDEX IF NOT EXISTS idx_boards_active ON public.boards(client_id, is_active);

-- Existing curriculum tables: add the fields required by Studio.
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS board_id INTEGER;
ALTER TABLE public.grades ADD COLUMN IF NOT EXISTS name VARCHAR(120);
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.grades
SET name = 'Grade ' || grade_number
WHERE name IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'programs_board_id_fkey') THEN
    ALTER TABLE public.programs
      ADD CONSTRAINT programs_board_id_fkey
      FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_programs_board ON public.programs(board_id);
CREATE INDEX IF NOT EXISTS idx_subjects_grade_order ON public.subjects(grade_id, display_order, name);
CREATE INDEX IF NOT EXISTS idx_chapters_subject_order ON public.chapters(subject_id, display_order, chapter_number);
CREATE INDEX IF NOT EXISTS idx_topics_chapter_order ON public.topics(chapter_id, display_order, topic_number);

CREATE TABLE IF NOT EXISTS public.subtopics (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subtopics_topic_order
  ON public.subtopics(topic_id, display_order, name);

CREATE TABLE IF NOT EXISTS public.layouts (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES public.clients(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  layout_data_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  thumbnail_url TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (jsonb_typeof(layout_data_json) = 'object')
);
CREATE INDEX IF NOT EXISTS idx_layouts_client_active ON public.layouts(client_id, is_active);

CREATE TABLE IF NOT EXISTS public.sessions (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES public.clients(id) ON DELETE CASCADE,
  subtopic_id INTEGER NOT NULL REFERENCES public.subtopics(id) ON DELETE RESTRICT,
  session_number INTEGER NOT NULL CHECK (session_number > 0),
  title VARCHAR(250) NOT NULL,
  description TEXT,
  session_plan_file_url TEXT,
  session_plan_file_name TEXT,
  session_plan_file_type VARCHAR(100),
  session_plan_uploaded_at TIMESTAMPTZ,
  session_plan_content JSONB,
  status VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'published')),
  approval_comment TEXT,
  submitted_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  approved_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (session_plan_content IS NULL OR jsonb_typeof(session_plan_content) IN ('object', 'array')),
  UNIQUE (subtopic_id, session_number)
);
CREATE INDEX IF NOT EXISTS idx_sessions_client_status ON public.sessions(client_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_subtopic ON public.sessions(subtopic_id);

CREATE TABLE IF NOT EXISTS public.screens (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES public.clients(id) ON DELETE CASCADE,
  session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  title VARCHAR(250) NOT NULL,
  screen_number INTEGER NOT NULL,
  layout_id INTEGER REFERENCES public.layouts(id) ON DELETE SET NULL,
  screen_script_file_url TEXT,
  screen_script_file_name TEXT,
  screen_script_file_type VARCHAR(100),
  screen_script_uploaded_at TIMESTAMPTZ,
  screen_script_content JSONB,
  elements_json JSONB NOT NULL DEFAULT '[]'::JSONB,
  branches_json JSONB NOT NULL DEFAULT '[]'::JSONB,
  branch_tags_json JSONB NOT NULL DEFAULT '[]'::JSONB,
  screen_settings_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (screen_script_content IS NULL OR jsonb_typeof(screen_script_content) IN ('object', 'array')),
  CHECK (jsonb_typeof(elements_json) = 'array'),
  CHECK (jsonb_typeof(branches_json) = 'array'),
  CHECK (jsonb_typeof(branch_tags_json) = 'array'),
  CHECK (jsonb_typeof(screen_settings_json) = 'object'),
  UNIQUE (session_id, screen_number)
);
CREATE INDEX IF NOT EXISTS idx_screens_session_order
  ON public.screens(session_id, display_order, screen_number);
CREATE INDEX IF NOT EXISTS idx_screens_branch_tags
  ON public.screens USING GIN(branch_tags_json);

CREATE TABLE IF NOT EXISTS public.resources (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES public.clients(id) ON DELETE CASCADE,
  name VARCHAR(250) NOT NULL,
  description TEXT,
  resource_type VARCHAR(30) NOT NULL CHECK (resource_type IN
    ('image', 'video', 'animation', 'simulation', 'external_link', 'html', 'zip', 'scorm')),
  file_url TEXT,
  file_name TEXT,
  file_type VARCHAR(100),
  file_size BIGINT,
  thumbnail_url TEXT,
  external_url TEXT,
  resource_data_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (jsonb_typeof(resource_data_json) = 'object')
);
CREATE INDEX IF NOT EXISTS idx_resources_client_type ON public.resources(client_id, resource_type, is_active);

CREATE TABLE IF NOT EXISTS public.resource_mappings (
  id SERIAL PRIMARY KEY,
  resource_id INTEGER NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  screen_id INTEGER NOT NULL REFERENCES public.screens(id) ON DELETE CASCADE,
  element_id TEXT NOT NULL,
  usage_details_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (jsonb_typeof(usage_details_json) = 'object'),
  UNIQUE (resource_id, screen_id, element_id)
);
CREATE INDEX IF NOT EXISTS idx_resource_mappings_screen ON public.resource_mappings(screen_id);
CREATE INDEX IF NOT EXISTS idx_resource_mappings_resource ON public.resource_mappings(resource_id);

-- Supabase Storage bucket for private Session Plans and Screen Scripts.
-- The backend uses the service key to upload and create short-lived signed download links.
INSERT INTO storage.buckets (id, name, public)
VALUES ('sessions-scripts-plans', 'sessions-scripts-plans', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

-- Standard timestamp maintenance for Studio tables.
DROP TRIGGER IF EXISTS trg_boards_updated ON public.boards;
CREATE TRIGGER trg_boards_updated BEFORE UPDATE ON public.boards FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
DROP TRIGGER IF EXISTS trg_subtopics_updated ON public.subtopics;
CREATE TRIGGER trg_subtopics_updated BEFORE UPDATE ON public.subtopics FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
DROP TRIGGER IF EXISTS trg_layouts_updated ON public.layouts;
CREATE TRIGGER trg_layouts_updated BEFORE UPDATE ON public.layouts FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
DROP TRIGGER IF EXISTS trg_sessions_updated ON public.sessions;
CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
DROP TRIGGER IF EXISTS trg_screens_updated ON public.screens;
CREATE TRIGGER trg_screens_updated BEFORE UPDATE ON public.screens FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
DROP TRIGGER IF EXISTS trg_resources_updated ON public.resources;
CREATE TRIGGER trg_resources_updated BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
