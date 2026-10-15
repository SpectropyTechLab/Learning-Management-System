BEGIN;


CREATE TABLE IF NOT EXISTS public.intelligence_classroom_studio_syllabus_versions (
  id UUID PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  school_id INTEGER REFERENCES public.schools(id) ON DELETE RESTRICT,
  program_id INTEGER NOT NULL REFERENCES public.programs(id) ON DELETE RESTRICT,
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  code TEXT NOT NULL CHECK (btrim(code) <> ''),
  academic_year TEXT NOT NULL CHECK (btrim(academic_year) <> ''),
  version_no INTEGER NOT NULL CHECK (version_no > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'frozen', 'archived')),
  source_basis JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(source_basis) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, code, version_no),
  UNIQUE (client_id, id)
);

CREATE TABLE IF NOT EXISTS public.intelligence_classroom_studio_syllabus_topics (
  id UUID PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  syllabus_version_id UUID NOT NULL,
  grade_id INTEGER NOT NULL REFERENCES public.grades(id) ON DELETE RESTRICT,
  subject_id INTEGER NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  chapter_id INTEGER NOT NULL REFERENCES public.chapters(id) ON DELETE RESTRICT,
  topic_id INTEGER NOT NULL REFERENCES public.topics(id) ON DELETE RESTRICT,
  sequence_no INTEGER NOT NULL CHECK (sequence_no > 0),
  academic_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(academic_snapshot) = 'object'),
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (client_id, syllabus_version_id)
    REFERENCES public.intelligence_classroom_studio_syllabus_versions(client_id, id) ON DELETE RESTRICT,
  UNIQUE (client_id, syllabus_version_id, topic_id),
  UNIQUE (client_id, syllabus_version_id, sequence_no),
  UNIQUE (client_id, id)
);

CREATE TABLE IF NOT EXISTS public.intelligence_classroom_studio_learning_objectives (
  id UUID PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  syllabus_topic_id UUID NOT NULL,
  code TEXT NOT NULL CHECK (btrim(code) <> ''),
  statement TEXT NOT NULL CHECK (btrim(statement) <> ''),
  bloom_level TEXT NOT NULL CHECK (
    bloom_level IN ('remember', 'understand', 'apply', 'analyse', 'evaluate', 'create')
  ),
  evidence_spec JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(evidence_spec) = 'object'),
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (client_id, syllabus_topic_id)
    REFERENCES public.intelligence_classroom_studio_syllabus_topics(client_id, id) ON DELETE RESTRICT,
  UNIQUE (client_id, code),
  UNIQUE (client_id, id)
);

CREATE TABLE IF NOT EXISTS public.intelligence_classroom_studio_objective_prerequisites (
  id UUID PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  objective_id UUID NOT NULL,
  prerequisite_objective_id UUID NOT NULL,
  rationale TEXT NOT NULL CHECK (btrim(rationale) <> ''),
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (client_id, objective_id)
    REFERENCES public.intelligence_classroom_studio_learning_objectives(client_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (client_id, prerequisite_objective_id)
    REFERENCES public.intelligence_classroom_studio_learning_objectives(client_id, id) ON DELETE RESTRICT,
  CHECK (objective_id <> prerequisite_objective_id),
  UNIQUE (client_id, objective_id, prerequisite_objective_id),
  UNIQUE (client_id, id)
);

CREATE TABLE IF NOT EXISTS public.intelligence_classroom_studio_layout_templates (
  id UUID PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  code TEXT NOT NULL CHECK (btrim(code) <> ''),
  version_no INTEGER NOT NULL CHECK (version_no > 0),
  name TEXT NOT NULL CHECK (btrim(name) <> ''),
  canvas_width INTEGER NOT NULL DEFAULT 1920 CHECK (canvas_width > 0),
  canvas_height INTEGER NOT NULL DEFAULT 1080 CHECK (canvas_height > 0),
  safe_region JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(safe_region) = 'object'),
  slot_spec JSONB NOT NULL DEFAULT '[]'::JSONB CHECK (jsonb_typeof(slot_spec) = 'array'),
  compatibility_spec JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(compatibility_spec) = 'object'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, code, version_no),
  UNIQUE (client_id, id)
);

CREATE TABLE IF NOT EXISTS public.intelligence_classroom_studio_lesson_plans (
  id UUID PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  syllabus_topic_id UUID NOT NULL,
  code TEXT NOT NULL CHECK (btrim(code) <> ''),
  title TEXT NOT NULL CHECK (btrim(title) <> ''),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  revision_no INTEGER NOT NULL DEFAULT 1 CHECK (revision_no > 0),
  pedagogy_spec JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(pedagogy_spec) = 'object'),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'archived')),
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (client_id, syllabus_topic_id)
    REFERENCES public.intelligence_classroom_studio_syllabus_topics(client_id, id) ON DELETE RESTRICT,
  UNIQUE (client_id, code),
  UNIQUE (client_id, id)
);

CREATE TABLE IF NOT EXISTS public.intelligence_classroom_studio_lesson_objectives (
  id UUID PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  lesson_plan_id UUID NOT NULL,
  objective_id UUID NOT NULL,
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (client_id, lesson_plan_id)
    REFERENCES public.intelligence_classroom_studio_lesson_plans(client_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (client_id, objective_id)
    REFERENCES public.intelligence_classroom_studio_learning_objectives(client_id, id) ON DELETE RESTRICT,
  UNIQUE (client_id, lesson_plan_id, objective_id),
  UNIQUE (client_id, id)
);

CREATE TABLE IF NOT EXISTS public.intelligence_classroom_studio_lesson_sessions (
  id UUID PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  lesson_plan_id UUID NOT NULL,
  title TEXT NOT NULL CHECK (btrim(title) <> ''),
  sequence_no INTEGER NOT NULL CHECK (sequence_no > 0),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (client_id, lesson_plan_id)
    REFERENCES public.intelligence_classroom_studio_lesson_plans(client_id, id) ON DELETE RESTRICT,
  UNIQUE (client_id, lesson_plan_id, sequence_no),
  UNIQUE (client_id, id)
);

CREATE TABLE IF NOT EXISTS public.intelligence_classroom_studio_screens (
  id UUID PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  lesson_session_id UUID NOT NULL,
  layout_template_id UUID NOT NULL,
  title TEXT NOT NULL CHECK (btrim(title) <> ''),
  sequence_no INTEGER NOT NULL CHECK (sequence_no > 0),
  screen_type TEXT NOT NULL CHECK (btrim(screen_type) <> ''),
  revision_no INTEGER NOT NULL DEFAULT 1 CHECK (revision_no > 0),
  layout_spec JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(layout_spec) = 'object'),
  pedagogy_spec JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(pedagogy_spec) = 'object'),
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (client_id, lesson_session_id)
    REFERENCES public.intelligence_classroom_studio_lesson_sessions(client_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (client_id, layout_template_id)
    REFERENCES public.intelligence_classroom_studio_layout_templates(client_id, id) ON DELETE RESTRICT,
  UNIQUE (client_id, lesson_session_id, sequence_no),
  UNIQUE (client_id, id)
);

CREATE TABLE IF NOT EXISTS public.intelligence_classroom_studio_screen_objects (
  id UUID PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  screen_id UUID NOT NULL,
  object_key TEXT NOT NULL CHECK (btrim(object_key) <> ''),
  object_type TEXT NOT NULL CHECK (btrim(object_type) <> ''),
  slot_key TEXT NOT NULL CHECK (btrim(slot_key) <> ''),
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  width NUMERIC NOT NULL CHECK (width > 0),
  height NUMERIC NOT NULL CHECK (height > 0),
  z_index INTEGER NOT NULL DEFAULT 0,
  props JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(props) = 'object'),
  access_class TEXT NOT NULL DEFAULT 'lesson' CHECK (access_class IN ('lesson', 'teacher', 'author')),
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (client_id, screen_id)
    REFERENCES public.intelligence_classroom_studio_screens(client_id, id) ON DELETE RESTRICT,
  UNIQUE (client_id, screen_id, object_key),
  UNIQUE (client_id, id)
);

CREATE TABLE IF NOT EXISTS public.intelligence_classroom_studio_screen_branches (
  id UUID PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  screen_id UUID NOT NULL,
  branch_key TEXT NOT NULL CHECK (btrim(branch_key) <> ''),
  title TEXT NOT NULL CHECK (btrim(title) <> ''),
  audience TEXT NOT NULL DEFAULT 'teacher' CHECK (audience IN ('teacher', 'author')),
  return_check JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(return_check) = 'object'),
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (client_id, screen_id)
    REFERENCES public.intelligence_classroom_studio_screens(client_id, id) ON DELETE RESTRICT,
  UNIQUE (client_id, screen_id, branch_key),
  UNIQUE (client_id, id)
);

COMMIT;
