import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { STUDIO_ANIMATION_CATEGORIES } from './studioAnimationCatalog.ts';
import { studioAnimationDirectionOptions, studioAnimationEffectSupported } from './studioAnimationModel.ts';
import {
  STUDIO_ANIMATION_NAMES,
  studioAnimationName,
  studioContainerAnimationEffects,
  studioShapePaintAnimationEffects,
  studioAnimationStyle,
} from './studioAnimationRuntime.ts';

test('every exposed animation effect has a dedicated runtime animation', () => {
  const names = Object.values(STUDIO_ANIMATION_NAMES);
  const exposedCount = STUDIO_ANIMATION_CATEGORIES.flatMap((category) => category.effects).length;
  assert.equal(names.length, exposedCount + 1);
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

test('every animation shown in the four galleries has a matching CSS keyframe', () => {
  const css = readFileSync(new URL('../../../assets/index.css', import.meta.url), 'utf8');
  const catalogEffects = STUDIO_ANIMATION_CATEGORIES.flatMap((category) => category.effects);
  assert.equal(catalogEffects.length + 1, Object.keys(STUDIO_ANIMATION_NAMES).length);
  for (const category of STUDIO_ANIMATION_CATEGORIES) {
    for (const [effect, name] of category.effects) {
      const animationName = studioAnimationName(effect);
      assert.match(css, new RegExp(`@keyframes\\s+${animationName}\\b`), `${category.name} / ${name} needs its named keyframe`);
      assert.equal(
        studioAnimationStyle({ effects: [{ effect }] }).animationName,
        effect.startsWith('path-')
          ? 'studio-path-custom-legacy'
          : effect === 'wheel' || effect === 'wheel-out'
            ? `${animationName}-1`
            : animationName,
        `${category.name} / ${name} must select its own runtime`,
      );
    }
  }
});
test('Wheel uses a fixed-angle runtime for every spoke count', () => {
  for (const spokes of [1, 2, 3, 4, 8]) {
    assert.equal(studioAnimationStyle({ effects: [{ effect: 'wheel', spokes }] }).animationName, `studio-wheel-${spokes}`);
    assert.equal(studioAnimationStyle({ effects: [{ effect: 'wheel-out', spokes }] }).animationName, `studio-wheel-out-${spokes}`);
  }
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
  assert.equal(top['--studio-enter-y'], '-120vh');
  assert.equal(top['--studio-enter-x'], '0px');
  const vertical = studioAnimationStyle({
    effects: [{ effect: 'wipe', direction: 'vertical' }],
  }) as Record<string, unknown>;
  const horizontal = studioAnimationStyle({
    effects: [{ effect: 'wipe', direction: 'horizontal' }],
  }) as Record<string, unknown>;
  assert.notEqual(vertical['--studio-clip-from'], horizontal['--studio-clip-from']);
  const defaultFly = studioAnimationStyle({ effects: [{ effect: 'fly-in' }] }) as Record<string, unknown>;
  assert.equal(defaultFly['--studio-enter-y'], '120vh');
  const leftExit = studioAnimationStyle({ effects: [{ effect: 'fly-out', direction: 'left' }] }) as Record<string, unknown>;
  assert.equal(leftExit['--studio-exit-x'], '-120vw');
  assert.equal(leftExit['--studio-origin-x'], '0%');
});

test('Appear is immediate while Fade, Fly and Float keep distinct runtimes', () => {
  const appear = studioAnimationStyle({ effects: [{ effect: 'appear' }] });
  const fade = studioAnimationStyle({ effects: [{ effect: 'fade' }] });
  const fly = studioAnimationStyle({ effects: [{ effect: 'fly-in', direction: 'bottom-left' }] }) as Record<string, unknown>;
  const float = studioAnimationStyle({ effects: [{ effect: 'float-in', direction: 'bottom' }] }) as Record<string, unknown>;
  assert.equal(appear.animationTimingFunction, 'step-start');
  assert.notEqual(appear.animationName, fade.animationName);
  assert.equal(fly['--studio-enter-x'], '-120vw');
  assert.equal(fly['--studio-enter-y'], '120vh');
  assert.equal(float['--studio-float-y'], '18%');
  assert.notEqual(fly['--studio-enter-y'], float['--studio-float-y']);
});

test('direction menus follow the selected PowerPoint effect', () => {
  assert.deepEqual(studioAnimationDirectionOptions('fly-in').map(([value]) => value), [
    'bottom', 'bottom-left', 'left', 'top-left', 'top', 'top-right', 'right', 'bottom-right',
  ]);
  assert.deepEqual(studioAnimationDirectionOptions('float-in').map(([value]) => value), ['bottom', 'top']);
  assert.deepEqual(studioAnimationDirectionOptions('split').map(([value]) => value), ['horizontal', 'vertical']);
  assert.deepEqual(studioAnimationDirectionOptions('wipe').map(([value]) => value), ['bottom', 'left', 'right', 'top']);
  assert.deepEqual(studioAnimationDirectionOptions('random-bars').map(([value]) => value), ['horizontal', 'vertical']);
  assert.deepEqual(studioAnimationDirectionOptions('blinds').map(([value]) => value), ['horizontal', 'vertical']);
  assert.deepEqual(studioAnimationDirectionOptions('clock').map(([value]) => value), ['clockwise', 'counter-clockwise']);
  assert.deepEqual(studioAnimationDirectionOptions('zoom').map(([value]) => value), ['out', 'in']);
});

test('effect-option variants change their real runtime geometry', () => {
  const oneSpoke = studioAnimationStyle({ effects: [{ effect: 'wheel', spokes: 1 }] }) as Record<string, unknown>;
  const eightSpokes = studioAnimationStyle({ effects: [{ effect: 'wheel', spokes: 8 }] }) as Record<string, unknown>;
  const horizontalBars = studioAnimationStyle({ effects: [{ effect: 'random-bars', direction: 'horizontal' }] }) as Record<string, unknown>;
  const verticalBars = studioAnimationStyle({ effects: [{ effect: 'random-bars', direction: 'vertical' }] }) as Record<string, unknown>;
  const horizontalSwivel = studioAnimationStyle({ effects: [{ effect: 'swivel', direction: 'horizontal' }] }) as Record<string, unknown>;
  const verticalSwivel = studioAnimationStyle({ effects: [{ effect: 'swivel', direction: 'vertical' }] }) as Record<string, unknown>;
  const clockwiseClock = studioAnimationStyle({ effects: [{ effect: 'clock', direction: 'clockwise' }] }) as Record<string, unknown>;
  const counterClockwiseClock = studioAnimationStyle({ effects: [{ effect: 'clock', direction: 'counter-clockwise' }] }) as Record<string, unknown>;
  const outwardZoom = studioAnimationStyle({ effects: [{ effect: 'zoom', direction: 'out' }] }) as Record<string, unknown>;
  const inwardZoom = studioAnimationStyle({ effects: [{ effect: 'zoom', direction: 'in' }] }) as Record<string, unknown>;
  assert.equal(oneSpoke['--studio-wheel-sector'], '360deg');
  assert.equal(eightSpokes['--studio-wheel-sector'], '45deg');
  assert.notEqual(horizontalBars['--studio-bars-clip-from'], verticalBars['--studio-bars-clip-from']);
  assert.notEqual(horizontalSwivel['--studio-swivel-from'], verticalSwivel['--studio-swivel-from']);
  assert.notEqual(clockwiseClock['--studio-clock-rotation'], counterClockwiseClock['--studio-clock-rotation']);
  assert.notEqual(outwardZoom['--studio-zoom-start-scale'], inwardZoom['--studio-zoom-start-scale']);
});

test('contextual galleries disable text-only and 3D-only effects on unsupported objects', () => {
  assert.equal(studioAnimationEffectSupported('visual', '', 'image', 'underline'), false);
  assert.equal(studioAnimationEffectSupported('text', '', '', 'underline'), true);
  assert.equal(studioAnimationEffectSupported('visual', '', 'image', '3d-turntable'), false);
  assert.equal(studioAnimationEffectSupported('visual', '', 'model_3d', '3d-turntable'), true);
  assert.equal(studioAnimationEffectSupported('visual', '', 'image', 'fade'), true);
});

test('Colour Pulse carries its selected colour into the runtime style', () => {
  const style = studioAnimationStyle({
    effects: [{ effect: 'color-pulse', color: '#ef4444' }],
  }) as Record<string, unknown>;
  assert.equal(style['--studio-pulse-color'], '#ef4444');
});

test('shape paint effects stay on shape geometry instead of the rectangular canvas container', () => {
  const effects = [
    { effect: 'fly-in', direction: 'left' },
    { effect: 'fill-color', color: '#ef4444' },
    { effect: 'line-color', color: '#2563eb' },
  ];
  assert.deepEqual(
    studioShapePaintAnimationEffects(effects).map((effect) => effect.effect),
    ['fill-color', 'line-color'],
  );
  assert.deepEqual(
    studioContainerAnimationEffects(effects, true).map((effect) => effect.effect),
    ['fly-in'],
  );
  assert.deepEqual(
    studioContainerAnimationEffects(effects, false).map((effect) => effect.effect),
    ['fly-in', 'fill-color', 'line-color'],
  );
});

test('effect-specific PowerPoint options reach the animation runtime', () => {
  const counterClockwise = studioAnimationStyle({ effects: [{ effect: 'spin', rotation: 720, clockwise: false }] }) as Record<string, unknown>;
  const grow = studioAnimationStyle({ effects: [{ effect: 'grow-shrink', amount: 165 }] }) as Record<string, unknown>;
  const transparency = studioAnimationStyle({ effects: [{ effect: 'transparency', amount: 45 }] }) as Record<string, unknown>;
  assert.equal(counterClockwise['--studio-spin-rotation'], '-720deg');
  assert.equal(grow['--studio-effect-scale'], '1.65');
  assert.equal(transparency['--studio-effect-opacity'], '0.45');
});

test('Split modes and Shape kinds produce genuinely different reveal geometry', () => {
  const splitIn = studioAnimationStyle({ effects: [{ effect: 'split', direction: 'horizontal', splitMode: 'in' }] }) as Record<string, unknown>;
  const splitOut = studioAnimationStyle({ effects: [{ effect: 'split', direction: 'horizontal', splitMode: 'out' }] }) as Record<string, unknown>;
  const circle = studioAnimationStyle({ effects: [{ effect: 'shape', shapeKind: 'circle' }] }) as Record<string, unknown>;
  const diamond = studioAnimationStyle({ effects: [{ effect: 'shape', shapeKind: 'diamond' }] }) as Record<string, unknown>;
  assert.notEqual(splitIn['--studio-clip-from'], splitOut['--studio-clip-from']);
  assert.notEqual(circle['--studio-shape-clip-to'], diamond['--studio-shape-clip-to']);
  assert.match(String(diamond['--studio-shape-clip-to']), /polygon/);
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

test('advanced PowerPoint timing uses real infinite, auto-reverse, rewind and easing semantics', () => {
  const style = studioAnimationStyle({ effects: [{
    effect: 'pulse', repeat: 'until-next-click', autoReverse: true, rewind: true,
    smoothStart: 0.6, smoothEnd: 0.4,
  }] });
  assert.equal(style.animationIterationCount, 'infinite');
  assert.equal(style.animationDirection, 'alternate');
  assert.equal(style.animationFillMode, 'backwards');
  assert.match(String(style.animationTimingFunction), /^cubic-bezier\(/);
});

test('after-animation actions distinguish immediate completion from the next click', () => {
  const hideAfter = studioAnimationStyle({ effects: [{ effect: 'fade', duration: 1.2, delay: 0.3, afterAnimation: 'hide-after' }] });
  const hideNextClick = studioAnimationStyle({ effects: [{ effect: 'fade', duration: 1.2, delay: 0.3, afterAnimation: 'hide-on-next-click' }] });
  const dimAfter = studioAnimationStyle({ effects: [{ effect: 'fade', duration: 1, afterAnimation: 'dim', afterAnimationColor: '#64748b' }] }) as Record<string, unknown>;
  assert.equal(hideAfter.animationName, 'studio-fade, studio-after-hide');
  assert.equal(hideAfter.animationDelay, '0.3s, 1.5s');
  assert.equal(hideNextClick.animationName, 'studio-fade');
  assert.equal(dimAfter.animationName, 'studio-fade, studio-after-dim');
  assert.equal(dimAfter['--studio-after-color'], '#64748b');
});

test('editor selection chrome is outside the animated content layer', () => {
  const source = readFileSync(new URL('../SlideCanvas.tsx', import.meta.url), 'utf8');
  assert.match(source, /key={`overlay-\$\{object\.id\}`}/);
  assert.match(source, /data-animated-content-for=\{object\.id\}/);
  const animatedLayer = source.indexOf('data-animated-content-for={object.id}');
  const animationStyle = source.indexOf('...objectAnimationStyles[object.id]', animatedLayer);
  assert.ok(animatedLayer >= 0 && animationStyle > animatedLayer, 'animation transforms belong to the inner content layer');
});

test('custom motion paths persist and drive CSS offset-path playback', () => {
  const style = studioAnimationStyle({ effects: [{
    effect: 'path-custom', motionPath: [{ x: 0, y: 0 }, { x: 80, y: -20 }, { x: 160, y: 40 }],
  }] });
  assert.equal(style.animationName, 'studio-path-custom-legacy');
  assert.match(String(style.offsetPath), /M 0 0 L 80 -20 L 160 40/);
  assert.equal(style.offsetDistance, '100%');
});
