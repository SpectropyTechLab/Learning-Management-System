import assert from 'node:assert/strict';
import test from 'node:test';
import { PHYSICS_OBJECT_CATEGORIES, PHYSICS_OBJECT_LIBRARY } from './physicsObjectLibrary.ts';

test('Physics object library preserves the complete source registry', () => {
  assert.equal(PHYSICS_OBJECT_LIBRARY.length, 59);
  PHYSICS_OBJECT_CATEGORIES.forEach((category) => {
    assert.ok(PHYSICS_OBJECT_LIBRARY.some((entry) => entry.category === category), category);
  });
});

test('Physics object definitions retain defaults and all 3D solids', () => {
  const lens = PHYSICS_OBJECT_LIBRARY.find((entry) => entry.type === 'lens');
  assert.deepEqual(lens?.properties, { x: '0', y: '0', h: '10', f: '10', marks: '1' });
  assert.equal(PHYSICS_OBJECT_LIBRARY.filter((entry) => entry.dimension === '3d').length, 8);
  assert.ok(PHYSICS_OBJECT_LIBRARY.some((entry) => entry.type === 'axes3d'));
});
