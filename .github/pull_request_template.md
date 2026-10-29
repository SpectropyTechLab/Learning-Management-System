## Summary

<!-- What changed, and why? Link the ticket/task. -->

## Target and scope

- [ ] This PR targets `development`, or it is a verified release/hotfix targeting `main`.
- [ ] The branch contains one coherent change and no unrelated generated files.
- [ ] I updated my branch from its base branch and resolved conflicts with the relevant code owners/authors.

## Verification

- [ ] Frontend production build passes, if frontend code changed.
- [ ] Backend tests and lint pass, if backend code changed.
- [ ] I tested the affected user roles and both success and failure paths.
- [ ] I tested the integrated `development` deployment when this change interacts with another feature.
- [ ] I added or updated automated tests where practical.

## Database and data safety

- [ ] No database change.
- [ ] Database change included as a new, timestamped, forward-only migration.
- [ ] The migration is backward compatible with the currently deployed frontend and backend.
- [ ] The migration was tested on local/staging Supabase with non-production data.
- [ ] A rollback/forward-fix plan is described below.

Delete the four database-change items above when this PR has no database change. Never include production credentials, production data, or a production database dump.

## Deployment impact

<!-- List new/changed Vercel, Render, Supabase, CORS, storage, cron, or environment-variable settings. Write "None" if there are none. -->

## Evidence

<!-- Add screenshots, test output, preview/staging URLs, and manual test notes. Do not paste secrets or personal data. -->

## Rollback or forward-fix plan

<!-- State how the application can be returned to a safe state. Database migrations are not rolled back by reverting application code. -->

## Reviewer ownership

- Frontend reviewer:
- Backend reviewer:
- Database reviewer (when applicable):
- Release approver (for `main` only):
