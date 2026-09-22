# Spectropy Digital Studio — project handbook

Updated 22 September 2026. This handbook is the maintained documentation source. Canonical application code is in `Digital_Teaching_Classroom/application`; deployment copies live in the LMS repository.

## Current baseline

**Single-slide editing is the default. Multi-block editing is optional per slide**, enabled only by the author's explicit button and confirmation. New projects and script drafts do not automatically use multi-block editing. Existing composed lessons remain editable.

Recorded production baseline is the Version 1 · Phase 1 limited pilot: frontend `dd934ba3`, backend `90c2e8ce`. GitHub main was verified at `dd934ba3` on 22 September; deployment dashboards were not freshly inspected during cleanup. New local features are not live.

On 22 September the user authorized deploying the cleaned candidate; the backend compatibility commit `93d21fa0` was pushed first. See [status](STATUS_AND_ROADMAP.md) and [operations](OPERATIONS.md) for rollout evidence. The old Phase 2 sequence is paused while the user defines a new workflow. Planned functionality is not a release promise. AI remains deferred.

## Start here

| Need | Document |
|---|---|
| What was removed, retained and ready for review | [Cleanup review](CLEANUP_REVIEW.md) |
| Live versus local state | [Status](STATUS_AND_ROADMAP.md) |
| Future work awaiting the new workflow | [Pending workflow](PENDING_WORKFLOW.md) |
| Product and four authoring stages | [Product](PRODUCT.md) |
| How to use Studio | [User guide](USER_GUIDE.md) |
| Architecture, API and deployment | [Architecture](ARCHITECTURE.md), [Data/API](DATA_AND_API.md), [Operations](OPERATIONS.md) |
| Validation and constraints | [Testing](TESTING_AND_RISKS.md) |
| Decisions and release history | [Decisions](DECISIONS.md), [Changelog](CHANGELOG.md) |
| Documentation rules | [Maintenance](MAINTENANCE.md) |
| Detailed local features | [Activities](REUSABLE_ACTIVITIES.md), [Motion example](SCENES_AND_EXPLORATION.md), [Optional multi-block editor](COMPOSITION_EDITOR.md), [Arrangement](ARRANGEMENT_EDITOR.md) |
| Brand reference and script example | [Brand](BRAND_GUIDELINES.md), [Script](SCRIPT_EXAMPLE.md) |

## Documentation and source boundaries

Implementation details and dated acceptance records describe what exists. Original BRDs, prototype and discovery notes remain requirements/reference material, not evidence of delivery. Obsolete planning proposals were removed from the active tree after a local recovery archive was created; see CLEANUP_REVIEW.md. Historical pilot verification files remain evidence and should not be treated as current setup instructions.

Every material implementation/release updates this handbook with actual evidence and limitations. Keep secrets and production data out of documentation. No automatic background documentation/deployment process is configured. Phase labels, package/API/schema versions and Git commits are separate identifiers.
