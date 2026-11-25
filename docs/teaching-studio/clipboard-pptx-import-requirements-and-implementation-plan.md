# Spectropy Teaching Studio
## Cross-Application Clipboard and Editable PPTX Import

**Requirements, Solution Architecture, and Phased Implementation Plan**  
**Document version:** 1.0 — Approved  
**Date:** 22 November 2026  
**Status:** Approved for phased implementation  
**Implementation status:** Phase 3 visual review remains open; Phase 4 implementation is complete in code; joint Phase 3+4 gate validation is pending by agreement

---

## 1. Purpose and control of this document

This document is the controlling reference for two related Teaching Studio capabilities:

1. Cross-application copy, cut, and paste.
2. Importing PowerPoint PPTX files as editable Spectropy screens and elements.

After approval, implementation must follow the scope, architecture, phase gates, and acceptance criteria in this document. A phase is not complete merely because code exists; its acceptance criteria and regression checks must pass. Any change in scope or behavior must be recorded in the change log and approved before implementation.

### 1.1 Approval record

| Role | Name | Decision | Date | Notes |
|---|---|---|---|---|
| Product owner | Spectropy product owner | Approved | 22 Nov 2026 | Approved phased implementation with review, validation, and audit after every phase. |
| Engineering | Spectropy engineering | Accepted | 22 Nov 2026 | Phase gates and the approved architecture are controlling requirements. |

### 1.2 Change log

| Version | Date | Change | Author |
|---|---|---|---|
| 0.1 | 22 Nov 2026 | Initial review draft covering requirements, architecture, implementation phases, testing, and acceptance gates. | Spectropy engineering |
| 1.0 | 22 Nov 2026 | Product-owner approval recorded; Phase 0 architecture, fixtures, limits, and baseline audit completed. | Spectropy engineering |
| 1.0 status | 23 Nov 2026 | Phase 0 approved and Phase 1 shared import foundation implemented, validated, and audited. | Spectropy engineering |
| 1.1 status | 23 Nov 2026 | Phase 1 approved and Phase 2 cross-application clipboard implemented, validated, and audited. | Spectropy engineering |

---

## 2. Executive summary

The Teaching Studio must accept useful content from external applications without converting everything into a single non-editable picture. It must also import normal PowerPoint presentations and reconstruct supported PowerPoint content as individual editable Spectropy elements.

The two capabilities will be implemented as two input adapters feeding one shared import engine:

```text
System clipboard ──> Clipboard adapter ──┐
                                        ├──> Normalized import document
PPTX file ─────────> PPTX adapter ──────┘            │
                                                     v
                           Validation, resource ingestion, and conversion
                                                     │
                                                     v
                              Spectropy screens and editable elements
```

This shared architecture prevents separate, inconsistent implementations of text formatting, images, SVG, coordinates, grouping, resources, warnings, and transaction handling.

The system will provide strong interoperability, not an impossible promise of universal editable conversion from every application. Browser clipboard APIs expose only formats the browser considers safe and supported. When structured source data is unavailable, Spectropy will use the best safe fallback and explain the result. For PowerPoint, the PPTX importer is the high-fidelity editable path.

---

## 3. Background and current behavior

The current Teaching Studio already contains:

- A `StudioElement` model with content, position, optional resource binding, and contextual ribbon behavior.
- Internal copy, cut, paste, grouping, formatting, and keyboard shortcut handling.
- A Spectropy-specific clipboard representation for exact in-application element transfer.
- Basic external clipboard handling for files, images, HTML, and plain text.
- Resource Library upload and version bindings.
- Contextual Picture Format, Media Format, 3D Model, Shape Format, and related ribbon tabs.

The observed problem is that copying multiple PowerPoint objects can expose only a rendered image to the browser. Spectropy therefore receives one image even when the source slide contains separate text boxes and shapes. The supplied Trigonometry presentation demonstrates this: its first slide contains separate PowerPoint shapes and text but browser paste can flatten the selection.

This is not solved by reading pixels more aggressively. Editable reconstruction requires either:

- a clipboard representation containing structure Spectropy understands, or
- the original PPTX package, which contains the Office Open XML structure.

---

## 4. Product goals

### 4.1 Primary goals

1. Preserve exact Spectropy-to-Spectropy copy and paste.
2. Paste common external content into the canvas using the richest safe representation available.
3. Keep supported external text, vectors, images, and files editable at the appropriate level.
4. Offer understandable paste choices instead of silently selecting a poor representation.
5. Import PPTX slides as separate editable Spectropy screens and elements wherever technically supported.
6. Preserve unsupported PowerPoint content visually through explicit fallbacks rather than silently losing it.
7. Upload extracted media through the existing Resource Library workflow and bind imported elements to created resource versions.
8. Preserve normal editor behavior after import: selection, movement, resizing, formatting, animation, save, reload, undo, redo, preview, and presentation.
9. Produce a clear import report describing successful, partial, substituted, flattened, skipped, and failed items.
10. Prevent partial or corrupted screens when an import fails.

### 4.2 Success definition

The feature is successful when a teacher or author can:

- copy ordinary text, formatted text, SVG, images, and files from supported external sources and paste them predictably;
- import a normal educational PPTX and continue editing its text, common shapes, pictures, and layout in Spectropy;
- understand exactly what was converted, substituted, flattened, or unsupported;
- safely undo the resulting operation or remove the imported screens;
- save, reload, preview, and present the imported content without regression.

---

## 5. Non-goals and explicit limitations

The first release will not promise:

1. Fully editable conversion from every application on every operating system.
2. Access to private clipboard formats that a browser does not expose.
3. Pixel-perfect reproduction of every PowerPoint feature in the initial phase.
4. Native editability for unsupported SmartArt, embedded OLE applications, macros, proprietary add-ins, or unknown binary objects.
5. Exact PowerPoint animation, transition, 3D lighting, or chart behavior before those mappings are explicitly implemented and tested.
6. Editable Spectropy objects when another application provides only a bitmap screenshot.
7. Exporting Spectropy objects as native PowerPoint objects in the initial scope.
8. Optical recognition of flattened slide images as a substitute for a real PPTX parser.

Unsupported content must never disappear without a recorded warning.

---

## 6. Terminology

| Term | Meaning |
|---|---|
| Native Spectropy payload | Spectropy’s structured clipboard representation used for exact round trips inside the application. |
| External clipboard content | Data copied from another application, website, or operating-system source. |
| Normalized import document | An application-independent intermediate model containing screens, elements, resources, and issues. |
| Editable element | A Spectropy element whose relevant text, geometry, style, position, and properties can be changed after import. |
| Flattened element | Unsupported structured content preserved as a picture. |
| Partial import | Content that remains usable but loses one or more unsupported properties. |
| Resource ingestion | Uploading or registering imported media in the Resource Library and linking it to an element. |
| Import transaction | One coordinated operation that either commits a valid result or rolls back incomplete changes. |
| OOXML | Office Open XML, the package and XML format used by PPTX files. |

---

## 7. Requirement A — Cross-application clipboard

### 7.1 Functional requirements

#### CLIP-001 — Preserve native Spectropy copying

Copying or cutting one or more Spectropy elements must preserve supported element properties, including:

- element type and content;
- position, dimensions, rotation, and layer order;
- rich text and element styling;
- group relationships;
- resource bindings;
- supported animations, hyperlinks, crop settings, and metadata.

Pasting must create new identifiers and must not mutate the source elements.

#### CLIP-002 — Clipboard representation priority

When pasting, Spectropy must evaluate available representations in this order unless the user explicitly chooses another paste mode:

1. Valid native Spectropy structured data.
2. Supported files or file references.
3. SVG/vector content.
4. Rich HTML content.
5. Image content.
6. Plain text.

The adapter must not choose an image merely because an image representation appears before richer usable structured content.

#### CLIP-003 — Paste common external content

The system must support:

| Clipboard content | Expected result |
|---|---|
| Plain text | Editable text element. |
| HTML/rich text | Editable rich-text element with safe supported formatting. |
| SVG | Editable vector/shape where supported; otherwise a preserved SVG visual with a recorded limitation. |
| PNG/JPEG/WebP/GIF | Picture or animation element using the Resource Library. |
| Supported local file | Appropriate uploaded resource and canvas element. |
| URL | Hyperlink, external resource, or embedded resource according to the URL and user choice. |
| Multiple supported items | Multiple elements with non-overlapping placement. |

#### CLIP-004 — Paste choices

When multiple meaningful outcomes are possible, the interface must offer context-appropriate options:

- Keep Source Formatting.
- Use Spectropy Formatting.
- Paste as Editable Content.
- Paste as Picture.
- Text Only.

Options that cannot be fulfilled by the available clipboard data must be disabled or omitted, not simulated misleadingly.

#### CLIP-005 — Contextual editing after paste

After paste:

- image content must select the created element and make Picture Format available;
- video/audio content must make Media Format available;
- shape/vector content must make Shape Format available;
- text must expose the relevant Home/text controls;
- a 3D model must expose the 3D contextual tools;
- multiple elements must preserve multi-selection.

#### CLIP-006 — Paste placement

Pasted content must:

- appear within the visible canvas;
- retain relative positions for a multi-element Spectropy payload;
- offset repeated pastes so objects remain discoverable;
- avoid unintended clipping beneath editor panels;
- preserve aspect ratio where required.

#### CLIP-007 — Copy outward

When copying Spectropy content for other applications, Spectropy must publish safe standard representations where meaningful:

- plain text;
- sanitized HTML;
- image or SVG when supported by the export path;
- native Spectropy structured data for Spectropy-aware destinations.

Another application may select only the representation it supports. Native PowerPoint object export is not part of the initial scope.

#### CLIP-008 — PowerPoint clipboard fallback

If a PowerPoint selection is exposed to the browser only as an image:

- Spectropy may paste the image;
- Spectropy must not label it as editable PowerPoint objects;
- the user should be informed that importing the original PPTX is required for editable reconstruction.

#### CLIP-009 — Security and sanitization

External HTML, SVG, URLs, and files must be sanitized and validated. Scripts, unsafe event handlers, executable embedded content, unsafe URLs, and unsupported active content must not enter the canvas or runtime.

#### CLIP-010 — Error behavior

Clipboard permission denial, unsupported content, upload failure, and malformed custom payloads must produce actionable messages and must not destroy the current selection or screen content.

### 7.2 Clipboard acceptance criteria

The clipboard phase is accepted only when:

1. Existing Spectropy copy, cut, paste, undo, redo, grouping, and formatting tests continue to pass.
2. Text copied from Word or a browser becomes editable text.
3. Mixed rich text retains supported per-run formatting.
4. A copied image becomes a selectable picture with Picture Format available.
5. SVG follows the agreed editable-vector or preserved-vector behavior.
6. Multiple native Spectropy elements retain their relative layout.
7. Repeated paste produces new IDs and a visible offset.
8. Unsupported clipboard content produces a useful message or safe fallback.
9. Browser-native page selection does not replace canvas selection when canvas shortcuts are intended.
10. The same supported workflows pass in the agreed Chrome and Edge versions.

---

## 8. Requirement B — Editable PPTX importer

### 8.1 User workflow requirements

#### PPTX-001 — Import entry point

The Teaching Studio must provide a clear Import PowerPoint action. The action must accept `.pptx` files. Legacy `.ppt` support is not part of the first parser unless a separately approved conversion service is added.

#### PPTX-002 — Import configuration

Before committing changes, the user must be able to choose:

- slides to import;
- destination session;
- insertion position;
- create new screens or another explicitly approved destination behavior;
- keep source formatting or use Spectropy styling where supported;
- preserve source dimensions or fit proportionally to the Spectropy canvas;
- unsupported-content fallback: picture, placeholder, or skip;
- whether supported animations should be imported once animation mapping is available.

#### PPTX-003 — Progress and cancellation

The importer must show meaningful stages such as:

- validating file;
- reading presentation structure;
- converting slides;
- uploading resources;
- creating screens;
- finalizing report.

The operation must support safe cancellation before commit. Cancellation during resource ingestion must clean up temporary or unreferenced data according to backend policy.

### 8.2 Supported editable content — MVP

#### PPTX-010 — Presentation and slide properties

The importer must read:

- slide order;
- slide dimensions and aspect ratio;
- slide background;
- relationships between slides, layouts, masters, and themes;
- hidden-slide state if supported by the destination model, otherwise record it.

#### PPTX-011 — Text

The importer must reconstruct supported text as editable text, including:

- separate text boxes;
- paragraphs and line breaks;
- text runs with different font family, size, weight, style, decoration, and color;
- alignment;
- bullets and numbering where supported;
- basic indentation and spacing;
- hyperlinks;
- superscript and subscript where supported;
- text-box position, size, rotation, margins, and alignment where supported.

Missing fonts must use a deterministic substitution map and appear in the import report.

#### PPTX-012 — Common shapes

The MVP must support common educational-presentation geometry:

- rectangle and rounded rectangle;
- ellipse/circle;
- triangle and common polygons;
- lines, connectors, and arrows;
- common callouts and basic flowchart shapes;
- basic freeform/vector paths when conversion is safe.

Supported styling includes solid fill, basic gradient where implemented, transparency, line color, line width, dash pattern, and basic shadow.

#### PPTX-013 — Images and SVG

Embedded images and SVG must be extracted, validated, uploaded through the Resource Library, and linked to the resulting elements. The importer must preserve supported crop, fit, transparency, rotation, and aspect-ratio behavior.

#### PPTX-014 — Position and stacking

The importer must preserve, within documented tolerance:

- x/y position;
- width/height;
- rotation and flip;
- relative placement;
- z-order;
- slide boundary clipping;
- grouped-child transformations for supported groups.

PowerPoint EMU coordinates must be converted deterministically to the Spectropy coordinate system.

#### PPTX-015 — Groups

Supported groups must remain groups when Spectropy can represent the result without changing child geometry. Unsupported nested or transformed groups may be converted to independent elements or flattened, but the report must describe the decision.

#### PPTX-016 — Notes and metadata

Speaker notes, alt text, object names, and hyperlinks should be preserved when a corresponding Spectropy field exists. Notes must not be silently inserted as visible slide text.

### 8.3 Extended teaching-content scope

The following are planned after the editable MVP and require separate acceptance within their phase:

- tables;
- equations;
- audio and video;
- GIF and animation media;
- charts;
- supported PowerPoint animations and transitions;
- motion paths and triggers;
- 3D models and view properties;
- SmartArt approximation;
- advanced gradients, reflections, glow, artistic effects, and complex custom geometry.

### 8.4 Fallback requirements

#### PPTX-020 — Never silently discard

Every unsupported or partially supported visible object must result in one of:

1. editable conversion;
2. partial conversion with warning;
3. flattened visual fallback;
4. visible placeholder;
5. explicit skip requested by the user.

#### PPTX-021 — Import report

The final report must include:

- number of slides requested and imported;
- editable elements created;
- resources uploaded;
- font substitutions;
- partially converted objects;
- flattened objects;
- skipped objects;
- failed objects;
- unsupported feature categories;
- warnings linked to the affected slide and object where possible.

#### PPTX-022 — Transaction safety

No incomplete screens may remain after a failed import. The implementation must use a validated staged result and a controlled commit. If the backend cannot provide a single database transaction across screens and resources, it must provide compensating cleanup with auditable results.

### 8.5 PPTX MVP acceptance criteria

The PPTX MVP is accepted only when:

1. The supplied Trigonometry presentation can be imported without becoming one slide-sized image when its objects are supported.
2. Supported text boxes remain separately selectable and editable.
3. Different text formatting within the same text box remains distinguishable and editable.
4. Supported shapes remain separate, movable, resizable, and styleable.
5. Images appear through valid Resource Library bindings.
6. Object positions and stacking visually match the PowerPoint reference within the approved tolerance.
7. Imported screens save and reload without structural change.
8. Imported elements work with undo/redo and contextual ribbon tabs.
9. Imported screens work in Preview and Presentation View.
10. Unsupported content appears in the import report and follows the selected fallback policy.
11. A failed or cancelled import leaves no incomplete screens.
12. Existing manually created screens continue to work unchanged.

---

## 9. Shared solution architecture

### 9.1 Architectural principle

Clipboard input and PPTX input must not write directly into `TeachingStudioPage` state using separate ad hoc conversions. Both must first produce a validated normalized import document. Committing that document is a separate responsibility.

### 9.2 Proposed modules

```text
frontend/src/features/teaching-studio/importing/
  model/
    importTypes.ts
    importValidation.ts
    importIssues.ts
  adapters/
    clipboardAdapter.ts
    pptxAdapter.ts
  converters/
    textConverter.ts
    shapeConverter.ts
    vectorConverter.ts
    mediaConverter.ts
    coordinateConverter.ts
    styleConverter.ts
    groupConverter.ts
  resources/
    importedResourcePlanner.ts
    importedResourceUploader.ts
  commit/
    importPlanner.ts
    importCommitter.ts
    importRollback.ts
  reporting/
    importReport.ts
  ui/
    PasteOptionsMenu.tsx
    PptxImportDialog.tsx
    ImportProgressDialog.tsx
    ImportReportDialog.tsx
```

The exact filenames may change during implementation, but the separation of responsibilities must remain.

### 9.3 Normalized import model

The model must be independent of PowerPoint XML and browser clipboard objects.

```text
ImportDocument
  source
  sourceMetadata
  screens[]
  resources[]
  issues[]

ImportScreen
  sourceId
  title
  width
  height
  background
  elements[]
  notes

ImportElement
  sourceId
  kind
  bounds
  rotation
  flip
  zIndex
  content
  style
  group
  resourceReference
  metadata

ImportResource
  sourceId
  fileName
  mediaType
  bytes or deferred reader
  hash
  metadata

ImportIssue
  severity
  code
  message
  sourceScreenId
  sourceElementId
  fallbackApplied
```

### 9.4 Import pipeline

1. **Acquire:** Receive a ClipboardEvent/ClipboardItem or uploaded PPTX.
2. **Validate source:** Check type, size, permissions, and package safety.
3. **Parse:** Build a source-specific representation.
4. **Resolve inheritance:** For PPTX, resolve slide, layout, master, theme, and defaults.
5. **Normalize:** Convert source data into `ImportDocument`.
6. **Plan resources:** Deduplicate media and determine Resource Library operations.
7. **Validate normalized document:** Reject invalid coordinates, unsafe markup, and unsupported active content.
8. **Preview:** Present choices, warnings, and estimated effects.
9. **Stage:** Upload resources and prepare screen/element mutations.
10. **Commit:** Apply one controlled import operation.
11. **Verify:** Confirm created screens, elements, and resource bindings.
12. **Report:** Display and retain the import report.
13. **Rollback/cleanup:** Remove staged content if commit fails.

### 9.5 Integration with the existing application

The implementation must integrate through established application boundaries:

- Convert normalized elements into the existing `StudioElement` model rather than creating a parallel canvas model.
- Use existing resource creation/version APIs instead of embedding unmanaged file data in element JSON.
- Use the editor’s established commit pathway so revision handling, undo history, selection, and autosave remain consistent.
- Use the existing contextual ribbon model so imported images, shapes, text, media, and 3D content expose the correct tools.
- Keep `TeachingStudioPage` as an orchestrator. Parsing, conversion, and reporting logic must live in dedicated modules and be independently testable.
- Avoid coupling OOXML parsing to React components.

### 9.6 Backend responsibilities

The preferred design is:

- frontend performs user interaction and may parse basic clipboard content;
- PPTX package validation, extraction, and/or conversion may use a backend service when it improves safety, memory control, testability, or transactional behavior;
- backend provides limits, package validation, resource ingestion, cleanup, and import-job status;
- persisted screens and resources use existing authorization and tenant boundaries.

A final frontend-only versus backend-assisted PPTX parsing decision must be recorded during Phase 0 after measuring representative files. Regardless of location, the normalized model and behavior remain the same.

### 9.7 PPTX inheritance resolution

PowerPoint properties may be inherited. Resolution must follow a deterministic precedence:

```text
Direct shape/run property
  -> slide-level property
  -> slide layout
  -> slide master
  -> theme
  -> importer default
```

The importer must not assume every style is stored directly in `slideN.xml`.

### 9.8 Coordinate strategy

- Parse PowerPoint EMU values without early rounding.
- Resolve group-local transformations before converting to Spectropy coordinates.
- Convert against the source slide dimensions.
- Apply one proportional fit transform when fitting to the Spectropy canvas.
- Round only at the final model boundary.
- Record clipping and out-of-bounds decisions.

### 9.9 Resource strategy

- Hash embedded media for deduplication within the import.
- Validate MIME type from content, not filename alone.
- Sanitize filenames.
- Create resources using existing Resource Library APIs.
- Store source attribution and import metadata where appropriate.
- Bind the resulting resource and version IDs to the created element.
- Do not use temporary browser object URLs as persisted element sources.

### 9.10 Transaction and undo strategy

An entire clipboard paste should be one undoable editor action. A PPTX import should be undoable at a meaningful level if the current history model can safely represent it; otherwise the UI must provide a deliberate Remove Imported Screens action and the import operation must remain transaction-safe.

---

## 10. User experience specification

### 10.1 Clipboard paste flow

1. User focuses the canvas and pastes.
2. Spectropy inspects all available safe representations.
3. If one unambiguous best representation exists, Spectropy pastes it.
4. If multiple useful outcomes exist, Spectropy shows a compact Paste Options control near the inserted content.
5. The created element or elements remain selected.
6. The appropriate contextual ribbon becomes available.
7. The operation can be undone as one action.

### 10.2 PPTX import flow

1. User chooses **Import PowerPoint**.
2. User selects a PPTX.
3. Spectropy validates the file and displays slide thumbnails or slide names.
4. User selects slides and import options.
5. Spectropy performs a preflight and shows warnings that can be known before commit.
6. User starts import.
7. Spectropy shows stage-based progress.
8. Imported screens are created at the chosen location.
9. Spectropy opens the first imported screen.
10. Spectropy displays a summarized report with drill-down details.

### 10.3 Default behavior proposed for approval

1. PPTX import creates new screens; it does not overwrite existing screens.
2. Source slide content is proportionally fitted to the Spectropy canvas while preserving relative layout.
3. Source formatting is the default.
4. Unsupported visible content defaults to a picture fallback.
5. Unsupported non-visual metadata is recorded and skipped.
6. Animations are imported only when an effect has an approved Spectropy mapping; otherwise they are reported and omitted while the object remains visible.
7. The original PPTX is retained only if product and storage policy explicitly approve it.

---

## 11. Security, privacy, and reliability requirements

1. Reject malformed ZIP structures and path traversal entries.
2. Enforce uncompressed-size, file-count, slide-count, media-size, and processing-time limits.
3. Detect ZIP-bomb behavior.
4. Parse XML with external-entity resolution disabled.
5. Do not execute macros, scripts, OLE content, embedded HTML scripts, or PowerPoint actions.
6. Sanitize HTML and SVG.
7. Validate media signatures and supported MIME types.
8. Apply existing tenant authorization to every imported screen and resource.
9. Avoid logging document content, clipboard payloads, or media bytes in production logs.
10. Ensure temporary files and staged uploads are cleaned up.
11. Preserve the current screen if parsing or import fails.
12. Rate-limit or queue expensive imports as required by production capacity.

Initial limits must be measured and approved in Phase 0 rather than guessed. The UI must explain a rejected file clearly.

---

## 12. Performance requirements

Performance budgets will be finalized after representative-file measurement. The implementation must nevertheless:

- keep the editor responsive during parsing and upload;
- avoid loading all large media into React state;
- support progress reporting;
- deduplicate repeated media;
- process slides incrementally where safe;
- avoid unnecessary re-rendering of the active editor screen;
- defer thumbnail generation and advanced conversion where appropriate;
- provide cancellation before irreversible commit;
- prevent resource animation or preview from starting before the resource is visually ready.

Representative benchmarks must include small, medium, and large educational PPTX files.

---

## 13. Implementation plan and phase gates

### Phase 0 — Baseline, decisions, and test fixtures

**Purpose:** Protect current behavior and remove architectural uncertainty before feature coding.

**Work:**

- Map existing clipboard, element creation, resource upload, revision, autosave, and contextual-ribbon flows.
- Capture current automated test coverage and add missing regression tests.
- Create a representative fixture set: supplied Trigonometry PPTX, text-heavy deck, image-heavy deck, grouped-shape deck, media deck, malformed file, and unsupported-feature deck.
- Record the actual clipboard MIME types exposed by supported Edge and Chrome versions for PowerPoint, Word, browser, SVG, image, and file sources.
- Decide frontend-only or backend-assisted PPTX parsing based on security and performance evidence.
- Approve defaults and initial operational limits.

**Exit gate:**

- Baseline tests pass.
- Fixture inventory and expected outcomes are documented.
- Parsing location decision is recorded.
- No implementation begins with unresolved product defaults that materially change data behavior.

### Phase 1 — Shared import foundation

**Purpose:** Build the normalized model and safe commit path used by both requirements.

**Work:**

- Implement normalized import types and validation.
- Implement issue codes and import reporting.
- Implement coordinate and style normalization utilities.
- Implement resource planning/deduplication abstraction.
- Implement staged commit and cleanup behavior.
- Add unit tests for normalization, validation, resource planning, and rollback.

**Exit gate:**

- A synthetic `ImportDocument` can create valid screens/elements/resources through normal application boundaries.
- Failed validation creates no persisted content.
- Failed commit performs verified cleanup.
- Existing editor workflows remain unchanged.

### Phase 2 — Cross-application clipboard

**Purpose:** Deliver predictable paste behavior using the shared engine.

**Work:**

- Refactor current external clipboard handling into `clipboardAdapter`.
- Inspect all available representations before selecting one.
- Implement HTML/rich-text, SVG, image, file, URL, and plain-text conversions.
- Preserve native Spectropy clipboard behavior.
- Implement Paste Options UI and correct contextual ribbon activation.
- Implement multi-item placement and one-step undo.
- Add browser integration and end-to-end tests.

**Exit gate:** All criteria in Section 7.2 pass.

### Phase 3 — PPTX editable MVP

**Purpose:** Import ordinary PowerPoint slides as editable Spectropy content.

**Work:**

- Validate and extract PPTX packages.
- Parse presentation, slides, relationships, layouts, masters, and themes.
- Implement inheritance resolution.
- Convert text runs and paragraphs.
- Convert common shapes, lines, arrows, images, SVG, position, rotation, z-order, and basic groups.
- Upload embedded media through Resource Library APIs.
- Implement import configuration, progress, cancellation, and report UI.
- Implement fallback behavior.
- Add rendering comparisons and editor end-to-end tests.

**Exit gate:** All criteria in Section 8.5 pass for the approved MVP feature set.

### Phase 4 — Teaching-content expansion

**Purpose:** Cover the content most valuable to Spectropy teachers.

**Work:**

- Convert PowerPoint tables into editable Spectropy table elements, preserving cell text, basic cell formatting, merged cells, and declared header/row/column bands.
- Convert standalone Office MathML equations into editable math elements; preserve inline math as readable linearized text and report the conversion.
- Extract embedded audio/video into Resource Library files, keep GIF images animated, and render browser-supported media in editor and playback.
- Preserve speaker notes and accessibility names/descriptions.
- Preserve picture crop geometry and map grayscale, luminance, and alpha treatments into image styles; report other image effects that are not represented.
- Map supported entrance/exit animation filters, direction, wheel spokes, repeat/timing, and common transitions into existing Spectropy runtime fields; report unsupported effects and approximations.
- Reconstruct charts with embedded cached data as editable Spectropy chart elements; report chart types approximated, combination-chart omissions, and missing cached data.

**Implementation record (24 November 2026):** The importer, normalized model, commit mapper, resource upload contract, authoring renderers, and published player now carry the Phase 4 content above. The import report exposes object counts for tables, equations, charts, and media. Joint product-owner validation confirmed editable tables and charts, equations, grouped image/audio/video content, supported transitions, movement, saving, reload, and playback. The Phase 3 and Phase 4 exit gates are **accepted**.

**Known mapping limits:** Inline equations are linearized instead of split into separate inline math objects. Cached chart data is reconstructed as editable 2D charts; combination charts retain only the first chart type. Chart axes and legends, complex PowerPoint table presets, some 3D/area/scatter chart styles, complex image treatments, animation paths/triggers, and transition variants are simplified, approximated, or reported unsupported. Embedded media playback depends on the browser's codec support. These limits must remain visible in the report.

**Exit gate:** Passed on 24 November 2026 through joint validation of the approved Trigonometry deck and the representative `Testing.pptx` teaching-content fixture. Known limitations remain documented rather than silently discarded.
### Phase 5 — Advanced compatibility

**Purpose:** Incrementally improve fidelity without destabilizing the core importer.

Potential scope:

- advanced custom geometry;
- nested groups;
- more PowerPoint effects;
- charts and embedded workbooks;
- motion paths and animation triggers;
- SmartArt approximation;
- 3D models and camera/view mappings.

This phase is not required for declaring the editable MVP complete.

**Approved priority order (24 November 2026):**

1. **Phase 5A — Stability baseline:** lock the accepted Phase 3–4 behavior with portable regression fixtures and documented compatibility expectations.
2. **Phase 5B — Complex slide structures:** nested groups, custom geometry, connectors, transformation fidelity, and inherited formatting.
3. **Phase 5C — SmartArt and diagrams:** reconstruct supported diagrams as editable grouped objects with explicit fallback for unsupported layouts.
4. **Phase 5D — 3D content:** extract supported embedded models and preserve available transform, camera, lighting, and view metadata.
5. **Phase 5E — Advanced animation and transitions:** motion paths, triggers, sequencing, additional effects, and Spectropy-authored equivalents for proprietary transitions where feasible.
6. **Phase 5F — Advanced charts and embedded workbooks:** workbook-backed data, more chart types and styling, followed by contextual Chart Design/Format controls.

Chart-specific authoring controls remain planned but are intentionally lower priority because imported charts are already editable, movable, resizable, saved, and rendered. Every Phase 5 increment must preserve the accepted importer path and keep unsupported content visible in the report.

**Phase 5A status (24 November 2026): Complete.** A portable regression fixture now protects editable tables, charts, equations, grouped image/audio/video content, supported transitions, and the database contracts required by imported audio and tables.

**Phase 5B implementation record (24 November 2026):**

- Nested group coordinate systems now compose through affine transforms, including group rotation and flips, instead of projecting only one unrotated level.
- All descendants retain the top-level editable Studio group while the original nested hierarchy and leaf group remain in import-source metadata.
- Numeric and guide-based PowerPoint custom geometry paths convert into editable Spectropy SVG-path shapes. Lines, quadratic/cubic curves, arcs, and closed paths are supported; unresolved guide commands are reported as approximations.
- Imported straight, elbow, and curved connectors preserve line styling, start/end arrowheads, and source connection identifiers.
- Placeholder shapes can inherit fill, outline, font reference, default run formatting, vertical alignment, and margins from their layout/master definitions when the slide omits those values.
- The editor and published player render imported custom geometry and connector arrowheads through the shared shape renderer.

**Phase 5B compatibility limits:** Spectropy currently exposes one editable group ID per element, so nested PowerPoint groups operate as their top-level group in the editor; the source hierarchy remains available for future drill-down support. Connector source attachments are retained as metadata, but moving one connected shape does not yet reroute the imported connector automatically. Unsupported custom-geometry guide expressions remain visible in the import report rather than silently disappearing.

**Phase 5B exit gate:** Import a representative nested-group/custom-shape deck and confirm geometry placement, group movement, custom-shape rendering, connector arrowheads, inherited placeholder styling, save/reload, preview, and presentation playback. The automated structural regression must remain green before product-owner validation.

**Phase 5B engineering verification (24 November 2026):** The focused PPTX/import-foundation suite passes 15/15 checks. The approved Trigonometry deck parses 19 slides with 1,463 editable elements, including 11 custom geometries, 41 members of nested groups, 251 connectors, and no unsupported shapes or import errors. The representative `Testing.pptx` fixture continues to produce its expected table, chart, equation, image, audio, and video objects without errors. Product-owner visual verification of the Phase 5B exit gate remains pending.

**Phase 5C implementation record (24 November 2026):** PowerPoint SmartArt data and layout package parts now reconstruct as editable Spectropy Smart Diagrams. The importer preserves node text, parent relationships, hierarchy levels, assistant roles, direction, accessibility text, and a mapped diagram category/layout. PowerPoint-specific SmartArt styling is explicitly reported as an approximation. Invalid or unavailable SmartArt data continues through the configured visible fallback.

**Phase 5D implementation record (24 November 2026):** Embedded GLB models now import into the Resource Library as `model_3d` resources and bind to interactive Studio objects. Available camera preset, lighting preset, and source rotation metadata are retained. Spectropy maps lighting to its closest supported environment and exposes the established 3D Model contextual controls after import.

**Phase 5E implementation record (24 November 2026):** The animation importer now handles supported entrance and exit effects plus PowerPoint motion paths, spin, grow/shrink, opacity/fill property animations, repeats, auto-reverse, text iteration, sequence timing, and object-click triggers. Trigger source references are translated to the persisted Studio element identifiers during commit. The existing transition mapper covers common, dynamic, and Spectropy-authored equivalents while keeping unmapped proprietary variants visible in the report.

**Phase 5F implementation record (24 November 2026):** Charts can now reconstruct editable labels and series from an embedded `.xlsx` workbook when the chart cache is empty. Selected charts expose contextual Chart Design and Chart Format tabs for chart type, title, axes, legend, data labels, series colours, chart background, and accessibility text. Combination charts still retain the first supported chart family, and unsupported PowerPoint-only rendering details remain explicit import issues.

**Phase 5 engineering verification (24 November 2026):** The focused importer and commit suite passes 16/16 checks, including a portable advanced fixture covering editable SmartArt, an embedded interactive 3D model, motion/spin animation mappings, and an embedded-workbook chart. Frontend TypeScript compilation passes. The user elected to defer separate Phase 5B–5F product gates and perform one combined visual and functional validation after all implementation work.

**Combined Phase 5 exit gate:** Import representative decks containing nested groups, custom geometry, connectors, SmartArt, GLB models, motion paths, object triggers, additional transitions, cached charts, and workbook-backed charts. Confirm selection and editing, contextual tabs, movement and resize, animation sequencing, save/reload, preview, presentation playback, import-report accuracy, and no regression to the accepted Phase 3–4 content. This gate remains pending product-owner validation.

---

## 14. Verification strategy

### 14.1 Test levels

1. **Unit tests:** coordinate conversion, inheritance resolution, text runs, shapes, style mapping, sanitizer, issue generation, and fallback decisions.
2. **Contract tests:** normalized model to `StudioElement`, Resource Library requests, screen creation, and cleanup.
3. **Fixture tests:** deterministic PPTX packages with known expected normalized output.
4. **Visual tests:** compare PowerPoint reference renders to Spectropy renders with documented tolerances.
5. **Editor interaction tests:** select, edit, move, resize, crop, format, group, animate, undo, redo, save, and reload.
6. **End-to-end tests:** complete clipboard and PPTX import workflows in supported browsers.
7. **Security tests:** malformed packages, unsafe XML, unsafe SVG/HTML, oversized media, traversal paths, and cancellation.
8. **Regression tests:** existing manually authored screens, resources, animations, presentation mode, and teacher/player rendering.

### 14.2 Phase verification protocol

At the end of every phase:

1. Engineering publishes the implemented scope and known limitations.
2. Automated test results are recorded.
3. A local demonstration follows the phase acceptance checklist.
4. The product owner verifies representative workflows.
5. Defects are recorded against the phase.
6. The next phase starts only after approval or an explicitly documented exception.

### 14.3 Required end-to-end workflows

- Copy Spectropy elements, paste on another screen, save, and reload.
- Copy styled external text, paste, edit individual formatting, save, and reload.
- Paste an image and confirm Picture Format, crop, animation, preview, and presentation.
- Paste SVG and verify the approved editability level.
- Import selected PPTX slides into the middle of a session.
- Edit imported text and shapes.
- Move, resize, reorder, group, and animate imported content.
- Save and reload imported screens.
- Preview and present imported screens.
- Cancel an import.
- Force an upload or commit failure and verify cleanup.

---

## 15. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Browser exposes only image data from PowerPoint clipboard | No editable structure through paste | Explain the limitation and direct the user to PPTX import. |
| PPTX styling is inherited from masters/themes | Missing or incorrect formatting | Implement formal inheritance resolution and fixture tests. |
| Text-run differences are lost | Imported text is not truly editable with source formatting | Use structured rich-text runs; do not reduce a text box to one plain string. |
| Group transformations distort placement | Elements move or resize incorrectly | Resolve group-local transforms before final coordinate conversion. |
| Unsupported objects silently disappear | Data loss and user distrust | Mandatory issue tracking and explicit fallback policy. |
| Resource upload partially succeeds | Orphan resources or incomplete slides | Staged commit, deduplication, and compensating cleanup. |
| Large decks freeze the editor | Poor usability or browser crash | Worker/backend processing, streaming, limits, progress, and cancellation. |
| Imported content breaks existing editor behavior | Regression across production | Reuse existing models and commit paths; gate every phase with regression tests. |
| Missing fonts change layout | Visual mismatch | Deterministic substitution map and visible report. |
| Malicious PPTX/HTML/SVG | Security incident | Package limits, safe XML parsing, sanitization, MIME validation, and no active-content execution. |
| Scope expands toward complete PowerPoint replication | Delayed delivery and unstable implementation | Keep MVP and advanced compatibility as separate approved phases. |

---

## 16. Product decisions confirmed by approval

The following decisions were confirmed by product-owner approval on 22 November 2026:

1. PPTX import creates new screens by default and never overwrites existing screens in the MVP.
2. Source formatting is the default import mode.
3. Slides are proportionally fitted to the Spectropy canvas while preserving relative layout.
4. Unsupported visible objects default to a picture fallback and are listed in the report.
5. PPTX animation conversion is not required for the core editable MVP; it enters the teaching-content phase through explicit mappings.
6. Exporting native editable PowerPoint objects is outside the initial scope.
7. Legacy `.ppt` files are outside the MVP unless a safe conversion service is separately approved.
8. Exact operational limits will be selected from Phase 0 measurements.
9. The original PPTX is not permanently retained unless storage and privacy policy approve it.
10. The supplied Trigonometry PPTX is a mandatory acceptance fixture.

---

## 17. Definition of done for the combined initiative

The combined initiative is complete for its approved release when:

1. Approved clipboard formats paste through the shared import engine.
2. Native Spectropy copying remains exact and regression-free.
3. The PPTX MVP imports approved content as separate editable elements.
4. Unsupported content follows the approved fallback and reporting policy.
5. Imported resources use valid Resource Library records and versions.
6. Imported content works with editor interactions, autosave, save/reload, undo/redo, Preview, and Presentation View.
7. Security and failure-path tests pass.
8. Performance satisfies the approved budgets.
9. All phase acceptance checklists are signed off or have documented approved exceptions.
10. User-facing limitations and supported formats are documented.

---

## 18. Reference standards and evidence

- W3C Clipboard API and Events: https://www.w3.org/TR/clipboard-apis/
- Microsoft Windows Clipboard Formats: https://learn.microsoft.com/en-us/windows/win32/dataxchg/clipboard-formats
- Microsoft Paste Special behavior: https://support.microsoft.com/en-us/word/paste-special
- Microsoft PowerPoint for the web clipboard behavior: https://support.microsoft.com/en-us/powerpoint/copy-and-paste-in-powerpoint-for-the-web
- Canva PowerPoint import behavior and limitations: https://www.canva.com/help/powerpoint-import/
- Electron clipboard capabilities, relevant only if a future desktop companion is approved: https://www.electronjs.org/docs/latest/api/clipboard

---

## 19. Review checklist

The reviewer should confirm:

- [x] The two product requirements are correctly stated.
- [x] Clipboard limitations and expected behavior are acceptable.
- [x] PPTX MVP content scope is acceptable.
- [x] Default fallback behavior is acceptable.
- [x] Phase order is acceptable.
- [x] Acceptance criteria are sufficient.
- [x] Proposed architecture may be used as the implementation boundary.
- [x] Decisions in Section 16 are approved.
- [x] This document is the controlling implementation reference.

**Approval outcome:** Approved for phased implementation on 22 November 2026.

