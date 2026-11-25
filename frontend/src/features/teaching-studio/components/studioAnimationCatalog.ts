export const STUDIO_ANIMATION_CATEGORIES = [
  { id: 'entrance', name: 'Entrance', colour: 'text-emerald-700', effects: [['appear', 'Appear'], ['fade', 'Fade'], ['fly-in', 'Fly In'], ['float-in', 'Float In'], ['split', 'Split'], ['wipe', 'Wipe'], ['shape', 'Shape'], ['wheel', 'Wheel'], ['random-bars', 'Random Bars'], ['grow-turn', 'Grow & Turn'], ['zoom', 'Zoom'], ['swivel', 'Swivel'], ['bounce-in', 'Bounce'], ['blinds', 'Blinds'], ['box', 'Box'], ['clock', 'Clock'], ['dissolve-in', 'Dissolve In'], ['fly-through', 'Fly Through'], ['glitter', 'Glitter'], ['honeycomb', 'Honeycomb'], ['ripple', 'Ripple'], ['switch', 'Switch'], ['flip', 'Flip'], ['comb', 'Comb'], ['shape-reveal', 'Shape Reveal'], ['grow', 'Grow']] },
  { id: 'emphasis', name: 'Emphasis', colour: 'text-amber-700', effects: [['pulse', 'Pulse'], ['color-pulse', 'Colour Pulse'], ['teeter', 'Teeter'], ['spin', 'Spin'], ['grow-shrink', 'Grow/Shrink'], ['desaturate', 'Desaturate'], ['darken', 'Darken'], ['lighten', 'Lighten'], ['transparency', 'Transparency'], ['object-color', 'Object Colour'], ['complementary-color', 'Complementary Colour'], ['line-color', 'Line Colour'], ['fill-color', 'Fill Colour'], ['brush-color', 'Brush Colour'], ['font-color', 'Font Colour'], ['underline', 'Underline'], ['bold-flash', 'Bold Flash'], ['bold-reveal', 'Bold Reveal'], ['wave', 'Wave'], ['flash', 'Flash'], ['bounce', 'Bounce']] },
  { id: 'exit', name: 'Exit', colour: 'text-rose-700', effects: [['disappear', 'Disappear'], ['fade-out', 'Fade'], ['fly-out', 'Fly Out'], ['float-out', 'Float Out'], ['split-out', 'Split'], ['wipe-out', 'Wipe'], ['shape-out', 'Shape'], ['wheel-out', 'Wheel'], ['random-bars-out', 'Random Bars'], ['shrink-turn', 'Shrink & Turn'], ['zoom-out', 'Zoom'], ['swivel-out', 'Swivel'], ['bounce-out', 'Bounce']] },
  { id: 'motion', name: 'Motion Paths', colour: 'text-blue-700', effects: [['path-line', 'Lines'], ['path-arc', 'Arcs'], ['path-turn', 'Turns'], ['path-shape', 'Shapes'], ['path-loop', 'Loops'], ['path-circle', 'Circle'], ['path-zigzag', 'Zigzag']] },
  { id: 'model-3d', name: '3D Model Animations', colour: 'text-violet-700', effects: [['3d-arrive', 'Arrive'], ['3d-turntable', 'Turntable'], ['3d-swing', 'Swing'], ['3d-jump-turn', 'Jump & Turn']] },
] as const;

export const STUDIO_ANIMATION_EFFECTS = STUDIO_ANIMATION_CATEGORIES.flatMap((category) =>
  category.effects.map(([id, name]) => ({ id, name, category: category.id })),
);

// One semantic glyph per exposed effect. Both the ribbon gallery and Add
// Animation render from this shared catalogue, so their visual language cannot
// drift or silently fall back to a generic repeated icon.
export const STUDIO_ANIMATION_ICON_NAMES: Record<string, string> = {
  none: 'Ban',
  appear: 'Eye', fade: 'Blend', 'fly-in': 'Send', 'float-in': 'Feather', split: 'Columns2', wipe: 'PanelLeftOpen', shape: 'Circle', wheel: 'Aperture',
  'random-bars': 'Barcode', 'grow-turn': 'RefreshCw', zoom: 'Search', swivel: 'Rotate3d', 'bounce-in': 'ArrowDownToLine', blinds: 'Blinds', box: 'Box', clock: 'Clock3',
  'dissolve-in': 'CircleDashed', 'fly-through': 'Plane', glitter: 'Sparkles', honeycomb: 'Hexagon', ripple: 'Waves', switch: 'Replace', flip: 'FlipHorizontal2',
  comb: 'Grid2X2', 'shape-reveal': 'ScanLine', grow: 'TrendingUp', pulse: 'HeartPulse', 'color-pulse': 'Palette', teeter: 'Activity', spin: 'RotateCw',
  'grow-shrink': 'Expand', desaturate: 'Droplets', darken: 'Moon', lighten: 'Sun', transparency: 'Ghost', 'object-color': 'PaintBucket',
  'complementary-color': 'Contrast', 'line-color': 'PenLine', 'fill-color': 'Badge', 'brush-color': 'Paintbrush', 'font-color': 'Type', underline: 'Underline',
  'bold-flash': 'Zap', 'bold-reveal': 'Bold', wave: 'Wind', flash: 'Highlighter', bounce: 'ChevronsUp', disappear: 'EyeOff', 'fade-out': 'LogOut',
  'fly-out': 'GalleryHorizontalEnd', 'float-out': 'MoveDown', 'split-out': 'PanelRightClose', 'wipe-out': 'PanelsTopLeft', 'shape-out': 'CircleOff',
  'wheel-out': 'TimerReset', 'random-bars-out': 'Rows3', 'shrink-turn': 'Shrink', 'zoom-out': 'Minimize', 'swivel-out': 'Repeat2', 'bounce-out': 'ArrowDownFromLine',
  'path-line': 'MoveRight', 'path-arc': 'Spline', 'path-turn': 'CornerDownRight', 'path-shape': 'Diamond', 'path-loop': 'Infinity', 'path-circle': 'Orbit',
  'path-zigzag': 'GitBranch', 'path-custom': 'Route', '3d-arrive': 'Cuboid', '3d-turntable': 'Cylinder', '3d-swing': 'Axis3d', '3d-jump-turn': 'Move3d',
};
