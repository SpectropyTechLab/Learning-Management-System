# Phase 3 Audit — Editable PPTX Importer MVP

**Date:** 23 November 2026  
**Branch:** `feature/clipboard-pptx-import`  
**Controlling specification:** [Cross-Application Clipboard and Editable PPTX Import](./clipboard-pptx-import-requirements-and-implementation-plan.md)  
**Status:** Reopened after product-owner visual review. Phase 4 has not started.

## Visual review correction — 23 Nov 2026

The first implementation passed structural and persistence tests but failed the required source-fidelity review against `Maths_Trigonometry introduction (2).pptx`. It must not be treated as accepted or complete.

Observed defects:

- master/theme background colour transforms were not resolved, changing the dark presentation background to white;
- text boxes without an explicit PowerPoint fill or outline were imported as opaque white/navy objects;
- the shared import mapper enlarged every small glyph, line, and decorative object to at least 80×60 Studio pixels;
- PowerPoint point sizes were stored as Studio pixel sizes without the presentation-to-canvas scale;
- layer indices above 100 were flattened, changing composition order.

The correction gate now requires a fresh import plus visual comparison of representative source slides. Successful object counts alone are not acceptance evidence.

## 1. Delivered workflow

The Teaching Studio now exposes **Import PowerPoint** in both Home > Screen and Insert > Slides. The importer:

1. accepts a password-free `.pptx` file;
2. performs a non-mutating preflight;
3. shows every slide in package order with editable-object counts and warnings;
4. lets the author choose slides, insertion position, formatting policy, sizing policy, and unsupported-object fallback;
5. creates new editable Screens rather than overwriting an existing Screen;
6. uploads extracted supported media into the Resource Library;
7. applies all Screen/resource writes through the shared Phase 1 transaction and compensating-cleanup boundary;
8. selects the first imported Screen and displays a per-import report.

The browser retains the selected `File` only for the active import. The original PPTX is not stored.

## 2. OOXML architecture

The backend adapter reads the PPTX ZIP package and emits the shared `spectropy.import.v1` normalized document. It does not place presentation parsing inside the React page.

The adapter resolves:

- slide order from `ppt/presentation.xml` and its relationships;
- slide → layout → master → theme relationships;
- source slide dimensions in EMUs until final Studio coordinate fitting;
- slide, layout, and master background inheritance;
- placeholder geometry inherited from layouts and masters;
- theme colours and major/minor fonts;
- media through relationship IDs instead of guessed file names;
- notes-slide relationships;
- group transforms, nested coordinates, rotation, flips, and z-order.

This follows the package and relationship model described in Microsoft's Open XML documentation. The implementation uses no Office automation and does not execute presentation content.

## 3. Editable MVP coverage

### Converted as editable Studio objects

- separate text boxes;
- paragraphs and rich runs;
- font family/size, bold, italic, underline, colour, super/subscript;
- paragraph alignment, bullets, hyperlinks, vertical alignment, and text margins;
- common geometric shapes, flowchart shapes, callouts, lines/connectors, and arrows;
- fill, opacity, stroke colour, width, and dash style;
- pictures and SVG resources with crop metadata, fit, rotation, flips, names, and alt text;
- groups with shared Studio group IDs;
- source position, size, rotation, flip, and z-order;
- slide background, hidden-slide flag, source part metadata, and speaker notes;
- deterministic common Microsoft-font substitutions with report entries.

### Explicitly reported/deferred

- charts;
- SmartArt/diagram graphic frames;
- tables as native editable tables;
- equations;
- audio/video/GIF playback semantics;
- embedded objects;
- PowerPoint animations and transitions;
- PowerPoint 3D models and advanced effects.

Unsupported content is never silently discarded. The import policy creates a visible placeholder or explicitly skips the object and records the decision. A picture fallback is used only when an existing source picture is available; this MVP does not claim to render arbitrary Office objects server-side.

## 4. Security and operational limits

The upload boundary enforces:

- `.pptx` only; `.ppt`, `.pptm`, password-protected, macro, and ActiveX packages are rejected;
- 100 MB compressed file limit;
- 100-slide limit;
- 5,000 ZIP-entry limit;
- 500 MB expanded-package limit;
- 50 MB single-entry/media limit;
- 200:1 compression-ratio limit;
- ZIP traversal/absolute-path rejection;
- encrypted-entry rejection;
- XML `DOCTYPE`/entity rejection;
- image signature checks;
- active SVG/script/external-content rejection;
- authenticated author-only endpoints;
- cancellation through an abort signal and compensating cleanup after any staged write failure.

## 5. Persistence and ordering

The Phase 1 commit service was extended without introducing a second persistence path:

- imported media is hash-deduplicated before Resource Library creation;
- imported group identity becomes `position.groupId`;
- notes and hidden state are retained in Screen import metadata;
- source background colour becomes the Studio Screen background;
- imported Screens can be inserted at the beginning, end, or after the current Screen;
- reordering uses the session revision contract;
- any resource, Screen, save, verification, or reorder failure triggers reverse-order cleanup.

## 6. Verification evidence

### Automated

- `frontend npm run build`: passed.
- `frontend npm run test:studio-foundations`: **81/81 passed**.
- targeted backend importer/foundation/fixture tests: **15/15 passed**.
- targeted backend ESLint for all new/changed Phase 3 backend files: passed.
- targeted frontend ESLint for the two new Phase 3 modules: passed; the existing `TeachingStudioPage.tsx` still reports its pre-existing unused imports/variable and hook warnings.
- full backend suite: **283 passed, 10 failed**. All 10 failures are pre-existing `question-bank-flow.test.js` mock-query failures (`programs` ownership query) and do not touch the Studio importer.

### Supplied acceptance deck

`Maths_Trigonometry introduction (2).pptx` was read from the user's Downloads folder without copying it into the repository:

- 19 slides recognized in presentation order;
- 1,417 editable/fallback elements planned;
- 841 editable text elements;
- 14 placed image elements referencing 3 deduplicated media resources;
- 42 warnings, primarily deferred slide animation timing and unsupported extended objects;
- no parser error.

### Synthetic regression deck

Automated tests additionally verify:

- presentation order differing from numeric slide filenames;
- mixed rich-text runs;
- font substitution;
- common shape geometry;
- group transforms and persistent grouping;
- image extraction/crop metadata;
- explicit graphic-frame fallback;
- selected-slide commit;
- insertion reordering;
- import report counts;
- legacy extension and XML-entity rejection.

## 7. Product-owner review checklist

1. Open an author Session and choose **Insert > Import PowerPoint**.
2. Select the supplied Trigonometry PPTX.
3. Confirm 19 slides appear in source order with counts/warnings.
4. Select two or three representative slides and import after the current Screen.
5. Confirm imported text boxes can be selected and edited separately.
6. Confirm shapes can be selected, moved, resized, and formatted.
7. Confirm grouped shapes select/ungroup as a group.
8. Confirm pictures appear as Resource-backed elements and crop/fit remains available.
9. Save, reload, Preview, and Presentation-test the imported Screens.
10. Review the import report for deferred or substituted content.
11. Cancel a second import while processing and confirm no partial Screens remain.

Phase 4 must not begin until this review is accepted or Phase 3 corrections are recorded.

## 8. Imported-object slot collision — 23 Nov 2026

### Finding

The full Trigonometry session remained correctly partitioned into separate Screen records. Its server-side PPTX import path still assigned only three shared `slot_id` values (`free-text`, `free-element`, and `free-element-resource`) within each Screen. The client-side clipboard planner already generated per-element slots, but PPTX import commits use `studioImportFoundation.service.js`, so that earlier change did not affect PPTX persistence.

This caused a playback-specific failure: `StudioSessionPlayerPage` built both its freeform layout and `Slide` objects from the persisted shared `slot_id`. `SlideCanvas` indexes objects by slot ID, so repeated slots overwrite each other in that map. The editor's `BlankScreenCanvas` already had a legacy import fallback, which is why the editor and playback paths could behave differently.

### Correction

- New server-side imports assign a unique freeform slot to each imported element and use that same slot ID for its resource mapping.
- A shared slot resolver now remaps legacy imported elements by their stable element ID in both the author canvas and the published/presentation player.
- Existing imported Screens therefore use the compatibility mapping without requiring a reimport.

### Verification and remaining acceptance

- Backend importer and PPTX tests: **12/12 passed**.
- Focused frontend import tests: **7/7 passed**.
- Frontend production build: passed; Vite reported the existing large-chunk advisory.
- Session data confirmed distinct Screen records and element keys, with the slot collision confined to the stored slot IDs.
- The owner refreshed the existing localhost session and confirmed the imported screens now appear separately and work in Presentation View. The slot-collision defect is verified without reimporting the deck.
- Live localhost inspection in Microsoft Edge also confirmed Screens 1 and 2 render their own contents, and selecting a Screen 2 object opens Shape Format with resize handles. No slide content was changed during this check.
- Visual fidelity is not yet accepted: Screen 2 currently shows overlapping text labels and crowded diagram labels/geometry. Compare this slide with its source before changing conversion rules.
- Remaining Phase 3 acceptance: compare representative slide fidelity with PowerPoint; verify object selection/editing, grouping, image crop/fit, save/reload, import report, and cancellation cleanup. No Phase 4 work has started.
