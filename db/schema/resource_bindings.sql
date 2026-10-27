-- Spectropy Resource Library: contextual use of an exact approved version.
-- Prerequisites: resource_item_versions, resource_items, slide_objects, slide_branches.

CREATE TABLE resource_bindings (
    id                   uuid PRIMARY KEY,
    org_id               uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),
    resource_version_id  uuid NOT NULL,
    slide_object_id      uuid,
    branch_id            uuid,
    sequence_no          integer NOT NULL DEFAULT 1 CHECK (sequence_no > 0),
    usage_mode           text NOT NULL CHECK (usage_mode IN ('lesson', 'branch')),
    teaching_spec        jsonb NOT NULL DEFAULT '{}'::jsonb,
    launch_spec          jsonb NOT NULL DEFAULT '{}'::jsonb,
    fallback_spec        jsonb NOT NULL DEFAULT '{}'::jsonb,

    CONSTRAINT resource_bindings_tenant_identity_uq UNIQUE (org_id, id),
    CONSTRAINT resource_bindings_version_fk
        FOREIGN KEY (org_id, resource_version_id)
        REFERENCES resource_item_versions (org_id, id) ON DELETE RESTRICT,
    CONSTRAINT resource_bindings_slide_object_fk
        FOREIGN KEY (org_id, slide_object_id)
        REFERENCES slide_objects (org_id, id) ON DELETE RESTRICT,
    CONSTRAINT resource_bindings_branch_fk
        FOREIGN KEY (org_id, branch_id)
        REFERENCES slide_branches (org_id, id) ON DELETE RESTRICT,
    CONSTRAINT resource_bindings_exactly_one_owner_ck CHECK (
        (usage_mode = 'lesson' AND slide_object_id IS NOT NULL AND branch_id IS NULL)
        OR
        (usage_mode = 'branch' AND branch_id IS NOT NULL AND slide_object_id IS NULL)
    ),
    CONSTRAINT resource_bindings_json_objects_ck CHECK (
        jsonb_typeof(teaching_spec) = 'object'
        AND jsonb_typeof(launch_spec) = 'object'
        AND jsonb_typeof(fallback_spec) = 'object'
    ),
    CONSTRAINT resource_bindings_placement_category_ck CHECK (
        (usage_mode = 'lesson' AND teaching_spec->>'placementCategory' IN
            ('onScreenElement', 'primaryInteraction', 'supportingAttachment'))
        OR
        (usage_mode = 'branch' AND teaching_spec->>'placementCategory' = 'clarification')
    )
);

-- Prevent accidental duplicate placement at the same ordered location, while still
-- allowing the same exact version to be reused in any number of different lessons.
CREATE UNIQUE INDEX resource_bindings_slide_position_uq
    ON resource_bindings (org_id, slide_object_id, sequence_no)
    WHERE slide_object_id IS NOT NULL;

CREATE UNIQUE INDEX resource_bindings_branch_position_uq
    ON resource_bindings (org_id, branch_id, sequence_no)
    WHERE branch_id IS NOT NULL;

CREATE INDEX resource_bindings_version_usage_idx
    ON resource_bindings (org_id, resource_version_id);

CREATE INDEX resource_bindings_slide_lookup_idx
    ON resource_bindings (org_id, slide_object_id, sequence_no)
    WHERE slide_object_id IS NOT NULL;

CREATE INDEX resource_bindings_branch_lookup_idx
    ON resource_bindings (org_id, branch_id, sequence_no)
    WHERE branch_id IS NOT NULL;

CREATE OR REPLACE FUNCTION validate_new_resource_binding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_review_state text;
    v_archived boolean;
BEGIN
    SELECT v.review_state, i.archived
      INTO v_review_state, v_archived
      FROM resource_item_versions v
      JOIN resource_items i
        ON i.org_id = v.org_id AND i.id = v.resource_item_id
     WHERE v.org_id = NEW.org_id
       AND v.id = NEW.resource_version_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'resource version is absent from the binding tenant'
            USING ERRCODE = '23503';
    END IF;
    IF v_review_state <> 'approved' THEN
        RAISE EXCEPTION 'only an approved resource version may be bound'
            USING ERRCODE = '23514';
    END IF;
    IF v_archived THEN
        RAISE EXCEPTION 'an archived resource item cannot receive a new binding'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER resource_bindings_validate_trg
BEFORE INSERT OR UPDATE OF resource_version_id, org_id ON resource_bindings
FOR EACH ROW EXECUTE FUNCTION validate_new_resource_binding();

ALTER TABLE resource_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_bindings FORCE ROW LEVEL SECURITY;

CREATE POLICY resource_bindings_tenant_policy ON resource_bindings
    USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
    WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
