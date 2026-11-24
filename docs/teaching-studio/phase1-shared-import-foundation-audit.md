# Phase 1 Audit — Shared Import Foundation

**Date:** 23 November 2026  
**Branch:** `feature/clipboard-pptx-import`  
**Controlling specification:** [Cross-Application Clipboard and Editable PPTX Import](./clipboard-pptx-import-requirements-and-implementation-plan.md)  
**Phase status:** Complete and approved; Phase 2 proceeded on 23 Nov 2026

## 1. Scope completed

Phase 1 implements the source-independent contract and controlled commit foundation used by future clipboard and PPTX adapters:

- normalized `ImportDocument`, screen, element, resource, and issue types;
- stable validation issue codes and pre-persistence validation;
- unsafe active-content and unsafe-key rejection;
- source-to-1920×1080 coordinate fitting with final-boundary rounding;
- resource byte hashing, SHA-256 verification, and within-import deduplication;
- normalized element conversion into the existing `StudioElement` contract;
- Resource Library bindings using resource and version IDs;
- controlled multi-resource/multi-screen commit orchestration through existing services;
- cancellation checks before irreversible steps;
- reverse-order compensating cleanup;
- auditable incomplete-cleanup reporting, including stored-file cleanup status;
- deterministic success and failure reports.

No clipboard representation adapter, PPTX package parser, import dialog, public import endpoint, or user-visible workflow is included. Those belong to later approved phases.

## 2. Foundation boundaries

### Frontend

`frontend/src/features/teaching-studio/importing/` contains:

- `model/importTypes.ts` — source-independent TypeScript contract.
- `model/importIssues.ts` — stable issue creation and codes.
- `model/importValidation.ts` — pre-planning structural and safety validation.
- `converters/coordinateConverter.ts` — proportional canvas fitting.
- `resources/importedResourcePlanner.ts` — byte hashing, verification, and deduplication.
- `commit/importPlanner.ts` — conversion into existing editable `StudioElement` payloads.

The frontend foundation is pure and independently testable. Phase 2 can feed clipboard representations into it without adding parsing logic to `TeachingStudioPage`.

### Backend

`backend/services/studioImportFoundation.service.js` provides the authoritative staged commit boundary for backend-assisted imports:

1. Validate the entire normalized document.
2. Read and hash resource bytes.
3. Deduplicate resources and map every source alias.
4. Stage resources through the existing Resource Library service.
5. Create blank screens through the existing screen creation service.
6. Save normalized editable elements through the existing revision-safe screen service.
7. Reload and verify each committed screen.
8. Return an import report.
9. On failure or cancellation, delete screens and then resources in reverse order.
10. Report any cleanup that could not be verified.

The service has default ports wired to existing production services and injectable ports for deterministic failure-path testing. It is intentionally not exposed as a public route until a source adapter and preflight workflow exist.

## 3. Normalized contract

Schema identifier: `spectropy.import.v1`.

Required document fields:

- `source` with `clipboard`, `pptx`, or `synthetic` kind;
- one to 100 normalized screens;
- zero to 1,000 resources;
- explicit issues array;
- unique source IDs for screens, elements within a screen, and resources.

Validation rejects:

- invalid or unsupported schema/source kinds;
- invalid or duplicate identifiers;
- invalid screen dimensions or element geometry;
- missing resource references;
- non-finite numeric values;
- unsafe active markup and prototype-pollution keys;
- resources above the 50 MB per-asset limit;
- invalid or mismatched SHA-256 hashes;
- non-JSON-compatible normalized content.

## 4. Existing application integration

- Imported screens remain normal blank Studio screens with normal revisions.
- Imported elements are normal `StudioElement` records; no parallel canvas model exists.
- Imported media uses normal Resource Library records, versions, and screen mappings.
- Screen persistence retains existing tenant authorization, geometry validation, resource compatibility checks, revision handling, and return-to-draft behavior.
- Resource persistence retains existing MIME/extension validation, storage, versioning, and tenant rules.
- Resource deletion now reports `storage_cleanup_complete`; the import rollback treats a false result as incomplete cleanup.
- Existing editor, autosave, undo, ribbon, preview, and presentation code remains unchanged.

## 5. Commit and rollback invariants

- Validation finishes before the first persistence port is called.
- One resource is created for identical bytes and media type; all source IDs map to it.
- Every persisted element references a real resource/version pair.
- Every saved screen is reloaded and its element count is verified.
- Failed screen creation/save/verification triggers screen cleanup before resource cleanup.
- Cancellation after staging follows the same cleanup path and retains `IMPORT_CANCELLED` as the cause code.
- Cleanup failures remain visible in `cleanup.complete` and per-item cleanup results.
- Import-generated element IDs include stable ordering and sanitized source identifiers to avoid collisions.

## 6. Automated verification

### New Phase 1 tests

Backend foundation tests cover:

- validation before persistence;
- resource deduplication and alias mapping;
- coordinate fitting;
- successful synthetic document commit;
- reverse-order cleanup after a multi-screen failure;
- cancellation cleanup and cause reporting;
- incomplete cleanup auditing.

Frontend foundation tests cover:

- missing resource-reference rejection;
- unsafe active-content rejection;
- coordinate fitting;
- resource deduplication;
- conversion to editable Studio elements with Resource Library bindings.

### Regression gates

| Gate | Result |
|---|---|
| Frontend Studio foundation tests | 73/73 passed |
| Backend Studio/import/resource/PPTX targeted tests | 66/66 passed |
| Frontend production build | Passed |
| Targeted frontend and backend lint | Passed |
| Diff whitespace validation | Passed |

The complete final regression rerun is recorded in the phase handoff.

## 7. Known limits and deferred scope

- Import adapters do not yet create normalized documents from browser clipboard data or PPTX XML.
- No import UI, progress UI, report dialog, or public import endpoint exists yet.
- Detailed text-run, shape, vector, group, and PPTX inheritance conversion belongs to Phases 2–4.
- Current generic element mapping preserves source content/style metadata but source-specific converters will map those properties into native editor fields.
- A PPTX backend job will invoke this foundation after package preflight in Phase 3.
- Clipboard paste will use the same normalized contract but commit to the active editor history as one action in Phase 2.

## 8. Exit-gate audit

- [x] Normalized import types and validation implemented.
- [x] Stable issue codes and reporting implemented.
- [x] Coordinate and style-bearing element normalization implemented.
- [x] Resource hashing and deduplication implemented.
- [x] Controlled staged commit implemented through established application services.
- [x] Validation failure creates no persisted content.
- [x] Failed commit performs reverse-order compensating cleanup.
- [x] Cleanup completeness is verified and audited.
- [x] A synthetic `ImportDocument` creates normal editable screens, elements, and resource bindings through application boundaries.
- [x] Existing editor workflows remain unchanged and regression tests pass.
- [x] Phase 2 adapter/UI work was not mixed into Phase 1.

**Audit conclusion:** Phase 1 satisfies the approved exit gate and is ready for product-owner review. Phase 2 must not begin until approval is received.
