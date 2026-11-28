import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeStudioTransition, studioScreenIsHidden } from './studioTransitionModel.ts';

test('normalizes invalid transition values to a safe persisted contract', () => {
  assert.deepEqual(normalizeStudioTransition({ effect: 'unknown', duration: 99, advanceAfterSeconds: -4 }), {
    schemaVersion: 1,
    effect: 'none',
    duration: 20,
    sound: 'none',
    loopSound: false,
    advanceOnClick: true,
    advanceAfterEnabled: false,
    advanceAfterSeconds: 0,
    easing: 'smooth',
    intensity: 'standard',
    respectReducedMotion: true,
  });
});

test('preserves valid custom sound metadata', () => {
  const transition = normalizeStudioTransition({
    effect: 'fade', duration: 1.25, sound: 'custom',
    customSound: { resourceId: 4, resourceVersionId: 8, name: 'Bell', mimeType: 'audio/mpeg' },
  });
  assert.equal(transition.effect, 'fade');
  assert.equal(transition.duration, 1.25);
  assert.equal(transition.customSound?.resourceVersionId, 8);
});

test('recognizes native and imported hidden screen flags', () => {
  assert.equal(studioScreenIsHidden({ hidden: true }), true);
  assert.equal(studioScreenIsHidden({ import: { hidden: true } }), true);
  assert.equal(studioScreenIsHidden({ hidden: false }), false);
});
