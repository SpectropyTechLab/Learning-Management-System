import type { CSSProperties } from 'react';

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
    shape: 'studio-shape-reveal',
    dissolve: 'studio-dissolve',
    blinds: 'studio-blinds',
    clock: 'studio-clock',
    ripple: 'studio-ripple',
    honeycomb: 'studio-honeycomb',
    glitter: 'studio-glitter',
    vortex: 'studio-vortex',
    switch: 'studio-switch',
    flip: 'studio-flip',
    box: 'studio-box',
    comb: 'studio-comb',
    'fly-through': 'studio-fly-through',
  })[effect] || '';

export const studioTransitionStyle = (
  transition?: Record<string, unknown>,
): CSSProperties => {
  const effect = String(transition?.effect || 'none');
  const animationName = transitionAnimationName(effect);
  if (!animationName) return {};
  const direction = String(transition?.direction || 'right');
  const intensity = String(transition?.intensity || 'standard');
  const distance = intensity === 'subtle' ? '12%' : intensity === 'dramatic' ? '55%' : '30%';
  const x = direction === 'left' ? `-${distance}` : direction === 'right' ? distance : '0%';
  const y = direction === 'top' ? `-${distance}` : direction === 'bottom' ? distance : '0%';
  const clipFrom = direction === 'left' ? 'inset(0 0 0 100%)'
    : direction === 'top' ? 'inset(100% 0 0 0)'
      : direction === 'bottom' ? 'inset(0 0 100% 0)' : 'inset(0 100% 0 0)';
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
    transformOrigin: direction === 'left' ? 'left center' : direction === 'right' ? 'right center' : direction === 'top' ? 'center top' : direction === 'bottom' ? 'center bottom' : 'center',
    '--studio-enter-x': x,
    '--studio-enter-y': y,
    '--studio-clip-from': clipFrom,
  } as CSSProperties;
};

export const replayStudioTransition = (
  element: HTMLElement | null,
  transition?: Record<string, unknown>,
) => {
  if (!element) return;
  void playStudioTransitionSound(transition?.sound).catch(() => undefined);
  const style = studioTransitionStyle(transition);
  element.style.animation = 'none';
  void element.offsetWidth;
  element.style.animation = '';
  Object.assign(element.style, style);
};
