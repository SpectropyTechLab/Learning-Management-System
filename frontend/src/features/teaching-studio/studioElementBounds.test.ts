import assert from 'node:assert/strict';
import test from 'node:test';
import type { StudioElement } from './types.ts';
import { prepareStudioElementForSave, preserveStudioElementBounds } from './studioElementBounds.ts';

const element = (type: string, position: StudioElement['position'], content: StudioElement['content'] = {}): StudioElement => ({
  id: 'element-1', slotId: 'free-element-1', type, content, position,
});

test('allows shapes to extend beyond the bottom or right canvas edge', () => {
  const shape = element('shape', { x: 1800, y: 1000, width: 300, height: 200 });
  assert.deepEqual(preserveStudioElementBounds(shape, { x: 1800, y: 1000, width: 300, height: 200 }), {
    x: 1800, y: 1000, width: 300, height: 200,
  });
});

test('allows text frames to auto-grow below the bottom canvas edge', () => {
  const text = element('text', { x: 100, y: 1000, width: 500, height: 400 });
  assert.deepEqual(preserveStudioElementBounds(text, { x: 100, y: 1000, width: 500, height: 400 }), {
    x: 100, y: 1000, width: 500, height: 400,
  });
});

test('preserves overflowing shape geometry and position metadata when saving', () => {
  const shape = element('shape', { x: 1900, y: 1070, width: 100, height: 100, rotation: 25, zIndex: 4 });
  assert.deepEqual(prepareStudioElementForSave(shape).position, {
    x: 1900, y: 1070, width: 100, height: 100, rotation: 25, zIndex: 4,
  });
});

test('preserves small imported elements even when they extend beyond the canvas', () => {
  const imported = element('visual', { x: 1919, y: 1079, width: 4, height: 3 }, { importSource: {} });
  assert.deepEqual(prepareStudioElementForSave(imported).position, {
    x: 1919, y: 1079, width: 4, height: 3,
  });
});
