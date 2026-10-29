# Day 3 Database Foundations

## Outcome

Day 3 implements the approved Studio schema as a forward Supabase migration. It preserves the existing integer curriculum identities, permits multiple ordered sessions under one subtopic, makes session documents revision-safe, versions layouts, normalizes screen elements and tags, and enforces same-session branch destinations and return references.

The authoritative migration is `supabase/migrations/20261028150000_studio_day3_foundations.sql`.

## Curriculum relationships and ownership

- Existing Board, Program, Grade, Subject, Chapter, Topic and Subtopic IDs are preserved.
- Program-to-Board remains optional. A tenant-owned Board can only be assigned to a Program in the same client; a global Board may be reused.
- A Studio Session resolves through Subtopic to the existing Topic-to-Program chain.
- A tenant-owned curriculum chain supplies the Session client when omitted and rejects a different client.
- The former single-column uniqueness on `sessions.subtopic_id` is removed.
- `sessions.session_number` is backfilled deterministically and `(subtopic_id, session_number)` is unique.

No existing question-bank table, primary key or query contract is replaced.

## Session documents

`session_documents` is the canonical document model for both `session_plan` and `screen_script`.

Each revision records:

- session and document type;
- monotonically increasing revision number;
- upload or manual source mode;
- private storage key, original filename, content type and size when available;
- optional SHA-256 hash;
- manual JSON content for manual mode;
- creator, timestamp and current-revision state.

A partial unique index permits only one current revision of each document type for a Session. Revision payloads are immutable; replacement creates a new revision. Draft Sessions may temporarily have neither document, while submit validation remains responsible for requiring both.

The migration backfills the old Session Plan columns and an unambiguous legacy Screen Script. It stops rather than guessing when a Session contains more than one legacy script or when upload and manual modes are both populated. Missing legacy size/hash values remain null and are marked incomplete in metadata; Day 4 uploads must populate accurate values.

The old document columns remain only as a compatibility bridge until the Day 4 API cutover. A trigger prevents more than one legacy screen-level script under a Session.

## Layout and screen models

- Existing `layouts` rows gain a stable `layout_key`, version number, 1920 x 1080 canvas dimensions and safe margin.
- The tenant, layout key and version combination is unique.
- A Screen records whether it originated as `blank` or from a layout and has a revision number.
- A blank Screen can use an empty title, no layout and no preset elements.
- The frontend model now creates and validates a genuinely empty blank screen.

## Elements tags and branches

The migration replaces the three competing JSON arrays on `screens` with canonical relational models:

- `screen_elements` stores a stable element key, optional slot, supported element type, content, position and order.
- `screen_tags` stores normalized lower-case tags, allowing indexed multi-tag discovery.
- `screen_branches` stores explicit source, destination and return Screen references, trigger configuration and restore-state flags.

Composite foreign keys require source, destination and return Screens to belong to the same Session. Existing resource mappings gain a foreign key to the normalized Screen element.

Legacy JSON is validated and backfilled before its columns are removed. Invalid or cross-session branch data stops the migration instead of being silently changed.

## Backfill and deployment order

1. Take a database backup and run the legacy-data preflight queries embedded in the migration.
2. Resolve multiple legacy scripts, mixed upload/manual documents, invalid elements, invalid tags or cross-session branches.
3. Apply the migration to a development copy.
4. Run `npm run studio:day3:verify` from `backend`.
5. Compare curriculum row counts and representative IDs before and after migration.
6. Implement the Day 4 APIs against the canonical tables.
7. Remove legacy document columns only after the API cutover and production backfill verification.

## Day 3 acceptance evidence

The verifier checks the migrated schema and uses a rolled-back transaction to prove:

- two sessions can belong to one subtopic;
- curriculum IDs remain the existing integer identities;
- a blank Screen contains no preset elements;
- typed elements and normalized tags can be stored;
- branches cannot cross Session boundaries;
- only one current Session Plan and Screen Script revision can exist;
- verification data is rolled back after the test.

## Remaining Day 4 work

- Parent-dependent curriculum APIs and negative parent-chain tests.
- Session-level original upload, replacement and protected download using `session_documents`.
- Accurate file size and SHA-256 capture for new uploads.
- Layout create, update, list and blank-screen creation APIs.
- Removal of legacy document columns after the API cutover.
