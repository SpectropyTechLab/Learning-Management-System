import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

process.env.JWT_SECRET ||= 'studio-day7-test-secret';
process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_KEY ||= 'test-only-service-key';

const { inspectRuntimePackage } = await import('../services/studioPackageInspection.service.js');
const { default: pool } = await import('../config/db.js');
const { chooseScormDestination, normalizeScormData, startScormAttempt } = await import('../services/studioScormRuntime.service.js');
const { default: router } = await import('../routes/studioScormRuntime.routes.js');

const fixture = async (name) => ({
  originalname: name,
  mimetype: 'application/zip',
  buffer: await readFile(path.join(process.cwd(), 'tests', 'fixtures', 'studio-packages', name)),
});

test('SCORM package evidence covers both editions and single/multi-SCO profiles', async () => {
  const matrix = [
    ['scorm-1.2-single-sco.zip', '1.2', 1],
    ['scorm-1.2-multi-sco.zip', '1.2', 2],
    ['scorm-2004-4th-single-sco.zip', '2004', 1],
    ['scorm-2004-4th-multi-sco.zip', '2004', 2],
  ];
  for (const [name, edition, scoCount] of matrix) {
    const inspection = inspectRuntimePackage({ resourceType: 'scorm', file: await fixture(name) });
    assert.equal(inspection.kind, 'scorm');
    assert.equal(inspection.scorm.edition, edition);
    assert.equal(inspection.scorm.scos.length, scoCount);
    assert.match(inspection.entryPoint, /\.html$/);
  }
});

test('SCORM 1.2 status, score and suspend/resume fields normalize to canonical state', () => {
  const result = normalizeScormData('1.2', {
    'cmi.core.lesson_status': 'passed',
    'cmi.core.score.raw': '91',
    'cmi.core.lesson_location': 'page-4',
    'cmi.suspend_data': 'resume-token',
    'cmi.core.session_time': '00:02:30.5',
  });
  assert.equal(result.completionStatus, 'completed');
  assert.equal(result.successStatus, 'passed');
  assert.equal(result.scoreRaw, 91);
  assert.equal(result.suspendData, 'resume-token');
  assert.equal(result.sessionTimeSeconds, 150.5);
});

test('SCORM 2004 status, scaled score and ISO duration normalize to canonical state', () => {
  const result = normalizeScormData('2004', {
    'cmi.completion_status': 'completed',
    'cmi.success_status': 'failed',
    'cmi.score.scaled': '-0.25',
    'cmi.location': 'activity-2',
    'cmi.suspend_data': 'state-json',
    'cmi.session_time': 'PT1M5.25S',
  });
  assert.equal(result.completionStatus, 'completed');
  assert.equal(result.successStatus, 'failed');
  assert.equal(result.scoreScaled, -0.25);
  assert.equal(result.location, 'activity-2');
  assert.equal(result.sessionTimeSeconds, 65.25);
});

test('multi-SCO navigation preserves independent manifest-order destinations', () => {
  const scos = [
    { sco_identifier: 'SCO-1', launch_path: 'sco1.html' },
    { sco_identifier: 'SCO-2', launch_path: 'sco2.html' },
  ];
  assert.equal(chooseScormDestination(scos, 'SCO-1', 'next')?.sco_identifier, 'SCO-2');
  assert.equal(chooseScormDestination(scos, 'SCO-2', 'previous')?.sco_identifier, 'SCO-1');
  assert.equal(chooseScormDestination(scos, 'SCO-2', 'next'), null);
});

test('Studio SCORM attempt lifecycle routes are registered behind runtime authorization', () => {
  const routes = router.stack.filter((layer) => layer.route).map((layer) => ({
    path: layer.route.path,
    methods: Object.keys(layer.route.methods),
  }));
  assert.deepEqual(routes, [
    { path: '/studio/scorm/attempts', methods: ['post'] },
    { path: '/studio/scorm/attempts/:attemptId', methods: ['get'] },
    { path: '/studio/scorm/attempts/:attemptId/commit', methods: ['post'] },
    { path: '/studio/scorm/attempts/:attemptId/navigate', methods: ['post'] },
  ]);
});

test('teacher cannot start a published SCORM attempt without a program assignment', async () => {
  const originalQuery = pool.query;
  const responses = [
    { rows: [{ id: 42, resource_id: 7, client_id: 5, resource_type: 'scorm', is_active: true }] },
    { rows: [{ id: 8, client_id: 5, manifest_json: {
      session: { program_id: 12, program_school_id: null },
      screens: [{ elements: [{ resource_mapping: { resource_version_id: 42 } }] }],
    } }] },
    { rows: [] },
  ];
  pool.query = async () => responses.shift() || { rows: [] };
  try {
    await assert.rejects(
      startScormAttempt({
        versionId: 42, releaseId: 8, user: { id: 99, client_id: 5, role: 'teacher' },
      }),
      (error) => error?.status === 403 && error?.message === 'Access denied',
    );
  } finally {
    pool.query = originalQuery;
  }
});

test('schema and browser runtime contain attempt persistence and both SCORM APIs', async () => {
  const migration = await readFile(path.join('..', 'supabase', 'migrations', '20261030170000_studio_day7_scorm_runtime.sql'), 'utf8');
  const wrapper = await readFile(path.join('..', 'frontend', 'src', 'lib', 'ScormAPIWrapper.ts'), 'utf8');
  assert.match(migration, /studio_scorm_attempts/);
  assert.match(migration, /studio_scorm_sco_states/);
  assert.match(wrapper, /API_1484_11/);
  assert.match(wrapper, /LMSCommit/);
  assert.doesNotMatch(wrapper, /LMSCommit[^\n]*async/);
  assert.match(wrapper, /Network persistence is queued/);
});
