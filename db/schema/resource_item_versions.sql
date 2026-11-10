-- Spectropy Resource Library: immutable, reviewable resource versions.
-- Prerequisites: resource_items, assets, package_versions, simulation_specs, users.

CREATE TABLE resource_item_versions (
    id                  uuid PRIMARY KEY,
    org_id              uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    resource_item_id    uuid NOT NULL,
    version_no          integer NOT NULL CHECK (version_no > 0),
    source_kind         text NOT NULL
        CHECK (source_kind IN ('native', 'asset', 'package', 'external')),
    source_format       text NOT NULL,
    asset_id            uuid,
    package_version_id  uuid,
    simulation_spec_id  uuid,
    source_url          text,
    provider_code       text,
    metadata_json       jsonb NOT NULL DEFAULT '{}'::jsonb,
    content_hash        text NOT NULL,
    review_state        text NOT NULL DEFAULT 'draft'
        CHECK (review_state IN
            ('draft', 'inspection_failed', 'pending_review', 'approved', 'rejected', 'withdrawn')),
    reviewed_by         uuid REFERENCES users(id) ON DELETE RESTRICT,
    reviewed_at         timestamptz,

    CONSTRAINT resource_item_versions_tenant_identity_uq UNIQUE (org_id, id),
    CONSTRAINT resource_item_versions_number_uq
        UNIQUE (org_id, resource_item_id, version_no),
    CONSTRAINT resource_item_versions_item_fk
        FOREIGN KEY (org_id, resource_item_id)
        REFERENCES resource_items (org_id, id) ON DELETE RESTRICT,
    CONSTRAINT resource_item_versions_asset_fk
        FOREIGN KEY (org_id, asset_id)
        REFERENCES assets (org_id, id) ON DELETE RESTRICT,
    CONSTRAINT resource_item_versions_package_fk
        FOREIGN KEY (org_id, package_version_id)
        REFERENCES package_versions (org_id, id) ON DELETE RESTRICT,
    CONSTRAINT resource_item_versions_simulation_fk
        FOREIGN KEY (org_id, simulation_spec_id)
        REFERENCES simulation_specs (org_id, id) ON DELETE RESTRICT,
    CONSTRAINT resource_item_versions_format_nonempty_ck
        CHECK (btrim(source_format) <> ''),
    CONSTRAINT resource_item_versions_hash_ck
        CHECK (content_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT resource_item_versions_metadata_object_ck
        CHECK (jsonb_typeof(metadata_json) = 'object'),
    CONSTRAINT resource_item_versions_review_actor_ck
        CHECK (
            (review_state IN ('approved', 'rejected', 'withdrawn')
                AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
            OR
            (review_state IN ('draft', 'inspection_failed', 'pending_review'))
        ),
    CONSTRAINT resource_item_versions_source_shape_ck CHECK (
        (source_kind = 'native'
            AND asset_id IS NULL AND package_version_id IS NULL
            AND source_url IS NULL AND provider_code IS NULL)
        OR
        (source_kind = 'asset'
            AND asset_id IS NOT NULL AND package_version_id IS NULL
            AND source_url IS NULL)
        OR
        (source_kind = 'package'
            AND package_version_id IS NOT NULL AND asset_id IS NULL
            AND source_url IS NULL)
        OR
        (source_kind = 'external'
            AND source_url IS NOT NULL AND provider_code IS NOT NULL
            AND asset_id IS NULL AND package_version_id IS NULL
            AND simulation_spec_id IS NULL)
    )
);

COMMENT ON COLUMN resource_item_versions.content_hash IS
    'SHA-256 of immutable bytes, native canonical payload, package content, or external descriptor.';
COMMENT ON COLUMN resource_item_versions.review_state IS
    'Controlled projection of the latest review decision; application roles must not update it directly.';

CREATE INDEX resource_item_versions_item_idx
    ON resource_item_versions (org_id, resource_item_id, version_no DESC);

CREATE INDEX resource_item_versions_review_idx
    ON resource_item_versions (org_id, review_state, source_kind, source_format, id);

CREATE INDEX resource_item_versions_hash_idx
    ON resource_item_versions (org_id, content_hash);

CREATE OR REPLACE FUNCTION protect_resource_item_version()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.review_state IN ('approved', 'rejected', 'withdrawn') THEN
            RAISE EXCEPTION 'create the version as draft/pending and write a review decision'
                USING ERRCODE = '55000';
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        IF OLD.review_state IN ('approved', 'rejected', 'withdrawn') THEN
            RAISE EXCEPTION 'reviewed resource version % cannot be deleted', OLD.id
                USING ERRCODE = '23503';
        END IF;
        RETURN OLD;
    END IF;

    -- The only supported state transition is the nested UPDATE issued by the
    -- append-only resource_review_decisions trigger. Direct state rewrites could
    -- otherwise turn an approved row back into a mutable draft.
    IF ROW(NEW.review_state, NEW.reviewed_by, NEW.reviewed_at)
       IS DISTINCT FROM ROW(OLD.review_state, OLD.reviewed_by, OLD.reviewed_at)
       AND pg_trigger_depth() < 2
    THEN
        RAISE EXCEPTION 'write a resource review decision instead of updating review state directly'
            USING ERRCODE = '55000';
    END IF;

    IF OLD.review_state IN ('approved', 'rejected', 'withdrawn') AND
       ROW(NEW.resource_item_id, NEW.version_no, NEW.source_kind, NEW.source_format,
           NEW.asset_id, NEW.package_version_id, NEW.simulation_spec_id,
           NEW.source_url, NEW.provider_code, NEW.metadata_json, NEW.content_hash)
       IS DISTINCT FROM
       ROW(OLD.resource_item_id, OLD.version_no, OLD.source_kind, OLD.source_format,
           OLD.asset_id, OLD.package_version_id, OLD.simulation_spec_id,
           OLD.source_url, OLD.provider_code, OLD.metadata_json, OLD.content_hash)
    THEN
        RAISE EXCEPTION 'reviewed resource version % is immutable; create a new version', OLD.id
            USING ERRCODE = '55000';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER resource_item_versions_protect_trg
BEFORE INSERT OR UPDATE OR DELETE ON resource_item_versions
FOR EACH ROW EXECUTE FUNCTION protect_resource_item_version();

ALTER TABLE resource_item_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_item_versions FORCE ROW LEVEL SECURITY;

CREATE POLICY resource_item_versions_tenant_policy ON resource_item_versions
    USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
    WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
