import assert from 'node:assert/strict';
import test from 'node:test';
import type { StudioElement } from '../types.ts';
import {
  moveStudioLayer,
  orderedStudioLayers,
  reorderStudioLayers,
  studioLayerName,
  selectionForStudioObjectClick,
  updateStudioLayer,
} from './studioLayerModel.ts';

const element = (id: string, zIndex: number, text = ''): StudioElement => ({
  id,
  slotId: null,
  type: 'text',
  content: { text },
  position: { x: 0, y: 0, width: 100, height: 80, zIndex },
});
test('layers are listed from front to back with meaningful fallback names', () => {
  const layers = orderedStudioLayers([element('back', 1), element('front', 4, 'Heading')]);
  assert.deepEqual(
    layers.map((layer) => layer.id),
    ['front', 'back'],
  );
  assert.equal(studioLayerName(layers[0]), 'Heading');
});

test('visibility and locking update without deleting the element', () => {
  const layers = updateStudioLayer([element('one', 1)], 'one', { hidden: true, locked: true });
  assert.equal(layers.length, 1);
  assert.equal(layers[0].position.hidden, true);
  assert.equal(layers[0].position.locked, true);
});

test('moving a layer changes stacking order atomically', () => {
  const layers = [element('back', 1), element('middle', 2), element('front', 3)];
  const moved = moveStudioLayer(layers, 'middle', 'forward');
  assert.deepEqual(
    orderedStudioLayers(moved).map((layer) => layer.id),
    ['middle', 'front', 'back'],
  );
});

test('drag ordering persists one complete front-to-back layer order', () => {
  const layers = [element('back', 1), element('middle', 2), element('front', 3)];
  const reordered = reorderStudioLayers(layers, ['back', 'front', 'middle']);
  assert.deepEqual(
    orderedStudioLayers(reordered).map((layer) => layer.id),
    ['back', 'front', 'middle'],
  );
});

test('group selection drills into an individual member on the second click', () => {
  const one = { ...element('one', 1), position: { ...element('one', 1).position, groupId: 'group-a' } };
  const two = { ...element('two', 2), position: { ...element('two', 2).position, groupId: 'group-a' } };
  assert.deepEqual(selectionForStudioObjectClick([one, two], [], 'one'), ['one', 'two']);
  assert.deepEqual(selectionForStudioObjectClick([one, two], ['one', 'two'], 'one'), ['one']);
  assert.deepEqual(selectionForStudioObjectClick([one, two], ['one'], 'one'), ['one']);
});

test('direct layer selection bypasses imported group expansion', () => {
  const one = { ...element('one', 1), position: { ...element('one', 1).position, groupId: 'group-a' } };
  const two = { ...element('two', 2), position: { ...element('two', 2).position, groupId: 'group-a' } };
  assert.deepEqual(selectionForStudioObjectClick([one, two], [], 'two', true), ['two']);
});
