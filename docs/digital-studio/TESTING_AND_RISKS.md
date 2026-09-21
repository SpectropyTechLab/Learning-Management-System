# Verification, acceptance gaps and risks

Baseline: 19 September 2026. [Handbook](README.md)

## Recorded evidence

| Check | Result | Limits |
|---|---|---|
| Studio automated suite | 26 passed | Mostly isolated/mocked dependencies; includes PGlite SQL workflow |
| OS permission/module regression | 5 passed | Focused coverage, not the entire OS suite |
| Focused Studio TypeScript | Passed | Includes OS adapter; not all unrelated OS TypeScript |
| Vite/PWA production bundle | Passed | Existing large-chunk/stale Browserslist warnings |
| Module packaging parity | Passed | Checks mapped source copies |
| Migration rehearsal | Passed twice | Fixture OS tables/rows preserved; not a full production clone |
| Live DB compatibility and post-migration restrictions | Passed | One secure connection and bounded checks; backend role can bypass RLS |
| Live basic workflow | Passed | Pilot login/menu, create/edit/autosave/reload/reopen/draft presentation |
| Existing live OS pages | Loaded | Courses, Exams and tracker; no business mutations in these checks |

Historical browser harness evidence covers imports, drag/resize, review/apply, publish and mobile overflow using isolated transport. The supplied Atomic Structure script produced 18 editable drafts locally. Neither result proves academic correctness, arbitrary-document support, cinematic rendering or production provider compatibility.

## Acceptance not yet established

Live file upload/download, reviewed publication, published presentation, second-account denial, full multi-role regression, concurrent real authors/workers, production load, restore testing, classroom-device and accessibility acceptance remain incomplete. AI protocols were mocked; no paid model evaluation was performed.

The sample publication action was rejected by automatic approval review as exceeding the save/present test authorization. It was not executed, and no workaround was used. Do not classify that as an application defect or as a successful publication test.

## Risk register

| ID | Risk / practical effect | Current mitigation | Follow-up |
|---|---|---|---|
| R-01 | Shared deployment/database can affect live OS | Limited pilot, reviewed additive migration, short locks, recorded rollback | Isolated staging, load limits and operations ownership |
| R-02 | Privileged backend bypasses DB RLS | Explicit owner/scope checks and authorization tests | Expand negative/live tests; assess least privilege |
| R-03 | Media in DB increases storage/connection pressure | 10 MB/file, 100 MB/project bounds | Private object storage, scanning, retention and recovery |
| R-04 | Unsaved edits lost on tab close/offline/crash | Visible save status and revision conflicts | Offline recovery and navigation protection |
| R-05 | AI may produce inaccurate or unsupported output | Schema validation, human review, no automatic publication | Real-model academic/cost/privacy evaluation |
| R-06 | Existing dependency vulnerabilities | No blanket breaking updates during integration | Backend deployment audit reported 20 (15 high); earlier frontend audit 57 (15 high). These are dated findings, not fresh scans |
| R-07 | Old plans/status notes mislead maintainers | Handbook distinguishes live/local/planned; historical banners | Documentation checklist on every change |
| R-08 | Rollback restores app but not database/media | Preserve tables; record distinct recovery process | Restore drills and agreed RPO/RTO |
| R-09 | Canonical sibling source/tooling not fully in LMS Git | Deployable module copies and SQL committed | Agree complete source-control ownership |

Risk owners are organizational assignments still pending. No uptime, security certification or industry compliance certification is claimed.

## Future test records

For each change record: requirement IDs, environment, commit, exact command/workflow, expected/actual behavior, date, evidence path, failures, exclusions and reviewer. Keep credentials and unnecessary customer records out of logs/screenshots. Distinguish “not run,” “blocked,” “failed” and “passed.”

## Brand alignment validation — 19 September 2026

Local source/deployable parity, focused TypeScript and Vite/PWA build passed. Browser acceptance passed create, edit, variable script import, drag/resize, autosave, draft/published presentation via mock transport, reopening, 390px mobile overflow check and mocked AI review/apply. Desktop/mobile screenshots were produced under canonical `application/qa/artifacts`. Real provider quality, live publication, full accessibility and post-deploy OS visual acceptance remain pending. The build still reports large chunks and an outdated Browserslist database.
