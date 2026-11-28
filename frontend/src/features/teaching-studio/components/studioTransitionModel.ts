export const STUDIO_TRANSITION_EFFECTS = [
  'none', 'morph', 'fade', 'push', 'wipe', 'split', 'reveal', 'cut', 'random-bars',
  'shape', 'uncover', 'cover', 'flash', 'fall-over', 'drape', 'curtains', 'wind',
  'prestige', 'fracture', 'crush', 'peel-off', 'page-curl', 'airplane', 'origami',
  'dissolve', 'checkerboard', 'blinds', 'clock', 'ripple', 'honeycomb', 'glitter',
  'vortex', 'shred', 'switch', 'flip', 'gallery', 'cube', 'doors', 'box', 'comb',
  'zoom', 'random', 'pan', 'ferris-wheel', 'conveyor', 'rotate', 'window', 'orbit',
  'fly-through',
] as const;

export type StudioTransitionEffectName = typeof STUDIO_TRANSITION_EFFECTS[number];
export type StudioTransitionEasing = 'smooth' | 'decelerate' | 'accelerate' | 'linear' | 'cinematic';
export type StudioTransitionIntensity = 'subtle' | 'standard' | 'dramatic';

export interface StudioTransitionCustomSound {
  resourceId: number;
  resourceVersionId: number;
  name: string;
  mimeType?: string;
}

export interface StudioTransitionSettings {
  schemaVersion: 1;
  effect: StudioTransitionEffectName;
  option?: string;
  direction?: string;
  duration: number;
  sound: string;
  customSound?: StudioTransitionCustomSound | null;
  loopSound: boolean;
  advanceOnClick: boolean;
  advanceAfterEnabled: boolean;
  advanceAfterSeconds: number;
  easing: StudioTransitionEasing;
  intensity: StudioTransitionIntensity;
  respectReducedMotion: boolean;
}

const effectSet = new Set<string>(STUDIO_TRANSITION_EFFECTS);
const easingSet = new Set<StudioTransitionEasing>(['smooth', 'decelerate', 'accelerate', 'linear', 'cinematic']);
const intensitySet = new Set<StudioTransitionIntensity>(['subtle', 'standard', 'dramatic']);

const finiteInRange = (value: unknown, fallback: number, min: number, max: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

export const normalizeStudioTransition = (value: unknown): StudioTransitionSettings => {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const effect = effectSet.has(String(source.effect))
    ? String(source.effect) as StudioTransitionEffectName
    : 'none';
  const easing = easingSet.has(source.easing as StudioTransitionEasing)
    ? source.easing as StudioTransitionEasing
    : 'smooth';
  const intensity = intensitySet.has(source.intensity as StudioTransitionIntensity)
    ? source.intensity as StudioTransitionIntensity
    : 'standard';
  const rawCustom = source.customSound && typeof source.customSound === 'object' && !Array.isArray(source.customSound)
    ? source.customSound as Record<string, unknown>
    : null;
  const resourceId = Number(rawCustom?.resourceId);
  const resourceVersionId = Number(rawCustom?.resourceVersionId);
  const customSound = Number.isInteger(resourceId) && resourceId > 0 && Number.isInteger(resourceVersionId) && resourceVersionId > 0
    ? {
        resourceId,
        resourceVersionId,
        name: String(rawCustom?.name || 'Custom sound').slice(0, 250),
        ...(rawCustom?.mimeType ? { mimeType: String(rawCustom.mimeType).slice(0, 120) } : {}),
      }
    : null;
  const option = typeof source.option === 'string' && source.option ? source.option : undefined;
  const direction = typeof source.direction === 'string' && source.direction ? source.direction : option;
  return {
    schemaVersion: 1,
    effect,
    ...(option ? { option } : {}),
    ...(direction ? { direction } : {}),
    duration: finiteInRange(source.duration, 0.7, 0.1, 20),
    sound: String(source.sound || 'none').slice(0, 80),
    ...(customSound ? { customSound } : {}),
    loopSound: source.loopSound === true,
    advanceOnClick: source.advanceOnClick !== false,
    advanceAfterEnabled: source.advanceAfterEnabled === true,
    advanceAfterSeconds: finiteInRange(source.advanceAfterSeconds, 0, 0, 3600),
    easing,
    intensity,
    respectReducedMotion: source.respectReducedMotion !== false,
  };
};

export const studioScreenIsHidden = (settings: unknown) => {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return false;
  const record = settings as Record<string, unknown>;
  if (record.hidden === true) return true;
  const imported = record.import;
  return Boolean(imported && typeof imported === 'object' && !Array.isArray(imported) && (imported as Record<string, unknown>).hidden === true);
};
