import assert from 'node:assert/strict';
import test from 'node:test';
import { ACTIVITY_SCENES, ACTIVITY_TEMPLATES, createActivityDocument, validateActivityDocument } from './activityBuilderModel.ts';
import { buildStandaloneActivityHtml } from './activityExport.ts';
import { applyActivityScore } from './activityScoring.ts';
import { drawActivityScene } from './activitySceneRenderer.ts';

test('the Activity ribbon has a configured starting value for every supported type', () => {
  assert.equal(ACTIVITY_TEMPLATES.length, 20);
  for (const template of ACTIVITY_TEMPLATES) {
    const activity = createActivityDocument(template.id);
    assert.equal(activity.activityType, template.id);
    assert.ok(activity.content.length > 0);
    assert.equal(validateActivityDocument(activity).schema, 'spectropy.activity.v1');
  }
});

test('the Activity Builder exposes every prototype scene and all three layouts', () => {
  assert.equal(ACTIVITY_SCENES.length, 27);
  assert.deepEqual(new Set(ACTIVITY_SCENES.map((scene) => scene.subject)), new Set(['General Science', 'Physics', 'Chemistry', 'Mathematics', 'Biology']));
  for (const layout of ['split', 'wide', 'activity'] as const) {
    const activity = createActivityDocument('mcq');
    activity.layout = layout;
    activity.scene = ACTIVITY_SCENES.at(-1)?.id || 'grid';
    const html = buildStandaloneActivityHtml(activity);
    assert.match(html, new RegExp(`"layout":"${layout}"`));
    assert.match(html, /"scene":"neuron"/);
  }
});

test('every built-in scene uses the exact shared prototype canvas renderer', () => {
  const source = drawActivityScene.toString();
  for (const scene of ACTIVITY_SCENES) assert.match(source, new RegExp(`case ['\"]${scene.id}['\"]`));
  const html = buildStandaloneActivityHtml(createActivityDocument('mcq'));
  assert.match(html, /drawActivityScene/);
  assert.match(html, /requestAnimationFrame\(paintScene\)/);
  assert.match(html, /scene-canvas/);
});

test('Activity export is a standalone simulation HTML document with executable runtime code', () => {
  const activity = createActivityDocument('mcq');
  activity.title = '<Motion & Force>';
  const html = buildStandaloneActivityHtml(activity);
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /spectropy\.activity\.v1/);
  assert.doesNotMatch(html, /<title><Motion/);
  const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
  assert.ok(script);
  assert.doesNotThrow(() => Function(script));
});

test('Activity rules apply correct points and negative marks exactly once per submitted answer', () => {
  assert.equal(applyActivityScore(0, true, 4, 1), 4);
  assert.equal(applyActivityScore(4, false, 4, 1), 3);
  assert.equal(applyActivityScore(3, false, 4, -5), 3);
});

test('exported Activity runtime contains timer, delayed reveal, shuffle, and scene media behavior', () => {
  const activity = createActivityDocument('mcq');
  activity.timer = 15;
  activity.instantReveal = false;
  activity.shuffle = true;
  activity.sceneSource = 'external';
  activity.sceneUrl = 'https://example.com/scene.gif';
  activity.sceneMediaFit = 'contain';
  const html = buildStandaloneActivityHtml(activity);
  assert.match(html, /setInterval/);
  assert.match(html, /if\(A\.instantReveal\)revealAnswer/);
  assert.match(html, /const items=shuffle\(parsed\(\)\)/);
  assert.match(html, /scene-media/);
  assert.match(html, /"sceneMediaFit":"contain"/);
  assert.match(html, /A\.sceneMediaFit\|\|'cover'/);
  assert.match(html, /color-scheme:dark/);
});
