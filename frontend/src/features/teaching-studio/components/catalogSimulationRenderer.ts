import type { SimulationDocument, SimulationObject } from './simulationStudioModel';

type Scope = Record<string, number>;
type Point = { x: number; y: number };

const FUNCTIONS: Record<string, (...values: number[]) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  atan2: Math.atan2, sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp, floor: Math.floor,
  ceil: Math.ceil, round: Math.round, min: Math.min, max: Math.max, pow: Math.pow,
  log: Math.log, ln: Math.log, log10: Math.log10, mod: (a, b) => ((a % b) + b) % b,
  deg: (value) => value * Math.PI / 180, rad: (value) => value * Math.PI / 180,
  rad2deg: (value) => value * 180 / Math.PI, sign: Math.sign,
};

const CONSTANTS: Scope = { pi: Math.PI, PI: Math.PI, e: Math.E };
const compiled = new Map<string, (scope: Scope) => number>();

const compileExpression = (source: string) => {
  if (compiled.has(source)) return compiled.get(source)!;
  const normalized = source.replaceAll('−', '-').replaceAll('×', '*').replaceAll('÷', '/').replaceAll('π', 'pi').trim();
  if (!normalized || /[^\p{L}\p{N}_+\-*/^().,?:<>=!\s]/u.test(normalized)) {
    const empty = () => Number.NaN; compiled.set(source, empty); return empty;
  }
  const tokens = normalized.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[\p{L}_][\p{L}\p{N}_]*|>=|<=|==|!=|&&|\|\||[()+\-*/^,.?:<>!=]/giu) || [];
  const output: string[] = [];
  const isValueEnd = (token: string) => /^(?:[\p{L}_]|\d|\.)/u.test(token) || token === ')';
  const isValueStart = (token: string) => /^(?:[\p{L}_]|\d|\.)/u.test(token) || token === '(';
  tokens.forEach((token, index) => {
    const previous = tokens[index - 1];
    if (previous && isValueEnd(previous) && isValueStart(token)
      && !(previous in FUNCTIONS && token === '(')) output.push('*');
    if (token === '^') output.push('**');
    else if (/^[\p{L}_]/u.test(token)) {
      if (token in FUNCTIONS) output.push(`f.${token}`);
      else if (token in CONSTANTS) output.push(`c.${token}`);
      else output.push(`v[${JSON.stringify(token)}]`);
    } else if (token === '=') output.push('==');
    else output.push(token);
  });
  try {
    // The generated body contains only tokenized arithmetic. Identifiers are converted to
    // lookups in the supplied numeric scope, so catalog equations cannot access browser APIs.
    const evaluator = new Function('v', 'f', 'c', `return Number(${output.join('')})`) as
      (scope: Scope, functions: typeof FUNCTIONS, constants: Scope) => number;
    const fn = (scope: Scope) => {
      try { const value = evaluator(scope, FUNCTIONS, CONSTANTS); return Number.isFinite(value) ? value : Number.NaN; }
      catch { return Number.NaN; }
    };
    compiled.set(source, fn); return fn;
  } catch {
    const invalid = () => Number.NaN; compiled.set(source, invalid); return invalid;
  }
};

const evaluate = (source: unknown, scope: Scope, fallback = 0) => {
  if (typeof source === 'number') return Number.isFinite(source) ? source : fallback;
  if (typeof source !== 'string') return fallback;
  const value = compileExpression(source)(scope);
  return Number.isFinite(value) ? value : fallback;
};

export const calculateCatalogScope = (simulation: SimulationDocument, time: number): Scope => {
  const scope: Scope = { ...simulation.parameters, t: time };
  simulation.variables.forEach((variable) => {
    scope[variable.id] = variable.id === 't' ? time : variable.value;
    scope[variable.symbol] = scope[variable.id];
  });
  const states = simulation.equations.filter((equation) => equation.enabled && equation.role === 'state');
  states.forEach((equation) => { scope[equation.output] = evaluate(equation.initialValue, scope, 0); });
  if (states.length && time > 0) {
    const steps = Math.min(360, Math.max(20, Math.ceil(time * 45))); const dt = time / steps;
    for (let step = 0; step < steps; step += 1) {
      scope.t = step * dt;
      simulation.equations.filter((equation) => equation.enabled && equation.role !== 'state').forEach((equation) => {
        scope[equation.output] = evaluate(equation.expression, scope, scope[equation.output] || 0);
      });
      const derivatives = states.map((equation) => evaluate(equation.expression, scope, 0));
      states.forEach((equation, index) => { scope[equation.output] += derivatives[index] * dt; });
    }
  }
  scope.t = time;
  for (let pass = 0; pass < 3; pass += 1) simulation.equations
    .filter((equation) => equation.enabled && equation.role !== 'state')
    .forEach((equation) => { scope[equation.output] = evaluate(equation.expression, scope, scope[equation.output] || 0); });
  return scope;
};

const COLOURS: Record<string, string> = {
  sky: '#38bdf8', violet: '#8b5cf6', coral: '#fb7185', amber: '#f59e0b', green: '#22c55e',
  white: '#f8fafc', steel: '#64748b', red: '#ef4444', blue: '#3b82f6', yellow: '#facc15',
};
const colour = (value: unknown, fallback = '#38bdf8') => COLOURS[String(value || '').toLowerCase()] || fallback;

const drawArrow = (context: CanvasRenderingContext2D, from: Point, to: Point, stroke: string) => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x); context.strokeStyle = stroke; context.fillStyle = stroke; context.lineWidth = 3;
  context.beginPath(); context.moveTo(from.x, from.y); context.lineTo(to.x, to.y); context.stroke();
  context.beginPath(); context.moveTo(to.x, to.y); context.lineTo(to.x - 10 * Math.cos(angle - 0.5), to.y - 10 * Math.sin(angle - 0.5));
  context.lineTo(to.x - 10 * Math.cos(angle + 0.5), to.y - 10 * Math.sin(angle + 0.5)); context.closePath(); context.fill();
};

const drawCatalogObject = (
  context: CanvasRenderingContext2D, object: SimulationObject, index: number, scope: Scope,
  world: (x: number, y: number) => Point, width: number, height: number,
) => {
  if (!object.visible) return;
  const properties = object.properties || {}; const type = object.type.toLowerCase();
  if (evaluate(properties.show, scope, 1) <= 0) return;
  const fallbackX = -6 + (index % 5) * 3; const fallbackY = 3 - Math.floor(index / 5) * 2.3;
  const x = evaluate(properties.x, scope, fallbackX); const y = evaluate(properties.y, scope, fallbackY);
  const point = world(x, y); const stroke = colour(properties.color); const size = Math.max(5, evaluate(properties.size, scope, 0.8) * 12);
  context.save(); context.strokeStyle = stroke; context.fillStyle = stroke; context.lineWidth = 3;
  if (type === 'fplot' && typeof properties.f === 'string') {
    context.beginPath(); let started = false;
    for (let sample = 0; sample <= 240; sample += 1) {
      const sx = -10 + 20 * sample / 240; const sy = evaluate(properties.f, { ...scope, x: sx }, Number.NaN);
      if (!Number.isFinite(sy)) { started = false; continue; } const screen = world(sx, sy);
      if (!started) { context.moveTo(screen.x, screen.y); started = true; } else context.lineTo(screen.x, screen.y);
    }
    context.stroke(); context.restore(); return;
  }
  if (['segment', 'line', 'ray'].includes(type)) {
    const target = world(evaluate(properties.x2, scope, x + 2), evaluate(properties.y2, scope, y));
    context.setLineDash(evaluate(properties.dash, scope, 0) ? [7, 6] : []); context.beginPath(); context.moveTo(point.x, point.y); context.lineTo(target.x, target.y); context.stroke();
  } else if (type === 'vector' || type === 'objarrow') {
    const target = world(x + evaluate(properties.dx, scope, 1), y + evaluate(properties.dy, scope, 0)); drawArrow(context, point, target, stroke);
  } else if (['ball', 'electron', 'charge', 'pt', 'point', 'star'].includes(type)) {
    context.beginPath(); context.arc(point.x, point.y, size, 0, Math.PI * 2); context.fill(); context.strokeStyle = '#ffffff99'; context.stroke();
  } else if (['block', 'battery', 'resistor', 'capacitor', 'screen', 'tank', 'piston', 'surface', 'gel'].includes(type)) {
    context.globalAlpha = 0.8; context.beginPath(); context.roundRect(point.x - size * 1.4, point.y - size, size * 2.8, size * 2, 5); context.fill();
  } else if (['orbitpath', 'circle', 'unitcircle', 'ellipse'].includes(type)) {
    context.beginPath(); context.ellipse(point.x, point.y, size * 3, size * (type === 'ellipse' ? 1.8 : 3), 0, 0, Math.PI * 2); context.stroke();
  } else {
    const glyph: Record<string, string> = { atom: '⚛', photon: '〰', molecule: '⚗', dna: '🧬', heart: '♥', neuron: '⚡', plant: '🌱', cell: '◉', pendulum: '◉', spring: '〰', magnet: '🧲', bulb: '💡', flame: '🔥', thermometer: '🌡', dice: '⚄', pulley: '◎', lens: '◐', mirror: '◒', prism: '△' };
    context.font = `${Math.max(20, size * 2.2)}px Segoe UI Symbol, sans-serif`; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(glyph[type] || '●', point.x, point.y);
  }
  if (type === 'label' || (object.name && !['ax', 'axes', 'axes3d'].includes(type))) {
    const value = properties.value ? evaluate(properties.value, scope, Number.NaN) : Number.NaN;
    const text = Number.isFinite(value) ? `${object.name || properties.value}: ${value.toFixed(2)} ${properties.unit || ''}` : object.name;
    if (text) { context.fillStyle = '#e2e8f0'; context.font = '600 12px Inter, sans-serif'; context.textAlign = 'center'; context.fillText(String(text), point.x, point.y + size + 14); }
  }
  context.restore();
};

export const drawCatalogSimulation = (
  context: CanvasRenderingContext2D, width: number, height: number, time: number, simulation: SimulationDocument,
) => {
  if (simulation.metadata?.source !== 'SPECTROPY Activity Studio HTML') return false;
  const timeControl = simulation.variables.find((variable) => variable.id === 't');
  const runtimeTime = timeControl && timeControl.max > 0 ? time % timeControl.max : time;
  const scope = calculateCatalogScope(simulation, runtimeTime); const left = 42; const right = width - 42; const top = 42; const bottom = height - 66;
  const horizontal = simulation.objects.flatMap((object) => {
    const properties = object.properties || {};
    return [evaluate(properties.x, scope, Number.NaN), evaluate(properties.x2, scope, Number.NaN)];
  }).filter(Number.isFinite);
  const vertical = simulation.objects.flatMap((object) => {
    const properties = object.properties || {};
    return [evaluate(properties.y, scope, Number.NaN), evaluate(properties.y2, scope, Number.NaN)];
  }).filter(Number.isFinite);
  const xExtent = Math.max(10, ...horizontal.map((value) => Math.abs(value))); const yExtent = Math.max(6, ...vertical.map((value) => Math.abs(value)));
  const world = (x: number, y: number): Point => ({ x: left + (x + xExtent) / (2 * xExtent) * (right - left), y: bottom - (y + yExtent) / (2 * yExtent) * (bottom - top) });
  context.fillStyle = simulation.view.background || '#09111d'; context.fillRect(0, 0, width, height);
  if (simulation.options.grid) {
    context.strokeStyle = '#20324a'; context.lineWidth = 1;
    for (let x = -10; x <= 10; x += 1) { const p = world(x, 0); context.beginPath(); context.moveTo(p.x, top); context.lineTo(p.x, bottom); context.stroke(); }
    for (let y = -6; y <= 6; y += 1) { const p = world(0, y); context.beginPath(); context.moveTo(left, p.y); context.lineTo(right, p.y); context.stroke(); }
  }
  context.strokeStyle = '#64748b'; context.lineWidth = 2; const origin = world(0, 0);
  context.beginPath(); context.moveTo(left, origin.y); context.lineTo(right, origin.y); context.moveTo(origin.x, top); context.lineTo(origin.x, bottom); context.stroke();
  simulation.objects.forEach((object, index) => drawCatalogObject(context, object, index, scope, world, width, height));
  const visibleResults = simulation.results.filter((result) => result.visible).slice(0, 4);
  context.fillStyle = '#e2e8f0'; context.textAlign = 'left'; context.textBaseline = 'middle'; context.font = '700 15px Inter, sans-serif';
  context.fillText(simulation.title, 18, 22);
  context.textAlign = 'right'; context.font = '600 12px Inter, sans-serif';
  visibleResults.forEach((result, index) => {
    const value = evaluate(result.expression, scope, Number.NaN);
    if (Number.isFinite(value)) context.fillText(`${result.label} ${value.toFixed(result.precision)} ${result.unit}`, width - 18, 20 + index * 18);
  });
  return true;
};
