import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { injectPhysicsProject, toPhysicsRuntimeProject } from './physicsRuntimeProject.ts';
import { buildSimulationHtml } from '../simulationExport.ts';

const templates = JSON.parse(readFileSync(
  new URL('../../simulation-catalog/data/physics.generated.json', import.meta.url), 'utf8',
)) as any[];

const documentFor = (title: string) => {
  const template = templates.find((entry) => entry.title === title)
    ?? (title.startsWith('Convex Lens')
      ? templates.find((entry) => entry.title.startsWith('Convex Lens'))
      : undefined);
  assert.ok(template);
  return {
    ...template, schema: 'spectropy.simulation.v1', version: 1, templateId: template.id,
    caption: template.description, speed: 1,
    parameters: Object.fromEntries(template.parameters.map((item: any) => [item.key, item.defaultValue])),
    controls: template.parameters, options: { vectors: true, labels: true, trail: true, grid: true },
  } as any;
};

test('Physics documents are restored to the original player scene schema', () => {
  const project = toPhysicsRuntimeProject(documentFor('Convex Lens – Image Formation')) as any;
  assert.equal(project.scenes.length, 1);
  assert.equal(project.scenes[0].layout, 'both');
  assert.ok(project.scenes[0].vars.some((variable: any) => variable.n === 'u'));
  assert.ok(project.scenes[0].objs.some((object: any) => object.type === 'lens'));
  assert.ok(project.scenes[0].objs.some((object: any) => object.type === 'ray'));
});

test('all Physics templates can be supplied to the original runtime', () => {
  assert.equal(templates.length, 38);
  templates.forEach((template) => {
    const project = toPhysicsRuntimeProject(documentFor(template.title)) as any;
    assert.equal(project.scenes[0].vars.length, template.variables.length);
    assert.equal(project.scenes[0].objs.length, template.objects.length);
  });
});

test('Physics editor visibility and equation switches control the runtime project', () => {
  const document = documentFor('Projectile Motion');
  document.objects[0].visible = false;
  document.equations[0].enabled = false;
  const project = toPhysicsRuntimeProject(document) as any;
  assert.equal(project.scenes[0].objs.length, document.objects.length - 1);
  assert.equal(
    [...project.scenes[0].eqs, ...project.scenes[0].ode].some((entry: any) => entry.e === document.equations[0].expression),
    false,
  );
});

test('Physics player data is injected before the original application starts', () => {
  const source = '<html><head></head><body><script>const PLAYER=!!window.EMBED<\/script></body></html>';
  const output = injectPhysicsProject(source, documentFor('Projectile Motion'));
  assert.match(output, /window\.EMBED=/);
  assert.match(output, /body\.player #side/);
  assert.match(output, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.ok(output.indexOf('window.EMBED=') < output.indexOf('const PLAYER='));
});

test('Physics source objects remain available to the outer LMS Objects tab', () => {
  const lens = documentFor('Convex Lens â€“ Image Formation');
  assert.equal(lens.objects.length, 10);
  assert.deepEqual(
    lens.objects.map((object: any) => object.type),
    ['lens', 'objarrow', 'objarrow', 'ray', 'ray', 'ray', 'ray', 'ray', 'label', 'label'],
  );
});

test('Physics export and Screen insertion use the managed original runtime', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response('<html><head></head><body>physics-player</body></html>')) as typeof fetch;
  try {
    const output = await buildSimulationHtml(documentFor('Convex Lens – Image Formation'));
    assert.match(output, /window\.EMBED=/);
    assert.match(output, /physics-player/);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
