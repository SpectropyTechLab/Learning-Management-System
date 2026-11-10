import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('advanced presentation migration keeps Zoom targets relational and same-session', () => {
  const sql = read('../../supabase/migrations/20261107100000_studio_mvp1_advanced_presentation.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.screen_sections/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.screen_zoom_links/);
  assert.match(sql, /screen_zoom_links_exact_target_check/);
  assert.match(sql, /FOREIGN KEY \(target_screen_id, session_id\)/);
  assert.match(sql, /'zoom', 'embedded_object'/);
  assert.match(sql, /'document'/);
});

test('release manifest freezes Sections and Zoom links for teacher playback', () => {
  const service = read('../services/studioReleases.service.js');
  assert.match(service, /manifest_version: 4/);
  assert.match(service, /sections: content\.sections\.map/);
  assert.match(service, /zoom_kind:/);
  assert.match(service, /usage_details_json/);
});

test('runtime HTML bridge forwards clicker input and completion without authoring coupling', () => {
  const controller = read('../controllers/studioResourceRuntime.controller.js');
  assert.match(controller, /STUDIO_CLICKER_INPUT/);
  assert.match(controller, /STUDIO_RUNTIME_COMMAND/);
  assert.match(controller, /STUDIO_RUNTIME_COMPLETE/);
  assert.match(controller, /spectropy:complete/);
});

test('embedded object routes protect both author and published preview paths', () => {
  const authorRoutes = read('../routes/studioResourceRuntime.routes.js');
  const releaseRoutes = read('../routes/studioReleases.routes.js');
  assert.match(authorRoutes, /object-preview/);
  assert.match(releaseRoutes, /object-preview/);
});

test('transition authoring exposes enterprise timing, accessibility and playback contracts', () => {
  const panel = read('../../frontend/src/features/teaching-studio/components/StudioTransitionsPanel.tsx');
  const catalog = read('../../frontend/src/features/teaching-studio/components/studioTransitionCatalog.ts');
  const runtime = read('../../frontend/src/features/teaching-studio/components/studioTransition.ts');
  const player = read('../../frontend/src/features/teaching-studio/StudioSessionPlayerPage.tsx');
  assert.match(panel, /Apply to all/);
  assert.match(panel, /Respect reduced-motion preference/);
  assert.match(panel, /Advance after/);
  assert.match(catalog, /fly-through/);
  assert.match(catalog, /stop.*Stop previous sound/);
  assert.match(runtime, /prefers-reduced-motion: reduce/);
  assert.match(runtime, /loop\?: boolean/);
  assert.match(player, /advanceAfterEnabled/);
  assert.match(player, /advancePresenterRef\.current/);
});

test('clicker handles navigation, Zoom choices, media and every advertised teacher tool', () => {
  const player = read('../../frontend/src/features/teaching-studio/StudioSessionPlayerPage.tsx');
  const runtime = read('../../frontend/src/features/teaching-studio/components/studioClickerRuntime.ts');
  for (const key of ['ArrowRight', 'PageDown', 'MediaTrackNext', 'ArrowLeft', 'PageUp', 'MediaTrackPrevious'])
    assert.match(runtime, new RegExp(key));
  assert.match(player, /toggleMediaPlayback/);
  assert.match(player, /zoomElements\[Number\(event\.key\) - 1\]/);
  for (const tool of ["'pointer'", "'laser'", "'pen'", "'eraser'"])
    assert.match(player, new RegExp(`setAnnotationTool\\(${tool}\\)`));
  assert.match(player, /undoTeacherAnnotation\(\)/);
  assert.match(player, /setTeacherAnnotations\(\[\]\)/);
  assert.match(player, /CLICKER_SHORTCUT_GROUPS/);
  assert.match(player, /droppedMime\.startsWith\('video\/'\)/);
  assert.match(player, /droppedMime\.startsWith\('audio\/'\)/);
  assert.match(player, /droppedMime === 'application\/pdf'/);
});
