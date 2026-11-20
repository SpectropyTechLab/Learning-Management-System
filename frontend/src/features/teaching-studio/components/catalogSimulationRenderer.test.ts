import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { calculateCatalogScope, drawCatalogSimulation } from './catalogSimulationRenderer.ts';

const catalogs = ['physics', 'chemistry', 'biology', 'mathematics'].flatMap((subject) => JSON.parse(readFileSync(
  new URL(`../simulation-catalog/data/${subject}.generated.json`, import.meta.url), 'utf8',
)) as Array<Record<string, unknown>>);

const simulationById = (id: string) => {
  const template = catalogs.find((entry) => entry.id === id) as any;
  assert.ok(template);
  return {
    ...template,
    schema: 'spectropy.simulation.v1', version: 1, templateId: template.id, caption: template.description,
    speed: 1, parameters: Object.fromEntries(template.parameters.map((item: any) => [item.key, item.defaultValue])),
    controls: template.parameters, options: { vectors: true, labels: true, trail: true, grid: true },
  } as any;
};

test('catalog runtime integrates imported state equations for air drag', () => {
  const simulation = simulationById('physics-projectile-with-air-drag-engine');
  const start = calculateCatalogScope(simulation, 0);
  const later = calculateCatalogScope(simulation, 1);
  assert.equal(start.x, 0);
  assert.equal(start.y, 0);
  assert.ok(Number.isFinite(later.x) && later.x > 0);
  assert.ok(Number.isFinite(later.y) && later.y > 0);
  assert.ok(Number.isFinite(later.v));
});

test('catalog runtime evaluates imported implicit multiplication and functions', () => {
  const scope = calculateCatalogScope(simulationById('mathematics-linear'), 0);
  assert.equal(scope.xi, -1);
  assert.ok(Math.abs(scope.theta - 45) < 0.001);
});

test('all 122 imported templates evaluate every enabled equation to finite runtime state', () => {
  assert.equal(catalogs.length, 122);
  for (const template of catalogs as any[]) {
    const simulation = simulationById(template.id);
    const scope = calculateCatalogScope(simulation, 0.75);
    for (const equation of simulation.equations.filter((entry: any) => entry.enabled)) {
      assert.ok(Number.isFinite(scope[equation.output]), `${template.id}:${equation.output} was not finite`);
    }
  }
});

test('an unsupported imported kind is consumed by the catalog canvas renderer', () => {
  const calls: string[] = [];
  const context = new Proxy({}, {
    get: (_target, property) => (..._args: unknown[]) => { calls.push(String(property)); },
    set: () => true,
  }) as CanvasRenderingContext2D;
  const rendered = drawCatalogSimulation(context, 960, 540, 1, simulationById('physics-projectile-with-air-drag-engine'));
  assert.equal(rendered, true);
  assert.ok(calls.includes('fillRect'));
  assert.ok(calls.includes('arc'));
  assert.ok(calls.includes('fillText'));
});
