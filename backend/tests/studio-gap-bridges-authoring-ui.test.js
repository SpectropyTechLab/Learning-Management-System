import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (relativePath) => fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8');

const api = read('../../frontend/src/features/teaching-studio/api/studioGapBridgesApi.ts');
const pane = read('../../frontend/src/features/teaching-studio/components/StudioGapBridgePane.tsx');
const ribbonAdd = read('../../frontend/src/features/teaching-studio/components/StudioGapBridgeRibbonAdd.tsx');
const editor = read('../../frontend/src/features/teaching-studio/TeachingStudioPage.tsx');
const ribbon = read('../../frontend/src/features/teaching-studio/components/studioRibbonModel.ts');
const thumbnail = read('../../frontend/src/features/teaching-studio/components/StudioPublishedScreenThumbnail.tsx');

test('Milestone 3 client covers every author Gap Bridge endpoint', () => {
  assert.match(api, /studio\/screens\/\$\{screenId\}\/gap-bridges`/);
  assert.match(api, /gap-bridges\/external/);
  assert.match(api, /gap-bridges\/child/);
  assert.match(api, /studio\/gap-bridges\/\$\{gapBridgeId\}/);
  assert.match(api, /gap-bridges\/reorder/);
  assert.match(api, /gap-bridges\/\$\{gapBridgeId\}\/move-child/);
  assert.match(api, /studio\/gap-bridge-targets/);
  assert.match(api, /data: \{ source_session_revision_no: sourceSessionRevisionNo \}/);
});

test('expanded Gap Bridge authoring uses a dedicated ribbon, right pane and complete Branching filters', () => {
  assert.match(ribbon, /'gap-bridge'/);
  assert.match(editor, /case 'gap-bridge'/);
  assert.match(ribbonAdd, /Create new/);
  assert.match(ribbonAdd, /Select existing/);
  assert.match(ribbonAdd, /createPortal/);
  assert.match(ribbonAdd, /studio-ribbon-command/);
  assert.match(pane, /createPortal/);
  assert.match(pane, /document\.body/);
  assert.match(editor, /Gap Bridge Pane/);
  assert.match(editor, /id: 'gap-bridge-rename'/);
  assert.match(editor, /onExecute: openGapBridgeRename/);
  assert.match(editor, /aria-label="Rename Gap Bridge"/);
  assert.match(editor, /renameSelectedGapBridge/);
  assert.doesNotMatch(editor, /Manage Gap Bridge/);
  assert.match(pane, /MoreVertical/);
  assert.match(pane, /Hierarchy/);
  assert.match(pane, /All results/);
  assert.match(pane, /Chapter \{targetContext\.chapter_number\}/);
  assert.match(pane, /Topic · \{topic\.title\}/);
  assert.match(pane, /Session · \{group\.title\}/);
  assert.match(pane, /StudioPublishedScreenThumbnail/);
  assert.match(thumbnail, /preview_screen/);
  assert.match(pane, /Gap Bridge child/);
  assert.match(pane, /topicId/);
  assert.match(pane, /subtopicId/);
  assert.match(pane, /tags/);
  assert.match(pane, /pedagogy/);
  assert.match(pane, /bloom/);
  assert.match(pane, /targetExam/);
});

test('Gap Bridge author panel supports published targets, local children and management actions', () => {
  assert.match(pane, /Select an existing published Screen/);
  assert.match(pane, /Create a child Screen/);
  assert.match(pane, /Search Sessions and Screens/);
  assert.match(pane, /Create new/);
  assert.doesNotMatch(pane, /Choose existing/);
  assert.doesNotMatch(pane, /Edit child/);
  assert.match(pane, /Preview/);
  assert.doesNotMatch(pane, /replace_child/);
  assert.doesNotMatch(pane, /Replace with child/);
  assert.match(pane, /while \(cursor\)/);
  assert.match(pane, /reloadRequestRef/);
  assert.match(pane, /studio\/player\/\$\{sourceSessionId\}\/preview\?screen=/);
  assert.match(pane, /reorderStudioGapBridges/);
  assert.match(pane, /Drag to reorder/);
  assert.match(pane, /permanently deletes the child Screen/);
  assert.match(pane, /details\.status === 409/);
});

test('Insert ribbon and Screen navigator keep Gap Bridge children outside linear navigation', () => {
  assert.match(editor, /id: 'insert-navigation'/);
  assert.match(editor, /label: 'Navigation'/);
  assert.match(editor, /id: 'manage-gap-bridges'/);
  assert.match(editor, /label: 'Gap Bridge'/);
  assert.match(editor, /selectedIsGapBridgeChild/);
  assert.doesNotMatch(editor, /outside the numbered Session flow/);
  assert.doesNotMatch(editor, />Return to parent</);
  assert.doesNotMatch(editor, /id: 'gap-bridge-edit-child'/);
  assert.doesNotMatch(editor, /moveStudioGapBridgeChild/);
  assert.doesNotMatch(editor, /data-child-drop-screen-id/);
  assert.doesNotMatch(editor, /Drag child to another parent Screen/);
  assert.match(editor, /onCommandHandled/);
  assert.match(editor, /gapBridgeActive: gapBridgeRibbonVisible/);
  assert.match(ribbon, /selection\.gapBridgeActive/);
  assert.match(editor, /gapBridgesBySource\[screenId\]/);
  assert.match(editor, /Child ·/);
  assert.match(editor, /Remove a child Screen from its parent Gap Bridge panel/);
});
