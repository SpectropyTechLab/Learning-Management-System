import type { CSSProperties } from 'react';
import { flushSync } from 'react-dom';

let transitionAudioContext: AudioContext | null = null;
let transitionSoundTimer: number | null = null;
const activeTransitionSources = new Set<AudioScheduledSourceNode>();

const audioContext = () => {
  if (typeof window === 'undefined' || !window.AudioContext) return null;
  transitionAudioContext ??= new window.AudioContext();
  return transitionAudioContext;
};

export const unlockStudioTransitionAudio = async () => {
  const context = audioContext();
  if (context?.state === 'suspended') await context.resume();
};

export const stopStudioTransitionSound = () => {
  if (transitionSoundTimer !== null) window.clearTimeout(transitionSoundTimer);
  transitionSoundTimer = null;
  activeTransitionSources.forEach((source) => {
    try { source.stop(); } catch { /* source already stopped */ }
  });
  activeTransitionSources.clear();
};

const trackSource = (source: AudioScheduledSourceNode) => {
  activeTransitionSources.add(source);
  source.addEventListener('ended', () => activeTransitionSources.delete(source), { once: true });
};

const playTone = (
  context: AudioContext,
  start: number,
  frequency: number,
  duration: number,
  gainValue = 0.14,
  endFrequency = frequency,
  type: OscillatorType = 'sine',
) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + Math.min(0.015, duration / 4));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  trackSource(oscillator);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.01);
};

const playNoise = (
  context: AudioContext,
  start: number,
  duration: number,
  fromFrequency: number,
  toFrequency: number,
  gainValue = 0.12,
) => {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) {
    const progress = index / samples.length;
    samples[index] = (Math.random() * 2 - 1) * Math.sin(Math.PI * progress);
  }
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.Q.value = 0.8;
  filter.frequency.setValueAtTime(fromFrequency, start);
  filter.frequency.exponentialRampToValueAtTime(toFrequency, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(gainValue, start + duration * 0.4);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter).connect(gain).connect(context.destination);
  trackSource(source);
  source.start(start);
};

export const playStudioTransitionSound = async (
  value: unknown,
  options: { loop?: boolean } = {},
) => {
  const sound = String(value || 'none').toLowerCase();
  if (sound === 'none') return;
  stopStudioTransitionSound();
  if (sound === 'stop') return;
  const context = audioContext();
  if (!context) return;
  if (context.state === 'suspended') await context.resume();
  const start = context.currentTime + 0.01;
  if (sound === 'chime') [659.25, 987.77].forEach((frequency, index) => playTone(context, start + index * 0.08, frequency, 0.42, 0.18));
  else if (sound === 'coin') [880, 1320].forEach((frequency, index) => playTone(context, start + index * 0.06, frequency, 0.2, 0.12, frequency * 1.08, 'square'));
  else if (sound === 'cash-register') [440, 660, 1320].forEach((frequency, index) => playTone(context, start + index * 0.075, frequency, 0.18, 0.11));
  else if (sound === 'laser' || sound === 'voltage') playTone(context, start, sound === 'laser' ? 1500 : 900, 0.38, 0.14, sound === 'laser' ? 180 : 2600, 'sawtooth');
  else if (['click', 'camera', 'hammer', 'typewriter'].includes(sound)) {
    const repeats = sound === 'typewriter' ? 4 : sound === 'camera' ? 2 : 1;
    for (let index = 0; index < repeats; index += 1) playTone(context, start + index * 0.07, sound === 'hammer' ? 180 : 1200, sound === 'hammer' ? 0.15 : 0.065, 0.12, 260, 'square');
  } else if (['whoosh', 'arrow', 'push', 'suction', 'wind', 'breeze'].includes(sound)) {
    const reverse = sound === 'suction';
    playNoise(context, start, sound === 'wind' ? 0.9 : 0.5, reverse ? 4200 : 180, reverse ? 180 : 4200, sound === 'breeze' ? 0.07 : 0.15);
  } else if (sound === 'bomb' || sound === 'explosion') {
    playTone(context, start, 120, 0.65, 0.2, 35, 'sawtooth');
    playNoise(context, start + 0.04, 0.7, 2200, 90, 0.22);
  } else if (sound === 'applause' || sound === 'drum-roll') {
    const repeats = sound === 'applause' ? 8 : 12;
    for (let index = 0; index < repeats; index += 1)
      playNoise(context, start + index * (sound === 'applause' ? 0.08 : 0.045), 0.09, 140, 1600, 0.055);
  } else playNoise(context, start, 0.45, 220, 3200, 0.12);

  if (options.loop) {
    transitionSoundTimer = window.setTimeout(() => {
      void playStudioTransitionSound(sound, options).catch(() => undefined);
    }, 1100);
  }
};

const transitionAnimationName = (effect: string) =>
  ({
    morph: 'studio-transition-morph', fade: 'studio-transition-fade', push: 'studio-transition-push',
    wipe: 'studio-transition-wipe', split: 'studio-transition-split', reveal: 'studio-transition-reveal',
    cut: 'studio-transition-cut', 'random-bars': 'studio-transition-random-bars', shape: 'studio-transition-shape',
    uncover: 'studio-transition-uncover', cover: 'studio-transition-cover', flash: 'studio-transition-flash',
    'fall-over': 'studio-transition-fall-over', drape: 'studio-transition-drape', curtains: 'studio-transition-curtains',
    wind: 'studio-transition-wind', prestige: 'studio-transition-prestige', fracture: 'studio-transition-fracture',
    crush: 'studio-transition-crush', 'peel-off': 'studio-transition-peel-off', 'page-curl': 'studio-transition-page-curl',
    airplane: 'studio-transition-airplane', origami: 'studio-transition-origami', dissolve: 'studio-transition-dissolve',
    checkerboard: 'studio-transition-checkerboard', blinds: 'studio-transition-blinds', clock: 'studio-transition-clock',
    ripple: 'studio-transition-ripple', honeycomb: 'studio-transition-honeycomb', glitter: 'studio-transition-glitter',
    vortex: 'studio-transition-vortex', shred: 'studio-transition-shred', switch: 'studio-transition-switch',
    flip: 'studio-transition-flip', gallery: 'studio-transition-gallery', cube: 'studio-transition-cube',
    doors: 'studio-transition-doors', box: 'studio-transition-box', comb: 'studio-transition-comb',
    zoom: 'studio-transition-zoom', random: 'studio-transition-random', pan: 'studio-transition-pan',
    'ferris-wheel': 'studio-transition-ferris-wheel', conveyor: 'studio-transition-conveyor',
    rotate: 'studio-transition-rotate', window: 'studio-transition-window', orbit: 'studio-transition-orbit',
    'fly-through': 'studio-transition-fly-through',
  })[effect] || '';

const RANDOM_TRANSITION_EFFECTS = [
  'morph', 'fade', 'push', 'wipe', 'split', 'reveal', 'cut', 'random-bars', 'shape', 'uncover',
  'cover', 'flash', 'fall-over', 'drape', 'curtains', 'wind', 'prestige', 'fracture', 'crush',
  'peel-off', 'page-curl', 'airplane', 'origami', 'dissolve', 'checkerboard', 'blinds', 'clock',
  'ripple', 'honeycomb', 'glitter', 'vortex', 'shred', 'switch', 'flip', 'gallery', 'cube',
  'doors', 'box', 'comb', 'zoom', 'pan', 'ferris-wheel', 'conveyor', 'rotate', 'window', 'orbit',
  'fly-through',
] as const;

const randomTransitionEffect = () =>
  RANDOM_TRANSITION_EFFECTS[Math.floor(Math.random() * RANDOM_TRANSITION_EFFECTS.length)];

const steppedBarsClip = (axis: 'horizontal' | 'vertical', lengths: number[]) => {
  const points = ['0% 0%'];
  if (axis === 'horizontal') {
    lengths.forEach((length, index) => {
      const y0 = (index / lengths.length) * 100;
      const y1 = ((index + 1) / lengths.length) * 100;
      points.push(`${length}% ${y0}%`, `${length}% ${y1}%`);
    });
    points.push('0% 100%');
  } else {
    lengths.forEach((length, index) => {
      const x0 = (index / lengths.length) * 100;
      const x1 = ((index + 1) / lengths.length) * 100;
      points.push(`${x0}% ${length}%`, `${x1}% ${length}%`);
    });
    points.push('100% 0%');
  }
  return points.join(',');
};

const barsClipValues = (axis: 'horizontal' | 'vertical') => {
  const count = 16;
  const randomLengths = Array.from({ length: count }, () => 24 + Math.floor(Math.random() * 73));
  return {
    start: steppedBarsClip(axis, Array.from({ length: count }, () => 0)),
    middle: steppedBarsClip(axis, randomLengths),
    end: steppedBarsClip(axis, Array.from({ length: count }, () => 100)),
  };
};

const repeatedSvgMask = (kind: 'honeycomb' | 'diamond' | 'hexagon') => {
  const shape = kind === 'honeycomb'
    ? '<path d="M25 2h50l23 41-23 41H25L2 43z" fill="white"/>'
    : kind === 'hexagon'
      ? '<path d="M25 3h50l22 40-22 40H25L3 43z" fill="white"/>'
      : '<path d="M50 2 98 50 50 98 2 50z" fill="white"/>';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="86" viewBox="0 0 100 86">${shape}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

const fractureSvgMask = () => {
  const tiles: string[] = [];
  const columns = 4;
  const rows = 3;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const left = (column / columns) * 100;
      const right = ((column + 1) / columns) * 100;
      const top = (row / rows) * 100;
      const bottom = ((row + 1) / rows) * 100;
      const centerX = (left + right) / 2 + ((row + column) % 2 ? 4 : -4);
      const centerY = (top + bottom) / 2 + ((row + column) % 2 ? -3 : 3);
      const vertices = [[left, top], [right, top], [right, bottom], [left, bottom]];
      vertices.forEach((vertex, index) => {
        const next = vertices[(index + 1) % vertices.length];
        tiles.push(`<polygon points="${vertex[0]},${vertex[1]} ${next[0]},${next[1]} ${centerX},${centerY}" fill="white"/>`);
      });
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="563" viewBox="0 0 100 56.3">${tiles.join('')}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

const DYNAMIC_CONTENT_EFFECTS = new Set([
  'pan', 'ferris-wheel', 'conveyor', 'rotate', 'window', 'orbit', 'fly-through',
]);

export const studioDynamicTransitionClass = (transition?: Record<string, unknown>) => {
  const effect = String(transition?.effect || '');
  return DYNAMIC_CONTENT_EFFECTS.has(effect) ? `studio-dynamic-transition studio-dynamic-transition-${effect}` : '';
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> };
};

export const supportsStudioSlideTransitions = () =>
  typeof document !== 'undefined' && typeof (document as ViewTransitionDocument).startViewTransition === 'function';

export const studioUsesViewTransition = (transition?: Record<string, unknown>) => {
  const effect = String(transition?.effect || 'none');
  return supportsStudioSlideTransitions() && effect !== 'none' && effect !== 'cover' && !DYNAMIC_CONTENT_EFFECTS.has(effect);
};

let studioTransitionGeneration = 0;
let activeStudioViewTransition: { skipTransition?: () => void } | null = null;

export const startStudioSlideTransition = (
  update: () => void,
  transition?: Record<string, unknown>,
) => {
  const requestedEffect = String(transition?.effect || 'none');
  const effect = requestedEffect === 'random'
    ? randomTransitionEffect()
    : requestedEffect;
  if (requestedEffect === 'none' || requestedEffect === 'cover') return false;

  if (requestedEffect === 'random' && DYNAMIC_CONTENT_EFFECTS.has(effect)) {
    const generation = ++studioTransitionGeneration;
    activeStudioViewTransition?.skipTransition?.();
    activeStudioViewTransition = null;
    flushSync(update);
    window.requestAnimationFrame(() => {
      if (generation !== studioTransitionGeneration) return;
      const layer = document.querySelector<HTMLElement>('[data-testid="slide-transition-layer"]');
      replayDynamicContentTransition(layer, { ...transition, effect });
    });
    return true;
  }
  if (DYNAMIC_CONTENT_EFFECTS.has(effect)) return false;
  if (!supportsStudioSlideTransitions()) return false;

  const option = String(transition?.option || transition?.direction || 'right');
  const duration = Math.max(100, (Number(transition?.duration) || 0.7) * 1000);
  const root = document.documentElement;
  const generation = ++studioTransitionGeneration;
  activeStudioViewTransition?.skipTransition?.();
  activeStudioViewTransition = null;
  [...root.classList].filter((name) => name.startsWith('studio-vt-')).forEach((name) => root.classList.remove(name));
  root.classList.add(`studio-vt-${effect}`, `studio-vt-${effect}-${option}`);
  root.style.setProperty('--studio-vt-duration', `${duration}ms`);
  const fromLeft = option.includes('left');
  const fromTop = option.includes('top');
  root.style.setProperty('--studio-vt-x', fromLeft ? '-100%' : option.includes('right') ? '100%' : '0%');
  root.style.setProperty('--studio-vt-y', fromTop ? '-100%' : option.includes('bottom') ? '100%' : '0%');
  root.style.setProperty('--studio-vt-sign', fromLeft || fromTop || option.includes('counter') ? '-1' : '1');
  const cubeAxis = option === 'top' || option === 'bottom' ? 'X' : 'Y';
  root.style.setProperty('--studio-vt-cube-out-rotation', `rotate${cubeAxis}(calc(var(--studio-vt-sign) * -90deg))`);
  root.style.setProperty('--studio-vt-cube-in-rotation', `rotate${cubeAxis}(calc(var(--studio-vt-sign) * 90deg))`);
  const barsAxis = option === 'vertical' ? 'vertical' : 'horizontal';
  const barClips = effect === 'comb'
    ? {
        start: steppedBarsClip(barsAxis, Array.from({ length: 8 }, () => 0)),
        middle: steppedBarsClip(barsAxis, Array.from({ length: 8 }, () => 58)),
        end: steppedBarsClip(barsAxis, Array.from({ length: 8 }, () => 100)),
      }
    : barsClipValues(barsAxis);
  root.style.setProperty('--studio-bars-start', barClips.start);
  root.style.setProperty('--studio-bars-middle', barClips.middle);
  root.style.setProperty('--studio-bars-end', barClips.end);
  root.style.setProperty('--studio-blinds-mask', option.includes('vertical')
    ? 'repeating-linear-gradient(to right,#000 0 var(--studio-blind-width),transparent var(--studio-blind-width) 6.25%)'
    : 'repeating-linear-gradient(to bottom,#000 0 var(--studio-blind-width),transparent var(--studio-blind-width) 6.25%)');
  root.style.setProperty('--studio-checker-mask', 'conic-gradient(#000 25%,transparent 0 50%,#000 0 75%,transparent 0)');
  root.style.setProperty('--studio-honeycomb-mask', repeatedSvgMask('honeycomb'));
  root.style.setProperty('--studio-glitter-mask', repeatedSvgMask(option.startsWith('hexagon') ? 'hexagon' : 'diamond'));
  root.style.setProperty('--studio-fracture-mask', fractureSvgMask());
  const directionOption = option.replace(/^(smooth|black)-/, '');
  const clip = directionOption === 'left' ? 'polygon(0 0,0 0,0 100%,0 100%)'
    : directionOption === 'right' ? 'polygon(100% 0,100% 0,100% 100%,100% 100%)'
      : directionOption === 'top' ? 'polygon(0 0,100% 0,100% 0,0 0)'
        : directionOption === 'bottom' ? 'polygon(0 100%,100% 100%,100% 100%,0 100%)'
          : directionOption === 'top-left' ? 'polygon(0 0,0 0,0 0,0 0)'
            : directionOption === 'top-right' ? 'polygon(100% 0,100% 0,100% 0,100% 0)'
              : directionOption === 'bottom-left' ? 'polygon(0 100%,0 100%,0 100%,0 100%)'
                : directionOption === 'bottom-right' ? 'polygon(100% 100%,100% 100%,100% 100%,100% 100%)'
                  : directionOption.endsWith('left') ? 'polygon(100% 0,100% 0,100% 100%,100% 100%)'
                    : directionOption.endsWith('right') ? 'polygon(0 0,0 0,0 100%,0 100%)'
                  : 'polygon(50% 50%,50% 50%,50% 50%,50% 50%)';
  root.style.setProperty('--studio-vt-clip-from', clip);
  const viewDocument = document as ViewTransitionDocument;
  const clear = () => {
    if (generation !== studioTransitionGeneration) return;
    activeStudioViewTransition = null;
    root.classList.remove(`studio-vt-${effect}`, `studio-vt-${effect}-${option}`);
    for (const property of ['--studio-vt-duration', '--studio-vt-x', '--studio-vt-y', '--studio-vt-sign', '--studio-vt-cube-out-rotation', '--studio-vt-cube-in-rotation', '--studio-vt-clip-from', '--studio-bars-start', '--studio-bars-middle', '--studio-bars-end', '--studio-blinds-mask', '--studio-blind-width', '--studio-checker-mask', '--studio-honeycomb-mask', '--studio-glitter-mask', '--studio-fracture-mask'])
      root.style.removeProperty(property);
  };
  try {
    const viewTransition = viewDocument.startViewTransition?.(() => flushSync(update));
    if (!viewTransition) { clear(); return false; }
    activeStudioViewTransition = viewTransition;
    void viewTransition.finished.then(clear, clear);
    window.setTimeout(clear, duration + 300);
    return true;
  } catch {
    clear();
    return false;
  }
};

const LAYERED_PREVIEW_EFFECTS = new Set([
  'fracture', 'crush', 'peel-off', 'page-curl', 'airplane', 'origami', 'cube',
]);

const clearTransitionPreviewState = (element: HTMLElement) => {
  element.classList.remove('studio-transition-previewing');
  element.style.removeProperty('opacity');
  (element.parentElement || element)
    .querySelectorAll<HTMLElement>('[data-studio-transition-artifact]')
    .forEach((artifact) => artifact.remove());
};

const previewClone = (element: HTMLElement) => {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.removeAttribute('data-testid');
  clone.dataset.studioTransitionArtifact = 'true';
  clone.classList.add('studio-transition-previewing');
  clone.style.removeProperty('opacity');
  Object.assign(clone.style, {
    position: 'absolute', inset: '0', width: '100%', height: '100%', zIndex: '80',
    pointerEvents: 'none', animation: 'none', transformOrigin: '50% 50%', overflow: 'hidden',
  });
  return clone;
};

const replayLayeredTransition = (
  element: HTMLElement,
  transition: Record<string, unknown>,
) => {
  const effect = String(transition.effect || '');
  if (!LAYERED_PREVIEW_EFFECTS.has(effect) || !element.parentElement || typeof element.animate !== 'function') return false;
  clearTransitionPreviewState(element);
  element.classList.add('studio-transition-previewing');
  element.style.animation = 'none';
  element.style.opacity = '0';
  const parent = element.parentElement;
  const duration = Math.max(180, (Number(transition.duration) || 0.9) * 1000);
  const easing = String(transition.easing || 'cubic-bezier(.22,.75,.18,1)');
  const option = String(transition.option || transition.direction || 'right');
  const sign = option.includes('left') || option.includes('top') ? -1 : 1;
  const animations: Animation[] = [];

  if (effect === 'fracture') {
    const rows = 3;
    const columns = 4;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const left = column * (100 / columns);
        const right = (column + 1) * (100 / columns);
        const top = row * (100 / rows);
        const bottom = (row + 1) * (100 / rows);
        const cell = row * columns + column;
        const triangles = [
          `polygon(${left}% ${top}%,${right}% ${top}%,${right}% ${bottom}%)`,
          `polygon(${left}% ${top}%,${right}% ${bottom}%,${left}% ${bottom}%)`,
        ];
        triangles.forEach((clipPath, half) => {
          const piece = previewClone(element);
          piece.style.clipPath = clipPath;
          parent.append(piece);
          const seed = cell * 2 + half;
          const flightX = (column - 1.5) * 74 + (half ? -28 : 28);
          animations.push(piece.animate([
            { opacity: 1, transform: 'perspective(1200px) translate3d(0,0,0) rotate(0)' },
            { opacity: .98, offset: .16, transform: `perspective(1200px) translate3d(${(column - 1.5) * 8}px,${row * 5}px,${seed % 2 ? 32 : -32}px) rotate(${seed % 2 ? -3 : 3}deg)` },
            { opacity: 0, transform: `perspective(1200px) translate3d(${flightX}px,${300 + row * 90}px,${seed % 2 ? 190 : -150}px) rotate(${sign * (28 + seed * 5)}deg)` },
          ], { duration, delay: seed * 15, easing: 'cubic-bezier(.35,.05,.8,.35)', fill: 'both' }));
        });
      }
    }
  } else {
    const clone = previewClone(element);
    parent.append(clone);
    const frames: Keyframe[] = effect === 'crush'
      ? [{ opacity: 1, transform: 'scale(1)' }, { opacity: .75, offset: .45, transform: `perspective(1200px) scaleX(.55) scaleY(1.08) rotateY(${sign * 12}deg)` }, { opacity: 0, transform: `perspective(1200px) scaleX(.03) scaleY(1.35) rotateY(${sign * 70}deg)` }]
      : effect === 'peel-off'
        ? [{ opacity: 1, clipPath: 'inset(0)', transform: 'perspective(1500px) rotateY(0) translate(0)' }, { opacity: .9, offset: .48, clipPath: sign < 0 ? 'polygon(0 0,72% 0,56% 100%,0 100%)' : 'polygon(28% 0,100% 0,100% 100%,44% 100%)', transform: `perspective(1500px) rotateY(${sign * 35}deg) translateX(${sign * 18}%)` }, { opacity: 0, clipPath: sign < 0 ? 'polygon(0 0,5% 0,0 100%)' : 'polygon(95% 0,100% 0,100% 100%)', transform: `perspective(1500px) rotateY(${sign * 88}deg) translateX(${sign * 90}%)` }]
        : effect === 'page-curl'
          ? [{ opacity: 1, clipPath: 'inset(0)', transform: 'perspective(1600px) rotateY(0)', filter: 'drop-shadow(0 0 0 transparent)' }, { opacity: .95, offset: .52, clipPath: sign < 0 ? 'polygon(0 0,100% 0,72% 100%,0 100%)' : 'polygon(0 0,100% 0,100% 100%,28% 100%)', transform: `perspective(1600px) rotateY(${sign * 42}deg)`, filter: `drop-shadow(${sign * 35}px 16px 25px #0009)` }, { opacity: 0, clipPath: sign < 0 ? 'polygon(0 0,8% 0,0 100%)' : 'polygon(92% 0,100% 0,100% 100%)', transform: `perspective(1600px) rotateY(${sign * 88}deg) translateX(${sign * 85}%)`, filter: `drop-shadow(${sign * 55}px 20px 30px #0007)` }]
          : effect === 'airplane'
            ? [{ opacity: 1, clipPath: 'inset(0)', transform: 'translate(0) scale(1) rotate(0)' }, { opacity: 1, offset: .34, clipPath: 'polygon(0 42%,43% 42%,50% 0,58% 42%,100% 42%,100% 58%,58% 58%,50% 100%,43% 58%,0 58%)', transform: 'scale(.72)' }, { opacity: 0, clipPath: 'polygon(0 42%,43% 42%,50% 0,58% 42%,100% 42%,100% 58%,58% 58%,50% 100%,43% 58%,0 58%)', transform: `translate(${sign * 115}%,-72%) scale(.1) rotate(${sign * 34}deg)` }]
            : effect === 'origami'
              ? [{ opacity: 1, clipPath: 'inset(0)', transform: 'perspective(1400px) rotateY(0) scale(1)' }, { opacity: .96, offset: .4, clipPath: 'polygon(0 0,50% 18%,100% 0,82% 50%,100% 100%,50% 82%,0 100%,18% 50%)', transform: `perspective(1400px) rotateY(${sign * 18}deg) scale(.72)` }, { opacity: 0, clipPath: 'polygon(0 50%,38% 35%,50% 0,62% 35%,100% 50%,62% 65%,50% 100%,38% 65%)', transform: `translate(${sign * 105}%,-35%) rotate(${sign * 55}deg) scale(.12)` }]
              : [{ opacity: 1, transform: 'perspective(1400px) rotateY(0) translateZ(0)', transformOrigin: sign < 0 ? 'left center' : 'right center' }, { opacity: .95, transform: `perspective(1400px) rotateY(${sign * 90}deg) translateZ(0)`, transformOrigin: sign < 0 ? 'left center' : 'right center' }];
    animations.push(clone.animate(frames, { duration, easing, fill: 'both' }));
  }

  window.setTimeout(() => { element.style.opacity = '1'; }, Math.max(0, duration - 60));
  void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
    animations.forEach((animation) => animation.cancel());
    clearTransitionPreviewState(element);
  });
  return true;
};

const dynamicPreviewFrames = (effect: string, option: string) => {
  const left = option.includes('left');
  const top = option.includes('top');
  const x = left ? '-65%' : option.includes('right') ? '65%' : '0%';
  const y = top ? '-55%' : option.includes('bottom') ? '55%' : '0%';
  const sign = left || top ? -1 : 1;
  if (effect === 'pan') return [{ opacity: 0, transform: `translate(${x}, ${y})` }, { opacity: 1, transform: 'translate(0, 0)' }];
  if (effect === 'ferris-wheel') return [{ opacity: 0, transform: `translate(${x || '40%'}, 55%) rotate(${sign * 100}deg) scale(.55)` }, { opacity: 1, transform: 'none' }];
  if (effect === 'conveyor') return [{ opacity: 0, transform: `perspective(1200px) translateX(${x || '70%'}) rotateX(24deg) rotateY(${sign * 22}deg)` }, { opacity: 1, transform: 'none' }];
  if (effect === 'rotate') return [{ opacity: 0, transform: `translate(${x}, ${y}) rotate(${sign * 120}deg) scale(.55)` }, { opacity: 1, transform: 'none' }];
  if (effect === 'window') return [{ opacity: 0, clipPath: option.includes('horizontal') ? 'inset(50% 0)' : 'inset(0 50%)', transform: 'scale(.2)' }, { opacity: 1, clipPath: 'inset(0)', transform: 'scale(1)' }];
  if (effect === 'orbit') return [{ opacity: 0, transform: `translate(${x || '60%'}, ${y || '40%'}) rotate(${sign * 190}deg) scale(.25)` }, { opacity: 1, offset: .72, transform: `translate(${sign * 3}%, -3%) rotate(${sign * 4}deg) scale(1.04)` }, { opacity: 1, transform: 'none' }];
  return [{ opacity: 0, transform: `perspective(1500px) translateZ(${option.startsWith('out') ? '1200px' : '-1200px'})`, filter: 'blur(16px)' }, { opacity: 1, transform: option.includes('bounce') ? 'perspective(1500px) translateZ(90px)' : 'none', filter: 'blur(0)', offset: .78 }, { opacity: 1, transform: 'none', filter: 'none' }];
};

const replayDynamicContentTransition = (
  element: HTMLElement | null,
  transition: Record<string, unknown>,
) => {
  const effect = String(transition.effect || 'pan');
  if (!element || !DYNAMIC_CONTENT_EFFECTS.has(effect) || typeof element.animate !== 'function') return false;
  const candidates = [...element.querySelectorAll<Element>('[data-element-id]')];
  const seen = new Set<string>();
  const targets = candidates.filter((candidate) => {
    const id = (candidate as HTMLElement).dataset.elementId || candidate.getAttribute('data-element-id') || '';
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  if (!targets.length) return false;
  clearTransitionPreviewState(element);
  element.classList.add('studio-transition-previewing');
  element.style.animation = 'none';
  const duration = Math.max(100, (Number(transition.duration) || 0.7) * 1000);
  const option = String(transition.option || transition.direction || 'right');
  const easing = String(transition.easing || 'cubic-bezier(.2,.8,.2,1)');
  const animations = targets.map((target, index) => target.animate(
    dynamicPreviewFrames(effect, option),
    { duration, delay: Math.min(index * 55, duration * .45), easing, fill: 'both' },
  ));
  void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
    animations.forEach((animation) => animation.cancel());
    clearTransitionPreviewState(element);
  });
  return true;
};

export const studioTransitionStyle = (
  transition?: Record<string, unknown>,
): CSSProperties => {
  const requestedEffect = String(transition?.effect || 'none');
  const effect = requestedEffect === 'random'
    ? randomTransitionEffect()
    : requestedEffect;
  const option = String(transition?.option || transition?.direction || 'right');
  let animationName = transitionAnimationName(effect);
  if ((effect === 'fade' || effect === 'cut') && option === 'through-black') animationName = `studio-transition-${effect}-black`;
  if (effect === 'split') animationName = `studio-transition-split-${option}`;
  if (effect === 'reveal' && option.startsWith('black')) animationName = 'studio-transition-reveal-black';
  if (effect === 'random-bars') animationName = `studio-transition-random-bars-${option}`;
  if (effect === 'blinds') animationName = 'studio-transition-blinds';
  if (effect === 'comb') animationName = 'studio-transition-comb';
  if (effect === 'shred') animationName = `studio-transition-shred-${option}`;
  if (effect === 'shape' && (option === 'in' || option === 'out')) animationName = `studio-transition-shape-${option}`;
  if (effect === 'clock') animationName = `studio-transition-clock-${option}`;
  if (!animationName) return {};
  const intensity = String(transition?.intensity || 'standard');
  const distance = intensity === 'subtle' ? '35%' : intensity === 'dramatic' ? '115%' : '100%';
  const directionOption = option.replace(/^(smooth|black)-/, '');
  const fromLeft = directionOption.includes('left');
  const fromRight = directionOption.includes('right');
  const fromTop = directionOption.includes('top');
  const fromBottom = directionOption.includes('bottom');
  const x = fromLeft ? `-${distance}` : fromRight ? distance : '0%';
  const y = fromTop ? `-${distance}` : fromBottom ? distance : '0%';
  const diagonalClip = option === 'top-left' ? 'polygon(0 0,0 0,0 0)'
    : option === 'top-right' ? 'polygon(100% 0,100% 0,100% 0)'
      : option === 'bottom-left' ? 'polygon(0 100%,0 100%,0 100%)'
        : option === 'bottom-right' ? 'polygon(100% 100%,100% 100%,100% 100%)'
          : '';
  const clipFrom = diagonalClip || (fromLeft ? 'inset(0 0 0 100%)'
    : fromTop ? 'inset(100% 0 0 0)'
      : fromBottom ? 'inset(0 0 100% 0)' : 'inset(0 100% 0 0)');
  const wipeOrigin = option === 'top-left' ? '0 0' : option === 'top-right' ? '100% 0'
    : option === 'bottom-left' ? '0 100%' : option === 'bottom-right' ? '100% 100%' : '50% 50%';
  const wipeFrom = option === 'left' ? 'polygon(0 0,0 0,0 100%,0 100%)'
    : option === 'right' ? 'polygon(100% 0,100% 0,100% 100%,100% 100%)'
      : option === 'top' ? 'polygon(0 0,100% 0,100% 0,0 0)'
        : option === 'bottom' ? 'polygon(0 100%,100% 100%,100% 100%,0 100%)'
          : `polygon(${wipeOrigin},${wipeOrigin},${wipeOrigin},${wipeOrigin})`;
  const originX = fromLeft ? '0%' : fromRight ? '100%' : '50%';
  const originY = fromTop ? '0%' : fromBottom ? '100%' : '50%';
  const axis = option.includes('vertical') ? 'vertical' : 'horizontal';
  const reverse = option.includes('left') || option.includes('top') || option.includes('counter') || option.endsWith('-out');
  const barsAxis = option === 'vertical' ? 'vertical' : 'horizontal';
  const bars = barsClipValues(barsAxis);
  const combLengths = Array.from({ length: 8 }, () => 58);
  const comb = {
    start: steppedBarsClip(barsAxis, Array.from({ length: 8 }, () => 0)),
    middle: steppedBarsClip(barsAxis, combLengths),
    end: steppedBarsClip(barsAxis, Array.from({ length: 8 }, () => 100)),
  };
  const transitionBars = effect === 'comb' ? comb : bars;
  const reducedMotion = transition?.respectReducedMotion !== false
    && typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return effect === 'none' ? {} : {
    animationName: 'studio-appear', animationDuration: '0.15s', animationFillMode: 'both',
  };
  return {
    animationName,
    animationDuration: `${Math.max(0.1, Number(transition?.duration) || 0.7)}s`,
    animationFillMode: 'both',
    animationTimingFunction: String(transition?.easing || 'ease-in-out'),
    transformOrigin: `${originX} ${originY}`,
    '--studio-enter-x': x,
    '--studio-enter-y': y,
    '--studio-clip-from': clipFrom,
    '--studio-wipe-from': wipeFrom,
    '--studio-transition-origin-x': originX,
    '--studio-transition-origin-y': originY,
    '--studio-transition-axis': axis,
    '--studio-transition-sign': reverse ? '-1' : '1',
    '--studio-transition-soft-angle': reverse ? '-18deg' : '18deg',
    '--studio-transition-medium-angle': reverse ? '-38deg' : '38deg',
    '--studio-transition-hard-angle': reverse ? '-90deg' : '90deg',
    '--studio-transition-spin-angle': reverse ? '-720deg' : '720deg',
    '--studio-transition-settle-angle': reverse ? '3deg' : '-3deg',
    '--studio-transition-shadow-x': reverse ? '-28px' : '28px',
    '--studio-transition-option': option,
    '--studio-split-start': axis === 'vertical' ? 'inset(50% 0 50% 0)' : 'inset(0 50% 0 50%)',
    '--studio-shape-start': option === 'diamond' ? 'polygon(50% 50%,50% 50%,50% 50%,50% 50%)' : option === 'plus' ? 'polygon(50% 50%,50% 50%,50% 50%,50% 50%,50% 50%,50% 50%,50% 50%,50% 50%,50% 50%,50% 50%,50% 50%,50% 50%)' : 'circle(0% at 50% 50%)',
    '--studio-shape-end': option === 'diamond' ? 'polygon(50% -70%,170% 50%,50% 170%,-70% 50%)' : option === 'plus' ? 'polygon(34% -70%,66% -70%,66% 34%,170% 34%,170% 66%,66% 66%,66% 170%,34% 170%,34% 66%,-70% 66%,-70% 34%,34% 34%)' : 'circle(150% at 50% 50%)',
    '--studio-bars-start': transitionBars.start,
    '--studio-bars-middle': transitionBars.middle,
    '--studio-bars-end': transitionBars.end,
    '--studio-blinds-mask': axis === 'vertical'
      ? 'repeating-linear-gradient(to right,#000 0 var(--studio-blind-width),transparent var(--studio-blind-width) 6.25%)'
      : 'repeating-linear-gradient(to bottom,#000 0 var(--studio-blind-width),transparent var(--studio-blind-width) 6.25%)',
    '--studio-blind-width': '0%',
    '--studio-checker-mask': 'conic-gradient(#000 25%,transparent 0 50%,#000 0 75%,transparent 0)',
    '--studio-honeycomb-mask': repeatedSvgMask('honeycomb'),
    '--studio-glitter-mask': repeatedSvgMask(option.startsWith('hexagon') ? 'hexagon' : 'diamond'),
    '--studio-fracture-mask': fractureSvgMask(),
    '--studio-comb-middle': comb.middle,
    '--studio-doors-start': axis === 'vertical' ? 'inset(0 50%)' : 'inset(50% 0)',
    '--studio-window-start': axis === 'vertical' ? 'inset(0 50%)' : 'inset(50% 0)',
    '--studio-box-start-scale': option === 'in' ? '2.2' : '.15',
    '--studio-zoom-start-scale': option === 'out' ? '2.6' : '.08',
    '--studio-fly-start-z': option.startsWith('out') ? '1400px' : '-1400px',
    '--studio-fly-overshoot-z': option.includes('bounce') ? '110px' : '0px',
    perspective: '1600px',
    backfaceVisibility: 'hidden',
  } as CSSProperties;
};

export const replayStudioTransition = (
  element: HTMLElement | null,
  transition?: Record<string, unknown>,
) => {
  if (!element) return;
  const animationTarget = element.dataset.testid === 'slide-surface'
    ? element.querySelector<HTMLElement>('[data-testid="slide-transition-layer"]')
    : element;
  if (!animationTarget) return;
  void playStudioTransitionSound(transition?.sound).catch(() => undefined);
  const resolvedTransition = transition?.effect === 'random'
    ? { ...transition, effect: randomTransitionEffect() }
    : transition || {};
  if (replayDynamicContentTransition(animationTarget, resolvedTransition)) return;
  if (replayLayeredTransition(animationTarget, resolvedTransition)) return;
  clearTransitionPreviewState(animationTarget);
  animationTarget.classList.add('studio-transition-previewing');
  const style = studioTransitionStyle(resolvedTransition);
  animationTarget.style.animation = 'none';
  void animationTarget.offsetWidth;
  animationTarget.style.animation = '';
  Object.assign(animationTarget.style, style);
  const cleanup = () => {
    clearTransitionPreviewState(animationTarget);
    animationTarget.removeEventListener('animationend', cleanup);
    animationTarget.removeEventListener('animationcancel', cleanup);
  };
  animationTarget.addEventListener('animationend', cleanup);
  animationTarget.addEventListener('animationcancel', cleanup);
};
