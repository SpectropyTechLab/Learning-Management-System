import type { CSSProperties } from 'react';

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
  const primary = active[0];
  const direction = String(primary.direction || 'default');
  // PowerPoint's default Fly In direction is from the bottom. Keeping a real
  // displacement here is important: 0/0 made Fly In indistinguishable from Fade.
  const enterX = direction === 'left' ? '-35%' : direction === 'right' ? '35%' : '0%';
  const enterY = direction === 'top' ? '-35%' : direction === 'bottom' || direction === 'default' ? '35%' : '0%';
  const exitX = direction === 'left' ? '-35%' : direction === 'right' ? '35%' : '0%';
  const exitY = direction === 'top' ? '-35%' : direction === 'bottom' || direction === 'default' ? '35%' : '0%';
  const originX = direction === 'left' ? '0%' : direction === 'right' ? '100%' : '50%';
  const originY = direction === 'top' ? '0%' : direction === 'bottom' || direction === 'default' ? '100%' : '50%';
  const clipFrom = direction === 'right'
    ? 'inset(0 0 0 100%)'
    : direction === 'top'
      ? 'inset(100% 0 0 0)'
      : direction === 'bottom'
        ? 'inset(0 0 100% 0)'
        : direction === 'vertical'
          ? 'inset(50% 0 50% 0)'
          : direction === 'horizontal'
            ? 'inset(0 50% 0 50%)'
        : 'inset(0 100% 0 0)';
  const clipTo = direction === 'right'
    ? 'inset(0 100% 0 0)'
    : direction === 'top'
      ? 'inset(0 0 100% 0)'
      : direction === 'bottom'
        ? 'inset(100% 0 0 0)'
        : direction === 'vertical'
          ? 'inset(50% 0 50% 0)'
          : direction === 'horizontal'
            ? 'inset(0 50% 0 50%)'
        : 'inset(0 0 0 100%)';
  let sequenceOffset = 0;
  const delays = active.map((effect) => {
    const ownDelay = Number(effect.delay) || 0;
    const start = String(effect.start || 'on-click');
    if (start === 'with-previous')
      return Math.max(0, sequenceOffset - (Number(active[Math.max(0, active.indexOf(effect) - 1)]?.duration) || 0.8)) + ownDelay;
    const result = sequenceOffset + ownDelay;
    if (start !== 'with-previous') sequenceOffset = result + (Number(effect.duration) || 0.8);
    return result;
  });
  return {
    animationName: active.map((effect) => studioAnimationName(String(effect.effect))).join(', '),
    animationDuration: active.map((effect) => `${Number(effect.duration) || 0.8}s`).join(', '),
    animationDelay: delays.map((delay) => `${Math.round(delay * 1000) / 1000}s`).join(', '),
    animationIterationCount: active.map((effect) => String(Number(effect.repeat) || 1)).join(', '),
    animationFillMode: active.map(() => 'both').join(', '),
    animationTimingFunction: active.map(() => 'ease-in-out').join(', '),
    '--studio-enter-x': enterX,
    '--studio-enter-y': enterY,
    '--studio-exit-x': exitX,
    '--studio-exit-y': exitY,
    '--studio-origin-x': originX,
    '--studio-origin-y': originY,
    '--studio-clip-from': clipFrom,
    '--studio-clip-to': clipTo,
    '--studio-pulse-color': String(primary.color || '#2563eb'),
  } as CSSProperties;
};
