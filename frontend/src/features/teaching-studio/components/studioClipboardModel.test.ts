import assert from 'node:assert/strict';
import test from 'node:test';
import type { StudioElement } from '../types.ts';
import {
  applyStudioElementFormat,
  collectStudioClipboardElements,
  copyStudioElementFormat,
  pasteStudioClipboardElements,
  studioPasteModesForElements,
} from './studioClipboardModel.ts';

const element = (id: string, overrides: Partial<StudioElement> = {}): StudioElement => ({
  id,
  slotId: `free-${id}`,
  type: 'text',
  content: { text: id, color: '#ef4444', fontFamily: 'Georgia', fontSize: 48, bold: true },
  position: { x: 100, y: 100, width: 400, height: 180 },
  ...overrides,
});

test('clipboard selection expands a selected group and preserves screen stacking order', () => {
  const elements = [
    element('a', { position: { x: 0, y: 0, width: 100, height: 100, groupId: 'group-1' } }),
    element('b', { position: { x: 120, y: 0, width: 100, height: 100, groupId: 'group-1' } }),
    element('c'),
  ];
  assert.deepEqual(collectStudioClipboardElements(elements, [], 'a').map((item) => item.id), ['a', 'b']);
});

test('source formatting paste creates new ids and remaps group membership together', () => {
  const sources = [
    element('a', { position: { x: 0, y: 0, width: 100, height: 100, groupId: 'old' } }),
    element('b', { position: { x: 120, y: 0, width: 100, height: 100, groupId: 'old' } }),
  ];
  const tokens = ['one', 'group', 'two'];
  const pasted = pasteStudioClipboardElements(sources, 'source-formatting', () => tokens.shift() || 'fallback');
  assert.deepEqual(pasted.map((item) => item.id), ['element-one', 'element-two']);
  assert.equal(pasted[0].position.groupId, 'group-group');
  assert.equal(pasted[1].position.groupId, 'group-group');
  assert.equal(pasted[0].content.color, '#ef4444');
});

test('the four PowerPoint-style paste modes produce distinct content contracts', () => {
  const source = element('source');
  const destination = pasteStudioClipboardElements([source], 'destination-theme', () => 'theme')[0];
  const sourceFormatting = pasteStudioClipboardElements([source], 'source-formatting', () => 'source')[0];
  const picture = pasteStudioClipboardElements([source], 'picture', () => 'picture')[0];
  const textOnly = pasteStudioClipboardElements([source], 'text-only', () => 'text')[0];

  assert.equal(destination.content.fontFamily, 'Arial');
  assert.equal(destination.content.color, '#0f172a');
  assert.equal(sourceFormatting.content.fontFamily, 'Georgia');
  assert.equal(picture.type, 'visual');
  assert.match(String(picture.content.url), /^data:image\/svg\+xml/);
  assert.equal(textOnly.type, 'text');
  assert.deepEqual(textOnly.content, {
    text: 'source', color: '#0f172a', fontFamily: 'Arial', fontSize: 32, alignment: 'left',
  });
});

test('paste options are derived from the copied element type', () => {
  assert.deepEqual(studioPasteModesForElements([element('text')]), ['destination-theme', 'source-formatting', 'picture', 'text-only']);
  assert.deepEqual(studioPasteModesForElements([element('shape', { type: 'shape', content: { kind: 'rectangle', fill: '#fff' } })]), ['destination-theme', 'source-formatting', 'picture']);
  assert.deepEqual(studioPasteModesForElements([element('model', { type: 'visual', resource: { resource_id: 1, resource_version_id: 1, usage: { slot_id: 'free-model', resource_type: 'model_3d' } } })]), ['destination-theme', 'source-formatting']);
});

test('Format Painter transfers presentation formatting without replacing target content', () => {
  const source = element('source');
  const target = element('target', { content: { text: 'Keep this text', color: '#000000', fontSize: 18 } });
  const painted = applyStudioElementFormat(target, copyStudioElementFormat(source));
  assert.equal(painted.content.text, 'Keep this text');
  assert.equal(painted.content.color, '#ef4444');
  assert.equal(painted.content.fontFamily, 'Georgia');
  assert.equal(painted.content.bold, true);
});

test('Format Painter ignores incompatible element families', () => {
  const source = element('source');
  const shape = element('shape', { type: 'shape', content: { kind: 'rectangle', fill: '#ffffff' } });
  assert.deepEqual(applyStudioElementFormat(shape, copyStudioElementFormat(source)), shape);
});
