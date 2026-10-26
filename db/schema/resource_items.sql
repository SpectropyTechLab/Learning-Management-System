-- Spectropy Resource Library: stable catalog identities.
-- Prerequisites: organizations(id), users(id).

CREATE TABLE resource_items (
    id                  uuid PRIMARY KEY,
    org_id              uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    code                text NOT NULL,
    title               text NOT NULL,
    kind                text NOT NULL,
    subject_tags        jsonb NOT NULL DEFAULT '[]'::jsonb,
    legacy_resource_id  uuid,
    created_by          uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    archived            boolean NOT NULL DEFAULT false,

    CONSTRAINT resource_items_tenant_identity_uq UNIQUE (org_id, id),
    CONSTRAINT resource_items_code_uq UNIQUE (org_id, code),
    CONSTRAINT resource_items_code_nonempty_ck CHECK (btrim(code) <> ''),
    CONSTRAINT resource_items_title_nonempty_ck CHECK (btrim(title) <> ''),
    CONSTRAINT resource_items_kind_nonempty_ck CHECK (btrim(kind) <> ''),
    CONSTRAINT resource_items_subject_tags_array_ck
        CHECK (jsonb_typeof(subject_tags) = 'array')
);

COMMENT ON COLUMN resource_items.id IS
    'Stable resource identity. Title and descriptive metadata may change without changing this ID.';
COMMENT ON COLUMN resource_items.code IS
    'Tenant-scoped human-readable label; never an authorization key.';
COMMENT ON COLUMN resource_items.kind IS
    'Pedagogical category, independent of technical source format.';
COMMENT ON COLUMN resource_items.archived IS
    'Archived items remain resolvable by existing bindings but are unavailable for new selection.';

CREATE INDEX resource_items_discovery_idx
    ON resource_items (org_id, kind, archived, title, id);

CREATE INDEX resource_items_subject_tags_gin_idx
    ON resource_items USING gin (subject_tags jsonb_path_ops);

ALTER TABLE resource_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_items FORCE ROW LEVEL SECURITY;

CREATE POLICY resource_items_tenant_policy ON resource_items
    USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
    WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
