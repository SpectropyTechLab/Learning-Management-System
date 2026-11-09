export type StudioTransitionEffect = {
  value: string;
  label: string;
  glyph: string;
  directions?: boolean;
};

export const STUDIO_TRANSITION_GROUPS: Array<{
  name: 'Subtle' | 'Exciting' | 'Dynamic';
  effects: StudioTransitionEffect[];
}> = [
  {
    name: 'Subtle',
    effects: [
      { value: 'none', label: 'None', glyph: '○' },
      { value: 'morph', label: 'Morph', glyph: '◇' },
      { value: 'fade', label: 'Fade', glyph: '◐' },
      { value: 'push', label: 'Push', glyph: '➜', directions: true },
      { value: 'wipe', label: 'Wipe', glyph: '◩', directions: true },
      { value: 'split', label: 'Split', glyph: '◫', directions: true },
      { value: 'reveal', label: 'Reveal', glyph: '▣', directions: true },
      { value: 'cut', label: 'Cut', glyph: '◧' },
      { value: 'random-bars', label: 'Random Bars', glyph: '▥', directions: true },
      { value: 'shape', label: 'Shape', glyph: '●' },
      { value: 'uncover', label: 'Uncover', glyph: '⇤', directions: true },
      { value: 'cover', label: 'Cover', glyph: '⇥', directions: true },
      { value: 'flash', label: 'Flash', glyph: '✷' },
    ],
  },
  {
    name: 'Exciting',
    effects: [
      { value: 'fall-over', label: 'Fall Over', glyph: '↷', directions: true },
      { value: 'drape', label: 'Drape', glyph: '⌄', directions: true },
      { value: 'curtains', label: 'Curtains', glyph: '║' },
      { value: 'wind', label: 'Wind', glyph: '〰', directions: true },
      { value: 'dissolve', label: 'Dissolve', glyph: '░' },
      { value: 'blinds', label: 'Blinds', glyph: '▥', directions: true },
      { value: 'clock', label: 'Clock', glyph: '◷' },
      { value: 'ripple', label: 'Ripple', glyph: '◎' },
      { value: 'honeycomb', label: 'Honeycomb', glyph: '⬡' },
      { value: 'glitter', label: 'Glitter', glyph: '✦' },
      { value: 'vortex', label: 'Vortex', glyph: '◉' },
      { value: 'switch', label: 'Switch', glyph: '⇄', directions: true },
      { value: 'flip', label: 'Flip', glyph: '↔', directions: true },
      { value: 'gallery', label: 'Gallery', glyph: '▤', directions: true },
      { value: 'cube', label: 'Cube', glyph: '⬢', directions: true },
      { value: 'doors', label: 'Doors', glyph: '▯' },
      { value: 'box', label: 'Box', glyph: '□' },
      { value: 'comb', label: 'Comb', glyph: '▦', directions: true },
      { value: 'zoom', label: 'Zoom', glyph: '⊕' },
    ],
  },
  {
    name: 'Dynamic',
    effects: [
      { value: 'pan', label: 'Pan', glyph: '↔', directions: true },
      { value: 'ferris-wheel', label: 'Ferris Wheel', glyph: '◉' },
      { value: 'conveyor', label: 'Conveyor', glyph: '▤', directions: true },
      { value: 'rotate', label: 'Rotate', glyph: '↻', directions: true },
      { value: 'window', label: 'Window', glyph: '▦' },
      { value: 'orbit', label: 'Orbit', glyph: '◎', directions: true },
      { value: 'fly-through', label: 'Fly Through', glyph: '◈', directions: true },
    ],
  },
];

export const STUDIO_TRANSITION_SOUNDS = [
  ['none', 'No sound'],
  ['stop', 'Stop previous sound'],
  ['applause', 'Applause'],
  ['arrow', 'Arrow'],
  ['bomb', 'Bomb'],
  ['breeze', 'Breeze'],
  ['camera', 'Camera'],
  ['cash-register', 'Cash Register'],
  ['chime', 'Chime'],
  ['click', 'Click'],
  ['coin', 'Coin'],
  ['drum-roll', 'Drum Roll'],
  ['explosion', 'Explosion'],
  ['hammer', 'Hammer'],
  ['laser', 'Laser'],
  ['push', 'Push'],
  ['suction', 'Suction'],
  ['typewriter', 'Typewriter'],
  ['voltage', 'Voltage'],
  ['whoosh', 'Whoosh'],
  ['wind', 'Wind'],
] as const;
