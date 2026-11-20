import type { SimulationDocument } from '../simulationStudioModel';

type NativeVariable = { n: string; min: number; max: number; st: number; val: number; u: string };
type NativeEquation = { n: string; e: string };
type NativeState = { n: string; d: string; i: string };

const sourceName = (simulation: SimulationDocument, id: string, fallback: string) => {
  const result = simulation.results.find((entry) => entry.id === id);
  return result?.label || fallback;
};

export const toPhysicsRuntimeProject = (simulation: SimulationDocument) => {
  const runtime = simulation.metadata?.physicsRuntime && typeof simulation.metadata.physicsRuntime === 'object'
    ? simulation.metadata.physicsRuntime as Record<string, unknown> : {};
  const variables: NativeVariable[] = simulation.variables.map((variable) => ({
    n: variable.symbol || variable.id, min: variable.min, max: variable.max, st: variable.step,
    val: variable.value, u: variable.unit,
  }));
  const derived = simulation.equations.filter((equation) => equation.enabled && equation.role !== 'state');
  const states = simulation.equations.filter((equation) => equation.enabled && equation.role === 'state');
  const equations: NativeEquation[] = derived.map((equation, index) => ({
    n: sourceName(simulation, `equation-result-${index + 1}`, equation.output), e: equation.expression,
  }));
  const ode: NativeState[] = states.map((equation, index) => ({
    n: sourceName(simulation, `state-result-${index + 1}`, equation.output),
    d: equation.expression, i: equation.initialValue || '0',
  }));
  const graphOutputs = Array.isArray(simulation.metadata?.graphOutputs)
    ? simulation.metadata.graphOutputs.filter((value): value is string => typeof value === 'string') : [];
  const objects = simulation.objects.filter((object) => object.visible).map((object) => {
    const properties = { ...(object.properties || {}) };
    const color = typeof properties.color === 'string' ? properties.color : 'Sky';
    const trail = typeof properties.trail === 'string' ? properties.trail : 'none';
    delete properties.color; delete properties.trail;
    return { type: object.type, label: object.name, color, trail, p: properties, open: false };
  });
  const timeVariable = variables.find((variable) => /^(t|time)$/i.test(variable.n) && variable.u === 's')?.n;
  const xVariable = timeVariable || variables[0]?.n || 't';
  const series = Object.fromEntries(graphOutputs.map((output) => [output, true]));
  const runtimeView = runtime.view && typeof runtime.view === 'object' ? runtime.view as Record<string, unknown> : null;
  const runtimeGraph = runtime.graph && typeof runtime.graph === 'object' ? runtime.graph as Record<string, unknown> : {};
  const events = Array.isArray(runtime.events) ? runtime.events.flatMap((entry) => Array.isArray(entry) && entry.length >= 2
    ? [{ c: String(entry[0]), a: String(entry[1]) }] : []) : [];
  const scene = {
    title: simulation.title,
    mod: typeof simulation.metadata?.category === 'string' ? simulation.metadata.category : 'Physics',
    x: typeof runtime.x === 'string' && runtime.x ? runtime.x : xVariable,
    tv: typeof runtime.tv === 'string' && runtime.tv ? runtime.tv : timeVariable || xVariable,
    px: typeof runtime.px === 'string' && runtime.px ? runtime.px : graphOutputs[0] || equations[0]?.n || states[0]?.n || xVariable,
    py: typeof runtime.py === 'string' && runtime.py ? runtime.py : graphOutputs[1] || equations[1]?.n || states[1]?.n || '0',
    bg: typeof runtime.bg === 'string' && runtime.bg ? runtime.bg : 'blueprint',
    zoom: 1, unit: typeof runtime.unit === 'string' ? runtime.unit : '', grid: simulation.options.grid, speed: simulation.speed,
    layout: typeof runtime.layout === 'string' && runtime.layout ? runtime.layout : graphOutputs.length ? 'both' : 'scene',
    view: runtimeView ? { on: 1, ...runtimeView } : { on: 0, x0: -10, x1: 10, y0: -6, y1: 6 }, r3d: true,
    show: { vectors: simulation.options.vectors, labels: simulation.options.labels, trails: simulation.options.trail },
    font: {},
    G: { type: 'line', ylog: false, fill: false, markers: true, legend: true, ymin: '', ymax: '', grid: true, ...runtimeGraph, series },
    vars: variables, eqs: equations, ode, events, objs: objects,
  };
  return { title: simulation.title, scenes: [scene], start: 0 };
};

export const injectPhysicsProject = (runtimeHtml: string, simulation: SimulationDocument) => {
  const project = JSON.stringify(toPhysicsRuntimeProject(simulation)).replace(/</g, '\\u003c');
  const playerShell = `<style id="spectropy-lms-player-shell">
    body.player #tbar,
    body.player #side { display: none !important; }
    body.player #main {
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      grid-template-columns: minmax(0, 1fr) !important;
    }
    body.player #work {
      grid-column: 1 !important;
      min-width: 0 !important;
    }
  </style>`;
  return runtimeHtml.replace(
    '</head>',
    `${playerShell}<script>window.EMBED=${project};<\/script></head>`,
  );
};
