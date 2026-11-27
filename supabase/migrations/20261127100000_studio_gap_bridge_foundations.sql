-- Gap Bridge milestone 1: distinguish linear Screens from locally owned child
-- Screens and add the relational foundation for author-curated Gap Bridges.
-- Existing Branching and Zoom tables remain unchanged.

BEGIN;

ALTER TABLE public.screens
  ADD COLUMN IF NOT EXISTS screen_kind VARCHAR(30) NOT NULL DEFAULT 'main',
  ADD COLUMN IF NOT EXISTS parent_screen_id INTEGER;

UPDATE public.screens
SET screen_kind = 'main'
WHERE screen_kind IS NULL;

ALTER TABLE public.screens
  DROP CONSTRAINT IF EXISTS screens_session_id_screen_number_key;

ALTER TABLE public.screens
  ALTER COLUMN screen_number DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.screens'::regclass
      AND conname = 'screens_screen_kind_check'
  ) THEN
    ALTER TABLE public.screens
      ADD CONSTRAINT screens_screen_kind_check
      CHECK (screen_kind IN ('main', 'gap_bridge_child'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.screens'::regclass
      AND conname = 'screens_kind_shape_check'
  ) THEN
    ALTER TABLE public.screens
      ADD CONSTRAINT screens_kind_shape_check CHECK (
        (screen_kind = 'main' AND parent_screen_id IS NULL AND screen_number IS NOT NULL)
        OR
        (screen_kind = 'gap_bridge_child' AND parent_screen_id IS NOT NULL AND screen_number IS NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.screens'::regclass
      AND conname = 'screens_parent_screen_fkey'
  ) THEN
    ALTER TABLE public.screens
      ADD CONSTRAINT screens_parent_screen_fkey
      FOREIGN KEY (parent_screen_id)
      REFERENCES public.screens(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS screens_main_session_number_uq
  ON public.screens(session_id, screen_number)
  WHERE screen_kind = 'main';

CREATE INDEX IF NOT EXISTS screens_parent_lookup_idx
  ON public.screens(parent_screen_id, id)
  WHERE parent_screen_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.studio_validate_screen_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_session_id INTEGER;
  parent_kind VARCHAR(30);
BEGIN
  IF NEW.screen_kind = 'gap_bridge_child' THEN
    IF NEW.parent_screen_id = NEW.id THEN
      RAISE EXCEPTION 'A Gap Bridge child Screen cannot be its own parent';
    END IF;

    SELECT session_id, screen_kind
    INTO parent_session_id, parent_kind
    FROM public.screens
    WHERE id = NEW.parent_screen_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Gap Bridge parent Screen does not exist';
    END IF;
    IF parent_session_id IS DISTINCT FROM NEW.session_id THEN
      RAISE EXCEPTION 'Gap Bridge child and parent Screens must belong to the same Session';
    END IF;
    IF parent_kind <> 'main' THEN
      RAISE EXCEPTION 'A Gap Bridge child Screen cannot own another child Screen';
    END IF;
  END IF;

  IF NEW.screen_kind <> 'main' AND EXISTS (
    SELECT 1 FROM public.screens child
    WHERE child.parent_screen_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'A parent Screen with Gap Bridge children must remain a main Screen';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_studio_validate_screen_hierarchy ON public.screens;
CREATE TRIGGER trg_studio_validate_screen_hierarchy
  BEFORE INSERT OR UPDATE OF session_id, screen_kind, parent_screen_id, screen_number
  ON public.screens
  FOR EACH ROW EXECUTE FUNCTION public.studio_validate_screen_hierarchy();

CREATE TABLE IF NOT EXISTS public.gap_bridges (
  id BIGSERIAL PRIMARY KEY,
  source_session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  source_screen_id INTEGER NOT NULL,
  name VARCHAR(120) NOT NULL CHECK (BTRIM(name) <> ''),
  target_kind VARCHAR(20) NOT NULL CHECK (target_kind IN ('child', 'external')),
  child_screen_id INTEGER REFERENCES public.screens(id) ON DELETE CASCADE,
  external_session_id INTEGER,
  external_screen_id INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gap_bridges_source_session_fkey
    FOREIGN KEY (source_screen_id, source_session_id)
    REFERENCES public.screens(id, session_id) ON DELETE CASCADE,
  CONSTRAINT gap_bridges_target_shape_check CHECK (
    (
      target_kind = 'child'
      AND child_screen_id IS NOT NULL
      AND external_session_id IS NULL
      AND external_screen_id IS NULL
    )
    OR
    (
      target_kind = 'external'
      AND child_screen_id IS NULL
      AND external_session_id IS NOT NULL
      AND external_session_id > 0
      AND external_screen_id IS NOT NULL
      AND external_screen_id > 0
    )
  ),
  CONSTRAINT gap_bridges_external_session_check CHECK (
    target_kind <> 'external' OR external_session_id <> source_session_id
  ),
  UNIQUE (source_screen_id, display_order)
);

CREATE UNIQUE INDEX IF NOT EXISTS gap_bridges_source_name_uq
  ON public.gap_bridges(source_screen_id, LOWER(BTRIM(name)));

CREATE UNIQUE INDEX IF NOT EXISTS gap_bridges_child_owner_uq
  ON public.gap_bridges(child_screen_id)
  WHERE child_screen_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS gap_bridges_source_order_idx
  ON public.gap_bridges(source_screen_id, display_order, id);

CREATE INDEX IF NOT EXISTS gap_bridges_external_target_idx
  ON public.gap_bridges(external_session_id, external_screen_id)
  WHERE target_kind = 'external';

CREATE OR REPLACE FUNCTION public.studio_validate_gap_bridge()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  source_kind VARCHAR(30);
  child_session_id INTEGER;
  child_kind VARCHAR(30);
  child_parent_screen_id INTEGER;
BEGIN
  SELECT screen_kind
  INTO source_kind
  FROM public.screens
  WHERE id = NEW.source_screen_id AND session_id = NEW.source_session_id;

  IF NOT FOUND OR source_kind <> 'main' THEN
    RAISE EXCEPTION 'Gap Bridges require a main source Screen';
  END IF;

  IF NEW.target_kind = 'child' THEN
    SELECT session_id, screen_kind, parent_screen_id
    INTO child_session_id, child_kind, child_parent_screen_id
    FROM public.screens
    WHERE id = NEW.child_screen_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Gap Bridge child Screen does not exist';
    END IF;
    IF child_session_id IS DISTINCT FROM NEW.source_session_id
       OR child_kind <> 'gap_bridge_child'
       OR child_parent_screen_id IS DISTINCT FROM NEW.source_screen_id THEN
      RAISE EXCEPTION 'Gap Bridge child must belong exclusively to its main parent Screen';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_studio_validate_gap_bridge ON public.gap_bridges;
CREATE TRIGGER trg_studio_validate_gap_bridge
  BEFORE INSERT OR UPDATE OF source_session_id, source_screen_id, target_kind,
    child_screen_id, external_session_id, external_screen_id
  ON public.gap_bridges
  FOR EACH ROW EXECUTE FUNCTION public.studio_validate_gap_bridge();

CREATE OR REPLACE FUNCTION public.studio_validate_gap_bridge_child_ownership()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  candidate_id INTEGER;
  candidate_ids INTEGER[];
  candidate_kind VARCHAR(30);
  candidate_parent_screen_id INTEGER;
  candidate_session_id INTEGER;
  owner_count INTEGER;
  owner_source_screen_id INTEGER;
  owner_source_session_id INTEGER;
BEGIN
  IF TG_TABLE_NAME = 'screens' THEN
    IF TG_OP = 'DELETE' THEN candidate_ids := ARRAY[OLD.id];
    ELSE candidate_ids := ARRAY[NEW.id];
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    candidate_ids := ARRAY[NEW.child_screen_id];
  ELSIF TG_OP = 'DELETE' THEN
    candidate_ids := ARRAY[OLD.child_screen_id];
  ELSE
    candidate_ids := ARRAY[OLD.child_screen_id, NEW.child_screen_id];
  END IF;

  FOREACH candidate_id IN ARRAY candidate_ids LOOP
    IF candidate_id IS NULL THEN CONTINUE; END IF;

    SELECT screen_kind, parent_screen_id, session_id
    INTO candidate_kind, candidate_parent_screen_id, candidate_session_id
    FROM public.screens WHERE id = candidate_id;
    IF NOT FOUND THEN CONTINUE; END IF;

    SELECT COUNT(*)::INTEGER, MIN(source_screen_id), MIN(source_session_id)
    INTO owner_count, owner_source_screen_id, owner_source_session_id
    FROM public.gap_bridges
    WHERE child_screen_id = candidate_id;

    IF candidate_kind = 'gap_bridge_child' AND owner_count <> 1 THEN
      RAISE EXCEPTION 'A Gap Bridge child Screen must be owned by exactly one Gap Bridge';
    ELSIF candidate_kind = 'gap_bridge_child' AND EXISTS (
      SELECT 1 FROM public.gap_bridges
      WHERE source_screen_id = candidate_id
    ) THEN
      RAISE EXCEPTION 'A Gap Bridge child Screen cannot own Gap Bridges';
    ELSIF candidate_kind = 'gap_bridge_child'
       AND (owner_source_screen_id IS DISTINCT FROM candidate_parent_screen_id
            OR owner_source_session_id IS DISTINCT FROM candidate_session_id) THEN
      RAISE EXCEPTION 'A Gap Bridge child Screen and its owning mapping must name the same parent';
    ELSIF candidate_kind <> 'gap_bridge_child' AND owner_count <> 0 THEN
      RAISE EXCEPTION 'A local Gap Bridge target must remain a Gap Bridge child Screen';
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_studio_validate_child_screen_owner ON public.screens;
CREATE CONSTRAINT TRIGGER trg_studio_validate_child_screen_owner
  AFTER INSERT OR UPDATE OR DELETE
  ON public.screens
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.studio_validate_gap_bridge_child_ownership();

DROP TRIGGER IF EXISTS trg_studio_validate_gap_bridge_child_owner ON public.gap_bridges;
CREATE CONSTRAINT TRIGGER trg_studio_validate_gap_bridge_child_owner
  AFTER INSERT OR UPDATE OR DELETE
  ON public.gap_bridges
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.studio_validate_gap_bridge_child_ownership();

DROP TRIGGER IF EXISTS trg_gap_bridges_updated ON public.gap_bridges;
CREATE TRIGGER trg_gap_bridges_updated
  BEFORE UPDATE ON public.gap_bridges
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

ALTER TABLE public.gap_bridges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gap_bridges FROM anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.gap_bridges_id_seq FROM anon, authenticated, service_role;

COMMENT ON COLUMN public.screens.screen_kind IS
  'main Screens participate in numbered linear navigation; gap_bridge_child Screens are unnumbered local children.';
COMMENT ON COLUMN public.screens.parent_screen_id IS
  'Main parent Screen for a locally owned Gap Bridge child; null for main Screens.';
COMMENT ON TABLE public.gap_bridges IS
  'Author-curated named supporting Screens attached to one main parent Screen. External targets resolve from their latest published Session release.';
COMMENT ON COLUMN public.gap_bridges.external_screen_id IS
  'Soft stable Screen locator resolved against external_session_id latest publication at runtime.';

COMMIT;
