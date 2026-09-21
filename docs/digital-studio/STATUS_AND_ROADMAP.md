# Current status and proposed roadmap

As of 19 September 2026. [Handbook](README.md)

## Version 1 · Phase 1 — limited live pilot

The **integration milestone is complete**. The product remains a limited pilot with acceptance gaps, not the whole Version 1 or BRD complete.

| Capability | Status | Evidence / next step |
|---|---|---|
| OS navigation, login and pilot authorization | Live verified | Actual signed-in Content Authorizer; sidebar visible |
| Separate Studio tables and restricted browser DB access | Live verified | Transactional migration and access-control checks |
| Create/edit/save/reopen a project and slide | Live verified | Retained internal sample, revision 6 at test time |
| Draft presentation | Live verified | Sample displayed within deployed application |
| Existing Courses, Exams and tracker pages | Live smoke checks passed | Not a full regression of all roles/workflows |
| Plan/script/media uploads and flexible parsing | Implemented / local verified | Production upload acceptance remains pending |
| Reviewed publication and published presentation | Implemented / local verified | Live sample publication was blocked by approval review; remains a draft |
| AI adapters, model choice, jobs and proposal review | Implemented / local verified | No live provider evaluation or production configuration |
| Owner/scope isolation and denied access | Local automated evidence | Separate live denied-account check remains pending |
| Team sharing / manager account | Pending design/onboarding | No automatic sharing or manager grant |
| OS brand alignment | Implemented / local verified; not deployed | Navy/blue interface, inherited OS font; see [brand guidelines](BRAND_GUIDELINES.md) |
| Living documentation | Baseline established | Review/update with every material change |

## Proposed next phases — not yet committed delivery dates

| Proposed phase | Outcome | Exit evidence to agree |
|---|---|---|
| V1 Phase 2: AI activation and pilot completion | Configure provider/allowed models; complete remaining live acceptance; establish staging | Real-model quality/cost/failure evaluation, key handling, review/apply/conflict tests, approved publication/upload checks |
| V1 Phase 3: content and classroom depth | Improve variable imports, templates and supported visuals | Representative subject fixtures, academic review, device/accessibility checks, explicit unsupported-content handling |
| V1 Phase 4: operational hardening and wider roles | Storage/scanning/retention, collaboration rules, monitoring and broader rollout | Cross-role/tenant tests, realistic load, restore drill, named operations owners and support targets |
| Later versions | Wider BRD ecosystem | Separate requirements for student participation, assessment writeback, remediation, exports and advanced cinematic/3D capabilities |

The manager/product owner must confirm phase boundaries, priorities and acceptance; these suggestions are not promises or dates. AI remains part of Version 1 scope even though activation follows the completed manual integration milestone.

## Immediate backlog

- Complete authorized publication and published-presentation acceptance; do not label blocked checks passed.
- Verify representative upload/import and denied access on live/staging accounts.
- Configure and evaluate OpenRouter; verify key access without printing secrets; define model/cost controls before enabling paid work.
- Provision isolated staging, avoiding copies of unnecessary personal data.
- Assign owners and agree scale, storage, accessibility, device and support expectations.
- Address existing dependency vulnerabilities through reviewed, targeted upgrades.
- Decide how canonical Studio source/tests/tooling are versioned alongside the LMS repository.

No requirement may be marked completed solely because a UI button, schema table or provider adapter exists.

## Next delivery steps

1. **Review and release the brand update.** Inspect the local preview, then release through GitHub and the existing Vercel/Render pipeline. Acceptance: correct OS styling, keyboard focus, desktop/mobile layout, and unchanged save/present behavior. Risk: CSS regressions or stale PWA assets; check the deployed build and retain the prior commit for rollback. No database migration is required.
2. **Complete the Phase 1 pilot checks.** Use a clearly labeled sample for uploads and, when explicitly authorized, publication and published presentation. Check denial with a separate account. Identify the manager account and agree access/sharing expectations before expanding permissions. Publication changes live content; it is still pending approval, not implicitly approved by a styling request.
3. **Prepare isolated staging and AI controls.** Establish test configuration and synthetic data; agree allowed providers/models, request limits, budget and what content may be sent. Keep keys server-side. Start with OpenRouter while retaining provider adapters and model selection. No real provider call or paid activation occurred in this change.
4. **Validate AI across all four phases.** Evaluate brief, lesson-plan, script and slide proposals against varied subject examples. Require review before applying; verify failures, retries, revision conflicts and measured usage/cost. Promote to the limited live pilot only after these results are reviewed.
5. **Improve content depth and operational readiness.** Prioritize template flexibility, an optional Spectropy slide theme, accessibility, file handling, monitoring and recovery. Advanced cinematic/3D requests require separate rendering capability and acceptance criteria; model-generated text alone does not implement them.

Update the handbook and change history with each step, including what is local versus live. Dates, budget, manager access and production AI models remain to be agreed.
