# Architecture and source map

Baseline: Version 1 · Phase 1, 19 September 2026. [Handbook](README.md)

## Runtime structure

```mermaid
flowchart LR
  A[Author in Spectropy OS] --> B[React Studio module on Vercel]
  B --> C[Existing Express backend on Render]
  C --> D[OS authentication and permissions]
  C --> E[(Supabase PostgreSQL: studio_* tables)]
  C --> F[Read existing users and curriculum]
  C -. when enabled .-> G[PostgreSQL AI jobs and worker]
  G -. configured provider .-> H[OpenRouter / Anthropic / Gemini]
```

There is one OS frontend deployment and one OS backend deployment. Studio is a feature inside those deployments. The local preview is a separate development tool, never a replacement for production authentication.

## Source ownership

| Path | Responsibility |
|---|---|
| Sibling `Digital_Teaching_Classroom/application/frontend/` | Canonical editor, presentation, types and styles |
| Sibling `Digital_Teaching_Classroom/application/server/` | Canonical API, schema, curriculum and AI logic |
| Sibling `Digital_Teaching_Classroom/application/migrations/` | Canonical additive SQL |
| Sibling `Digital_Teaching_Classroom/application/scripts/sync-os.mjs` | Copies owned source into this deployable LMS repository |
| [frontend module](../../frontend/src/features/digital-studio/module/) | Generated production frontend copy; edit canonical source first |
| [backend module](../../backend/studio/) | Generated backend copy |
| [migration](../../backend/scripts/studio/001_studio.sql) | Deployable SQL copy |
| [frontend adapter](../../frontend/src/pages/dashboard/content_authorizer/DigitalStudio.tsx) | OS API client, PDF extraction and shell wrapper |
| [routes](../../frontend/src/app/routes/AppRoutes.tsx) | Lazy-loaded permission-protected Studio route |
| [OS shell](../../frontend/src/pages/dashboard/content_authorizer/ContentAuthorizerShell.tsx) | Final sidebar item, conditional on permission |
| [backend adapter](../../backend/routes/studio.routes.js) | Reuses OS middleware, pool and optional worker |
| [backend entry](../../backend/server.js) | API registration and worker shutdown |
| [manifest](../../studio-module-manifest.json) | SHA-256 inventory of packaged module files |
| `docs/digital-studio/` | Canonical living handbook, versioned with LMS code |

The LMS builds without the sibling folder because packaged copies are committed. Conversely, canonical Studio tooling/tests and older discovery files are not automatically versioned by an LMS commit. Preserving the whole workspace in approved source control is an outstanding repository-governance decision; do not claim the sync script backs everything up.

## Save and presentation behavior

The editor maintains a structured workspace, with sessions and slides nested in JSON. Autosave waits approximately 1.5 seconds after edits. The server validates the document and supplied revision, locks the project for mutation, writes a new revision and records relevant audit events. Stale saves fail with a conflict instead of silently overwriting another edit.

Draft presentation reads the current lesson. Publication stores an immutable document snapshot in a separate release row. “Publish lesson” is not “deploy application,” does not post publicly, and does not assign the lesson to students. Access remains owner/scoped in this release. Media references still depend on retained assets.

## AI boundary

The UI requests named operations, never embeds vendor credentials. The backend checks an allowed model and stores a durable job containing the source revision and provider/model selection. A worker claims jobs atomically with `SKIP LOCKED`; it calls the provider outside a long-held database transaction. Validated proposals are reviewed and applied only if their base revision still matches.

The current worker runs in the existing backend process only when explicitly enabled. Provider switching is server configuration; authors choose allowed models. No silent cross-provider fallback or automatic paid retry is promised. The adapters exist, but production activation and real-model evaluation are pending.

## Security and operational boundaries

- OS authentication, Content Authorizer role and `studio.access` precede Studio resource queries.
- Resource operations enforce both owner ID and scope. Database RLS alone is insufficient because the configured backend database role can bypass it.
- Browser Supabase roles have no direct Studio table access. No service key belongs in frontend code.
- Uploads are bounded and authenticated. Current BYTEA storage shares database resources; malware scanning/private object storage are pending.
- AI outputs are declarative, validated lesson data, not executable JavaScript.
- Foreign keys reference existing users without altering their columns. They can briefly lock referenced objects and constrain future user deletion; separate tables do not eliminate all coupling.
- Lazy loading keeps editor/PDF code out of the initial OS bundle. Shared deployment, database and runtime failures can still affect the OS.
