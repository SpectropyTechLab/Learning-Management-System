-- Day 7 SCORM attempt and per-SCO runtime persistence.
-- Supports SCORM 1.2 and SCORM 2004 data-model snapshots while keeping
-- multi-SCO state independent inside one immutable Resource version.

BEGIN;

CREATE TABLE IF NOT EXISTS public.studio_scorm_attempts (
  id BIGSERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES public.clients(id) ON DELETE RESTRICT,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  resource_id INTEGER NOT NULL REFERENCES public.resources(id) ON DELETE RESTRICT,
  resource_version_id INTEGER NOT NULL,
  release_id BIGINT REFERENCES public.session_releases(id) ON DELETE RESTRICT,
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  edition VARCHAR(10) NOT NULL CHECK (edition IN ('1.2', '2004')),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'completed', 'terminated', 'abandoned')),
  current_sco_identifier TEXT NOT NULL CHECK (BTRIM(current_sco_identifier) <> ''),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT studio_scorm_attempt_resource_version_fkey
    FOREIGN KEY (resource_id, resource_version_id)
    REFERENCES public.resource_versions(resource_id, id) ON DELETE RESTRICT,
  UNIQUE (user_id, resource_version_id, attempt_number)
);

CREATE TABLE IF NOT EXISTS public.studio_scorm_sco_states (
  id BIGSERIAL PRIMARY KEY,
  attempt_id BIGINT NOT NULL REFERENCES public.studio_scorm_attempts(id) ON DELETE CASCADE,
  sco_identifier TEXT NOT NULL CHECK (BTRIM(sco_identifier) <> ''),
  launch_path TEXT NOT NULL CHECK (BTRIM(launch_path) <> ''),
  display_order INTEGER NOT NULL CHECK (display_order >= 0),
  completion_status VARCHAR(20) NOT NULL DEFAULT 'unknown'
    CHECK (completion_status IN ('unknown', 'not_attempted', 'incomplete', 'completed')),
  success_status VARCHAR(20) NOT NULL DEFAULT 'unknown'
    CHECK (success_status IN ('unknown', 'passed', 'failed')),
  score_raw NUMERIC,
  score_min NUMERIC,
  score_max NUMERIC,
  score_scaled NUMERIC CHECK (score_scaled IS NULL OR score_scaled BETWEEN -1 AND 1),
  location TEXT,
  suspend_data TEXT,
  total_time_seconds NUMERIC NOT NULL DEFAULT 0 CHECK (total_time_seconds >= 0),
  session_time_seconds NUMERIC NOT NULL DEFAULT 0 CHECK (session_time_seconds >= 0),
  data_model_json JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(data_model_json) = 'object'),
  sequencing_json JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(sequencing_json) = 'object'),
  initialized_at TIMESTAMPTZ,
  committed_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (attempt_id, sco_identifier)
);

CREATE INDEX IF NOT EXISTS idx_studio_scorm_attempt_resume
  ON public.studio_scorm_attempts(user_id, resource_version_id, status, attempt_number DESC);
CREATE INDEX IF NOT EXISTS idx_studio_scorm_attempt_release
  ON public.studio_scorm_attempts(release_id, user_id);
CREATE INDEX IF NOT EXISTS idx_studio_scorm_sco_order
  ON public.studio_scorm_sco_states(attempt_id, display_order);

ALTER TABLE public.studio_scorm_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_scorm_sco_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.studio_scorm_attempts, public.studio_scorm_sco_states
  FROM anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.studio_scorm_attempts_id_seq,
  public.studio_scorm_sco_states_id_seq FROM anon, authenticated, service_role;

COMMENT ON TABLE public.studio_scorm_attempts IS
  'Studio SCORM attempts pinned to one immutable Resource version and optional published release.';
COMMENT ON TABLE public.studio_scorm_sco_states IS
  'Independent SCORM runtime data-model and resume state for each SCO in an attempt.';

COMMIT;
