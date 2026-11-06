import type { CSSProperties } from 'react';

const transitionAnimationName = (effect: string) =>
  ({
    fade: 'studio-appear',
    push: 'studio-fly-in',
    wipe: 'studio-wipe',
    split: 'studio-split',
    reveal: 'studio-wipe',
    cut: 'studio-appear',
    'random-bars': 'studio-random-bars',
    morph: 'studio-zoom',
    cover: 'studio-wipe',
    uncover: 'studio-wipe',
    flash: 'studio-flash',
    'fall-over': 'studio-grow-turn',
    drape: 'studio-split',
    curtains: 'studio-split',
    wind: 'studio-fly-in',
    orbit: 'studio-grow-turn',
    zoom: 'studio-zoom',
    pan: 'studio-fly-in',
    'ferris-wheel': 'studio-grow-turn',
    conveyor: 'studio-fly-in',
    rotate: 'studio-grow-turn',
    window: 'studio-split',
    gallery: 'studio-zoom',
    cube: 'studio-grow-turn',
    doors: 'studio-split',
  })[effect] || '';

export const studioTransitionStyle = (
  transition?: Record<string, unknown>,
): CSSProperties => {
  const effect = String(transition?.effect || 'none');
  const animationName = transitionAnimationName(effect);
  if (!animationName) return {};
  return {
    animationName,
    animationDuration: `${Math.max(0.1, Number(transition?.duration) || 0.7)}s`,
    animationFillMode: 'both',
    animationTimingFunction: 'ease-in-out',
  };
};

export const replayStudioTransition = (
  element: HTMLElement | null,
  transition?: Record<string, unknown>,
) => {
  if (!element) return;
  const style = studioTransitionStyle(transition);
  element.style.animation = 'none';
  void element.offsetWidth;
  element.style.animation = '';
  Object.assign(element.style, style);
};
