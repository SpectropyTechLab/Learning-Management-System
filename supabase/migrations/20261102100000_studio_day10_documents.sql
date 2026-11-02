-- Day 10: editable Session Plans, per-Screen Scripts and chapter Curriculum originals.
-- This is forward-only and preserves all Day 3-9 document revisions.

BEGIN;

ALTER TABLE public.session_documents
  ADD COLUMN IF NOT EXISTS structured_content JSONB;

UPDATE public.session_documents
SET structured_content = manual_content
WHERE structured_content IS NULL AND manual_content IS NOT NULL;

ALTER TABLE public.session_documents
  DROP CONSTRAINT IF EXISTS session_documents_source_check;

ALTER TABLE public.session_documents
  ADD CONSTRAINT session_documents_source_check CHECK (
    structured_content IS NULL OR jsonb_typeof(structured_content) IN ('object', 'array')
  );

ALTER TABLE public.session_documents
  ADD CONSTRAINT session_documents_payload_check CHECK (
    (
      source_mode = 'upload'
      AND storage_key IS NOT NULL
      AND original_file_name IS NOT NULL
      AND content_type IS NOT NULL
      AND size_bytes IS NOT NULL
      AND content_sha256 IS NOT NULL
    )
    OR
    (
      source_mode = 'manual'
      AND storage_key IS NULL
      AND original_file_name IS NULL
      AND content_type IS NULL
      AND size_bytes IS NULL
      AND content_sha256 IS NULL
      AND structured_content IS NOT NULL
    )
  );

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
     OR NEW.structured_content IS DISTINCT FROM OLD.structured_content
     OR NEW.metadata_json IS DISTINCT FROM OLD.metadata_json
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Session document revision payload is immutable; create a new revision';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.screen_script_revisions (
  id BIGSERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
  screen_id INTEGER NOT NULL REFERENCES public.screens(id) ON DELETE RESTRICT,
  revision_no INTEGER NOT NULL CHECK (revision_no > 0),
  source_mode VARCHAR(20) NOT NULL CHECK (source_mode IN ('manual', 'import')),
  source_document_id BIGINT REFERENCES public.session_documents(id) ON DELETE RESTRICT,
  content_json JSONB NOT NULL CHECK (jsonb_typeof(content_json) = 'object'),
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT screen_script_revision_source_check CHECK (
    (source_mode = 'manual' AND source_document_id IS NULL)
    OR (source_mode = 'import' AND source_document_id IS NOT NULL)
  ),
  UNIQUE (screen_id, revision_no)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_screen_script_revisions_one_current
  ON public.screen_script_revisions(screen_id) WHERE is_current;
CREATE INDEX IF NOT EXISTS idx_screen_script_revisions_session
  ON public.screen_script_revisions(session_id, screen_id, revision_no DESC);

CREATE OR REPLACE FUNCTION public.studio_validate_screen_script_session()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.screens
    WHERE id = NEW.screen_id AND session_id = NEW.session_id
  ) THEN
    RAISE EXCEPTION 'Screen Script Screen must belong to the same Session';
  END IF;
  IF NEW.source_document_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.session_documents
    WHERE id = NEW.source_document_id
      AND session_id = NEW.session_id
      AND document_type = 'screen_script'
  ) THEN
    RAISE EXCEPTION 'Imported Screen Script source must be a Screen Script document for the same Session';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_studio_validate_screen_script_session ON public.screen_script_revisions;
CREATE TRIGGER trg_studio_validate_screen_script_session
BEFORE INSERT OR UPDATE ON public.screen_script_revisions
FOR EACH ROW EXECUTE FUNCTION public.studio_validate_screen_script_session();

CREATE OR REPLACE FUNCTION public.studio_protect_screen_script_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.session_id IS DISTINCT FROM OLD.session_id
     OR NEW.screen_id IS DISTINCT FROM OLD.screen_id
     OR NEW.revision_no IS DISTINCT FROM OLD.revision_no
     OR NEW.source_mode IS DISTINCT FROM OLD.source_mode
     OR NEW.source_document_id IS DISTINCT FROM OLD.source_document_id
     OR NEW.content_json IS DISTINCT FROM OLD.content_json
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Screen Script revision payload is immutable; create a new revision';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_studio_protect_screen_script_revision ON public.screen_script_revisions;
CREATE TRIGGER trg_studio_protect_screen_script_revision
BEFORE UPDATE ON public.screen_script_revisions
FOR EACH ROW EXECUTE FUNCTION public.studio_protect_screen_script_revision();

CREATE TABLE IF NOT EXISTS public.chapter_curriculum_documents (
  id BIGSERIAL PRIMARY KEY,
  chapter_id INTEGER NOT NULL REFERENCES public.chapters(id) ON DELETE RESTRICT,
  revision_no INTEGER NOT NULL CHECK (revision_no > 0),
  storage_key TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  content_type VARCHAR(255) NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  content_sha256 CHAR(64) NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  metadata_json JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(metadata_json) = 'object'),
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (chapter_id, revision_no)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chapter_curriculum_documents_one_current
  ON public.chapter_curriculum_documents(chapter_id) WHERE is_current;
CREATE INDEX IF NOT EXISTS idx_chapter_curriculum_documents_history
  ON public.chapter_curriculum_documents(chapter_id, revision_no DESC);

ALTER TABLE public.session_validations
  ADD COLUMN IF NOT EXISTS screen_script_revisions_json JSONB NOT NULL DEFAULT '[]'::JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.session_validations'::regclass
      AND conname = 'session_validations_screen_script_revisions_check'
  ) THEN
    ALTER TABLE public.session_validations
      ADD CONSTRAINT session_validations_screen_script_revisions_check
      CHECK (jsonb_typeof(screen_script_revisions_json) = 'array');
  END IF;
END $$;

ALTER TABLE public.screen_script_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_curriculum_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.screen_script_revisions, public.chapter_curriculum_documents
  FROM anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.screen_script_revisions_id_seq,
  public.chapter_curriculum_documents_id_seq FROM anon, authenticated, service_role;

COMMENT ON COLUMN public.session_documents.structured_content IS
  'Editable structured representation. Upload revisions retain both original bytes and extracted/corrected content.';
COMMENT ON TABLE public.screen_script_revisions IS
  'Immutable editable Screen Script revisions; one current revision per Studio Screen.';
COMMENT ON TABLE public.chapter_curriculum_documents IS
  'Revision-safe original Curriculum document for a Board-Program-Grade-Subject-Chapter selection.';

COMMIT;
