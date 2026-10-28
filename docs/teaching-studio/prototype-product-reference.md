# Teaching Studio Prototype Product Reference

## Purpose and authority

This reference records the product intent demonstrated by the correct SPECTROPY Teaching Studio prototype at `C:/Users/DHANUNJAYA SOMIREDDY/Downloads/prototypes/prototypes/spectropy-studio-site`.

The prototype is a compiled static ChatGPT Site (`dist/index.html`, `dist/styles.css`, and `dist/app.js`). It is the UX and workflow reference. The 21-day work guide remains the delivery authority for production data integrity, role enforcement, persistence, authorization, publication, resource execution, security, and acceptance gates unless the product owner explicitly changes a requirement.

This document supersedes the earlier review of `Digital_Teaching_Classroom/Prototype`, which was not the product prototype supplied by the product owner. Claims from that review about AI script generation, local JSON import/export, Three.js lesson generation, and PowerPoint export do not apply to this product.

## Live review performed on 28 October 2026

The static bundle was served unchanged at `http://127.0.0.1:4174` and reviewed in the browser. The following visible flow was exercised:

1. Content Authorizer and Teacher role switching.
2. Published-session discovery from the LMS Dashboard.
3. Board → Program → Grade → Subject → Chapter → Topic → Subtopic selection.
4. Session Plan and Screen Script attachment at session level.
5. Draft, Ready, and Published session cards under the selected subtopic.
6. A screen editor with ordered screens, canvas tools, screen purpose, branch tags, resource placement, and an all-changes-saved indicator.
7. A catalogue of 14 purpose-based layouts (`LYT-001` through `LYT-014`).
8. A reusable Resource Library with approved versions and reverse usage counts.
9. Validation → authorization → publication messaging for an immutable release.
10. Teacher playback of a published release.
11. Curriculum, Pedagogy, Application, and Target-exam branch discovery.
12. Entry into an Application branch and return to the exact original teaching screen.

No browser console errors or warnings were reported during the reviewed flow.

## Product workflow represented by the prototype

| Product area | Prototype intent | Production interpretation |
|---|---|---|
| Roles | Content Authorizer owns creation; Teacher sees published content | Enforce this server-side through authenticated role and tenant checks |
| Curriculum | A session is created under the complete Board-to-Subtopic hierarchy | Persist valid parent-child identities; reject invalid combinations |
| Session documents | One Session Plan and one Screen Script are attached to the session | Store original bytes plus filename, type, size, hash, uploader, timestamp, and revisions |
| Sessions | Sessions progress through Draft, Ready, and Published states | Status must be revision-aware and auditable, not just a mutable label |
| Screens | Ordered editable screens are designed in a Studio Editor | Persist typed elements, geometry, drawing data, order, and concurrency/version state |
| Layouts | Fourteen default purpose-based layouts are available | Store stable layout identities and immutable versions; support a genuinely blank screen and versioned custom layouts |
| Resources | One approved resource/version can be reused on many screens | Separate resource identity, immutable versions, placements, and reverse usage reporting |
| Publication | Validate, authorize the exact revision, and publish an immutable release | Relevant edits invalidate authorization; an older published release remains unchanged |
| Dashboard | Content Authorizers and Teachers can discover all published sessions | Provide tenant-scoped search/filter APIs and protected document/resource delivery |
| Player | Teacher opens a published release and its Session Plan | Player reads a frozen release and cannot mutate the academic master |
| Branching | Teacher finds branches by four tag families, opens one, and returns | Use stable destination IDs and a run-state stack that restores the exact origin state |
| Packages | HTML, ZIP, and SCORM appear as approved resource types | Execute only through an isolated, validated runtime with explicit compatibility evidence |

## Prototype-to-guide conclusion

The correct prototype is strongly aligned with the 21-day guide. It does not introduce the role conflict found in the earlier, incorrect prototype: the Content Authorizer owns authoring, while the Teacher consumes published content. It also explicitly represents the guide's 14 layouts, session-level Plan and Script, reusable versioned resources, exact-revision publication language, all-published discovery, four branch families, and return-state restoration.

Accordingly, there is no product-direction conflict that blocks Day 1. The prototype should be treated as the intended interaction map for implementation.

## What the static prototype does not prove

The prototype is deliberately sample-data-only. Its successful clicks are not evidence that the corresponding production capability is complete.

| Visible prototype behavior | Static implementation limitation | Required production evidence |
|---|---|---|
| Curriculum dropdowns | Options are independent hard-coded lists; changing a parent does not actually clear or reload descendants | Database constraints plus API/UI tests for valid and invalid parent chains |
| Session cards and editor | Session selection is stored in memory, but the editor content remains hard-coded to Session 01 | Persisted session CRUD and reopen tests |
| Add screen | Displays a toast for “Screen 07”; it does not add or persist a screen | Blank-screen create, order, save, reopen, and concurrency tests |
| Text, shape, pen, and eraser tools | Toolbar controls are visual only | Editable-element and drawing persistence tests |
| Layout selection | The 14 cards can be selected in a modal but selection is not persisted; custom layout creation is not implemented | Default-layout validation, assignment persistence, and versioned custom-layout tests |
| Plan/Script upload and download | Upload only stores the local filename in memory; download displays a toast | Original-byte round trip, metadata/hash, revision, authorization invalidation, and protected-download tests |
| Resource creation and placement | New cards exist only in memory; picker placement displays a toast and does not update usage | Identity/version/placement APIs plus exact placement and reverse-usage counts |
| Validation and publication | Readiness checks are hard-coded and publication only sets an in-memory flag | Exact-revision validation, authorization records, immutable release snapshots, and negative tests |
| Published dashboard | Cards are hard-coded and do not depend on the publish action | Teacher/all-published query, filters, tenant isolation, and authorization tests |
| Branch filters and destinations | Filter chips are visual; every branch card opens the same sample branch | Multi-tag query semantics, stable destinations, nested run state, and exact return tests |
| HTML/ZIP/SCORM | Resource cards exist, but no package is parsed or launched | Isolation, manifest/entry-point validation, tracking, persistence, resume, sequencing, and compatibility results |
| Authentication and tenancy | Role switching is a client-side toggle | Real authentication, role denial, cross-tenant denial, audit records, and signed delivery |
| Persistence | All mutable state is lost on refresh | Server persistence, revisions, optimistic concurrency, recovery, and audit history |

## Guidance for implementation and review

- Keep the five-surface structure: LMS Dashboard plus Studio Sessions, Studio Editor, Resource Library, and Session Player.
- Preserve the Content Authorizer → publish → Teacher boundary shown by the prototype.
- Use the prototype labels and workflow ordering when they do not conflict with the guide.
- Do not copy static shortcuts into production. Every visible state must come from authenticated, tenant-scoped, revision-aware server data.
- Treat “all changes saved,” “approved,” “published,” version labels, usage counts, and return-state messages as acceptance promises that require backend evidence.
- Keep the prototype available as a visual regression reference, but use the 21-day guide and executable tests to decide whether a day is complete.
