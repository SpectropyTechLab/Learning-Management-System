export const STUDIO_ANIMATION_CATEGORIES = [
  { id: 'entrance', name: 'Entrance', colour: 'text-emerald-700', effects: [['appear', 'Appear'], ['fade', 'Fade'], ['fly-in', 'Fly In'], ['wipe', 'Wipe'], ['zoom', 'Zoom'], ['float-in', 'Float In'], ['split', 'Split'], ['wheel', 'Wheel'], ['random-bars', 'Random Bars'], ['grow-turn', 'Grow & Turn']] },
  { id: 'emphasis', name: 'Emphasis', colour: 'text-amber-700', effects: [['pulse', 'Pulse'], ['spin', 'Spin'], ['grow', 'Grow'], ['bounce', 'Bounce'], ['teeter', 'Teeter'], ['flash', 'Flash'], ['wave', 'Wave'], ['color-pulse', 'Color Pulse'], ['bold-flash', 'Bold Flash'], ['underline', 'Underline']] },
  { id: 'exit', name: 'Exit', colour: 'text-rose-700', effects: [['fade-out', 'Fade Out'], ['fly-out', 'Fly Out'], ['zoom-out', 'Zoom Out'], ['wipe-out', 'Wipe Out'], ['float-out', 'Float Out'], ['split-out', 'Split Out'], ['disappear', 'Disappear'], ['sink', 'Sink']] },
  { id: 'motion', name: 'Motion Paths', colour: 'text-blue-700', effects: [['path-line', 'Line'], ['path-arc', 'Arc'], ['path-turn', 'Turn'], ['path-circle', 'Circle'], ['path-loop', 'Loop'], ['path-zigzag', 'Zigzag']] },
] as const;

export const STUDIO_ANIMATION_EFFECTS = STUDIO_ANIMATION_CATEGORIES.flatMap((category) =>
  category.effects.map(([id, name]) => ({ id, name, category: category.id })),
);
