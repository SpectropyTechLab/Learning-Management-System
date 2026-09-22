# Reusable teaching activities — local authoring guide

21 September 2026. Implemented locally; not deployed. Part of P2/P3, not completion of the full MVP.

## What works

In Design & teach, select a slide, open **activity**, then choose **Activity type**. Comparison table, step-by-step explanation and matching pairs are independent of subject. Edit labels/content, add up to eight items, remove items or move them upward. Switching an existing activity requires confirmation and can be undone. Legacy quizzes/reveals/comparison cards continue to work; a slide currently supports one activity or legacy component.

- Comparison: two editable column headings and aligned aspect/left/right rows.
- Steps: reveal the next step, move back and reset. Suitable for explanations, processes and timelines; it is not a keyframe animation engine.
- Matching: choose an answer for every label, check, correct and reset. Labels and answers must be distinct. This is an author-operated classroom exercise; learner identities/results are not collected.

Saved content is separate from temporary presentation responses. Changing slide/activity resets its attempt. Keyboard operation uses native buttons/selects. Arrow keys inside inputs/selects do not navigate slides. Dense content scrolls within the activity area; authors must review readability on target classroom displays.

## Script examples across subjects

Use this text in the manual script field and select **Create manual slide drafts**, review, then append or replace:

```text
# Slide 1: Plant and animal cells
Layout: comparison-table
Left header: Plant cell
Right header: Animal cell
Comparison rows:
- Cell wall | Present | Absent
Teacher notes: Explain that the diagram and comparison are simplified.

# Slide 2: Solve x + 2 = 5
Layout: steps
Activity prompt: Reveal one reasoning step at a time.
Steps:
- Subtract 2 from both sides | x = 5 - 2
- Simplify | x = 3

# Slide 3: Vocabulary
Layout: matching
Activity prompt: Match each word to its synonym.
Pairs:
- Rapid | Fast
- Silent | Quiet
```

`Steps` and `Pairs` use Label | Content rows. Comparison rows use Aspect | Left | Right. Pipes separate fields and cannot currently occur within field text. At most eight rows; label limit 300 characters, cell/content 1,000 characters, heading 200 characters. Malformed or ambiguous activities produce review warnings. A script requesting multiple activity types on one slide needs author correction or separate slides. Unknown scientific/3D instructions remain flagged; this parser does not invent them.

## Data, compatibility and release

Optional `slide.activity` has its own `version: 1`, kind (none/steps/matching/table), prompt, headers and stable item IDs with label/value/extra. Server validates structure, bounds, versions, IDs, distinct matching answers and mutual exclusion with active legacy components. Old slides lacking it remain valid. Workspace schema remains version 1; no database migration, LMS business-table change or permission expansion.

A registry lists supported activity kinds and initializes editable data; the renderer/editor/parser implement those kinds. This is the first versioned activity foundation, not a complete multi-block plugin engine or source-aware merge system.

Backend compatibility must precede frontend deployment. Keep compatible backend and frontend versions together for documents containing activities: an old frontend does not render the new activities. If a rollback is necessary, preserve saved data and restore a compatible frontend; do not discard activity fields. No deployment has occurred.

## Remaining scope

Hotspots, sorting, richer template/asset search, multi-answer questions, multiple independent activity blocks, cinematic 2D/3D, subject-specific simulation engines and learner-facing delivery are still pending. Gravitation remains one demonstration lesson, not a restriction on the application.
