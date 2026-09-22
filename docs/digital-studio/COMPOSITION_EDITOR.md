# Multi-block editing — local Phase 2 increment

21 September 2026. [Handbook](README.md) · [Pending new workflow](PENDING_WORKFLOW.md)

## Available locally

A slide can contain independent title, explanation, text/shape/media, teaching-activity, legacy-interaction and motion-scene blocks. Existing slides retain their original renderer until the author chooses **Enable multi-block editing** beside the slide controls, then confirms the conversion. Conversion preserves content and notes but uses new layout coordinates; authors must review layout. Undo restores the previous document.

Each block has its own identity, percentage rectangle, lock and layer position. Use the block label to select/move, Shift-drag to resize, or numeric position/size controls for keyboard editing. The inspector supports text, existing activity settings, scene settings, quiz feedback/options, element color and text size. Add uploaded images/videos from this project's media; no external asset URLs are accepted. Bring to front and remove participate in existing document undo/autosave.

Presentation uses the same block renderer without editing handles. Activity answers and playback state are transient and independent between instances. Teacher notes remain in the author document; this is not a connected learner API.

## Preview walkthrough

Open http://127.0.0.1:5188/ and choose **Phase 2 — Compose, explore and teach**, then **Design & teach**.

1. The maths slide combines explanation, an uploaded original shapes diagram and category sorting.
2. Select a block through its label or the inspector; edit text/geometry or lock it.
3. Present draft and classify the three properties. Check/reset operates within the activity block.
4. The second slide shows a biology explanation and step-reveal activity using the same system.

The PNG is an original static diagram asset, editable as a media block (position/size), not internally editable vector geometry. Samples require academic review. Local preview database only; no live account or AI calls.

## Contract and compatibility

Optional `slide.composition = {version: 1, blocks: [...]}` is additive to Workspace schemaVersion 1. Each block has `id`, `box`, `locked`, and tagged `content`. Content contains exactly the property appropriate to its kind. Maximum 40 blocks per slide. Backend validation checks unique block IDs within a slide, supported kinds, canvas bounds, content limits and the existing activity/quiz/scene rules. Project size remains capped at 2 MB.

The composition is authoritative for rendering when present. Original legacy fields remain as conversion context; later block edits do not synchronize that fallback. They must not be presented as an equivalent old-client view. There is no silent conversion back to legacy layout. Block asset IDs, including hotspot images, are included in server-side project ownership checks.

No SQL migration, new table, role change or LMS business-data modification. Save uses existing Studio documents/revisions and optimistic revision checking. Published snapshots are not changed by conversion or editing. Backend support must precede compatible frontend rollout. Older frontends must not be used to edit composed documents; rollback requires compatible code or explicit restoration of a pre-conversion revision. Production rollout/recovery review is still pending.

## Evidence

- `node --test tests/*.test.mjs`: 39 passed, including persisted block validation, invalid/duplicate blocks, nested foreign-asset rejection and real isolated PostgreSQL save/reopen.
- `qa/browser-check.mjs`: existing manual import, activities, 3D and mocked release/AI regression checks passed; new explicit conversion, independent text/geometry, locking and activity presentation checks passed.
- `qa/composition-preview-check.mjs`: dedicated automated browser against local PGlite preview verified uploaded image load, sorting result, editing handles hidden in presentation, real API save and browser reopen of geometry; test restores the fixture position.
- TypeScript checks passed. Production build verification recorded in current task evidence; bundle-size warnings remain.
- Screenshot: `application/qa/artifacts/composition-preview.png` (local artifact).

## Remaining work

This is an F1/F2 vertical increment, not Phase 2 completion. Basic multi-selection, grouping, alignment and layers are now available (see ARRANGEMENT_EDITOR.md). Snapping, further layer management, rotation, rich text/equations, reusable presets, source-aware rebuild, shared triggers, generic cinematic timeline and additional scientific models remain pending. Composed slides currently use scrolling within crowded blocks; no automatic fit/overflow review. Multiple heavy WebGL blocks need device/performance acceptance. No user-approved production release or complete accessibility/academic certification.

New scripts still create legacy slides; authors explicitly convert after reviewing them. AI stays deferred. Library adoption remains pending current-source verification. The user's browser could not be opened automatically because approval review failed to refresh its revoked token; separate local automated tests completed normally.

### Final build evidence

Final synchronized OS build passed: `vite build --outDir ../../Digital_Teaching_Classroom/application/qa/os-composition-final-build`. TypeScript and canonical-copy parity passed. Existing >500 kB bundle and stale Browserslist warnings remain; no dependency update or production deployment was triggered. The browser screenshot was visually inspected: diagram, text, sorting controls and feedback fit the desktop presentation.
