import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Studio editor exposes responsive drawers instead of a fixed desktop-only canvas grid', () => {
  const page = read('frontend/src/features/teaching-studio/TeachingStudioPage.tsx');
  const css = read('frontend/src/assets/index.css');

  assert.match(page, /studio-editor-workspace/);
  assert.match(page, /studio-editor-left-panel/);
  assert.match(page, /studio-editor-tools-panel/);
  assert.match(css, /@media \(max-width: 1023px\)/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) !important/);
  assert.match(css, /width: min\(92vw, 380px\)/);
});

test('Studio canvas drag, resize and drawing use cancellable Pointer Events with touch-safe handles', () => {
  const canvas = read('frontend/src/features/teaching-studio/SlideCanvas.tsx');

  assert.match(canvas, /addEventListener\('pointercancel', finish/);
  assert.match(canvas, /setPointerCapture\?\.\(event\.pointerId\)/);
  assert.match(canvas, /min-h-11 min-w-11 touch-none/);
  assert.match(canvas, /h-11 w-11 touch-none/);
});

test('Touch devices can reach hover-only controls and close menus using pointer input', () => {
  const css = read('frontend/src/assets/index.css');
  const accountMenu = read('frontend/src/features/teaching-studio/components/StudioAccountMenu.tsx');
  const resourceLibrary = read('frontend/src/features/teaching-studio/components/resources/ResourceLibrary.tsx');

  assert.match(css, /@media \(hover: none\), \(pointer: coarse\)/);
  assert.match(css, /\.studio-resource-fullscreen[\s\S]*opacity: 1 !important/);
  assert.match(accountMenu, /addEventListener\('pointerdown', close\)/);
  assert.match(resourceLibrary, /addEventListener\('pointerdown', closeMenu\)/);
  assert.doesNotMatch(accountMenu, /addEventListener\('mousedown'/);
});

test('Floating whiteboards remain draggable and resizable inside phone and tablet viewports', () => {
  const whiteboard = read('frontend/src/features/teaching-studio/components/FloatingWhiteboards.tsx');
  const uuid = read('frontend/src/utils/createClientUuid.ts');

  assert.match(whiteboard, /fitBoardToViewport/);
  assert.match(whiteboard, /createClientUuid\(\)/);
  assert.doesNotMatch(whiteboard, /crypto\.randomUUID\(\)/);
  assert.match(whiteboard, /distanceToSegment/);
  assert.match(whiteboard, /eraserHitsStroke/);
  assert.match(whiteboard, /strokeId: '__eraser__'/);
  assert.doesNotMatch(whiteboard, /tool === 'eraser' && event\.buttons/);
  assert.match(uuid, /getRandomValues/);
  assert.match(uuid, /0x40/);
  assert.match(whiteboard, /orientationchange/);
  assert.match(whiteboard, /onPointerCancel/);
  assert.match(whiteboard, /max-w-\[calc\(100vw-1rem\)\]/);
  assert.match(whiteboard, /h-11 w-11 touch-none cursor-nwse-resize/);
});

test('Session Player uses responsive teacher controls and touch-sized navigation', () => {
  const player = read('frontend/src/features/teaching-studio/StudioSessionPlayerPage.tsx');
  const layout = read('frontend/src/components/layout/DashboardLayout.tsx');

  assert.match(player, /studio-player-controls/);
  assert.match(player, /grid-cols-\[3rem_minmax\(0,1fr\)\]/);
  assert.match(player, /audienceMode \? 'grid-cols-1 gap-0 p-0' : fullScreen \? 'grid-cols-1 gap-0 px-0 pb-14 pt-0'/);
  assert.match(player, /min-h-11 touch-manipulation/);
  assert.match(layout, /100dvh/);
});
