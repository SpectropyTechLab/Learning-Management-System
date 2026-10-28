import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';
import { parseStringPromise } from 'xml2js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(scriptDir, '..');
const repositoryDir = path.resolve(backendDir, '..');

const read = (relativePath) => readFile(path.join(repositoryDir, relativePath), 'utf8');
const pass = (message) => console.log(`PASS ${message}`);

const hostedSchema = await read('supabase/migrations/20261014000001_cloud_public_schema.sql');
const normalizedHostedSchema = hostedSchema.replaceAll('"', '');
const studioSchema = await read('backend/scripts/intelligence_classroom_studio/001_spectropy_studio_curriculum_schema.sql');
const curriculumRoutes = await read('backend/routes/curriculum.routes.js');
const server = await read('backend/server.js');
const representativeSession = JSON.parse(await read('docs/teaching-studio/day1-representative-session.json'));
const fixtureManifest = JSON.parse(await read('backend/tests/fixtures/studio-packages/fixture-manifest.json'));

for (const table of ['clients', 'users', 'programs', 'grades', 'subjects', 'chapters', 'topics']) {
  assert.match(normalizedHostedSchema, new RegExp(`CREATE TABLE(?: IF NOT EXISTS)? (?:public\\.)?${table}\\b`, 'i'));
}
pass('hosted schema snapshot contains the reusable LMS tenant, user, and curriculum tables');

for (const table of ['boards', 'subtopics', 'layouts', 'sessions', 'screens', 'resources', 'resource_mappings']) {
  assert.match(studioSchema, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}\\b`, 'i'));
}
pass('Studio SQL draft contains the expected additive Day 3+ tables');

for (const route of ['/programs', '/grades/:id', '/subjects/:id', '/chapters/:id', '/topics/:id']) {
  assert.ok(curriculumRoutes.includes(route), `Missing reusable curriculum route ${route}`);
}
pass('existing curriculum API surface is identified for reuse through Topic');

for (const routeModule of ['studioDocumentsRoutes', 'studioSessionWorkflowRoutes']) {
  assert.ok(server.includes(routeModule), `Server does not mount ${routeModule}`);
}
pass('existing Studio document and workflow routes are mounted');

assert.equal(representativeSession.session.screens.length, 3);
assert.equal(new Set(representativeSession.session.screens.map((screen) => screen.screen_key)).size, 3);
assert.ok(representativeSession.session.screens.some((screen) => screen.tags.length > 1));
assert.ok(representativeSession.session.screens.some((screen) => screen.branch?.destination_screen_key));
const reusedResourcePlacements = representativeSession.session.screens
  .flatMap((screen) => screen.elements)
  .filter((element) => element.resource_key === 'RESOURCE-FRACTION-IMAGE');
assert.equal(reusedResourcePlacements.length, 2);
pass('representative session covers ordered screens, multi-tag discovery, branching, drawings, and resource reuse');

const expectedFixtures = new Set([
  'external-link.json',
  'single-file.html',
  'browser-ready.zip',
  'scorm-1.2-single-sco.zip',
  'scorm-1.2-multi-sco.zip',
  'scorm-2004-4th-single-sco.zip',
  'scorm-2004-4th-multi-sco.zip',
]);
assert.deepEqual(new Set(fixtureManifest.fixtures.map((fixture) => fixture.file)), expectedFixtures);

for (const fixture of fixtureManifest.fixtures.filter((item) => item.file.endsWith('.zip'))) {
  const zipPath = path.join(backendDir, 'tests', 'fixtures', 'studio-packages', fixture.file);
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries().map((entry) => entry.entryName);
  if (fixture.file.startsWith('scorm-')) {
    assert.ok(entries.includes('imsmanifest.xml'), `${fixture.file} lacks imsmanifest.xml`);
    const manifest = await parseStringPromise(zip.getEntry('imsmanifest.xml').getData().toString('utf8'));
    const schemaVersion = manifest?.manifest?.metadata?.[0]?.schemaversion?.[0];
    assert.ok(schemaVersion, `${fixture.file} lacks SCORM schema version metadata`);
    const itemCount = manifest?.manifest?.organizations?.[0]?.organization?.[0]?.item?.length ?? 0;
    assert.equal(itemCount, fixture.file.includes('multi-sco') ? 2 : 1, `${fixture.file} SCO inventory mismatch`);
  } else {
    assert.ok(entries.includes('index.html'), `${fixture.file} lacks index.html`);
    assert.ok(entries.includes('assets/style.css'), `${fixture.file} lacks its relative stylesheet dependency`);
  }
}
pass('package fixture set covers external link, standalone HTML, browser ZIP, and SCORM 1.2/2004 single/multi-SCO discovery samples');

console.log('Day 1 baseline verification complete. Runtime compatibility remains a Day 2 gate.');
