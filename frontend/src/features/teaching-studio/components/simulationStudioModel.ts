import generatedSimulationCatalog from './simulationCatalog.generated.json';

export type SimulationSubject = 'physics' | 'chemistry' | 'biology' | 'mathematics';

export type SimulationParameterDefinition = {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
};

export type SimulationTemplate = {
  id: string;
  subject: SimulationSubject;
  kind: string;
  title: string;
  description: string;
  icon: string;
  category?: string;
  parameters: SimulationParameterDefinition[];
  variables?: SimulationVariable[];
  equations?: SimulationEquation[];
  objects?: SimulationObject[];
  results?: SimulationResult[];
  playback?: Partial<SimulationDocument['playback']>;
  view?: Partial<SimulationDocument['view']>;
  metadata?: Record<string, unknown>;
};

export type PeriodicElement = {
  atomicNumber: number;
  symbol: string;
  name: string;
  atomicMass: number;
  group: number;
  period: number;
  category: string;
  electronShells: number[];
};

export type SimulationSceneNode = {
  id: string;
  type: 'circle' | 'ellipse' | 'rect' | 'line' | 'arrow' | 'text' | 'wave' | 'polygon';
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: Array<[number, number]>;
  text?: string;
  fill?: string;
  stroke?: string;
  lineWidth?: number;
  fontSize?: number;
  opacity?: number;
  bindings?: Array<{
    property: 'x' | 'y' | 'x2' | 'y2' | 'width' | 'height' | 'radius' | 'opacity' | 'motionSpeed' | 'motionAmplitude';
    parameter: string;
    outputMin: number;
    outputMax: number;
  }>;
  motion?: {
    type: 'orbit' | 'oscillate' | 'pulse' | 'rotate' | 'drift';
    speed: number;
    amplitude?: number;
    axis?: 'x' | 'y' | 'both';
    centerX?: number;
    centerY?: number;
    radius?: number;
    phase?: number;
  };
};

type SimulationSceneBinding = NonNullable<SimulationSceneNode['bindings']>[number];

export type SimulationScene = {
  background: string;
  nodes: SimulationSceneNode[];
};

export type SimulationVariable = {
  id: string;
  symbol: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  learnerEditable: boolean;
};

export type SimulationEquation = {
  id: string;
  output: string;
  expression: string;
  enabled: boolean;
  role?: 'derived' | 'state';
  initialValue?: string;
};

export type SimulationObject = {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  nodeId?: string;
  properties?: Record<string, string | number | boolean>;
};

export type SimulationResult = {
  id: string;
  label: string;
  expression: string;
  unit: string;
  precision: number;
  display: 'label' | 'card' | 'graph' | 'table';
  visible: boolean;
};

export type SimulationDocument = {
  schema: 'spectropy.simulation.v1';
  version: 1;
  subject: SimulationSubject;
  templateId: string;
  kind: string;
  title: string;
  caption: string;
  speed: number;
  parameters: Record<string, number>;
  options: {
    vectors: boolean;
    labels: boolean;
    trail: boolean;
    grid: boolean;
    [key: string]: boolean;
  };
  elements?: PeriodicElement[];
  metadata?: Record<string, unknown>;
  controls?: SimulationParameterDefinition[];
  scene?: SimulationScene;
  variables: SimulationVariable[];
  equations: SimulationEquation[];
  objects: SimulationObject[];
  results: SimulationResult[];
  playback: { duration: number; loop: boolean };
  view: { background: string };
};

const parameter = (
  key: string,
  label: string,
  unit: string,
  min: number,
  max: number,
  step: number,
  defaultValue: number,
): SimulationParameterDefinition => ({ key, label, unit, min, max, step, defaultValue });

export const SIMULATION_SUBJECTS: ReadonlyArray<{
  id: SimulationSubject;
  label: string;
  icon: string;
  color: string;
}> = [
  { id: 'physics', label: 'Physics', icon: '⚛', color: '#4fa3ff' },
  { id: 'chemistry', label: 'Chemistry', icon: '⚗', color: '#2ecc71' },
  { id: 'biology', label: 'Biology', icon: '🧬', color: '#ff5e7e' },
  { id: 'mathematics', label: 'Mathematics', icon: '∑', color: '#f1c40f' },
];

const LEGACY_SIMULATION_TEMPLATES: readonly SimulationTemplate[] = [
  { id: 'universal-scene', subject: 'physics', kind: 'scene', title: 'Custom Interactive Simulation', description: 'A safe declarative scene generated for SPECTROPY.', icon: '✨', parameters: [] },
  {
    id: 'physics-projectile', subject: 'physics', kind: 'projectile', title: 'Projectile Motion',
    description: 'Explore range, height and time of flight.', icon: '🎯', category: 'Mechanics',
    parameters: [parameter('v', 'Initial speed', 'm/s', 5, 60, 1, 25), parameter('a', 'Launch angle', '°', 5, 85, 1, 45), parameter('g', 'Gravity', 'm/s²', 1.6, 25, 0.1, 9.8)],
    equations: [
      { id: 'horizontal-position', output: 'x', expression: 'v * cos(a) * t', enabled: true },
      { id: 'vertical-position', output: 'y', expression: 'v * sin(a) * t - 0.5 * g * t^2', enabled: true },
    ],
    objects: [
      { id: 'projectile', name: 'Projectile', type: 'projectile', visible: true },
      { id: 'trajectory', name: 'Trajectory', type: 'path', visible: true },
      { id: 'velocity-vector', name: 'Velocity vector', type: 'vector', visible: true },
    ],
    results: [
      { id: 'range', label: 'Range', expression: 'v^2 * sin(2 * a) / g', unit: 'm', precision: 2, display: 'card', visible: true },
      { id: 'maximum-height', label: 'Maximum height', expression: '(v * sin(a))^2 / (2 * g)', unit: 'm', precision: 2, display: 'card', visible: true },
    ],
  },
  { id: 'physics-pendulum', subject: 'physics', kind: 'pendulum', title: 'Simple Pendulum', description: 'Investigate period, length and gravitational field.', icon: '🕰', parameters: [parameter('L', 'Length', 'm', 0.3, 4, 0.1, 1.5), parameter('th', 'Amplitude', '°', 3, 45, 1, 20), parameter('g', 'Gravity', 'm/s²', 1.6, 25, 0.1, 9.8)] },
  { id: 'physics-spring', subject: 'physics', kind: 'spring', title: 'Spring–Mass SHM', description: 'Connect spring constant, mass and oscillation.', icon: '〰', parameters: [parameter('k', 'Spring constant', 'N/m', 5, 100, 1, 40), parameter('m', 'Mass', 'kg', 0.2, 5, 0.1, 1), parameter('A', 'Amplitude', 'cm', 2, 20, 1, 12)] },
  { id: 'physics-wave', subject: 'physics', kind: 'wave', title: 'Transverse Wave', description: 'Visualize amplitude, wavelength, frequency and speed.', icon: '🌊', parameters: [parameter('A', 'Amplitude', 'cm', 1, 10, 0.5, 6), parameter('lam', 'Wavelength', 'm', 0.5, 4, 0.1, 1.6), parameter('f', 'Frequency', 'Hz', 0.1, 2, 0.05, 0.5)] },
  { id: 'physics-circular', subject: 'physics', kind: 'circular', title: 'Uniform Circular Motion', description: 'Compare tangential velocity and centripetal acceleration.', icon: '🌀', parameters: [parameter('r', 'Radius', 'm', 0.5, 4, 0.1, 2), parameter('w', 'Angular speed', 'rad/s', 0.2, 4, 0.1, 1.2)] },
  { id: 'physics-ohm', subject: 'physics', kind: 'ohm', title: 'Ohm’s Law – Bulb', description: 'Relate voltage, resistance, current and electrical power.', icon: '💡', category: 'Electricity', parameters: [parameter('V', 'Voltage', 'V', 0, 24, 0.5, 12), parameter('R', 'Resistance', 'Ω', 2, 60, 1, 12)] },
  { id: 'physics-free-fall', subject: 'physics', kind: 'free-fall', title: 'Free Fall', description: 'Observe height, speed and fall time under gravity.', icon: '🔴', category: 'Mechanics', parameters: [parameter('h0', 'Initial height', 'm', 10, 200, 1, 80), parameter('g', 'Gravity', 'm/s²', 1.6, 20, 0.1, 9.8)] },
  { id: 'physics-orbit', subject: 'physics', kind: 'planetary-orbit', title: 'Planetary Orbit', description: 'Explore elliptical orbits, eccentricity and orbital distance.', icon: '🪐', category: 'Gravitation', parameters: [parameter('a', 'Semi-major axis', 'AU', 1, 5, 0.1, 2.8), parameter('e', 'Eccentricity', '', 0, 0.9, 0.01, 0.35)] },
  { id: 'physics-kinetic-energy', subject: 'physics', kind: 'kinetic-energy', title: 'Kinetic Energy – Cart', description: 'Connect mass and speed with kinetic energy and momentum.', icon: '🛒', category: 'Work & Energy', parameters: [parameter('m', 'Mass', 'kg', 0.5, 20, 0.5, 5), parameter('v', 'Speed', 'm/s', 0, 30, 0.5, 12)] },
  { id: 'chemistry-atom', subject: 'chemistry', kind: 'atom', title: 'Atomic Structure', description: 'Explore electron shells and atomic number.', icon: '⚛', parameters: [parameter('z', 'Atomic number', '', 1, 18, 1, 8), parameter('rate', 'Orbit speed', '×', 0.2, 3, 0.1, 1)] },
  { id: 'chemistry-molecule', subject: 'chemistry', kind: 'molecule', title: 'Molecular Geometry', description: 'Inspect bond angle and molecular vibration.', icon: '🧪', parameters: [parameter('angle', 'Bond angle', '°', 60, 180, 1, 104), parameter('bond', 'Bond length', 'pm', 60, 180, 1, 96), parameter('vibration', 'Vibration', '×', 0, 2, 0.1, 0.5)] },
  { id: 'chemistry-reaction', subject: 'chemistry', kind: 'reaction', title: 'Reaction Rate', description: 'Relate temperature and concentration to reaction rate.', icon: '🔥', parameters: [parameter('temp', 'Temperature', '°C', 10, 100, 1, 35), parameter('conc', 'Concentration', 'mol/L', 0.1, 2, 0.1, 1), parameter('activation', 'Activation energy', 'kJ/mol', 20, 100, 1, 55)] },
  { id: 'chemistry-periodic-table', subject: 'chemistry', kind: 'periodic-table', title: 'Interactive Periodic Table', description: 'Explore all 118 elements, their groups, periods and shell models.', icon: '▦', parameters: [parameter('selectedAtomicNumber', 'Selected atomic number', '', 1, 118, 1, 1)] },
  { id: 'biology-cell', subject: 'biology', kind: 'cell', title: 'Animal Cell', description: 'Explore major organelles in a living cell.', icon: '🔬', parameters: [parameter('activity', 'Cell activity', '×', 0.2, 3, 0.1, 1), parameter('size', 'Cell size', 'µm', 10, 80, 1, 40)] },
  { id: 'biology-dna', subject: 'biology', kind: 'dna', title: 'DNA Double Helix', description: 'Visualize helical structure and base pairs.', icon: '🧬', parameters: [parameter('turns', 'Helix turns', '', 2, 10, 1, 6), parameter('rate', 'Rotation speed', '×', 0, 3, 0.1, 0.8)] },
  { id: 'biology-heart', subject: 'biology', kind: 'heartbeat', title: 'Cardiac Cycle', description: 'Connect heart rate with chamber contraction.', icon: '🫀', parameters: [parameter('bpm', 'Heart rate', 'bpm', 40, 180, 1, 72), parameter('strength', 'Contraction strength', '%', 20, 100, 1, 70)] },
  { id: 'math-sine', subject: 'mathematics', kind: 'function', title: 'Sine Function', description: 'Explore amplitude, frequency and vertical shift.', icon: '∿', parameters: [parameter('a', 'Amplitude a', '', -5, 5, 0.1, 2), parameter('b', 'Frequency b', '', 0.1, 5, 0.1, 1), parameter('c', 'Vertical shift c', '', -5, 5, 0.1, 0)] },
  { id: 'math-quadratic', subject: 'mathematics', kind: 'quadratic', title: 'Quadratic Function', description: 'Investigate roots, vertex and axis of symmetry.', icon: '📈', parameters: [parameter('a', 'Coefficient a', '', -4, 4, 0.1, 1), parameter('b', 'Coefficient b', '', -8, 8, 0.1, 0), parameter('c', 'Coefficient c', '', -8, 8, 0.1, -4)] },
  { id: 'math-circle', subject: 'mathematics', kind: 'circle', title: 'Circle Geometry', description: 'Explore radius, circumference and area.', icon: '◯', parameters: [parameter('r', 'Radius', 'units', 0.5, 8, 0.1, 4), parameter('angle', 'Sector angle', '°', 0, 360, 1, 120)] },
] as const;

export const SIMULATION_TEMPLATES: readonly SimulationTemplate[] = [
  ...LEGACY_SIMULATION_TEMPLATES.filter((template) => template.id === 'universal-scene'),
  ...(generatedSimulationCatalog as SimulationTemplate[]),
];

const SIMULATION_KIND_CATEGORIES: Record<string, string> = {
  projectile: 'Mechanics', pendulum: 'Mechanics', spring: 'Mechanics', circular: 'Mechanics',
  'free-fall': 'Mechanics', 'kinetic-energy': 'Work & Energy', 'planetary-orbit': 'Gravitation',
  ohm: 'Electricity', wave: 'Waves', atom: 'Atomic Structure', molecule: 'Molecular Structure',
  reaction: 'Chemical Reactions', 'periodic-table': 'Periodic Table', cell: 'Cell Biology',
  dna: 'Genetics', heartbeat: 'Human Physiology', function: 'Functions', quadratic: 'Algebra',
  circle: 'Geometry', scene: 'Custom',
};

export const simulationCategory = (value: Pick<SimulationTemplate, 'kind' | 'category'> | Pick<SimulationDocument, 'kind' | 'metadata'>) => {
  if ('category' in value && value.category) return value.category;
  const metadataCategory = 'metadata' in value && typeof value.metadata?.category === 'string'
    ? value.metadata.category.trim()
    : '';
  return metadataCategory || SIMULATION_KIND_CATEGORIES[value.kind] || 'Other';
};

export const templateById = (id: string) => SIMULATION_TEMPLATES.find((template) => template.id === id);

export const createSimulationDocument = (template: SimulationTemplate): SimulationDocument => ({
  schema: 'spectropy.simulation.v1',
  version: 1,
  subject: template.subject,
  templateId: template.id,
  kind: template.kind,
  title: template.title,
  caption: template.description,
  speed: 1,
  parameters: Object.fromEntries(template.parameters.map((item) => [item.key, item.defaultValue])),
  controls: template.parameters,
  options: { vectors: true, labels: true, trail: true, grid: true },
  variables: (template.variables || template.parameters.map((item) => ({
    id: item.key,
    symbol: item.key,
    label: item.label,
    value: item.defaultValue,
    min: item.min,
    max: item.max,
    step: item.step,
    unit: item.unit,
    learnerEditable: true,
  }))).map((item) => ({ ...item })),
  equations: (template.equations || []).map((item) => ({ ...item })),
  objects: (template.objects || []).map((item) => ({ ...item })),
  results: (template.results || []).map((item) => ({ ...item })),
  playback: { duration: template.playback?.duration ?? 10, loop: template.playback?.loop ?? true },
  view: { background: template.view?.background || '#09111d' },
  ...(template.metadata ? { metadata: { ...template.metadata } } : {}),
});

export const validateSimulationDocument = (input: unknown): SimulationDocument => {
  if (!input || typeof input !== 'object') throw new Error('Simulation JSON must contain an object.');
  const value = input as Partial<SimulationDocument>;
  if (value.schema !== 'spectropy.simulation.v1' || value.version !== 1) {
    throw new Error('Unsupported simulation schema. Expected spectropy.simulation.v1.');
  }
  const template = templateById(String(value.templateId || ''))
    || SIMULATION_TEMPLATES.find((candidate) => candidate.kind === value.kind && candidate.subject === value.subject);
  if (!template) throw new Error('The simulation type is not supported by this LMS version.');
  const base = createSimulationDocument(template);
  const controls = template.kind === 'scene' ? validateSceneControls((value as SimulationDocument).controls) : template.parameters;
  const suppliedParameters = value.parameters && typeof value.parameters === 'object' ? value.parameters : {};
  const parameters = Object.fromEntries(controls.map((definition) => {
    const supplied = Number((suppliedParameters as Record<string, unknown>)[definition.key]);
    const valid = Number.isFinite(supplied)
      ? Math.min(definition.max, Math.max(definition.min, supplied))
      : definition.defaultValue;
    return [definition.key, valid];
  }));
  const elements = template.kind === 'periodic-table'
    ? validatePeriodicElements((value as SimulationDocument).elements)
    : undefined;
  const scene = template.kind === 'scene' ? validateScene((value as SimulationDocument).scene) : undefined;
  const variables = validateVariables(value.variables, base.variables, parameters);
  const synchronizedParameters = { ...parameters };
  variables.forEach((variable) => { if (variable.id in synchronizedParameters) synchronizedParameters[variable.id] = variable.value; });
  const extraOptions = value.options && typeof value.options === 'object'
    ? Object.fromEntries(Object.entries(value.options).filter(([, optionValue]) => typeof optionValue === 'boolean'))
    : {};
  return {
    ...base,
    subject: template.kind === 'scene' && ['physics', 'chemistry', 'biology', 'mathematics'].includes(String(value.subject))
      ? value.subject as SimulationSubject
      : base.subject,
    templateId: template.kind === 'scene' ? 'universal-scene' : base.templateId,
    kind: template.kind,
    title: typeof value.title === 'string' && value.title.trim() ? value.title.trim() : base.title,
    caption: typeof value.caption === 'string' ? value.caption.trim() : base.caption,
    speed: Number.isFinite(Number(value.speed)) ? Math.min(3, Math.max(0.25, Number(value.speed))) : 1,
    parameters: synchronizedParameters,
    options: {
      ...extraOptions,
      vectors: value.options?.vectors !== false,
      labels: value.options?.labels !== false,
      trail: value.options?.trail !== false,
      grid: value.options?.grid !== false,
    },
    ...(elements ? { elements } : {}),
    controls,
    variables,
    equations: validateEquations(value.equations, base.equations),
    objects: validateObjects(value.objects, base.objects, scene),
    results: validateResults(value.results, base.results),
    playback: validatePlayback(value.playback, base.playback),
    view: validateView(value.view, base.view),
    ...(scene ? { scene } : {}),
    ...(value.metadata && typeof value.metadata === 'object' ? { metadata: value.metadata } : {}),
  };
};

const finite = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value: unknown, minimum: number, maximum: number, fallback = minimum) => Math.min(maximum, Math.max(minimum, finite(value, fallback)));
const safeColour = (value: unknown, fallback: string) => typeof value === 'string' && /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]{3,20})$/i.test(value) ? value : fallback;
const safeId = (value: unknown, fallback: string) => typeof value === 'string' && /^[a-z][a-z0-9_-]{0,63}$/i.test(value.trim()) ? value.trim() : fallback;
const safeExpression = (value: unknown) => typeof value === 'string' ? value.trim().slice(0, 500) : '';

const validateVariables = (input: unknown, fallback: SimulationVariable[], parameters: Record<string, number>): SimulationVariable[] => {
  if (!Array.isArray(input)) return fallback.map((variable) => ({ ...variable, value: finite(parameters[variable.id], variable.value) }));
  const seen = new Set<string>();
  return input.slice(0, 64).map((entry, index) => {
    const value = entry && typeof entry === 'object' ? entry as Partial<SimulationVariable> : {};
    let id = safeId(value.id, `variable_${index + 1}`);
    while (seen.has(id)) id = `${id}_${index + 1}`;
    seen.add(id);
    const min = finite(value.min, 0); const max = Math.max(min, finite(value.max, min + 1));
    return { id, symbol: typeof value.symbol === 'string' && value.symbol.trim() ? value.symbol.trim().slice(0, 20) : id, label: typeof value.label === 'string' && value.label.trim() ? value.label.trim().slice(0, 80) : id, value: clamp(value.value, min, max, min), min, max, step: Math.max(0.0001, finite(value.step, (max - min) / 100)), unit: typeof value.unit === 'string' ? value.unit.slice(0, 24) : '', learnerEditable: value.learnerEditable !== false };
  });
};

const validateEquations = (input: unknown, fallback: SimulationEquation[]): SimulationEquation[] => {
  if (!Array.isArray(input)) return fallback;
  return input.slice(0, 256).map((entry, index) => { const value = entry && typeof entry === 'object' ? entry as Partial<SimulationEquation> : {}; return { id: safeId(value.id, `equation_${index + 1}`), output: safeId(value.output, `output_${index + 1}`), expression: safeExpression(value.expression), enabled: value.enabled !== false, ...(value.role === 'state' ? { role: 'state' as const, initialValue: safeExpression(value.initialValue) } : { role: 'derived' as const }) }; });
};

const validateObjects = (input: unknown, fallback: SimulationObject[], scene?: SimulationScene): SimulationObject[] => {
  if (!Array.isArray(input)) return fallback.length ? fallback : (scene?.nodes || []).map((node) => ({ id: node.id, name: node.text || node.id, type: node.type, visible: node.opacity !== 0, nodeId: node.id }));
  return input.slice(0, 500).map((entry, index) => { const value = entry && typeof entry === 'object' ? entry as Partial<SimulationObject> : {}; const properties = value.properties && typeof value.properties === 'object' ? Object.fromEntries(Object.entries(value.properties).slice(0, 64).flatMap(([key, propertyValue]) => ['string', 'number', 'boolean'].includes(typeof propertyValue) ? [[key.slice(0, 40), propertyValue as string | number | boolean]] : [])) : undefined; return { id: safeId(value.id, `object_${index + 1}`), name: typeof value.name === 'string' && value.name.trim() ? value.name.trim().slice(0, 80) : `Object ${index + 1}`, type: typeof value.type === 'string' ? value.type.slice(0, 40) : 'object', visible: value.visible !== false, ...(typeof value.nodeId === 'string' ? { nodeId: value.nodeId.slice(0, 60) } : {}), ...(properties ? { properties } : {}) }; });
};

const validateResults = (input: unknown, fallback: SimulationResult[]): SimulationResult[] => {
  if (!Array.isArray(input)) return fallback;
  const displays = new Set<SimulationResult['display']>(['label', 'card', 'graph', 'table']);
  return input.slice(0, 64).map((entry, index) => { const value = entry && typeof entry === 'object' ? entry as Partial<SimulationResult> : {}; return { id: safeId(value.id, `result_${index + 1}`), label: typeof value.label === 'string' && value.label.trim() ? value.label.trim().slice(0, 80) : `Result ${index + 1}`, expression: safeExpression(value.expression), unit: typeof value.unit === 'string' ? value.unit.slice(0, 24) : '', precision: Math.round(clamp(value.precision, 0, 8, 2)), display: displays.has(value.display as SimulationResult['display']) ? value.display as SimulationResult['display'] : 'card', visible: value.visible !== false }; });
};

const validatePlayback = (input: unknown, fallback: SimulationDocument['playback']): SimulationDocument['playback'] => { const value = input && typeof input === 'object' ? input as Partial<SimulationDocument['playback']> : {}; return { duration: clamp(value.duration, 0.1, 3600, fallback.duration), loop: typeof value.loop === 'boolean' ? value.loop : fallback.loop }; };
const validateView = (input: unknown, fallback: SimulationDocument['view']): SimulationDocument['view'] => { const value = input && typeof input === 'object' ? input as Partial<SimulationDocument['view']> : {}; return { background: safeColour(value.background, fallback.background) }; };

const validateSceneControls = (input: unknown): SimulationParameterDefinition[] => {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 16).map((entry, index) => {
    const value = entry && typeof entry === 'object' ? entry as Partial<SimulationParameterDefinition> : {};
    const min = finite(value.min, 0); const max = Math.max(min, finite(value.max, min + 1));
    return {
      key: typeof value.key === 'string' && /^[a-z][a-z0-9_]{0,31}$/i.test(value.key) ? value.key : `control_${index + 1}`,
      label: typeof value.label === 'string' ? value.label.slice(0, 60) : `Control ${index + 1}`,
      unit: typeof value.unit === 'string' ? value.unit.slice(0, 20) : '',
      min,
      max,
      step: Math.max(0.0001, finite(value.step, (max - min) / 100)),
      defaultValue: clamp(value.defaultValue, min, max, min),
    };
  });
};

const validateScene = (input: unknown): SimulationScene => {
  if (!input || typeof input !== 'object') throw new Error('Custom simulations require a declarative scene object.');
  const value = input as Partial<SimulationScene>;
  if (!Array.isArray(value.nodes) || value.nodes.length < 1) throw new Error('The simulation scene must contain at least one visual node.');
  const nodeTypes = new Set(['circle', 'ellipse', 'rect', 'line', 'arrow', 'text', 'wave', 'polygon']);
  const motionTypes = new Set(['orbit', 'oscillate', 'pulse', 'rotate', 'drift']);
  return {
    background: safeColour(value.background, '#09111d'),
    nodes: value.nodes.slice(0, 250).map((entry, index) => {
      if (!entry || typeof entry !== 'object') throw new Error(`Scene node ${index + 1} must be an object.`);
      const node = entry as Partial<SimulationSceneNode>;
      const type = String(node.type || '');
      if (!nodeTypes.has(type)) throw new Error(`Scene node ${index + 1} uses unsupported primitive “${type}”.`);
      const motion = node.motion && typeof node.motion === 'object' && motionTypes.has(String(node.motion.type)) ? {
        type: node.motion.type,
        speed: clamp(node.motion.speed, -10, 10, 1),
        amplitude: clamp(node.motion.amplitude, 0, 1, 0.1),
        axis: ['x', 'y', 'both'].includes(String(node.motion.axis)) ? node.motion.axis : 'both' as const,
        centerX: clamp(node.motion.centerX, -1, 2, 0.5), centerY: clamp(node.motion.centerY, -1, 2, 0.5),
        radius: clamp(node.motion.radius, 0, 1, 0.2), phase: clamp(node.motion.phase, -20, 20, 0),
      } : undefined;
      return {
        id: typeof node.id === 'string' ? node.id.slice(0, 60) : `node-${index + 1}`,
        type: type as SimulationSceneNode['type'],
        x: clamp(node.x, -1, 2, 0.5), y: clamp(node.y, -1, 2, 0.5),
        x2: clamp(node.x2, -1, 2, 0.7), y2: clamp(node.y2, -1, 2, 0.5),
        width: clamp(node.width, 0, 2, 0.2), height: clamp(node.height, 0, 2, 0.2), radius: clamp(node.radius, 0, 1, 0.05),
        points: Array.isArray(node.points) ? node.points.slice(0, 80).filter((point) => Array.isArray(point) && point.length === 2).map((point) => [clamp(point[0], -1, 2), clamp(point[1], -1, 2)] as [number, number]) : undefined,
        text: typeof node.text === 'string' ? node.text.slice(0, 200) : '', fill: safeColour(node.fill, '#4fa3ff'), stroke: safeColour(node.stroke, '#ffffff'),
        lineWidth: clamp(node.lineWidth, 1, 20, 3), fontSize: clamp(node.fontSize, 12, 80, 24), opacity: clamp(node.opacity, 0, 1, 1), motion,
        bindings: Array.isArray(node.bindings) ? node.bindings.slice(0, 8).flatMap((binding) => {
          if (!binding || typeof binding !== 'object') return [];
          const candidate = binding as Partial<SimulationSceneBinding>;
          const properties = new Set<string>(['x', 'y', 'x2', 'y2', 'width', 'height', 'radius', 'opacity', 'motionSpeed', 'motionAmplitude']);
          if (typeof candidate.property !== 'string' || !properties.has(candidate.property) || typeof candidate.parameter !== 'string') return [];
          return [{ property: candidate.property as SimulationSceneBinding['property'], parameter: candidate.parameter.slice(0, 32), outputMin: finite(candidate.outputMin, 0), outputMax: finite(candidate.outputMax, 1) }];
        }) : undefined,
      };
    }),
  };
};

const validatePeriodicElements = (input: unknown): PeriodicElement[] => {
  if (!Array.isArray(input) || input.length < 1) {
    throw new Error('Periodic Table JSON must include a non-empty elements array.');
  }
  const seen = new Set<number>();
  return input.map((entry, index) => {
    if (!entry || typeof entry !== 'object') throw new Error(`Element ${index + 1} must be an object.`);
    const value = entry as Partial<PeriodicElement>;
    const atomicNumber = Number(value.atomicNumber);
    if (!Number.isInteger(atomicNumber) || atomicNumber < 1 || atomicNumber > 118 || seen.has(atomicNumber)) {
      throw new Error(`Element ${index + 1} has an invalid or duplicate atomic number.`);
    }
    seen.add(atomicNumber);
    const symbol = typeof value.symbol === 'string' ? value.symbol.trim() : '';
    const name = typeof value.name === 'string' ? value.name.trim() : '';
    if (!symbol || !name) throw new Error(`Element ${atomicNumber} requires a symbol and name.`);
    return {
      atomicNumber,
      symbol: symbol.slice(0, 3),
      name: name.slice(0, 40),
      atomicMass: Number.isFinite(Number(value.atomicMass)) ? Number(value.atomicMass) : atomicNumber,
      group: Math.min(18, Math.max(1, Math.round(Number(value.group) || 1))),
      period: Math.min(7, Math.max(1, Math.round(Number(value.period) || 1))),
      category: typeof value.category === 'string' ? value.category.slice(0, 50) : 'unknown',
      electronShells: Array.isArray(value.electronShells)
        ? value.electronShells.map(Number).filter((count) => Number.isFinite(count) && count >= 0).slice(0, 7)
        : [],
    };
  }).sort((left, right) => left.atomicNumber - right.atomicNumber);
};

