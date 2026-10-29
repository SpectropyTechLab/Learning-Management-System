# Day 4 — Curriculum, document and layout API handoff

Date: 29 October 2026

## Outcome

Day 4 backend scope is implemented against the canonical Day 3 schema:

- Curriculum APIs cover Board through Subtopic, enforce the complete readable parent chain and restrict mutations to the canonical writer roles and permissions.
- Session Plan and Screen Script APIs now both use session-owned, immutable `session_documents` revisions.
- Original uploads record exact filename, MIME type, byte length and SHA-256; replacement creates a new revision and preserves the earlier original.
- Protected downloads stream the verified original bytes with `Content-Type`, `Content-Length`, RFC 5987 `Content-Disposition`, SHA-256 and revision headers.
- Layout APIs create, list and retrieve layouts; PATCH creates a new immutable version instead of mutating an earlier version.
- Screen creation supports a genuinely blank screen with no layout and no preset elements, plus validated layout-based creation.
- Layout validation rejects missing slots, invalid dimensions, duplicate/overlapping slots, unknown regions and unsupported element types.

## API surface

### Session documents

- `POST|PUT /api/studio/sessions/:sessionId/session-plan`
- `PATCH /api/studio/sessions/:sessionId/session-plan/content`
- `GET /api/studio/sessions/:sessionId/session-plan/download`
- `POST|PUT /api/studio/sessions/:sessionId/screen-script`
- `PATCH /api/studio/sessions/:sessionId/screen-script/content`
- `GET /api/studio/sessions/:sessionId/screen-script/download`

The former per-screen Screen Script routes were removed because the agreed contract is one current Screen Script per Studio Session.

### Layouts and screens

- `GET /api/studio/layouts`
- `GET /api/studio/layouts/:layoutId`
- `POST /api/studio/layouts`
- `PATCH /api/studio/layouts/:layoutId` — creates the next version
- `POST /api/studio/sessions/:sessionId/screens`

## Migration

`20261028180000_studio_day4_api_support.sql`:

- creates/repairs the private `sessions-scripts-plans` bucket;
- removes the superseded Session Plan fields from `sessions`;
- removes the superseded Screen Script fields and trigger from `screens`;
- leaves `session_documents` as the only document revision model.

The migration was applied and registered in local Supabase after confirming that the Day 3 backfill had no unmatched legacy values.

## Verification evidence

- `npm run test:ci`: 83/83 backend tests passed.
- `npm run lint`: zero errors; existing unrelated warnings remain.
- `npm run studio:day4:verify` against local Supabase:
  - migration and private bucket verified;
  - layout v1 creation and immutable v2 update verified;
  - layout history listing verified;
  - blank Screen persisted with `layout_id = NULL` and zero `screen_elements`;
  - invalid element type rejected;
  - real private Storage upload, replacement and protected download returned byte-identical Session Plan and Screen Script originals;
  - all verification records and Storage objects were removed afterward.

## Remaining blockers and next actions

No Day 4 backend blocker remains. The fourteen default definitions continue to come from the reviewed frontend registry (`LYT-001` through `LYT-014`); deployment seeding of those definitions should be handled with the environment rollout rather than silently inserted into hosted Supabase during local development.

Day 5 can consume these APIs for resource upload/reuse, placement and discovery work. Hosted migration and deployment remain reviewed release actions.
