# Teaching Studio Day 1 Discovery Baseline

## Outcome

Day 1 is complete as a discovery and handoff gate. The repository now has a reviewed baseline for schema reuse, permissions, storage and upload services, package samples, acceptance scope, and a representative multi-screen session. This gate records what is implemented, what is an unexecuted draft, and what must be decided or built later. It does not claim that Day 2 architecture decisions or Day 3-5 implementation are complete.

## Source of truth and environment

- Work guide: `Resources/SPECTROPY_Studio_21_Day_Daily_Work_Guide1.docx`.
- UX/product reference: `docs/teaching-studio/prototype-product-reference.md`, based on the correct compiled SPECTROPY Teaching Studio Site supplied at `C:/Users/DHANUNJAYA SOMIREDDY/Downloads/prototypes/prototypes/spectropy-studio-site`. Prototype behavior guides interaction design; the work guide controls production roles, data, security, and acceptance unless a product decision changes it.
- Repository baseline: current clean checkout at commit `21c5807d` before Day 1 evidence was added.
- Hosted-schema evidence: the original `supabase/migrations/20261014000001_cloud_public_schema.sql` snapshot plus the linked-project pull `supabase/migrations/20261028072933_cloud_sync_20261028.sql` and `docs/engineering/cloud-schema-review-20261028.md`.
- Additive Studio SQL: `backend/scripts/intelligence_classroom_studio/001_spectropy_studio_curriculum_schema.sql`.
- Local database status: Docker and the repository-pinned Supabase CLI are working. The project is linked to the approved hosted LMS project, all three migrations rebuild locally, and the temporary database-password file was removed after the read-only schema dump.
- Dependencies were restored with `npm ci --ignore-scripts` in `backend` and `frontend`.

## Schema inventory and reuse map

| Area | Existing LMS capability to reuse | Studio addition or decision | Day 1 conclusion |
|---|---|---|---|
| Tenant and identity | `clients`, `schools`, `users`, `school_memberships`; integer IDs | Do not introduce an unsynchronized UUID organization identity | Reuse current LMS identities unless Day 2 explicitly approves and maps another model |
| Curriculum | `programs`, `grades`, `subjects`, `chapters`, `topics` and current Question Bank ownership behavior | `boards`, `programs.board_id`, `subtopics` | Additive migration required; preserve existing IDs and queries |
| Studio sessions | Existing `teaching_sessions` belongs to the Teacher Session Tracker | Separate authoring `sessions` linked to one subtopic | Keep the two session concepts separate and use unambiguous service/API names |
| Documents | Supabase Storage client and signed URL support already exist | One lesson plan and one script per Studio session, original bytes and metadata retained | Current draft places scripts on screens; correct this during the Day 2 contract and Day 3 schema work |
| Layouts and screens | React/Vite canvas, 14 layout definitions, pilot layouts | Versioned layout and editable screen persistence | Frontend definitions are reusable; backend persistence is not implemented |
| Resources | Existing general LMS content and SCORM services; Storage client | Stable resource identity, immutable versions, placement bindings and reverse usages | Resource Library SQL is a design draft and is not integrated with current tenant IDs |
| Workflow | Authentication, role middleware, Content Authorizer role, draft/submitted/approved/published prototype | Exact-revision validation, authorization, and immutable publication | Reuse authentication; replace status-only approval with revision-aware records in later days |

## Ownership and permission baseline

| Actor | Existing reusable access | Required Studio boundary |
|---|---|---|
| Super Admin | Platform-wide administration | Diagnostic/administrative access; must not bypass audit history silently |
| Content Authorizer | Curriculum and content management permissions | Create/edit sessions, documents, screens and resources; validate and authorize exact revisions |
| Teacher | Authenticated school membership and teacher role | Read/operate published releases and approved downloads; no academic-master writes |
| Student | Existing learner/course access | No Teaching Studio authoring access in the Day 1-5 scope |

Server-side role and tenant checks remain mandatory. Sidebar visibility is not authorization. The current Studio routes use broad role gates and service-level tenant checks; later acceptance tests must cover cross-tenant denial and teacher denial of academic writes.

## Upload, download, and storage inventory

- Reusable components: Supabase service client, private bucket support, Multer memory upload, short-lived signed URLs, and existing authentication middleware.
- Current Studio implementation accepts lesson-plan files at session level and script files at screen level.
- Required correction: the agreed baseline is one lesson plan and one script per session. Screen scripts are not the same contract.
- Required metadata for later implementation: original filename, content type, byte size, storage key, SHA-256 hash, uploader and timestamp.
- Replacement must create an auditable new document revision and invalidate authorization of the affected session revision.

## Package sample inventory

The deterministic fixture set is generated by `backend/scripts/build-studio-day1-fixtures.mjs` into `backend/tests/fixtures/studio-packages`.

| Fixture | Day 1 purpose | Compatibility claim |
|---|---|---|
| External-link descriptor | External navigation and credential-leak policy | Inventory only |
| Standalone HTML | Single-file rendering and isolation | Inventory only |
| Browser-ready ZIP | Entry-point and relative dependency discovery | Inventory only |
| SCORM 1.2 single SCO | Manifest/profile discovery | Synthetic fixture only |
| SCORM 1.2 multi-SCO | Multi-SCO discovery | Synthetic fixture only |
| SCORM 2004 4th Edition single SCO | Manifest/profile discovery | Synthetic fixture only |
| SCORM 2004 4th Edition multi-SCO | Multi-SCO discovery | Synthetic fixture only |

These fixtures prove that representative inputs are available for Day 2 investigation. They do not prove launch, tracking, resume, sequencing, rollup, security isolation, or vendor-package compatibility. Day 2 must add real representative packages where licensing permits and mark unavailable profiles as untested.

## Representative session

`docs/teaching-studio/day1-representative-session.json` defines a three-screen Equivalent Fractions session with editable text, author drawing data, two placements of one resource version, multi-tag discovery, and a stable branch destination. It expresses acceptance behavior without prematurely fixing the Day 2 API payload design.

## Requirement and acceptance checklist

| Requirement carried forward | Acceptance evidence expected later | Primary owner |
|---|---|---|
| Complete Board-to-Subtopic parent chain | Invalid parent combinations rejected; existing curriculum remains addressable | Developer 1 |
| Separate Studio sessions | Session belongs to exactly one subtopic without colliding with Teacher Session Tracker | Developer 2 with Developer 1 review |
| One lesson plan and one script per session | Original bytes and metadata round-trip; missing document blocks publication | Developer 2 |
| Blank screen and 14 default layouts | All definitions validate; blank screen persists without placeholder content | Developer 3 |
| Editable source persistence | Text, geometry, drawing data and order survive save/reopen | Developer 3 |
| Stable resources and versions | Same exact version can be placed twice without duplicating resource identity | Developer 2 |
| Usage reporting | Placement count and distinct-screen count are both correct | Developer 2 |
| Exact-revision authorization | Relevant changes invalidate authorization; older published release remains immutable | Developer 1 |
| Teacher published access | Teacher can read all published sessions and cannot mutate the academic master | Developers 1 and 2 |
| Branch entry and return | Stable destination IDs and exact origin-state restoration | Developer 3 |
| Runtime compatibility | Per-profile evidence for launch, tracking, persistence, resume and sequencing | Developer 2, reviewed by all |

## Baseline verification

- Frontend production build: passed after dependency restoration.
- Teaching Studio layout tests: 3 passed, 0 failed.
- Studio workflow unit tests: 2 passed, 0 failed as part of the backend run.
- Full backend baseline: 59 passed and 12 failed. Ten failures are inherited Question Bank mock/query mismatches; two suites require `JWT_SECRET` at module load. They are recorded baseline defects and are not silently labeled as Studio failures.
- Local database execution: passed. A clean reset applied all three migrations, produced 61 public tables, and `supabase db diff --local --schema public` reported no drift. Runtime checks also exposed the cloud-derived public-schema privilege failure, which is now a visible Day 2 security-contract task.
- Fixture verification: run `node backend/scripts/verify-studio-day1-baseline.mjs` after building fixtures.

## Explicitly deferred from Day 1

- Choosing final API payloads, revision model, runtime library, and compatibility claims belongs to Day 2.
- Executing migrations and implementing database constraints belongs to Day 3.
- Implementing curriculum, document, layout, authorization, resource and screen APIs belongs to Days 4-5.
- Fixing unrelated Question Bank test mocks is separate maintenance unless a later Studio change depends on them.

## Day 1 handoff decision

Day 1 is complete: the fixture builder/baseline verifier pass, the correct product prototype is documented, the hosted schema was reviewed, and the migration chain rebuilds locally. Day 2 may begin with the remaining explicit decisions: session-level document ownership and revision model, tenant grants/RLS policies, immutable layout/resource/release versioning, runtime architecture, and acquisition of real representative vendor SCORM packages where licensing permits.
