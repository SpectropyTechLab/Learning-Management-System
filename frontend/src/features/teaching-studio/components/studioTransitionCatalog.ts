export type StudioTransitionOption = { value: string; label: string };
export type StudioTransitionEffect = {
  value: string; label: string; glyph: string;
  options?: StudioTransitionOption[];
  defaultOption?: string;
};

const four: StudioTransitionOption[] = [
  { value: 'right', label: 'From right' }, { value: 'left', label: 'From left' },
  { value: 'top', label: 'From top' }, { value: 'bottom', label: 'From bottom' },
];
const eight: StudioTransitionOption[] = [
  ...four,
  { value: 'top-right', label: 'From top-right' }, { value: 'bottom-right', label: 'From bottom-right' },
  { value: 'top-left', label: 'From top-left' }, { value: 'bottom-left', label: 'From bottom-left' },
];
const wipeDirections: StudioTransitionOption[] = [
  { value: 'right', label: 'From right' }, { value: 'top', label: 'From top' },
  { value: 'left', label: 'From left' }, { value: 'bottom', label: 'From bottom' },
  { value: 'top-right', label: 'From top-right' }, { value: 'bottom-right', label: 'From bottom-right' },
  { value: 'top-left', label: 'From top-left' }, { value: 'bottom-left', label: 'From bottom-left' },
];
const axes: StudioTransitionOption[] = [
  { value: 'horizontal', label: 'Horizontal' }, { value: 'vertical', label: 'Vertical' },
];
const leftRight: StudioTransitionOption[] = [
  { value: 'left', label: 'From left' }, { value: 'right', label: 'From right' },
];

export const STUDIO_TRANSITION_GROUPS: Array<{
  name: 'Subtle' | 'Exciting' | 'Dynamic Content'; effects: StudioTransitionEffect[];
}> = [
  { name: 'Subtle', effects: [
    { value: 'none', label: 'None', glyph: '○' },
    { value: 'morph', label: 'Morph', glyph: '◇', options: [{ value: 'objects', label: 'Objects' }, { value: 'words', label: 'Words' }, { value: 'characters', label: 'Characters' }], defaultOption: 'objects' },
    { value: 'fade', label: 'Fade', glyph: '◐', options: [{ value: 'smoothly', label: 'Smoothly' }, { value: 'through-black', label: 'Through black' }], defaultOption: 'smoothly' },
    { value: 'push', label: 'Push', glyph: '➜', options: four, defaultOption: 'right' },
    { value: 'wipe', label: 'Wipe', glyph: '◩', options: wipeDirections, defaultOption: 'right' },
    { value: 'split', label: 'Split', glyph: '◫', options: [{ value: 'vertical-in', label: 'Vertical in' }, { value: 'vertical-out', label: 'Vertical out' }, { value: 'horizontal-in', label: 'Horizontal in' }, { value: 'horizontal-out', label: 'Horizontal out' }], defaultOption: 'vertical-out' },
    { value: 'reveal', label: 'Reveal', glyph: '▣', options: [{ value: 'smooth-left', label: 'Smooth from left' }, { value: 'smooth-right', label: 'Smooth from right' }, { value: 'black-left', label: 'Through black from left' }, { value: 'black-right', label: 'Through black from right' }], defaultOption: 'smooth-right' },
    { value: 'cut', label: 'Cut', glyph: '◧', options: [{ value: 'direct', label: 'Direct' }, { value: 'through-black', label: 'Through black' }], defaultOption: 'direct' },
    { value: 'random-bars', label: 'Random Bars', glyph: '▥', options: axes, defaultOption: 'horizontal' },
    { value: 'shape', label: 'Shape', glyph: '●', options: [{ value: 'circle', label: 'Circle' }, { value: 'diamond', label: 'Diamond' }, { value: 'plus', label: 'Plus' }, { value: 'in', label: 'In' }, { value: 'out', label: 'Out' }], defaultOption: 'circle' },
    { value: 'uncover', label: 'Uncover', glyph: '⇤', options: eight, defaultOption: 'left' },
    { value: 'cover', label: 'Cover', glyph: '⇥', options: eight, defaultOption: 'right' },
    { value: 'flash', label: 'Flash', glyph: '✷' },
  ] },
  { name: 'Exciting', effects: [
    { value: 'fall-over', label: 'Fall Over', glyph: '↷', options: leftRight, defaultOption: 'right' },
    { value: 'drape', label: 'Drape', glyph: '⌄', options: leftRight, defaultOption: 'right' },
    { value: 'curtains', label: 'Curtains', glyph: '║' },
    { value: 'wind', label: 'Wind', glyph: '〰', options: leftRight, defaultOption: 'right' },
    { value: 'prestige', label: 'Prestige', glyph: '✦' },
    { value: 'fracture', label: 'Fracture', glyph: '✹' },
    { value: 'crush', label: 'Crush', glyph: '✺' },
    { value: 'peel-off', label: 'Peel Off', glyph: '◲', options: leftRight, defaultOption: 'right' },
    { value: 'page-curl', label: 'Page Curl', glyph: '◳', options: leftRight, defaultOption: 'right' },
    { value: 'airplane', label: 'Airplane', glyph: '✈', options: leftRight, defaultOption: 'right' },
    { value: 'origami', label: 'Origami', glyph: '◈', options: leftRight, defaultOption: 'right' },
    { value: 'dissolve', label: 'Dissolve', glyph: '░' },
    { value: 'checkerboard', label: 'Checkerboard', glyph: '▞', options: axes, defaultOption: 'horizontal' },
    { value: 'blinds', label: 'Blinds', glyph: '▥', options: axes, defaultOption: 'horizontal' },
    { value: 'clock', label: 'Clock', glyph: '◷', options: [{ value: 'clockwise', label: 'Clockwise' }, { value: 'counterclockwise', label: 'Counterclockwise' }, { value: 'wedge', label: 'Wedge' }], defaultOption: 'clockwise' },
    { value: 'ripple', label: 'Ripple', glyph: '◎', options: [{ value: 'center', label: 'From center' }, { value: 'top-left', label: 'From top-left' }, { value: 'top-right', label: 'From top-right' }, { value: 'bottom-left', label: 'From bottom-left' }, { value: 'bottom-right', label: 'From bottom-right' }], defaultOption: 'center' },
    { value: 'honeycomb', label: 'Honeycomb', glyph: '⬡' },
    { value: 'glitter', label: 'Glitter', glyph: '✦', options: [{ value: 'diamond-left', label: 'Diamonds from left' }, { value: 'diamond-right', label: 'Diamonds from right' }, { value: 'diamond-top', label: 'Diamonds from top' }, { value: 'diamond-bottom', label: 'Diamonds from bottom' }, { value: 'hexagon-left', label: 'Hexagons from left' }, { value: 'hexagon-right', label: 'Hexagons from right' }, { value: 'hexagon-top', label: 'Hexagons from top' }, { value: 'hexagon-bottom', label: 'Hexagons from bottom' }], defaultOption: 'diamond-right' },
    { value: 'vortex', label: 'Vortex', glyph: '◉', options: four, defaultOption: 'right' },
    { value: 'shred', label: 'Shred', glyph: '▤', options: [{ value: 'strips-in', label: 'Strips in' }, { value: 'strips-out', label: 'Strips out' }, { value: 'rectangle-in', label: 'Rectangle in' }, { value: 'rectangle-out', label: 'Rectangle out' }], defaultOption: 'strips-in' },
    { value: 'switch', label: 'Switch', glyph: '⇄', options: leftRight, defaultOption: 'right' },
    { value: 'flip', label: 'Flip', glyph: '↔', options: leftRight, defaultOption: 'right' },
    { value: 'gallery', label: 'Gallery', glyph: '▤', options: leftRight, defaultOption: 'right' },
    { value: 'cube', label: 'Cube', glyph: '⬢', options: four, defaultOption: 'right' },
    { value: 'doors', label: 'Doors', glyph: '▯', options: axes, defaultOption: 'vertical' },
    { value: 'box', label: 'Box', glyph: '□', options: [{ value: 'in', label: 'In' }, { value: 'out', label: 'Out' }], defaultOption: 'out' },
    { value: 'comb', label: 'Comb', glyph: '▦', options: axes, defaultOption: 'horizontal' },
    { value: 'zoom', label: 'Zoom', glyph: '⊕', options: [{ value: 'in', label: 'In' }, { value: 'out', label: 'Out' }], defaultOption: 'in' },
    { value: 'random', label: 'Random', glyph: '?' },
  ] },
  { name: 'Dynamic Content', effects: [
    { value: 'pan', label: 'Pan', glyph: '↔', options: four, defaultOption: 'right' },
    { value: 'ferris-wheel', label: 'Ferris Wheel', glyph: '◉', options: leftRight, defaultOption: 'right' },
    { value: 'conveyor', label: 'Conveyor', glyph: '▤', options: leftRight, defaultOption: 'right' },
    { value: 'rotate', label: 'Rotate', glyph: '↻', options: four, defaultOption: 'right' },
    { value: 'window', label: 'Window', glyph: '▦', options: axes, defaultOption: 'vertical' },
    { value: 'orbit', label: 'Orbit', glyph: '◎', options: four, defaultOption: 'right' },
    { value: 'fly-through', label: 'Fly Through', glyph: '◈', options: [{ value: 'in', label: 'In' }, { value: 'in-bounce', label: 'In with bounce' }, { value: 'out', label: 'Out' }, { value: 'out-bounce', label: 'Out with bounce' }], defaultOption: 'in' },
  ] },
];

export const STUDIO_TRANSITION_SOUNDS = [
  ['none', 'No sound'], ['stop', 'Stop previous sound'], ['applause', 'Applause'], ['arrow', 'Arrow'],
  ['bomb', 'Bomb'], ['breeze', 'Breeze'], ['camera', 'Camera'], ['cash-register', 'Cash Register'],
  ['chime', 'Chime'], ['click', 'Click'], ['coin', 'Coin'], ['drum-roll', 'Drum Roll'],
  ['explosion', 'Explosion'], ['hammer', 'Hammer'], ['laser', 'Laser'], ['push', 'Push'],
  ['suction', 'Suction'], ['typewriter', 'Typewriter'], ['voltage', 'Voltage'], ['whoosh', 'Whoosh'], ['wind', 'Wind'],
] as const;
