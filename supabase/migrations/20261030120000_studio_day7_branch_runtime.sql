-- Day 7: teacher-specific Studio branch runs and protected return checkpoints.
-- Authored Screens/branches and immutable releases remain unchanged.

BEGIN;

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
  origin_reveal_state_json JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(origin_reveal_state_json) = 'object'),
  origin_annotations_json JSONB NOT NULL DEFAULT '[]'::JSONB CHECK (jsonb_typeof(origin_annotations_json) = 'array'),
  origin_interaction_state_json JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(origin_interaction_state_json) = 'object'),
  origin_focus_json JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(origin_focus_json) = 'object'),
  destination_session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
  destination_screen_id INTEGER NOT NULL REFERENCES public.screens(id) ON DELETE RESTRICT,
  branch_reveal_state_json JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(branch_reveal_state_json) = 'object'),
  branch_annotations_json JSONB NOT NULL DEFAULT '[]'::JSONB CHECK (jsonb_typeof(branch_annotations_json) = 'array'),
  branch_interaction_state_json JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(branch_interaction_state_json) = 'object'),
  branch_focus_json JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(branch_focus_json) = 'object'),
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
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  release_client_id INTEGER;
  release_session_id INTEGER;
  teacher_client_id INTEGER;
BEGIN
  SELECT client_id, session_id INTO release_client_id, release_session_id
  FROM public.session_releases WHERE id = NEW.release_id;
  SELECT client_id INTO teacher_client_id FROM public.users WHERE id = NEW.teacher_id;
  IF release_client_id IS DISTINCT FROM NEW.client_id OR teacher_client_id IS DISTINCT FROM NEW.client_id THEN
    RAISE EXCEPTION 'Branch run tenant must match its teacher and release';
  END IF;
  IF release_session_id IS DISTINCT FROM NEW.root_session_id OR
     release_session_id IS DISTINCT FROM NEW.current_session_id THEN
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
    IF OLD.status = 'active' AND NEW.status NOT IN ('active', 'completed', 'abandoned') THEN
      RAISE EXCEPTION 'Invalid branch run status transition';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_studio_validate_branch_run ON public.studio_branch_runs;
CREATE TRIGGER trg_studio_validate_branch_run
BEFORE INSERT OR UPDATE ON public.studio_branch_runs
FOR EACH ROW EXECUTE FUNCTION public.studio_validate_branch_run();

CREATE OR REPLACE FUNCTION public.studio_validate_branch_checkpoint()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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
    IF NOT FOUND OR parent_run_id IS DISTINCT FROM NEW.run_id OR parent_depth + 1 <> NEW.depth THEN
      RAISE EXCEPTION 'Checkpoint parent must be from the same run at the preceding depth';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_studio_validate_branch_checkpoint ON public.studio_branch_checkpoints;
CREATE TRIGGER trg_studio_validate_branch_checkpoint
BEFORE INSERT ON public.studio_branch_checkpoints
FOR EACH ROW EXECUTE FUNCTION public.studio_validate_branch_checkpoint();

CREATE OR REPLACE FUNCTION public.studio_protect_branch_checkpoint_origin()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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
$$;

DROP TRIGGER IF EXISTS trg_studio_protect_branch_checkpoint_origin ON public.studio_branch_checkpoints;
CREATE TRIGGER trg_studio_protect_branch_checkpoint_origin
BEFORE UPDATE ON public.studio_branch_checkpoints
FOR EACH ROW EXECUTE FUNCTION public.studio_protect_branch_checkpoint_origin();

ALTER TABLE public.studio_branch_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_branch_checkpoints ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.studio_branch_runs, public.studio_branch_checkpoints FROM anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.studio_branch_runs_id_seq, public.studio_branch_checkpoints_id_seq FROM anon, authenticated, service_role;

COMMENT ON TABLE public.studio_branch_runs IS
  'Teacher-specific presentation runs pinned to one immutable Studio release.';
COMMENT ON TABLE public.studio_branch_checkpoints IS
  'Nested branch return points with immutable origin state and separately mutable branch state.';

COMMIT;
