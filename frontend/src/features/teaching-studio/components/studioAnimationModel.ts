export type StudioAnimationStart = 'on-click' | 'with-previous' | 'after-previous' | 'trigger';
export type StudioAnimationRepeat = number | 'until-next-click' | 'until-end';
export type StudioAnimationTextSequence = 'object' | 'paragraph' | 'word' | 'letter';

export const STUDIO_SPIN_AMOUNT_OPTIONS = [
  [90, 'Quarter Spin'],
  [180, 'Half Spin'],
  [360, 'Full Spin'],
  [720, 'Two Spins'],
] as const;
export type StudioAnimationAfter = 'none' | 'dim' | 'hide-after' | 'hide-on-next-click';
export type StudioAnimationCategory = 'entrance' | 'emphasis' | 'exit' | 'motion' | 'model-3d';
export type StudioAnimationBuildSequence =
  | 'as-one-object'
  | 'all-at-once'
  | 'one-by-one'
  | 'by-row'
  | 'by-column'
  | 'by-series'
  | 'by-category'
  | 'by-level-at-once'
  | 'by-level-one-by-one'
  | 'by-branch';

export type StudioMotionPathPoint = { x: number; y: number };

export type StudioAnimationEffectDefinition = Record<string, unknown> & {
  id: string;
  effect: string;
  start?: StudioAnimationStart;
  duration?: number;
  delay?: number;
  repeat?: StudioAnimationRepeat;
  rewind?: boolean;
  autoReverse?: boolean;
  smoothStart?: number;
  smoothEnd?: number;
  bounceEnd?: number;
  direction?: string;
  color?: string;
  amount?: number;
  rotation?: number;
  clockwise?: boolean;
  sound?: string;
  soundUrl?: string;
  stopPreviousSound?: boolean;
  textSequence?: StudioAnimationTextSequence;
  textDelay?: number;
  buildSequence?: StudioAnimationBuildSequence;
  reverseOrder?: boolean;
  triggerElementId?: string;
  triggerMediaElementId?: string;
  triggerBookmarkSeconds?: number;
  motionPath?: StudioMotionPathPoint[];
  lockPathOrigin?: boolean;
  sequenceOrder?: number;
  splitMode?: 'in' | 'out';
  shapeKind?: 'circle' | 'box' | 'diamond' | 'plus';
  spokes?: 1 | 2 | 3 | 4 | 8;
  afterAnimation?: StudioAnimationAfter;
  afterAnimationColor?: string;
  animateAttachedShape?: boolean;
};

export const STUDIO_TEXT_ELEMENT_TYPES = new Set([
  'title', 'text', 'question', 'response', 'steps', 'workspace', 'footer', 'options', 'data', 'shape',
]);

export const STUDIO_ENTRANCE_EFFECTS = new Set([
  'appear', 'fade', 'fly-in', 'float-in', 'split', 'wipe', 'shape', 'wheel',
  'random-bars', 'grow-turn', 'zoom', 'swivel', 'bounce-in', 'blinds', 'box', 'clock',
  'dissolve-in', 'fly-through', 'glitter', 'honeycomb', 'ripple', 'switch', 'flip',
  'comb', 'shape-reveal', 'grow',
]);

export const STUDIO_EMPHASIS_EFFECTS = new Set([
  'pulse', 'color-pulse', 'teeter', 'spin', 'grow-shrink', 'desaturate', 'darken',
  'lighten', 'transparency', 'object-color', 'complementary-color', 'line-color',
  'fill-color', 'brush-color', 'font-color', 'underline', 'bold-flash', 'bold-reveal', 'wave',
]);

export const STUDIO_EXIT_EFFECTS = new Set([
  'disappear', 'fade-out', 'fly-out', 'float-out', 'split-out', 'wipe-out', 'shape-out',
  'wheel-out', 'random-bars-out', 'shrink-turn', 'zoom-out', 'swivel-out', 'bounce-out', 'sink',
]);

export const STUDIO_3D_EFFECTS = new Set(['3d-arrive', '3d-turntable', '3d-swing', '3d-jump-turn']);

export const studioAnimationCategory = (effect: string): StudioAnimationCategory => {
  if (STUDIO_ENTRANCE_EFFECTS.has(effect)) return 'entrance';
  if (STUDIO_EXIT_EFFECTS.has(effect)) return 'exit';
  if (STUDIO_MOTION_EFFECTS.has(effect)) return 'motion';
  if (STUDIO_3D_EFFECTS.has(effect)) return 'model-3d';
  return 'emphasis';
};

export const studioAnimationCategoryColour = (effect: string) => ({
  entrance: '#22c55e', emphasis: '#f59e0b', exit: '#ef4444', motion: '#3b82f6', 'model-3d': '#8b5cf6',
}[studioAnimationCategory(effect)]);

const STUDIO_TEXT_ONLY_EFFECTS = new Set(['font-color', 'underline', 'bold-flash', 'bold-reveal', 'wave']);

export const studioAnimationEffectSupported = (
  elementType: string,
  visualType: unknown,
  resourceType: unknown,
  effect: string,
) => {
  if (STUDIO_3D_EFFECTS.has(effect)) return String(resourceType || '') === 'model_3d';
  if (STUDIO_TEXT_ONLY_EFFECTS.has(effect)) return STUDIO_TEXT_ELEMENT_TYPES.has(elementType) || visualType === 'smart_diagram';
  return true;
};

export type StudioAnimationCapabilities = {
  category: StudioAnimationCategory;
  direction: boolean;
  splitMode: boolean;
  shapeKind: boolean;
  colour: boolean;
  amount: boolean;
  spin: boolean;
  textSequence: boolean;
  componentBuild: boolean;
  motionPath: boolean;
  model3D: boolean;
};

export const studioAnimationCapabilities = (
  elementType: string,
  visualType: unknown,
  effect: string,
): StudioAnimationCapabilities => {
  const buildFamily = supportsStudioAnimationBuild(elementType, visualType);
  return {
    category: studioAnimationCategory(effect),
    direction: STUDIO_DIRECTIONAL_EFFECTS.has(effect),
    splitMode: effect === 'split' || effect === 'split-out',
    shapeKind: effect === 'shape' || effect === 'shape-out',
    colour: STUDIO_COLOUR_EFFECTS.has(effect),
    amount: STUDIO_AMOUNT_EFFECTS.has(effect),
    spin: effect === 'spin',
    textSequence: STUDIO_TEXT_ELEMENT_TYPES.has(elementType),
    componentBuild: buildFamily !== 'object',
    motionPath: STUDIO_MOTION_EFFECTS.has(effect),
    model3D: STUDIO_3D_EFFECTS.has(effect),
  };
};

export const studioAnimationDefaultOptions = (effect: string): Partial<StudioAnimationEffectDefinition> => {
  const direction = studioAnimationDirectionOptions(effect)[0]?.[0];
  return {
    ...(STUDIO_DIRECTIONAL_EFFECTS.has(effect) && direction ? { direction } : {}),
    ...(effect === 'split' || effect === 'split-out' ? { splitMode: 'out' as const } : {}),
    ...(effect === 'shape' || effect === 'shape-out' ? { shapeKind: 'circle' as const } : {}),
    ...(effect === 'wheel' || effect === 'wheel-out' ? { spokes: 1 as const } : {}),
    ...(effect === 'spin' ? { clockwise: true, rotation: 360 } : {}),
  };
};

export const STUDIO_BUILT_IN_ANIMATION_SOUNDS = [
  ['none', 'No sound'],
  ['applause', 'Applause'],
  ['camera', 'Camera'],
  ['chime', 'Chime'],
  ['click', 'Click'],
  ['drum-roll', 'Drum Roll'],
  ['laser', 'Laser'],
  ['typewriter', 'Typewriter'],
  ['whoosh', 'Whoosh'],
] as const;

export const STUDIO_MOTION_EFFECTS = new Set([
  'path-line', 'path-arc', 'path-turn', 'path-shape', 'path-loop', 'path-circle', 'path-zigzag', 'path-custom',
]);

export const STUDIO_DIRECTIONAL_EFFECTS = new Set([
  'fly-in', 'float-in', 'wipe', 'split', 'shape', 'swivel', 'bounce-in',
  'fly-out', 'float-out', 'wipe-out', 'split-out', 'shape-out', 'swivel-out', 'bounce-out',
  'random-bars', 'random-bars-out', 'blinds', 'box', 'clock', 'comb',
  'zoom', 'zoom-out',
]);

export const studioAnimationDirectionOptions = (effect: string): Array<[string, string]> => {
  if (['fly-in', 'bounce-in', 'fly-out', 'bounce-out'].includes(effect)) {
    const prefix = effect.endsWith('-out') ? 'To' : 'From';
    return [
      ['bottom', `${prefix} bottom`], ['bottom-left', `${prefix} bottom-left`],
      ['left', `${prefix} left`], ['top-left', `${prefix} top-left`],
      ['top', `${prefix} top`], ['top-right', `${prefix} top-right`],
      ['right', `${prefix} right`], ['bottom-right', `${prefix} bottom-right`],
    ];
  }
  if (['float-in', 'float-out'].includes(effect)) {
    const prefix = effect.endsWith('-out') ? 'Float to' : 'Float from';
    return [['bottom', `${prefix} bottom`], ['top', `${prefix} top`]];
  }
  if (['split', 'split-out'].includes(effect)) {
    return [['horizontal', 'Horizontal'], ['vertical', 'Vertical']];
  }
  if (['shape', 'shape-out'].includes(effect)) {
    return [['in', 'In'], ['out', 'Out']];
  }
  if (['swivel', 'swivel-out'].includes(effect)) {
    return [['horizontal', 'Horizontal'], ['vertical', 'Vertical']];
  }
  if (['random-bars', 'random-bars-out', 'blinds', 'comb'].includes(effect)) {
    return [['horizontal', 'Horizontal'], ['vertical', 'Vertical']];
  }
  if (effect === 'box') return [['in', 'In'], ['out', 'Out']];
  if (effect === 'clock') return [['clockwise', 'Clockwise'], ['counter-clockwise', 'Counter-clockwise']];
  if (effect === 'zoom' || effect === 'zoom-out') return [['out', 'Outward'], ['in', 'Inward']];
  if (['wipe', 'wipe-out'].includes(effect)) {
    const prefix = effect.endsWith('-out') ? 'To' : 'From';
    return [['bottom', `${prefix} bottom`], ['left', `${prefix} left`], ['right', `${prefix} right`], ['top', `${prefix} top`]];
  }
  return [['bottom', 'From bottom'], ['left', 'From left'], ['right', 'From right'], ['top', 'From top']];
};

export const STUDIO_COLOUR_EFFECTS = new Set([
  'color-pulse', 'object-color', 'complementary-color', 'line-color',
  'fill-color', 'brush-color', 'font-color',
]);

export const STUDIO_AMOUNT_EFFECTS = new Set([
  'pulse', 'grow-shrink', 'transparency',
]);

export const studioAnimationRepeatCount = (value: unknown) => {
  if (value === 'until-next-click' || value === 'until-end') return 'infinite';
  const repeat = Number(value);
  return Number.isFinite(repeat) && repeat > 0 ? String(repeat) : '1';
};

export const studioAnimationTimingFunction = (effect: StudioAnimationEffectDefinition) => {
  const smoothStart = Math.max(0, Math.min(1, Number(effect.smoothStart) || 0));
  const smoothEnd = Math.max(0, Math.min(1, Number(effect.smoothEnd) || 0));
  const bounceEnd = Math.max(0, Math.min(1, Number(effect.bounceEnd) || 0));
  if (bounceEnd > 0) return `cubic-bezier(${(0.2 + smoothStart * 0.2).toFixed(3)}, 0, ${(0.5 - smoothEnd * 0.2).toFixed(3)}, ${(1 + bounceEnd * 0.65).toFixed(3)})`;
  if (smoothStart === 0 && smoothEnd === 0) return 'ease-in-out';
  return `cubic-bezier(${(0.42 * smoothStart).toFixed(3)}, 0, ${(1 - 0.42 * smoothEnd).toFixed(3)}, 1)`;
};

const STUDIO_MOTION_PATH_PRESETS: Record<string, StudioMotionPathPoint[]> = {
  'path-line': [{ x: 0, y: 0 }, { x: 180, y: 0 }],
  'path-arc': [{ x: 0, y: 0 }, { x: 45, y: -70 }, { x: 120, y: -70 }, { x: 180, y: 0 }],
  'path-turn': [{ x: 0, y: 0 }, { x: 120, y: 0 }, { x: 120, y: 100 }],
  'path-shape': [{ x: 0, y: 0 }, { x: 120, y: -80 }, { x: 240, y: 0 }, { x: 120, y: 80 }, { x: 0, y: 0 }],
  'path-loop': [{ x: 0, y: 0 }, { x: 70, y: -70 }, { x: 140, y: 0 }, { x: 70, y: 70 }, { x: 0, y: 0 }],
  'path-circle': [{ x: 0, y: 0 }, { x: 55, y: -55 }, { x: 110, y: 0 }, { x: 55, y: 55 }, { x: 0, y: 0 }],
  'path-zigzag': [{ x: 0, y: 0 }, { x: 45, y: -45 }, { x: 90, y: 45 }, { x: 135, y: -45 }, { x: 180, y: 0 }],
};

export const studioMotionPathPoints = (effect: StudioAnimationEffectDefinition) => {
  const custom = Array.isArray(effect.motionPath) ? effect.motionPath : [];
  return custom.length >= 2 ? custom : STUDIO_MOTION_PATH_PRESETS[effect.effect] ?? [];
};

export const studioMotionPathCss = (effect: StudioAnimationEffectDefinition) => {
  const resolved = studioMotionPathPoints(effect);
  if (!resolved || resolved.length < 2) return undefined;
  const commands = resolved.map((point, index) => `${index === 0 ? 'M' : 'L'} ${Number(point.x) || 0} ${Number(point.y) || 0}`);
  return `path('${commands.join(' ')}')`;
};

export const supportsStudioAnimationBuild = (elementType: string, visualType?: unknown) => {
  if (elementType === 'table' || visualType === 'table') return 'table';
  if (elementType === 'data' && visualType === 'chart') return 'chart';
  if (visualType === 'smart_diagram') return 'diagram';
  if (elementType === 'group') return 'group';
  return 'object';
};
