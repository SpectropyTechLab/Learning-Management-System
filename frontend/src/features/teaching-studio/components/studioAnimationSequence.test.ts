import assert from 'node:assert/strict';
import test from 'node:test';
import type { StudioElement } from '../types.ts';
import { buildStudioAnimationGroups, buildStudioAnimationSequence, persistStudioAnimationSequence } from './studioAnimationSequence.ts';
import { buildPresenterAnimationTimeline, presenterComponentBuildState, presenterElementPlaybackState, presenterMediaBookmarkCueIds, presenterTriggerCueIds } from './studioClickerRuntime.ts';

const element = (id: string, effects: Array<Record<string, unknown>>): StudioElement => ({
  id,
  slotId: null,
  type: 'shape',
  content: { text: id, animation: { effects } },
  position: { x: 0, y: 0, width: 100, height: 100 },
});

test('the Screen animation pane combines effects from every element', () => {
  const elements = [
    element('title', [{ id: 'fade', effect: 'fade', start: 'on-click' }]),
    element('image', [{ id: 'fly', effect: 'fly-in', start: 'after-previous' }, { id: 'pulse', effect: 'pulse', start: 'on-click' }]),
  ];
  assert.deepEqual(buildStudioAnimationSequence(elements).map((entry) => entry.key), ['title:fade', 'image:fly', 'image:pulse']);
});

test('cross-element drag order persists without moving effects between owners', () => {
  const elements = [
    element('title', [{ id: 'fade', effect: 'fade' }]),
    element('image', [{ id: 'fly', effect: 'fly-in' }, { id: 'pulse', effect: 'pulse' }]),
  ];
  const reordered = persistStudioAnimationSequence(elements, ['image:fly', 'title:fade', 'image:pulse']);
  assert.deepEqual(buildStudioAnimationSequence(reordered).map((entry) => entry.key), ['image:fly', 'title:fade', 'image:pulse']);
  assert.equal((reordered[0].content.animation as { effects: unknown[] }).effects.length, 1);
  assert.equal((reordered[1].content.animation as { effects: unknown[] }).effects.length, 2);
});

test('presenter playback follows the persisted global order across elements', () => {
  const elements = persistStudioAnimationSequence([
    element('title', [{ id: 'fade', effect: 'fade', start: 'on-click' }]),
    element('image', [{ id: 'fly', effect: 'fly-in', start: 'on-click' }]),
  ], ['image:fly', 'title:fade']);
  const timeline = buildPresenterAnimationTimeline(elements.map((item) => ({ element_key: item.id, content_json: item.content })));
  assert.deepEqual(timeline.cues.map((cue) => cue.elementKey), ['image', 'title']);
  assert.deepEqual(timeline.cues.map((cue) => cue.step), [1, 2]);
});

test('object triggers are excluded from ordinary click steps and activate by their target', () => {
  const timeline = buildPresenterAnimationTimeline([
    { element_key: 'button', content_json: {} },
    { element_key: 'answer', content_json: { animation: { effects: [{ id: 'answer-in', effect: 'appear', start: 'trigger', triggerElementId: 'button' }] } } },
  ]);
  assert.equal(timeline.maxStep, 0);
  assert.deepEqual(presenterTriggerCueIds(timeline, 'button'), ['answer-in']);
});

test('media bookmark triggers fire only when playback crosses the saved bookmark', () => {
  const timeline = buildPresenterAnimationTimeline([
    { element_key: 'answer', content_json: { animation: { effects: [{ id: 'bookmark-answer', effect: 'fade', start: 'trigger', triggerMediaElementId: 'video', triggerBookmarkSeconds: 12.5 }] } } },
  ]);
  assert.deepEqual(presenterMediaBookmarkCueIds(timeline, 'video', 10, 12), []);
  assert.deepEqual(presenterMediaBookmarkCueIds(timeline, 'video', 12, 13), ['bookmark-answer']);
});

test('table builds create one real click cue per row and expose incremental visibility', () => {
  const timeline = buildPresenterAnimationTimeline([
    { element_key: 'table', content_json: { rows: [['A', 'B'], ['C', 'D']], animation: { effects: [{ id: 'rows', effect: 'wipe', start: 'on-click', buildSequence: 'by-row' }] } } },
  ]);
  assert.equal(timeline.maxStep, 2);
  assert.deepEqual([...presenterComponentBuildState(timeline, 'table', 1)!.visibleItems], [0]);
  assert.deepEqual([...presenterComponentBuildState(timeline, 'table', 2)!.visibleItems], [0, 1]);
});

test('With Previous and After Previous retain exact cross-element timing', () => {
  const timeline = buildPresenterAnimationTimeline([
    { element_key: 'a', content_json: { animation: { effects: [{ id: 'a', effect: 'fade', start: 'on-click', duration: 1, delay: 0.2, sequenceOrder: 0 }] } } },
    { element_key: 'b', content_json: { animation: { effects: [{ id: 'b', effect: 'pulse', start: 'with-previous', duration: 0.5, delay: 0.1, sequenceOrder: 1 }] } } },
    { element_key: 'c', content_json: { animation: { effects: [{ id: 'c', effect: 'appear', start: 'after-previous', duration: 0.4, delay: 0.3, sequenceOrder: 2 }] } } },
  ]);
  assert.equal(timeline.maxStep, 1);
  assert.deepEqual(timeline.cues.map((cue) => cue.effect.runtimeDelay), [0.2, 0.3, 1.5]);
});

test('animation pane groups On Click, With Previous and After Previous like PowerPoint', () => {
  const groups = buildStudioAnimationGroups([
    element('a', [{ id: 'one', effect: 'fade', start: 'on-click', duration: 1 }]),
    element('b', [{ id: 'two', effect: 'pulse', start: 'with-previous', delay: 0.2, duration: 0.4 }]),
    element('c', [{ id: 'three', effect: 'appear', start: 'after-previous', delay: 0.1, duration: 0.5 }]),
    element('d', [{ id: 'four', effect: 'wipe', start: 'on-click' }]),
  ]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].entries.map((entry) => entry.effect.id), ['one', 'two', 'three']);
  assert.deepEqual(groups[1].entries.map((entry) => entry.effect.id), ['four']);
  assert.ok(groups[0].duration > 1);
});

test('backward clicker navigation restores state without replaying or reversing the animation', () => {
  const timeline = buildPresenterAnimationTimeline([
    { element_key: 'answer', content_json: { animation: { effects: [
      { id: 'show', effect: 'fade', start: 'on-click' },
      { id: 'dim', effect: 'pulse', start: 'on-click', afterAnimation: 'dim', afterAnimationColor: '#64748b' },
    ] } } },
  ]);
  const backward = presenterElementPlaybackState(timeline, 'answer', 1, 3, { direction: 'backward', fromStep: 2, toStep: 1 });
  assert.deepEqual(backward.activeEffects, []);
  assert.equal(backward.reverse, false);
  const completed = presenterElementPlaybackState(timeline, 'answer', 3, 4, { direction: 'forward', fromStep: 2, toStep: 3 });
  assert.equal(completed.afterStyle.color, '#64748b');
});
