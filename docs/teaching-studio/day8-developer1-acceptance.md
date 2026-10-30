# Day 8 Developer 1 Backend Acceptance

**Scope:** migration and publication acceptance on a representative dataset.

**Status on 2026-10-30:** acceptance implementation complete; real-database execution remains blocked on this workstation because local PostgreSQL is not running and Docker/Podman is not installed. Do not mark the database gate passed until the command below completes successfully.

## Executable evidence

Run from `backend` against local Supabase:

```bash
npm run studio:day8:developer1:verify
```

The verifier refuses non-local PostgreSQL. It wraps all fixture rows in an outer transaction and rolls them back after the run.

## Acceptance scenario

The representative fixture creates a tenant, school, Content Authorizer, assigned and unassigned teachers, and a complete Board-to-Subtopic curriculum chain. It then exercises the production service workflow:

1. Save the Session Plan and Screen Script.
2. Create two Screens and persist typed editable content and tags.
3. Add a stable branch and a pinned Resource version placement.
4. Submit and validate the exact revision.
5. Review and authorize it.
6. Publish immutable Release 1 and verify teacher access boundaries.
7. Edit the Screen, verify revision advancement and authorization invalidation, and prove stale publication is rejected.
8. Revalidate, reauthorize and publish Release 2.
9. Verify Release 1 remains unchanged and direct update/delete operations fail.
10. Verify the complete curriculum chain and multiple ordered Sessions remain readable.

## Constraint evidence

The verifier checks migration registration, required Day 5-7 relations, publication/authorization/branch triggers, cross-tenant Session rejection, stale authorization rejection, immutable release update/delete rejection and duplicate exact-revision rejection.

## Status and blockers

Implementation is complete. Static syntax and focused ESLint checks pass. The combined Day 7 suite passes 20 tests, and the full applicable backend CI passes 127 tests with no failures.

The first real-database execution reached the connection step and failed with `ECONNREFUSED 127.0.0.1:54322`. Supabase CLI inspection confirmed that Docker and Podman are unavailable. Owner: local development environment owner. Severity: blocking for Day 8 database acceptance evidence. Schedule impact: the gate cannot be marked passed until local Supabase or another explicitly approved non-production acceptance database is available.

Record the successful execution output, database identity, actual hours and date in the team workbook. Any branch-depth product decision remains owned by its Day 7 owner and must be carried into the shared Day 8 blocker register.
