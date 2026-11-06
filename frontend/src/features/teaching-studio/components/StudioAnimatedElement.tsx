import type { CSSProperties, ReactNode } from 'react';

const animationName = (effect: string) =>
  ({
    appear: 'studio-appear',
    fade: 'studio-appear',
    'fly-in': 'studio-fly-in',
    wipe: 'studio-wipe',
    zoom: 'studio-zoom',
    bounce: 'studio-bounce',
    pulse: 'studio-pulse',
    spin: 'studio-spin',
    grow: 'studio-grow',
    'fade-out': 'studio-fade-out',
    'fly-out': 'studio-fly-out',
    'zoom-out': 'studio-zoom-out',
    'float-in': 'studio-float-in',
    split: 'studio-split',
    wheel: 'studio-spin',
    'random-bars': 'studio-random-bars',
    'grow-turn': 'studio-grow-turn',
    teeter: 'studio-teeter',
    flash: 'studio-flash',
    wave: 'studio-wave',
    'color-pulse': 'studio-color-pulse',
    'bold-flash': 'studio-pulse',
    underline: 'studio-underline',
    'wipe-out': 'studio-wipe-out',
    'float-out': 'studio-float-out',
    'split-out': 'studio-split-out',
    disappear: 'studio-fade-out',
    sink: 'studio-sink',
    'path-line': 'studio-path-line',
    'path-arc': 'studio-path-arc',
    'path-turn': 'studio-path-turn',
    'path-circle': 'studio-path-circle',
    'path-loop': 'studio-path-loop',
    'path-zigzag': 'studio-path-zigzag',
    'path-custom': 'studio-path-line',
  })[effect] || 'studio-appear';

const animationStyle = (animation?: Record<string, unknown>): CSSProperties => {
  const effects =
    Array.isArray(animation?.effects) && animation.effects.length
      ? (animation.effects as Array<Record<string, unknown>>)
      : [
          {
            effect: animation?.effect || 'none',
            duration: animation?.duration,
            delay: animation?.delay,
          },
        ];
  const active = effects.filter((effect) => String(effect.effect || 'none') !== 'none');
  if (!active.length) return {};
  let sequenceOffset = 0;
  const delays = active.map((effect) => {
    const ownDelay = Number(effect.delay) || 0;
    const start = String(effect.start || 'on-click');
    if (start === 'with-previous')
      return (
        Math.max(
          0,
          sequenceOffset -
            (Number(active[Math.max(0, active.indexOf(effect) - 1)]?.duration) || 0.8),
        ) + ownDelay
      );
    const result = sequenceOffset + ownDelay;
    if (start !== 'with-previous') sequenceOffset = result + (Number(effect.duration) || 0.8);
    return result;
  });
  return {
    animationName: active.map((effect) => animationName(String(effect.effect))).join(', '),
    animationDuration: active.map((effect) => `${Number(effect.duration) || 0.8}s`).join(', '),
    animationDelay: delays.map((delay) => `${delay}s`).join(', '),
    animationIterationCount: active.map((effect) => String(Number(effect.repeat) || 1)).join(', '),
    animationFillMode: active.map(() => 'both').join(', '),
    animationTimingFunction: active.map(() => 'ease-in-out').join(', '),
  };
};

export default function StudioAnimatedElement({
  children,
  animation,
}: {
  children: ReactNode;
  animation?: Record<string, unknown>;
}) {
  return (
    <div className="h-full w-full" style={animationStyle(animation)}>
      {children}
    </div>
  );
}
