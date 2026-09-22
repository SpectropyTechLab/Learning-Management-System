# Data model and API reference

Baseline: Version 1 · Phase 1, 19 September 2026. [Handbook](README.md)

## Data ownership

| Table | Purpose / key | Relationships |
|---|---|---|
| `studio_projects` | UUID; owner, scope, title, current JSON document and revision | References existing `users.id` |
| `studio_revisions` | `(project_id, revision)`; historical document and actor | Project and existing user |
| `studio_assets` | UUID; filename, MIME, size, original bytes, extracted text | Project |
| `studio_ai_jobs` | UUID; source revision, status, input, result, error, timestamps | Project and existing user |
| `studio_releases` | UUID; immutable document snapshot; unique project/revision | Project and approving user |
| `studio_audit` | BIGSERIAL; action, details and timestamp | Project and actor where applicable |

See [001_studio.sql](../../backend/scripts/studio/001_studio.sql) for exact types, indexes and constraints. There is no separate sessions/slides table in Phase 1: they are nested in the workspace document. A future normalization is a migration decision, not an undocumented implementation assumption.

The migration changes only Studio objects and their access controls. Existing OS curriculum is read/referenced. Pilot access is a separate, targeted `user_permissions` entry; no role-wide grant was added. Existing business records are not rewritten by the integration.

## Workspace contract

`schemaVersion: 1` has:

- `curriculum`: optional program, grade, subject, chapter and topic IDs.
- `metadata`: title, program, grade, subject, chapter, topics, language and instructions.
- `sessions[]`: stable ID, title, duration, objectives, plan, script and slides.
- Each slide: stable ID, title/body/notes, template, background, transition, elements, interaction, visual brief and warnings.
- Each element: ID, text/shape/image/video kind, asset reference, position, size, text style and lock state.

Types are in [types.ts](../../frontend/src/features/digital-studio/module/types.ts); runtime validation is in [contracts.mjs](../../backend/studio/contracts.mjs). Never treat TypeScript alone as input validation. Schema changes must include compatibility rules for saved drafts, historical revisions, jobs and releases.

## API inventory

Base path: `/api/studio/v1`. All routes reuse OS authentication and Studio authorization. Project routes additionally require ownership/scope. Bodies and response shapes below summarize the implementation; [router.mjs](../../backend/studio/router.mjs) is the detailed reference.

| Method / relative path | Purpose / important input |
|---|---|
| GET `/config` | Non-secret AI/configuration availability |
| GET `/curriculum/:kind` | Scoped existing curriculum options; ancestry filters |
| GET `/models` | Allowed compatible model catalogue |
| GET `/projects` | Latest 100 owned/scoped project summaries |
| POST `/projects` | Create empty workspace, returns project and HTTP 201 |
| GET `/projects/:id` | Read owned project |
| PUT `/projects/:id` | Save `{document, revision}`; returns updated project |
| GET `/projects/:id/revisions` | Latest 30 revision summaries |
| POST `/projects/:id/restore` | `{restoreRevision, revision}`; restore as a new current revision |
| GET `/projects/:id/assets` | Asset metadata |
| POST `/projects/:id/assets` | Multipart source/media upload; inspect router for supported fields/types |
| GET `/projects/:id/assets/:assetId` | Authorized binary download |
| POST `/projects/:id/jobs` | `{task, model, revision, sessionId?, sourceText?}`; returns queued job, HTTP 202 |
| GET `/projects/:id/jobs` | Latest 10 jobs, statuses and proposals |
| POST `/projects/:id/jobs/:jobId/apply` | Apply completed proposal once, only at matching base revision |
| POST `/projects/:id/publish` | `{revision, reviewed: true}`; requires slides and resolved warnings |
| GET `/projects/:id/releases/latest` | Latest owned immutable release document |

AI tasks: `metadata`, `plan`, `script`, `slides`, `interpret-plan`, `interpret-script`. Statuses: queued → running → completed → applied, with failed as an error outcome. Interrupted jobs fail visibly; no automatic paid retry.

Common outcomes: 400 invalid content/review, 401 authentication, 403 permission, 404 inaccessible/missing resource, 409 revision conflict, 413 oversized upload, 429 generation quota, 503 AI unavailable. Unexpected server errors are sanitized. Do not expose provider bodies or credentials in user errors.

## Limits and invariants

- Current source/media: 10 MB per file, 100 MB per project; stored in PostgreSQL BYTEA.
- DOCX expanded archive limits are enforced; this is not malware scanning.
- Scanned PDFs require supplied OCR text; arbitrary layouts are not guaranteed.
- AI: two active jobs per user, default 30 requests per rolling 24 hours; these are not monetary spending caps.
- Output token default 16,000, configurable ceiling 32,000; model capability/context may impose tighter limits.
- Projects have optimistic revision checks. An old AI result cannot replace a newer draft.
- Publication is idempotent for project/revision and requires explicit review. It does not publish to an LMS course or enroll students.
- Deletion/archival APIs, pagination beyond the listed limits and retention jobs are not implemented.

## Additive Board metadata — local contract extension

`workspace.metadata.boards` is optional, with at most five distinct values: CBSE/NCERT, TGSCERT, APSCERT, KSEAB, MSBTE. Stored in existing Studio document JSON; schemaVersion remains 1. Missing values mean no selection, preserving legacy revisions without rewriting them. Present optional fields are fully validated; arbitrary properties remain rejected. No SQL migration or existing LMS-table changes. Parser output uses the existing slide contract; it does not yet introduce versioned blocks. Future strict model schemas require all declared properties while local validation permits missing Board metadata in old documents. AI remains off.

## Reusable activity update — local, 21 September 2026

See [reusable activities](REUSABLE_ACTIVITIES.md) for the new versioned activity contract, editable comparison tables, step explanations and matching pairs, cross-subject examples, release compatibility and limitations. New comparison-row scripts now create aligned tables; legacy cards remain supported. This supersedes earlier planned-only/card-only descriptions for these three components. The full interaction library, source-aware merge and cinematic 3D remain pending. No production deployment, AI activation or LMS-table migration occurred.

## Local exploration/scene increment — 21 September 2026

[Hotspots, sorting and first 2D/3D scene](SCENES_AND_EXPLORATION.md) records the current controls, versioned contracts, ownership checks, examples, test evidence, deployment order and limitations. These features are now locally implemented; prior planned-only statements for this subset are superseded. P3/P4 remain partial. The full cinematic timeline, high-end graphics quality target and wider simulation library remain pending. Production remains unchanged; AI stays off.

## Optional block composition contract — local

See [composition contract](COMPOSITION_EDITOR.md#contract-and-compatibility). Workspace schemaVersion remains 1; optional slide.composition version 1 is independently bounded/validated. Asset ownership collection includes every block element and activity image. Uses existing Studio JSON document/revision storage; no schema migration or LMS-table changes. Compatibility requires the matching renderer: legacy fallback fields are not kept synchronized with block edits.

## Local group/style contract

Optional groupId and textStyle are validated inside each composition block. Groups are flat and slide-scoped with at least two members. Styles are allowlisted, limited to text blocks and persisted in existing Studio JSON/revision data. No SQL migration. Details: [arrangement editor](ARRANGEMENT_EDITOR.md).
