# Architecture and delivery decision log

[Handbook](README.md). Initial record: 19 September 2026. These summarize conversation decisions and implementation, not invented formal approvals.

| ID | Decision | Reason / consequence | Status |
|---|---|---|---|
| ADR-001 | Build inside Spectropy OS | Reuse identity/navigation; shared deployments require regression/recovery | Implemented |
| ADR-002 | Use separate `studio_*` tables | Separate content; user references and shared resources remain | Implemented |
| ADR-003 | Role plus individual pilot permission | Limited rollout; no implicit sharing or broad role grant | One pilot enabled |
| ADR-004 | Canonical Studio source and packaged LMS copies | LMS deploys independently; sync/parity required | Implemented; complete source-control coverage needs decision |
| ADR-005 | Validated JSON workspace with revisions | Common import/AI/editor contract; prevent stale replacement | Implemented |
| ADR-006 | Replaceable AI provider/model support in V1 | OpenRouter preference can change; keys remain server-side | Adapters built; production activation pending |
| ADR-007 | Documents are examples, not fixed templates | Future layouts vary; preserve source and report uncertainty | Bounded imports implemented |
| ADR-008 | Limited live manual integration before improvements | Manager requires progress inside main OS | Implemented; supersedes staging-first order for this pilot |
| ADR-009 | Immutable reviewed lesson snapshots | Separate drafts from reviewed versions; not course assignment | Local tested; live acceptance pending |
| ADR-010 | Bounded BYTEA assets and same-process optional worker | Small starting footprint; storage/concurrency need hardening | Implemented; production AI inactive |
| ADR-011 | Living documentation with development | End-to-end understanding throughout delivery | Handbook/process established |

For future decisions record date, context, chosen approach, alternatives, consequences, status and superseding decision when applicable. Preserve earlier decisions as history.

## ADR-012 — Match the existing OS brand

19 September 2026. User requested brand consistency. Studio interface follows the standard Content Authorizer OS navy/blue theme and inherits the host font. Keep changes in scoped Studio CSS; preserve authored slide rendering and immutable content. Introduce a branded slide theme separately as an explicit choice. See [brand guidelines](BRAND_GUIDELINES.md). Deployed 21 September 2026; see CHANGELOG.

## ADR-013 — Defer AI and prioritize authoring MVP planning

21 September 2026. User directed that AI be kept for later and requested product research/MVP discussion before building. Paid testing is deferred; the earlier spending-limit question is no longer a blocker or authorization. Existing provider support remains in code. No production setting changed in this planning task.

## ADR-014 — Authoring versus delivery and meaningful layouts

21 September 2026. User confirmed current Studio is the author/developer experience and requested a later delivery view with internal details abstracted. Requested real editable layouts, manual/Excel curriculum and pedagogical design. Proposal: separate delivery projection; versioned blocks; scoped Studio catalog without OS-table writes. Requirements are recorded, but the specific schema, twelve-template list and implementation sequence await discussion. See MVP_PROPOSAL and AUTHORING_RESEARCH.

## ADR-015 — Expand MVP with cinematic 3D and editable PPTX

21 September 2026. User explicitly requested both within the MVP. Plan now includes scene/timeline authoring and native object import, with an early feasibility gate and documented compatibility/performance evidence. Do not equate rendered slide images with editable import or a video with interactive 3D. Technology/SDK selection, budget and calendar remain provisional; no purchase or implementation occurred. Supersedes narrower exclusions in the initial MVP proposal.

## ADR-016 — Correct PowerPoint interpretation and confirm four-phase workflow

21 September 2026. User clarified that PowerPoint means a familiar editable-object editor, not file import, and approved the flexible structured-script approach. Board spelling confirmed as CBSE/NCERT. Add a multi-select Board field only to Phase I; preserve Phase II and III workflows; prioritize script-driven Phase IV components, quizzes, graphics, animation and supported 2D/3D. Supersedes the PPTX-import portion of ADR-015 and the earlier curriculum-first sequence. Earlier proposals are marked historical. Exact script syntax and implementation details remain proposals. AI stays deferred; no application change occurred here.

## ADR-017 — Broad, composable teaching experience library

21 September 2026. User requested wider research and proactive product ideas beyond comparison, quiz and simulation. Separate teaching purpose, layout, interaction, presentation and participation mode. The earlier twelve-layout proposal is not a limit on activities. Catalog includes proposed initial recipes and deeper/later features; multiplayer and collected learner work remain dependent on delivery infrastructure. ILES identification remains unresolved, but the user authorized using relevant verified alternatives; no link is a blocker. Research and documentation only.

## ADR-018 — Additive Board field and reviewed deterministic drafts

21 September 2026, implemented locally. Use optional Board metadata in existing Studio JSON, preserving old revisions. Keep stored-document schema version 1 for this additive extension; introduce a separately versioned component model in P2b. Require all generated properties in strict provider transport schemas, while preserving legacy local validation.

Script upload previously replaced slides immediately. New behavior keeps the source and opens a candidate storyboard with explicit append/confirmed-replace actions. Unknown requirements become review warnings. Existing native quiz/reveal/comparison primitives provide a tested starting point; they do not claim completion of richer animation or scene authoring. No paid provider call or production change accompanies this decision.

## ADR-019 — Subject-independent, versioned teaching activities

21 September 2026. Add an optional versioned activity object to existing Studio slide JSON rather than hard-code Gravitation behavior. Table, steps and matching share stable item identities, an allowlisted catalog, bounded editor fields and a renderer independent of subject. Keep attempts/reveal state transient, separate from saved lesson content. Enforce one activity or legacy interaction per slide for this increment. Legacy documents remain valid; new data requires a compatible frontend. This is a foundation for later components, not arbitrary script execution or generic scientific simulation.

## ADR-020 — Reuse the prototype engine with bounded saved scene data

Reuse the supplied Three.js r180 files with notices, dynamically importing a custom renderer. Use a single validated perpendicular-journey scene as the first model, with synchronized SVG and WebGL views, authored camera parameters and transient playback state. Do not execute user scripts or fetch arbitrary assets. This bounds resource/data complexity while building the foundation; it does not satisfy the general cinematic authoring requirement yet. Extend the existing asset ownership check to hotspot images. No LMS business-table writes or new migrations.

## ADR-021 — Version 1 Phase 2 targets a reusable authoring platform

21 September 2026. User accepted the five-part general platform direction and requested inventory → research → plan → implementation → review → Git deployment for future work. Reuse current components, but prioritize a versioned multi-block model/editor over isolated topic models. Keep animation separate from validated scientific models. Phase 2 is a completion milestone, not a present release label. Scope, acceptance and open business decisions are in PENDING_WORKFLOW.md. Current-source verification failed due to revoked authentication and uncompleted automatic approval review; dependency choices remain unevaluated until fresh research succeeds.

### ADR-022 — Additive composed slides and explicit conversion

Use optional versioned composition within existing Studio document JSON, with strict server validation and scoped nested asset checks. Preserve old fields as conversion context and retain old renderer for unconverted slides. Explicit conversion can change layout and is undoable. Composed content is authoritative; old clients cannot faithfully render or edit it, so releases and rollbacks must be version-compatible. This avoids implicit data rewriting and a new SQL migration while allowing independent content/activity instances. Full migration/release acceptance remains pending. Implementation: COMPOSITION_EDITOR.md.

### ADR-023 — Flat groups and whole-block formatting first

Persist flat slide-scoped group IDs and allowlisted text style fields. Use atomic group-aware arrangement commands with shared bounds clamping and locked-member protection. Provide checkbox selection and numeric/button alternatives before more complex canvas gestures. Require ungrouping for individual resizing/alignment/deletion; group scaling, nested groups and rich text remain planned. No new editing engine or SQL migration. See ARRANGEMENT_EDITOR.md.

### ADR-024 — Cleanup baseline and opt-in multi-block editing

The manager prefers the original single-slide editor. Keep it as the default for creation/import; expose multi-block conversion only through an explicit per-slide button and confirmation. Keep existing composed documents compatible. Undo/history provide recovery rather than an unsafe toggle that discards block edits. Remove obsolete proposals and generated intermediates, preserve source requirements and evidence, and replace the old implementation sequence with a pending-workflow register. No production push is part of this cleanup handover.
