import assert from 'node:assert/strict';
import test from 'node:test';
import { ACTIVITY_SCENES, ACTIVITY_SIMULATIONS, ACTIVITY_TEMPLATES, createActivityDocument, validateActivityDocument } from './activityBuilderModel.ts';
import { buildStandaloneActivityHtml } from './activityExport.ts';
import { ACTIVITY_PLAYER_SCRIPT, ACTIVITY_PLAYER_STYLES } from './activityPlayerBundle.generated.ts';
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

test('the Activity Builder exposes every prototype simulation model', () => {
  assert.equal(ACTIVITY_SIMULATIONS.length, 18);
  assert.deepEqual(new Set(ACTIVITY_SIMULATIONS.map((simulation) => simulation.subject)), new Set(['Physics', 'Chemistry', 'Mathematics', 'Biology']));
  const activity = createActivityDocument('sim');
  activity.simulation = 'mendel';
  assert.equal(validateActivityDocument(activity).simulation, 'mendel');
});

test('the Activity Builder exposes every prototype scene and all three layouts', async () => {
  assert.equal(ACTIVITY_SCENES.length, 27);
  assert.deepEqual(new Set(ACTIVITY_SCENES.map((scene) => scene.subject)), new Set(['General Science', 'Physics', 'Chemistry', 'Mathematics', 'Biology']));
  for (const layout of ['split', 'wide', 'activity'] as const) {
    const activity = createActivityDocument('mcq');
    activity.layout = layout;
    activity.scene = ACTIVITY_SCENES.at(-1)?.id || 'grid';
    const html = await buildStandaloneActivityHtml(activity);
    assert.match(html, new RegExp(`"layout":"${layout}"`));
    assert.match(html, /"scene":"neuron"/);
  }
});

test('every built-in scene uses the exact shared prototype canvas renderer', async () => {
  const source = drawActivityScene.toString();
  for (const scene of ACTIVITY_SCENES) assert.match(source, new RegExp(`case ['\"]${scene.id}['\"]`));
  const html = await buildStandaloneActivityHtml(createActivityDocument('mcq'));
  assert.match(html, /spectropy-activity-root/);
  for (const scene of ACTIVITY_SCENES) assert.match(ACTIVITY_PLAYER_SCRIPT, new RegExp(`["']${scene.id}["']`));
});

test('Activity export is a standalone simulation HTML document with executable runtime code', async () => {
  const activity = createActivityDocument('mcq');
  activity.title = '<Motion & Force>';
  const html = await buildStandaloneActivityHtml(activity);
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

test('exported Activity runtime embeds the shared player, styles, and activity data without a CDN', async () => {
  const activity = createActivityDocument('mcq');
  activity.timer = 15;
  activity.instantReveal = false;
  activity.shuffle = true;
  activity.sceneSource = 'external';
  activity.sceneUrl = 'https://example.com/scene.gif';
  activity.sceneMediaFit = 'contain';
  const html = await buildStandaloneActivityHtml(activity);
  assert.ok(ACTIVITY_PLAYER_SCRIPT.length > 100_000);
  assert.ok(ACTIVITY_PLAYER_STYLES.length > 10_000);
  assert.match(html, /window\.__SPECTROPY_ACTIVITY__/);
  assert.match(html, /spectropy-activity-root/);
  assert.match(html, /"sceneMediaFit":"contain"/);
  assert.doesNotMatch(html, /<script[^>]+src=/i);
});

test('exported Activity runtime keeps prototype behavior for assertion, numerical, and matching activities', () => {
  assert.match(ACTIVITY_PLAYER_SCRIPT, /Both A and R are true, and R is the correct explanation of A/);
  assert.match(ACTIVITY_PLAYER_SCRIPT, /Check answer/);
  assert.match(ACTIVITY_PLAYER_SCRIPT, /Click a left item and its match/);
});

test('every Activity type produces a standalone export with valid executable code', async () => {
  for (const template of ACTIVITY_TEMPLATES) {
    const html = await buildStandaloneActivityHtml(createActivityDocument(template.id));
    const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
    assert.ok(script, `${template.label} export must contain its runtime`);
    assert.doesNotThrow(() => Function(script), `${template.label} export runtime must parse`);
    assert.match(html, new RegExp(`"activityType":"${template.id}"`));
  }
});

test('exported game activities contain their interactive standalone controls', () => {
  assert.match(ACTIVITY_PLAYER_SCRIPT, /Keys: W A S D/);
  assert.match(ACTIVITY_PLAYER_SCRIPT, /Lives:/);
  assert.match(ACTIVITY_PLAYER_SCRIPT, /Playing/);
  assert.match(ACTIVITY_PLAYER_SCRIPT, /All matches/);
  assert.match(ACTIVITY_PLAYER_SCRIPT, /Crossword/);
  assert.match(ACTIVITY_PLAYER_SCRIPT, /Drag across a word/);
  assert.match(ACTIVITY_PLAYER_SCRIPT, /Sort into groups/);
  assert.match(ACTIVITY_PLAYER_SCRIPT, /Put these in order/);
});
