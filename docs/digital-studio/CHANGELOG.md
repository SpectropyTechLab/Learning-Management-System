# Digital Studio change and release history

[Handbook](README.md). Product phases, code releases and documentation revisions are separate.

## 22 September 2026 — cleaned authoring release authorized

User approved pushing ready changes through GitHub. Scope: Board beside Language, manual script draft review, teaching activities, optional per-slide block editing and arrangement, compatible validation and nested asset ownership. Single-slide editing stays default. Bounded motion example retained with its documented limits; this is not delivery of a general simulation library. AI stays deferred. Backend `93d21fa0` pushed first; final rollout evidence is recorded in OPERATIONS. No schema migration or permission expansion.

## Unreleased UI — Board field placement

22 September 2026. Moved Board beside Language in the Syllabus form and matched the other field labels and borders. Narrow screens stack the fields. Multi-board selection and stored metadata are unchanged. Updated existing browser-check selectors for the separate label. Verified focused TypeScript, package parity and the local desktop layout/dropdown; no production deployment, database or configuration changes.

## Unreleased documentation — expanded learning experience library

21 September 2026. Researched primary-source interaction catalogs and added LEARNING_EXPERIENCE_LIBRARY: 13 families, phased feature priorities, eight original Spectropy design proposals, a Satellite rescue example and component acceptance rules. Updated the Phase IV plan beyond the original twelve layouts. ILES could not be identified; the user approved relevant verified alternatives. Documentation only; no new component, external integration or deployment.

## Unreleased documentation — corrected four-phase priority

21 September 2026. Recorded user approval of structured scripts and CBSE/NCERT spelling. Added SCRIPT_TO_STUDIO_PLAN and SCRIPT_EXAMPLE. Removed PPTX import from active scope, marked earlier proposals superseded, and prioritized Board-only Phase I changes plus Phase IV script-driven interactive authoring. AI stays deferred; earlier Excel catalog work remains backlog. Documentation only; link checks passed, no runtime tests required and no deployment performed.

## Unreleased documentation — expanded MVP (subsequently corrected)

21 September 2026. Added cinematic 3D and native editable PowerPoint import to the requested MVP. Added ADVANCED_MVP_SCOPE with scene capabilities, import compatibility matrix, architecture alternatives, acceptance fixtures, performance targets and E0–E5 delivery order. Reconciled the manager proposal, roadmap and requirements. Planning only; no runtime, database, provider or deployment changes.

## Unreleased documentation — revised authoring MVP proposal

21 September 2026. Recorded AI deferral and user requirements for separate authoring/delivery views, teaching-focused editable templates, safe conversion and Studio manual/Excel curriculum. Added a manager discussion proposal and primary-source tool research, including clarified SlideEgg links. Replaced the AI-first roadmap; no application code, migration, permission or hosting changes. This is planning, not implementation or new feature acceptance.

## Version 1 · Phase 1 — brand alignment released 21 September 2026

19 September 2026. Replaced green interface accents and serif UI headings with the OS navy/blue palette, neutral surfaces and inherited sans-serif font. Updated local preview styling and synchronized the deployable CSS/manifest. Preserved authored slide appearance and saved content. No database, permission, backend or provider configuration changes; implemented locally on 19 September and deployed through GitHub main on 21 September. Added brand guidance and the next delivery sequence.

Validation: source/package parity, focused TypeScript, Vite/PWA build and the local browser workflow passed (including mobile overflow and mocked AI review). Local publication uses mock transport and does not validate production publication. Existing large-chunk and outdated Browserslist warnings remain.

## Handbook revision 1 — included in the 21 September release

19 September 2026. Established the living handbook for **Version 1 · Phase 1**: requirements, user guide, architecture, data/API, operations/recovery, status/roadmap, tests/risks and decisions. Added a maintenance checklist and working instructions. Clarified historical status notes. No runtime, database or hosting changes are part of this documentation update. Published with the branding release on 21 September.

## Version 1 · Phase 1 — initial live integration

19 September 2026. Commit `90c2e8ceb20ef65e2055a54b555e9ad36631af23`.

- Added Digital Studio last in the Content Authorizer sidebar, using OS login, permissions and shell.
- Packaged editor/backend in the LMS repository, with lazy-loaded route and `/api/studio/v1` API.
- Created six separate Studio tables with RLS and restricted browser access. Added one targeted pilot permission separately; no existing LMS business records rewritten.
- Tested on a pilot branch, then pushed directly to main. Vercel and Render deployed successfully; no pull request was used.
- Live checks passed for create/edit/autosave/reopen/draft presentation and basic existing OS page loads. Retained a labeled sample draft.
- AI remained unconfigured. Live publication was blocked by approval review and not executed. Live upload and additional account/scale checks remain pending.
- Local evidence: 26 Studio tests, five focused OS permission tests, focused TypeScript and Vite/PWA build passed.

See [OPERATIONS.md](OPERATIONS.md) for deployment/recovery details and [TESTING_AND_RISKS.md](TESTING_AND_RISKS.md) for evidence limits.

### 21 September deployment evidence

- GitHub main: `dd934ba3fd486ddf493bb3d95bc4d070de1f2e4c`, fast-forward after branch build; no PR used.
- Vercel preview: `9djujZU9yWJPQnEihxYYBcbDZmgg` Ready. Production: `9NqVp1H2NSiKBvxkBruhJPouHJ4y` Ready, current www.spectropy.com domain.
- Render remains on `90c2e8ce` / `dep-dan8652jnfac738krvc0`; backend source is unchanged in this release. No manual backend redeploy or database action was performed.
- Signed-in live pilot: refreshed Studio shows white/navy interface and sans-serif headings; existing sample opens and draft presentation displays its saved content. Publication not attempted.
- Local OpenRouter authentication and catalogue checks passed without generation; no default model or staging database is configured. Production AI remains off.
- Rollback reference: prior Vercel `HxUg3THfUxj99FAYq9oeZxTQZwfE`, prior frontend commit `90c2e8ce`. Revert only the branding runtime change when appropriate; retain database content.

## 21 September 2026 — Board and reviewed manual script drafts (local)

- Version 1, Phase 1 follow-on: DS20 local implementation; DS21 partial foundation. Full tracker added with P1–P6 scope and gates.
- Added optional Board choices, structured script mapping, storyboard review and append/confirmed-replace/undo workflow. Comparison cards gained separate multiline controls.
- Existing Studio storage only; no SQL migration, permission change, live publication, production deployment or AI activation.
- Tests and remaining limitations: [testing and risks](TESTING_AND_RISKS.md), [implementation tracker](CLEANUP_REVIEW.md). Production remains the previously documented release. Business review pending.

## 21 September 2026 — reusable teaching activities (local)

Added a versioned activity model, catalog/editor/renderers and structured script mappings for aligned comparison tables, sequential explanations and matching pairs. Verified examples use biology, maths and vocabulary. Keyboard select use is isolated from presentation navigation. No existing LMS data/schema changes or production release; AI remains off. See [activity guide](REUSABLE_ACTIVITIES.md), [tracker](CLEANUP_REVIEW.md) and test evidence below/in TESTING_AND_RISKS. Remaining MVP work is explicit; this is a partial P2/P3 delivery.

## 21 September 2026 — hotspots, sorting and first scene (local)

Added editable hotspot/image exploration, category sorting and a saved motion-path scene with 2D/WebGL views, camera settings and playback/scrubbing. Prototype engine reused with license notices; backend accepts bounded scene data and verifies hotspot asset ownership. Local tests/evidence/limits are in SCENES_AND_EXPLORATION.md. High-end cinematic/graphics scope remains open. No production deployment or AI activation.

## 21 September 2026 — Phase 2 platform plan and status reconciliation

Documentation-only planning change: added PHASE_2_PLATFORM_PLAN and PHASE_2_RESEARCH, reconciled STATUS_AND_ROADMAP and IMPLEMENTATION_TRACKER, updated README and required maintenance workflow. User-designated completion target: Version 1 · Phase 2. Current Phase 1 live status remains unchanged. Fresh internet research was attempted but could not execute successfully because of authentication/approval-review failure; existing research was reused with explicit provenance limits. No code implementation, dependency adoption, deployment, SQL/permission change or new live acceptance claim.

### 21 September 2026 — F1a editor compatibility module

Local code only. Added detached legacy-to-block composition, immutable editing commands and guarded legacy conversion. 38 application tests passed (four new compatibility tests). No visible-editor integration, new save format, production changes, data migration, permissions changes or AI activation. F1 and Phase 2 remain incomplete. See CLEANUP_REVIEW.md for remaining acceptance work.

### 21 September 2026 — Connected multi-block editor (local)

- Added explicit legacy conversion, independent block renderer/inspector, text/activity/quiz/media/scene configuration, geometry, lock and bring-to-front controls.
- Additive composition contract validates content and block bounds; nested assets are checked against the owning project. No SQL migration or LMS business-data changes.
- 39 application tests passed. Browser regression plus isolated real API save/reopen checks passed. Documentation and canonical packaging updated.
- Preview fixture: Phase 2 — Compose, explore and teach. Production unchanged; AI deferred. Full Phase 2, accessibility/device/academic acceptance and release review remain pending.
- Details and limitations: COMPOSITION_EDITOR.md.

### 21 September 2026 — Local F2 arrangement and text formatting

Added layer-checkbox selection, flat groups, group-aware bounded movement, alignment, layer ordering and whole-block text styling. Locked members prevent partial group changes. Optional group/style fields are validated and use existing Studio JSON revisions; no SQL migration, dependency installation, role change or production deployment. 42 application tests, TypeScript, browser regression and isolated preview save/reopen passed. See ARRANGEMENT_EDITOR.md for behavior, limits and acceptance.

Final synchronized OS build passed (`qa/os-arrange-build`); existing >500 kB chunk and stale Browserslist warnings remain. Canonical packaging parity passed. Preview server was restarted with the new code on port 5188.

### 22 September 2026 — Cleanup and explicit optional editor

At the user's request, single-slide editing remains the default and Enable multi-block editing is a direct per-slide button with confirmation. Undo restores the previous layout; existing composed lessons are preserved. Removed the old blocks tab from ordinary slides and duplicate block-inspector notes field. Guarded conversion against exceeding the 40-block save limit.

Removed 10 obsolete planning/research/proposal documents (eight handbook, two Studio-root), seven generated QA builds (~281 MiB), and three debug/intermediate artifacts. Recovered document history is available in the local archive named in CLEANUP_REVIEW.md, outside the production repository. Source BRDs, prototype, local lesson database, credentials and historical pilot evidence remain intact.

Removed only the unverified post-push provider-schema patch; existing dormant AI infrastructure is retained and AI activation is deferred. Motion-example compatibility remains because stored lessons depend on it; broader simulation/timeline work is pending.

Consolidated current README/status/product, supplied a supported script example, and created CLEANUP_REVIEW.md plus PENDING_WORKFLOW.md. The prior Phase 2 sequence is paused pending the user's new workflow. No push, production deployment, SQL migration, permission change or live publication occurred.

43 application tests passed and TypeScript passed. Browser/build/link checks are reconciled below when completed.

Cleanup final checks: 43 tests passed; TypeScript, full browser regression (single-slide default, explicit enable and Undo back to default), production build/PWA, source-copy parity and Markdown file-link checks passed. The final verification build output was removed after successful completion so no generated builds remain in QA. Existing bundle-size and stale Browserslist warnings remain. Browser preview is open on a saved single-slide lesson with Enable multi-block editing visible. No saved lesson was converted by the manual UI verification. Nothing pushed or deployed.
