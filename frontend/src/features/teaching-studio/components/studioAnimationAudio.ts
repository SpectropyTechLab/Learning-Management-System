import type { StudioAnimationEffectDefinition } from './studioAnimationModel';

let activeAnimationAudio: HTMLAudioElement | null = null;
let activeAnimationContext: AudioContext | null = null;

const tone = (context: AudioContext, at: number, frequency: number, duration: number, type: OscillatorType = 'sine') => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.15, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(at);
  oscillator.stop(at + duration + 0.02);
};

export const stopStudioAnimationSound = () => {
  if (activeAnimationAudio) {
    activeAnimationAudio.pause();
    activeAnimationAudio.currentTime = 0;
    activeAnimationAudio = null;
  }
  if (activeAnimationContext) {
    void activeAnimationContext.close();
    activeAnimationContext = null;
  }
};

export const playStudioAnimationSound = async (effect?: StudioAnimationEffectDefinition | null) => {
  if (!effect) return;
  const sound = String(effect.sound || 'none');
  const customUrl = String(effect.soundUrl || '');
  if (effect.stopPreviousSound === true) stopStudioAnimationSound();
  if (customUrl) {
    const audio = new Audio(customUrl);
    activeAnimationAudio = audio;
    await audio.play();
    return;
  }
  if (sound === 'none') return;
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  activeAnimationContext = context;
  const now = context.currentTime + 0.01;
  const patterns: Record<string, Array<[number, number, number, OscillatorType?]>> = {
    click: [[0, 900, 0.05, 'square']],
    chime: [[0, 784, 0.22], [0.12, 1046, 0.3]],
    camera: [[0, 160, 0.08, 'square'], [0.09, 110, 0.12, 'square']],
    laser: [[0, 1250, 0.2, 'sawtooth'], [0.12, 420, 0.18, 'sawtooth']],
    whoosh: [[0, 180, 0.28, 'sawtooth'], [0.08, 480, 0.22, 'sawtooth']],
    'drum-roll': Array.from({ length: 8 }, (_, index) => [index * 0.055, 125 + index * 12, 0.07, 'square'] as [number, number, number, OscillatorType]),
    typewriter: Array.from({ length: 5 }, (_, index) => [index * 0.075, 780, 0.035, 'square'] as [number, number, number, OscillatorType]),
    applause: Array.from({ length: 10 }, (_, index) => [index * 0.045, 180 + (index % 4) * 70, 0.08, 'square'] as [number, number, number, OscillatorType]),
  };
  (patterns[sound] || patterns.click).forEach(([offset, frequency, duration, type]) => tone(context, now + offset, frequency, duration, type));
  window.setTimeout(() => {
    if (context.state !== 'closed') void context.close();
    if (activeAnimationContext === context) activeAnimationContext = null;
  }, 2200);
};
