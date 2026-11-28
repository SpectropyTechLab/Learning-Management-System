import assert from 'node:assert/strict';
import test from 'node:test';
import { studioScreenCacheKey, studioScreenPreloadResources, studioScreensAround } from './studioScreenPreloadModel.ts';
import type { StudioScreen } from './types';

const screen = (id: number, revision_no = 1, elements: StudioScreen['elements'] = []): StudioScreen => ({
  id,
  session_id: 7,
  title: `Screen ${id}`,
  screen_number: id,
  display_order: id,
  creation_mode: 'blank',
  layout_id: null,
  revision_no,
  screen_settings_json: null,
  elements,
  tags: [],
  branches: [],
});

const resourceElement = (
  id: string,
  versionId: number,
  resourceType: string,
  hidden = false,
): StudioScreen['elements'][number] => ({
  id,
  slotId: `free-${id}`,
  type: 'visual',
  content: {},
  position: { x: 0, y: 0, width: 100, height: 100, hidden },
  resource: {
    resource_id: versionId + 100,
    resource_version_id: versionId,
    usage: { slot_id: `free-${id}`, resource_type: resourceType },
  },
});

test('adjacent screen selection follows navigator order without wrapping around', () => {
  const screens = [screen(11), screen(12), screen(13)];
  assert.deepEqual(studioScreensAround(screens, 12), { next: screens[2], previous: screens[0] });
  assert.deepEqual(studioScreensAround(screens, 11), { next: screens[1], previous: null });
  assert.deepEqual(studioScreensAround(screens, 13), { next: null, previous: screens[1] });
  assert.deepEqual(studioScreensAround(screens, 99), { next: null, previous: null });
});

test('screen cache keys change when the saved revision changes', () => {
  assert.equal(studioScreenCacheKey(screen(12, 4)), '12:4');
  assert.notEqual(studioScreenCacheKey(screen(12, 4)), studioScreenCacheKey(screen(12, 5)));
});

test('resource preloading collects each visible resource binding once for safe metadata caching', () => {
  const target = screen(1, 1, [
    resourceElement('image-a', 40, 'image'),
    resourceElement('image-a-copy', 40, 'image'),
    resourceElement('video-a', 41, 'video'),
    resourceElement('document-a', 44, 'document'),
    resourceElement('activity-a', 42, 'simulation'),
    resourceElement('hidden-image', 43, 'image', true),
  ]);
  assert.deepEqual(studioScreenPreloadResources(target), [
    { versionId: 40, resourceId: 140, resourceType: 'image' },
    { versionId: 41, resourceId: 141, resourceType: 'video' },
    { versionId: 44, resourceId: 144, resourceType: 'document' },
    { versionId: 42, resourceId: 142, resourceType: 'simulation' },
  ]);
});

test('resource preloading includes screen and shape background image fills', () => {
  const target = screen(2, 1, [{
    id: 'shape', slotId: 'free-shape', type: 'shape', position: {},
    content: { backgroundImage: { resourceId: 202, resourceVersionId: 102, name: 'Shape', fit: 'cover', scale: 1, x: 0, y: 0, opacity: 1 } },
  }]);
  target.screen_settings_json = { backgroundImage: { resourceId: 201, resourceVersionId: 101, name: 'Screen', fit: 'cover', scale: 1, x: 0, y: 0, opacity: 1 } };
  assert.deepEqual(studioScreenPreloadResources(target), [
    { versionId: 101, resourceId: 201, resourceType: 'image' },
    { versionId: 102, resourceId: 202, resourceType: 'image' },
  ]);
});
