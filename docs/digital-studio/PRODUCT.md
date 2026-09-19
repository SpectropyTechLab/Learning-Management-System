# Product, scope and requirements

Baseline: Version 1 · Phase 1, 19 September 2026. [Handbook](README.md)

## Business problem and intended outcome

Content authors need a connected workflow for planning lessons, translating scripts into teaching slides and presenting them in the classroom. Studio brings those activities into Spectropy OS so identity, navigation and permissions remain familiar. A manager must be able to see real progress in the live OS.

The longer-term BRD describes a wider teaching ecosystem: planning, preparation, classroom engagement, assessment, diagnosis, remediation and professional development. Phase 1 implements the initial authoring/integration slice. Student delivery, assessment writeback and wider organizational roles are not implied by the pilot.

## Users and access

| User | Current behavior |
|---|---|
| Authorized pilot Content Authorizer | Opens Studio and manages their own scoped projects |
| Other Content Authorizers | No automatic access; explicit permission is required |
| Manager | Can review a demonstration; a separate account/role has not yet been onboarded |
| Teachers, students and other BRD roles | Future rollout; not enabled by this integration |

Two authors with Studio access do not automatically share projects. Project ownership and scope are enforced. Sharing, review delegation and team collaboration require a deliberate design.

## Core journey

1. Sign into OS and open **Digital Studio**, the last item in the Content Authorizer sidebar.
2. Create a project, optionally link existing curriculum, and enter the teaching brief.
3. Add sessions and plans, or import supported documents.
4. Create/upload a script; build editable slide drafts and review ambiguous content.
5. Edit layouts, text, media and supported interactions.
6. Wait for **Saved**, preview and present the draft.
7. Academically review the lesson, resolve warnings and create a published snapshot when appropriate.

With production AI enabled in a later activation step, authors can request proposals at the relevant stages and review them before applying. AI is not currently active on production.

## Requirements traceability baseline

These are handbook tracking IDs, not original BRD clause numbers.

| ID | Requirement / decision | Implementation and evidence | Status |
|---|---|---|---|
| DS-01 | Open inside OS with menu visible | Protected route, OS shell and live sidebar check | Live verified |
| DS-02 | Reuse existing identity and permissions | OS middleware, `studio.access`, one pilot override | Live verified for pilot; other-user denial locally tested |
| DS-03 | Keep Studio content separate from LMS business tables | Six `studio_*` tables; migration and live access-control checks | Live verified |
| DS-04 | Save editable teaching projects | Revisioned JSON document; create/edit/reopen browser test | Live verified |
| DS-05 | Present from inside OS | Draft teaching view and retained OS integration | Live verified for sample draft |
| DS-06 | Accept variable plan/script formats | PDF/DOCX/MD/TXT extraction, preserved source, draft warnings | Implemented / local verified; live upload pending |
| DS-07 | Support AI now with replaceable provider/models | OpenRouter, Anthropic and Gemini adapters, job queue and review | Implemented / local verified; production configuration pending |
| DS-08 | Keep reviewed versions stable | `studio_releases` snapshots and publication validation | Implemented / local verified; live publication test pending |
| DS-09 | Rich animation, graphics and simulations | Bounded templates/interactions; visual briefs retain unsupported intent | Partial; arbitrary cinematic/3D generation planned |
| DS-10 | Demonstrate progress safely on live OS | One-account pilot and recorded rollback release | Live verified within smoke-test limits |
| DS-11 | Maintain documentation throughout delivery | Handbook, source map, change template and repository instructions | Established; must be maintained each change |

## Input/output boundaries

The supplied Gravitation lesson plan and Atomic Structure script are reference examples, not required templates. Future layouts and detailed scripts may differ. Supported extraction does not guarantee that every layout or scanned document is understood.

Outputs today are saved Studio drafts and in-OS presentation. Prototype export features do not establish that production Studio supports PPTX/PDF export. Unsupported cinematic effects stay as requirements/visual briefs until a renderer is implemented and verified.

## Decisions still needed

- Named product, academic-review, technical and operations owners.
- Manager account and whether shared review access is required.
- Pilot volume, classroom devices, accessibility acceptance and support expectations.
- AI provider/model allowlist, data-handling decisions and spending limits.
- Storage/retention policies, operational targets and next-phase acceptance criteria.

These gaps do not invalidate the completed limited integration. They constrain expansion beyond that pilot.
