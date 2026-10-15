BEGIN;


CREATE INDEX IF NOT EXISTS ics_syllabus_versions_client_idx
  ON public.intelligence_classroom_studio_syllabus_versions(client_id);
CREATE INDEX IF NOT EXISTS ics_syllabus_topics_client_idx
  ON public.intelligence_classroom_studio_syllabus_topics(client_id);
CREATE INDEX IF NOT EXISTS ics_learning_objectives_client_idx
  ON public.intelligence_classroom_studio_learning_objectives(client_id);
CREATE INDEX IF NOT EXISTS ics_lesson_plans_client_idx
  ON public.intelligence_classroom_studio_lesson_plans(client_id);
CREATE INDEX IF NOT EXISTS ics_lesson_sessions_plan_idx
  ON public.intelligence_classroom_studio_lesson_sessions(client_id, lesson_plan_id, sequence_no);
CREATE INDEX IF NOT EXISTS ics_layout_templates_lookup_idx
  ON public.intelligence_classroom_studio_layout_templates(client_id, code, version_no);
CREATE INDEX IF NOT EXISTS ics_screens_session_idx
  ON public.intelligence_classroom_studio_screens(client_id, lesson_session_id, sequence_no);
CREATE INDEX IF NOT EXISTS ics_screen_objects_screen_idx
  ON public.intelligence_classroom_studio_screen_objects(client_id, screen_id);
CREATE INDEX IF NOT EXISTS ics_screen_branches_screen_idx
  ON public.intelligence_classroom_studio_screen_branches(client_id, screen_id);
CREATE INDEX IF NOT EXISTS ics_resource_items_discovery_idx
  ON public.intelligence_classroom_studio_resource_items(client_id, archived, kind);
CREATE INDEX IF NOT EXISTS ics_resource_versions_item_idx
  ON public.intelligence_classroom_studio_resource_versions(client_id, resource_item_id, version_no);
CREATE INDEX IF NOT EXISTS ics_resource_bindings_version_idx
  ON public.intelligence_classroom_studio_resource_bindings(client_id, resource_version_id);
CREATE INDEX IF NOT EXISTS ics_resource_bindings_screen_object_idx
  ON public.intelligence_classroom_studio_resource_bindings(client_id, screen_object_id)
  WHERE screen_object_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ics_resource_bindings_screen_branch_idx
  ON public.intelligence_classroom_studio_resource_bindings(client_id, screen_branch_id)
  WHERE screen_branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ics_resource_mappings_topic_idx
  ON public.intelligence_classroom_studio_resource_academic_mappings(client_id, syllabus_topic_id, objective_id);

CREATE OR REPLACE FUNCTION public.ics_reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only; create a new record instead', TG_TABLE_NAME USING ERRCODE = '23514';
END $$;

CREATE OR REPLACE FUNCTION public.ics_check_actor_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = NEW.created_by
      AND u.is_active IS TRUE
      AND (u.client_id = NEW.client_id OR u.role = 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Actor is inactive or outside client scope' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.ics_check_resource_review_decision()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.intelligence_classroom_studio_resource_versions rv
    WHERE rv.id = NEW.resource_version_id
      AND rv.client_id = NEW.client_id
      AND rv.content_hash = NEW.content_hash
  ) THEN
    RAISE EXCEPTION 'Review decision must match exact resource version hash' USING ERRCODE = '23514';
  END IF;

  UPDATE public.intelligence_classroom_studio_resource_versions
  SET review_state = NEW.decision
  WHERE id = NEW.resource_version_id
    AND client_id = NEW.client_id;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ics_resource_review_decision_apply ON public.intelligence_classroom_studio_resource_review_decisions;
CREATE TRIGGER ics_resource_review_decision_apply
AFTER INSERT ON public.intelligence_classroom_studio_resource_review_decisions
FOR EACH ROW EXECUTE FUNCTION public.ics_check_resource_review_decision();

DROP TRIGGER IF EXISTS ics_resource_review_decisions_append_only ON public.intelligence_classroom_studio_resource_review_decisions;
CREATE TRIGGER ics_resource_review_decisions_append_only
BEFORE UPDATE OR DELETE ON public.intelligence_classroom_studio_resource_review_decisions
FOR EACH ROW EXECUTE FUNCTION public.ics_reject_mutation();

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'intelligence_classroom_studio_syllabus_versions',
    'intelligence_classroom_studio_syllabus_topics',
    'intelligence_classroom_studio_learning_objectives',
    'intelligence_classroom_studio_objective_prerequisites',
    'intelligence_classroom_studio_layout_templates',
    'intelligence_classroom_studio_lesson_plans',
    'intelligence_classroom_studio_lesson_objectives',
    'intelligence_classroom_studio_lesson_sessions',
    'intelligence_classroom_studio_screens',
    'intelligence_classroom_studio_screen_objects',
    'intelligence_classroom_studio_screen_branches',
    'intelligence_classroom_studio_resource_items',
    'intelligence_classroom_studio_resource_versions',
    'intelligence_classroom_studio_resource_review_decisions',
    'intelligence_classroom_studio_resource_bindings',
    'intelligence_classroom_studio_resource_academic_mappings',
    'intelligence_classroom_studio_resource_collections',
    'intelligence_classroom_studio_resource_collection_items'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', table_name);
  END LOOP;
END $$;


COMMIT;
