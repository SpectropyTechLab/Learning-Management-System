import type { CSSProperties } from 'react';
import {
  studioAnimationRepeatCount,
  studioAnimationTimingFunction,
  studioMotionPathCss,
  type StudioAnimationEffectDefinition,
} from './studioAnimationModel.ts';

export const STUDIO_ANIMATION_NAMES = {
    appear: 'studio-appear', fade: 'studio-fade', 'fly-in': 'studio-fly-in',
    wipe: 'studio-wipe', zoom: 'studio-zoom', shape: 'studio-shape',
    swivel: 'studio-swivel', 'bounce-in': 'studio-bounce-in',
    pulse: 'studio-pulse', spin: 'studio-spin', 'grow-shrink': 'studio-grow-shrink',
    'fade-out': 'studio-fade-out', 'fly-out': 'studio-fly-out',
    'zoom-out': 'studio-zoom-out', 'float-in': 'studio-float-in',
    split: 'studio-split', wheel: 'studio-wheel', 'random-bars': 'studio-random-bars',
    'grow-turn': 'studio-grow-turn', teeter: 'studio-teeter', wave: 'studio-wave',
    'color-pulse': 'studio-color-pulse', desaturate: 'studio-desaturate',
    darken: 'studio-darken', lighten: 'studio-lighten', transparency: 'studio-transparency',
    'object-color': 'studio-object-color', 'complementary-color': 'studio-complementary-color',
    'line-color': 'studio-line-color', 'fill-color': 'studio-fill-color',
    'brush-color': 'studio-brush-color', 'font-color': 'studio-font-color',
    'bold-flash': 'studio-bold-flash', 'bold-reveal': 'studio-bold-reveal', underline: 'studio-underline',
    'wipe-out': 'studio-wipe-out', 'float-out': 'studio-float-out',
    'split-out': 'studio-split-out', disappear: 'studio-disappear',
    'shape-out': 'studio-shape-out', 'wheel-out': 'studio-wheel-out',
    'random-bars-out': 'studio-random-bars-out', 'shrink-turn': 'studio-shrink-turn',
    'swivel-out': 'studio-swivel-out', 'bounce-out': 'studio-bounce-out',
    'path-line': 'studio-path-line', 'path-arc': 'studio-path-arc',
    'path-turn': 'studio-path-turn', 'path-shape': 'studio-path-shape',
    'path-loop': 'studio-path-loop',
    'path-custom': 'studio-path-custom-legacy',
    '3d-arrive': 'studio-3d-arrive', '3d-turntable': 'studio-3d-turntable',
    '3d-swing': 'studio-3d-swing', '3d-jump-turn': 'studio-3d-jump-turn',
    blinds: 'studio-blinds', box: 'studio-box', clock: 'studio-clock',
    'dissolve-in': 'studio-dissolve', 'fly-through': 'studio-fly-through',
    glitter: 'studio-glitter', honeycomb: 'studio-honeycomb', ripple: 'studio-ripple',
    switch: 'studio-switch', flip: 'studio-flip', comb: 'studio-comb',
    'shape-reveal': 'studio-shape-reveal', grow: 'studio-grow',
    flash: 'studio-flash', bounce: 'studio-bounce',
    'path-circle': 'studio-path-circle', 'path-zigzag': 'studio-path-zigzag',
  } as const;

export const studioAnimationName = (effect: string) =>
  STUDIO_ANIMATION_NAMES[effect as keyof typeof STUDIO_ANIMATION_NAMES] || 'studio-appear';

export const studioAnimationStyle = (animation?: Record<string, unknown>): CSSProperties => {
  const effects =
    Array.isArray(animation?.effects) && animation.effects.length
      ? (animation.effects as Array<Record<string, unknown>>)
      : [{ effect: animation?.effect || 'none', duration: animation?.duration, delay: animation?.delay }];
  const active = effects.filter((effect) => String(effect.effect || 'none') !== 'none');
  if (!active.length) return {};
  const primary = active[0] as StudioAnimationEffectDefinition;
  const direction = String(primary.direction === 'default' || !primary.direction ? 'bottom' : primary.direction);
  const fromLeft = direction.includes('left');
  const fromRight = direction.includes('right');
  const fromTop = direction.includes('top');
  const fromBottom = direction.includes('bottom');
  // Fly effects start beyond the slide boundary. Float effects use their own
  // deliberately short displacement so they never look like Fly In/Out.
  const enterX = fromLeft ? '-120vw' : fromRight ? '120vw' : '0px';
  const enterY = fromTop ? '-120vh' : fromBottom ? '120vh' : '0px';
  const exitX = enterX;
  const exitY = enterY;
  const floatX = fromLeft ? '-12%' : fromRight ? '12%' : '0%';
  const floatY = fromTop ? '-18%' : fromBottom ? '18%' : '0%';
  const originX = fromLeft ? '0%' : fromRight ? '100%' : '50%';
  const originY = fromTop ? '0%' : fromBottom ? '100%' : '50%';
  const splitMode = String(primary.splitMode || 'in');
  const splitClip = direction === 'vertical'
    ? (splitMode === 'out' ? 'inset(50% 0 50% 0)' : 'inset(0 50% 0 50%)')
    : direction === 'horizontal'
      ? (splitMode === 'out' ? 'inset(0 50% 0 50%)' : 'inset(50% 0 50% 0)')
      : 'inset(50% 0 50% 0)';
  const clipFrom = direction === 'right'
    ? 'inset(0 0 0 100%)'
    : direction === 'top'
      ? 'inset(0 0 100% 0)'
      : direction === 'bottom'
        ? 'inset(100% 0 0 0)'
        : direction === 'vertical' || direction === 'horizontal'
          ? splitClip
        : 'inset(0 100% 0 0)';
  const clipTo = direction === 'right'
    ? 'inset(0 0 0 100%)'
    : direction === 'top'
      ? 'inset(0 0 100% 0)'
      : direction === 'bottom'
        ? 'inset(100% 0 0 0)'
        : direction === 'vertical' || direction === 'horizontal'
          ? splitClip
            : 'inset(0 100% 0 0)';
  const shapeKind = String(primary.shapeKind || 'circle');
  const shapeClipFrom = shapeKind === 'box'
    ? 'inset(50% 50% 50% 50%)'
    : shapeKind === 'diamond'
      ? 'polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)'
      : shapeKind === 'plus'
        ? 'polygon(49% 49%, 51% 49%, 51% 49%, 51% 49%, 51% 51%, 51% 51%, 49% 51%, 49% 51%, 49% 51%, 49% 49%, 49% 49%, 49% 49%)'
        : `circle(0% at ${originX} ${originY})`;
  const shapeClipTo = shapeKind === 'diamond'
    ? 'polygon(50% -75%, 175% 50%, 50% 175%, -75% 50%)'
    : shapeKind === 'plus'
      ? 'polygon(35% -75%, 65% -75%, 65% 35%, 175% 35%, 175% 65%, 65% 65%, 65% 175%, 35% 175%, 35% 65%, -75% 65%, -75% 35%, 35% 35%)'
      : shapeKind === 'box'
        ? 'inset(0 0 0 0)'
        : `circle(150% at ${originX} ${originY})`;
  const horizontalBarsClip = 'polygon(0 0, 100% 0, 100% 15%, 0 15%, 0 30%, 100% 30%, 100% 45%, 0 45%, 0 60%, 100% 60%, 100% 75%, 0 75%, 0 90%, 100% 90%, 100% 100%, 0 100%)';
  const verticalBarsClip = 'polygon(0 0, 15% 0, 15% 100%, 30% 100%, 30% 0, 45% 0, 45% 100%, 60% 100%, 60% 0, 75% 0, 75% 100%, 90% 100%, 90% 0, 100% 0, 100% 100%, 0 100%)';
  const barsClipFrom = direction === 'horizontal' ? horizontalBarsClip : verticalBarsClip;
  const blindsClipFrom = direction === 'vertical'
    ? 'polygon(0 0, 8% 0, 8% 100%, 20% 100%, 20% 0, 28% 0, 28% 100%, 40% 100%, 40% 0, 48% 0, 48% 100%, 60% 100%, 60% 0, 68% 0, 68% 100%, 80% 100%, 80% 0, 88% 0, 88% 100%, 100% 100%, 100% 0)'
    : 'polygon(0 0, 100% 0, 100% 8%, 0 8%, 0 20%, 100% 20%, 100% 28%, 0 28%, 0 40%, 100% 40%, 100% 48%, 0 48%, 0 60%, 100% 60%, 100% 68%, 0 68%, 0 80%, 100% 80%, 100% 88%, 0 88%)';
  let sequenceOffset = 0;
  const delays = active.map((effect) => {
    if (Number.isFinite(Number(effect.runtimeDelay))) return Math.max(0, Number(effect.runtimeDelay));
    const ownDelay = Number(effect.delay) || 0;
    const start = String(effect.start || 'on-click');
    if (start === 'with-previous')
      return Math.max(0, sequenceOffset - (Number(active[Math.max(0, active.indexOf(effect) - 1)]?.duration) || 0.8)) + ownDelay;
    const result = sequenceOffset + ownDelay;
    if (start !== 'with-previous') sequenceOffset = result + (Number(effect.duration) || 0.8);
    return result;
  });
  const iterationCounts = active.map((effect) => {
    const definition = effect as StudioAnimationEffectDefinition;
    if (definition.autoReverse && studioAnimationRepeatCount(definition.repeat) !== 'infinite') {
      return String(Math.max(2, Number(studioAnimationRepeatCount(definition.repeat)) * 2));
    }
    return studioAnimationRepeatCount(definition.repeat);
  });
  const animationNames = active.map((effect) => {
    if (studioMotionPathCss(effect as StudioAnimationEffectDefinition)) return 'studio-path-custom-legacy';
    if (effect.effect === 'wheel' || effect.effect === 'wheel-out') {
      const spokes = [1, 2, 3, 4, 8].includes(Number(effect.spokes)) ? Number(effect.spokes) : 1;
      return `studio-${effect.effect}-${spokes}`;
    }
    return studioAnimationName(String(effect.effect));
  });
  const animationDurations = active.map((effect) => Number(effect.duration) || 0.8);
  const animationDelays = [...delays];
  const animationIterations = [...iterationCounts];
  const animationDirections = active.map((effect) => (effect as StudioAnimationEffectDefinition).autoReverse ? 'alternate' : 'normal');
  // A delayed later effect must not apply its backwards keyframe before it
  // starts, otherwise it masks the effect currently playing on the object.
  const animationFillModes = active.map((effect, index) => (effect as StudioAnimationEffectDefinition).rewind
    ? 'backwards'
    : delays[index] > 0 ? 'forwards' : 'both');
  const animationTimingFunctions = active.map((effect) => ['appear', 'disappear'].includes(String(effect.effect)) ? 'step-start' : studioAnimationTimingFunction(effect as StudioAnimationEffectDefinition));
  active.forEach((effect, index) => {
    const after = String((effect as StudioAnimationEffectDefinition).afterAnimation || 'none');
    if (!['hide-after', 'dim'].includes(after) || iterationCounts[index] === 'infinite') return;
    const iterations = Math.max(1, Number(iterationCounts[index]) || 1);
    animationNames.push(after === 'hide-after' ? 'studio-after-hide' : 'studio-after-dim');
    animationDurations.push(0.001);
    animationDelays.push(delays[index] + animationDurations[index] * iterations);
    animationIterations.push('1');
    animationDirections.push('normal');
    animationFillModes.push('forwards');
    animationTimingFunctions.push('step-end');
  });
  const motionEffect = active.find((effect) => studioMotionPathCss(effect as StudioAnimationEffectDefinition)) as StudioAnimationEffectDefinition | undefined;
  const spinEffect = active.find((effect) => String(effect.effect) === 'spin') as StudioAnimationEffectDefinition | undefined;
  const motionPath = motionEffect ? studioMotionPathCss(motionEffect) : undefined;
  const effectAmount = Number(primary.amount);
  const scaleAmount = Number.isFinite(effectAmount) && effectAmount > 0 ? effectAmount / 100 : (primary.effect === 'pulse' ? 1.08 : 1.2);
  const transparencyAmount = Number.isFinite(effectAmount) ? Math.max(0, Math.min(100, effectAmount)) / 100 : 0.3;
  const rotationSource = spinEffect ?? primary;
  const rotation = Math.max(1, Math.min(3600, Number(rotationSource.rotation) || 360)) * (rotationSource.clockwise === false ? -1 : 1);
  const wheelSpokes = [1, 2, 3, 4, 8].includes(Number(primary.spokes)) ? Number(primary.spokes) : 1;
  const wheelMask = 'repeating-conic-gradient(from -90deg, #000 0deg var(--studio-wheel-sweep), transparent var(--studio-wheel-sweep) var(--studio-wheel-sector, 360deg))';
  const clockwise = primary.clockwise !== false && direction !== 'counter-clockwise';
  return {
    animationName: animationNames.join(', '),
    animationDuration: animationDurations.map((duration) => `${duration}s`).join(', '),
    animationDelay: animationDelays.map((delay) => `${Math.round(delay * 1000) / 1000}s`).join(', '),
    animationIterationCount: animationIterations.join(', '),
    animationDirection: animationDirections.join(', '),
    animationFillMode: animationFillModes.join(', '),
    animationTimingFunction: animationTimingFunctions.join(', '),
    ...(['wheel', 'wheel-out'].includes(String(primary.effect)) ? {
      WebkitMaskImage: wheelMask,
      maskImage: wheelMask,
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
    } : {}),
    ...(motionPath ? {
      offsetPath: motionPath,
      offsetRotate: String(motionEffect?.pathRotate === true ? 'auto' : '0deg'),
    } : {}),
    '--studio-enter-x': enterX,
    '--studio-enter-y': enterY,
    '--studio-exit-x': exitX,
    '--studio-exit-y': exitY,
    '--studio-float-x': floatX,
    '--studio-float-y': floatY,
    '--studio-origin-x': originX,
    '--studio-origin-y': originY,
    '--studio-clip-from': clipFrom,
    '--studio-clip-to': clipTo,
    '--studio-shape-clip-from': shapeClipFrom,
    '--studio-shape-clip-to': shapeClipTo,
    '--studio-pulse-color': String(primary.color || '#2563eb'),
    '--studio-effect-scale': String(scaleAmount),
    '--studio-effect-opacity': String(transparencyAmount),
    '--studio-spin-rotation': `${rotation}deg`,
    '--studio-wheel-spokes': String(wheelSpokes),
    '--studio-wheel-sector': `${360 / wheelSpokes}deg`,
    '--studio-bars-clip-from': barsClipFrom,
    '--studio-blinds-clip-from': blindsClipFrom,
    '--studio-clock-rotation': clockwise ? '-180deg' : '180deg',
    '--studio-3d-rotation': clockwise ? '360deg' : '-360deg',
    '--studio-box-start-scale': direction === 'in' ? '1.15' : '0.15',
    '--studio-box-start-clip': direction === 'in' ? 'inset(0)' : 'inset(35%)',
    '--studio-zoom-start-scale': direction === 'in' ? '1.5' : '0.5',
    '--studio-zoom-end-scale': direction === 'in' ? '1.5' : '0.5',
    '--studio-swivel-from': direction === 'vertical'
      ? 'perspective(900px) rotateX(-90deg) scale(0.75)'
      : 'perspective(900px) rotateY(-90deg) scale(0.75)',
    '--studio-comb-x': direction === 'horizontal' ? '12%' : '0%',
    '--studio-comb-y': direction === 'vertical' ? '12%' : '0%',
    '--studio-after-color': String(primary.afterAnimationColor || '#94a3b8'),
  } as CSSProperties;
};
