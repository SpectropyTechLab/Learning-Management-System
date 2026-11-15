import assert from 'node:assert/strict';
import test from 'node:test';
import {
  STUDIO_ANIMATION_NAMES,
  studioAnimationName,
  studioAnimationStyle,
} from './studioAnimationRuntime.ts';

test('every exposed animation effect has a dedicated runtime animation', () => {
  const names = Object.values(STUDIO_ANIMATION_NAMES);
  assert.equal(names.length, 35);
  assert.equal(new Set(names).size, names.length);
  for (const effect of Object.keys(STUDIO_ANIMATION_NAMES)) {
    if (effect === 'appear') continue;
    assert.notEqual(
      studioAnimationName(effect),
      'studio-appear',
      `${effect} must not silently fall back to Appear`,
    );
  }
  assert.equal(studioAnimationName('appear'), 'studio-appear');
});
test('named animation choices do not silently reuse the previously duplicated runtime', () => {
  assert.notEqual(studioAnimationName('fade'), studioAnimationName('appear'));
  assert.notEqual(studioAnimationName('wheel'), studioAnimationName('spin'));
  assert.notEqual(studioAnimationName('bold-flash'), studioAnimationName('pulse'));
  assert.notEqual(studioAnimationName('disappear'), studioAnimationName('fade-out'));
});

test('animation directions produce different entrance and wipe geometry', () => {
  const left = studioAnimationStyle({ effects: [{ effect: 'wipe', direction: 'left' }] }) as Record<
    string,
    unknown
  >;
  const right = studioAnimationStyle({
    effects: [{ effect: 'wipe', direction: 'right' }],
  }) as Record<string, unknown>;
  const top = studioAnimationStyle({ effects: [{ effect: 'fly-in', direction: 'top' }] }) as Record<
    string,
    unknown
  >;
  assert.notEqual(left['--studio-clip-from'], right['--studio-clip-from']);
  assert.equal(top['--studio-enter-y'], '-35%');
  assert.equal(top['--studio-enter-x'], '0%');
  const vertical = studioAnimationStyle({
    effects: [{ effect: 'wipe', direction: 'vertical' }],
  }) as Record<string, unknown>;
  const horizontal = studioAnimationStyle({
    effects: [{ effect: 'wipe', direction: 'horizontal' }],
  }) as Record<string, unknown>;
  assert.notEqual(vertical['--studio-clip-from'], horizontal['--studio-clip-from']);
});

test('Colour Pulse carries its selected colour into the runtime style', () => {
  const style = studioAnimationStyle({
    effects: [{ effect: 'color-pulse', color: '#ef4444' }],
  }) as Record<string, unknown>;
  assert.equal(style['--studio-pulse-color'], '#ef4444');
});

test('animation sequence preserves timing, repeat and with-previous behaviour', () => {
  const style = studioAnimationStyle({
    effects: [
      { effect: 'fade', duration: 1, delay: 0.2, start: 'on-click', repeat: 1 },
      { effect: 'pulse', duration: 0.5, delay: 0.1, start: 'with-previous', repeat: 3 },
      { effect: 'fade-out', duration: 0.4, delay: 0.3, start: 'after-previous', repeat: 1 },
    ],
  });
  assert.equal(style.animationName, 'studio-fade, studio-pulse, studio-fade-out');
  assert.equal(style.animationDuration, '1s, 0.5s, 0.4s');
  assert.equal(style.animationDelay, '0.2s, 0.3s, 1.5s');
  assert.equal(style.animationIterationCount, '1, 3, 1');
});
