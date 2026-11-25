import { createImportIssue, IMPORT_ISSUE_CODES } from './importIssues.ts';
import { IMPORT_SCHEMA_VERSION, type ImportDocument, type ImportIssue } from './importTypes.ts';

const elementKinds = new Set(['title', 'text', 'shape', 'equation', 'table', 'chart', 'image', 'vector', 'media', 'video', 'audio', 'simulation', 'embedded_object']);
const sourceKinds = new Set(['clipboard', 'pptx', 'synthetic']);
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const unsafeKeys = new Set(['__proto__', 'prototype', 'constructor']);

const inspectSafeValue = (
  value: unknown,
  issues: ImportIssue[],
  label: string,
  sourceScreenId: string | null,
  sourceElementId: string | null,
  depth = 0,
) => {
  if (depth > 30) {
    issues.push(createImportIssue(IMPORT_ISSUE_CODES.unsafeContent, `${label} is nested too deeply`, { sourceScreenId, sourceElementId }));
    return;
  }
  if (typeof value === 'string') {
    if (/<\s*script\b|javascript\s*:|\bon\w+\s*=/i.test(value)) issues.push(createImportIssue(IMPORT_ISSUE_CODES.unsafeContent, `${label} contains unsafe active content`, { sourceScreenId, sourceElementId }));
    return;
  }
  if (value === null || typeof value === 'boolean' || finite(value)) return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => inspectSafeValue(entry, issues, `${label}[${index}]`, sourceScreenId, sourceElementId, depth + 1));
    return;
  }
  if (!record(value)) return;
  Object.entries(value).forEach(([key, entry]) => {
    if (unsafeKeys.has(key)) issues.push(createImportIssue(IMPORT_ISSUE_CODES.unsafeContent, `${label} contains a forbidden key`, { sourceScreenId, sourceElementId }));
    else inspectSafeValue(entry, issues, `${label}.${key}`, sourceScreenId, sourceElementId, depth + 1);
  });
};

export const collectImportValidationIssues = (value: unknown): ImportIssue[] => {
  if (!record(value)) return [createImportIssue(IMPORT_ISSUE_CODES.documentRequired, 'Import document must be an object')];
  const issues: ImportIssue[] = [];
  if (value.schema_version !== IMPORT_SCHEMA_VERSION) issues.push(createImportIssue(IMPORT_ISSUE_CODES.schemaUnsupported, `schema_version must be ${IMPORT_SCHEMA_VERSION}`));
  if (!record(value.source) || !sourceKinds.has(String(value.source.kind))) issues.push(createImportIssue(IMPORT_ISSUE_CODES.sourceInvalid, 'Import source is invalid'));
  if (!Array.isArray(value.resources) || value.resources.length > 1000) issues.push(createImportIssue(IMPORT_ISSUE_CODES.resourceInvalid, 'Import resources must be an array with at most 1000 entries'));
  const resources = Array.isArray(value.resources) ? value.resources : [];
  const resourceIds = new Set<string>();
  resources.forEach((candidate, index) => {
    if (!record(candidate) || typeof candidate.source_id !== 'string' || !candidate.source_id.trim()) {
      issues.push(createImportIssue(IMPORT_ISSUE_CODES.resourceInvalid, `Resource ${index + 1} is invalid`));
      return;
    }
    if (resourceIds.has(candidate.source_id)) issues.push(createImportIssue(IMPORT_ISSUE_CODES.resourceDuplicate, `Duplicate resource source_id: ${candidate.source_id}`));
    resourceIds.add(candidate.source_id);
    const bytes = candidate.bytes;
    if (bytes instanceof Uint8Array && bytes.byteLength > 50 * 1024 * 1024) issues.push(createImportIssue(IMPORT_ISSUE_CODES.resourceInvalid, `Resource ${candidate.source_id} exceeds the 50 MB limit`));
    inspectSafeValue(candidate.metadata || {}, issues, `Resource ${candidate.source_id} metadata`, null, null);
  });
  if (!Array.isArray(value.screens) || value.screens.length < 1 || value.screens.length > 100) {
    issues.push(createImportIssue(IMPORT_ISSUE_CODES.screenCountInvalid, 'Import must contain 1 to 100 screens'));
    return issues;
  }
  const screenIds = new Set<string>();
  value.screens.forEach((candidate, screenIndex) => {
    if (!record(candidate) || typeof candidate.source_id !== 'string' || !candidate.source_id.trim()) {
      issues.push(createImportIssue(IMPORT_ISSUE_CODES.screenInvalid, `Screen ${screenIndex + 1} is invalid`));
      return;
    }
    const sourceScreenId = candidate.source_id;
    if (screenIds.has(sourceScreenId)) issues.push(createImportIssue(IMPORT_ISSUE_CODES.screenInvalid, `Duplicate screen source_id: ${sourceScreenId}`, { sourceScreenId }));
    screenIds.add(sourceScreenId);
    if (!finite(candidate.width) || candidate.width <= 0 || !finite(candidate.height) || candidate.height <= 0) {
      issues.push(createImportIssue(IMPORT_ISSUE_CODES.screenSizeInvalid, `Screen ${sourceScreenId} has invalid dimensions`, { sourceScreenId }));
    }
    if (!Array.isArray(candidate.elements) || candidate.elements.length > 2000) {
      issues.push(createImportIssue(IMPORT_ISSUE_CODES.elementInvalid, `Screen ${sourceScreenId} has invalid elements`, { sourceScreenId }));
      return;
    }
    const elementIds = new Set<string>();
    candidate.elements.forEach((element, elementIndex) => {
      if (!record(element) || typeof element.source_id !== 'string' || !element.source_id.trim() || !elementKinds.has(String(element.kind))) {
        issues.push(createImportIssue(IMPORT_ISSUE_CODES.elementInvalid, `Element ${elementIndex + 1} is invalid`, { sourceScreenId }));
        return;
      }
      if (elementIds.has(element.source_id)) issues.push(createImportIssue(IMPORT_ISSUE_CODES.elementDuplicate, `Duplicate element source_id: ${element.source_id}`, { sourceScreenId, sourceElementId: element.source_id }));
      elementIds.add(element.source_id);
      const bounds = element.bounds;
      if (!record(bounds) || !finite(bounds.x) || !finite(bounds.y) || !finite(bounds.width) || !finite(bounds.height) || bounds.width <= 0 || bounds.height <= 0) {
        issues.push(createImportIssue(IMPORT_ISSUE_CODES.boundsInvalid, `Element ${element.source_id} has invalid bounds`, { sourceScreenId, sourceElementId: element.source_id }));
      }
      const resourceId = record(element.resource_reference) ? String(element.resource_reference.source_id || '') : '';
      if (resourceId && !resourceIds.has(resourceId)) issues.push(createImportIssue(IMPORT_ISSUE_CODES.resourceReferenceMissing, `Element ${element.source_id} references unknown resource ${resourceId}`, { sourceScreenId, sourceElementId: element.source_id }));
      inspectSafeValue(element.content || {}, issues, `Element ${element.source_id} content`, sourceScreenId, element.source_id);
      inspectSafeValue(element.style || {}, issues, `Element ${element.source_id} style`, sourceScreenId, element.source_id);
      inspectSafeValue(element.metadata || {}, issues, `Element ${element.source_id} metadata`, sourceScreenId, element.source_id);
    });
    inspectSafeValue(candidate.background || {}, issues, `Screen ${sourceScreenId} background`, sourceScreenId, null);
    inspectSafeValue(candidate.notes || {}, issues, `Screen ${sourceScreenId} notes`, sourceScreenId, null);
  });
  return issues;
};

export const validateImportDocument = (value: unknown): ImportDocument => {
  const issues = collectImportValidationIssues(value);
  if (issues.some((issue) => issue.severity === 'error')) {
    const error = new Error('Import document validation failed');
    Object.assign(error, { code: 'IMPORT_DOCUMENT_INVALID', issues });
    throw error;
  }
  return value as unknown as ImportDocument;
};
