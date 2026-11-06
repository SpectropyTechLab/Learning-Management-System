-- Allow the Studio editor's first-class equation and shape objects to persist.
-- The service already validates these types; the older database check did not.
ALTER TABLE public.screen_elements
  DROP CONSTRAINT IF EXISTS screen_elements_element_type_check;

ALTER TABLE public.screen_elements
  ADD CONSTRAINT screen_elements_element_type_check
  CHECK (element_type IN (
    'title', 'text', 'visual', 'question', 'response', 'steps', 'workspace',
    'footer', 'simulation', 'activity', 'media', 'graph', 'data', 'options',
    'math', 'shape'
  ));
