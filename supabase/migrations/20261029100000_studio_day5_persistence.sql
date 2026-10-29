-- Day 5 persistence: exact-revision workflow evidence and optimistic
-- concurrency for editable Studio sessions.

BEGIN;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS revision_no INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.sessions'::regclass
      AND conname = 'sessions_revision_no_check'
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_revision_no_check CHECK (revision_no > 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.session_validations (
  id BIGSERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  session_revision_no INTEGER NOT NULL CHECK (session_revision_no > 0),
  session_plan_document_id BIGINT REFERENCES public.session_documents(id) ON DELETE RESTRICT,
  screen_script_document_id BIGINT REFERENCES public.session_documents(id) ON DELETE RESTRICT,
  screen_revisions_json JSONB NOT NULL DEFAULT '[]'::JSONB
    CHECK (jsonb_typeof(screen_revisions_json) = 'array'),
  is_valid BOOLEAN NOT NULL,
  validation_errors_json JSONB NOT NULL DEFAULT '[]'::JSONB
    CHECK (jsonb_typeof(validation_errors_json) = 'array'),
  validated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_validations_revision
  ON public.session_validations(session_id, session_revision_no, validated_at DESC);

CREATE TABLE IF NOT EXISTS public.session_authorizations (
  id BIGSERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  validation_id BIGINT NOT NULL REFERENCES public.session_validations(id) ON DELETE RESTRICT,
  decision VARCHAR(20) NOT NULL CHECK (decision IN ('authorized', 'rejected')),
  comment TEXT,
  authorized_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  authorized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invalidated_at TIMESTAMPTZ,
  invalidation_reason TEXT,
  CONSTRAINT session_authorizations_rejection_comment_check
    CHECK (decision <> 'rejected' OR NULLIF(BTRIM(comment), '') IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_session_authorizations_one_current
  ON public.session_authorizations(session_id)
  WHERE decision = 'authorized' AND invalidated_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_session_authorizations_validation
  ON public.session_authorizations(validation_id);

ALTER TABLE public.session_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_authorizations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.session_validations, public.session_authorizations
  FROM anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.session_validations_id_seq,
  public.session_authorizations_id_seq FROM anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.studio_invalidate_authorization_on_revision_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.revision_no IS DISTINCT FROM OLD.revision_no THEN
    UPDATE public.session_authorizations
    SET invalidated_at = COALESCE(invalidated_at, NOW()),
        invalidation_reason = COALESCE(invalidation_reason, 'session_revision_changed')
    WHERE session_id = NEW.id
      AND decision = 'authorized'
      AND invalidated_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_studio_invalidate_authorization ON public.sessions;
CREATE TRIGGER trg_studio_invalidate_authorization
AFTER UPDATE OF revision_no ON public.sessions
FOR EACH ROW
WHEN (NEW.revision_no IS DISTINCT FROM OLD.revision_no)
EXECUTE FUNCTION public.studio_invalidate_authorization_on_revision_change();

COMMENT ON COLUMN public.sessions.revision_no IS
  'Optimistic-concurrency revision for the complete editable Studio session.';
COMMENT ON TABLE public.session_validations IS
  'Immutable validation evidence for one exact session, document and screen revision set.';
COMMENT ON TABLE public.session_authorizations IS
  'Academic authorization decisions tied to an immutable exact-revision validation record.';

COMMIT;
