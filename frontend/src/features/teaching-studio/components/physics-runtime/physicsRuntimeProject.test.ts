import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildPhysicsStandaloneHtml,
  injectPhysicsEditor,
  injectPhysicsProject,
  injectPhysicsWizard,
  physicsNativeProject,
  simulationDocumentFromPhysicsNative,
  toPhysicsRuntimeProject,
} from './physicsRuntimeProject.ts';
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

test('Physics previews retain the original scene and graph split when layout is not explicit', () => {
  const project = toPhysicsRuntimeProject(documentFor('Projectile Motion')) as any;
  assert.equal(project.scenes[0].layout, 'both');
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
  assert.match(output, /body\.player #stage/);
  assert.match(output, /aspect-ratio: auto/);
  assert.match(output, /body\.player #pbar/);
  assert.match(output, /spx !== 'control'/);
  assert.match(output, /spx: 'state'/);
  assert.match(output, /data\.action === 'sync'/);
  assert.match(output, /values: evaluated/);
  assert.doesNotMatch(output, /spx:'project'/);
  assert.match(output, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.ok(output.indexOf('window.EMBED=') < output.indexOf('const PLAYER='));
});

test('Physics editor injects the editable native project before the runtime starts', () => {
  const source = '<html><head></head><body><script>const PLAYER=!!window.EMBED<\/script></body></html>';
  const output = injectPhysicsEditor(source, documentFor('Projectile Motion'));
  assert.match(output, /window\.SPX_EDIT=/);
  assert.ok(output.indexOf('window.SPX_EDIT=') < output.indexOf('const PLAYER='));
});

test('Physics wizard is isolated as a floating host overlay', () => {
  const source = "<html><head></head><body><script>const exported='<\/body><\/html>';const PLAYER=!!window.EMBED<\/script></body></html>";
  const output = injectPhysicsWizard(source, documentFor('Projectile Motion'));
  assert.match(output, /spectropy-lms-wizard-shell/);
  assert.match(output, /#stage > \*:not\(#pWiz\)/);
  assert.match(output, /openWizard\('project'\)/);
  assert.match(output, /spx:'wizard-close'/);
  assert.match(output, /spx:'project'/);
  assert.match(output, /--ac:#22d3ee/);
  assert.match(output, /const exported='<\/body><\/html>'/);
  assert.ok(output.lastIndexOf("openWizard('project')") > output.indexOf('const PLAYER='));
});

test('edited native Physics projects remain available for legacy restoration and standalone playback', () => {
  const document = documentFor('Projectile Motion');
  const native = toPhysicsRuntimeProject(document) as any;
  native.title = 'Edited projectile';
  native.scenes[0].bg = 'space';
  native.scenes[0].vars[0].val = 42;
  document.metadata = { ...document.metadata, physicsNativeProject: native };
  assert.equal((physicsNativeProject(document) as any).scenes[0].bg, 'space');
  assert.match(buildPhysicsStandaloneHtml('<html><head></head><body></body></html>', native), /window\.EMBED=/);
});

test('Physics wizard projects update the existing environment data panels', () => {
  const document = documentFor('Projectile Motion');
  const native = toPhysicsRuntimeProject(document) as any;
  native.title = 'Pendulum experiment';
  native.scenes[0].bg = 'lab';
  native.scenes[0].vars = [{ n: 'L', min: 0.2, max: 5, st: 0.1, val: 2, u: 'm' }];
  native.scenes[0].eqs = [{ n: 'T', e: '2*pi*sqrt(L/9.8)' }];
  native.scenes[0].objs = [{ type: 'pendulum', label: 'Pendulum', color: 'Sky', trail: 'path', p: { x: '0', y: '0' } }];
  native.scenes[0].G.series = { T: true };
  const updated = simulationDocumentFromPhysicsNative(document, native);
  assert.equal(updated.title, 'Pendulum experiment');
  assert.equal(updated.variables[0].symbol, 'L');
  assert.equal(updated.equations[0].output, 'T');
  assert.equal(updated.objects[0].type, 'pendulum');
  assert.equal(updated.results[0].display, 'graph');
  assert.equal((updated.metadata?.physicsRuntime as any).bg, 'lab');
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
