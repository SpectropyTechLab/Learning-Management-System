-- Spectropy Resource Library: organization aids only; collection membership never grants access.
-- Prerequisites: memberships, resource_items.

CREATE TABLE resource_collections (
    id                   uuid PRIMARY KEY,
    org_id               uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),
    code                 text NOT NULL,
    title                text NOT NULL,
    description          text NOT NULL DEFAULT '',
    owner_membership_id  uuid NOT NULL,
    visibility           text NOT NULL DEFAULT 'private'
        CHECK (visibility IN ('private', 'organization')),
    archived             boolean NOT NULL DEFAULT false,

    CONSTRAINT resource_collections_tenant_identity_uq UNIQUE (org_id, id),
    CONSTRAINT resource_collections_code_uq UNIQUE (org_id, code),
    CONSTRAINT resource_collections_owner_fk
        FOREIGN KEY (org_id, owner_membership_id)
        REFERENCES memberships (org_id, id) ON DELETE RESTRICT,
    CONSTRAINT resource_collections_code_nonempty_ck CHECK (btrim(code) <> ''),
    CONSTRAINT resource_collections_title_nonempty_ck CHECK (btrim(title) <> '')
);

CREATE TABLE resource_collection_items (
    org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    collection_id     uuid NOT NULL,
    resource_item_id  uuid NOT NULL,
    sequence_no       integer NOT NULL CHECK (sequence_no > 0),
    added_at           timestamptz NOT NULL DEFAULT now(),
    added_by           uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    CONSTRAINT resource_collection_items_pk
        PRIMARY KEY (org_id, collection_id, resource_item_id),
    CONSTRAINT resource_collection_items_sequence_uq
        UNIQUE (org_id, collection_id, sequence_no),
    CONSTRAINT resource_collection_items_collection_fk
        FOREIGN KEY (org_id, collection_id)
        REFERENCES resource_collections (org_id, id) ON DELETE CASCADE,
    CONSTRAINT resource_collection_items_resource_fk
        FOREIGN KEY (org_id, resource_item_id)
        REFERENCES resource_items (org_id, id) ON DELETE RESTRICT
);

COMMENT ON TABLE resource_collection_items IS
    'Organizes stable resource identities. It copies no resource data and confers no access.';

CREATE INDEX resource_collection_items_resource_idx
    ON resource_collection_items (org_id, resource_item_id, collection_id);

ALTER TABLE resource_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_collections FORCE ROW LEVEL SECURITY;
CREATE POLICY resource_collections_tenant_policy ON resource_collections
    USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
    WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE resource_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_collection_items FORCE ROW LEVEL SECURITY;
CREATE POLICY resource_collection_items_tenant_policy ON resource_collection_items
    USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
    WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
