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

## Live branding release checks — 21 September 2026

Vercel branch and production deployments Ready at `dd934ba3`. Actual pilot login: updated welcome visible, existing sample reopened, draft presentation displayed, exited successfully. No publication performed. Focused TypeScript and packaging parity rechecked before push. OpenRouter key authentication and catalogue passed locally; generation not tested, no paid generation requested. No database writes/migration or permission changes were part of release operations. Full OS regression and broader role checks remain pending.

## 21 September 2026 — local Board/script increment verification

- `node --test tests/*.test.mjs`: 31/31 passed, including isolated PostgreSQL storage/reload of Board values, legacy validation, enum/duplicate rejection, deterministic parsing, unknown cinematic instructions, malformed quiz keys and existing permission/scope/revision tests.
- `node qa/browser-check.mjs`: passed using local mocked transport. Covers Board select/reopen/deselect; script review, cancel, append, confirmed replace and undo; existing editing, drag/resize, autosave, draft presentation, mocked publication/release, mobile rendering and mocked AI review. No live publish or paid generation occurred.
- Studio TypeScript check: passed. Full OS frontend Vite/PWA production build: passed in the isolated QA output directory. Existing large-chunk and outdated Browserslist warnings remain. Main JS approximately 2,969 kB; Studio lazy chunk approximately 491 kB. Avoid adding a 3D engine to the main OS bundle.
- Canonical packaging check: passed. Git whitespace check: passed. Reviewed local storyboard screenshot at canonical `application/qa/artifacts/script-review.png`.
- Known limits: review is read-only before applying; no semantic interpretation of arbitrary prose; comparison cards are not aligned table rows; scene generation/timeline/component registry and stable source merge remain pending. Existing live OS workflows, staging and new live save/reopen have not been rerun for this unpublished increment.
- Rollout risk: deploy compatible Board validation before frontend. Preserve compatible backend on frontend rollback. No migration or production data modification was performed.

## 21 September 2026 — reusable activity validation (local)

- Node suite: 33/33 passed. Includes subject-independent parser examples, malformed/conflicting rows, matching ambiguity, version bounds, legacy compatibility and isolated PostgreSQL activity save/reload, plus existing scope, permission and revision protections.
- Browser acceptance: passed against the local mock transport. Biology table: import, edit heading, save/reopen and present; maths: step reveal/back/reset; vocabulary: incomplete/wrong/correct matching and reset. Select keyboard arrows stay within the activity. Mobile page bounds and prior Board/script/editor workflows pass. Published-release and AI checks use mocks only.
- Screenshot inspection: table and matching examples reviewed; low-contrast matching labels corrected and browser suite rerun successfully. Artifacts in canonical `application/qa/artifacts/generic-table.png` and `generic-matching.png`.
- Studio TypeScript and OS production build pass. Existing large main-chunk/Browserslist warnings remain; no new runtime library was installed. Canonical copies synchronized.
- Limits: one activity per slide, up to eight items, scrollable dense content, no learner response persistence, no drag-matching, no hotspots/sorting/cinematic scenes yet. Classroom device/academic acceptance and live deployment checks remain pending. The data model requires compatible backend/frontend versions; do not downgrade to an activity-unaware frontend for new lessons.

## Local exploration/scene increment — 21 September 2026

[Hotspots, sorting and first 2D/3D scene](SCENES_AND_EXPLORATION.md) records the current controls, versioned contracts, ownership checks, examples, test evidence, deployment order and limitations. These features are now locally implemented; prior planned-only statements for this subset are superseded. P3/P4 remain partial. The full cinematic timeline, high-end graphics quality target and wider simulation library remain pending. Production remains unchanged; AI stays off.

### F1a verification — 21 September 2026

`node --test tests/*.test.mjs`: 38 passed. Four composition tests cover legacy round trips (activity and scene examples), detached source/history snapshots, independently edited image/text, preserved notes/assets, invalid geometry, locked targets and unsafe downgrade rejection. Pure commands are not an API validation boundary. Browser QA was not repeated: this increment is not connected to the UI. Multi-block persistence/rendering and visual review remain outstanding.

## Local block acceptance — 21 September 2026

39 application tests passed, including nested block validation, duplicate/bounds/type errors, foreign block asset rejection, and isolated PostgreSQL persistence. Browser regression checks and dedicated local-preview image/sorting/save/reopen checks passed. A textarea labeling issue found by browser QA was fixed. See COMPOSITION_EDITOR.md for scope, reproduction and limitations. No new production validation or publication was performed.

## Local F2 acceptance

42 application tests passed, including group bounds/spacing/locks/layers, invalid inputs, group/style validation and PostgreSQL round-trip. Browser regression passed for multi-select/group/move/layers/ungroup/align/undo and rendered formatting. Dedicated preview save/reopen passed. See ARRANGEMENT_EDITOR.md. Full accessibility, performance and production acceptance remain pending.

## 22 September cleanup verification

43 application tests, TypeScript, browser regression, production build/PWA, source parity and handbook link checks passed. Explicit conversion is tested for original-input preservation, repeat-call stability and the 40-block limit; browser coverage checks single-slide default, enabling conversion and Undo restoring the prior mode. The local preview visibly shows the original editor with the opt-in button. Unverified AI schema changes were removed; no paid AI or production checks were performed. Temporary verification build output was removed after success. See CLEANUP_REVIEW.md.
