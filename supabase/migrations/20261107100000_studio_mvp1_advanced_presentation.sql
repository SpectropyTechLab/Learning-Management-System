BEGIN;

-- PowerPoint-style Zoom and browser-safe embedded objects are canonical
-- Screen element types. Existing rows and published release manifests remain
-- valid; only newly authored Screens can use these values.
ALTER TABLE public.screen_elements
  DROP CONSTRAINT IF EXISTS screen_elements_element_type_check;
ALTER TABLE public.screen_elements
  ADD CONSTRAINT screen_elements_element_type_check CHECK (element_type IN (
    'title', 'text', 'visual', 'question', 'response', 'steps', 'workspace',
    'footer', 'simulation', 'activity', 'media', 'graph', 'data', 'options',
    'math', 'shape', 'zoom', 'embedded_object'
  ));

ALTER TABLE public.resources
  DROP CONSTRAINT IF EXISTS resources_resource_type_check;
ALTER TABLE public.resources
  ADD CONSTRAINT resources_resource_type_check CHECK (resource_type IN (
    'image', 'video', 'animation', 'simulation', 'external_link',
    'html', 'zip', 'scorm', 'presentation', 'model_3d', 'document'
  ));

CREATE TABLE IF NOT EXISTS public.screen_sections (
  id BIGSERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL CHECK (BTRIM(name) <> ''),
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, name),
  UNIQUE (id, session_id)
);

CREATE TABLE IF NOT EXISTS public.screen_section_members (
  section_id BIGINT NOT NULL REFERENCES public.screen_sections(id) ON DELETE CASCADE,
  screen_id INTEGER NOT NULL REFERENCES public.screens(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (section_id, screen_id),
  UNIQUE (section_id, display_order)
);

CREATE TABLE IF NOT EXISTS public.screen_zoom_links (
  id BIGSERIAL PRIMARY KEY,
  source_screen_id INTEGER NOT NULL,
  element_id TEXT NOT NULL,
  session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  zoom_kind VARCHAR(20) NOT NULL CHECK (zoom_kind IN ('screen', 'section')),
  target_screen_id INTEGER REFERENCES public.screens(id) ON DELETE RESTRICT,
  target_section_id BIGINT REFERENCES public.screen_sections(id) ON DELETE RESTRICT,
  return_to_zoom BOOLEAN NOT NULL DEFAULT TRUE,
  transition_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  transition_duration_ms INTEGER NOT NULL DEFAULT 500
    CHECK (transition_duration_ms BETWEEN 0 AND 10000),
  thumbnail_mode VARCHAR(20) NOT NULL DEFAULT 'auto'
    CHECK (thumbnail_mode IN ('auto', 'custom')),
  custom_thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT screen_zoom_links_source_element_fkey
    FOREIGN KEY (source_screen_id, element_id)
    REFERENCES public.screen_elements(screen_id, element_key) ON DELETE CASCADE,
  CONSTRAINT screen_zoom_links_source_session_fkey
    FOREIGN KEY (source_screen_id, session_id)
    REFERENCES public.screens(id, session_id) ON DELETE CASCADE,
  CONSTRAINT screen_zoom_links_target_screen_session_fkey
    FOREIGN KEY (target_screen_id, session_id)
    REFERENCES public.screens(id, session_id) ON DELETE RESTRICT,
  CONSTRAINT screen_zoom_links_target_section_session_fkey
    FOREIGN KEY (target_section_id, session_id)
    REFERENCES public.screen_sections(id, session_id) ON DELETE RESTRICT,
  CONSTRAINT screen_zoom_links_exact_target_check CHECK (
    (zoom_kind = 'screen' AND target_screen_id IS NOT NULL AND target_section_id IS NULL) OR
    (zoom_kind = 'section' AND target_section_id IS NOT NULL AND target_screen_id IS NULL)
  ),
  CONSTRAINT screen_zoom_links_custom_thumbnail_check CHECK (
    thumbnail_mode <> 'custom' OR BTRIM(COALESCE(custom_thumbnail_url, '')) <> ''
  ),
  UNIQUE (source_screen_id, element_id)
);

CREATE INDEX IF NOT EXISTS idx_screen_sections_session_order
  ON public.screen_sections(session_id, display_order, id);
CREATE INDEX IF NOT EXISTS idx_screen_section_members_screen
  ON public.screen_section_members(screen_id, section_id);
CREATE INDEX IF NOT EXISTS idx_screen_zoom_links_target_screen
  ON public.screen_zoom_links(target_screen_id) WHERE target_screen_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_screen_zoom_links_target_section
  ON public.screen_zoom_links(target_section_id) WHERE target_section_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.studio_validate_section_member()
RETURNS TRIGGER AS $$
DECLARE
  section_session_id INTEGER;
  member_session_id INTEGER;
BEGIN
  SELECT session_id INTO section_session_id
  FROM public.screen_sections WHERE id = NEW.section_id;
  SELECT session_id INTO member_session_id
  FROM public.screens WHERE id = NEW.screen_id;
  IF section_session_id IS NULL OR member_session_id IS NULL
     OR section_session_id IS DISTINCT FROM member_session_id THEN
    RAISE EXCEPTION 'Section members must belong to the Section Session';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_studio_validate_section_member
  ON public.screen_section_members;
CREATE TRIGGER trg_studio_validate_section_member
  BEFORE INSERT OR UPDATE ON public.screen_section_members
  FOR EACH ROW EXECUTE FUNCTION public.studio_validate_section_member();

CREATE OR REPLACE FUNCTION public.studio_validate_zoom_source()
RETURNS TRIGGER AS $$
DECLARE
  source_type TEXT;
BEGIN
  SELECT element_type INTO source_type
  FROM public.screen_elements
  WHERE screen_id = NEW.source_screen_id AND element_key = NEW.element_id;
  IF source_type IS DISTINCT FROM 'zoom' THEN
    RAISE EXCEPTION 'Zoom links require a zoom Screen element';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_studio_validate_zoom_source ON public.screen_zoom_links;
CREATE TRIGGER trg_studio_validate_zoom_source
  BEFORE INSERT OR UPDATE ON public.screen_zoom_links
  FOR EACH ROW EXECUTE FUNCTION public.studio_validate_zoom_source();

ALTER TABLE public.screen_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_section_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_zoom_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.screen_sections, public.screen_section_members,
  public.screen_zoom_links FROM anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.screen_sections_id_seq,
  public.screen_zoom_links_id_seq FROM anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_screen_sections_updated ON public.screen_sections;
CREATE TRIGGER trg_screen_sections_updated
  BEFORE UPDATE ON public.screen_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
DROP TRIGGER IF EXISTS trg_screen_zoom_links_updated ON public.screen_zoom_links;
CREATE TRIGGER trg_screen_zoom_links_updated
  BEFORE UPDATE ON public.screen_zoom_links
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

COMMENT ON TABLE public.screen_sections IS
  'Ordered author-defined Screen groups used by Section and Summary Zoom.';
COMMENT ON TABLE public.screen_zoom_links IS
  'Validated nonlinear presentation links owned by zoom Screen elements.';

COMMIT;
