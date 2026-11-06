BEGIN;

ALTER TABLE public.resources
  DROP CONSTRAINT IF EXISTS resources_resource_type_check;

ALTER TABLE public.resources
  ADD CONSTRAINT resources_resource_type_check
  CHECK (resource_type IN (
    'image', 'video', 'animation', 'simulation', 'external_link',
    'html', 'zip', 'scorm', 'presentation', 'model_3d'
  ));

COMMIT;
