-- Spectropy Resource Library R3 supporting entities.
-- These tables deliberately do not create a second resource catalog identity.

CREATE TABLE resource_academic_mappings (
    id                  uuid PRIMARY KEY,
    org_id              uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    created_at          timestamptz NOT NULL DEFAULT now(),
    resource_item_id    uuid NOT NULL,
    curriculum_node_id  uuid,
    objective_id        uuid,
    subject_code        text,
    grade_min           smallint,
    grade_max           smallint,
    mapping_type        text NOT NULL
        CHECK (mapping_type IN ('primary', 'supporting', 'extension', 'remediation', 'misconception')),
    rationale           text NOT NULL DEFAULT '',

    CONSTRAINT resource_academic_mappings_tenant_identity_uq UNIQUE (org_id, id),
    CONSTRAINT resource_academic_mappings_resource_fk
        FOREIGN KEY (org_id, resource_item_id)
        REFERENCES resource_items (org_id, id) ON DELETE RESTRICT,
    CONSTRAINT resource_academic_mappings_node_fk
        FOREIGN KEY (org_id, curriculum_node_id)
        REFERENCES curriculum_nodes (org_id, id) ON DELETE RESTRICT,
    CONSTRAINT resource_academic_mappings_objective_fk
        FOREIGN KEY (org_id, objective_id)
        REFERENCES learning_objectives (org_id, id) ON DELETE RESTRICT,
    CONSTRAINT resource_academic_mappings_anchor_ck
        CHECK (curriculum_node_id IS NOT NULL OR objective_id IS NOT NULL OR subject_code IS NOT NULL),
    CONSTRAINT resource_academic_mappings_grade_pair_ck CHECK (
        (grade_min IS NULL AND grade_max IS NULL)
        OR (grade_min IS NOT NULL AND grade_max IS NOT NULL
            AND grade_min >= 0 AND grade_max >= grade_min)
    )
);

CREATE UNIQUE INDEX resource_academic_mappings_natural_uq
    ON resource_academic_mappings (
        org_id, resource_item_id,
        coalesce(curriculum_node_id, '00000000-0000-0000-0000-000000000000'::uuid),
        coalesce(objective_id, '00000000-0000-0000-0000-000000000000'::uuid),
        coalesce(subject_code, ''), coalesce(grade_min, -1), coalesce(grade_max, -1), mapping_type
    );

CREATE INDEX resource_academic_mappings_subject_grade_idx
    ON resource_academic_mappings (org_id, subject_code, grade_min, grade_max, resource_item_id);
CREATE INDEX resource_academic_mappings_objective_idx
    ON resource_academic_mappings (org_id, objective_id, resource_item_id)
    WHERE objective_id IS NOT NULL;

CREATE TABLE resource_favorites (
    org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    membership_id   uuid NOT NULL,
    resource_item_id uuid NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (org_id, membership_id, resource_item_id),
    CONSTRAINT resource_favorites_membership_fk
        FOREIGN KEY (org_id, membership_id)
        REFERENCES memberships (org_id, id) ON DELETE CASCADE,
    CONSTRAINT resource_favorites_resource_fk
        FOREIGN KEY (org_id, resource_item_id)
        REFERENCES resource_items (org_id, id) ON DELETE CASCADE
);

CREATE INDEX resource_favorites_resource_idx
    ON resource_favorites (org_id, resource_item_id, membership_id);

CREATE TABLE resource_health_checks (
    id                   uuid PRIMARY KEY,
    org_id               uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    resource_version_id  uuid NOT NULL,
    checked_at           timestamptz NOT NULL DEFAULT now(),
    status               text NOT NULL CHECK (status IN ('healthy', 'degraded', 'unavailable', 'withdrawn')),
    http_status          integer,
    descriptor_hash      text,
    details_json         jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT resource_health_checks_tenant_identity_uq UNIQUE (org_id, id),
    CONSTRAINT resource_health_checks_version_fk
        FOREIGN KEY (org_id, resource_version_id)
        REFERENCES resource_item_versions (org_id, id) ON DELETE RESTRICT,
    CONSTRAINT resource_health_checks_hash_ck
        CHECK (descriptor_hash IS NULL OR descriptor_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT resource_health_checks_details_ck
        CHECK (jsonb_typeof(details_json) = 'object')
);

CREATE INDEX resource_health_checks_latest_idx
    ON resource_health_checks (org_id, resource_version_id, checked_at DESC);

CREATE TABLE resource_review_decisions (
    id                   uuid PRIMARY KEY,
    org_id               uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    resource_version_id  uuid NOT NULL,
    decision             text NOT NULL CHECK (decision IN ('approved', 'rejected', 'withdrawn')),
    decided_by           uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    decided_at           timestamptz NOT NULL DEFAULT now(),
    findings_json        jsonb NOT NULL DEFAULT '{}'::jsonb,
    authorization_id     uuid,
    CONSTRAINT resource_review_decisions_tenant_identity_uq UNIQUE (org_id, id),
    CONSTRAINT resource_review_decisions_version_fk
        FOREIGN KEY (org_id, resource_version_id)
        REFERENCES resource_item_versions (org_id, id) ON DELETE RESTRICT,
    CONSTRAINT resource_review_decisions_authorization_fk
        FOREIGN KEY (org_id, authorization_id)
        REFERENCES authorizations (org_id, id) ON DELETE RESTRICT,
    CONSTRAINT resource_review_decisions_findings_ck
        CHECK (jsonb_typeof(findings_json) = 'object')
);

CREATE INDEX resource_review_decisions_history_idx
    ON resource_review_decisions (org_id, resource_version_id, decided_at DESC, id DESC);

COMMENT ON TABLE resource_review_decisions IS
    'Append-only canonical review history. review_state on the version is its controlled latest-decision projection.';

CREATE OR REPLACE FUNCTION apply_resource_review_decision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE resource_item_versions
       SET review_state = NEW.decision,
           reviewed_by = NEW.decided_by,
           reviewed_at = NEW.decided_at,
           updated_at = now()
     WHERE org_id = NEW.org_id AND id = NEW.resource_version_id;
    RETURN NEW;
END;
$$;
CREATE TRIGGER resource_review_decisions_apply_trg
AFTER INSERT ON resource_review_decisions
FOR EACH ROW EXECUTE FUNCTION apply_resource_review_decision();

CREATE OR REPLACE FUNCTION make_resource_review_decisions_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'resource review decisions are append-only'
        USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER resource_review_decisions_append_only_trg
BEFORE UPDATE OR DELETE ON resource_review_decisions
FOR EACH ROW EXECUTE FUNCTION make_resource_review_decisions_append_only();

CREATE TABLE resource_adoption_requests (
    id                    uuid PRIMARY KEY,
    org_id                uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    created_at            timestamptz NOT NULL DEFAULT now(),
    binding_id            uuid NOT NULL,
    current_version_id    uuid NOT NULL,
    proposed_version_id   uuid NOT NULL,
    requested_by          uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status                text NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'accepted', 'rejected', 'cancelled')),
    impact_json           jsonb NOT NULL DEFAULT '{}'::jsonb,
    resolved_by           uuid REFERENCES users(id) ON DELETE RESTRICT,
    resolved_at           timestamptz,
    CONSTRAINT resource_adoption_requests_tenant_identity_uq UNIQUE (org_id, id),
    CONSTRAINT resource_adoption_requests_binding_fk
        FOREIGN KEY (org_id, binding_id)
        REFERENCES resource_bindings (org_id, id) ON DELETE RESTRICT,
    CONSTRAINT resource_adoption_requests_current_fk
        FOREIGN KEY (org_id, current_version_id)
        REFERENCES resource_item_versions (org_id, id) ON DELETE RESTRICT,
    CONSTRAINT resource_adoption_requests_proposed_fk
        FOREIGN KEY (org_id, proposed_version_id)
        REFERENCES resource_item_versions (org_id, id) ON DELETE RESTRICT,
    CONSTRAINT resource_adoption_requests_distinct_versions_ck
        CHECK (current_version_id <> proposed_version_id),
    CONSTRAINT resource_adoption_requests_resolution_ck CHECK (
        (status = 'open' AND resolved_by IS NULL AND resolved_at IS NULL)
        OR (status <> 'open' AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL)
    ),
    CONSTRAINT resource_adoption_requests_impact_ck
        CHECK (jsonb_typeof(impact_json) = 'object')
);

CREATE UNIQUE INDEX resource_adoption_requests_one_open_uq
    ON resource_adoption_requests (org_id, binding_id, proposed_version_id)
    WHERE status = 'open';

CREATE INDEX resource_adoption_requests_status_idx
    ON resource_adoption_requests (org_id, status, created_at, id);

-- RLS is intentionally tenant isolation only. API/service authorization must further
-- restrict private collections, favorites, reviews, decisions, and learner-safe projections.
DO $$
DECLARE
    table_name text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'resource_academic_mappings', 'resource_favorites', 'resource_health_checks',
        'resource_review_decisions', 'resource_adoption_requests'
    ] LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
        EXECUTE format(
            'CREATE POLICY %I ON %I USING (org_id = nullif(current_setting(''app.org_id'', true), '''')::uuid) WITH CHECK (org_id = nullif(current_setting(''app.org_id'', true), '''')::uuid)',
            table_name || '_tenant_policy', table_name
        );
    END LOOP;
END;
$$;

