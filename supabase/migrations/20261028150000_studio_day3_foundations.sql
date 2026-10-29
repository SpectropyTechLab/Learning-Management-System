-- Day 3: SPECTROPY Studio database foundations.
-- Extends the existing integer client/curriculum model without replacing IDs.

BEGIN;

-- ---------------------------------------------------------------------------
-- Curriculum ownership and multiple sessions per subtopic
-- ---------------------------------------------------------------------------

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS board_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.programs'::regclass
      AND conname = 'programs_board_id_fkey'
  ) THEN
    ALTER TABLE public.programs
      ADD CONSTRAINT programs_board_id_fkey
      FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_programs_board ON public.programs(board_id);

CREATE OR REPLACE FUNCTION public.studio_validate_program_board_ownership()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  board_client_id INTEGER;
BEGIN
  IF NEW.board_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT client_id INTO board_client_id
  FROM public.boards
  WHERE id = NEW.board_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Studio board % does not exist', NEW.board_id;
  END IF;

  IF board_client_id IS NOT NULL AND board_client_id IS DISTINCT FROM NEW.client_id THEN
    RAISE EXCEPTION 'Program client_id % does not match board client_id %', NEW.client_id, board_client_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_studio_program_board_ownership ON public.programs;
CREATE TRIGGER trg_studio_program_board_ownership
BEFORE INSERT OR UPDATE OF board_id, client_id ON public.programs
FOR EACH ROW EXECUTE FUNCTION public.studio_validate_program_board_ownership();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.programs p
    JOIN public.boards b ON b.id = p.board_id
    WHERE b.client_id IS NOT NULL
      AND b.client_id IS DISTINCT FROM p.client_id
  ) THEN
    RAISE EXCEPTION 'Existing Program-to-Board ownership conflict must be resolved before Day 3 migration';
  END IF;
END $$;

-- Remove the earlier one-session-per-subtopic pilot constraint if it exists.
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_subtopic_id_key;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS session_number INTEGER;

WITH numbered AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY subtopic_id
           ORDER BY created_at NULLS LAST, id
         )::INTEGER AS calculated_session_number
  FROM public.sessions
)
UPDATE public.sessions target
SET session_number = numbered.calculated_session_number
FROM numbered
WHERE target.id = numbered.id
  AND target.session_number IS NULL;

ALTER TABLE public.sessions
  ALTER COLUMN session_number SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.sessions'::regclass
      AND conname = 'sessions_session_number_check'
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_session_number_check CHECK (session_number > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.sessions'::regclass
      AND conname = 'sessions_subtopic_session_number_key'
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_subtopic_session_number_key
      UNIQUE (subtopic_id, session_number);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.studio_validate_session_curriculum_ownership()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  program_client_id INTEGER;
BEGIN
  SELECT p.client_id INTO program_client_id
  FROM public.subtopics st
  JOIN public.topics t ON t.id = st.topic_id
  JOIN public.chapters ch ON ch.id = t.chapter_id
  JOIN public.subjects su ON su.id = ch.subject_id
  JOIN public.grades g ON g.id = su.grade_id
  JOIN public.programs p ON p.id = g.program_id
  WHERE st.id = NEW.subtopic_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Studio subtopic % does not resolve to a complete curriculum chain', NEW.subtopic_id;
  END IF;

  IF program_client_id IS NOT NULL THEN
    IF NEW.client_id IS NULL THEN
      NEW.client_id := program_client_id;
    ELSIF NEW.client_id IS DISTINCT FROM program_client_id THEN
      RAISE EXCEPTION 'Session client_id % does not match curriculum client_id %', NEW.client_id, program_client_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_studio_session_curriculum_ownership ON public.sessions;
CREATE TRIGGER trg_studio_session_curriculum_ownership
BEFORE INSERT OR UPDATE OF subtopic_id, client_id ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.studio_validate_session_curriculum_ownership();

-- ---------------------------------------------------------------------------
-- One canonical, revision-safe Session Plan and Screen Script model
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.session_documents (
  id BIGSERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
  document_type VARCHAR(30) NOT NULL
    CHECK (document_type IN ('session_plan', 'screen_script')),
  revision_no INTEGER NOT NULL CHECK (revision_no > 0),
  source_mode VARCHAR(20) NOT NULL
    CHECK (source_mode IN ('upload', 'manual')),
  storage_key TEXT,
  original_file_name TEXT,
  content_type VARCHAR(255),
  size_bytes BIGINT CHECK (size_bytes IS NULL OR size_bytes >= 0),
  content_sha256 CHAR(64)
    CHECK (content_sha256 IS NULL OR content_sha256 ~ '^[0-9a-f]{64}$'),
  manual_content JSONB,
  metadata_json JSONB NOT NULL DEFAULT '{}'::JSONB
    CHECK (jsonb_typeof(metadata_json) = 'object'),
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT session_documents_source_check CHECK (
    (
      source_mode = 'upload'
      AND storage_key IS NOT NULL
      AND original_file_name IS NOT NULL
      AND content_type IS NOT NULL
      AND manual_content IS NULL
    )
    OR
    (
      source_mode = 'manual'
      AND storage_key IS NULL
      AND original_file_name IS NULL
      AND content_type IS NULL
      AND size_bytes IS NULL
      AND content_sha256 IS NULL
      AND manual_content IS NOT NULL
      AND jsonb_typeof(manual_content) IN ('object', 'array')
    )
  ),
  UNIQUE (session_id, document_type, revision_no)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_session_documents_one_current
  ON public.session_documents(session_id, document_type)
  WHERE is_current;
CREATE INDEX IF NOT EXISTS idx_session_documents_history
  ON public.session_documents(session_id, document_type, revision_no DESC);

ALTER TABLE public.session_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.session_documents FROM anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.session_documents_id_seq FROM anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.studio_protect_document_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.session_id IS DISTINCT FROM OLD.session_id
     OR NEW.document_type IS DISTINCT FROM OLD.document_type
     OR NEW.revision_no IS DISTINCT FROM OLD.revision_no
     OR NEW.source_mode IS DISTINCT FROM OLD.source_mode
     OR NEW.storage_key IS DISTINCT FROM OLD.storage_key
     OR NEW.original_file_name IS DISTINCT FROM OLD.original_file_name
     OR NEW.content_type IS DISTINCT FROM OLD.content_type
     OR NEW.size_bytes IS DISTINCT FROM OLD.size_bytes
     OR NEW.content_sha256 IS DISTINCT FROM OLD.content_sha256
     OR NEW.manual_content IS DISTINCT FROM OLD.manual_content
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Session document revision payload is immutable; create a new revision';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_studio_protect_document_revision ON public.session_documents;
CREATE TRIGGER trg_studio_protect_document_revision
BEFORE UPDATE ON public.session_documents
FOR EACH ROW EXECUTE FUNCTION public.studio_protect_document_revision();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.sessions
    WHERE session_plan_file_url IS NOT NULL
      AND session_plan_content IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'A legacy Session Plan has both upload and manual content; resolve before migration';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.screens
    WHERE screen_script_file_url IS NOT NULL
      AND screen_script_content IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'A legacy Screen Script has both upload and manual content; resolve before migration';
  END IF;

  IF EXISTS (
    SELECT session_id
    FROM public.screens
    WHERE screen_script_file_url IS NOT NULL
       OR screen_script_content IS NOT NULL
    GROUP BY session_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'More than one legacy Screen Script exists for a Session; select the canonical original before migration';
  END IF;
END $$;

INSERT INTO public.session_documents (
  session_id, document_type, revision_no, source_mode,
  storage_key, original_file_name, content_type, size_bytes,
  manual_content, metadata_json, is_current, created_by, created_at
)
SELECT s.id,
       'session_plan',
       1,
       CASE WHEN s.session_plan_file_url IS NOT NULL THEN 'upload' ELSE 'manual' END,
       s.session_plan_file_url,
       s.session_plan_file_name,
       s.session_plan_file_type,
       NULL,
       s.session_plan_content,
       jsonb_build_object('legacy_backfill', TRUE, 'metadata_complete', FALSE),
       TRUE,
       s.created_by,
       COALESCE(s.session_plan_uploaded_at, s.created_at, NOW())
FROM public.sessions s
WHERE s.session_plan_file_url IS NOT NULL
   OR s.session_plan_content IS NOT NULL
ON CONFLICT (session_id, document_type, revision_no) DO NOTHING;

INSERT INTO public.session_documents (
  session_id, document_type, revision_no, source_mode,
  storage_key, original_file_name, content_type, size_bytes,
  manual_content, metadata_json, is_current, created_by, created_at
)
SELECT sc.session_id,
       'screen_script',
       1,
       CASE WHEN sc.screen_script_file_url IS NOT NULL THEN 'upload' ELSE 'manual' END,
       sc.screen_script_file_url,
       sc.screen_script_file_name,
       sc.screen_script_file_type,
       NULL,
       sc.screen_script_content,
       jsonb_build_object(
         'legacy_backfill', TRUE,
         'legacy_source_screen_id', sc.id,
         'metadata_complete', FALSE
       ),
       TRUE,
       sc.created_by,
       COALESCE(sc.screen_script_uploaded_at, sc.created_at, NOW())
FROM public.screens sc
WHERE sc.screen_script_file_url IS NOT NULL
   OR sc.screen_script_content IS NOT NULL
ON CONFLICT (session_id, document_type, revision_no) DO NOTHING;

COMMENT ON TABLE public.session_documents IS
  'Canonical Studio Session Plan and Screen Script revisions. Exactly one current revision per session and document type.';
COMMENT ON COLUMN public.sessions.session_plan_file_url IS
  'Legacy compatibility column. New writes use session_documents; removal follows the Day 4 API cutover.';
COMMENT ON COLUMN public.screens.screen_script_file_url IS
  'Legacy compatibility column. Screen Scripts are session-owned in session_documents.';

CREATE OR REPLACE FUNCTION public.studio_limit_legacy_screen_script()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.screen_script_file_url IS NOT NULL OR NEW.screen_script_content IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.screens other
      WHERE other.session_id = NEW.session_id
        AND other.id IS DISTINCT FROM NEW.id
        AND (
          other.screen_script_file_url IS NOT NULL
          OR other.screen_script_content IS NOT NULL
        )
    ) THEN
      RAISE EXCEPTION 'Only one legacy Screen Script is allowed per Studio Session';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_studio_limit_legacy_screen_script ON public.screens;
CREATE TRIGGER trg_studio_limit_legacy_screen_script
BEFORE INSERT OR UPDATE OF session_id, screen_script_file_url, screen_script_content ON public.screens
FOR EACH ROW EXECUTE FUNCTION public.studio_limit_legacy_screen_script();

-- ---------------------------------------------------------------------------
-- Versioned layouts and normalized screen content models
-- ---------------------------------------------------------------------------

ALTER TABLE public.layouts
  ADD COLUMN IF NOT EXISTS layout_key VARCHAR(40),
  ADD COLUMN IF NOT EXISTS version_no INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS canvas_width INTEGER NOT NULL DEFAULT 1920,
  ADD COLUMN IF NOT EXISTS canvas_height INTEGER NOT NULL DEFAULT 1080,
  ADD COLUMN IF NOT EXISTS safe_margin INTEGER NOT NULL DEFAULT 90;

UPDATE public.layouts
SET layout_key = 'legacy-' || id::TEXT
WHERE layout_key IS NULL OR BTRIM(layout_key) = '';

ALTER TABLE public.layouts
  ALTER COLUMN layout_key SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.layouts'::regclass
      AND conname = 'layouts_version_no_check'
  ) THEN
    ALTER TABLE public.layouts
      ADD CONSTRAINT layouts_version_no_check CHECK (version_no > 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.layouts'::regclass
      AND conname = 'layouts_canvas_dimensions_check'
  ) THEN
    ALTER TABLE public.layouts
      ADD CONSTRAINT layouts_canvas_dimensions_check
      CHECK (canvas_width > 0 AND canvas_height > 0 AND safe_margin >= 0
             AND safe_margin * 2 < canvas_width
             AND safe_margin * 2 < canvas_height);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_layouts_tenant_key_version
  ON public.layouts(COALESCE(client_id, 0), LOWER(layout_key), version_no);

ALTER TABLE public.screens
  ADD COLUMN IF NOT EXISTS creation_mode VARCHAR(20) NOT NULL DEFAULT 'layout',
  ADD COLUMN IF NOT EXISTS revision_no INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.screens ALTER COLUMN title SET DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.screens'::regclass
      AND conname = 'screens_creation_mode_check'
  ) THEN
    ALTER TABLE public.screens
      ADD CONSTRAINT screens_creation_mode_check CHECK (creation_mode IN ('blank', 'layout'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.screens'::regclass
      AND conname = 'screens_revision_no_check'
  ) THEN
    ALTER TABLE public.screens
      ADD CONSTRAINT screens_revision_no_check CHECK (revision_no > 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.screens'::regclass
      AND conname = 'screens_id_session_id_key'
  ) THEN
    ALTER TABLE public.screens
      ADD CONSTRAINT screens_id_session_id_key UNIQUE (id, session_id);
  END IF;
END $$;

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
REVOKE ALL ON TABLE public.screen_elements, public.screen_tags, public.screen_branches FROM anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.screen_elements_id_seq, public.screen_branches_id_seq FROM anon, authenticated, service_role;

-- Validate legacy JSON before normalizing it. Ambiguous data stops the migration.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.screens s
    CROSS JOIN LATERAL jsonb_array_elements(s.elements_json) element
    WHERE jsonb_typeof(element) <> 'object'
       OR NULLIF(BTRIM(element->>'id'), '') IS NULL
       OR COALESCE(element->>'type', '') NOT IN (
         'title', 'text', 'visual', 'question', 'response', 'steps', 'workspace',
         'footer', 'simulation', 'activity', 'media', 'graph', 'data', 'options'
       )
  ) THEN
    RAISE EXCEPTION 'Legacy screen element JSON is not compatible with the Day 3 typed element contract';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.screens s
    CROSS JOIN LATERAL jsonb_array_elements(s.branch_tags_json) tag
    WHERE jsonb_typeof(tag) <> 'string' OR BTRIM(tag #>> '{}') = ''
  ) THEN
    RAISE EXCEPTION 'Legacy screen tag JSON contains a non-string or blank tag';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.screens source
    CROSS JOIN LATERAL jsonb_array_elements(source.branches_json) branch
    LEFT JOIN public.screens destination
      ON destination.id = CASE
        WHEN COALESCE(branch->>'destinationScreenId', branch->>'destination_screen_id', '') ~ '^[1-9][0-9]*$'
        THEN COALESCE(branch->>'destinationScreenId', branch->>'destination_screen_id')::INTEGER
      END
    LEFT JOIN public.screens return_screen
      ON return_screen.id = CASE
        WHEN COALESCE(branch #>> '{returnState,returnScreenId}', branch->>'return_screen_id', '') ~ '^[1-9][0-9]*$'
        THEN COALESCE(branch #>> '{returnState,returnScreenId}', branch->>'return_screen_id')::INTEGER
      END
    WHERE jsonb_typeof(branch) <> 'object'
       OR NULLIF(BTRIM(branch->>'id'), '') IS NULL
       OR destination.id IS NULL
       OR destination.session_id <> source.session_id
       OR return_screen.id IS NULL
       OR return_screen.session_id <> source.session_id
  ) THEN
    RAISE EXCEPTION 'Legacy branch JSON lacks a valid same-session destination or return screen';
  END IF;
END $$;

INSERT INTO public.screen_elements (
  screen_id, element_key, slot_id, element_type,
  content_json, position_json, display_order
)
SELECT s.id,
       element->>'id',
       COALESCE(element->>'slotId', element->>'slot_id'),
       element->>'type',
       element,
       COALESCE(element->'bounds', '{}'::JSONB),
       (ordinality - 1)::INTEGER
FROM public.screens s
CROSS JOIN LATERAL jsonb_array_elements(s.elements_json) WITH ORDINALITY AS entry(element, ordinality)
ON CONFLICT (screen_id, element_key) DO NOTHING;

INSERT INTO public.screen_tags (screen_id, tag)
SELECT DISTINCT s.id, LOWER(BTRIM(tag #>> '{}'))
FROM public.screens s
CROSS JOIN LATERAL jsonb_array_elements(s.branch_tags_json) tag
ON CONFLICT (screen_id, tag) DO NOTHING;

INSERT INTO public.screen_branches (
  session_id, branch_key, source_screen_id, destination_screen_id,
  trigger_kind, trigger_config_json, return_screen_id,
  restore_screen_state, restore_session_state, display_order
)
SELECT source.session_id,
       branch->>'id',
       source.id,
       COALESCE(branch->>'destinationScreenId', branch->>'destination_screen_id')::INTEGER,
       COALESCE(branch #>> '{trigger,kind}', branch->>'triggerKind', 'manual'),
       COALESCE(branch->'trigger', '{}'::JSONB),
       COALESCE(branch #>> '{returnState,returnScreenId}', branch->>'return_screen_id')::INTEGER,
       COALESCE((branch #>> '{returnState,restoreScreenState}')::BOOLEAN, TRUE),
       COALESCE((branch #>> '{returnState,restoreSessionState}')::BOOLEAN, TRUE),
       (ordinality - 1)::INTEGER
FROM public.screens source
CROSS JOIN LATERAL jsonb_array_elements(source.branches_json) WITH ORDINALITY AS entry(branch, ordinality)
ON CONFLICT (source_screen_id, branch_key) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.resource_mappings'::regclass
      AND conname = 'resource_mappings_screen_element_fkey'
  ) THEN
    ALTER TABLE public.resource_mappings
      ADD CONSTRAINT resource_mappings_screen_element_fkey
      FOREIGN KEY (screen_id, element_id)
      REFERENCES public.screen_elements(screen_id, element_key)
      ON DELETE CASCADE;
  END IF;
END $$;

DROP INDEX IF EXISTS public.idx_screens_branch_tags;
ALTER TABLE public.screens
  DROP COLUMN elements_json,
  DROP COLUMN branches_json,
  DROP COLUMN branch_tags_json;

COMMENT ON COLUMN public.screens.creation_mode IS
  'How the screen was created. blank starts with no layout and no elements; layout starts from a selected layout version.';
COMMENT ON TABLE public.screen_elements IS
  'Canonical typed Studio elements. Replaces screens.elements_json.';
COMMENT ON TABLE public.screen_tags IS
  'Canonical normalized multi-tag discovery values. Replaces screens.branch_tags_json.';
COMMENT ON TABLE public.screen_branches IS
  'Canonical same-session branch destinations and explicit return-state references. Replaces screens.branches_json.';

COMMIT;
