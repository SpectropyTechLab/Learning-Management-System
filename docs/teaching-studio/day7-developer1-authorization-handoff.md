# Day 7 Developer 1 Handoff: Authorization Enforcement

**Owner:** Rahul  
**Status:** complete on 2026-10-29

## Scope completed

Day 7 Developer 1 requires evidence that draft edits invalidate prior academic authorization, teachers cannot perform academic writes, and protected attachment and Resource bytes cannot be read without the correct authorization.

The existing Session revision model and database trigger remain authoritative. Every relevant document, Screen creation, Screen save and Screen reorder operation calls `returnSessionToDraft`, which increments `sessions.revision_no`. The `trg_studio_invalidate_authorization` database trigger then records `invalidated_at` on the previously current authorization. Publication only accepts a non-invalidated authorization for the exact current Session revision.

## Route hardening

The Session Plan and Screen Script routes now apply explicit reader and author roles:

- Readers: `super_admin`, `content_authorizer`, `client_admin`, `school_owner`, `teacher`.
- Writers: `super_admin`, `content_authorizer`.

The author check runs before Multer processes an uploaded body. A teacher therefore receives `403` without the server first accepting a potentially large unauthorized upload.

Service-level authorization remains in place as defense in depth.

## Evidence covered

`backend/tests/studio-day7-authorization.test.js` verifies:

- Unauthenticated protected-document requests return `401`.
- Teachers are denied document, Screen, Resource and academic-workflow writes.
- Returning edited content to draft advances the Session revision.
- The migration trigger invalidates prior authorizations on revision changes.
- An approved Session cannot publish when its authorization is invalidated.
- Draft attachments and cross-tenant attachments are denied before Storage access.
- An assigned teacher can read a published attachment and its bytes pass size/hash verification.
- Invalid and expired runtime tokens cannot read Resource bytes.
- A token cannot request a file outside the immutable runtime manifest.
- Cross-tenant Resource downloads are hidden before a signed URL is created.

Run the focused evidence with:

```bash
cd backend
npm run studio:day7:verify
```

Run the complete backend checks with:

```bash
npm run test:ci
npm run lint -- --quiet
```

## Scope boundary

Developer 2 owns SCORM runtime communication, attempts and persistence. Developer 3 owns branch checkpoint and return-state contracts. Those areas were not changed by this Developer 1 authorization work.
