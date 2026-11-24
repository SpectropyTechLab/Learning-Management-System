import type { ImportIssue, ImportIssueSeverity } from './importTypes.ts';

export const IMPORT_ISSUE_CODES = Object.freeze({
  documentRequired: 'IMPORT_DOCUMENT_REQUIRED',
  schemaUnsupported: 'IMPORT_SCHEMA_UNSUPPORTED',
  sourceInvalid: 'IMPORT_SOURCE_INVALID',
  screenCountInvalid: 'IMPORT_SCREEN_COUNT_INVALID',
  screenInvalid: 'IMPORT_SCREEN_INVALID',
  screenSizeInvalid: 'IMPORT_SCREEN_SIZE_INVALID',
  elementInvalid: 'IMPORT_ELEMENT_INVALID',
  elementDuplicate: 'IMPORT_ELEMENT_DUPLICATE',
  boundsInvalid: 'IMPORT_BOUNDS_INVALID',
  resourceInvalid: 'IMPORT_RESOURCE_INVALID',
  resourceDuplicate: 'IMPORT_RESOURCE_DUPLICATE',
  resourceReferenceMissing: 'IMPORT_RESOURCE_REFERENCE_MISSING',
  resourceHashMismatch: 'IMPORT_RESOURCE_HASH_MISMATCH',
  unsafeContent: 'IMPORT_UNSAFE_CONTENT',
} as const);

export const createImportIssue = (
  code: string,
  message: string,
  options: {
    severity?: ImportIssueSeverity;
    sourceScreenId?: string | null;
    sourceElementId?: string | null;
    fallbackApplied?: string | null;
    details?: unknown;
  } = {},
): ImportIssue => ({
  severity: options.severity || 'error',
  code,
  message,
  source_screen_id: options.sourceScreenId || null,
  source_element_id: options.sourceElementId || null,
  fallback_applied: options.fallbackApplied || null,
  ...(options.details === undefined ? {} : { details: options.details }),
});
