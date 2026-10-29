-- Upgrade Studio resources from inline file/version fields to stable Resource
-- identities plus immutable Resource version records. Existing placements are
-- pinned to the latest migrated version before the legacy columns are removed.

BEGIN;

CREATE TABLE IF NOT EXISTS public.resource_versions (
  id SERIAL PRIMARY KEY,
  resource_id INTEGER NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  storage_key TEXT,
  original_file_name TEXT,
  mime_type VARCHAR(150),
  file_size BIGINT,
  checksum_sha256 VARCHAR(64),
  thumbnail_storage_key TEXT,
  external_url TEXT,
  width INTEGER,
  height INTEGER,
  duration_seconds NUMERIC(12, 3),
  entry_point TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  uploaded_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (version_number > 0),
  CHECK (file_size IS NULL OR file_size >= 0),
  CHECK (width IS NULL OR width > 0),
  CHECK (height IS NULL OR height > 0),
  CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  CHECK (jsonb_typeof(metadata_json) = 'object'),
  UNIQUE (resource_id, version_number),
  UNIQUE (resource_id, id)
);

CREATE INDEX IF NOT EXISTS idx_resource_versions_resource
  ON public.resource_versions(resource_id, version_number DESC);

ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL;

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'resources'
      AND column_name = 'uploaded_by'
  ) THEN
    EXECUTE 'UPDATE public.resources SET created_by = uploaded_by WHERE created_by IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'resources'
      AND column_name = 'version'
  ) THEN
    EXECUTE $backfill$
      INSERT INTO public.resource_versions (
        resource_id,
        version_number,
        storage_key,
        original_file_name,
        mime_type,
        file_size,
        thumbnail_storage_key,
        external_url,
        metadata_json,
        uploaded_by,
        created_at
      )
      SELECT
        r.id,
        GREATEST(r.version, 1),
        r.file_url,
        r.file_name,
        r.file_type,
        r.file_size,
        r.thumbnail_url,
        r.external_url,
        r.resource_data_json,
        r.uploaded_by,
        r.created_at
      FROM public.resources r
      ON CONFLICT (resource_id, version_number) DO NOTHING
    $backfill$;
  END IF;
END
$migration$;

ALTER TABLE public.resource_mappings
  ADD COLUMN IF NOT EXISTS resource_version_id INTEGER;

UPDATE public.resource_mappings rm
SET resource_version_id = rv.id
FROM public.resource_versions rv
WHERE rv.resource_id = rm.resource_id
  AND rv.version_number = (
    SELECT MAX(latest.version_number)
    FROM public.resource_versions latest
    WHERE latest.resource_id = rm.resource_id
  )
  AND rm.resource_version_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.resource_mappings
    WHERE resource_version_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot require resource_version_id: one or more Resource mappings could not be backfilled';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.resource_mappings
    GROUP BY screen_id, element_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one Resource per Screen element: duplicate mappings exist';
  END IF;
END $$;

ALTER TABLE public.resource_mappings
  ALTER COLUMN resource_version_id SET NOT NULL;

ALTER TABLE public.resource_mappings
  DROP CONSTRAINT IF EXISTS resource_mappings_resource_id_screen_id_element_id_key;

ALTER TABLE public.resource_mappings
  DROP CONSTRAINT IF EXISTS resource_mappings_resource_id_fkey;

ALTER TABLE public.resource_mappings
  DROP CONSTRAINT IF EXISTS resource_mappings_resource_version_fkey;

ALTER TABLE public.resource_mappings
  DROP CONSTRAINT IF EXISTS resource_mappings_screen_element_unique;

ALTER TABLE public.resource_mappings
  ADD CONSTRAINT resource_mappings_resource_id_fkey
  FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE RESTRICT;

ALTER TABLE public.resource_mappings
  ADD CONSTRAINT resource_mappings_resource_version_fkey
  FOREIGN KEY (resource_id, resource_version_id)
  REFERENCES public.resource_versions(resource_id, id) ON DELETE RESTRICT;

ALTER TABLE public.resource_mappings
  ADD CONSTRAINT resource_mappings_screen_element_unique
  UNIQUE (screen_id, element_id);

CREATE INDEX IF NOT EXISTS idx_resource_mappings_version
  ON public.resource_mappings(resource_version_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('studio-resources', 'studio-resources', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

ALTER TABLE public.resources
  DROP COLUMN IF EXISTS file_url,
  DROP COLUMN IF EXISTS file_name,
  DROP COLUMN IF EXISTS file_type,
  DROP COLUMN IF EXISTS file_size,
  DROP COLUMN IF EXISTS thumbnail_url,
  DROP COLUMN IF EXISTS external_url,
  DROP COLUMN IF EXISTS resource_data_json,
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS uploaded_by;

COMMIT;
