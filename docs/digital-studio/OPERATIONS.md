# Development, deployment and recovery

Baseline: Version 1 · Phase 1, 19 September 2026. [Handbook](README.md)

## Environments

| Environment | Purpose / boundary |
|---|---|
| Local Studio preview | Loopback `127.0.0.1:5188`, demo identity, isolated PGlite data in `qa/.preview-db`; never deploy this preview server |
| Local tests | Mock provider tests and isolated PostgreSQL fixtures; no paid AI needed |
| Vercel branch preview | Frontend build preview; not proof of an isolated backend/database |
| Dedicated staging | Not yet provisioned; planned for continued work |
| Production | Existing Vercel OS frontend, Render backend and Supabase database |

## Developer workflow

From the workspace root (`Digital_Studio`):

```powershell
node Digital_Teaching_Classroom/application/scripts/sync-os.mjs
node Digital_Teaching_Classroom/application/scripts/sync-os.mjs --check
node --test Digital_Teaching_Classroom/application/tests/*.test.mjs
node Learning-Management-System/frontend/node_modules/typescript/bin/tsc -p Learning-Management-System/frontend/tsconfig.studio.json --noEmit
```

Install dependencies from the relevant lockfiles when needed. The module's `npm run preview` launches the isolated demo; `npm run test:browser` runs its browser harness. See the canonical application README for setup details.

Run relevant OS regression tests and the frontend production build for integrated changes. The OS root TypeScript command alone does not check every referenced application file. The checkout tracks `node_modules` and `dist`; review changes carefully and exclude unrelated build/dependency noise. Do not remove others' uncommitted work.

Update this handbook in the same change using [MAINTENANCE.md](MAINTENANCE.md). Verify packaged code parity before committing. Preserve canonical source/tests as well as deployable copies; the packaging script only copies its explicitly mapped module directories.

## Configuration and secrets

Use secret stores or ignored environment files. Never commit `.env`, raw keys, connection URLs with passwords, auth cookies or backup exports.

| Variable / setting | Meaning |
|---|---|
| Existing OS `DATABASE_URL`, auth configuration | Reused by production backend; do not replace casually |
| `STUDIO_WORKER_ENABLED` | Explicit `true` enables AI worker; current live manual pilot does not use AI |
| `STUDIO_AI_PROVIDER` | `openrouter`, `anthropic` or `gemini` |
| `OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` | Matching server-side credential |
| `STUDIO_AI_MODELS`, `STUDIO_AI_DEFAULT_MODEL` | Administrative allowlist/default; authors choose supported models |
| `STUDIO_AI_DAILY_LIMIT`, `STUDIO_AI_MAX_OUTPUT_TOKENS` | Request/token controls; verify exact names against `.env.example` and provider configuration source |

A key in the local Studio `.env` is not automatically configured on Render. No production AI activation has occurred. Before activation, evaluate real-model schema support, quality, data handling, cost and failures. Changing backend environment variables can redeploy the service.

## Release procedure

1. Confirm scope, named pilot accounts, current production commit, latest backup evidence and user-approved release window.
2. Review source changes and database effects. Prefer separate `studio_*` objects; never apply a schema export as a migration.
3. Run relevant tests/builds and review a branch preview. A preview may still call production APIs; avoid accidental live mutations.
4. Review migration and recovery plan. Run schema changes separately, transactionally where supported, with bounded lock/statement timeouts. Check collisions and access controls before granting users access.
5. Push/review the release through GitHub. **Pushing to main triggers the configured Vercel/Render deployments.** A pull request is recommended for future review; branch protection enforcement is not currently verified.
6. Verify both hosting platforms report the intended commit live. Enable only named pilot permissions, preserving all unrelated permissions/roles.
7. Refresh sessions as needed, accounting for permission caches. Verify existing OS pages and Studio create/save/reopen/presentation. Record exclusions and failures honestly.
8. Update status, release history, deployment IDs and known issues. Avoid repeated deployments for documentation-only updates unless intentionally needed.

## Phase 1 release record

| Item | Value |
|---|---|
| Repository | `SpectropyTechLab/Learning-Management-System` |
| Release branch | `studio/pilot-integration-20260919` |
| Live commit | `90c2e8ceb20ef65e2055a54b555e9ad36631af23` |
| Previous known-good commit | `c2af4ccee65f66766dff6bd3e85837f77a79b9e2` |
| Vercel production deployment | `HxUg3THfUxj99FAYq9oeZxTQZwfE` |
| Previous Vercel deployment | `3icMAUzsqCff4DRQj6vzXtXNocLo` |
| Render production deployment | `dep-dan8652jnfac738krvc0` |
| Previous Render deployment | `dep-da629s0jo6nc73e4t22g` |
| SQL | [001_studio.sql](../../backend/scripts/studio/001_studio.sql) |
| Permission change | One explicit pilot `studio.access` user override; zero role-wide grants |

The initial release used a direct fast-forward push to main after branch testing; no pull request was created. Database migration and pilot permission were separate operations, not automatic effects of the Git push.

## Recovery and backups

First contain a Studio-specific incident by revoking its pilot access through the approved OS permission process. Revert/restore application revisions if required, coordinating frontend and backend. Account for permission caches and Git auto-deployment; a subsequent push must not inadvertently reintroduce a reverted release.

Normally retain the additive Studio tables during an application rollback. Do not drop them or restore the entire live database as a routine rollback: a database restore can discard legitimate LMS activity since the backup. Database recovery needs a separate incident assessment and authorized operator.

A user-supplied screenshot on 19 September showed daily physical backups, latest 18 September 20:24:01 UTC (19 September 01:54:01 IST). This was backup availability evidence, not a performed restore test. Supabase Storage objects were explicitly excluded. Recheck backup recency and coverage for each future release. Current Studio BYTEA assets are database data; future object-storage assets require their own recovery plan.

Formal recovery-time/recovery-point targets, restore drills, monitoring thresholds and on-call ownership remain unassigned. During the pilot watch API errors, save failures, latency, connection pressure and asset growth; no automatic continuous monitoring was established by this documentation.
