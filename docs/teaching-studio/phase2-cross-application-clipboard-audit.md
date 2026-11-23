# Phase 2 Audit — Cross-Application Clipboard

**Date:** 23 Nov 2026  
**Branch:** `feature/clipboard-pptx-import`  
**Controlling specification:** [Cross-Application Clipboard and Editable PPTX Import](./clipboard-pptx-import-requirements-and-implementation-plan.md)  
**Phase status:** Complete; awaiting product-owner review before Phase 3

## 1. Delivered behavior

Phase 2 replaces the editor's order-dependent clipboard code with one source adapter and the normalized Phase 1 import contract.

- Native Spectropy copy, cut, and paste remains the highest-fidelity path and retains resource/version bindings, groups, metadata, and exact relative layout.
- External representations are inspected before selection. Priority is native payload, files, SVG, rich HTML, image, then plain text.
- Word/browser HTML becomes editable Studio text. Supported run formatting is preserved while scripts, event handlers, unsafe URLs, and unsafe CSS are removed.
- SVG is sanitized and preserved as a scalable Resource Library visual. The UI records that path-level editing is not yet available.
- Images, GIFs, videos, PPTX/PPSX, GLB, PDF, Word, Excel, CSV, and text files use the Resource Library instead of page-lifetime data URLs.
- Plain URLs become editable hyperlink text.
- Multiple pasted items are placed separately, selected together, and committed as one undoable editor action.
- Repeated paste creates fresh element IDs and applies a visible bounded offset.
- Paste Options show only meaningful choices: source formatting, editable content, destination theme, picture, and text only as supported by the payload.
- A single pasted image activates Picture Format.
- Spectropy writes native, plain-text, HTML, and supported image representations outward when the browser permits them.
- Image-only PowerPoint clipboard data shows a message directing the author to the Phase 3 PPTX import path for editable reconstruction.

## 2. Transaction and failure behavior

- Resource bytes are hashed and deduplicated before upload.
- All resource uploads finish before the canvas changes.
- If a later upload fails, created Resource Library records are deleted in reverse order.
- Incomplete storage cleanup is surfaced with the affected resource IDs.
- If the author changes Screens during an asynchronous paste, the paste is cancelled and its created resources are removed.
- Permission denial, malformed native payloads, unsupported content, and upload failures do not replace the current canvas or selection.
- Resource Library items remain reusable after an author deliberately undoes their canvas placement; undo does not silently delete a library asset.

## 3. Security boundaries

- Rich HTML uses an allowlist of presentation-safe tags and inline style properties.
- JavaScript URLs, active elements, event attributes, CSS `url()`, `expression()`, imports, and browser behavior properties are rejected.
- SVG scripts, foreign objects, embedded documents, event handlers, and external references are removed; local fragment references remain valid.
- Unsupported executable/file types are rejected with an actionable message.
- The adapter never logs clipboard text or media bytes.

## 4. Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Existing clipboard/editor regressions | Studio foundation suite | Passed |
| Editable HTML and mixed run formatting | Adapter sanitizer/conversion tests plus existing rich-text editor contract | Passed |
| Image and Resource Library behavior | Normalized resource planning, transactional commit, and production build | Passed |
| Preserved SVG behavior | Sanitizer and conversion test | Passed |
| Native relative layout | Dedicated multi-element regression test | Passed |
| Fresh IDs and visible repeated offset | Native clipboard tests and editor integration | Passed |
| Unsupported content messaging | Adapter test | Passed |
| Canvas Ctrl+A ownership | Existing capture-phase editor shortcut path retained | Passed by source/build regression |
| Transaction rollback | Dedicated upload-failure test | Passed |
| Chrome and Edge live clipboard permission behavior | Product-owner browser review | Pending manual approval |

## 5. Automated verification

- Frontend Studio foundation tests: **81/81 passed**.
- Frontend production build: **passed**.
- Phase 2 targeted lint: **passed** for all new and modified clipboard modules. The large pre-existing `TeachingStudioPage.tsx` still reports three unrelated unused-symbol errors and two existing hook warnings when linted alone; TypeScript and the production build pass.
- Diff whitespace validation: **passed**.

## 6. Deliberate limits

- A browser cannot access PowerPoint's private native object graph. If PowerPoint exposes only an image, paste remains an image; Phase 3 imports the original PPTX for editable reconstruction.
- Preserved SVG is scalable and safe but does not yet expose path-node editing.
- Audio is not accepted as a Resource Library clipboard upload because the current backend resource enum has no audio type. Adding a real audio resource type must be a separately validated schema/API change rather than disguising audio as video.
- Browser clipboard permission and supported output MIME types remain browser-controlled. Keyboard paste is the reliable fallback when toolbar clipboard access is denied.

## 7. Phase boundary

No PPTX ZIP/XML parser, Import PowerPoint dialog, slide-selection flow, or PPTX server job was added. Those belong to Phase 3 and must not begin until Phase 2 is approved.
