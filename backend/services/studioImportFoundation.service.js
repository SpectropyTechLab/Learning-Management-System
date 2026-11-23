import { createHash } from 'node:crypto';
import { AppError } from '../utils/errors.js';
import { createResource, deleteResource } from './studioResources.service.js';
import { createScreen } from './studioLayouts.service.js';
import { deleteScreen, getScreen, listSessionScreens, reorderScreens, saveScreen } from './studioScreens.service.js';

export const IMPORT_SCHEMA_VERSION = 'spectropy.import.v1';
export const IMPORT_CANVAS = Object.freeze({ width: 1920, height: 1080 });

const MAX_SCREENS = 100;
const MAX_ELEMENTS_PER_SCREEN = 2000;
const MAX_RESOURCES = 1000;
const MAX_RESOURCE_BYTES = 50 * 1024 * 1024;
const SOURCE_KINDS = new Set(['clipboard', 'pptx', 'synthetic']);
const ISSUE_SEVERITIES = new Set(['info', 'warning', 'error']);
const ELEMENT_KIND_MAP = Object.freeze({
  title: 'title',
  text: 'text',
  shape: 'shape',
  image: 'visual',
  vector: 'visual',
  media: 'media',
  video: 'media',
  audio: 'media',
  simulation: 'simulation',
  embedded_object: 'embedded_object',
});
const RESOURCE_TYPES = new Set([
  'image', 'video', 'animation', 'simulation', 'document', 'presentation',
  'external_link', 'html', 'zip', 'scorm', 'model_3d',
]);
const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export const importIssue = ({
  severity = 'error', code, message, sourceScreenId = null,
  sourceElementId = null, fallbackApplied = null, details = undefined,
}) => ({
  severity,
  code,
  message,
  source_screen_id: sourceScreenId,
  source_element_id: sourceElementId,
  fallback_applied: fallbackApplied,
  ...(details === undefined ? {} : { details }),
});

export class ImportValidationError extends AppError {
  constructor(issues) {
    super('Import document validation failed', 422, 'IMPORT_DOCUMENT_INVALID', { issues });
    this.name = 'ImportValidationError';
    this.issues = issues;
  }
}

export class ImportCommitError extends AppError {
  constructor(message, details, cause) {
    super(message, 500, 'IMPORT_COMMIT_FAILED', details);
    this.name = 'ImportCommitError';
    this.cause = cause;
  }
}

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !Buffer.isBuffer(value);
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const text = (value) => typeof value === 'string' ? value.trim() : '';
const clamp = (value, minimum, maximum, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
};
const normalizedColor = (value) => {
  const candidate = text(value);
  return /^(?:#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|transparent)$/i.test(candidate) ? candidate : undefined;
};

export const normalizeImportStyle = (style = {}) => {
  const normalized = { ...style };
  if (style.opacity !== undefined) normalized.opacity = clamp(style.opacity, 0, 1, 1);
  for (const key of ['fill', 'line']) {
    if (!isRecord(style[key])) continue;
    normalized[key] = { ...style[key] };
    const color = normalizedColor(style[key].color);
    if (color) normalized[key].color = color;
    else delete normalized[key].color;
    if (style[key].opacity !== undefined) normalized[key].opacity = clamp(style[key].opacity, 0, 1, 1);
    if (style[key].width !== undefined) normalized[key].width = clamp(style[key].width, 0, 100, 1);
  }
  if (isRecord(style.text)) {
    normalized.text = { ...style.text };
    const color = normalizedColor(style.text.color);
    if (color) normalized.text.color = color;
    else delete normalized.text.color;
    if (style.text.font_family !== undefined) normalized.text.font_family = text(style.text.font_family).slice(0, 120);
    if (style.text.font_size !== undefined) normalized.text.font_size = clamp(style.text.font_size, 1, 400, 18);
    if (style.text.font_weight !== undefined) normalized.text.font_weight = clamp(style.text.font_weight, 100, 900, 400);
    if (style.text.alignment !== undefined) {
      const alignment = text(style.text.alignment).toLowerCase();
      normalized.text.alignment = ['left', 'center', 'right', 'justify'].includes(alignment) ? alignment : 'left';
    }
  }
  return normalized;
};

const inspectJsonValue = (value, label, issues, sourceScreenId, sourceElementId, depth = 0) => {
  if (depth > 30) {
    issues.push(importIssue({ code: 'IMPORT_VALUE_TOO_DEEP', message: `${label} is nested too deeply`, sourceScreenId, sourceElementId }));
    return;
  }
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      issues.push(importIssue({ code: 'IMPORT_VALUE_NOT_FINITE', message: `${label} contains a non-finite number`, sourceScreenId, sourceElementId }));
    }
    if (typeof value === 'string' && /<\s*script\b|javascript\s*:|\bon\w+\s*=/i.test(value)) {
      issues.push(importIssue({ code: 'IMPORT_UNSAFE_MARKUP', message: `${label} contains unsafe active content`, sourceScreenId, sourceElementId }));
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => inspectJsonValue(entry, `${label}[${index}]`, issues, sourceScreenId, sourceElementId, depth + 1));
    return;
  }
  if (!isRecord(value)) {
    issues.push(importIssue({ code: 'IMPORT_VALUE_NOT_JSON', message: `${label} must contain JSON-compatible data`, sourceScreenId, sourceElementId }));
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (UNSAFE_KEYS.has(key)) {
      issues.push(importIssue({ code: 'IMPORT_UNSAFE_KEY', message: `${label} contains a forbidden key`, sourceScreenId, sourceElementId }));
      continue;
    }
    inspectJsonValue(entry, `${label}.${key}`, issues, sourceScreenId, sourceElementId, depth + 1);
  }
};

const validateIssue = (issue, index, issues) => {
  if (!isRecord(issue) || !ISSUE_SEVERITIES.has(issue.severity) || !text(issue.code) || !text(issue.message)) {
    issues.push(importIssue({ code: 'IMPORT_ISSUE_INVALID', message: `Import issue ${index + 1} is invalid` }));
  }
};

export const collectImportValidationIssues = (document) => {
  const issues = [];
  if (!isRecord(document)) {
    return [importIssue({ code: 'IMPORT_DOCUMENT_REQUIRED', message: 'Import document must be an object' })];
  }
  if (document.schema_version !== IMPORT_SCHEMA_VERSION) {
    issues.push(importIssue({ code: 'IMPORT_SCHEMA_UNSUPPORTED', message: `schema_version must be ${IMPORT_SCHEMA_VERSION}` }));
  }
  if (!isRecord(document.source) || !SOURCE_KINDS.has(document.source.kind)) {
    issues.push(importIssue({ code: 'IMPORT_SOURCE_INVALID', message: 'Import source kind must be clipboard, pptx, or synthetic' }));
  }
  if (!Array.isArray(document.screens) || document.screens.length < 1 || document.screens.length > MAX_SCREENS) {
    issues.push(importIssue({ code: 'IMPORT_SCREEN_COUNT_INVALID', message: `Import must contain 1 to ${MAX_SCREENS} screens` }));
  }
  if (!Array.isArray(document.resources) || document.resources.length > MAX_RESOURCES) {
    issues.push(importIssue({ code: 'IMPORT_RESOURCE_COUNT_INVALID', message: `Import resources must be an array with at most ${MAX_RESOURCES} entries` }));
  }
  if (document.issues !== undefined && !Array.isArray(document.issues)) {
    issues.push(importIssue({ code: 'IMPORT_ISSUES_INVALID', message: 'Import issues must be an array' }));
  } else {
    (document.issues || []).forEach((issue, index) => validateIssue(issue, index, issues));
  }

  const resourceIds = new Set();
  for (const [index, resource] of (Array.isArray(document.resources) ? document.resources : []).entries()) {
    const sourceId = text(resource?.source_id);
    if (!isRecord(resource) || !sourceId) {
      issues.push(importIssue({ code: 'IMPORT_RESOURCE_INVALID', message: `Resource ${index + 1} requires a source_id` }));
      continue;
    }
    if (resourceIds.has(sourceId)) {
      issues.push(importIssue({ code: 'IMPORT_RESOURCE_DUPLICATE', message: `Duplicate resource source_id: ${sourceId}` }));
    }
    resourceIds.add(sourceId);
    if (!text(resource.file_name) || !text(resource.media_type)) {
      issues.push(importIssue({ code: 'IMPORT_RESOURCE_METADATA_INVALID', message: `Resource ${sourceId} requires file_name and media_type` }));
    }
    const hasBytes = Buffer.isBuffer(resource.bytes) || resource.bytes instanceof Uint8Array;
    const hasReader = typeof resource.read_bytes === 'function';
    if (!hasBytes && !hasReader) {
      issues.push(importIssue({ code: 'IMPORT_RESOURCE_BYTES_REQUIRED', message: `Resource ${sourceId} requires bytes or read_bytes` }));
    }
    if (hasBytes && resource.bytes.byteLength > MAX_RESOURCE_BYTES) {
      issues.push(importIssue({ code: 'IMPORT_RESOURCE_TOO_LARGE', message: `Resource ${sourceId} exceeds the 50 MB import limit` }));
    }
    if (resource.sha256 !== undefined && !/^[a-f\d]{64}$/i.test(String(resource.sha256))) {
      issues.push(importIssue({ code: 'IMPORT_RESOURCE_HASH_INVALID', message: `Resource ${sourceId} has an invalid SHA-256 hash` }));
    }
    inspectJsonValue(resource.metadata || {}, `Resource ${sourceId} metadata`, issues, null, null);
  }

  const screenIds = new Set();
  for (const [screenIndex, screen] of (Array.isArray(document.screens) ? document.screens : []).entries()) {
    const sourceScreenId = text(screen?.source_id);
    if (!isRecord(screen) || !sourceScreenId) {
      issues.push(importIssue({ code: 'IMPORT_SCREEN_INVALID', message: `Screen ${screenIndex + 1} requires a source_id` }));
      continue;
    }
    if (screenIds.has(sourceScreenId)) {
      issues.push(importIssue({ code: 'IMPORT_SCREEN_DUPLICATE', message: `Duplicate screen source_id: ${sourceScreenId}`, sourceScreenId }));
    }
    screenIds.add(sourceScreenId);
    if (!finite(screen.width) || screen.width <= 0 || !finite(screen.height) || screen.height <= 0) {
      issues.push(importIssue({ code: 'IMPORT_SCREEN_SIZE_INVALID', message: `Screen ${sourceScreenId} has invalid dimensions`, sourceScreenId }));
    }
    if (!Array.isArray(screen.elements) || screen.elements.length > MAX_ELEMENTS_PER_SCREEN) {
      issues.push(importIssue({ code: 'IMPORT_ELEMENT_COUNT_INVALID', message: `Screen ${sourceScreenId} must contain at most ${MAX_ELEMENTS_PER_SCREEN} elements`, sourceScreenId }));
      continue;
    }
    const elementIds = new Set();
    for (const [elementIndex, element] of screen.elements.entries()) {
      const sourceElementId = text(element?.source_id);
      if (!isRecord(element) || !sourceElementId || !text(element.kind) || !ELEMENT_KIND_MAP[element.kind]) {
        issues.push(importIssue({ code: 'IMPORT_ELEMENT_INVALID', message: `Element ${elementIndex + 1} on screen ${sourceScreenId} is invalid`, sourceScreenId, sourceElementId: sourceElementId || null }));
        continue;
      }
      if (elementIds.has(sourceElementId)) {
        issues.push(importIssue({ code: 'IMPORT_ELEMENT_DUPLICATE', message: `Duplicate element source_id: ${sourceElementId}`, sourceScreenId, sourceElementId }));
      }
      elementIds.add(sourceElementId);
      const bounds = element.bounds;
      if (!isRecord(bounds) || !finite(bounds.x) || !finite(bounds.y) || !finite(bounds.width) || !finite(bounds.height) || bounds.width <= 0 || bounds.height <= 0) {
        issues.push(importIssue({ code: 'IMPORT_BOUNDS_INVALID', message: `Element ${sourceElementId} has invalid bounds`, sourceScreenId, sourceElementId }));
      }
      if (element.rotation !== undefined && !finite(element.rotation)) {
        issues.push(importIssue({ code: 'IMPORT_ROTATION_INVALID', message: `Element ${sourceElementId} has invalid rotation`, sourceScreenId, sourceElementId }));
      }
      if (element.z_index !== undefined && (!Number.isInteger(element.z_index) || element.z_index < 0)) {
        issues.push(importIssue({ code: 'IMPORT_Z_INDEX_INVALID', message: `Element ${sourceElementId} has invalid z_index`, sourceScreenId, sourceElementId }));
      }
      const resourceSourceId = text(element.resource_reference?.source_id);
      if (resourceSourceId && !resourceIds.has(resourceSourceId)) {
        issues.push(importIssue({ code: 'IMPORT_RESOURCE_REFERENCE_MISSING', message: `Element ${sourceElementId} references unknown resource ${resourceSourceId}`, sourceScreenId, sourceElementId }));
      }
      inspectJsonValue(element.content || {}, `Element ${sourceElementId} content`, issues, sourceScreenId, sourceElementId);
      inspectJsonValue(element.style || {}, `Element ${sourceElementId} style`, issues, sourceScreenId, sourceElementId);
      inspectJsonValue(element.metadata || {}, `Element ${sourceElementId} metadata`, issues, sourceScreenId, sourceElementId);
    }
    inspectJsonValue(screen.background || {}, `Screen ${sourceScreenId} background`, issues, sourceScreenId, null);
    inspectJsonValue(screen.notes || {}, `Screen ${sourceScreenId} notes`, issues, sourceScreenId, null);
  }
  return issues;
};

export const validateImportDocument = (document) => {
  const issues = collectImportValidationIssues(document);
  if (issues.some((issue) => issue.severity === 'error')) throw new ImportValidationError(issues);
  return document;
};

const readResourceBytes = async (resource) => {
  const raw = resource.bytes ?? await resource.read_bytes();
  const bytes = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
  if (!bytes.length) throw new ImportValidationError([importIssue({ code: 'IMPORT_RESOURCE_EMPTY', message: `Resource ${resource.source_id} is empty` })]);
  if (bytes.length > MAX_RESOURCE_BYTES) throw new ImportValidationError([importIssue({ code: 'IMPORT_RESOURCE_TOO_LARGE', message: `Resource ${resource.source_id} exceeds the 50 MB import limit` })]);
  return bytes;
};

export const planImportedResources = async (document) => {
  validateImportDocument(document);
  const entries = [];
  const sourceToPlanId = new Map();
  const deduplicatedByHash = new Map();
  for (const resource of document.resources) {
    const bytes = await readResourceBytes(resource);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    if (resource.sha256 && resource.sha256.toLowerCase() !== sha256) {
      throw new ImportValidationError([importIssue({ code: 'IMPORT_RESOURCE_HASH_MISMATCH', message: `Resource ${resource.source_id} does not match its SHA-256 hash` })]);
    }
    const dedupeKey = `${sha256}:${resource.media_type.toLowerCase()}`;
    let planId = deduplicatedByHash.get(dedupeKey);
    if (!planId) {
      planId = `resource-${entries.length + 1}`;
      deduplicatedByHash.set(dedupeKey, planId);
      entries.push({
        plan_id: planId,
        source_ids: [resource.source_id],
        file_name: resource.file_name,
        media_type: resource.media_type.toLowerCase(),
        bytes,
        sha256,
        metadata: resource.metadata || {},
      });
    } else {
      entries.find((entry) => entry.plan_id === planId).source_ids.push(resource.source_id);
    }
    sourceToPlanId.set(resource.source_id, planId);
  }
  return { entries, source_to_plan_id: sourceToPlanId };
};

export const fitImportBounds = (screen, bounds) => {
  const scale = Math.min(IMPORT_CANVAS.width / screen.width, IMPORT_CANVAS.height / screen.height);
  const offsetX = (IMPORT_CANVAS.width - screen.width * scale) / 2;
  const offsetY = (IMPORT_CANVAS.height - screen.height * scale) / 2;
  const x = Math.max(0, Math.min(IMPORT_CANVAS.width - 1, offsetX + bounds.x * scale));
  const y = Math.max(0, Math.min(IMPORT_CANVAS.height - 1, offsetY + bounds.y * scale));
  const width = Math.max(1, Math.min(IMPORT_CANVAS.width - x, bounds.width * scale));
  const height = Math.max(1, Math.min(IMPORT_CANVAS.height - y, bounds.height * scale));
  return {
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
    width: Number(width.toFixed(3)),
    height: Number(height.toFixed(3)),
    zIndex: Math.min(5000, Math.max(0, Number(bounds.z_index || 0))),
  };
};

const resourceTypeFor = (entry) => {
  const requested = text(entry.metadata?.resource_type);
  if (RESOURCE_TYPES.has(requested)) return requested;
  if (entry.media_type === 'image/gif') return 'animation';
  if (entry.media_type.startsWith('image/')) return 'image';
  if (entry.media_type.startsWith('video/')) return 'video';
  if (entry.media_type.startsWith('audio/')) return 'video';
  if (entry.media_type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return 'presentation';
  if (entry.media_type === 'application/pdf') return 'document';
  return 'document';
};

const studioElementFor = (screen, element, persistedResources, resourcePlan, elementIndex) => {
  const resourceSourceId = text(element.resource_reference?.source_id);
  const planId = resourceSourceId ? resourcePlan.source_to_plan_id.get(resourceSourceId) : null;
  const persisted = planId ? persistedResources.get(planId) : null;
  const type = ELEMENT_KIND_MAP[element.kind];
  const id = `import-${elementIndex + 1}-${screen.source_id}-${element.source_id}`.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 145);
  const slotId = `free-${id}`;
  return {
    id,
    slotId,
    type,
    content: {
      ...(isRecord(element.content) ? element.content : {}),
      ...(isRecord(element.style) && Object.keys(element.style).length ? { importStyle: normalizeImportStyle(element.style) } : {}),
      importSource: {
        screen_id: screen.source_id,
        element_id: element.source_id,
        kind: element.kind,
        ...(isRecord(element.metadata) ? { metadata: element.metadata } : {}),
      },
    },
    position: {
      ...fitImportBounds(screen, { ...element.bounds, z_index: element.z_index }),
      rotation: Number(element.rotation || 0),
      flipX: Boolean(element.flip?.horizontal),
      flipY: Boolean(element.flip?.vertical),
      ...(text(element.group?.source_id) ? {
        groupId: `import-group-${screen.source_id}-${element.group.source_id}`
          .replace(/[^a-zA-Z0-9_-]/g, '-')
          .slice(0, 150),
      } : {}),
    },
    ...(persisted ? {
      resource: {
        resource_id: persisted.resource_id,
        resource_version_id: persisted.resource_version_id,
        usage: {
          slot_id: slotId,
          resource_type: persisted.resource_type,
          fit: element.resource_reference?.fit || 'contain',
        },
      },
    } : {}),
  };
};

export const createDefaultImportPorts = () => ({
  async createResource(entry, user) {
    const resourceType = resourceTypeFor(entry);
    const created = await createResource({
      user,
      body: {
        name: text(entry.metadata?.name) || entry.file_name,
        description: text(entry.metadata?.description) || 'Imported teaching resource',
        resource_type: resourceType,
        metadata_json: JSON.stringify({ ...entry.metadata, import: { sha256: entry.sha256, source_ids: entry.source_ids } }),
      },
      file: { originalname: entry.file_name, mimetype: entry.media_type, buffer: entry.bytes },
    });
    return {
      resource_id: Number(created.id),
      resource_version_id: Number(created.latest_version.id),
      resource_type: resourceType,
    };
  },
  createScreen: (sessionId, title, user) => createScreen({ sessionId, body: { creation_mode: 'blank', title }, user }),
  saveScreen: (screenId, body, user) => saveScreen({ screenId, body, user }),
  getScreen: (screenId, user) => getScreen({ screenId, user }),
  listScreens: (sessionId, user) => listSessionScreens({ sessionId, user }),
  reorderScreens: (sessionId, body, user) => reorderScreens({ sessionId, body, user }),
  deleteScreen: (screenId, user) => deleteScreen({ screenId, user }),
  async deleteResource(resourceId, user) {
    const result = await deleteResource({ resourceId, user });
    if (result.storage_cleanup_complete === false) throw new Error(`Stored files for imported Resource ${resourceId} were not fully removed`);
    return result;
  },
});

const assertNotAborted = (signal) => {
  if (signal?.aborted) throw new AppError('Import was cancelled', 409, 'IMPORT_CANCELLED');
};

const cleanupImport = async ({ createdScreens, createdResources, ports, user }) => {
  const results = [];
  for (const screen of [...createdScreens].reverse()) {
    try {
      await ports.deleteScreen(screen.id, user);
      results.push({ kind: 'screen', id: screen.id, cleaned: true });
    } catch (error) {
      results.push({ kind: 'screen', id: screen.id, cleaned: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
  for (const resource of [...createdResources].reverse()) {
    try {
      await ports.deleteResource(resource.persisted.resource_id, user);
      results.push({ kind: 'resource', id: resource.persisted.resource_id, cleaned: true });
    } catch (error) {
      results.push({ kind: 'resource', id: resource.persisted.resource_id, cleaned: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return { complete: results.every((result) => result.cleaned), results };
};

export const commitImportDocument = async ({
  sessionId, document, user, ports = createDefaultImportPorts(), signal,
  insertion = { mode: 'end', after_screen_id: null },
}) => {
  validateImportDocument(document);
  assertNotAborted(signal);
  if (typeof ports.listScreens === 'function') await ports.listScreens(sessionId, user);
  const resourcePlan = await planImportedResources(document);
  const persistedResources = new Map();
  const createdResources = [];
  const createdScreens = [];
  try {
    for (const entry of resourcePlan.entries) {
      assertNotAborted(signal);
      const persisted = await ports.createResource(entry, user);
      persistedResources.set(entry.plan_id, persisted);
      createdResources.push({ entry, persisted });
    }
    for (const importScreen of document.screens) {
      assertNotAborted(signal);
      const created = await ports.createScreen(sessionId, text(importScreen.title) || 'Imported Screen', user);
      createdScreens.push(created);
      const elements = [...importScreen.elements]
        .sort((left, right) => Number(left.z_index || 0) - Number(right.z_index || 0))
        .map((element, elementIndex) => studioElementFor(importScreen, element, persistedResources, resourcePlan, elementIndex));
      const saved = await ports.saveScreen(created.id, {
        revision_no: Number(created.revision_no),
        title: text(importScreen.title) || 'Imported Screen',
        layout_id: null,
        elements,
        tags: [],
        screen_settings: {
          background: importScreen.background || {},
          ...(importScreen.background?.color ? { backgroundColor: importScreen.background.color } : {}),
          import: {
            schema_version: document.schema_version,
            source: document.source,
            source_screen_id: importScreen.source_id,
            hidden: Boolean(importScreen.metadata?.hidden),
            notes: importScreen.notes || {},
          },
        },
      }, user);
      const verified = await ports.getScreen(saved.id, user);
      if (!verified || verified.elements.length !== elements.length) {
        throw new Error(`Imported screen ${importScreen.source_id} failed verification`);
      }
      createdScreens[createdScreens.length - 1] = verified;
    }
    if (typeof ports.listScreens === 'function' && typeof ports.reorderScreens === 'function' && createdScreens.length) {
      assertNotAborted(signal);
      const listing = await ports.listScreens(sessionId, user);
      const importedIds = createdScreens.map((screen) => Number(screen.id));
      const importedSet = new Set(importedIds);
      const existingIds = listing.screens.map((screen) => Number(screen.id)).filter((id) => !importedSet.has(id));
      let index = existingIds.length;
      if (insertion?.mode === 'start') index = 0;
      if (insertion?.mode === 'after') {
        const anchorIndex = existingIds.indexOf(Number(insertion.after_screen_id));
        index = anchorIndex >= 0 ? anchorIndex + 1 : existingIds.length;
      }
      const screenIds = [...existingIds.slice(0, index), ...importedIds, ...existingIds.slice(index)];
      await ports.reorderScreens(sessionId, {
        session_revision_no: Number(listing.session_revision_no),
        screen_ids: screenIds,
      }, user);
    }
    return {
      schema_version: document.schema_version,
      status: 'committed',
      screens_requested: document.screens.length,
      screens_created: createdScreens.map((screen) => Number(screen.id)),
      elements_created: document.screens.reduce((total, screen) => total + screen.elements.length, 0),
      resources_requested: document.resources.length,
      resources_created: createdResources.map(({ persisted }) => Number(persisted.resource_id)),
      resources_deduplicated: document.resources.length - resourcePlan.entries.length,
      issues: document.issues || [],
      cleanup: { complete: true, results: [] },
    };
  } catch (error) {
    const cleanup = await cleanupImport({ createdScreens, createdResources, ports, user });
    throw new ImportCommitError('Import commit failed and compensating cleanup was attempted', {
      cleanup,
      cause_code: error?.code || (signal?.aborted ? 'IMPORT_CANCELLED' : 'IMPORT_COMMIT_STEP_FAILED'),
      created_screen_ids: createdScreens.map((screen) => Number(screen.id)),
      created_resource_ids: createdResources.map(({ persisted }) => Number(persisted.resource_id)),
    }, error);
  }
};
