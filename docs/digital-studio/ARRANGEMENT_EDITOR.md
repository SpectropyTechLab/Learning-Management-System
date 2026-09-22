# Arrangement and text formatting — local F2 increment

21 September 2026. [Multi-block editor](COMPOSITION_EDITOR.md) · [Phase 2 plan](PENDING_WORKFLOW.md)

## Author workflow

In a composed slide, open **Layers & selection**. Layers are listed frontmost first. Click a layer name to inspect its content; check multiple rows to select them for arrangement. Select all layers and Clear selection are available. Checkboxes provide a keyboard-accessible alternative to canvas selection.

- Align left/center/right/top/middle/bottom uses the selection's bounding rectangle. At least two ungrouped blocks are required.
- Group selection assigns one flat group; regrouping selected groups merges their members. Selecting a group member for arrangement includes its entire group.
- Move selection shifts by 1% of the slide per click. Dragging a grouped block label moves all members while preserving spacing and clamping the group to slide boundaries.
- Send selection front/back or forward/backward changes layer order while preserving the relative order of selected members.
- Ungroup selection restores individual arrangement. Ungroup before resizing, removing or aligning individual members. Group scaling is not implemented.
- A locked member blocks arrangement for the entire selected group. Unlock it explicitly; no partial group move occurs.
- Title, body and text-element blocks support whole-block font size, hex color, bold, italic and left/center/right text alignment. This is not selection-level rich text or a custom-font picker.

All edits use existing document undo/redo and autosave/revisions. Multi-selection itself is transient; groups and text styles persist. Presentation renders formatting without editing controls.

## Data and compatibility

Optional per-block `groupId` (nonempty, maximum 100 characters) and `textStyle` are additive. A group must contain at least two blocks within its slide. Text styling is restricted to title/body/text-element content; size is 12–100, color is six-digit hex and alignment is allowlisted. Server validation rejects invalid group/style data. No SQL migration, table change, permission expansion or new library.

Group-aware arrangement commands clone input and validate the entire selection before mutation. Group movement clamps a shared delta, preserving internal geometry. Styling/grouping cannot silently downgrade through the legacy adapter. Deploy matching backend validation and frontend together in the established backend-first sequence. Older editor versions do not implement these semantics; use compatible code or explicit pre-change revision recovery.

## Verification

- 42 application tests pass: group movement/bounds/spacing, immutable input, locked-member rejection, ungrouping, alignment, layer ordering, invalid selection/deltas and group/style server validation.
- Isolated PostgreSQL save/reopen asserts persisted group and style fields.
- Browser regression passes: multi-selection, grouping, movement, layer controls, ungrouping, alignment/undo and computed rendered bold text. Prior script/activity/scene checks still pass.
- Dedicated localhost preview check passes: uploaded image load, interactive sorting, real API geometry save/reopen; fixture restored after testing.
- TypeScript and canonical packaging parity pass. Build result recorded in CHANGELOG.

## Limits and next work

No canvas marquee or Ctrl-click multi-selection; use layer checkboxes. No nested groups, group scaling/rotation, distribution, snapping guides, inline rich text, equations, custom fonts or reusable style presets. Grouped blocks must be ungrouped for individual resizing/deletion/alignment. No complete keyboard/touch/accessibility or device-performance certification. Full F2 and Phase 2 remain incomplete. Next: review these controls, then reusable layouts/components and further editor refinement per the plan.

Preview: http://127.0.0.1:5188/ → Phase 2 — Compose, explore and teach → Design & teach. Refresh an already open tab to load the new controls. This increment is local only; AI remains deferred and production unchanged.
