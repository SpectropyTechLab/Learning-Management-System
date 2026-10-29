# Day 5 Backend Handoff

**Status:** complete on 2026-10-29 against the Day 5 section of the authoritative 21-day work guide.

## Scope completed

| Owner in plan | Starting point | Missing Day 5 work completed |
|---|---|---|
| Poojitha | Session documents and a mutable draft/submitted/approved/published workflow already existed. | Added a Session revision, immutable exact-revision validation evidence, academic authorization records, automatic authorization invalidation after content edits, and publication checks against the exact current Plan, Script and Screen revisions. The API now reports the user-facing states saved, validated, authorized and published while preserving the agreed Day 2 database state names. |
| Rahul | `resources`, immutable `resource_versions` and version-pinned `resource_mappings` existed in the schema. | Added Resource create/list/detail APIs, new-version upload, media metadata, private Storage upload, and reverse-usage reporting with separate placement and distinct-Screen counts. |
| Dhanunjaya | Layout-based and genuinely blank Screen creation already existed. | Added Screen list/load/save/reorder APIs, optimistic revision checks, typed editable element validation, drawing-data round-trip, normalized tags and transactional replacement of Resource placements with Screen elements. |

The individual developers' historical hours cannot be reconstructed reliably from Git. Completion and verification were performed as one recovery session; no unverified hours are reported as actual hours.

## Changed implementation

- `supabase/migrations/20261029100000_studio_day5_persistence.sql`
- `backend/services/studioSessionWorkflow.service.js`
- `backend/services/studioResources.service.js`
- `backend/controllers/studioResources.controller.js`
- `backend/routes/studioResources.routes.js`
- `backend/services/studioScreens.service.js`
- `backend/controllers/studioScreens.controller.js`
- `backend/routes/studioScreens.routes.js`
- `backend/server.js`
- `backend/tests/studio-session-workflow.test.js`
- `backend/tests/studio-day5-api.test.js`
- `backend/scripts/verify-studio-day5-persistence.mjs`
- `backend/package.json`

## Day 5 API surface

### Resources

- `GET /api/studio/resources`
- `GET /api/studio/resources/:resourceId`
- `POST /api/studio/resources`
- `POST /api/studio/resources/:resourceId/versions`
- `GET /api/studio/resources/:resourceId/usages`

The usage response defines `placement_count` as the number of element bindings and `distinct_screen_count` as the number of unique Screens containing those bindings.

### Screen persistence

- `GET /api/studio/sessions/:sessionId/screens`
- `GET /api/studio/screens/:screenId`
- `PATCH /api/studio/screens/:screenId`
- `PATCH /api/studio/sessions/:sessionId/screens/reorder`

Screen save requires the current `revision_no`. Reorder requires the current `session_revision_no`. A stale value returns HTTP 409 instead of overwriting newer edits.

### Exact-revision workflow

The existing workflow routes remain:

- `POST /api/studio/sessions/:sessionId/submit`
- `POST /api/studio/sessions/:sessionId/review`
- `POST /api/studio/sessions/:sessionId/publish`
- `GET /api/studio/sessions/:sessionId/status`

Submit records the exact Session revision, current Plan and Script revision IDs, and every Screen revision. Approval creates an academic authorization tied to that validation. Publication succeeds only when that authorization still matches the current content. A document, Screen or order edit returns the Session to draft, increases its revision and invalidates the earlier authorization.

## Acceptance evidence

- The local forward migration applied and is registered as `20261029100000`.
- The real local Supabase verifier completed and removed its generated data.
- A saved Screen reopened with editable drawing strokes and Resource bindings intact.
- One Resource reported three placements across two distinct Screens.
- Missing Session Plan and Screen Script blocked workflow entry with validation errors.
- Screen reorder persisted and rejected stale Session revisions.
- Exact saved, validated, authorized and published states retained Plan, Script, Session and Screen revision evidence.
- Backend CI: 88 of 88 tests passed. The separately tracked legacy Question Bank debt suite remains excluded by the existing CI runner.
- Backend ESLint: zero errors with `--quiet`.
- Frontend Teaching Studio layout tests: 4 of 4 passed.
- Frontend production build passed. The existing large-chunk advisory remains informational.
- Days 1, 2, 3 and 4 local verification scripts all passed after the Day 5 change.

## Negative cases covered

- Missing Plan and Script cannot reach validated or published state.
- Cross-tenant or unavailable Resource versions cannot be placed.
- Unsupported element types, malformed editable properties and duplicate element IDs are rejected.
- A stale Screen save or stale Session reorder returns HTTP 409.
- A reorder payload must contain every Session Screen exactly once.
- A content edit invalidates academic authorization for the earlier revision.

## Remaining work and next owner

There is no open blocker inside Day 5 scope.

Day 6 deliberately owns work that is not claimed here:

- Developer 1: immutable release manifests and teacher published-content reads that pin Screen, layout and Resource revisions.
- Developer 2: isolated HTML and browser-ready ZIP execution.
- Developer 3: multi-tag preview discovery and stable branch destination lookup.

The known Vercel Hobby-plan deployment check is not Day 5 acceptance evidence. Repository CI, local database/Storage verification and the frontend build are the applicable checks for this handoff.
