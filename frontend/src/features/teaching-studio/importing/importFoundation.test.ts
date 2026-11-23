import assert from 'node:assert/strict';
import test from 'node:test';
import { planStudioElements } from './commit/importPlanner.ts';
import { fitImportBounds } from './converters/coordinateConverter.ts';
import { normalizeImportStyle } from './converters/styleConverter.ts';
import { IMPORT_SCHEMA_VERSION, type ImportDocument } from './model/importTypes.ts';
import { collectImportValidationIssues, validateImportDocument } from './model/importValidation.ts';
import { planImportedResources } from './resources/importedResourcePlanner.ts';
import { studioElementSlotId } from './elementSlot.ts';

const document = (): ImportDocument => ({
  schema_version: IMPORT_SCHEMA_VERSION,
  source: { kind: 'synthetic' },
  source_metadata: {},
  resources: [{ source_id: 'image-a', file_name: 'diagram.png', media_type: 'image/png', bytes: new Uint8Array([1, 2, 3]) }],
  issues: [],
  screens: [{
    source_id: 'slide-1', title: 'Imported', width: 1000, height: 1000, background: {}, notes: {},
    elements: [
      { source_id: 'text-1', kind: 'text', bounds: { x: 100, y: 100, width: 300, height: 100 }, content: { text: 'Editable' }, z_index: 1 },
      { source_id: 'image-1', kind: 'image', bounds: { x: 400, y: 300, width: 400, height: 300 }, resource_reference: { source_id: 'image-a' }, z_index: 2 },
    ],
  }],
});

test('normalized import validation rejects missing resource references before commit', () => {
  const value = document();
  value.screens[0].elements[1].resource_reference = { source_id: 'missing' };
  assert.equal(collectImportValidationIssues(value).some((issue) => issue.code === 'IMPORT_RESOURCE_REFERENCE_MISSING'), true);
  assert.throws(() => validateImportDocument(value), /validation failed/);
});

test('normalized import validation rejects active content before planning', () => {
  const value = document();
  value.screens[0].elements[0].content = { richTextHtml: '<img src=x onerror=alert(1)>' };
  assert.equal(collectImportValidationIssues(value).some((issue) => issue.code === 'IMPORT_UNSAFE_CONTENT'), true);
});

test('coordinate fitting preserves relative placement inside the canonical canvas', () => {
  assert.deepEqual(fitImportBounds({ width: 1000, height: 1000 }, { x: 0, y: 0, width: 1000, height: 1000 }), {
    x: 420, y: 0, width: 1080, height: 1080,
  });
});

test('style normalization canonicalizes visual and text values without source-specific parsing', () => {
  assert.deepEqual(normalizeImportStyle({
    opacity: 2,
    fill: { color: '#ABC', opacity: -1 },
    line: { color: 'not-a-colour', width: 500 },
    text: { font_family: '  Aptos  ', font_size: 900, font_weight: 50, alignment: 'MIDDLE', color: 'rgb(1, 2, 3)' },
  }), {
    opacity: 1,
    fill: { color: '#ABC', opacity: 0 },
    line: { width: 100 },
    text: { font_family: 'Aptos', font_size: 400, font_weight: 100, alignment: 'left', color: 'rgb(1, 2, 3)' },
  });
});

test('resource planning deduplicates identical bytes and retains every source alias', async () => {
  const value = document();
  value.resources.push({ source_id: 'image-b', file_name: 'copy.png', media_type: 'image/png', bytes: new Uint8Array([1, 2, 3]) });
  const plan = await planImportedResources(value);
  assert.equal(plan.entries.length, 1);
  assert.deepEqual(plan.entries[0].source_ids, ['image-a', 'image-b']);
  assert.equal(plan.source_to_plan_id.get('image-a'), plan.source_to_plan_id.get('image-b'));
});

test('element planning creates editable Studio elements with Resource Library bindings', () => {
  const value = document();
  const elements = planStudioElements(value.screens[0], new Map([['image-a', { resource_id: 10, resource_version_id: 11, resource_type: 'image' }]]));
  assert.equal(elements.length, 2);
  assert.equal(elements[0].type, 'text');
  assert.equal(elements[0].content.text, 'Editable');
  assert.notEqual(elements[0].slotId, elements[1].slotId);
  assert.deepEqual(elements[1].resource, {
    resource_id: 10,
    resource_version_id: 11,
    usage: { slot_id: elements[1].slotId, resource_type: 'image', fit: 'contain' },
  });
});

test('legacy imported freeform slots are remapped per element in editor and player canvases', () => {
  const content = { importSource: { screen_id: 'slide-1', element_id: 'object-1' } };
  const first = studioElementSlotId('import-1', 'free-text', content);
  const second = studioElementSlotId('import-2', 'free-text', content);
  assert.equal(first, 'free-import-1');
  assert.equal(second, 'free-import-2');
  assert.notEqual(first, second);
  assert.equal(studioElementSlotId('native-object', 'visual', {}), 'visual');
});
