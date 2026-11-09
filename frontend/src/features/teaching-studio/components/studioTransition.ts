import type { CSSProperties } from 'react';

let transitionAudioContext: AudioContext | null = null;

const audioContext = () => {
  if (typeof window === 'undefined' || !window.AudioContext) return null;
  transitionAudioContext ??= new window.AudioContext();
  return transitionAudioContext;
};

export const unlockStudioTransitionAudio = async () => {
  const context = audioContext();
  if (context?.state === 'suspended') await context.resume();
};

export const playStudioTransitionSound = async (value: unknown) => {
  const sound = String(value || 'none').toLowerCase();
  if (sound === 'none') return;
  const context = audioContext();
  if (!context) return;
  if (context.state === 'suspended') await context.resume();
  const start = context.currentTime + 0.01;

  if (sound === 'chime') {
    [659.25, 987.77].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.18, start + index * 0.08 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + index * 0.08 + 0.42);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start + index * 0.08);
      oscillator.stop(start + index * 0.08 + 0.45);
    });
    return;
  }

  if (sound === 'click') {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(1200, start);
    oscillator.frequency.exponentialRampToValueAtTime(260, start + 0.055);
    gain.gain.setValueAtTime(0.12, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.065);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.07);
    return;
  }

  if (sound === 'whoosh') {
    const duration = 0.5;
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
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(250, start);
    filter.frequency.exponentialRampToValueAtTime(4200, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.16, start + duration * 0.45);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(context.destination);
    source.start(start);
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
  void playStudioTransitionSound(transition?.sound).catch(() => undefined);
  const style = studioTransitionStyle(transition);
  element.style.animation = 'none';
  void element.offsetWidth;
  element.style.animation = '';
  Object.assign(element.style, style);
};
