# Day 11 — Resource library and custom layouts

## Completed outcomes

- Resource library supports search, type filters, preview, upload, immutable replacement versions and Screen-editor selection.
- **Used in** reports placement count separately from distinct-Screen count and opens the exact Session and Screen.
- Resource write and preview routes remain restricted by server-side Studio role and tenant checks.
- Custom layouts can be created with a fixed 1920 × 1080 canvas, safe margin and validated slot definitions.
- Custom-layout validation reports missing fields, duplicate slot IDs, unsupported element types, invalid geometry, canvas overflow and overlap.
- Editing a custom layout inserts a new layout revision. Existing Screens and immutable releases continue to reference their earlier layout row.
- Default LYT-001 through LYT-014 definitions are protected from editing; Authors create a custom layout instead.
- The Screen Editor can apply both default and custom layout versions and retains explicit handling of incompatible existing elements.
- Publication readiness shows the exact Session revision and server validation problems before submit, approval or publication.

## Integration decisions

- The approved five-item Studio sidebar remains unchanged. Resource management is opened from the Screen Editor instead of becoming a sixth top-level workflow step.
- Super Admin and Content Authorizer share the same `/studio` authoring routes. Older `/content-authorizer/studio` links remain compatibility aliases.
- Resource deletion remains blocked whenever placements, SCORM attempts or published releases reference the Resource.

## Verification evidence

- Backend CI: 157 tests passed, including Day 11 layout and Resource-usage acceptance cases.
- Backend ESLint: zero errors (existing repository warnings remain).
- Frontend production TypeScript/Vite build: passed.
- Studio/frontend scoped ESLint: passed.
- Repository-wide frontend lint still reports pre-existing errors outside the Studio files and is not introduced by Day 11.

## Remaining blockers

None for the Day 11 acceptance scope. The existing repository-wide frontend lint debt should remain separately owned and must not be represented as a Day 11 Studio defect.
