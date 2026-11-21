import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const frontend = (...parts) => path.join(root, 'frontend', 'src', 'features', 'teaching-studio', ...parts);
const publicLab = (...parts) => path.join(root, 'frontend', 'public', 'studio-labs', 'physics', ...parts);

test('Physics Lab preserves all 129 reference activities and scientific capabilities', () => {
  const catalog = JSON.parse(fs.readFileSync(publicLab('physics-lab-catalog.json'), 'utf8'));
  assert.equal(catalog.schema, 'spectropy.physics-lab-catalog.v1');
  assert.equal(catalog.labs.length, 129);
  assert.equal(catalog.labs.filter((lab) => lab.topic === 'math').length, 9);
  assert.deepEqual([...new Set(catalog.labs.flatMap((lab) => lab.classes))].sort((a, b) => a - b), [6, 7, 8, 9, 10, 11, 12]);
  assert.equal(catalog.labs.filter((lab) => lab.hasReadings).length, 129);
  assert.equal(catalog.labs.filter((lab) => lab.hasObservationTable).length, 128);
  assert.equal(catalog.labs.filter((lab) => lab.hasGraph).length, 75);
  assert.equal(catalog.labs.reduce((sum, lab) => sum + lab.actionCount, 0) > 0, true);

  const sandbox = { window: {}, console, Math, Date, setTimeout, clearTimeout };
  sandbox.window.window = sandbox.window;
  vm.runInNewContext(fs.readFileSync(publicLab('physics-labs-runtime.js'), 'utf8'), sandbox);
  const definitions = sandbox.window.LabSims;
  assert.equal(Object.keys(definitions).length, 129);
  for (const entry of catalog.labs) {
    const definition = definitions[entry.id];
    assert.ok(definition, `${entry.id} definition is present`);
    for (const capability of ['init', 'draw', 'readings']) assert.equal(typeof definition[capability], 'function', `${entry.id}.${capability}`);
    assert.ok(Array.isArray(definition.controls) && definition.controls.length > 0, `${entry.id} has controls`);
    assert.ok(Array.isArray(definition.procedure) && definition.procedure.length > 0, `${entry.id} has procedure`);
    const parameters = Object.fromEntries(definition.controls.map((control) => [control.k, control.def]));
    const state = definition.init(parameters);
    assert.doesNotThrow(() => definition.readings(state, parameters), `${entry.id} default readings are safe`);
  }

  const motion = definitions.motion;
  const motionParameters = Object.fromEntries(motion.controls.map((control) => [control.k, control.def]));
  const motionState = motion.init(motionParameters);
  motion.actions[0].run(motionState, motionParameters);
  motion.step(motionState, motionParameters, 1, 1);
  assert.equal(motionState.run, true);
  assert.ok(motionState.x > 0, 'interactive Lab action advances the native runtime state');
});

test('Physics Lab is a permanent editor workflow with filters, versioning, and published playback', () => {
  const ribbon = fs.readFileSync(frontend('components', 'studioRibbonModel.ts'), 'utf8');
  const editor = fs.readFileSync(frontend('TeachingStudioPage.tsx'), 'utf8');
  const workspace = fs.readFileSync(frontend('components', 'PhysicsLabStudio.tsx'), 'utf8');
  const thumbnail = fs.readFileSync(frontend('components', 'PhysicsLabThumbnail.tsx'), 'utf8');
  const icon = fs.readFileSync(frontend('components', 'PhysicsLabIcon.tsx'), 'utf8');
  const frame = fs.readFileSync(frontend('components', 'StudioLocalPhysicsLabFrame.tsx'), 'utf8');
  const player = fs.readFileSync(frontend('StudioSessionPlayerPage.tsx'), 'utf8');
  assert.match(ribbon, /\| 'lab'/);
  assert.match(ribbon, /\{ id: 'lab', label: 'Lab' \}/);
  assert.match(editor, /case 'lab':/);
  assert.match(editor, /Filter \$\{labRibbonSubject\} Labs by class/);
  assert.match(editor, /Filter \$\{labRibbonSubject\} Labs by topic/);
  assert.match(editor, /Edit Current Lab/);
  assert.match(editor, /Update Resource Library/);
  assert.match(editor, /Reset to Resource/);
  assert.match(editor, /labHasLocalChanges: true/);
  const insertion = editor.slice(editor.indexOf('const insertPhysicsLab ='), editor.indexOf('const updateSelectedPhysicsLabResource ='));
  assert.doesNotMatch(insertion, /createStudioResourceVersion/);
  assert.match(workspace, /Observation table/);
  assert.match(workspace, /Graph & result/);
  assert.match(workspace, /Record reading/);
  assert.match(workspace, /onTick, runtimeStateRef/);
  assert.match(workspace, /const handleRuntimeTick = useCallback/);
  assert.match(workspace, /onTick=\{handleRuntimeTick\}/);
  assert.match(workspace, /PhysicsLabThumbnail/);
  assert.match(thumbnail, /activeDefinition\.draw/);
  assert.match(icon, /physicsLabIconKey/);
  assert.match(icon, /StudioTopicIcon/);
  assert.doesNotMatch(icon, /initialsFor/);
  assert.match(editor, /fitAvailableSpace: true/);
  assert.doesNotMatch(editor, /RIBBON_QUICK_START_LIMIT/);
  assert.match(editor, /commands: labs\.map/);
  assert.match(editor, /quickActivities/);
  const exported = fs.readFileSync(frontend('components', 'physicsLabExport.ts'), 'utf8');
  assert.match(exported, /loadPhysicsLabRuntimeSource/);
  assert.match(exported, /inlineRuntimeScript/);
  assert.match(frame, /buildPhysicsLabHtml/);
  assert.match(player, /content_json\?\.labProject/);
});
