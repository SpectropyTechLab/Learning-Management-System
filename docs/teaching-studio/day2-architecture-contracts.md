# Day 2 — Architecture and API contracts

**Gate status:** complete as a design baseline on 2026-10-28. Implementation mismatches listed below are not silently treated as completed features.

## Decisions made

1. Keep the current LMS integer IDs and `client_id` tenant boundary. Do not add a second UUID organization model.
2. The curriculum path is Board → Program → Grade → Subject → Chapter → Topic → Subtopic → Session → Screen.
3. A subtopic may have many sessions. The former `UNIQUE (subtopic_id)` rule is invalid and must remain removed from the hosted schema and backend migration.
4. A Studio session owns one current original Session Plan and one current original Screen Script. Each document may be provided either as a private uploaded file or as manually authored JSON, never both at the same revision.
5. Every replacement creates revision metadata and preserves the original bytes. Downloads use authorization plus a short-lived signed URL or streaming response; the storage bucket is private.
6. Session workflow remains draft → submitted → approved/rejected → published. A content change returns the session to draft.
7. The 14 layout identifiers are stable (`LYT-001` through `LYT-014`). Layout slots restrict allowed element types.
8. Branch destinations use stable screen IDs, not display order. A remediation branch records where to return and whether screen/session state must be restored.

The machine-readable baseline is [`contracts/day2-contracts.json`](contracts/day2-contracts.json).

## ER and ownership model

| Parent | Child | Cardinality | Ownership rule |
|---|---|---:|---|
| Board | Program | 1:N | A board may be global (`client_id` null) or tenant-owned; a program resolves to one board. |
| Program | Grade | 1:N | Same tenant as program. |
| Grade | Subject | 1:N | Same tenant through program. |
| Subject | Chapter | 1:N | Same tenant through program. |
| Chapter | Topic | 1:N | Same tenant through program. |
| Topic | Subtopic | 1:N | Topic controls ordering; names need not be globally unique. |
| Subtopic | Session | 1:N | Multiple teaching sessions per subtopic are explicitly allowed. |
| Session | Screen | 1:N | `(session_id, screen_number)` remains unique. |
| Session | Plan revisions | 1:N | Exactly one revision is current. |
| Session | Script revisions | 1:N | Exactly one revision is current. |
| Screen | Resource mapping | 1:N | Mapping points to a stable element ID. |

Tenant access is derived from the owning program/client and must be checked server-side on every read and mutation. A child cannot be attached across tenants.

## Revision model

The current `file_*` and `*_content` columns are useful as a transition model, but they do not provide a revision history. The implementation target is an immutable revision record with:

- session ID, document kind, monotonically increasing revision number;
- source mode (`upload` or `manual`);
- private storage path and original name for upload mode, or JSON content for manual mode;
- MIME type, byte size and SHA-256 hash for uploaded originals;
- creator and timestamp;
- a current-revision pointer on the session.

Replacing a document creates a revision; it does not overwrite or delete the earlier original. Published content that changes returns to draft.

## Permission matrix

| Role | Author/edit | Submit | Review/publish | Download original | Run published content |
|---|---:|---:|---:|---:|---:|
| Super Admin | Any tenant | Yes | Yes | Yes | Yes |
| Content Authorizer | Assigned tenant | Yes | Yes | Yes | Yes |
| Client Admin | No | No | No | Tenant published | Yes |
| School Owner | No | No | No | Assigned published | Yes |
| Teacher | No | No | No | Assigned published | Yes |
| Student | No | No | No | No | Assigned runtime only |

This is the Day 2 product contract. Database RLS and REST grants are a separate implementation task; the cloud-schema review already records their current gaps.

## API contract

All new Studio APIs use `/api/studio`, authenticated user context, server-side tenant checks and a stable error body:

```json
{
  "error": {
    "code": "STUDIO_VALIDATION_FAILED",
    "message": "Session content validation failed",
    "details": [{ "field": "session_plan", "reason": "required" }]
  }
}
```

Mutations carry a revision or `updated_at` value. A stale write returns HTTP 409. Validation failures return 422, missing objects 404, unauthenticated requests 401 and unauthorized tenant/role access 403.

The endpoint inventory is recorded in the JSON contract. Existing workflow endpoints already match the submit/review/publish shapes; document endpoints need a session-level Screen Script route before they match the agreed ownership model.

## Layout, elements and branching

- Canvas master: 1920×1080, 90-pixel safe margin.
- Default layouts: exactly 14 stable IDs, `LYT-001`–`LYT-014`.
- An element has a stable `id`, `slotId` and `type`; the type must be permitted by the slot.
- Discovery tags are trimmed, lower-cased and de-duplicated. A multi-tag search uses **all requested tags**.
- A branch stores stable source and destination screen IDs, trigger details and a return-state object.
- Return state records the return screen plus whether screen-level and session-level learner state are restored.

## Current implementation mismatches to schedule, not hide

1. **Resolved on Day 3:** the backend SQL draft and forward migration now use `(subtopic_id, session_number)` and do not restore `UNIQUE (subtopic_id)`.
2. Screen Script columns and APIs are currently attached to `screens`; the agreed contract is one current original per `session`.
3. Existing file replacement deletes the previous object, so immutable original-byte revision history is not yet implemented.
4. Existing workflow routes allow the same Content Authorizer role to author, review and publish. If managerial separation of duties is required, that is a product-policy decision before production hardening.
5. The existing Studio tables have RLS enabled but no usable policies/grants in the pulled hosted schema. This was already recorded for later implementation.

These mismatches do not block Day 2 contract completion; they become inputs to the implementation days.
