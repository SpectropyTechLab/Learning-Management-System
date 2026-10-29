-- Day 6: immutable, revision-pinned Studio publication manifests.

BEGIN;

CREATE TABLE IF NOT EXISTS public.session_releases (
  id BIGSERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES public.clients(id) ON DELETE RESTRICT,
  session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
  release_number INTEGER NOT NULL CHECK (release_number > 0),
  session_revision_no INTEGER NOT NULL CHECK (session_revision_no > 0),
  validation_id BIGINT NOT NULL REFERENCES public.session_validations(id) ON DELETE RESTRICT,
  authorization_id BIGINT NOT NULL REFERENCES public.session_authorizations(id) ON DELETE RESTRICT,
  manifest_json JSONB NOT NULL CHECK (jsonb_typeof(manifest_json) = 'object'),
  published_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, release_number),
  UNIQUE (session_id, session_revision_no)
);

-- Permit upgrading a development database that previously ran the unregistered
-- draft schema, where session_releases existed without exact-revision columns.
ALTER TABLE public.session_releases
  ADD COLUMN IF NOT EXISTS session_revision_no INTEGER,
  ADD COLUMN IF NOT EXISTS validation_id BIGINT,
  ADD COLUMN IF NOT EXISTS authorization_id BIGINT;

WITH evidence AS (
  SELECT sr.id AS release_id, sr.manifest_json, sv.id AS validation_id,
         sv.session_revision_no, sa.id AS authorization_id
  FROM public.session_releases sr
  JOIN LATERAL (
    SELECT candidate.* FROM public.session_validations candidate
    WHERE candidate.session_id = sr.session_id AND candidate.is_valid = TRUE
    ORDER BY candidate.validated_at DESC, candidate.id DESC LIMIT 1
  ) sv ON TRUE
  JOIN LATERAL (
    SELECT candidate.* FROM public.session_authorizations candidate
    WHERE candidate.session_id = sr.session_id AND candidate.validation_id = sv.id
      AND candidate.decision = 'authorized'
    ORDER BY candidate.authorized_at DESC, candidate.id DESC LIMIT 1
  ) sa ON TRUE
)
UPDATE public.session_releases sr
SET session_revision_no = COALESCE(
      NULLIF(evidence.manifest_json #>> '{session,revision_no}', '')::INTEGER,
      evidence.session_revision_no
    ),
    validation_id = evidence.validation_id,
    authorization_id = evidence.authorization_id
FROM evidence
WHERE sr.id = evidence.release_id
  AND (sr.session_revision_no IS NULL OR sr.validation_id IS NULL OR sr.authorization_id IS NULL);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.session_releases
    WHERE session_revision_no IS NULL OR validation_id IS NULL OR authorization_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Existing Studio release rows lack exact authorization evidence; reconcile before Day 6 migration';
  END IF;
END $$;

ALTER TABLE public.session_releases
  ALTER COLUMN session_revision_no SET NOT NULL,
  ALTER COLUMN validation_id SET NOT NULL,
  ALTER COLUMN authorization_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_releases_session_revision_no_check'
    AND conrelid = 'public.session_releases'::regclass) THEN
    ALTER TABLE public.session_releases ADD CONSTRAINT session_releases_session_revision_no_check
      CHECK (session_revision_no > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_releases_validation_id_fkey'
    AND conrelid = 'public.session_releases'::regclass) THEN
    ALTER TABLE public.session_releases ADD CONSTRAINT session_releases_validation_id_fkey
      FOREIGN KEY (validation_id) REFERENCES public.session_validations(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_releases_authorization_id_fkey'
    AND conrelid = 'public.session_releases'::regclass) THEN
    ALTER TABLE public.session_releases ADD CONSTRAINT session_releases_authorization_id_fkey
      FOREIGN KEY (authorization_id) REFERENCES public.session_authorizations(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_session_releases_one_session_revision
  ON public.session_releases(session_id, session_revision_no);

CREATE INDEX IF NOT EXISTS idx_session_releases_latest
  ON public.session_releases(client_id, session_id, release_number DESC);

CREATE OR REPLACE FUNCTION public.studio_prevent_release_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Published Studio releases are immutable; create a new release instead';
END;
$$;

DROP TRIGGER IF EXISTS trg_session_releases_immutable ON public.session_releases;
DROP TRIGGER IF EXISTS trg_studio_releases_immutable ON public.session_releases;
CREATE TRIGGER trg_studio_releases_immutable
BEFORE UPDATE OR DELETE ON public.session_releases
FOR EACH ROW EXECUTE FUNCTION public.studio_prevent_release_mutation();

ALTER TABLE public.session_releases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.session_releases FROM anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.session_releases_id_seq FROM anon, authenticated, service_role;

COMMENT ON TABLE public.session_releases IS
  'Append-only teacher-facing snapshots pinned to exact authorized Studio revisions.';
COMMENT ON COLUMN public.session_releases.manifest_json IS
  'Frozen Session, document, Screen, layout, Resource-version, placement, tag and branch payload.';

COMMIT;
