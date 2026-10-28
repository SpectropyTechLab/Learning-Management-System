import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';
import { parseStringPromise } from 'xml2js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(scriptDir, '..');
const repoDir = path.resolve(backendDir, '..');
const read = (...parts) => fs.readFileSync(path.join(repoDir, ...parts), 'utf8');
const pass = (message) => console.log(`PASS ${message}`);

const contract = JSON.parse(read('docs', 'teaching-studio', 'contracts', 'day2-contracts.json'));
assert.equal(contract.status, 'day2-baseline');
assert.equal(contract.identity.primaryKeyType, 'integer');
assert.equal(contract.identity.tenantKey, 'client_id');
assert.equal(contract.curriculum.relationships.subtopicToSession, 'one-to-many');
assert.equal(contract.documents.sessionPlan.cardinality, 'one-current-original-per-session');
assert.equal(contract.documents.screenScript.cardinality, 'one-current-original-per-session');
assert.equal(contract.documents.revision.immutableOriginalBytes, true);
pass('ER, tenant, document ownership and revision contracts are explicit');

const expectedRoles = ['super_admin', 'content_authorizer', 'client_admin', 'school_owner', 'teacher', 'student'];
assert.deepEqual(Object.keys(contract.permissions), expectedRoles);
assert.ok(contract.permissions.teacher.includes('download_original'));
assert.deepEqual(contract.permissions.student, ['assigned_runtime']);
pass('permission matrix covers all six LMS roles');

const expectedLayouts = Array.from({ length: 14 }, (_, index) => `LYT-${String(index + 1).padStart(3, '0')}`);
assert.deepEqual(contract.layout.defaultLayoutIds, expectedLayouts);
const targetLayoutsSource = read('frontend', 'src', 'features', 'teaching-studio', 'targetLayouts.ts');
for (const id of expectedLayouts) assert.match(targetLayoutsSource, new RegExp(`id: '${id}'`));
const layoutSource = read('frontend', 'src', 'features', 'teaching-studio', 'layouts.ts');
for (const type of contract.layout.elementTypes) assert.match(layoutSource, new RegExp(`'${type}'`));
pass('14 default layouts and typed element vocabulary match the frontend registry');

assert.equal(contract.branching.tags.match.includes('every requested tag'), true);
assert.ok(contract.branching.branch.required.includes('destinationScreenId'));
assert.ok(contract.branching.branch.returnState.required.includes('returnScreenId'));
pass('multi-tag discovery, branch destination and return-state contracts are explicit');

const fixtureDir = path.join(backendDir, 'tests', 'fixtures', 'studio-packages');
const fixtureManifest = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'fixture-manifest.json'), 'utf8'));
assert.equal(fixtureManifest.fixtures.length, 7);
const expectedScorm = new Map([
  ['scorm-1.2-single-sco.zip', { version: '1.2', scoCount: 1 }],
  ['scorm-1.2-multi-sco.zip', { version: '1.2', scoCount: 2 }],
  ['scorm-2004-4th-single-sco.zip', { version: '2004 4th Edition', scoCount: 1 }],
  ['scorm-2004-4th-multi-sco.zip', { version: '2004 4th Edition', scoCount: 2 }],
]);

for (const [file, expected] of expectedScorm) {
  const zip = new AdmZip(path.join(fixtureDir, file));
  const manifestEntry = zip.getEntry('imsmanifest.xml');
  assert.ok(manifestEntry, `${file} lacks imsmanifest.xml`);
  const manifest = await parseStringPromise(manifestEntry.getData().toString('utf8'));
  assert.equal(manifest.manifest.metadata[0].schemaversion[0], expected.version);
  const resources = manifest.manifest.resources[0].resource;
  assert.equal(resources.length, expected.scoCount);
}
pass('synthetic SCORM 1.2/2004 single- and multi-SCO manifests match their declared identities');

const wrapper = read('frontend', 'src', 'lib', 'ScormAPIWrapper.ts');
assert.match(wrapper, /LMSInitialize/);
assert.doesNotMatch(wrapper, /API_1484_11|Initialize\(parameter/);
const player = read('frontend', 'src', 'features', 'courses', 'components', 'player', 'ScormPlayer.tsx');
assert.match(player, /windowWithApi\.API = api/);
assert.doesNotMatch(player, /API_1484_11/);
const service = read('backend', 'services', 'scorm.service.js');
assert.match(service, /resources\[0\]\.resource\[0\]/);
pass('runtime report gaps are reproducible: handwritten 1.2 subset, no 2004 API, first-resource launch');

for (const document of ['day2-architecture-contracts.md', 'day2-runtime-feasibility.md']) {
  assert.ok(fs.statSync(path.join(repoDir, 'docs', 'teaching-studio', document)).size > 1000);
}
pass('Day 2 architecture and runtime reports exist');

console.log('Day 2 gate verification passed.');
