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
