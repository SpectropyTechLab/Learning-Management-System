import assert from 'node:assert/strict';
import test from 'node:test';
import {
  preferredStudioRibbonTab,
  studioContextualRibbonTabs,
  studioRibbonTabs,
} from './studioRibbonModel.ts';

test('permanent tabs remain available without a selection', () => {
  assert.deepEqual(
    studioRibbonTabs({}).map((tab) => tab.id),
    ['home', 'insert', 'draw', 'design', 'transitions', 'animations', 'present', 'review', 'view'],
  );
});
test('element selection exposes only its applicable contextual tabs', () => {
  assert.deepEqual(
    studioContextualRibbonTabs({ elementType: 'shape', selectionCount: 1 }).map((tab) => tab.id),
    ['shape-format'],
  );
  assert.deepEqual(
    studioContextualRibbonTabs({ elementType: 'visual', resourceType: 'model_3d' }).map(
      (tab) => tab.id,
    ),
    ['3d-model'],
  );
  assert.deepEqual(
    studioContextualRibbonTabs({ elementType: 'visual', resourceType: 'image' }).map(
      (tab) => tab.id,
    ),
    ['picture-format'],
  );
});

test('a newly selected contextual family becomes the preferred tab', () => {
  const tabs = studioRibbonTabs({ elementType: 'shape' });
  assert.equal(preferredStudioRibbonTab('home', [], tabs), 'shape-format');
  assert.equal(preferredStudioRibbonTab('shape-format', ['shape-format'], tabs), 'shape-format');
  assert.equal(
    preferredStudioRibbonTab('shape-format', ['shape-format'], studioRibbonTabs({})),
    'home',
  );
});
