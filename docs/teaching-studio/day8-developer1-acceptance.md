# Day 8 Developer 1 Backend Acceptance

**Scope:** migration and publication acceptance on a representative dataset.

**Status on 2026-10-30:** complete. The representative scenario passed against the local Docker-based Supabase database after integration into the shared Day 8 branch.

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

The real-database execution completed successfully. It verified registered migrations and relations, curriculum ownership, ordered sibling Sessions, revision-pinned publication, assigned and unassigned teacher boundaries, authorization invalidation after draft edits, stale-publication rejection, immutable historical releases and database rejection of release update/delete operations.

The earlier local-environment blocker is closed. Docker-based Supabase was available during the combined execution, and the verifier rolled back its representative fixture after completion.

Record the successful execution output, database identity, actual hours and date in the team workbook. The branch-depth product decision remains open in the shared Day 8 blocker register.
