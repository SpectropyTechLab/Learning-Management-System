# Day 7 Developer 3 Handoff

**Scope:** persistent teacher branch runs, nested checkpoints and exact return-state restoration.

**Status:** implementation and isolated verification complete. The migration still requires application and transactional verification against the team development database.

## Implemented contract

- `studio_branch_runs` groups every branch visit made by one teacher against one immutable release.
- `studio_branch_checkpoints` stores immutable origin Session, Screen, release, reveal, annotations, interaction and focus independently from mutable branch state.
- Nested branches unwind in last-in-first-out order.
- Active runs resume after refresh through a read endpoint.
- Runs and checkpoints record active, returned, completed and abandoned lifecycle evidence for auditing and future analytics.
- All operations re-check teacher ownership, tenant and current published-release access.
- Entry, update, return and abandonment lock the run and use database transactions where state spans multiple rows.

The normalized `screen_elements`, `screen_tags` and `screen_branches` model is preserved. Runtime operations do not update authored Screens, authored branches or immutable `session_releases`.

## API surface

- `POST /api/studio/branch-runs`
- `POST /api/studio/branch-runs/:runId/enter`
- `PATCH /api/studio/branch-runs/:runId/checkpoints/:checkpointId/state`
- `POST /api/studio/branch-runs/:runId/return`
- `GET /api/studio/branch-runs/:runId`
- `GET /api/studio/branch-runs/:runId/history`
- `POST /api/studio/branch-runs/:runId/complete`
- `POST /api/studio/branch-runs/:runId/abandon`

## Navigation-depth decision

The supplied task confirmed nested navigation but did not state a numeric limit. The implementation defaults to depth **3**, accepts `STUDIO_BRANCH_MAX_DEPTH`, and applies an absolute database bound of 32. The product owner must confirm the production value before the Day 8 backend gate.

## Verification evidence

`npm run studio:day7:verify` covers route registration, permitted release access, nested entry, separate branch-state updates, refresh/resume, LIFO return, exact restoration of all origin fields, multiple sequential branches, completion, history, authorization denial, ownership, terminal states and depth enforcement.

Result on 2026-10-30: 4 focused Day 7 tests passed, 0 failed. The full applicable backend CI passed 111 tests with 0 failures, the Day 6 regression suite passed 19 tests with 0 failures, and focused ESLint completed with zero errors. A representative scenario is recorded in `backend/tests/fixtures/studio-day7-branch-runtime.json`.

## Remaining integration evidence

- Apply `20261030120000_studio_day7_branch_runtime.sql` to the team development database.
- Run the same nested sequence against real PostgreSQL rows and the actual published release fixture.
- Confirm the production maximum branch depth.
- Frontend capture and rehydration of reveal, annotation, interaction and focus state remains later integration work.
