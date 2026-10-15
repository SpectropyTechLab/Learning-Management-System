BEGIN;


DO $$
DECLARE
  v_client_id integer;
  v_user_id integer;
  v_program_id integer;
  v_grade_id integer;
  v_subject_id integer;
  v_chapter_id integer;
  v_topic_id integer;
  v_syllabus_id uuid := '10000000-0000-4000-8000-000000000001';
  v_syllabus_topic_id uuid := '10000000-0000-4000-8000-000000000002';
  v_objective_id uuid := '10000000-0000-4000-8000-000000000003';
  v_layout_id uuid := '10000000-0000-4000-8000-000000000004';
  v_lesson_id uuid := '10000000-0000-4000-8000-000000000005';
  v_session_id uuid := '10000000-0000-4000-8000-000000000006';
  v_screen_id uuid := '10000000-0000-4000-8000-000000000007';
  v_object_id uuid := '10000000-0000-4000-8000-000000000008';
  v_resource_item_id uuid := '10000000-0000-4000-8000-000000000009';
  v_resource_version_id uuid := '10000000-0000-4000-8000-000000000010';
BEGIN
  SELECT id INTO v_client_id FROM public.clients WHERE is_active IS TRUE ORDER BY id LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Seed requires at least one active client';
  END IF;

  SELECT id INTO v_user_id
  FROM public.users
  WHERE is_active IS TRUE
    AND (client_id = v_client_id OR role = 'super_admin')
  ORDER BY CASE WHEN role = 'super_admin' THEN 0 ELSE 1 END, id
  LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Seed requires an active user for client % or a super_admin', v_client_id;
  END IF;

  SELECT p.id, g.id, s.id, c.id, t.id
  INTO v_program_id, v_grade_id, v_subject_id, v_chapter_id, v_topic_id
  FROM public.programs p
  JOIN public.grades g ON g.program_id = p.id
  JOIN public.subjects s ON s.grade_id = g.id
  JOIN public.chapters c ON c.subject_id = s.id
  JOIN public.topics t ON t.chapter_id = c.id
  WHERE p.client_id = v_client_id
     OR p.client_id IS NULL
  ORDER BY p.id, g.id, s.id, c.id, t.id
  LIMIT 1;
  IF v_topic_id IS NULL THEN
    RAISE EXCEPTION 'Seed requires program -> grade -> subject -> chapter -> topic baseline data';
  END IF;

  INSERT INTO public.intelligence_classroom_studio_syllabus_versions (
    id, client_id, program_id, created_by, code, academic_year, version_no, status, source_basis
  )
  VALUES (
    v_syllabus_id, v_client_id, v_program_id, v_user_id, 'ICS-PILOT-SYLLABUS', '2026-2027', 1, 'draft',
    '{"source":"pilot_seed"}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.intelligence_classroom_studio_syllabus_topics (
    id, client_id, syllabus_version_id, grade_id, subject_id, chapter_id, topic_id,
    sequence_no, academic_snapshot, created_by
  )
  VALUES (
    v_syllabus_topic_id, v_client_id, v_syllabus_id, v_grade_id, v_subject_id, v_chapter_id, v_topic_id,
    1, '{"source":"pilot_seed"}'::jsonb, v_user_id
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.intelligence_classroom_studio_learning_objectives (
    id, client_id, syllabus_topic_id, code, statement, bloom_level, evidence_spec, created_by
  )
  VALUES (
    v_objective_id, v_client_id, v_syllabus_topic_id, 'ICS-PILOT-OBJ-001',
    'Learner explains the core idea using a teacher-approved representation.',
    'understand', '{"evidence":"verbal explanation or screen interaction"}'::jsonb, v_user_id
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.intelligence_classroom_studio_layout_templates (
    id, client_id, code, version_no, name, safe_region, slot_spec, compatibility_spec, created_by
  )
  VALUES (
    v_layout_id, v_client_id, 'LYT-PILOT-001', 1, 'Pilot explanation layout',
    '{"x":80,"y":80,"width":1760,"height":920}'::jsonb,
    '[{"slotKey":"main","kind":"content"},{"slotKey":"support","kind":"resource"}]'::jsonb,
    '{"objectTypes":["text","question","attachment","resourcePlaceholder"]}'::jsonb,
    v_user_id
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.intelligence_classroom_studio_lesson_plans (
    id, client_id, syllabus_topic_id, code, title, duration_seconds, pedagogy_spec, created_by
  )
  VALUES (
    v_lesson_id, v_client_id, v_syllabus_topic_id, 'ICS-PILOT-LESSON-001',
    'Pilot Intelligent Studio Lesson', 2400,
    '{"method":"explicit explanation with guided questioning"}'::jsonb, v_user_id
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.intelligence_classroom_studio_lesson_objectives (
    id, client_id, lesson_plan_id, objective_id, created_by
  )
  VALUES (
    '10000000-0000-4000-8000-000000000011', v_client_id, v_lesson_id, v_objective_id, v_user_id
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.intelligence_classroom_studio_lesson_sessions (
    id, client_id, lesson_plan_id, title, sequence_no, duration_seconds, created_by
  )
  VALUES (
    v_session_id, v_client_id, v_lesson_id, 'Pilot Session 1', 1, 2400, v_user_id
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.intelligence_classroom_studio_screens (
    id, client_id, lesson_session_id, layout_template_id, title, sequence_no,
    screen_type, layout_spec, pedagogy_spec, created_by
  )
  VALUES (
    v_screen_id, v_client_id, v_session_id, v_layout_id, 'Pilot Screen 1', 1,
    'explanation', '{}'::jsonb, '{"screenContribution":"introduce"}'::jsonb, v_user_id
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.intelligence_classroom_studio_screen_objects (
    id, client_id, screen_id, object_key, object_type, slot_key,
    x, y, width, height, z_index, props, created_by
  )
  VALUES (
    v_object_id, v_client_id, v_screen_id, 'obj_pilot_prompt', 'text', 'main',
    120, 120, 1000, 240, 1,
    '{"text":"Explain the idea using the approved classroom representation."}'::jsonb,
    v_user_id
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.intelligence_classroom_studio_resource_items (
    id, client_id, code, title, description, kind, created_by
  )
  VALUES (
    v_resource_item_id, v_client_id, 'RES-PILOT-001', 'Pilot Native Explanation',
    'Seeded native resource for validating Intelligent Studio bindings.', 'teaching_component', v_user_id
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.intelligence_classroom_studio_resource_versions (
    id, client_id, resource_item_id, version_no, source_kind, source_format,
    native_payload, content_hash, capability_json, rights_json, accessibility_json, created_by
  )
  VALUES (
    v_resource_version_id, v_client_id, v_resource_item_id, 1, 'native', 'json',
    '{"blocks":[{"type":"text","text":"Pilot explanation resource."}]}'::jsonb,
    repeat('0', 64),
    '{"supportsPreview":true}'::jsonb,
    '{"license":"internal-pilot"}'::jsonb,
    '{"textAlternative":"Pilot explanation resource."}'::jsonb,
    v_user_id
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.intelligence_classroom_studio_resource_review_decisions (
    id, client_id, resource_version_id, decision, rationale, content_hash, created_by
  )
  VALUES (
    '10000000-0000-4000-8000-000000000012', v_client_id, v_resource_version_id,
    'approved', 'Pilot seed approval for migration validation only.', repeat('0', 64), v_user_id
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.intelligence_classroom_studio_resource_bindings (
    id, client_id, resource_version_id, screen_object_id, sequence_no,
    usage_mode, placement_category, teaching_spec, launch_spec, created_by
  )
  VALUES (
    '10000000-0000-4000-8000-000000000013', v_client_id, v_resource_version_id, v_object_id, 1,
    'lesson', 'onScreenElement',
    '{"teacherPrompt":"Use this resource as the first explanation."}'::jsonb,
    '{"launchMode":"inline"}'::jsonb,
    v_user_id
  )
  ON CONFLICT (id) DO NOTHING;
END $$;

COMMIT;
