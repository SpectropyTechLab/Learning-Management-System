# Collaboration and deployment workflow

This repository uses `main` as the production branch and `development` as the shared integration branch. Developers work in short-lived branches and merge only through pull requests (PRs). Production services and production data are never used for feature testing.

## Assessed state (24 October 2026)

The following observations are based on the fetched `origin/*` references in the assessed workspace:

- `origin/development` is an ancestor of `origin/main`: it has no unique commits and is 67 commits behind. It can be fast-forwarded without losing development work.
- `origin/feature/Core-Canvas-UI` has one unique commit and is missing two commits from `origin/main`. It needs an ordinary update and PR review.
- The local `main` checkout is not a trustworthy release source: it is two commits ahead of and one commit behind `origin/main`, with substantial existing uncommitted work. Branch repair and release operations must be performed from a clean clone or clean worktree.
- `backend/.env` and `frontend/.env` are tracked even though `.gitignore` lists them. Approximately 6,169 `backend/node_modules` files, 19,221 `frontend/node_modules` files, and 69 `frontend/dist` files are also tracked. Git ignore rules do not affect files already tracked.
- The frontend build and backend tests are available. Frontend lint has existing failures and must be paid down before it becomes a required check.
- The backend exposes `/health`, which can be used by the staging and production services.

## Target architecture

| Stage | Git source | Frontend | Backend | Database |
| --- | --- | --- | --- | --- |
| Local | developer feature branch | Vite locally | Express locally | Local Supabase only |
| Integration/staging | `development` | Vercel staging/custom environment or branch domain | Separate Render staging service | Separate Supabase staging project |
| Production | `main` | Existing Vercel production project/domain | Existing Render production service | Existing Supabase production project |

The staging and production credentials must be different. The staging database should contain synthetic or anonymized test data, never a copy of client data unless an approved data-governance process has sanitized it.

Vercel preview deployments for feature branches must use preview/staging variables and must never point at the production API or Supabase project. A shared staging backend is suitable for UI-only PR previews. Backend or schema PRs should first be tested locally; use isolated Render/Supabase preview environments if the account plans support them.

## One-time repository preparation

Perform this work as a dedicated, reviewed maintenance change from a clean clone. Do not run these commands in a dirty working tree.

### 1. Preserve and update `development`

First confirm the relationship has not changed:

```bash
git fetch origin --prune
git rev-list --left-right --count origin/main...origin/development
git merge-base --is-ancestor origin/development origin/main
```

The assessed result was `67 0`, and the ancestor check succeeded. Create a recoverable backup before updating the remote branch:

```bash
git branch backup/development-before-sync-20261024 origin/development
git push origin backup/development-before-sync-20261024
git push origin origin/main:development
```

The last command is a fast-forward update, not a force push. If either relationship check now differs, stop and open a `main` -> `development` PR instead; review the development-only commits before merging. Never use `--force`.

This one-time operation was completed on 24 October 2026. The remote backup is `backup/development-before-sync-20261024`, and `origin/development` now matches `origin/main` at `ab8b24b4`.

After this one-time synchronization, all changes to `development` go through PRs.

### 2. Remove tracked secrets and generated files

Rotate every credential that has ever been stored in a tracked `.env` file. Removing a secret in a later commit does not remove it from Git history. Coordinate history rewriting separately only if the organization decides it is necessary; credential rotation is mandatory either way.

Preserve local files while removing them from Git's index:

```bash
git rm --cached backend/.env frontend/.env
git rm -r --cached backend/node_modules frontend/node_modules frontend/dist
git add .gitignore backend/.env.local.example
git commit -m "chore: stop tracking secrets and generated artifacts"
```

Verify that no other environment files or generated dependencies are tracked:

```bash
git ls-files | grep -E '(^|/)\.env($|\.)|(^|/)node_modules/|^frontend/dist/'
```

Only sanitized `*.example` environment files are allowed. Store real values in Vercel, Render, Supabase, GitHub environments, or ignored local files.

### 3. Make the baseline green, then protect both long-lived branches

The clean baseline has 10 failures in the unrelated legacy `question-bank-flow.test.js` suite because its mock predates the current program-ownership query. The team has explicitly deferred that separate product-policy issue. Required CI therefore runs every other backend test through `npm run test:ci`; the excluded suite still runs as a visible informational job and must not be added to the required branch checks. The maintenance change also raises the bounded Workbox precache ceiling to 4 MiB because the current production bundle is slightly above 3 MB.

Create GitHub rulesets for `main` and `development`:

- Require a PR and at least one approval from someone other than the final pusher.
- Dismiss stale approvals when new commits are pushed.
- Require all conversations to be resolved.
- Require branches to be up to date before merging, or use GitHub's merge queue.
- Require these checks: `PR policy and repository safety`, `Frontend build`, and `Backend tests and lint`.
- Block force pushes and deletions, including for administrators; keep emergency bypass access limited and audited.
- Enable automatic deletion of merged feature branches.

For `main`, require two approvals when possible: one technical reviewer and one release approver. A PR to `main` is accepted only from `development` or `hotfix/*`; CI enforces this rule. Do not require a single all-knowing integrator. Instead, assign review by ownership: the author of the affected frontend area, backend area, or database migration reviews that portion, and all three developers share staging verification.

Add `.github/CODEOWNERS` after the real GitHub users or teams are known. Do not add placeholder owners because invalid owners silently weaken the intended review routing.

## Daily developer workflow

Start each task from the current integration branch:

```bash
git fetch origin --prune
git switch development
git pull --ff-only origin development
git switch -c feature/TICKET-short-description
```

Each developer owns a different short-lived branch. Commit small, coherent changes and push the feature branch. Before requesting final review, incorporate the latest integration state:

```bash
git fetch origin
git merge origin/development
```

Resolve conflicts on the feature branch with the developers who own the conflicting behavior. Run the build and tests, then open a draft PR to `development`. Draft PRs make cross-feature changes visible early without declaring them merge-ready.

Use a normal merge commit for PRs into `development` when preserving the feature boundary helps debugging. Squash trivial fixup commits if the team prefers a cleaner history. Do not rebase a branch after other developers have based work on it.

## Existing Core Canvas feature

The assessed branch diverged at commit `74a49349`: `main` has two later commits, and `feature/Core-Canvas-UI` has one unique commit. Update it without rewriting remote history:

```bash
git fetch origin
git switch --track origin/feature/Core-Canvas-UI
git merge origin/development
```

Resolve any conflicts with both the Core Canvas author and the owner of the affected production code, run CI locally, push the merge commit, and open a PR to `development`.

## CI and integration gate

The committed `.github/workflows/ci.yml` runs on PRs and pushes to both long-lived branches. It:

- permits release PRs to `main` only from `development` or `hotfix/*`;
- rejects newly committed `.env`, `node_modules`, and `frontend/dist` files;
- prevents edits, renames, or deletions of existing Supabase migrations;
- builds the frontend production bundle;
- runs all backend tests except the explicitly deferred legacy Question Bank suite, plus backend lint;
- runs the deferred Question Bank suite separately as a visible, non-blocking job.

Frontend lint is deliberately not a required check yet because the repository already has known lint debt. Track that cleanup separately, make the baseline pass, and then add `npm run lint` to the frontend CI job.

CI proves that each candidate builds and passes automated checks. It does not prove that independently correct features work together. That is the purpose of the continuously deployed `development` staging environment and its acceptance checklist.

## Provider configuration

### Vercel

- Keep the production branch set to `main`; do not temporarily point production at `development`.
- Keep the existing production domain attached only to the production environment.
- Configure `development` as a staging custom environment/branch, or assign it a stable preview domain such as `staging.example.com`.
- Set Production `VITE_API_BASE_URL` to the production Render URL.
- Set staging and Preview `VITE_API_BASE_URL` to the staging Render URL, never production.
- Scope authentication cookie variables separately. Do not set a production cookie domain on preview deployments.
- Protect preview/staging URLs with team authentication or a password when they contain client-like workflows.

### Render

- Keep the existing production service on `main`.
- Create a separate staging web service from the same repository with root directory `backend`, build command `npm ci`, start command `node server.js`, and branch `development`.
- Give staging its own environment variables and Supabase staging credentials. Set `NODE_ENV=production`, an independent `JWT_SECRET`, explicit staging `CORS_ORIGIN`, and `ALLOW_PREVIEW_ORIGINS=true` only if arbitrary Vercel PR previews must call it.
- Keep production `ALLOW_PREVIEW_ORIGINS` unset/false and list only the real production frontend in `CORS_ORIGIN`.
- Configure `/health` as the health check path.
- Use Render PR preview environments only when isolated backend testing justifies the plan/cost. Do not clone production data into previews.

### Supabase

- Use local Supabase for developer work and a separate Supabase project (or persistent branch) for staging.
- Treat `supabase/migrations` as the only automated migration source. Never edit a migration after it has reached a shared environment; add a new timestamped migration.
- Apply migrations to staging first and verify them with the integrated application.
- Production migrations must be forward-only and backward compatible. Use expand/contract changes: add nullable columns/tables first, deploy compatible code, backfill safely, and remove old structures only in a later release.
- Never run destructive ad hoc SQL against production as part of a normal deploy. Confirm backups/PITR before every schema release.

The SQL files under `backend/scripts` and the complete schema export are references/manual utilities until each required production change is represented by a reviewed migration under `supabase/migrations`.

## Staging acceptance gate

After every accepted feature PR, `development` deploys to staging. Before a release PR is opened, the team records evidence for:

1. Authentication, logout, and authorization for every affected role.
2. The three developers' feature paths working together, not only in isolation.
3. Existing client-critical smoke paths still working.
4. API error handling, CORS, uploads/storage, and background/cron behavior affected by the release.
5. Migration success on staging plus application compatibility before and after the migration.
6. Browser console, Render logs, and `/health` showing no new errors.
7. No production URL, database URL, service key, storage bucket, or real client data present in staging.

The release PR from `development` to `main` contains this evidence and a rollback/forward-fix plan. Freeze feature merges into `development` while the release PR is in final acceptance; urgent fixes go into a short-lived branch and merge into `development` through CI.

## Production release and rollback

Merge the verified `development` PR into `main` during a staffed release window. Do not push directly. Vercel and Render remain connected to `main` and deploy from that merge. Monitor the frontend, backend `/health`, logs, authentication, and one read-only client-critical smoke path immediately after deployment.

Because Vercel, Render, and a database migration can complete at different times, every release must tolerate mixed old/new application versions. Use feature flags for incomplete user-facing functionality and keep flags off in production until all required components are healthy.

If application code fails, disable the feature flag first when available, then roll Vercel/Render back to the last known-good commit or deployment. Reverting application code does not revert the database. Prefer a reviewed forward-fix migration; use a database restore only for a declared incident with an assessed data-loss window.

For an emergency hotfix, branch from `main`, use the same CI and reviews, merge to `main`, verify production, and immediately merge/cherry-pick the hotfix back into `development` so the next release cannot regress it.

## Definition of done

A feature is done only when its PR is reviewed and merged to `development`, required CI is green, the integrated staging behavior is verified, database and environment impacts are documented, and incomplete behavior is disabled behind a production-safe feature flag. A release is done only after the `main` PR is approved, production deploys are healthy, smoke tests pass, and the release/rollback evidence is recorded.
