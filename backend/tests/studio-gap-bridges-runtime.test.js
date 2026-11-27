import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('published manifests freeze local Gap Bridges separately from linear Screens', () => {
  const service = read('../services/studioReleases.service.js');
  assert.match(service, /manifest_version: 5/);
  assert.match(service, /gap_bridges: serializeGapBridges/);
  assert.match(service, /gap_bridge_screens: serializeManifestScreens/);
  assert.match(service, /WHERE sc\.session_id = \$1 AND sc\.screen_kind = 'main'/);
});

test('protected resolver uses the source snapshot and latest same-tenant destination release', () => {
  const routes = read('../routes/studioReleases.routes.js');
  const service = read('../services/studioReleases.service.js');
  const controller = read('../controllers/studioReleases.controller.js');
  assert.match(routes, /published-releases\/:sourceReleaseId\/gap-bridges\/:gapBridgeId\/resolve/);
  assert.match(service, /export const resolvePublishedGapBridge/);
  assert.match(service, /client_id IS NOT DISTINCT FROM \$2/);
  assert.match(service, /GAP_BRIDGE_TARGET_UNAVAILABLE/);
  assert.match(controller, /handleStudioServiceError\(res, error, 'Gap Bridge resolution failed'\)/);
});

test('external resolution includes published Gap Bridge child Screens', () => {
  const releasesService = read('../services/studioReleases.service.js');
  const workflowService = read('../services/studioSessionWorkflow.service.js');
  assert.match(releasesService, /manifest_json\?\.gap_bridge_screens/);
  assert.match(workflowService, /manifest_json->'gap_bridge_screens'/);
});

test('teacher player keeps Gap Bridge separate from Branching and returns to the mounted parent', () => {
  const player = read('../../frontend/src/features/teaching-studio/StudioSessionPlayerPage.tsx');
  assert.match(player, /title="Gap Bridge"/);
  assert.match(player, /title=\{discoveryPanelOpen \? 'Close Branching' : 'Branching'\}/);
  assert.match(player, /gapBridgeRun \? \(/);
  assert.match(player, /Return to parent Screen/);
  assert.match(player, /onClick=\{closeGapBridge\}[^>]*>[\s\S]*Previous/);
  assert.match(player, /Previous[\s\S]*onClick=\{closeGapBridge\}[^>]*>[\s\S]*Next/);
  assert.match(player, /gapBridge: gapBridgeRun/);
  assert.match(player, /const incoming = state\.gapBridge \|\| null/);
  assert.match(player, /data-gap-bridge-parent/);
  assert.match(player, /gap_bridge_screens\?\.find\(\(candidate\) => candidate\.screen_id === requestedScreenId\)/);
  assert.match(player, /previewMode=\{previewMode\} gapBridgeContext/);
});

test('Gap Bridge resource authorization is limited to the resolved Screen', () => {
  const service = read('../services/studioReleases.service.js');
  const api = read('../../frontend/src/features/teaching-studio/api/studioPublishedApi.ts');
  assert.match(service, /Resource version is not part of this Gap Bridge Screen/);
  assert.match(api, /source_release_id: context\.sourceReleaseId/);
  assert.match(api, /gap_bridge_id: context\.gapBridgeId/);
  assert.match(api, /resolvePublishedGapBridge/);
});
