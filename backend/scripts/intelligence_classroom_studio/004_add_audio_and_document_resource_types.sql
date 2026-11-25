BEGIN;

ALTER TABLE public.resources
  DROP CONSTRAINT IF EXISTS resources_resource_type_check;

ALTER TABLE public.resources
  ADD CONSTRAINT resources_resource_type_check
  CHECK (resource_type IN (
    'image', 'video', 'audio', 'animation', 'simulation', 'external_link',
    'html', 'zip', 'scorm', 'presentation', 'model_3d', 'document'
  ));

ALTER TABLE public.screen_elements
  DROP CONSTRAINT IF EXISTS screen_elements_element_type_check;

ALTER TABLE public.screen_elements
  ADD CONSTRAINT screen_elements_element_type_check
  CHECK (element_type IN (
    'title', 'text', 'visual', 'question', 'response', 'steps', 'workspace',
    'footer', 'simulation', 'activity', 'media', 'graph', 'table', 'data',
    'options', 'math', 'shape', 'zoom', 'embedded_object'
  ));

COMMIT;
