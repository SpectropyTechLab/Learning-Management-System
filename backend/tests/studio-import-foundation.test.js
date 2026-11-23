import assert from 'node:assert/strict';
import test from 'node:test';
import {
  IMPORT_SCHEMA_VERSION,
  ImportCommitError,
  ImportValidationError,
  commitImportDocument,
  fitImportBounds,
  normalizeImportStyle,
  planImportedResources,
  validateImportDocument,
} from '../services/studioImportFoundation.service.js';

const importDocument = ({ screens = 1, duplicateResource = false } = {}) => ({
  schema_version: IMPORT_SCHEMA_VERSION,
  source: { kind: 'synthetic', name: 'Phase 1 fixture' },
  source_metadata: { test: true },
  resources: [
    { source_id: 'diagram-a', file_name: 'diagram.png', media_type: 'image/png', bytes: Buffer.from([1, 2, 3]), metadata: { name: 'Diagram' } },
    ...(duplicateResource ? [{ source_id: 'diagram-b', file_name: 'diagram-copy.png', media_type: 'image/png', bytes: Buffer.from([1, 2, 3]) }] : []),
  ],
  issues: [],
  screens: Array.from({ length: screens }, (_, index) => ({
    source_id: `slide-${index + 1}`,
    title: `Imported ${index + 1}`,
    width: 1000,
    height: 1000,
    background: { color: '#ffffff' },
    notes: {},
    elements: [
      { source_id: `text-${index + 1}`, kind: 'text', bounds: { x: 100, y: 100, width: 300, height: 100 }, content: { text: 'Editable text' }, z_index: 1 },
      { source_id: `image-${index + 1}`, kind: 'image', bounds: { x: 400, y: 300, width: 400, height: 300 }, resource_reference: { source_id: 'diagram-a', fit: 'contain' }, z_index: 2 },
    ],
  })),
});

const ports = ({ failOnSave = null } = {}) => {
  const state = {
    resources: new Map(),
    screens: new Map(),
    deletedScreens: [],
    deletedResources: [],
    calls: [],
  };
  return {
    state,
    adapter: {
      async createResource(_entry) {
        state.calls.push('createResource');
        const id = state.resources.size + 10;
        const persisted = { resource_id: id, resource_version_id: id + 100, resource_type: 'image' };
        state.resources.set(id, persisted);
        return persisted;
      },
      async createScreen(_sessionId, title) {
        state.calls.push('createScreen');
        const id = state.screens.size + 1;
        const screen = { id, title, revision_no: 1, elements: [] };
        state.screens.set(id, screen);
        return screen;
      },
      async saveScreen(screenId, body) {
        state.calls.push('saveScreen');
        if (screenId === failOnSave) throw new Error('Synthetic persistence failure');
        const saved = { ...state.screens.get(screenId), ...body, id: screenId, revision_no: 2 };
        state.screens.set(screenId, saved);
        return saved;
      },
      async getScreen(screenId) {
        state.calls.push('getScreen');
        return state.screens.get(screenId);
      },
      async deleteScreen(screenId) {
        state.deletedScreens.push(screenId);
        state.screens.delete(screenId);
      },
      async deleteResource(resourceId) {
        state.deletedResources.push(resourceId);
        state.resources.delete(resourceId);
      },
    },
  };
};

test('normalized validation finishes before any persistence boundary is called', async () => {
  const value = importDocument();
  value.screens[0].elements[1].resource_reference.source_id = 'missing';
  const boundary = ports();
  assert.throws(() => validateImportDocument(value), ImportValidationError);
  await assert.rejects(commitImportDocument({ sessionId: 1, document: value, user: { id: 1 }, ports: boundary.adapter }), ImportValidationError);
  assert.deepEqual(boundary.state.calls, []);
});

test('resource planning deduplicates bytes and maps every source alias', async () => {
  const plan = await planImportedResources(importDocument({ duplicateResource: true }));
  assert.equal(plan.entries.length, 1);
  assert.deepEqual(plan.entries[0].source_ids, ['diagram-a', 'diagram-b']);
  assert.equal(plan.source_to_plan_id.get('diagram-a'), plan.source_to_plan_id.get('diagram-b'));
});

test('coordinate conversion fits source geometry into the canonical Studio canvas', () => {
  assert.deepEqual(fitImportBounds({ width: 1000, height: 1000 }, { x: 0, y: 0, width: 1000, height: 1000 }), {
    x: 420, y: 0, width: 1080, height: 1080, zIndex: 0,
  });
});

test('style normalization produces bounded source-independent values', () => {
  assert.deepEqual(normalizeImportStyle({
    opacity: 2,
    fill: { color: '#abc', opacity: -2 },
    line: { color: 'invalid', width: 500 },
    text: { font_family: '  Aptos ', font_size: 900, font_weight: 50, alignment: 'middle' },
  }), {
    opacity: 1,
    fill: { color: '#abc', opacity: 0 },
    line: { width: 100 },
    text: { font_family: 'Aptos', font_size: 400, font_weight: 100, alignment: 'left' },
  });
});

test('a synthetic ImportDocument commits resources and editable screens through application boundaries', async () => {
  const boundary = ports();
  const value = importDocument({ duplicateResource: true });
  value.screens[0].elements.splice(1, 0, {
    source_id: 'text-2', kind: 'text', bounds: { x: 200, y: 220, width: 300, height: 100 }, content: { text: 'Second editable text' }, z_index: 2,
  });
  const report = await commitImportDocument({ sessionId: 44, document: value, user: { id: 7 }, ports: boundary.adapter });
  assert.equal(report.status, 'committed');
  assert.equal(report.screens_created.length, 1);
  assert.equal(report.elements_created, 3);
  assert.equal(report.resources_created.length, 1);
  assert.equal(report.resources_deduplicated, 1);
  const saved = boundary.state.screens.get(1);
  assert.equal(saved.elements[0].type, 'text');
  assert.equal(saved.elements[0].content.text, 'Editable text');
  assert.equal(new Set(saved.elements.map((element) => element.slotId)).size, 3);
  assert.equal(saved.elements.every((element) => element.slotId !== 'free-text' && element.slotId !== 'free-element' && element.slotId !== 'free-element-resource'), true);
  assert.deepEqual(saved.elements[2].resource, {
    resource_id: 10,
    resource_version_id: 110,
    usage: { slot_id: saved.elements[2].slotId, resource_type: 'image', fit: 'contain' },
  });
});

test('a failed multi-screen commit removes screens then staged resources in reverse order', async () => {
  const boundary = ports({ failOnSave: 2 });
  await assert.rejects(
    commitImportDocument({ sessionId: 44, document: importDocument({ screens: 2 }), user: { id: 7 }, ports: boundary.adapter }),
    (error) => {
      assert.equal(error instanceof ImportCommitError, true);
      assert.equal(error.details.cleanup.complete, true);
      return true;
    },
  );
  assert.deepEqual(boundary.state.deletedScreens, [2, 1]);
  assert.deepEqual(boundary.state.deletedResources, [10]);
  assert.equal(boundary.state.screens.size, 0);
  assert.equal(boundary.state.resources.size, 0);
});

test('cancellation after staging retains its cause code and cleans staged resources', async () => {
  const controller = new AbortController();
  const boundary = ports();
  const createResource = boundary.adapter.createResource;
  boundary.adapter.createResource = async (...args) => {
    const created = await createResource(...args);
    controller.abort();
    return created;
  };
  await assert.rejects(
    commitImportDocument({ sessionId: 44, document: importDocument(), user: { id: 7 }, ports: boundary.adapter, signal: controller.signal }),
    (error) => {
      assert.equal(error.details.cause_code, 'IMPORT_CANCELLED');
      assert.equal(error.details.cleanup.complete, true);
      return true;
    },
  );
  assert.deepEqual(boundary.state.deletedResources, [10]);
});

test('cleanup failures are audited instead of being reported as successful rollback', async () => {
  const boundary = ports({ failOnSave: 2 });
  boundary.adapter.deleteResource = async (resourceId) => {
    boundary.state.deletedResources.push(resourceId);
    throw new Error('Synthetic storage cleanup failure');
  };
  await assert.rejects(
    commitImportDocument({ sessionId: 44, document: importDocument({ screens: 2 }), user: { id: 7 }, ports: boundary.adapter }),
    (error) => {
      assert.equal(error.details.cleanup.complete, false);
      assert.equal(error.details.cleanup.results.some((result) => result.kind === 'resource' && !result.cleaned), true);
      return true;
    },
  );
});
