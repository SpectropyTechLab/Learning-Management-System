BEGIN;


CREATE TABLE IF NOT EXISTS public.intelligence_classroom_studio_resource_items (
  id UUID PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  school_id INTEGER REFERENCES public.schools(id) ON DELETE RESTRICT,
  code TEXT NOT NULL CHECK (btrim(code) <> ''),
  title TEXT NOT NULL CHECK (btrim(title) <> ''),
  description TEXT,
  kind TEXT NOT NULL CHECK (btrim(kind) <> ''),
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, code),
  UNIQUE (client_id, id)
);

CREATE TABLE IF NOT EXISTS public.intelligence_classroom_studio_resource_versions (
  id UUID PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  resource_item_id UUID NOT NULL,
  version_no INTEGER NOT NULL CHECK (version_no > 0),
  source_kind TEXT NOT NULL CHECK (source_kind IN ('native', 'asset', 'package', 'external')),
  source_format TEXT NOT NULL CHECK (btrim(source_format) <> ''),
  storage_key TEXT,
  source_url TEXT,
  provider_code TEXT,
  native_payload JSONB,
  content_hash TEXT NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  capability_json JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(capability_json) = 'object'),
  rights_json JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(rights_json) = 'object'),
  accessibility_json JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(accessibility_json) = 'object'),
  review_state TEXT NOT NULL DEFAULT 'candidate'
    CHECK (review_state IN ('candidate', 'approved', 'rejected', 'withdrawn')),
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (client_id, resource_item_id)
    REFERENCES public.intelligence_classroom_studio_resource_items(client_id, id) ON DELETE RESTRICT,
  CHECK (
    (source_kind = 'native' AND native_payload IS NOT NULL AND storage_key IS NULL AND source_url IS NULL)
    OR
    (source_kind IN ('asset', 'package') AND storage_key IS NOT NULL AND native_payload IS NULL AND source_url IS NULL)
    OR
    (source_kind = 'external' AND source_url ~ '^https://' AND provider_code IS NOT NULL AND native_payload IS NULL AND storage_key IS NULL)
  ),
  UNIQUE (client_id, resource_item_id, version_no),
  UNIQUE (client_id, id)
);

CREATE TABLE IF NOT EXISTS public.intelligence_classroom_studio_resource_review_decisions (
  id UUID PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  resource_version_id UUID NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'withdrawn')),
  rationale TEXT NOT NULL CHECK (btrim(rationale) <> ''),
  content_hash TEXT NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (client_id, resource_version_id)
    REFERENCES public.intelligence_classroom_studio_resource_versions(client_id, id) ON DELETE RESTRICT,
  UNIQUE (client_id, id)
);

CREATE TABLE IF NOT EXISTS public.intelligence_classroom_studio_resource_bindings (
  id UUID PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  resource_version_id UUID NOT NULL,
  screen_object_id UUID,
  screen_branch_id UUID,
  sequence_no INTEGER NOT NULL CHECK (sequence_no > 0),
  usage_mode TEXT NOT NULL CHECK (usage_mode IN ('lesson', 'branch')),
  placement_category TEXT NOT NULL CHECK (
    placement_category IN ('onScreenElement', 'primaryInteraction', 'supportingAttachment', 'clarification')
  ),
  teaching_spec JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(teaching_spec) = 'object'),
  launch_spec JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(launch_spec) = 'object'),
  fallback_resource_version_id UUID,
  fallback_spec JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(fallback_spec) = 'object'),
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (client_id, resource_version_id)
    REFERENCES public.intelligence_classroom_studio_resource_versions(client_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (client_id, fallback_resource_version_id)
    REFERENCES public.intelligence_classroom_studio_resource_versions(client_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (client_id, screen_object_id)
    REFERENCES public.intelligence_classroom_studio_screen_objects(client_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (client_id, screen_branch_id)
    REFERENCES public.intelligence_classroom_studio_screen_branches(client_id, id) ON DELETE RESTRICT,
  CHECK (
    (usage_mode = 'lesson' AND screen_object_id IS NOT NULL AND screen_branch_id IS NULL)
    OR
    (usage_mode = 'branch' AND screen_branch_id IS NOT NULL AND screen_object_id IS NULL)
  ),
  CHECK (fallback_resource_version_id IS NULL OR fallback_resource_version_id <> resource_version_id),
  UNIQUE (client_id, id)
);

CREATE TABLE IF NOT EXISTS public.intelligence_classroom_studio_resource_academic_mappings (
  id UUID PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  resource_item_id UUID NOT NULL,
  syllabus_topic_id UUID NOT NULL,
  objective_id UUID,
  mapping_type TEXT NOT NULL CHECK (
    mapping_type IN ('primary', 'supporting', 'extension', 'remediation', 'misconception')
  ),
  rationale TEXT NOT NULL CHECK (btrim(rationale) <> ''),
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (client_id, resource_item_id)
    REFERENCES public.intelligence_classroom_studio_resource_items(client_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (client_id, syllabus_topic_id)
    REFERENCES public.intelligence_classroom_studio_syllabus_topics(client_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (client_id, objective_id)
    REFERENCES public.intelligence_classroom_studio_learning_objectives(client_id, id) ON DELETE RESTRICT,
  UNIQUE (client_id, id)
);

CREATE TABLE IF NOT EXISTS public.intelligence_classroom_studio_resource_collections (
  id UUID PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (btrim(title) <> ''),
  owner_user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'client')),
  revision_no INTEGER NOT NULL DEFAULT 1 CHECK (revision_no > 0),
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, id)
);

CREATE TABLE IF NOT EXISTS public.intelligence_classroom_studio_resource_collection_items (
  id UUID PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  collection_id UUID NOT NULL,
  resource_item_id UUID NOT NULL,
  sequence_no INTEGER NOT NULL CHECK (sequence_no > 0),
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (client_id, collection_id)
    REFERENCES public.intelligence_classroom_studio_resource_collections(client_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (client_id, resource_item_id)
    REFERENCES public.intelligence_classroom_studio_resource_items(client_id, id) ON DELETE RESTRICT,
  UNIQUE (client_id, collection_id, resource_item_id),
  UNIQUE (client_id, collection_id, sequence_no),
  UNIQUE (client_id, id)
);

COMMIT;
