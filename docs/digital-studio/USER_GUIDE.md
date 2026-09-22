# Content Authorizer guide

Baseline: Version 1 · Phase 1, 19 September 2026. [Handbook](README.md)

## Open and create

Sign into [Spectropy OS](https://www.spectropy.com/login). Select **Digital Studio** at the bottom of the Content Authorizer menu. If missing, refresh the page; an administrator must verify role and `studio.access`. Do not share credentials to obtain access.

Choose **Create a lesson** or open a project from **Your workspace**. Each project belongs to its author; another author cannot automatically see it.

## Four authoring stages

1. **Syllabus:** enter title, grade, subject, topic, language and teaching requirements. Optional OS curriculum fields link existing records. Free text does not create or update the OS curriculum.
2. **Lesson plan:** add a session, its duration, objectives and plan. Supported source documents can be imported. Review extraction before relying on it.
3. **Slide script:** write or import the session's script. Numbered slide headings can produce editable drafts. Different layouts may need manual correction; warnings indicate ambiguity.
4. **Design & teach:** add slides, choose templates, edit text and teacher notes, arrange supported elements and configure activities. Visual briefs describe intent; advanced effects do not become functional merely because they are described.

The project retains separate sessions with their own scripts and slides. Reference documents are examples, not mandatory formats.

## Save, recover and present

Changes autosave after a short delay. Wait for **Saved** before leaving Studio. Use **Save** when available. If saving fails, keep the tab open and preserve your edits; offline/crash recovery is not implemented.

If another tab has changed the project, a conflict prevents an overwrite. Preserve your unsaved text, reload the current project and reconcile the changes. **History** can restore an older document as a new revision; it is not a rollback of the whole OS database.

**Present draft** displays the current lesson with a draft label. Navigation, ink controls and fullscreen are available. Teacher notes start hidden; showing them makes them visible on the same screen, not on a private presenter display.

**Publish reviewed lesson** creates a stable snapshot after review and warning resolution. **Present published lesson** uses that snapshot. This does not deploy software, make the lesson public or assign it to students. The live publication path still needs its explicit acceptance test; local tests passed.

## AI availability

In the current live pilot, AI buttons are disabled and a configuration message is shown. Manual authoring works. When enabled, an author chooses an allowed model, requests a draft, reviews the proposal and explicitly accepts it. Check academic correctness and unsupported visuals. AI does not automatically approve or publish lessons.

## Current sample and support

`Studio pilot verification — sample lesson` is an internal sample draft created during deployment checks. It has one session and one slide and is not assigned to a course/student. It is available to its pilot owner for demonstration.

When reporting a problem, give the action, approximate time, project title/revision and sanitized error text. Do not include passwords, tokens or student personal data. A support contact and response-time commitment have not yet been assigned.

## Local authoring update (pending release)

In Syllabus, Board sits beside Language on wide screens and below it on narrow screens, with the same field-label styling. Open Board and select any applicable checkboxes. Existing lessons may leave this blank.

In Slide script, upload or paste a script. Upload opens a storyboard review; for pasted text select Create manual slide drafts. Review visible content, teacher notes, quiz keys and warnings. Close the review to revise the script. Append drafts preserves existing slides. Replace slides with drafts asks for confirmation if slides already exist. Undo restores the previous deck in the current editing session. The uploaded script remains saved even if you cancel applying its drafts.

Supported structured fields and limitations are listed in [implementation tracker](CLEANUP_REVIEW.md). Use numbered Markdown headings such as `## Slide 1: Compare`. Correct option may be a supplied A–H label or the exact option text. Invalid keys are flagged, not invented. Unsupported scene/animation requests remain instructions for follow-up. After applying, content and activities are editable; comparison cards each have their own multiline field. The review itself is not yet an inline editor.

## Reusable activity update — local, 21 September 2026

See [reusable activities](REUSABLE_ACTIVITIES.md) for the new versioned activity contract, editable comparison tables, step explanations and matching pairs, cross-subject examples, release compatibility and limitations. New comparison-row scripts now create aligned tables; legacy cards remain supported. This supersedes earlier planned-only/card-only descriptions for these three components. The full interaction library, source-aware merge and cinematic 3D remain pending. No production deployment, AI activation or LMS-table migration occurred.

## Local exploration/scene increment — 21 September 2026

[Hotspots, sorting and first 2D/3D scene](SCENES_AND_EXPLORATION.md) records the current controls, versioned contracts, ownership checks, examples, test evidence, deployment order and limitations. These features are now locally implemented; prior planned-only statements for this subset are superseded. P3/P4 remain partial. The full cinematic timeline, high-end graphics quality target and wider simulation library remain pending. Production remains unchanged; AI stays off.

## Multi-block editing (local preview)

See [multi-block editor](COMPOSITION_EDITOR.md) for the current author workflow. In Design & teach click Enable multi-block editing beside the slide controls and confirm. Single-slide editing is the default. This conversion preserves content but changes layout; Undo restores it. Use the block selector/label to select, drag to move, Shift-drag to resize, or numeric fields for exact positions. Add text, activity, quiz, motion or uploaded media blocks. Save and Present draft use the same composed content. Current controls and limitations are documented there.

## Arrange and format blocks (local)

See [arrangement editor](ARRANGEMENT_EDITOR.md). Select blocks through the Layers & selection checkboxes, then align/group/move/order them. Group members move together; locked members prevent group movement. Ungroup before individual resizing or deletion. Select a text block to change whole-block size, color, bold, italic or text alignment. Refresh the local preview to load these controls.
