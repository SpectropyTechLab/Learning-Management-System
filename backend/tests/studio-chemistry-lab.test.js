import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const frontend = (...parts) => path.join(root, 'frontend', 'src', 'features', 'teaching-studio', ...parts);
const publicLab = (...parts) => path.join(root, 'frontend', 'public', 'studio-labs', 'chemistry', ...parts);

test('Chemistry Lab preserves all reference experiments, classes, topics, and teaching content', () => {
  const catalog = JSON.parse(fs.readFileSync(publicLab('chemistry-lab-catalog.json'), 'utf8'));
  assert.equal(catalog.schema, 'spectropy.chemistry-lab-catalog.v1');
  assert.equal(catalog.labs.length, 35);
  assert.equal(Object.keys(catalog.topics).length, 10);
  assert.deepEqual([...new Set(catalog.labs.flatMap((lab) => lab.classes))].sort((a, b) => a - b), [6, 7, 8, 9, 10, 11, 12]);
  for (const lab of catalog.labs) {
    assert.ok(lab.id && lab.title && lab.topic && lab.aim, `${lab.id} has complete catalogue metadata`);
    assert.ok(Array.isArray(lab.apparatus) && lab.apparatus.length > 0, `${lab.id} preserves apparatus`);
    assert.ok(Array.isArray(lab.procedure) && lab.procedure.length > 0, `${lab.id} preserves procedure`);
  }
  assert.equal(catalog.labs.filter((lab) => lab.safety).length, 8, 'all safety guidance present in the source is preserved');

  const runtime = fs.readFileSync(publicLab('chemistry-labs-runtime.js'), 'utf8');
  const sandbox = { window: {}, console, Math, Date, setTimeout, clearTimeout };
  sandbox.window.window = sandbox.window;
  vm.runInNewContext(runtime, sandbox);
  assert.equal(sandbox.window.LAB.exps.length, 35);
  assert.deepEqual(new Set(sandbox.window.LAB.exps.map((lab) => lab.id)), new Set(catalog.labs.map((lab) => lab.id)));
});

test('Chemistry Lab is connected to the editor, responsive ribbon, resources, and published playback', () => {
  const viteConfig = fs.readFileSync(path.join(root, 'frontend', 'vite.config.ts'), 'utf8');
  const editor = fs.readFileSync(frontend('TeachingStudioPage.tsx'), 'utf8');
  const studio = fs.readFileSync(frontend('components', 'ChemistryLabStudio.tsx'), 'utf8');
  const model = fs.readFileSync(frontend('components', 'chemistryLabModel.ts'), 'utf8');
  const exported = fs.readFileSync(frontend('components', 'chemistryLabExport.ts'), 'utf8');
  const frame = fs.readFileSync(frontend('components', 'StudioLocalChemistryLabFrame.tsx'), 'utf8');
  const canvas = fs.readFileSync(frontend('components', 'BlankScreenCanvas.tsx'), 'utf8');
  const player = fs.readFileSync(frontend('StudioSessionPlayerPage.tsx'), 'utf8');
  const page = fs.readFileSync(publicLab('chemistry-lab.html'), 'utf8');
  assert.match(editor, /labRibbonSubject === 'chemistry'/);
  assert.match(editor, /openChemistryLab/);
  assert.match(editor, /insertChemistryLab/);
  assert.match(editor, /fitAvailableSpace: true/);
  assert.match(editor, /labHasLocalChanges: true/);
  assert.match(editor, /subject: 'chemistry'/);
  assert.match(studio, /spectropy-chemistry-lab-selected/);
  assert.match(studio, /Insert Lab into Screen/);
  assert.match(studio, /const \[source\] = useState/);
  assert.match(studio, /chemistry-lab\.html\?embed=1/);
  assert.doesNotMatch(studio, /key=\{source\}/);
  assert.match(model, /spectropy\.chemistry-lab-catalog\.v1/);
  assert.match(exported, /embed=1&lab=/);
  assert.doesNotMatch(exported, /src="\/studio-labs/);
  assert.match(exported, /new URL\('\/studio-labs\/chemistry/);
  assert.match(exported, /document\.referrer\|\|window\.location\.href/);
  assert.match(frame, /buildChemistryLabHtml/);
  assert.match(canvas, /StudioLocalChemistryLabFrame/);
  assert.match(player, /StudioLocalChemistryLabFrame/);
  assert.match(page, /new URLSearchParams\(location\.search\)\.get\('lab'\)/);
  assert.match(page, /spectropy-chemistry-lab-selected/);
  assert.match(page, /body\.spectropy-embed header\{display:none!important\}/);
  assert.match(page, />Reset<\/button><button[^>]+>Theory &amp; results<\/button>/);
  assert.match(page, /body\.spectropy-embed main\+aside/);
  assert.match(page, /main\+aside\{display:block!important;position:static!important;flex:0 0 min\(380px,36vw\)/);
  assert.doesNotMatch(page, /main\+aside\{[^}]*position:fixed/);
  assert.ok(fs.existsSync(publicLab('LabItem.dc.html')), 'the Chemistry apparatus Design Component is available under its requested filename');
  assert.match(viteConfig, /navigateFallbackDenylist/);
  assert.match(viteConfig, /\^\\\/studio-labs\\\//);
  assert.match(viteConfig, /\^\\\/simulation-runtimes\\\//);
});
