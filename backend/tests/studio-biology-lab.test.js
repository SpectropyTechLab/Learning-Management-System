import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const frontend = (...parts) => path.join(root, 'frontend', 'src', 'features', 'teaching-studio', ...parts);
const publicLab = (...parts) => path.join(root, 'frontend', 'public', 'studio-labs', 'biology', ...parts);

test('Biology Lab preserves the complete reference environment and exposes curriculum activities', () => {
  const catalog = JSON.parse(fs.readFileSync(publicLab('biology-lab-catalog.json'), 'utf8'));
  const page = fs.readFileSync(publicLab('biology-lab.html'), 'utf8');
  assert.equal(catalog.schema, 'spectropy.biology-lab-catalog.v1');
  assert.equal(catalog.labs.length, 68);
  assert.deepEqual([...new Set(catalog.labs.flatMap((lab) => lab.classes))].sort((a, b) => a - b), [6, 7, 8, 9, 10, 11, 12]);
  assert.ok(catalog.labs.some((lab) => lab.launchKey === 'scope:onion'));
  assert.ok(catalog.labs.some((lab) => lab.launchKey === 'exp:tests'));
  assert.ok(catalog.labs.some((lab) => lab.launchKey === 'models:cell'));
  assert.ok(catalog.labs.some((lab) => lab.launchKey === 'con:dogma'));
  assert.match(page, /\['scope', 'Microscope lab'\]/);
  assert.match(page, /\['prep', 'Slide prep'\]/);
  assert.match(page, /\['dissect', 'Dissection'\]/);
  assert.match(page, /\['models', 'Models & charts'\]/);
  assert.match(page, /\['exp', 'Experiments'\]/);
  assert.match(page, /\['con', 'Concepts'\]/);
  assert.ok(fs.existsSync(publicLab('BioExperiments.dc.html')));
  assert.ok(fs.existsSync(publicLab('BioConcepts.dc.html')));
  for (const dependency of ['support.js', 'sims-core.js', 'sims-a.js', 'sims-b.js', 'sims-c.js', 'sims-d.js']) {
    assert.ok(fs.existsSync(publicLab(dependency)), `${dependency} is available under the filename requested by the Biology components`);
  }
  const localScripts = [...page.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(localScripts, ['support.js', 'sims-core.js', 'sims-a.js', 'sims-b.js', 'sims-c.js', 'sims-d.js']);
});

test('Biology Lab is wired to ribbon filters, editor insertion, canvas and slideshow', () => {
  const editor = fs.readFileSync(frontend('TeachingStudioPage.tsx'), 'utf8');
  const studio = fs.readFileSync(frontend('components', 'BiologyLabStudio.tsx'), 'utf8');
  const exported = fs.readFileSync(frontend('components', 'biologyLabExport.ts'), 'utf8');
  const frame = fs.readFileSync(frontend('components', 'StudioLocalBiologyLabFrame.tsx'), 'utf8');
  const canvas = fs.readFileSync(frontend('components', 'BlankScreenCanvas.tsx'), 'utf8');
  const player = fs.readFileSync(frontend('StudioSessionPlayerPage.tsx'), 'utf8');
  const page = fs.readFileSync(publicLab('biology-lab.html'), 'utf8');
  assert.match(editor, /labRibbonSubject === 'biology'/);
  assert.match(editor, /openBiologyLab/);
  assert.match(editor, /insertBiologyLab/);
  assert.match(editor, /BiologyLabIcon/);
  assert.match(editor, /spectropy-open-biology-3d-library/);
  assert.match(editor, /setInsertResourceFilter\('model_3d'\)/);
  assert.match(studio, /spectropy-biology-lab-selected/);
  assert.match(studio, /biology-lab\.html\?author=1/);
  assert.match(studio, /const \[source\] = useState/);
  assert.doesNotMatch(studio, /key=\{source\}/);
  assert.match(exported, /embed=1&lab=/);
  assert.match(exported, /document\.referrer\|\|window\.location\.href/);
  assert.match(frame, /buildBiologyLabHtml/);
  assert.match(canvas, /StudioLocalBiologyLabFrame/);
  assert.match(player, /StudioLocalBiologyLabFrame/);
  assert.match(page, /new URLSearchParams\(location\.search\)\.get\('lab'\)/);
  assert.match(page, /spectropy-biology-lab-selected/);
  assert.match(page, /spectropy-biology-root/);
  assert.match(page, /body\.spectropy-embed header\{display:none!important\}/);
  assert.match(page, /body\.spectropy-author/);
  assert.match(page, /max-width:none!important;min-height:100vh!important/);
  assert.match(page, /spectropy-open-biology-3d-library/);
  assert.doesNotMatch(page, /Anatomy%203D%20Lab\.html/);
  const experiments = fs.readFileSync(publicLab('BioExperiments.dc.html'), 'utf8');
  assert.match(experiments, /spectropy-bio-experiment/);
  assert.match(experiments, /grid-template-columns:minmax\(190px,260px\) minmax\(420px,1fr\) minmax\(220px,340px\)/);
  assert.match(experiments, /max-height:calc\(100vh - 32px\).*overflow-y:auto/);
});
