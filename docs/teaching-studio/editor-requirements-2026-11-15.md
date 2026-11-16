# Teaching Studio Editor Requirements — 15 November 2026

## Status and scope

- This document is the single collection point for today's Screen Editor requirements.
- These requirements are for local implementation and verification first.
- No production implementation, push, pull request, or deployment is authorized by this document.
- Requirements may be extended or refined before implementation planning begins.
- The features must be designed as connected editor capabilities, not isolated patches.

## 1. Screen Editor and media controls

### 1.1 Direct, in-place image cropping

- Cropping must happen directly on the image at its location on the canvas.
- Do not require the author to operate crop controls in a distant toolbar or panel.
- When an image is inside a box or container, cropping must not change the container dimensions.
- The author must be able to:
  - reposition/pan the image inside the container;
  - scale the image inside the container;
  - adjust the visible area using direct drag handles;
  - confirm or cancel the crop operation;
  - reset the crop when required.
- The intended interaction should feel comparable to PowerPoint or Canva: select the image, enter crop mode, and manipulate the visible region in place.
- Crop state must persist through autosave, reload, undo/redo, screen zoom, preview, grouping and ungrouping.

### 1.2 Compact contextual toolbar

- The contextual toolbar must appear only when an element is selected or actively being edited.
- It must be substantially smaller than the current toolbar shown in the reference screenshot.
- It must show only the controls relevant to the selected element and current editing context.
- It must not cover the selected element or obstruct the main canvas content by default.
- Default placement should choose a safe location beside, above or below the selected element based on available canvas space.
- The author may drag the toolbar within a defined safe editor area.
- The toolbar must remain within the editor viewport and must not cover permanent editor controls.
- Dragging, expanding or interacting with the toolbar must not accidentally move, resize or deselect the canvas element.

### 1.3 3D controls placement and interaction

- 3D controls must be contained within the selected 3D element's boundaries.
- Controls must remain visually compact and must not overflow onto unrelated canvas content.
- Control interaction must not trigger element dragging, resizing or deselection.
- Element selection, model rotation, pan, zoom, animation playback, label placement and element resizing must have clearly separated interaction modes.
- Controls must scale or adapt when the 3D element is small.

### 1.4 Canvas zoom and input conflict prevention

- Repair the editor canvas zoom-in and zoom-out operations.
- The existing bottom `+` and `−` controls must continue to work reliably.
- Mouse-wheel and touchpad zoom must affect the canvas only, not the browser page zoom.
- The implementation must prevent browser zoom and canvas zoom from happening simultaneously.
- Normal page scrolling must remain available when the user is not intentionally zooming the canvas.
- The final shortcut and gesture behavior must be explicit and consistent across mouse, touchpad and supported touch devices.
- Zooming must scale the complete canvas composition together, including elements, selections, handles, crop overlays, animation overlays and groups.

## 2. Text, shapes and contextual controls

### 2.1 Text-editing keyboard shortcuts

- Font and text-formatting shortcuts must work while the author is editing text.
- Text-editing shortcuts must act on the current selection or caret context.
- They must not trigger editor-wide commands while a text field or text element is actively being edited.
- Editor-wide shortcuts must continue to work when text editing is not active.

### 2.2 Distinct colour controls

- The contextual toolbar must visually distinguish:
  - element fill colour;
  - text/font colour;
  - border/stroke colour.
- Each colour action must have its own recognizable icon or visual indicator.
- The active/current colour must be visible without opening the picker.
- Controls that do not apply to the selected element type must be hidden or disabled with a clear reason.

### 2.3 Dedicated Layers section

- Layers must have their own right-side tool section and must not be combined with Elements.
- This is not merely a dropdown for selecting one component.
- The Layers section should follow the working concepts of Canva's Layers panel and PowerPoint's Selection Pane.
- It must list every element on the current screen in stacking order.
- Required layer operations include:
  - select an element from the layer list;
  - show or hide each element independently;
  - edit or work on one visible layer without interference from overlapping layers;
  - reorder layers forward/backward and through drag-and-drop stacking order;
  - identify the currently selected layer;
  - distinguish hidden, locked, grouped and animated states;
  - support meaningful layer names or element labels;
  - expose group hierarchy when grouping is implemented.
- Hiding a layer must be reversible and must not delete the element.
- Authoring visibility must be clearly separated from any animation-driven runtime visibility.
- Layer changes must participate in persistence and undo/redo where appropriate.

### 2.4 Shapes library and shape behavior

- Redesign the Shapes section; the current thick outlines and limited collection are insufficient.
- Shape previews and created shapes must use clean, lightweight outlines by default.
- Use PowerPoint's categorized Shapes gallery as a reference for both organization and interaction patterns.
- The future library should support useful categories such as:
  - basic shapes;
  - lines and connectors;
  - arrows;
  - flowchart shapes;
  - callouts;
  - stars and banners;
  - equation-related shapes;
  - action or navigation shapes where relevant to teaching content.
- Shape implementation must cover behavior, not only additional icons.
- A selected shape must support resize handles on all four sides and all four corners.
- Resizing from any handle must behave consistently and preserve the expected opposite anchor.
- Modifier-assisted aspect-ratio and center-based resizing should be considered during detailed interaction planning.
- Shapes must support fill, border colour, border thickness and applicable shape-specific adjustments.

### 2.5 Shape rotation

- Add a visible rotation handle/control for selected shapes.
- Authors must be able to rotate shapes freely through direct manipulation.
- Rotation must be persisted in screen data and respected in editor rendering, preview, presentation and published playback.
- Rotation must coexist with resizing, grouping, canvas zoom, snapping/alignment, animations, undo/redo and touch input.

## 3. Animation improvements

### 3.1 Colour Pulse customization

- Colour Pulse already exists and must not be duplicated as another effect.
- Add a colour selector to the existing Colour Pulse animation.
- The selected pulse colour must be stored with that animation instance.
- Preview, run, presentation and published playback must use the selected colour consistently.

### 3.2 Wipe direction correction

- Correct Wipe so each supported direction produces a visibly correct directional reveal or exit.
- Direction behavior must be consistent between editor preview, animation run, presentation mode and published playback.
- Forward and reverse clicker playback must preserve the correct direction and state.

### 3.3 Layer visibility after applying animation

- After an animation is applied, open the left-side layer-visibility panel.
- The panel must list individual screen elements/layers.
- It must allow the author to show or hide each element independently while arranging the animation sequence.
- Layer visibility must not delete elements.
- It must work with animation authoring, animation preview and playback sequencing.
- The detailed plan must distinguish:
  - authoring visibility used to simplify editing;
  - initial runtime visibility;
  - visibility changes caused by entrance, emphasis and exit animations.
- This left-side animation visibility workflow and the dedicated right-side Layers section must use one coherent layer model rather than separate incompatible implementations.

## 4. Multi-selection, grouping and ungrouping

### 4.1 Multi-selection

- Support selecting multiple elements through suitable modifier-key interaction.
- Consider a selection marquee for selecting several elements spatially.
- Multi-selection must give clear visual feedback for individual members and the collective bounds.
- Selection behavior must work with overlapping elements and the Layers section.

### 4.2 Grouping

- Add a Group command for the current multi-selection.
- Grouped elements must move together.
- Grouped elements must resize together while preserving their relative positions and proportions.
- Grouped elements must support appropriate collective rotation and layer ordering.
- The group must appear as a hierarchy in the Layers section.
- Group identity and membership must be persisted in screen data.

### 4.3 Ungrouping

- Add an Ungroup command.
- Ungrouping must restore individual element selection and editing without changing the visual composition.
- The resulting individual coordinates, sizes and rotations must remain correct after group transformations.

### 4.4 Cross-feature compatibility

- Grouping and multi-selection must coexist with:
  - image cropping;
  - shape rotation and resizing;
  - layers and visibility;
  - animations and their timeline/order;
  - undo and redo;
  - autosave and conflict handling;
  - editor canvas zoom;
  - preview, presentation and published playback;
  - mouse, touchpad and touch interactions.

## 5. Major canvas and adaptive editor-shell enhancement

### 5.1 Purpose

- Reorganize the existing and future editor capabilities into a scalable, discoverable interface inspired by PowerPoint's command arrangement.
- This requirement concerns command placement, discoverability and interaction flow; it does not authorize removing existing functionality or blindly copying PowerPoint's complete feature set.
- The canvas must remain the visual priority. Permanent controls, open panels and contextual tools must not unnecessarily cover or reduce the usable screen.
- A beginner should be able to select an element and immediately understand which operations apply to it without searching through unrelated static tools.

### 5.2 PowerPoint interaction principles to adopt

Microsoft's documented PowerPoint behavior provides the following useful principles:

- the ribbon uses stable tabs to group broad categories of commands;
- related commands are organized into named groups within a tab;
- selecting an object such as a picture, shape or text box temporarily exposes the corresponding contextual Format tab;
- contextual tabs are visible only while the matching object type is selected, conserving ribbon space;
- galleries show common choices first and expose the full collection through a More action;
- the Selection Pane lists objects in stacking order and supports selection, multi-selection, show/hide, reorder, rename, lock and group-related workflows;
- detailed properties that do not need to remain in the ribbon can be edited in a task pane such as Format Shape;
- a command search provides another discovery path for commands that users cannot immediately locate.

Reference material:

- [PowerPoint ribbon tabs and contextual tabs](https://support.microsoft.com/en-gb/powerpoint/where-are-the-menus-and-toolbars)
- [Office ribbon tabs, groups and customization](https://support.microsoft.com/en-us/office/foundations-experiences/customize-the-ribbon-in-office)
- [PowerPoint Selection Pane behavior](https://support.microsoft.com/en-gb/powerpoint/use-the-selection-pane-to-manage-objects-in-documents)
- [PowerPoint object selection and contextual Format tabs](https://support.microsoft.com/en-gb/powerpoint/select-individual-objects-on-a-slide)

### 5.3 Proposed editor command hierarchy

The future editor should use four complementary command surfaces with clearly separated responsibilities:

1. **Top ribbon — primary command surface**
   - Houses editor-wide and selected-element commands in organized tabs and groups.
   - Replaces the need to permanently distribute general editing tools across both sides of the canvas.
2. **Left navigation/structure area**
   - Reserved for screen-level navigation and authoring structure, such as screen thumbnails/reordering, screen script and animation-authoring visibility when required.
   - Must not become another permanent collection of unrelated formatting commands.
3. **Right contextual properties area**
   - Opens on demand for advanced or detailed properties that cannot fit cleanly in the ribbon.
   - Includes the dedicated Layers section and type-specific inspectors where appropriate.
   - Must be collapsible and must use the established canvas-fit behavior rather than hiding content under the panel.
4. **Compact floating contextual toolbar**
   - Contains only a very small set of high-frequency actions for the active selection.
   - It is a convenience surface, not a duplicate of the complete ribbon.
   - Its safe placement and movable behavior remain governed by section 1.2.

### 5.3.1 Final panel-migration requirement

- The ribbon must become the real editing surface, not merely a navigation mechanism that opens the same permanent side panels.
- Existing left/right editing controls must be migrated into appropriate ribbon groups, galleries, dropdowns and temporary ribbon flyouts.
- Permanent control rails and inspectors must be removed after their ribbon replacements are complete and verified.
- Temporary flyouts may open from the ribbon for complex galleries or detailed settings, but they must close without permanently reserving canvas width.
- Screen navigation, scripts and Layers may use on-demand structural views when their information cannot fit meaningfully into a command row; these views must be launched from the ribbon and remain dismissible.
- During migration, legacy side controls may remain behind a compatibility path only until the equivalent ribbon workflow passes functional and regression acceptance.
- A command is considered migrated only when authors can complete its full workflow from the ribbon without using the old side rail.

### 5.4 Stable ribbon tabs

- Maintain a small set of stable, task-oriented tabs instead of one long row of all available controls.
- Candidate tab structure for detailed design validation:
  - **Home** — selection, clipboard/duplicate, text basics, arrange and common actions;
  - **Insert** — text, shapes, media, resources, equations, simulations, 3D and other elements;
  - **Layout/Design** — screen layout, background, guides, alignment and screen-level appearance;
  - **Animations** — animation selection, configuration, order and preview;
  - **Present** — preview, presentation/display and playback-related commands;
  - **Review/Publish** — validation, submission and publication state where appropriate.
- The final labels and grouping must reflect Spectropy's teaching workflow rather than copying PowerPoint terminology unnecessarily.
- Undo, redo, save/autosave status, preview and other essential global actions may remain persistently reachable in a compact quick-access area.

### 5.5 Selection-driven contextual tabs

- Selecting an element must immediately reveal and preferably activate the relevant contextual tab.
- The contextual tab must disappear or become inactive when no compatible element is selected.
- It must contain only commands that are valid for the current selection and editing mode.
- Required contextual families include, at minimum:
  - **Text** — font, size, emphasis, colour, paragraph, bullets/numbering, alignment and text-box behavior;
  - **Image/Media** — replace, fit/fill, direct crop, transparency, border, media playback and applicable accessibility metadata;
  - **Shape** — shape type, fill, stroke, effects, resize behavior, rotation and arrange;
  - **3D** — model view, camera/orientation, lighting, animation/playback and the in-element controls defined in section 1.3;
  - **Simulation/Embedded object** — source/configuration, interaction, sizing, preview and sandbox/runtime-related settings;
  - **Group/Multi-selection** — group/ungroup, align, distribute, arrange, collective size and rotation;
  - **Drawing/Whiteboard** — pen, eraser, stroke and relevant drawing operations;
  - additional contextual types such as tables, equations or charts when those capabilities exist.
- A mixed multi-selection must expose only commands that are valid for all selected elements, plus collective arrange/group operations.
- Entering text edit mode, crop mode or 3D interaction mode must refine the available controls without losing the selected element unexpectedly.

### 5.6 Progressive disclosure and advanced properties

- Show common actions directly; place secondary choices in dropdowns or galleries; place advanced configuration in a contextual properties pane or dialog.
- A visible **More** affordance should expose additional commands without expanding the ribbon indefinitely.
- Opening an advanced pane must preserve the selection and provide a clear relationship between the pane and the active element.
- The same command must not appear simultaneously in several prominent locations unless there is a deliberate high-frequency shortcut.
- Controls must have consistent icons, concise labels where space permits and tooltips describing their action and shortcut.
- Disabled controls must communicate why they are unavailable instead of appearing broken.

### 5.7 Responsive web behavior

- The ribbon must be designed as a web-native adaptive command surface, not a fixed desktop-width clone.
- At narrower widths, command groups should collapse progressively into labeled menus or a More overflow without losing functionality.
- Horizontal scrolling may be used only as a controlled fallback and must not hide critical actions without an indicator.
- Touch targets must remain usable on smartboards, tablets and mobile-supported editor views.
- Keyboard navigation, visible focus, tooltips and accessible names are required.
- Ribbon state, open panes and floating tools must not interfere with canvas zoom, pointer coordinates, drag/resize/crop operations or browser gestures.

### 5.8 Extensible command model

- Implement the later redesign around a centralized command registry or equivalent configuration-driven model rather than scattering hard-coded buttons across components.
- Each command should define its label, icon, applicable element types/modes, enabled state, shortcut, ribbon group and optional overflow/pane destination.
- Selection state should determine which contextual command set is visible.
- This model must allow future element types and features to register commands without another full editor-shell redesign.
- Commands triggered from the ribbon, floating toolbar, keyboard shortcut or properties pane must use the same underlying action and undo/redo transaction.

### 5.9 Canvas-space and compatibility requirements

- Reorganization must preserve the goal of keeping the main canvas as the dominant portion of the window.
- Ribbon height must be compact and predictable; opening contextual tools must not cover the upper edge of the slide.
- Left and right panels must remain independently openable and the canvas must fit between them as already required.
- Existing element editing, drag/drop, double-click text editing, resize handles, crop, layers, animations, preview, presentation, autosave and undo/redo must continue to work after controls are relocated.
- The first migration phase should relocate and consolidate existing commands before adding unrelated new capabilities.
- Before implementation, the current command inventory must be mapped to its proposed permanent tab, contextual tab, floating shortcut or advanced pane so that no functionality is lost.

### 5.10 Scope clarification: ribbon behavior plus functional coverage

- The requested target is not limited to making the editor visually resemble PowerPoint.
- The target includes both:
  - a PowerPoint-style permanent and contextual ribbon architecture; and
  - working functional equivalents for the applicable commands inside those ribbon sections.
- Permanent ribbon tabs remain available regardless of the selected element.
- Contextual ribbon tabs appear automatically when a compatible element is selected and disappear when that selection no longer applies.
- Selecting a shape, graphic, image, 3D model, grouped object, text element or other supported component must expose the controls relevant to that component without requiring the author to search elsewhere.
- A ribbon button must not be added as a visual placeholder. Every exposed command must have defined behavior, supported selection types, persistence rules, undo/redo behavior, keyboard/touch behavior and editor/preview/presentation consistency.
- The long-term feature target is broad PowerPoint-like authoring coverage, including small supporting commands and not only the most visible headline features.
- Exact one-to-one cloning is not assumed where a desktop-only or vendor-specific command has no meaningful equivalent in Spectropy. Each reference command must be classified as:
  - required direct equivalent;
  - required Spectropy-adapted equivalent;
  - already supported and only needing relocation;
  - planned but dependent on another subsystem;
  - not applicable, with a documented reason and approval.
- No reference feature may be silently skipped during planning. Any exclusion or adaptation must be visible in the feature-parity matrix and approved before implementation.

### 5.11 Permanent ribbon sections represented by the references

The supplied references establish the following permanent command families as the requested audit baseline:

- **File** — document/session lifecycle, import/export and related screen/session operations appropriate to a web application;
- **Home** — clipboard, screen creation/layout, font, paragraph, drawing, arrange, editing and frequently used actions;
- **Insert** — screens, tables, pictures/media, screenshots where browser permissions allow, shapes, icons/graphics, 3D models, diagrams, charts, links, comments, text boxes, headers/footers where applicable, equations, symbols, video and audio;
- **Draw** — pointer/selection, pens, highlighters, erasers, configurable ink, ruler/stencils, ink conversion and replay where supported;
- **Design** — reusable themes, variants, colours, fonts, effects, background styles, layouts and screen dimensions/aspect ratio;
- **Transitions** — transition gallery, effect options, sound where supported, duration, apply-to-all and automatic/manual advance settings;
- **Animations** — preview, animation gallery, effect options, add animation, animation pane/timeline, trigger, animation painter/copy, start mode, duration, delay and reorder;
- **Slide Show/Present** — start presentation, current-screen presentation, custom presentation sequence, presentation setup, hide screen, rehearsal/recording, media controls, monitor selection and presenter-view behavior adapted for the browser and Screen Placement API capabilities;
- **Record** — recording, screenshot/screen recording where browser permissions allow, video/audio capture and supported export workflows;
- **Review** — spelling, language, accessibility, comments, collaboration/revision-related capabilities supported by the product;
- **View** — editor views, screen/thumbnail navigation, rulers, gridlines, guides, notes/script visibility, zoom/fit and window/layout controls applicable to a single-page web editor;
- **Help/Search** — searchable commands, shortcuts and task guidance;
- **domain-specific authoring** — Spectropy equation, scientific notation, teaching, simulation and assessment tools take the place of vendor-specific extensions where appropriate.

The detailed plan must inventory every visible group and command within these families, compare it with current Spectropy behavior and define its disposition before coding begins.

### 5.12 Contextual ribbon sections represented by the references

- **Shape Format** must cover shape insertion/change, text inside shapes, style gallery, fill, outline, effects, text/WordArt-like styling where appropriate, accessibility metadata, arrange, selection/layers, align, group, rotate and exact size.
- **Graphics Format** must cover graphic replacement/conversion where supported, style gallery, fill, outline, effects, accessibility metadata, arrange, selection/layers, align, group, rotate, crop and exact dimensions.
- **Image/Picture Format** must be included in the full audit even when not separately shown in the supplied references; it must connect to the direct in-place cropping requirements in section 1.1.
- **3D Model** must cover model replacement/reset, predefined views, accessibility metadata, arrange, selection/layers, align, group where valid, pan/zoom and exact dimensions, while preserving direct model interaction.
- **Diagram/SmartArt-equivalent Design and Format** must cover structure editing, add/remove/promote/demote nodes, text pane, direction, layout, colour, style, reset and conversion using Spectropy's supported diagram model rather than depending on Microsoft's proprietary SmartArt implementation.
- **Table, chart, equation, audio, video and other contextual tabs** must be included when those element types are selected, even if every one was not captured in the submitted screenshots.
- More than one contextual tab may be relevant to a selected element, but the interface must activate the most useful tab without unexpectedly hiding stable tabs.
- Contextual controls must react correctly to single selection, multiple selection, mixed selection, grouped selection and nested editing.

### 5.13 Reference-image boundaries and product adaptation

- The supplied screenshots are references only for ribbon organization, permanent tabs, contextual tabs, command grouping and discoverability.
- Unrelated vendor-specific features that happen to be visible in a reference screenshot are outside scope and must be ignored rather than entered into the feature-parity inventory.
- The feature inventory must focus on presentation-authoring capabilities that are useful to Spectropy's teaching workflow, especially the problems and capabilities recorded in sections 1–4.
- The implemented interface must use Spectropy branding, terminology, icons and teaching workflow. It must not copy proprietary visual assets, vendor branding or implementation details.

### 5.13.1 PowerPoint coverage target and prioritization

- The requested product target is approximately 50–60% of PowerPoint-like authoring capability, selected for relevance to Spectropy rather than by raw feature count.
- Priority is determined by the concrete authoring problems already recorded in this document:
  - direct media crop and fit;
  - contextual controls and ribbon discoverability;
  - reliable text formatting and shortcuts;
  - richer shapes, rotation and geometry handling;
  - real layers, visibility and stacking control;
  - genuinely distinct animations and transitions;
  - multi-selection, grouping and ungrouping;
  - reliable canvas zoom and input handling;
  - correct 3D controls and selected-element behavior;
  - non-regression across autosave, undo/redo, preview, presentation and published playback.
- Features that are useful but not required to solve the current workflow problems must be placed in later phases instead of delaying the editor foundations.
- Feature count alone is not a completion measure. Completion requires every included feature to behave correctly throughout its complete authoring and playback workflow.

### 5.14 Required feature-parity matrix before implementation

- Before implementation starts, create a command-level matrix containing at least:
  - source tab and group;
  - reference command;
  - permanent or contextual status;
  - applicable Spectropy element type or editor state;
  - current Spectropy equivalent, if any;
  - required behavior and interaction details;
  - persistence/data-model impact;
  - undo/redo and autosave requirements;
  - editor, preview, presentation and published-player impact;
  - desktop, smartboard, tablet and mobile behavior;
  - accessibility and keyboard requirements;
  - dependency and implementation phase;
  - acceptance test;
  - final disposition and approval.
- This matrix is the mechanism for satisfying the instruction that minute features must not be overlooked.
- Implementation should be phased by shared technical foundations and user workflow, but the approved matrix remains the complete target and prevents later phases from silently losing scope.

## 6. Shared implementation concerns for the later plan

The detailed implementation plan must treat these shared foundations together:

- element data schema and backward compatibility;
- selection and multi-selection state;
- group hierarchy and layer stacking order;
- coordinate transforms for move, resize, rotation and crop;
- canvas zoom and pointer-coordinate conversion;
- contextual toolbar positioning and boundaries;
- text-editing focus and keyboard command routing;
- animation configuration and runtime rendering;
- authoring visibility versus runtime visibility;
- persistence through frontend, backend and database-compatible screen JSON;
- undo/redo transaction boundaries;
- autosave and concurrent revision conflict handling;
- responsive behavior and pointer/touch support;
- editor, preview, presentation and published-player consistency;
- end-to-end regression testing rather than isolated component checks.

## 7. Explicitly deferred

- Implementation began after approval on 15 November 2026; progress and incomplete items are tracked in the implementation plan.
- The approved interaction direction is an adaptive top ribbon with contextual tabs and dismissible editing flyouts. Screens/reorder and Screen Script are the only on-demand left-side panes; no permanent left/right editing rails reserve canvas width.
- Further PowerPoint and Canva interaction details will be analyzed during planning after the full requirement-gathering phase is complete.
- Additional requirements provided today will be appended to this document before implementation planning and approval.
