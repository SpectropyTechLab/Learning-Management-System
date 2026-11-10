import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const readFrontend = (relativePath) =>
  fs.readFileSync(
    new URL(`../../frontend/src/features/teaching-studio/${relativePath}`, import.meta.url),
    'utf8',
  );

test('AutoSave preserves Screen undo and redo history', () => {
  const editor = readFrontend('TeachingStudioPage.tsx');
  const saveStart = editor.indexOf('const saveScreenDraft');
  const saveEnd = editor.indexOf('saveDraftRef.current = saveScreenDraft');
  const saveImplementation = editor.slice(saveStart, saveEnd);
  assert.ok(saveStart > 0 && saveEnd > saveStart);
  assert.doesNotMatch(saveImplementation, /setElementPast\(\[\]\)/);
  assert.doesNotMatch(saveImplementation, /setElementFuture\(\[\]\)/);
  assert.match(editor, /setHasUnsavedChanges\(true\);\s*setSaveStatus\('pending'\)/);
  assert.match(editor, /key === 'y' \|\| \(key === 'z' && event\.shiftKey\)/);
});
test('Studio tools and context ribbon use compact toggle controls', () => {
  const editor = readFrontend('TeachingStudioPage.tsx');
  assert.match(editor, /studioTools\.map/);
  assert.match(editor, /toggleStudioTool\(tool\.id\)/);
  assert.match(editor, /flex w-11 shrink-0 flex-col/);
  assert.match(editor, /leftPanelView !== 'script' \|\| !open/);
  assert.match(editor, /studio-context-bar shrink-0/);
  assert.doesNotMatch(editor, /Hide context controls|Show context and actions|contextBarOpen/);
});

test('Cursor-aware lists and element hyperlinks reach authoring and playback', () => {
  const toolbar = readFrontend('components/StudioElementToolbar.tsx');
  const canvasText = readFrontend('components/StudioCanvasTextElement.tsx');
  const canvas = readFrontend('components/BlankScreenCanvas.tsx');
  const player = readFrontend('StudioSessionPlayerPage.tsx');
  assert.match(toolbar, /Bullet and numbering styles/);
  assert.match(toolbar, /dispatchStudioTextCommand/);
  assert.match(canvasText, /insertUnorderedList/);
  assert.match(canvasText, /insertOrderedList/);
  assert.match(canvasText, /sanitizeStudioRichText/);
  assert.match(canvas, /StudioHyperlinkOverlay/);
  assert.match(player, /StudioHyperlinkOverlay/);
});

test('Studio editor uses one stable tooltip and converts every selected line into a list item', () => {
  const iconButton = readFrontend('components/StudioIconButton.tsx');
  const canvasText = readFrontend('components/StudioCanvasTextElement.tsx');
  assert.match(iconButton, /title=\{buttonProps\.title \?\? label\}/);
  assert.doesNotMatch(iconButton, /role="tooltip"/);
  assert.match(canvasText, /selectedLines\.forEach/);
  assert.match(canvasText, /document\.createElement\('li'\)/);
  assert.match(canvasText, /selectedRange\.insertNode\(list\)/);
});

test('Screen navigation is a PowerPoint-style thumbnail rail with pointer reordering', () => {
  const editor = readFrontend('TeachingStudioPage.tsx');
  assert.match(editor, /data-reorder-screen-id=\{screenId\}/);
  assert.match(editor, /setPointerCapture\(event\.pointerId\)/);
  assert.match(editor, /onPointerMove=\{leftPanelView === 'screens' \? moveDraggedScreen/);
  assert.match(editor, /void selectScreen\(screenId\)/);
  assert.match(editor, /void saveScreenOrder\(reorderIdsRef\.current\)/);
  assert.doesNotMatch(editor, /reorderOpen/);
  assert.doesNotMatch(editor, /studio-context-secondary/);
});

test('Reorder toggles closed and selected objects automatically open their applicable inspector', () => {
  const editor = readFrontend('TeachingStudioPage.tsx');
  assert.match(editor, /leftPanelOpen && leftPanelView === 'screens'/);
  assert.match(editor, /setLeftPanelOpen\(false\);\s*return;/);
  assert.match(editor, /const selectElementAndOpenControls/);
  assert.match(editor, /isSmartDiagramContent\(element\?\.content\)/);
  assert.match(editor, /element\?\.type === 'math'/);
  assert.match(editor, /element\?\.type === 'shape'/);
  assert.match(editor, /setPanel\(nextPanel\);\s*setRightPanelOpen\(true\)/);
  assert.match(editor, /onSelectElement=\{selectElementAndOpenControls\}/);
});
