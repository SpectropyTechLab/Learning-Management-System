-- Run with psql from the review directory:
--   psql "$DISPOSABLE_DATABASE_URL" -v ON_ERROR_STOP=1 -f resource_schema_validation.sql
--
-- This is a disposable, self-contained validation harness. It creates minimal
-- prerequisite tables, loads the draft DDL, runs acceptance scenarios, and rolls back.

\set ON_ERROR_STOP on

BEGIN;
CREATE SCHEMA resource_library_validation;
SET LOCAL search_path = resource_library_validation, public;
SET LOCAL app.org_id = '10000000-0000-0000-0000-000000000001';

CREATE TABLE organizations (
    id uuid PRIMARY KEY,
    code text NOT NULL UNIQUE,
    name text NOT NULL
);

CREATE TABLE users (
    id uuid PRIMARY KEY,
    issuer text NOT NULL,
    subject text NOT NULL,
    verified_email text,
    display_name text NOT NULL,
    UNIQUE (issuer, subject)
);

CREATE TABLE memberships (
    id uuid PRIMARY KEY,
    org_id uuid NOT NULL REFERENCES organizations(id),
    user_id uuid NOT NULL REFERENCES users(id),
    UNIQUE (org_id, id),
    UNIQUE (org_id, user_id)
);

CREATE TABLE assets (
    id uuid PRIMARY KEY,
    org_id uuid NOT NULL REFERENCES organizations(id),
    UNIQUE (org_id, id)
);
CREATE TABLE package_versions (
    id uuid PRIMARY KEY,
    org_id uuid NOT NULL REFERENCES organizations(id),
    UNIQUE (org_id, id)
);
CREATE TABLE simulation_specs (
    id uuid PRIMARY KEY,
    org_id uuid NOT NULL REFERENCES organizations(id),
    UNIQUE (org_id, id)
);
CREATE TABLE slide_objects (
    id uuid PRIMARY KEY,
    org_id uuid NOT NULL REFERENCES organizations(id),
    object_key text NOT NULL,
    UNIQUE (org_id, id)
);
CREATE TABLE slide_branches (
    id uuid PRIMARY KEY,
    org_id uuid NOT NULL REFERENCES organizations(id),
    code text NOT NULL,
    UNIQUE (org_id, id)
);
CREATE TABLE curriculum_nodes (
    id uuid PRIMARY KEY,
    org_id uuid NOT NULL REFERENCES organizations(id),
    code text NOT NULL,
    UNIQUE (org_id, id)
);
CREATE TABLE learning_objectives (
    id uuid PRIMARY KEY,
    org_id uuid NOT NULL REFERENCES organizations(id),
    code text NOT NULL,
    UNIQUE (org_id, id)
);
CREATE TABLE authorizations (
    id uuid PRIMARY KEY,
    org_id uuid NOT NULL REFERENCES organizations(id),
    UNIQUE (org_id, id)
);

\ir ../db/schema/resource_items.sql
\ir ../db/schema/resource_item_versions.sql
\ir ../db/schema/resource_bindings.sql
\ir ../db/schema/resource_collections.sql
\ir ../db/schema/resource_supporting_tables.sql

INSERT INTO organizations (id, code, name) VALUES
    ('10000000-0000-0000-0000-000000000001', 'ORG-A', 'Organization A'),
    ('20000000-0000-0000-0000-000000000002', 'ORG-B', 'Organization B');

INSERT INTO users (id, issuer, subject, verified_email, display_name) VALUES
    ('30000000-0000-0000-0000-000000000001', 'test', 'author-a', 'author-a@example.test', 'Author A'),
    ('30000000-0000-0000-0000-000000000002', 'test', 'author-b', 'author-b@example.test', 'Author B');

INSERT INTO memberships (id, org_id, user_id) VALUES
    ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
    ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002');

INSERT INTO slide_objects (id, org_id, object_key) VALUES
    ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'physics-projectile-simulation'),
    ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'mathematics-parabola-simulation'),
    ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'physics-extension-slot'),
    ('50000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'other-tenant-slot');

INSERT INTO slide_branches (id, org_id, code) VALUES
    ('51000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'PHY-CLARIFY-TRAJECTORY');

INSERT INTO resource_items (
    id, org_id, code, title, kind, created_by
) VALUES (
    '60000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'RES-STEM-PARABOLA-001',
    'Projectile and Parabola Explorer',
    'virtual_lab',
    '30000000-0000-0000-0000-000000000001'
);

INSERT INTO resource_item_versions (
    id, org_id, resource_item_id, version_no, source_kind, source_format,
    metadata_json, content_hash, review_state, reviewed_by, reviewed_at
) VALUES (
    '61000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    1, 'native', 'spectropy-native-v1',
    '{"capabilities":["parameterControl","graph"]}',
    repeat('a', 64), 'pending_review', NULL, NULL
), (
    '61000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    2, 'native', 'spectropy-native-v1',
    '{"capabilities":["parameterControl","graph","table"]}',
    repeat('b', 64), 'pending_review', NULL, NULL
);

INSERT INTO resource_review_decisions (
    id, org_id, resource_version_id, decision, decided_by, findings_json
) VALUES (
    '62000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '61000000-0000-0000-0000-000000000001',
    'approved',
    '30000000-0000-0000-0000-000000000001',
    '{"scientificAccuracy":"passed","rights":"verified"}'
);

-- Acceptance: the same exact approved version is reused by Physics and Mathematics.
INSERT INTO resource_bindings (
    id, org_id, resource_version_id, slide_object_id, usage_mode,
    teaching_spec, launch_spec, fallback_spec
) VALUES (
    '70000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '61000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001', 'lesson',
    '{"placementCategory":"primaryInteraction","prompt":"Predict how launch angle changes range."}',
    '{"mode":"guided","initialAngle":30}',
    '{"message":"Use the static trajectory diagram."}'
), (
    '70000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '61000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000002', 'lesson',
    '{"placementCategory":"primaryInteraction","prompt":"Relate coefficients to the graph of the parabola."}',
    '{"mode":"explore","showEquation":true}',
    '{"message":"Use the pre-rendered coordinate graph."}'
);

DO $$
DECLARE
    binding_count integer;
    distinct_prompt_count integer;
BEGIN
    SELECT count(*), count(DISTINCT teaching_spec->>'prompt')
      INTO binding_count, distinct_prompt_count
      FROM resource_bindings
     WHERE resource_version_id = '61000000-0000-0000-0000-000000000001';

    IF binding_count <> 2 OR distinct_prompt_count <> 2 THEN
        RAISE EXCEPTION 'reuse/prompt independence check failed';
    END IF;
    RAISE NOTICE 'PASS: one approved version has two independent lesson prompts';
END;
$$;

-- Acceptance: Version 2 does not alter Version 1.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM resource_item_versions
         WHERE resource_item_id = '60000000-0000-0000-0000-000000000001'
         GROUP BY resource_item_id
        HAVING array_agg(version_no ORDER BY version_no) = ARRAY[1, 2]
           AND count(DISTINCT content_hash) = 2
    ) THEN
        RAISE EXCEPTION 'version preservation check failed';
    END IF;
    RAISE NOTICE 'PASS: Version 1 and Version 2 remain distinct';
END;
$$;

-- Acceptance: approved payload cannot be silently overwritten.
DO $$
BEGIN
    BEGIN
        UPDATE resource_item_versions
           SET content_hash = repeat('c', 64)
         WHERE id = '61000000-0000-0000-0000-000000000001';
        RAISE EXCEPTION 'approved mutation unexpectedly succeeded';
    EXCEPTION WHEN object_not_in_prerequisite_state THEN
        RAISE NOTICE 'PASS: approved version mutation rejected';
    END;
END;
$$;

-- Acceptance: unreviewed Version 2 cannot be bound for lesson use.
DO $$
BEGIN
    BEGIN
        INSERT INTO resource_bindings (
            id, org_id, resource_version_id, slide_object_id, usage_mode,
            teaching_spec, launch_spec, fallback_spec
        ) VALUES (
            '70000000-0000-0000-0000-000000000003',
            '10000000-0000-0000-0000-000000000001',
            '61000000-0000-0000-0000-000000000002',
            '50000000-0000-0000-0000-000000000003', 'lesson',
            '{"placementCategory":"supportingAttachment"}', '{}', '{}'
        );
        RAISE EXCEPTION 'unreviewed binding unexpectedly succeeded';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'PASS: unreviewed version binding rejected';
    END;
END;
$$;

-- Acceptance: a cross-tenant binding cannot be created.
DO $$
BEGIN
    BEGIN
        INSERT INTO resource_bindings (
            id, org_id, resource_version_id, slide_object_id, usage_mode,
            teaching_spec, launch_spec, fallback_spec
        ) VALUES (
            '70000000-0000-0000-0000-000000000004',
            '20000000-0000-0000-0000-000000000002',
            '61000000-0000-0000-0000-000000000001',
            '50000000-0000-0000-0000-000000000004', 'lesson',
            '{"placementCategory":"onScreenElement"}', '{}', '{}'
        );
        RAISE EXCEPTION 'cross-tenant binding unexpectedly succeeded';
    EXCEPTION WHEN foreign_key_violation OR insufficient_privilege THEN
        RAISE NOTICE 'PASS: cross-tenant resource binding rejected';
    END;
END;
$$;

-- Acceptance: archive preserves existing references but blocks new selection.
UPDATE resource_items
   SET archived = true
 WHERE id = '60000000-0000-0000-0000-000000000001';

DO $$
BEGIN
    IF (SELECT count(*) FROM resource_bindings
         WHERE resource_version_id = '61000000-0000-0000-0000-000000000001') <> 2 THEN
        RAISE EXCEPTION 'archive damaged existing bindings';
    END IF;

    BEGIN
        INSERT INTO resource_bindings (
            id, org_id, resource_version_id, slide_object_id, usage_mode,
            teaching_spec, launch_spec, fallback_spec
        ) VALUES (
            '70000000-0000-0000-0000-000000000005',
            '10000000-0000-0000-0000-000000000001',
            '61000000-0000-0000-0000-000000000001',
            '50000000-0000-0000-0000-000000000003', 'lesson',
            '{"placementCategory":"supportingAttachment"}', '{}', '{}'
        );
        RAISE EXCEPTION 'archived resource selection unexpectedly succeeded';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'PASS: archive preserves old bindings and rejects a new binding';
    END;
END;
$$;

-- Acceptance: referenced Version 1 cannot be destructively removed.
DO $$
BEGIN
    BEGIN
        DELETE FROM resource_item_versions
         WHERE id = '61000000-0000-0000-0000-000000000001';
        RAISE EXCEPTION 'referenced reviewed version deletion unexpectedly succeeded';
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'PASS: referenced reviewed version deletion rejected';
    END;
END;
$$;

ROLLBACK;
