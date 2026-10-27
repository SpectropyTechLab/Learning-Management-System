# Day 2 Resource Library Schema Review

## Outcome

The package implements the Developer Guide's canonical `resource_items`, `resource_item_versions`, and `resource_bindings` model, plus collections, academic mappings, favorites, health checks, adoption requests, and append-only review decisions.

The SQL is a forward architecture draft. It is intentionally not appended to the repository's monolithic Supabase schema because the current LMS and the Teaching Studio target use different tenant and entity models.

## Repository integration finding

The current LMS schema uses:

- integer `clients.id` and `schools.id` tenant scope;
- integer `users.id` and `school_memberships.id`;
- Supabase JWT helpers `app_client_id()` and `app_role()`;
- `programs`, `grades`, `subjects`, `chapters`, `topics`, and `teaching_sessions` rather than the Developer Guide's UUID `organizations`, `memberships`, `curriculum_nodes`, `learning_objectives`, `slide_objects`, and `slide_branches`.

The Developer Guide requires new institutional tables to use UUID IDs, UUID `org_id`, composite same-tenant foreign keys, and trusted organization context. Substituting the LMS's integer `client_id` silently would change that contract. Before deployment, choose one explicit migration path:

1. Adopt the Teaching Studio UUID organization model and map existing LMS clients/schools through a durable migration table; or
2. Approve a revised contract that uses current LMS integer client/school identities everywhere, then rewrite all composite foreign keys and RLS policies consistently.

Do not create a second, unsynchronized tenant identity in production.

## Design decisions

### Stable identity and versioning

- `resource_items.id` remains stable when `title`, tags, or other discoverability metadata changes.
- `(org_id, resource_item_id, version_no)` is unique.
- `content_hash` is a lowercase SHA-256 value.
- `source_kind` identifies native, asset, package, or external provenance; `source_format` records the concrete format/profile.
- Approved and withdrawn version payloads cannot be updated. A changed payload requires a new version number.
- Reviewed versions cannot be deleted, and every binding uses `ON DELETE RESTRICT`.

### Review truth

- `resource_review_decisions` is the append-only canonical review history.
- `resource_item_versions.review_state`, `reviewed_by`, and `reviewed_at` are a controlled latest-decision projection for efficient discovery and binding checks.
- Production grants should deny direct application-role updates to these projection columns; decisions must be written through the review command/service.
- Inspection findings remain distinct from academic approval. An application workflow must not turn `inspection_failed` into `approved` without a valid inspection and authorization decision.

### Binding ownership and context

- `usage_mode` remains exactly `lesson` or `branch`.
- A lesson binding owns one `slide_object_id`; a branch binding owns one `branch_id`.
- The database check guarantees exactly one owner.
- `teaching_spec.placementCategory` carries R3 placement detail without expanding `usage_mode`.
- `teaching_spec`, `launch_spec`, and `fallback_spec` are stored per binding, so editing one lesson prompt does not change another placement.
- Only approved, non-archived resources can receive new bindings. Existing bindings remain valid after archival.

### Collections and mappings

- Collections reference items rather than copying item/version data.
- Collection visibility is organization metadata only. It never bypasses authorization on the underlying item/version.
- Academic mappings allow one item to map to several curriculum nodes, objectives, subjects, and grade ranges.
- Favorites are membership-scoped and do not grant access.

### Tenant isolation

- Every new tenant table carries `org_id`.
- Tenant child relationships use composite `(org_id, id)` foreign keys.
- RLS uses transaction-local `app.org_id`, matching the Developer Guide example.
- The application must set this value from verified membership on the same database transaction; a browser-supplied organization ID is invalid.
- RLS is defense in depth. API authorization must still exclude teacher-only data from learner projections and enforce private collection ownership.

## Load order

After all prerequisite Teaching Studio tables exist:

1. `db/schema/resource_items.sql`
2. `db/schema/resource_item_versions.sql`
3. `db/schema/resource_bindings.sql`
4. `db/schema/resource_collections.sql`
5. `db/schema/resource_supporting_tables.sql`

## Validation coverage

`resource_schema_validation.sql` checks:

- one approved version reused in Physics and Mathematics;
- independent prompt/launch/fallback JSON for each binding;
- Version 2 creation without changing Version 1;
- rejection of approved-version payload mutation;
- rejection of unreviewed-version binding;
- rejection of cross-tenant binding;
- archival preserving existing references while blocking new bindings;
- rejection of destructive deletion of a referenced reviewed version.

The harness uses a transaction and finishes with `ROLLBACK`.

## Checks requiring backend enforcement

- authenticated subject/grade/author scope;
- academic authorization before a lesson release is published;
- learner-safe projections that omit private metadata, teacher instructions, review findings, and protected sources;
- release manifests pinning exact version IDs and hashes;
- active teaching runs continuing with their pinned release after a newer version is approved;
- source rights, package inspection, runtime compatibility, and external-link health workflows;
- collection visibility and ownership beyond tenant-level RLS.

## Execution status

- Repository conventions and existing PostgreSQL/Supabase schema were inspected.
- Docker is installed but its daemon is not running.
- `psql` is not installed or available on `PATH`.
- No disposable database was therefore available, so the DDL was not executed against PostgreSQL in this workspace.
- The validation harness is ready to run with `psql` against an explicitly disposable database.

## Unresolved implementation decisions

1. Choose the canonical production tenant identity: Teaching Studio UUID organizations or current LMS integer clients/schools.
2. Decide whether subject/grade discovery maps to canonical `curriculum_nodes` or directly to the current LMS `subjects` and `grades` tables.
3. Confirm that the target `authorizations` table uses the Developer Guide's composite `(org_id, id)` identity expected by the review-decision foreign key.
4. Define application database roles and column/table grants so only the review service can create review decisions and update the state projection.
5. Finalize permitted `kind` and `source_format` registries; the draft keeps them extensible rather than embedding an incomplete enum.
