# Hosted Supabase Schema Review — 28 October 2026

## Scope and safety

- Linked hosted project: `Learning Mangement System - OS` (`jzskfvrfnhzfngjmnwlh`, `ap-southeast-1`).
- Local baseline: `supabase/migrations/20261014000000_citext.sql` and `20261014000001_cloud_public_schema.sql`.
- Hosted evidence: the existing cloud baseline plus the linked-project pull saved as `supabase/migrations/20261028072933_cloud_sync_20261028.sql`.
- The initial schema dump was read-only. With explicit approval, hosted migration-history metadata was later reconciled; no generated SQL was applied to hosted application tables or data.
- The temporary database-password file was removed immediately after the dump.

## Structural comparison

| Object | Local baseline | Hosted schema | Difference |
|---|---:|---:|---:|
| Public tables | 54 | 61 | +7 |
| Functions | 9 | 9 | 0 |
| RLS policies | 46 | 46 | 0 |
| Indexes | 152 | 167 | +15 |

The hosted schema contains every table in the local baseline. No baseline table is absent from the hosted schema.

### Tables added in the hosted project

- `boards`
- `subtopics`
- `sessions`
- `screens`
- `layouts`
- `resources`
- `resource_mappings`

### Existing tables changed in the hosted project

- `programs`: added nullable `board_id` and foreign key to `boards`.
- `grades`: added nullable `name`.
- `chapters`: added `display_order` and `updated_at`.
- `subjects`: added `updated_at`.
- `topics`: added `description`, `display_order`, and `updated_at`.

The hosted schema also adds primary keys, foreign keys, uniqueness constraints, indexes, and timestamp triggers for the seven new tables.

## Alignment with the 21-day guide

The hosted additions demonstrate the intended high-level domains: Board-to-Subtopic curriculum, Studio sessions and screens, layouts, reusable resources, and screen-resource mappings. They are useful discovery evidence but are not a production-ready Day 3 contract.

## Resolved clarifications and remaining design gaps

### One session per subtopic

Resolved by the product owner on 28 October 2026: a subtopic must support multiple ordered sessions. The unique constraint on `sessions.subtopic_id` was removed directly from hosted Supabase, and the backend SQL is being updated by Poojitha so the constraint is not recreated. The generated local cloud-sync migration already omits this constraint. Re-verify hosted and local parity after the backend SQL update is merged.

### Session Plan and Screen Script storage modes

The product owner confirmed two supported authoring modes for both the Session Plan and Screen Script:

- direct upload: original file bytes are stored in a protected bucket and the database stores the storage reference plus file metadata;
- manual authoring: the entered content is stored in a content column because this path is expected to be used less often.

This explains why both file-reference and content fields are needed. One ownership-level decision remains for Day 2: the requirement says there is one Session Plan and one Screen Script per Studio session, but the hosted `screen_script_file_*` and `screen_script_content` columns are currently on `screens`, which permits a different script for every screen. If the document is session-wide, these fields should live on `sessions` or a session-document/revision table. Screen-level speaker notes or per-screen narration can remain a separate screen field.

### No exact-revision workflow

`sessions.status` and approval timestamps are mutable fields. There are no session revision, validation result, authorization record, immutable release, or release snapshot tables. The schema cannot prove that authorization applies to the exact revision that was published.

### Layouts are not versioned

`layouts` stores mutable `layout_data_json` directly. There is no immutable layout-version identity, assignment pinning, or versioned custom-layout model.

### Resources are not versioned independently

`resources` has a mutable integer `version` column, but no stable resource identity plus immutable `resource_versions`. `resource_mappings` points to `resources`, so a screen cannot reliably pin the exact approved bytes/version used by a published release.

### RLS is enabled without new policies

RLS is enabled on all seven new tables, but the hosted policy count remains 46—the same as the old baseline—and no policies were added for these tables. Direct `anon` or `authenticated` access will therefore be denied unless the application uses a service role. Service-role access still requires explicit server-side tenant and role enforcement.

### Publication and teacher discovery are incomplete

There is no immutable published-release representation, teacher run state, branch stack, or exact origin-state restoration model. Published discovery would currently depend on mutable session rows.

### Package-runtime evidence is absent

The resource-type check recognizes HTML, ZIP, and SCORM, but the schema does not establish package entry points, extracted-file inventories, manifests, SCOs, runtime state, tracking, resume, sequencing, compatibility results, or isolation policy.

## Migration-history condition

The hosted `supabase_migrations.schema_migrations` history is empty, while the repository contains the two baseline migration versions. Consequently, migration-mode `supabase db pull` stops and suggests marking these versions as applied:

- `20261014000000`
- `20261014000001`

The read-only comparison shows that the hosted public schema is a superset of the baseline, so repairing those two history entries is structurally reasonable. It is still a hosted metadata mutation and must be explicitly approved before execution.

## Recommendation

1. With explicit approval, mark the two baseline migrations as applied in hosted migration history.
2. Run `supabase db pull cloud_sync_20261028` to generate the incremental cloud delta.
3. Review the generated migration and retain it as synchronization evidence, not as the final Day 3 architecture.
4. Rebuild local Supabase from the migration chain and run structural checks.
5. Resolve the listed contract gaps during Day 2 before implementing or applying the final production migrations.

## Pull and local rebuild result

With explicit approval, hosted migration history was repaired to mark the two existing baseline versions as applied. `supabase db pull cloud_sync_20261028` then generated:

- `supabase/migrations/20261028072933_cloud_sync_20261028.sql`

The pull also recorded version `20261028072933` as applied in hosted migration history. It did not execute the generated SQL against hosted application tables; the hosted schema was already the source of that SQL.

### Generated migration review

- No table drops, truncation, row deletion, or top-level data updates were generated.
- Seven Studio tables and seven sequences are created.
- Curriculum columns, indexes, foreign keys, timestamp triggers, and RLS settings are added.
- Twenty-five existing check constraints are dropped and recreated with equivalent definitions by the diff engine.
- Existing function bodies are recreated for formatting-equivalent cloud definitions.
- The migration includes broad privilege revocations copied from the hosted schema.
- The pull engine omitted `sessions_subtopic_id_key`. The product owner subsequently confirmed that this unique constraint was removed from hosted Supabase and is also being removed from the backend SQL, which aligns the model with multiple sessions per subtopic.

### Local reset and structural verification

`supabase db reset --local` completed successfully with all three migrations and the intentionally empty `supabase/seed.sql`.

- Migration history: all three versions applied locally.
- Public tables: 61.
- All seven Studio tables exist.
- Local Studio row counts: zero, as expected from the empty seed.
- `supabase db diff --local --schema public`: no schema changes found.
- Local REST root health: HTTP 200.

### Runtime access failure

Authenticated REST checks against `boards` failed after the reset:

- anonymous key: HTTP 401, `permission denied for schema public`;
- service-role key: HTTP 403, `permission denied for schema public`.

This comes from the pulled `REVOKE ALL ON SCHEMA public` and related object revocations. RLS policy design alone will not fix access until the required schema/table/sequence/function grants are explicitly defined. The generated cloud-sync migration must therefore be treated as synchronization evidence, not accepted as the final production access migration.

### Ancillary local-service issue

The optional Supabase Vector log collector restarts because its Docker log source resolves an unreachable IPv6 endpoint on port 2375. Core PostgreSQL, Studio, Auth, Storage, Realtime, Kong, and REST services remain running. This logging-container issue does not invalidate migration application, but it should be corrected or analytics disabled for a clean local stack.
