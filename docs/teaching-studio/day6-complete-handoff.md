# Day 6 Complete Handoff

**Status:** complete on 2026-10-29 against the Day 6 section of the authoritative 21-day work guide.

## Scope completed

| Owner in plan | Completed outcome |
|---|---|
| Poojitha | Immutable, append-only Session release manifests pin the exact authorized Session, document, Screen, layout and Resource revisions. Authorized teachers read published release snapshots only. |
| Rahul | Single HTML and browser-ready ZIP uploads are inspected, stored as immutable runtime assets, launched through short-lived tokens and delivered with a restrictive browser-isolation policy plus controls and fallback. |
| Dhanunjaya | Multi-tag discovery uses all requested tags, permission-controlled previews separate current authoring state from published releases, and branch destinations resolve through stable Session, Screen and release IDs. |

## API surface

### Publication

- `POST /api/studio/sessions/:sessionId/publish`
- `POST /api/studio/sessions/:sessionId/releases`
- `GET /api/studio/teacher/sessions/:sessionId/releases/current`
- `GET /api/studio/teacher/sessions/:sessionId/releases`
- `GET /api/studio/teacher/sessions/:sessionId/releases/:releaseNumber`

### HTML and ZIP runtime

- `POST /api/studio/resource-versions/:versionId/launch`
- `GET /api/studio/runtime/:launchToken/*`
- `GET /api/studio/resource-versions/:versionId/download`

### Discovery and branches

- `GET /api/studio/screens/discovery?tags={csv}`
- `GET /api/studio/screens/discovery?tags={csv}&session_id={id}`
- `GET /api/studio/screens/:screenId/branches`
- `GET /api/studio/screens/:screenId/branches?release_id={id}`

## Acceptance evidence

### Teacher reads published content only

A real local approved Session was published through the production service. The release pinned its exact Session, Plan, Script and Screen revisions. An active teacher membership could read the release; an unassigned teacher received HTTP 403. After the Session and Screen were changed back to draft revisions, the teacher still received the original immutable published Screen title.

### HTML and ZIP run in isolation

A real self-contained HTML Resource and a real browser-ready ZIP containing HTML, CSS and JavaScript were uploaded to local private Supabase Storage through the production Resource service. Short-lived runtime tokens served the actual stored bytes. The ZIP entry point and its CSS and JavaScript assets were retrieved from the immutable manifest. Delivery included `sandbox allow-scripts`, `form-action 'none'`, `object-src 'none'`, no-referrer and no-store protections. Reload, fullscreen, download and fallback contracts were returned.

### Multi-tag previews

A transactional real-database fixture confirmed that a request for two normalized tags returned only a Screen containing both tags. The same fixture confirmed stable destination and return Screen IDs and excluded another tenant's Screens.

## Automated verification

- Combined Day 6 tests: 19 of 19 passed.
- Full applicable backend CI: 107 of 107 tests passed.
- Backend ESLint: zero errors with `--quiet`.
- Local migration `20261029160000_studio_day6_publication.sql` is applied and registered.
- `git diff --check`: no whitespace errors.

Commands:

- `npm run studio:day6:verify`
- `npm run studio:day6:db-verify`
- `npm run studio:day6:integrated-verify` with local Supabase process variables supplied

## Cleanup evidence

The integrated verifier used an outer database transaction and removed the temporary private Storage objects. After verification, local counts returned to zero for generated Resources, Resource versions, runtime package objects, Session releases and temporary Day 6 users.

## Recorded integration boundary

The Day 6 HTML/ZIP endpoint is an author preview runtime. Teachers read the immutable published release manifest but do not receive an author-preview token. Teacher player integration must create runtime tokens only for Resource versions pinned inside an authorized release; that viewer concern is intentionally deferred and must not reuse the mutable author endpoint.

SCORM attempt state and persistence remain Day 7 scope.

## Changed verification support

- `backend/scripts/verify-studio-day6-discovery.mjs`
- `backend/scripts/verify-studio-day6-integrated.mjs`
- `backend/package.json`
- `backend/config/loadEnv.js`

`loadEnv.js` now accepts local-only configuration supplied through process environment variables as well as `.env.local`. `LOCAL_DEV=true` still rejects non-local database or Supabase hosts.
