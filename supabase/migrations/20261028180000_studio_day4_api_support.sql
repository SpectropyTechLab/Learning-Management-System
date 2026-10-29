-- Day 4 API cutover: private session-document storage and removal of the
-- superseded inline Session Plan / Screen Script fields.

BEGIN;

INSERT INTO storage.buckets (id, name, public)
VALUES ('sessions-scripts-plans', 'sessions-scripts-plans', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

DROP TRIGGER IF EXISTS trg_studio_limit_legacy_screen_script ON public.screens;
DROP FUNCTION IF EXISTS public.studio_limit_legacy_screen_script();

ALTER TABLE public.sessions
  DROP COLUMN IF EXISTS session_plan_file_url,
  DROP COLUMN IF EXISTS session_plan_file_name,
  DROP COLUMN IF EXISTS session_plan_file_type,
  DROP COLUMN IF EXISTS session_plan_uploaded_at,
  DROP COLUMN IF EXISTS session_plan_content;

ALTER TABLE public.screens
  DROP COLUMN IF EXISTS screen_script_file_url,
  DROP COLUMN IF EXISTS screen_script_file_name,
  DROP COLUMN IF EXISTS screen_script_file_type,
  DROP COLUMN IF EXISTS screen_script_uploaded_at,
  DROP COLUMN IF EXISTS screen_script_content;

COMMENT ON TABLE public.session_documents IS
  'Immutable, revisioned originals for the one current Session Plan and one current Screen Script owned by each Studio Session.';

COMMIT;
