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
  CHECK (session_plan_content IS NULL OR jsonb_typeof(session_plan_content) IN ('object', 'array'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_client_status ON public.sessions(client_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_subtopic ON public.sessions(subtopic_id);

CREATE TABLE IF NOT EXISTS public.screens (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES public.clients(id) ON DELETE CASCADE,
  session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  title VARCHAR(250) NOT NULL DEFAULT '',
  screen_number INTEGER NOT NULL,
  layout_id INTEGER REFERENCES public.layouts(id) ON DELETE SET NULL,
  screen_script_file_url TEXT,
  screen_script_file_name TEXT,
  screen_script_file_type VARCHAR(100),
  screen_script_uploaded_at TIMESTAMPTZ,
  screen_script_content JSONB,
  screen_settings_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  display_order INTEGER NOT NULL DEFAULT 0,
  creation_mode VARCHAR(20) NOT NULL DEFAULT 'layout'
    CHECK (creation_mode IN ('blank', 'layout')),
  revision_no INTEGER NOT NULL DEFAULT 1 CHECK (revision_no > 0),
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (screen_script_content IS NULL OR jsonb_typeof(screen_script_content) IN ('object', 'array')),
  CHECK (jsonb_typeof(screen_settings_json) = 'object'),
  UNIQUE (session_id, screen_number),
  UNIQUE (id, session_id)
);
CREATE INDEX IF NOT EXISTS idx_screens_session_order
  ON public.screens(session_id, display_order, screen_number);

-- Canonical Screen composition. These relational tables replace the former
-- screens.elements_json, screens.branch_tags_json and screens.branches_json columns.
CREATE TABLE IF NOT EXISTS public.screen_elements (
  id BIGSERIAL PRIMARY KEY,
  screen_id INTEGER NOT NULL REFERENCES public.screens(id) ON DELETE CASCADE,
  element_key TEXT NOT NULL CHECK (BTRIM(element_key) <> ''),
  slot_id TEXT,
  element_type VARCHAR(30) NOT NULL CHECK (element_type IN (
    'title', 'text', 'visual', 'question', 'response', 'steps', 'workspace',
    'footer', 'simulation', 'activity', 'media', 'graph', 'data', 'options'
  )),
  content_json JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(content_json) = 'object'),
  position_json JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(position_json) = 'object'),
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (screen_id, element_key)
);

CREATE TABLE IF NOT EXISTS public.screen_tags (
  screen_id INTEGER NOT NULL REFERENCES public.screens(id) ON DELETE CASCADE,
  tag TEXT NOT NULL CHECK (tag = LOWER(BTRIM(tag)) AND tag <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (screen_id, tag)
);

CREATE TABLE IF NOT EXISTS public.screen_branches (
  id BIGSERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  branch_key TEXT NOT NULL CHECK (BTRIM(branch_key) <> ''),
  source_screen_id INTEGER NOT NULL,
  destination_screen_id INTEGER NOT NULL,
  trigger_kind VARCHAR(20) NOT NULL CHECK (trigger_kind IN ('manual', 'answer', 'score', 'tag')),
  trigger_config_json JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(trigger_config_json) = 'object'),
  return_screen_id INTEGER NOT NULL,
  restore_screen_state BOOLEAN NOT NULL DEFAULT TRUE,
  restore_session_state BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT screen_branches_source_session_fkey
    FOREIGN KEY (source_screen_id, session_id)
    REFERENCES public.screens(id, session_id) ON DELETE CASCADE,
  CONSTRAINT screen_branches_destination_session_fkey
    FOREIGN KEY (destination_screen_id, session_id)
    REFERENCES public.screens(id, session_id) ON DELETE RESTRICT,
  CONSTRAINT screen_branches_return_session_fkey
    FOREIGN KEY (return_screen_id, session_id)
    REFERENCES public.screens(id, session_id) ON DELETE RESTRICT,
  UNIQUE (source_screen_id, branch_key)
);

CREATE INDEX IF NOT EXISTS idx_screen_elements_screen_order
  ON public.screen_elements(screen_id, display_order, id);
CREATE INDEX IF NOT EXISTS idx_screen_tags_tag
  ON public.screen_tags(tag, screen_id);
CREATE INDEX IF NOT EXISTS idx_screen_branches_source_order
  ON public.screen_branches(source_screen_id, display_order, id);
CREATE INDEX IF NOT EXISTS idx_screen_branches_destination
  ON public.screen_branches(destination_screen_id);

ALTER TABLE public.screen_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_branches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.screen_elements, public.screen_tags, public.screen_branches
  FROM anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.screen_elements_id_seq, public.screen_branches_id_seq
  FROM anon, authenticated, service_role;

COMMENT ON TABLE public.screen_elements IS
  'Canonical typed Studio elements. Replaces screens.elements_json.';
COMMENT ON TABLE public.screen_tags IS
  'Canonical normalized multi-tag discovery values. Replaces screens.branch_tags_json.';
COMMENT ON TABLE public.screen_branches IS
  'Canonical same-session branch destinations and explicit return-state references. Replaces screens.branches_json.';

CREATE TABLE IF NOT EXISTS public.resources (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES public.clients(id) ON DELETE CASCADE,
  name VARCHAR(250) NOT NULL,
  description TEXT,
  resource_type VARCHAR(30) NOT NULL CHECK (resource_type IN
    ('image', 'video', 'animation', 'simulation', 'external_link', 'html', 'zip', 'scorm')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_resources_client_type ON public.resources(client_id, resource_type, is_active);

-- A Resource is the stable reusable identity; every uploaded/replaced file is
-- an immutable version row. Published Screens pin resource_versions.id so a
-- later upload cannot silently change already published content.
CREATE TABLE IF NOT EXISTS public.resource_versions (
  id SERIAL PRIMARY KEY,
  resource_id INTEGER NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  storage_key TEXT,
  original_file_name TEXT,
  mime_type VARCHAR(150),
  file_size BIGINT,
  checksum_sha256 VARCHAR(64),
  thumbnail_storage_key TEXT,
  external_url TEXT,
  width INTEGER,
  height INTEGER,
  duration_seconds NUMERIC(12, 3),
  entry_point TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  uploaded_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (version_number > 0),
  CHECK (file_size IS NULL OR file_size >= 0),
  CHECK (width IS NULL OR width > 0),
  CHECK (height IS NULL OR height > 0),
  CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  CHECK (jsonb_typeof(metadata_json) = 'object'),
  UNIQUE (resource_id, version_number),
  UNIQUE (resource_id, id)
);
CREATE INDEX IF NOT EXISTS idx_resource_versions_resource
  ON public.resource_versions(resource_id, version_number DESC);

CREATE TABLE IF NOT EXISTS public.resource_mappings (
  id SERIAL PRIMARY KEY,
  resource_id INTEGER NOT NULL REFERENCES public.resources(id) ON DELETE RESTRICT,
  resource_version_id INTEGER NOT NULL,
  screen_id INTEGER NOT NULL REFERENCES public.screens(id) ON DELETE CASCADE,
  element_id TEXT NOT NULL,
  usage_details_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (jsonb_typeof(usage_details_json) = 'object'),
  CONSTRAINT resource_mappings_screen_element_unique UNIQUE (screen_id, element_id),
  CONSTRAINT resource_mappings_resource_version_fkey FOREIGN KEY (resource_id, resource_version_id)
    REFERENCES public.resource_versions(resource_id, id) ON DELETE RESTRICT,
  CONSTRAINT resource_mappings_screen_element_fkey FOREIGN KEY (screen_id, element_id)
    REFERENCES public.screen_elements(screen_id, element_key) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_resource_mappings_screen ON public.resource_mappings(screen_id);
CREATE INDEX IF NOT EXISTS idx_resource_mappings_resource ON public.resource_mappings(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_mappings_version ON public.resource_mappings(resource_version_id);

-- Supabase Storage bucket for private Session Plans and Screen Scripts.
-- The backend uses the service key to upload and create short-lived signed download links.
INSERT INTO storage.buckets (id, name, public)
VALUES ('sessions-scripts-plans', 'sessions-scripts-plans', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

-- Private Resource bytes and thumbnails. The backend should expose protected
-- downloads or short-lived signed URLs rather than public object URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('studio-resources', 'studio-resources', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

-- Immutable publication snapshots. Authoring continues in sessions/screens/layouts/resources;
-- teachers read only these frozen release manifests.
CREATE TABLE IF NOT EXISTS public.session_releases (
  id BIGSERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES public.clients(id) ON DELETE RESTRICT,
  session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
  release_number INTEGER NOT NULL CHECK (release_number > 0),
  manifest_json JSONB NOT NULL,
  approved_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  published_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (jsonb_typeof(manifest_json) = 'object'),
  UNIQUE (session_id, release_number)
);
CREATE INDEX IF NOT EXISTS idx_session_releases_latest
  ON public.session_releases(client_id, session_id, release_number DESC);

-- Releases are append-only: corrections must be published as the next release.
CREATE OR REPLACE FUNCTION public.prevent_session_release_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Published Session releases are immutable; create a new release instead';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_session_releases_immutable ON public.session_releases;
CREATE TRIGGER trg_session_releases_immutable
  BEFORE UPDATE OR DELETE ON public.session_releases
  FOR EACH ROW EXECUTE FUNCTION public.prevent_session_release_mutation();

+-- Teacher-specific branch presentation runs and protected return checkpoints.
-- These runtime rows never modify authored Screens/branches or immutable releases.
CREATE TABLE IF NOT EXISTS public.studio_branch_runs (
  id BIGSERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  teacher_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  release_id BIGINT NOT NULL REFERENCES public.session_releases(id) ON DELETE RESTRICT,
  root_session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
  root_screen_id INTEGER NOT NULL REFERENCES public.screens(id) ON DELETE RESTRICT,
  current_session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
  current_screen_id INTEGER NOT NULL REFERENCES public.screens(id) ON DELETE RESTRICT,
  current_depth INTEGER NOT NULL DEFAULT 0 CHECK (current_depth BETWEEN 0 AND 32),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT studio_branch_runs_terminal_time_check CHECK (
    (status = 'active' AND completed_at IS NULL AND abandoned_at IS NULL) OR
    (status = 'completed' AND completed_at IS NOT NULL AND abandoned_at IS NULL) OR
    (status = 'abandoned' AND abandoned_at IS NOT NULL AND completed_at IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.studio_branch_checkpoints (
  id BIGSERIAL PRIMARY KEY,
  run_id BIGINT NOT NULL REFERENCES public.studio_branch_runs(id) ON DELETE CASCADE,
  parent_checkpoint_id BIGINT REFERENCES public.studio_branch_checkpoints(id) ON DELETE RESTRICT,
  branch_definition_id BIGINT REFERENCES public.screen_branches(id) ON DELETE SET NULL,
  branch_key TEXT NOT NULL CHECK (BTRIM(branch_key) <> ''),
  depth INTEGER NOT NULL CHECK (depth BETWEEN 1 AND 32),
  origin_session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
  origin_screen_id INTEGER NOT NULL REFERENCES public.screens(id) ON DELETE RESTRICT,
  origin_release_id BIGINT NOT NULL REFERENCES public.session_releases(id) ON DELETE RESTRICT,
  origin_reveal_state_json JSONB NOT NULL DEFAULT '{}'::JSONB
    CHECK (jsonb_typeof(origin_reveal_state_json) = 'object'),
  origin_annotations_json JSONB NOT NULL DEFAULT '[]'::JSONB
    CHECK (jsonb_typeof(origin_annotations_json) = 'array'),
  origin_interaction_state_json JSONB NOT NULL DEFAULT '{}'::JSONB
    CHECK (jsonb_typeof(origin_interaction_state_json) = 'object'),
  origin_focus_json JSONB NOT NULL DEFAULT '{}'::JSONB
    CHECK (jsonb_typeof(origin_focus_json) = 'object'),
  destination_session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
  destination_screen_id INTEGER NOT NULL REFERENCES public.screens(id) ON DELETE RESTRICT,
  branch_reveal_state_json JSONB NOT NULL DEFAULT '{}'::JSONB
    CHECK (jsonb_typeof(branch_reveal_state_json) = 'object'),
  branch_annotations_json JSONB NOT NULL DEFAULT '[]'::JSONB
    CHECK (jsonb_typeof(branch_annotations_json) = 'array'),
  branch_interaction_state_json JSONB NOT NULL DEFAULT '{}'::JSONB
    CHECK (jsonb_typeof(branch_interaction_state_json) = 'object'),
  branch_focus_json JSONB NOT NULL DEFAULT '{}'::JSONB
    CHECK (jsonb_typeof(branch_focus_json) = 'object'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'abandoned')),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  returned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT studio_branch_checkpoints_return_time_check CHECK (
    (status = 'active' AND returned_at IS NULL) OR
    (status = 'returned' AND returned_at IS NOT NULL) OR
    (status = 'abandoned' AND returned_at IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS studio_branch_checkpoints_one_active_depth_uq
  ON public.studio_branch_checkpoints(run_id, depth) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS studio_branch_runs_teacher_status_idx
  ON public.studio_branch_runs(teacher_id, status, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS studio_branch_runs_release_idx
  ON public.studio_branch_runs(release_id, started_at DESC);
CREATE INDEX IF NOT EXISTS studio_branch_checkpoints_run_depth_idx
  ON public.studio_branch_checkpoints(run_id, depth DESC, entered_at DESC);
CREATE INDEX IF NOT EXISTS studio_branch_checkpoints_branch_history_idx
  ON public.studio_branch_checkpoints(branch_key, entered_at DESC);

CREATE OR REPLACE FUNCTION public.studio_validate_branch_run()
RETURNS TRIGGER AS $$
DECLARE
  release_client_id INTEGER;
  release_session_id INTEGER;
  teacher_client_id INTEGER;
BEGIN
  SELECT client_id, session_id INTO release_client_id, release_session_id
  FROM public.session_releases WHERE id = NEW.release_id;
  SELECT client_id INTO teacher_client_id FROM public.users WHERE id = NEW.teacher_id;
  IF release_client_id IS DISTINCT FROM NEW.client_id
     OR teacher_client_id IS DISTINCT FROM NEW.client_id THEN
    RAISE EXCEPTION 'Branch run tenant must match its teacher and release';
  END IF;
  IF release_session_id IS DISTINCT FROM NEW.root_session_id
     OR release_session_id IS DISTINCT FROM NEW.current_session_id THEN
    RAISE EXCEPTION 'Branch run Sessions must match its release Session';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF ROW(NEW.client_id, NEW.teacher_id, NEW.release_id, NEW.root_session_id,
           NEW.root_screen_id, NEW.started_at, NEW.created_at)
       IS DISTINCT FROM
       ROW(OLD.client_id, OLD.teacher_id, OLD.release_id, OLD.root_session_id,
           OLD.root_screen_id, OLD.started_at, OLD.created_at) THEN
      RAISE EXCEPTION 'Branch run identity is immutable';
    END IF;
    IF OLD.status <> 'active' THEN
      RAISE EXCEPTION 'Completed or abandoned branch runs are immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_studio_validate_branch_run ON public.studio_branch_runs;
CREATE TRIGGER trg_studio_validate_branch_run
  BEFORE INSERT OR UPDATE ON public.studio_branch_runs
  FOR EACH ROW EXECUTE FUNCTION public.studio_validate_branch_run();

CREATE OR REPLACE FUNCTION public.studio_validate_branch_checkpoint()
RETURNS TRIGGER AS $$
DECLARE
  parent_run_id BIGINT;
  parent_depth INTEGER;
  owning_release_id BIGINT;
  owning_status TEXT;
BEGIN
  SELECT release_id, status INTO owning_release_id, owning_status
  FROM public.studio_branch_runs WHERE id = NEW.run_id;
  IF NOT FOUND OR owning_release_id IS DISTINCT FROM NEW.origin_release_id THEN
    RAISE EXCEPTION 'Branch checkpoint release must match its run release';
  END IF;
  IF owning_status <> 'active' THEN
    RAISE EXCEPTION 'Branch checkpoints require an active run';
  END IF;
  IF NEW.depth = 1 AND NEW.parent_checkpoint_id IS NOT NULL THEN
    RAISE EXCEPTION 'A depth-one checkpoint cannot have a parent';
  ELSIF NEW.depth > 1 THEN
    IF NEW.parent_checkpoint_id IS NULL THEN
      RAISE EXCEPTION 'A nested checkpoint requires a parent';
    END IF;
    SELECT run_id, depth INTO parent_run_id, parent_depth
    FROM public.studio_branch_checkpoints WHERE id = NEW.parent_checkpoint_id;
    IF NOT FOUND OR parent_run_id IS DISTINCT FROM NEW.run_id
       OR parent_depth + 1 <> NEW.depth THEN
      RAISE EXCEPTION 'Checkpoint parent must be from the same run at the preceding depth';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_studio_validate_branch_checkpoint
  ON public.studio_branch_checkpoints;
CREATE TRIGGER trg_studio_validate_branch_checkpoint
  BEFORE INSERT ON public.studio_branch_checkpoints
  FOR EACH ROW EXECUTE FUNCTION public.studio_validate_branch_checkpoint();

CREATE OR REPLACE FUNCTION public.studio_protect_branch_checkpoint_origin()
RETURNS TRIGGER AS $$
BEGIN
  IF ROW(
    NEW.run_id, NEW.parent_checkpoint_id, NEW.branch_definition_id, NEW.branch_key, NEW.depth,
    NEW.origin_session_id, NEW.origin_screen_id, NEW.origin_release_id,
    NEW.origin_reveal_state_json, NEW.origin_annotations_json,
    NEW.origin_interaction_state_json, NEW.origin_focus_json,
    NEW.destination_session_id, NEW.destination_screen_id, NEW.entered_at
  ) IS DISTINCT FROM ROW(
    OLD.run_id, OLD.parent_checkpoint_id, OLD.branch_definition_id, OLD.branch_key, OLD.depth,
    OLD.origin_session_id, OLD.origin_screen_id, OLD.origin_release_id,
    OLD.origin_reveal_state_json, OLD.origin_annotations_json,
    OLD.origin_interaction_state_json, OLD.origin_focus_json,
    OLD.destination_session_id, OLD.destination_screen_id, OLD.entered_at
  ) THEN
    RAISE EXCEPTION 'Branch checkpoint origin and identity are immutable';
  END IF;
  IF OLD.status <> 'active' THEN
    RAISE EXCEPTION 'Returned or abandoned branch checkpoints are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_studio_protect_branch_checkpoint_origin
  ON public.studio_branch_checkpoints;
CREATE TRIGGER trg_studio_protect_branch_checkpoint_origin
  BEFORE UPDATE ON public.studio_branch_checkpoints
  FOR EACH ROW EXECUTE FUNCTION public.studio_protect_branch_checkpoint_origin();

ALTER TABLE public.studio_branch_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_branch_checkpoints ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.studio_branch_runs, public.studio_branch_checkpoints
  FROM anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.studio_branch_runs_id_seq,
  public.studio_branch_checkpoints_id_seq FROM anon, authenticated, service_role;

COMMENT ON TABLE public.studio_branch_runs IS
  'Teacher-specific presentation runs pinned to one immutable Studio release.';
COMMENT ON TABLE public.studio_branch_checkpoints IS
  'Nested branch return points with immutable origin state and separately mutable branch state.';

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
