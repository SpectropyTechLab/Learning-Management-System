# Teaching Studio canvas and layout handover

## Integration

The existing LMS frontend uses React, Vite, React Router, protected role routes, and shared dashboard shells. Teaching Studio is available at `/teaching-studio` to authenticated super admins, client admins, content authorizers, school owners, and teachers. Its navigation entry is in the existing Teaching Sessions shell. No backend data or publication workflow is changed.

## Implemented

- A 1920 × 1080 canvas with uniform viewport fit and centering.
- Master header (90, 60, 1740, 150), content (90, 250, 1740, 680), footer reference at y = 980, and 90 px safe-margin guide.
- Fourteen target registry entries (`LYT-001`–`LYT-014`) using the Developer Guide v3 section 6.3 wireframe coordinates, named slots, allowed preview object types, purpose, compatible use, interaction, evidence, and production checks.
- The eight pilot arrangements remain available separately as an import baseline, with the supplied SVG previews and sample equivalent-fractions lesson.
- The gallery defaults to the fourteen target layouts and generates previews from their registry geometry.
- Optional placement guides outside the teaching preview by default.

## Validation

- `node ./node_modules/typescript/bin/tsc --noEmit` passed.
- Targeted ESLint on the new feature, shell, and routes: no errors or warnings.
- `node --test src/features/teaching-studio/layouts.test.cjs` passed: fourteen target layouts, eight pilot arrangements, slot bounds and non-overlap, 16:9 master, and fit calculations for 1920 × 1080, 1600 × 900, 900 × 700, and 390 × 600.
- A clean frontend dependency install and full Vite production build passed. The backend and frontend returned HTTP 200 locally. Local Supabase health, admin login, and `/api/auth/me` returned HTTP 200.
- Browser verification: the protected `/teaching-studio` route rendered after local admin login; the first and last target layouts and the pilot tab rendered valid slots. The earlier pilot canvas fit without horizontal overflow at 1440 × 900 and 390 × 600 viewports while preserving 16:9.
- Repository-wide lint reports 221 errors and 55 warnings in existing code. The new feature does not add targeted lint errors.
- Backend test suite: 62 pass and 10 existing question-bank-flow tests fail because the mocks do not cover current ownership and constraint queries. These failures are unrelated to Teaching Studio and remain for the question-bank owner.

## Review points and next dependencies

- The fourteen target layout slot rectangles follow the Developer Guide wireframes. Their authored content, reveal behavior, interaction, accessibility, and classroom typography still need implementation and review with Poojitha and the team before publication. The eight pilot SVGs remain conceptual arrangements with provisional slot coordinates.
- This registry and preview are frontend code only. The current Supabase schema has no `layout_templates`, `teaching_slides`, or `slide_objects` tables, and the backend has no Teaching Studio layout API. The Guide's versioned persistence and template-switch compatibility workflow require separate migration, API, and Author builder work.
- The local Supabase migration contains hosted `public` schema definitions only. It contains no table rows or Storage objects. The two local test buckets are public so existing LMS media URLs work during local testing; keep sensitive real data out of them.
- Sample lesson objects are local demonstration data. Production lesson JSON, backend persistence, authoring controls, drag and drop, and teacher/student projections are later tasks.
- Review typography at projection sizes and confirm provisional slot geometry with the layout owners before using it for publication.
