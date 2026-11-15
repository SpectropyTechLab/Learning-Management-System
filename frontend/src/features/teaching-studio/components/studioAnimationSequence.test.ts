import assert from 'node:assert/strict';
import test from 'node:test';
import type { StudioElement } from '../types.ts';
import { buildStudioAnimationSequence, persistStudioAnimationSequence } from './studioAnimationSequence.ts';
import { buildPresenterAnimationTimeline } from './studioClickerRuntime.ts';

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
