import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { inspectRuntimePackage } from '../services/studioPackageInspection.service.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');

const loadExporter = (fileName) => {
  const source = fs.readFileSync(path.join(root, 'frontend', 'src', 'features', 'teaching-studio', 'components', fileName), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  Function('exports', 'module', compiled)(module.exports, module);
  return module.exports;
};

const baseProject = {
  schema: 'spectropy.lab.v1',
  subject: 'chemistry',
  labId: 'sep-salt',
  title: 'Separating salt from sand',
  topic: 'Matter & Separation',
  classes: [6],
  metadata: {},
};

test('Chemistry, Mathematics and Biology Lab exports pass single-HTML package inspection', () => {
  const { buildChemistryLabHtml } = loadExporter('chemistryLabExport.ts');
  const { buildMathematicsLabHtml } = loadExporter('mathematicsLabExport.ts');
  const { buildBiologyLabHtml } = loadExporter('biologyLabExport.ts');
  const cases = [
    ['chemistry-lab.html', buildChemistryLabHtml(baseProject)],
    ['mathematics-lab.html', buildMathematicsLabHtml({ ...baseProject, subject: 'mathematics', labId: 'pythagoras' })],
    ['biology-lab.html', buildBiologyLabHtml({ ...baseProject, subject: 'biology', labId: 'scope-onion', launchKey: 'scope:onion' })],
  ];
  for (const [originalname, html] of cases) {
    const result = inspectRuntimePackage({
      resourceType: 'simulation',
      file: { originalname, mimetype: 'text/html', buffer: Buffer.from(html) },
    });
    assert.equal(result.kind, 'single_html');
    assert.deepEqual(result.dependencies, []);
  }
});
