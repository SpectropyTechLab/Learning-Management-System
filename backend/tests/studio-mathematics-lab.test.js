import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const frontend = (...parts) => path.join(root, 'frontend', 'src', 'features', 'teaching-studio', ...parts);
const publicLab = (...parts) => path.join(root, 'frontend', 'public', 'studio-labs', 'mathematics', ...parts);

test('Mathematics Lab preserves all 111 reference activities and native capabilities', () => {
  const catalog = JSON.parse(fs.readFileSync(publicLab('mathematics-lab-catalog.json'), 'utf8'));
  assert.equal(catalog.schema, 'spectropy.mathematics-lab-catalog.v1');
  assert.equal(catalog.labs.length, 111);
  assert.equal(Object.keys(catalog.topics).length, 12);
  assert.deepEqual([...new Set(catalog.labs.flatMap((lab) => lab.classes))].sort((a, b) => a - b), [6, 7, 8, 9, 10, 11, 12]);
  assert.equal(catalog.labs.filter((lab) => lab.hasReadings).length, 111);
  assert.ok(catalog.labs.filter((lab) => lab.hasDragHandles).length >= 26);
  assert.ok(catalog.labs.filter((lab) => lab.hasRotation).length >= 6);
  assert.ok(catalog.labs.filter((lab) => lab.hasAnimation).length >= 4);

  const sandbox = { console, Math, Date, setTimeout, clearTimeout };
  vm.runInNewContext(`${fs.readFileSync(publicLab('mathematics-labs-runtime.js'), 'utf8')}\nthis.__LAB__=buildActs();`, sandbox);
  assert.equal(sandbox.__LAB__.acts.length, 111);
  for (const activity of sandbox.__LAB__.acts) {
    assert.ok(activity.id && activity.title && activity.aim, `${activity.id} metadata is complete`);
    assert.ok((Array.isArray(activity.controls) && activity.controls.length > 0) || activity.handles || activity.rotate || activity.actions, `${activity.id} preserves direct manipulation or controls`);
    assert.ok(Array.isArray(activity.steps) && activity.steps.length > 0, `${activity.id} has procedure`);
    assert.equal(typeof activity.draw, 'function', `${activity.id} preserves its native visual renderer`);
    assert.equal(typeof activity.read, 'function', `${activity.id} preserves live readings`);
    const parameters = activity.fix ? activity.fix({ ...activity.init }) : { ...activity.init };
    assert.doesNotThrow(() => activity.read.call(activity, parameters, {}), `${activity.id} default readings are safe`);
  }
});

test('Mathematics Lab is connected to ribbon filters, resources, canvas and slideshow', () => {
  const editor = fs.readFileSync(frontend('TeachingStudioPage.tsx'), 'utf8');
  const studio = fs.readFileSync(frontend('components', 'MathematicsLabStudio.tsx'), 'utf8');
  const exported = fs.readFileSync(frontend('components', 'mathematicsLabExport.ts'), 'utf8');
  const frame = fs.readFileSync(frontend('components', 'StudioLocalMathematicsLabFrame.tsx'), 'utf8');
  const canvas = fs.readFileSync(frontend('components', 'BlankScreenCanvas.tsx'), 'utf8');
  const player = fs.readFileSync(frontend('StudioSessionPlayerPage.tsx'), 'utf8');
  const page = fs.readFileSync(publicLab('mathematics-lab.html'), 'utf8');
  assert.match(editor, /labRibbonSubject === 'mathematics'/);
  assert.match(editor, /openMathematicsLab/);
  assert.match(editor, /insertMathematicsLab/);
  assert.match(editor, /MathematicsLabIcon/);
  assert.match(editor, /fitAvailableSpace: true/);
  assert.match(studio, /spectropy-mathematics-lab-selected/);
  assert.match(studio, /const \[source\] = useState/);
  assert.doesNotMatch(studio, /key=\{source\}/);
  assert.match(exported, /embed=1&lab=/);
  assert.doesNotMatch(exported, /src="\/studio-labs/);
  assert.match(exported, /new URL\('\/studio-labs\/mathematics/);
  assert.match(exported, /document\.baseURI/);
  assert.doesNotMatch(exported, /document\.referrer\|\|window\.location\.href/);
  assert.match(frame, /buildMathematicsLabHtml/);
  assert.match(canvas, /StudioLocalMathematicsLabFrame/);
  assert.match(player, /StudioLocalMathematicsLabFrame/);
  assert.match(page, /__LAB_QUERY__\.get\('lab'\)/);
  assert.match(page, /spectropy-mathematics-lab-selected/);
});
