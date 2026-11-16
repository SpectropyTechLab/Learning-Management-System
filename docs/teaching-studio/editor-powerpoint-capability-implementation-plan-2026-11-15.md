# Teaching Studio PowerPoint-Capability Implementation Plan

**Date:** 15 November 2026
**Status:** Planning only — no application implementation is authorized by this document
**Source requirements:** `editor-requirements-2026-11-15.md`

## 1. Intended outcome

Build a reliable, discoverable teaching-content editor with approximately 50–60% of the PowerPoint-like authoring capabilities that are genuinely useful to Spectropy.

The target is not a cosmetic clone. The delivered editor must:

- make the canvas the primary workspace;
- organize commands through permanent and selection-driven contextual ribbon tabs;
- expose relevant controls automatically when an element is selected;
- retain compact left/right structural panels only where they improve the workflow;
- make every included feature function throughout authoring, saving, reload, preview, presentation and published playback;
- preserve existing capabilities and stored screens;
- verify each command individually instead of relying on a gallery that contains several names for the same behavior;
- support desktop, smartboard, tablet and intentionally supported mobile workflows;
- remain extensible as new teaching features are added.

## 2. Explicit scope boundaries

### Included

- Spectropy-relevant permanent ribbon tabs and contextual element tabs.
- Current requirements for crop, text, shapes, layers, grouping, 3D, zoom, animations and transitions.
- Existing editor capabilities that must be relocated into the new command structure.
- PowerPoint-like capabilities that materially improve teaching-screen authoring.
- Required frontend, backend validation, persistence, player and test changes.

### Excluded

- Vendor-specific integrations visible only incidentally in the reference images.
- Exact reproduction of proprietary visual assets or proprietary file-format internals.
- Desktop-only features that have no safe or useful browser equivalent, unless an approved Spectropy adaptation is defined.
- Teacher-view changes; this plan concerns the authoring editor and the playback surfaces affected by authored data.

## 3. Evidence-based current-state audit

### 3.1 Editor shell

- `TeachingStudioPage.tsx` currently owns a large amount of editor state and workflow logic: selected element, left/right panels, saving, revision conflict handling, clipboard, history, screens and presentation control.
- General tools are distributed through left and right icon rails and panels.
- `StudioElementToolbar.tsx` is a large horizontal selected-element toolbar containing text, fill, border, list, link, animation, crop, duplicate and delete controls.
- `BlankScreenCanvas.tsx` renders that toolbar as a movable overlay and owns canvas zoom gestures and status controls.
- Selection is currently centered on one `selectedElementId`; a proper multi-selection and group selection model is not yet present.

### 3.2 Element model and persistence

- `StudioElement` currently stores `type`, `content` and `position` largely as `Record<string, unknown>`.
- The backend preserves flexible JSON and validates element type, basic position, safe rich text, hyperlinks, resources, Zoom and Smart Diagram content.
- There is no explicit shared schema version for the complete editor document/element model.
- Rotation, grouping, visibility, crop transforms, animation configuration and future type-specific properties need documented typed schemas and compatibility normalization.

### 3.3 History and saving

- Element undo/redo currently records arrays of elements through `commitElements`.
- Drawings and screen settings have separate update paths.
- Autosave uses revision numbers and conflict handling and intentionally preserves element undo/redo history.
- A richer editor needs one transaction model covering elements, groups, layers, settings, animations and other authoring operations without turning every pointer movement into a history entry.

### 3.4 Animation and transition defect confirmed

The reported animation duplication is present in the implementation.

Examples from the current runtime mapping:

- Fade maps to the same keyframes as Appear.
- Wheel maps to Spin.
- Bold Flash maps to Pulse.
- Disappear maps to Fade Out.
- Custom Path maps to Line Path.

The transition catalog exposes many named transitions, while several currently reuse one generic animation:

- Reveal, Cover and Uncover reuse Wipe.
- Drape, Curtains, Window and Doors reuse Split.
- Wind, Pan and Conveyor reuse Fly In.
- Fall Over, Orbit, Ferris Wheel, Rotate and Cube reuse Grow Turn.
- Morph and Gallery reuse Zoom.

Some related effects may legitimately share low-level primitives, but they cannot be presented as separate effects unless their final visual behavior, direction, timing and state are observably correct and individually tested.

### 3.5 Test gap confirmed

- The backend test suite contains many source-inspection tests that assert strings or code patterns are present.
- The frontend package has build and lint scripts but no dedicated unit, component or browser end-to-end test script.
- Existing tests cannot prove that every animation looks distinct, Wipe directions work, crop handles behave correctly, keyboard focus is routed correctly or a ribbon command completes its end-to-end workflow.
- Visual and behavioral verification must therefore be built into the implementation, not deferred to informal manual checking.

## 4. Planning principles and mandatory analysis gate

No feature moves into implementation until its feature brief answers all of the following:

1. What user problem does it solve?
2. What related capability already exists?
3. Can the current capability be extended instead of duplicated?
4. Which element types and editing modes does it apply to?
5. What data must be stored, and is that data backward compatible?
6. How does it interact with selection, grouping, layers and coordinate transforms?
7. How does it interact with undo/redo and autosave?
8. How does it render in editor, preview, presentation and published playback?
9. What mouse, keyboard, touchpad, touch and smartboard interactions are required?
10. What accessibility behavior is required?
11. What existing behavior could regress?
12. What are its performance and security implications?
13. What are its advantages, disadvantages and simpler alternatives?
14. What automated and manual evidence will prove it works?

The feature proceeds only when the answers are recorded in the parity matrix and its dependencies are ready.

## 5. Target architecture

### 5.1 Versioned editor document model

Introduce typed, versioned editor contracts while retaining backward-compatible loading:

- `StudioDocumentSchemaVersion` at screen or element payload level.
- Typed element discriminated unions rather than relying only on arbitrary records.
- Common transform model: `x`, `y`, `width`, `height`, `rotation`, `zIndex`, `locked`, `hidden`.
- Media crop model: fit mode, scale, focal offset and crop window/mask.
- Group model: stable group ID, ordered child IDs and nested-transform policy.
- Animation model: stable effect ID, family, parameters, direction, start mode, duration, delay, repeat, colour/path and runtime visibility.
- Presentation properties separated from editor-only UI state.
- Normalizers that load legacy documents and supply safe defaults without destructively rewriting them.

Backend validation must explicitly validate newly supported properties, bounds and references while preserving unknown legacy-safe fields needed for compatibility.

### 5.2 Central command registry

Create one command model used by the ribbon, keyboard shortcuts, contextual toolbar, menus and properties panes.

Each command definition includes:

- stable command ID;
- label, icon and tooltip;
- permanent/contextual tab and group;
- supported selection types and editor modes;
- visible and enabled predicates;
- shortcut and accessibility metadata;
- execution handler;
- undo transaction policy;
- optional gallery, menu or properties-pane destination;
- analytics/test identifier.

This prevents separate buttons from implementing slightly different versions of the same operation.

### 5.3 Editor state separation

Split the current page-level responsibilities into focused state/services:

- document state and normalization;
- selection and editing-mode state;
- command state;
- history/transactions;
- persistence/autosave/conflict state;
- panel and ribbon UI state;
- presentation/preview state.

Use reducer/store-style deterministic transitions or an equivalent architecture. Avoid a second implementation path for preview/player behavior.

### 5.4 Unified renderer contract

The editor, preview, presentation window and published player must consume the same normalized element and animation contracts.

- Editor-only handles and overlays sit outside the content renderer.
- Playback timing and visual effects use a shared runtime.
- Backward clicker navigation reconstructs state without remounting the complete screen.
- Every persisted visual property has a renderer in all required surfaces.

### 5.5 Geometry and coordinate engine

Centralize coordinate conversion and transforms for:

- canvas zoom and fit;
- pointer-to-canvas mapping;
- move, resize and rotate;
- groups and child transforms;
- crop pan/scale/mask;
- snapping, alignment and guides;
- bounds constraints;
- toolbar placement.

This engine must be covered by pure unit tests before group, crop and rotation features depend on it.

## 6. Feature-parity inventory process

Create a command-level matrix before ribbon implementation. It is a living acceptance document, not a marketing checklist.

Required columns:

| Field | Purpose |
|---|---|
| Capability ID | Stable traceable identifier |
| Tab / group | Permanent or contextual location |
| Command | User-facing operation |
| User problem | Why Spectropy needs it |
| Current state | Complete, partial, defective, duplicated or missing |
| Required behavior | Exact interaction and result |
| Applicable elements | Text, image, shape, 3D, group, etc. |
| Data impact | Stored fields and schema version |
| Cross-feature impact | Layers, groups, animation, crop, zoom, etc. |
| Render surfaces | Editor, preview, presentation, published player |
| Input/accessibility | Mouse, keyboard, touch and assistive behavior |
| Risks/dependencies | Prerequisites and regression risk |
| Automated evidence | Unit/component/E2E/visual tests |
| Manual evidence | Devices, browsers and visual review |
| Priority/phase | Implementation order |
| Disposition | Direct, adapted, existing, deferred or not applicable |
| Approval | Product acceptance record |

### Priority classification

- **P0 — foundation/non-regression:** schemas, commands, history, renderer parity and tests.
- **P1 — reported workflow blockers:** crop, contextual controls, zoom, text formatting, layers, shapes, rotation, grouping, 3D controls and animation correctness.
- **P2 — core presentation workflow:** richer Insert/Design/Draw/Transitions/Animations/Present capabilities.
- **P3 — advanced relevant coverage:** charts/tables, expanded diagrams, recording, review/accessibility and approved export features.
- **Excluded:** unrelated vendor features and non-useful desktop-only functions.

## 7. Phased implementation workflow

Each phase finishes with its own acceptance gate. Later phases cannot mask failures from earlier phases.

### Phase 0 — baseline, inventory and reproducible evidence

**Work**

- Freeze a known local baseline commit and representative test data.
- Inventory every current editor button, panel, shortcut, element type and playback behavior.
- Build the initial feature-parity matrix.
- Record current workflows as browser tests before rearranging controls.
- Add representative screens containing text, image, video, shape, math, diagram, simulation, 3D, animations, transitions, groups when available and overlapping layers.
- Capture approved baseline screenshots at standard desktop, smartboard, tablet and mobile-supported widths.
- Record performance baselines: load time, interaction latency, autosave time and large-screen element count.

**Gate**

- Current capabilities are mapped and reproducible.
- Known defects are marked as expected failures instead of being hidden.
- No command is relocated without an identified destination.

### Phase 1 — testing and document foundations

**Work**

- Add frontend unit/component testing and browser E2E/visual regression infrastructure.
- Add typed versioned editor contracts and legacy normalizers.
- Add backend validation for new optional fields without breaking existing documents.
- Create a shared editor/playback fixture library.
- Establish compatibility tests for old saved screens and release manifests.

**Recommended verification layers**

- Pure TypeScript unit tests for normalization, geometry, commands and timelines.
- React component interaction tests for toolbar/ribbon/panes and focus.
- Browser E2E tests for real pointer, keyboard, wheel, touch emulation and fullscreen/presentation flows.
- Screenshot comparisons for animations, transitions, crop states, selection and responsive ribbons.
- Existing backend service/API tests for save, revision conflict and release behavior.

**Gate**

- Legacy screens load and save without visual change.
- New fields round-trip through backend persistence.
- Test failures produce actionable evidence, not only source-string assertions.

### Phase 2 — command system and adaptive ribbon shell

**Work**

- Implement the command registry and shared command execution path.
- Add permanent tabs initially populated only with existing, verified commands.
- Add contextual tabs driven by selection type and editing mode.
- Keep the current controls available behind a temporary compatibility flag until their ribbon equivalents pass tests.
- Implement galleries, grouped controls, More overflow, tooltips, keyboard navigation and responsive collapse.
- Retain compact quick-access actions for save status, undo/redo, preview and presentation.
- Reserve the left side for screen/script/animation structure and the right side for advanced properties/layers.
- Treat side panels as migration scaffolding, not the final interaction model: move editing controls into ribbon groups, galleries and dismissible ribbon flyouts, then remove the corresponding permanent rail entry after acceptance.
- Launch the few necessary structural views, including screen thumbnails, scripts and Layers, from ribbon commands; they must be on demand and must not permanently consume canvas width.

**Gate**

- Every existing command has one canonical implementation and at least one reachable UI location.
- Selection reliably activates the correct contextual tab.
- Ribbon changes do not cover the canvas or break left/right panel fitting.
- Desktop, smartboard and tablet layouts pass interaction and screenshot tests.

### Phase 3 — unified selection, layers, history and grouping

**Work**

- Replace single-ID assumptions with a selection set plus primary selection.
- Implement modifier selection and selection marquee.
- Build the dedicated Layers panel with select, rename, show/hide, lock, reorder and group hierarchy.
- Separate authoring visibility, initial runtime visibility and animation visibility.
- Implement group/ungroup using stable group identities and transform math.
- Introduce transaction-based history across elements, layers, groups, screen settings and animations.
- Coalesce drag/resize/rotate/crop pointer movement into one undo transaction per completed gesture.

**Gate**

- Layer order matches canvas and player order.
- Hidden is reversible and never deletes content.
- Groups survive save/reload and ungroup without visual drift.
- Undo/redo and autosave work across all new operations.

### Phase 4 — direct manipulation and element contextual tabs

#### 4A. Image/media crop

- Implement in-place crop mode on the selected media element.
- Keep the container fixed while the media pans and scales beneath its mask.
- Provide direct handles, focal positioning, fit/fill, reset, confirm and cancel.
- Store a non-destructive crop transform.
- Verify image, GIF and supported video behavior separately.

#### 4B. Text

- Move appropriate formatting into the Text contextual tab.
- Ensure selection-level font size, family, colour, style, paragraph spacing, alignment, lists, indentation and links operate on the actual text range.
- Route shortcuts by focus/editing context so editor commands do not steal text commands.
- Verify paste sanitization and mixed formatting.

#### 4C. Shapes and geometry

- Expand and categorize the shape gallery.
- Use clean lightweight preview and default outlines.
- Support eight resize handles, free rotation, exact size/position, fill, outline and effects.
- Add align/distribute, arrange and snapping using the shared geometry engine.
- Add shape-specific adjustment handles only after base resize/rotation is stable.

#### 4D. 3D

- Move 3D-specific commands into the 3D contextual tab.
- Keep compact playback/model interaction controls inside the element.
- Separate element move/resize from model orbit/pan/zoom.
- Verify variants, embedded animation selection, playback speed, reset view and presentation parity.

#### 4E. Canvas zoom and input

- Keep normal wheel scrolling separate from intentional canvas zoom.
- Support `Ctrl/Cmd + wheel` without simultaneous browser zoom when the canvas owns the gesture.
- Support touchpad and pinch behavior deliberately.
- Scale the canonical canvas, elements, selection UI and overlays consistently.
- Preserve focus point where practical and implement real Fit Slide/Fit Selection behaviors.

**Gate**

- Each element family passes its own complete edit→save→reload→preview→present→publish scenario.
- Direct manipulation remains compatible with selection, groups, layers, zoom and undo/redo.
- Double-click text editing and component dragging remain intact.

### Phase 5 — animation and transition engine correction

This phase must replace catalogue-driven assumptions with effect-by-effect contracts.

#### 5A. Animation effect specification

For every exposed effect define:

- family: entrance, emphasis, exit or motion;
- initial and final visibility;
- transform, opacity, clip/mask, filter and colour behavior;
- supported directions and effect options;
- duration, delay, repeat and easing behavior;
- forward and backward clicker state;
- reduced-motion fallback;
- text-by-paragraph/word/letter behavior where supported;
- compatibility with rotated, cropped and grouped elements.

#### 5B. Current animation audit list

Individually verify all currently exposed effects:

- Entrance: Appear, Fade, Fly In, Wipe, Zoom, Float In, Split, Wheel, Random Bars and Grow & Turn.
- Emphasis: Pulse, Spin, Grow, Bounce, Teeter, Flash, Wave, Colour Pulse, Bold Flash and Underline.
- Exit: Fade Out, Fly Out, Zoom Out, Wipe Out, Float Out, Split Out, Disappear and Sink.
- Motion: Line, Arc, Turn, Circle, Loop, Zigzag and Custom Path.

An effect may remain only when it has distinct, correct behavior or is deliberately consolidated and renamed with product approval. Do not retain duplicate names solely to increase the catalogue count.

#### 5C. Required corrections

- Add user-selected Colour Pulse colour and persist it per effect instance.
- Correct Wipe entrance/exit directions.
- Implement a real custom motion-path data model and editor, or mark Custom Path unavailable until it exists; never map it silently to Line.
- Build a deterministic timeline for On Click, With Previous and After Previous.
- Preserve per-element state when going backward without remounting the whole screen.
- Open the coherent animation/layer visibility workflow when applying an effect.

#### 5D. Transition audit

- Audit every currently exposed transition and its directions/effect options.
- Remove or consolidate misleading duplicates until a distinct implementation exists.
- Verify sound, duration, apply-to-all, manual advance and timed advance independently.
- Keep transition transforms outside the canonical canvas fit transform.

**Gate**

- Every visible effect has an automated timeline test and visual evidence.
- A reviewer can compare a reference matrix and see that similarly named effects are meaningfully distinct.
- Forward and backward clicker playback pass without full-screen rerender flicker.
- Editor preview, audience presentation and published playback match.

### Phase 6 — relevant permanent-tab capability expansion

Add capabilities only after the shared foundations and P1 blockers are stable.

#### Home

- Clipboard, duplicate, format painter where useful, text/paragraph basics, arrange, selection and editing commands.

#### Insert

- Text, shapes, resources/media, icons/graphics, 3D, diagrams, equations, links, tables and charts in approved increments.
- Each new element type requires schema, renderer, contextual tab, layers, grouping, undo and playback support.

#### Draw

- Existing pen/eraser tools consolidated into the ribbon.
- Improve ink types, stroke settings, replay and approved ink conversion only when reliable.

#### Design/Layout

- Screen size/aspect ratio policy, background, guides, themes and reusable style tokens.
- Theme application must be non-destructive and undoable.

#### Present

- Current-screen/start presentation, external-screen selection, presenter controls, clicker support and custom sequence where approved.
- Browser capability limitations must have clear fallback behavior.

#### Review/Accessibility

- Alt text, reading/layer order, contrast warnings and validation first.
- Comments, language and spelling only when their data/collaboration workflow is defined.

**Gate**

- Each increment passes the same end-to-end definition of done; no bulk gallery of partially implemented commands is accepted.

### Phase 7 — responsive, accessibility and performance hardening

**Work**

- Validate ribbon overflow and contextual tabs across target widths.
- Validate smartboard and touch target sizes.
- Complete keyboard traversal, visible focus, screen-reader names and shortcut help.
- Test reduced-motion and high-contrast behavior.
- Profile large screens, complex rich text, many layers, animations and 3D resources.
- Avoid rerendering the complete canvas for selection, layer visibility or animation-step changes.

**Gate**

- Supported-device matrix passes.
- No critical accessibility violations.
- Interaction and playback performance stay within approved baseline thresholds.

### Phase 8 — migration, rollout and production protection

**Work**

- Keep legacy screen loading for at least the agreed migration window.
- Add feature flags for the new ribbon and new animation runtime.
- Run both old/new rendering comparisons on representative documents during development.
- Release internally, then to selected authors, then broadly.
- Capture telemetry for command failures, save conflicts, runtime errors and performance regressions without recording private authored content.
- Keep a tested rollback path that does not require reverting stored documents.

**Gate**

- Migration audit shows no content loss.
- Production smoke suite passes against the deployed build.
- Rollback and feature-flag procedures are verified.

## 8. End-to-end acceptance scenarios

Every included feature must participate in relevant scenarios below.

1. Create an element from Insert and see the correct contextual tab.
2. Edit it through ribbon, direct manipulation, keyboard and properties pane where applicable.
3. Select overlapping elements through Layers; hide, lock and reorder them.
4. Multi-select, align, group, resize, rotate, move, save, reload and ungroup.
5. Crop media within a fixed container, save/reload and verify identical playback.
6. Apply multiple animations with different start modes, directions, colours and timing.
7. Move forward and backward with keyboard and physical clicker without full-canvas flicker.
8. Undo and redo each meaningful command before and after autosave.
9. Open both structural panels and confirm the canvas fits without hidden content.
10. Zoom by controls, keyboard/mouse gesture and touchpad without browser-zoom conflict.
11. Preview, present on one screen, present on an external display and publish.
12. Reload the published session and compare editor, preview and audience output.
13. Repeat critical workflows with mouse, keyboard, smartboard touch and tablet touch.
14. Load a legacy screen created before the new schema and confirm it remains visually stable.

## 9. Definition of done for one feature

A feature is complete only when all applicable items are satisfied:

- User problem and expected behavior documented.
- Existing implementation and conflicts audited.
- UI location and contextual visibility approved.
- Data schema and migration/default behavior defined.
- Backend validation and authorization covered.
- One canonical command/action implementation used by all UI entry points.
- Undo/redo and autosave transaction behavior verified.
- Editor, preview, presentation and published playback verified.
- Mouse, keyboard, touchpad and touch behavior verified.
- Accessibility behavior verified.
- Unit, component, E2E and visual tests added as applicable.
- Negative/error cases tested.
- Performance impact measured.
- Existing regression suite remains green.
- Manual visual review evidence attached.
- Product acceptance recorded in the feature-parity matrix.

Merely displaying a button, saving a field or mapping a new name to an old animation does not satisfy completion.

## 10. Risks, advantages and trade-offs

| Area | Advantage | Risk/disadvantage | Mitigation |
|---|---|---|---|
| Adaptive ribbon | Discoverable and scalable commands | Can become tall and crowded | Progressive disclosure, grouped controls and responsive overflow |
| Command registry | One behavior across UI/shortcuts | Upfront refactor cost | Migrate existing commands incrementally behind compatibility flag |
| Typed/versioned model | Safer persistence and future changes | Migration complexity | Legacy normalizers and round-trip fixtures |
| Unified transactions | Reliable undo/redo | Requires redesign of current element-only history | Implement before grouping/crop/advanced animation |
| PowerPoint-like coverage | Familiar workflow | Large scope and false parity expectations | Relevance-based 50–60% matrix and phased acceptance |
| Rich animation catalogue | Better teaching presentations | Visual defects, performance and duplicate effects | Effect contracts, visual regression and consolidation |
| Browser presentation features | Strong classroom workflow | Browser/device capability differences | Capability detection and explicit fallbacks |
| Full responsive support | Smartboard/tablet usability | Small screens cannot display desktop ribbon unchanged | Adaptive groups and intentionally limited mobile authoring modes |

## 11. Recommended implementation order

The safest sequence is:

1. Baseline and feature matrix.
2. Real test infrastructure.
3. Versioned model and normalization.
4. Command registry and transaction history.
5. Adaptive ribbon with existing commands only.
6. Selection, Layers and grouping foundations.
7. Crop, text, shapes, rotation, 3D and zoom corrections.
8. Animation/transition rebuild and visual verification.
9. Additional relevant permanent-tab capabilities.
10. Responsive/accessibility/performance hardening.
11. Staged migration and production rollout.

Starting with a large visual ribbon containing many incomplete buttons would repeat the current problem. Foundations and verification must precede catalogue expansion.

## 12. Planning outputs required before coding approval

- Completed current-command inventory.
- Prioritized feature-parity matrix containing only Spectropy-relevant presentation capabilities.
- Approved ribbon information architecture and responsive wireframes.
- Versioned editor schema proposal and legacy compatibility examples.
- Command registry and transaction-history design.
- Animation and transition behavior specifications with unique visual references.
- Automated test strategy and supported-device/browser matrix.
- Phase estimates and ownership after the technical design is reviewed.
- Go/no-go checklist for Phase 1 implementation.

Only after these outputs are reviewed should implementation begin.

## 13. Implementation progress

### Slice 1 — started 15 November 2026

Completed locally:

- Added an adaptive ribbon shell with permanent Home, Insert, Design, Animations, Present and Review tabs.
- Added selection-driven contextual tab resolution for text, picture/media, shape, diagram, 3D, simulation, group and drawing contexts.
- Contextual tabs automatically activate when a matching element is selected.
- Routed the first set of ribbon commands to existing canonical editor actions rather than creating placeholder behavior.
- Migrated editing tools into dismissible ribbon flyouts: Layers, layouts, resources, element properties, equations, shapes, diagrams, animations, transitions, drawing and Zoom.
- Restored Screens/reorder and Screen Script as the only on-demand left-side panes, matching the requested PowerPoint slide-navigation workflow. They reserve canvas width only while open.
- Removed permanent editing-tool rail occupancy from the active editor layout so the canvas uses the reclaimed width.
- Element selection now activates its contextual ribbon without forcing the old right inspector open.
- Removed the separate visible context header and consolidated editor context, curriculum, Session/Screen navigation, save/history, Screen actions, view and publication controls into grouped Home-ribbon sections.
- Moved the selected-element formatting controls into grouped Home sections (Font, Paragraph, Drawing and Editing); they no longer float over or obscure the slide and are not mislabeled as Shape Format.
- Shape Format now exposes shape-specific entry points for changing the shape, properties, Layers, animation, duplication and deletion.
- Added a ribbon-native Layers workflow with select, rename, hide/show, lock/unlock and front/back ordering.
- Layer visibility is respected by editor, preview and published playback; locked elements remain selectable but cannot be moved or resized.
- Added pure behavioral tests for ribbon context resolution and contextual activation.
- Confirmed and began correcting duplicated animation implementations:
  - Fade is distinct from Appear;
  - Wheel is distinct from Spin;
  - Bold Flash is distinct from Pulse;
  - Disappear is distinct from Fade Out;
  - Wipe direction variables are applied;
  - Colour Pulse stores and renders the selected colour.
- Removed Custom Path from new authoring choices until a real custom-path editor and data model exist; legacy documents retain a named compatibility runtime.
- Visually verified the adaptive ribbon and automatic Shape Format activation in the running local editor at a narrow desktop viewport.
- Added Ctrl/Shift multi-selection and persistent Group/Ungroup membership in element position data.
- Grouped elements move and resize together through the canonical element transaction path.
- Added a direct rotation handle; rotation persists in Screen data and is rendered in editor, preview and published playback without replacing animation transforms.
- Added direct in-container media crop manipulation: authors enter Crop on the selected media, drag to reposition, use Ctrl/Cmd + wheel to zoom, and commit once with Done without changing the container geometry.

Not yet complete:

- Responsive ribbon overflow/collapse refinement beyond the current single-row horizontal overflow behavior.
- Typed/versioned element schema and unified transaction history.
- Marquee selection, mixed-selection property editing and nested group hierarchy; modifier-key multi-selection and first-level grouping are complete.
- Complete shape catalogue/geometry, 3D and zoom work; direct media crop and free rotation foundations are complete.
- Effect-by-effect visual acceptance for the complete animation and transition catalog.
- Remaining permanent and contextual ribbon capability coverage.
- Deletion of dormant legacy rail markup after the ribbon replacements complete regression and accessibility acceptance.
