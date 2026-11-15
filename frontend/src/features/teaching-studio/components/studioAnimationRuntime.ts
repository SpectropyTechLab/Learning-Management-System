import type { CSSProperties } from 'react';

export const STUDIO_ANIMATION_NAMES = {
    appear: 'studio-appear', fade: 'studio-fade', 'fly-in': 'studio-fly-in',
    wipe: 'studio-wipe', zoom: 'studio-zoom', bounce: 'studio-bounce',
    pulse: 'studio-pulse', spin: 'studio-spin', grow: 'studio-grow',
    'fade-out': 'studio-fade-out', 'fly-out': 'studio-fly-out',
    'zoom-out': 'studio-zoom-out', 'float-in': 'studio-float-in',
    split: 'studio-split', wheel: 'studio-wheel', 'random-bars': 'studio-random-bars',
    'grow-turn': 'studio-grow-turn', teeter: 'studio-teeter', flash: 'studio-flash',
    wave: 'studio-wave', 'color-pulse': 'studio-color-pulse',
    'bold-flash': 'studio-bold-flash', underline: 'studio-underline',
    'wipe-out': 'studio-wipe-out', 'float-out': 'studio-float-out',
    'split-out': 'studio-split-out', disappear: 'studio-disappear', sink: 'studio-sink',
    'path-line': 'studio-path-line', 'path-arc': 'studio-path-arc',
    'path-turn': 'studio-path-turn', 'path-circle': 'studio-path-circle',
    'path-loop': 'studio-path-loop', 'path-zigzag': 'studio-path-zigzag',
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
  const enterX = direction === 'left' ? '-35%' : direction === 'right' ? '35%' : '0%';
  const enterY = direction === 'top' ? '-35%' : direction === 'bottom' ? '35%' : '0%';
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
    '--studio-clip-from': clipFrom,
    '--studio-clip-to': clipTo,
    '--studio-pulse-color': String(primary.color || '#2563eb'),
  } as CSSProperties;
};
