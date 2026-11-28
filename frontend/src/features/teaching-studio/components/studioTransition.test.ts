import assert from 'node:assert/strict';
import test from 'node:test';
import { studioTransitionStyle } from './studioTransition.ts';

test('none produces no transition animation', () => {
  assert.deepEqual(studioTransitionStyle({ effect: 'none' }), {});
});

test('push applies its animation, duration, easing and direction', () => {
  const style = studioTransitionStyle({
    effect: 'push',
    direction: 'right',
    duration: 1.2,
    easing: 'linear',
  }) as Record<string, unknown>;

  assert.equal(style.animationName, 'studio-transition-push');
  assert.equal(style.animationDuration, '1.2s');
  assert.equal(style.animationTimingFunction, 'linear');
  assert.equal(style['--studio-enter-x'], '100%');
  assert.equal(style['--studio-enter-y'], '0%');
});

test('opposite push directions produce opposite horizontal movement', () => {
  const right = studioTransitionStyle({ effect: 'push', direction: 'right' }) as Record<string, unknown>;
  const left = studioTransitionStyle({ effect: 'push', direction: 'left' }) as Record<string, unknown>;

  assert.equal(right['--studio-enter-x'], '100%');
  assert.equal(left['--studio-enter-x'], '-100%');
  assert.equal(right['--studio-transition-sign'], '1');
  assert.equal(left['--studio-transition-sign'], '-1');
});

test('cover uses the selected vertical direction', () => {
  const style = studioTransitionStyle({ effect: 'cover', direction: 'bottom' }) as Record<string, unknown>;

  assert.equal(style.animationName, 'studio-transition-cover');
  assert.equal(style['--studio-enter-x'], '0%');
  assert.equal(style['--studio-enter-y'], '100%');
  assert.equal(style.transformOrigin, '50% 100%');
});
