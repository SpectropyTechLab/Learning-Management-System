# Cleanup review and release separation

22 September 2026. [Handbook](README.md)

## Removed from active work

- Ten obsolete planning documents: handbook ADVANCED_MVP_SCOPE, MVP_PROPOSAL, PHASE_2_PLATFORM_PLAN, PHASE_2_RESEARCH, SCRIPT_TO_STUDIO_PLAN, AUTHORING_RESEARCH, LEARNING_EXPERIENCE_LIBRARY and IMPLEMENTATION_TRACKER; Studio-root IMPLEMENTATION_PLAN_V2 and VERSION_1_IMPLEMENTATION_PLAN. Their competing proposals and old PPTX assumptions are superseded by the new-workflow decision.
- Seven generated QA builds: os-activities-build, os-arrange-build, os-build, os-composition-build, os-composition-final-build, os-motion-build, os-scene-final-build. Approximately 281 MiB removed; source and saved preview data were not inside these directories.
- Three intermediate QA artifacts: block-debug.png, element-check.png, os-build.log. Reproducible test scripts and meaningful acceptance screenshots remain.
- The unverified local AI provider-schema change that forced all optional properties to be required. Provider implementation is restored to the pushed baseline. Existing AI infrastructure remains inactive; removing it would alter the established integration unnecessarily.
- The separate blocks tab on ordinary slides and duplicate teacher-notes field in the block inspector. A direct optional button now exposes conversion.

Recovery archive (local only, not deployed): workspace `.cleanup-recovery/studio-documents-before-cleanup-20260922-230038.zip`. It contains pre-cleanup handbook documents and the two root plans, not secrets, database contents or build files. Original BRDs, prototype, reference documents, .env, dependencies and saved preview lessons are preserved.

## Retained release candidates — ready for technical review

| Change | Value | Dependency / limit |
|---|---|---|
| Board multiselect | Captures curriculum context | Requires additive backend validation |
| Structured manual script mapping and draft review | Review before append/replace; preserves source and warnings | Recognized formats only; no automatic arbitrary visual generation |
| Tables, steps, matching, hotspots and sorting | Practical classroom interactions | Academic/content review remains necessary |
| Optional multi-block editor and arrangement | Retains requested advanced functionality without replacing the preferred editor | Backend contract, asset checks and compatible renderer must ship together |
| Validation and nested asset ownership | Protects project boundaries and malformed-save handling | Retain with the supported data formats |
| Tests, packaging and living documentation | Reproducible verification and maintainability | Preview/test fixtures are not production lessons |

Single-slide editing remains the default. Click **Enable multi-block editing** beside the slide controls and confirm to convert only that slide. Undo immediately restores the previous document; History restores saved revisions. No toggle silently discards later block edits. Existing composed lessons continue to render; none were rewritten during cleanup.

## Retained compatibility / reference, not a new release promise

The working perpendicular motion-path demonstration, renderer and Three.js license files remain because saved local lessons and regression tests depend on them. This is one bounded example, not a general simulation platform or cinematic timeline. Removing it would strand those documents. It requires separate content/visual acceptance before promotion as a release feature. The live circular-motion illustration is unchanged.

QA tools, the local preview server/database and sample lessons remain local. They do not travel through the production packaging script. Preflight/pilot verification records and original BRDs remain historical evidence.

## Pending, not release-ready

See [pending workflow](PENDING_WORKFLOW.md). Broad reusable library, safe script rebuilding, general cinematic timelines, additional validated simulations, AI activation and expanded role/review/teacher delivery are not declared complete.

## Verification and push state

Update, 22 September: the user subsequently authorized deployment of the ready candidate. Backend compatibility commit `93d21fa0` was pushed first. The paragraphs below record the earlier cleanup-only state; current release progress belongs in STATUS_AND_ROADMAP and OPERATIONS.

No production deployment, publication, permission grant or database migration was performed. No push has been made during cleanup. The user asked to separate ready and pending work before adopting a new workflow; the cleaned candidate remains local for that decision. Pushing main would automatically deploy and is not used as a cleanup mechanism.

Final cleanup verification is recorded in CHANGELOG.md. Technical checks do not substitute for manager acceptance or production readiness.

### Final cleanup verification

43 application tests, TypeScript, browser regression, production build/PWA, packaging parity and documentation file links passed. The single-slide editor and explicit button were also checked in the user-facing local preview. Old bundle-size/Browserslist warnings remain; academic, classroom-device and live rollout acceptance are still pending. The newly generated verification build was removed after checking it.
