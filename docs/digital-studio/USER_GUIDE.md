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
