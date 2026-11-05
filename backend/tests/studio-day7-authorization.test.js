import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET ||= 'studio-day7-test-secret';
process.env.STUDIO_RUNTIME_SECRET ||= 'studio-day7-runtime-secret';
process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_KEY ||= 'test-only-service-key';

const { default: pool } = await import('../config/db.js');
const { default: supabase } = await import('../config/supabaseClient.js');
const { default: documentRouter } = await import('../routes/studioDocuments.routes.js');
const {
  uploadSessionPlan,
  downloadSessionPlan,
  downloadScreenScript,
} = await import('../services/studioDocuments.service.js');
const { createScreen } = await import('../services/studioLayouts.service.js');
const { saveScreen, reorderScreens } = await import('../services/studioScreens.service.js');
const { createResource } = await import('../services/studioResources.service.js');
const {
  submitSession,
  reviewSession,
  publishSession,
  returnSessionToDraft,
} = await import('../services/studioSessionWorkflow.service.js');
const { publishSessionRelease } = await import('../services/studioReleases.service.js');
const {
  getRuntimeDownload,
  loadRuntimeAsset,
} = await import('../services/studioResourceRuntime.service.js');

const normalizeSql = (value) => String(value).replace(/\s+/g, ' ').trim().toLowerCase();
const teacher = { id: 700, role: 'teacher', client_id: 12 };

const expectForbidden = async (operation) => assert.rejects(
  operation,
  (error) => error?.status === 403
);

test('protected document routes reject an unauthenticated request', async () => {
  const authenticationLayer = documentRouter.stack[0];
  const response = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  let nextCalled = false;
  await authenticationLayer.handle(
    { headers: {} },
    response,
    () => { nextCalled = true; }
  );
  assert.equal(response.statusCode, 401);
  assert.equal(response.body.error, 'Access token required');
  assert.equal(nextCalled, false);
});

test('document write routes reject teachers before Multer reads the upload', () => {
  const writeRoutes = documentRouter.stack
    .filter((layer) => layer.route && ['post', 'put', 'patch'].some((method) => layer.route.methods[method]));

  assert.ok(writeRoutes.length >= 6, 'all document write routes must be covered');
  for (const layer of writeRoutes) {
    const firstHandler = layer.route.stack[0].handle;
    let nextCalled = false;
    const response = {
      statusCode: 200,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    firstHandler({ user: teacher }, response, () => { nextCalled = true; });
    assert.equal(response.statusCode, 403, `${layer.route.path} must reject teacher writes`);
    assert.equal(nextCalled, false, `${layer.route.path} must stop before body parsing`);
  }
});

test('teacher is denied every academic authoring and workflow service', async () => {
  await expectForbidden(uploadSessionPlan({
    sessionId: 41,
    user: teacher,
    file: { buffer: Buffer.from('not-uploaded'), originalname: 'plan.docx' },
  }));
  await expectForbidden(createScreen({ sessionId: 41, body: {}, user: teacher }));
  await expectForbidden(saveScreen({ screenId: 71, body: { revision_no: 1 }, user: teacher }));
  await expectForbidden(reorderScreens({
    sessionId: 41,
    body: { session_revision_no: 1, screen_ids: [71] },
    user: teacher,
  }));
  await expectForbidden(createResource({
    body: { name: 'Blocked', resource_type: 'html' },
    file: { buffer: Buffer.from('<h1>Blocked</h1>'), originalname: 'index.html', mimetype: 'text/html' },
    user: teacher,
  }));
  await expectForbidden(submitSession({ sessionId: 41, user: teacher }));
  await expectForbidden(reviewSession({ sessionId: 41, decision: 'approved', user: teacher }));
  await expectForbidden(publishSession({ sessionId: 41, user: teacher }));
  await expectForbidden(getRuntimeDownload({ versionId: 15, user: teacher }));
});

test('returning content to draft advances the revision used by the authorization trigger', async () => {
  const queries = [];
  const result = await returnSessionToDraft(41, {
    async query(text, params) {
      queries.push({ sql: normalizeSql(text), params });
      return { rows: [{ id: 41, status: 'draft', revision_no: 7 }] };
    },
  });

  assert.equal(result.status, 'draft');
  assert.equal(result.revision_no, 7);
  assert.match(queries[0].sql, /revision_no = revision_no \+ 1/);
  assert.match(queries[0].sql, /approved_by = null/);

  const migration = readFileSync(
    new URL('../../supabase/migrations/20261029100000_studio_day5_persistence.sql', import.meta.url),
    'utf8'
  );
  assert.match(migration, /AFTER UPDATE OF revision_no ON public\.sessions/i);
  assert.match(migration, /UPDATE public\.session_authorizations[\s\S]*invalidated_at/i);
});

test('an invalidated authorization cannot publish an otherwise approved Session', async (t) => {
  const calls = [];
  const client = {
    async query(text) {
      const sql = normalizeSql(text);
      calls.push(sql);
      if (['begin', 'rollback'].includes(sql)) return { rows: [] };
      if (sql.includes('from sessions se') && sql.includes('for update')) {
        return { rows: [{
          id: 41,
          client_id: 12,
          status: 'approved',
          revision_no: 7,
          program_id: 55,
        }] };
      }
      if (sql.includes('from session_authorizations sa')) return { rows: [] };
      throw new Error(`Unhandled query: ${sql}`);
    },
    release() {},
  };
  const originalConnect = pool.connect;
  pool.connect = async () => client;
  t.after(() => { pool.connect = originalConnect; });

  await assert.rejects(
    publishSessionRelease({
      sessionId: 41,
      user: { id: 8, role: 'content_authorizer', client_id: 12 },
    }),
    (error) => error?.status === 409 && error?.message.includes('not authorized')
  );
  assert.ok(calls.includes('rollback'));
  assert.ok(!calls.includes('commit'));
});

test('protected documents reject draft readers and cross-tenant authors before Storage access', async (t) => {
  const originalQuery = pool.query;
  const originalFrom = supabase.storage.from;
  let storageAccessed = false;
  supabase.storage.from = () => {
    storageAccessed = true;
    return {};
  };
  t.after(() => {
    pool.query = originalQuery;
    supabase.storage.from = originalFrom;
  });

  pool.query = async () => ({ rows: [{
    id: 41,
    client_id: 12,
    status: 'draft',
    program_id: 55,
    program_school_id: null,
  }] });
  await expectForbidden(downloadSessionPlan({ sessionId: 41, user: teacher }));

  pool.query = async () => ({ rows: [{
    id: 41,
    client_id: 99,
    status: 'published',
    program_id: 55,
    program_school_id: null,
  }] });
  await expectForbidden(downloadSessionPlan({
    sessionId: 41,
    user: { id: 8, role: 'content_authorizer', client_id: 12 },
  }));
  assert.equal(storageAccessed, false);
});

test('assigned teacher cannot download a Screen Script original attachment', async (t) => {
  const originalQuery = pool.query;
  const originalFrom = supabase.storage.from;
  let storageAccessed = false;
  pool.query = async (text) => {
    const sql = normalizeSql(text);
    if (sql.includes('from sessions se')) return { rows: [{
      id: 41, client_id: 12, status: 'published', program_id: 55, program_school_id: 7,
    }] };
    throw new Error(`Teacher download denial must stop before this query: ${sql}`);
  };
  supabase.storage.from = () => {
    storageAccessed = true;
    return { download: async () => ({ data: null, error: new Error('must not run') }) };
  };
  t.after(() => {
    pool.query = originalQuery;
    supabase.storage.from = originalFrom;
  });

  await assert.rejects(
    downloadScreenScript({ sessionId: 41, user: teacher }),
    (error) => error?.status === 403 && /cannot download Screen Script files/i.test(error.message),
  );
  assert.equal(storageAccessed, false);
});

test('runtime bytes reject invalid, expired and unlisted access tokens', async (t) => {
  await assert.rejects(
    loadRuntimeAsset({ launchToken: 'not-a-token', requestedPath: 'index.html' }),
    (error) => error?.status === 401 && error?.message.includes('Invalid')
  );

  const expired = jwt.sign(
    { purpose: 'studio-resource-runtime', resourceVersionId: 15 },
    process.env.STUDIO_RUNTIME_SECRET,
    { expiresIn: -1 }
  );
  await assert.rejects(
    loadRuntimeAsset({ launchToken: expired, requestedPath: 'index.html' }),
    (error) => error?.status === 401 && error?.message.includes('expired')
  );

  const originalQuery = pool.query;
  const originalFrom = supabase.storage.from;
  let storageAccessed = false;
  pool.query = async () => ({ rows: [{
    id: 15,
    resource_id: 9,
    client_id: 12,
    resource_type: 'zip',
    is_active: true,
    metadata_json: {
      runtime: {
        kind: 'browser_zip',
        package_prefix: 'runtime-packages/safe',
        entry_point: 'index.html',
        files: [{ path: 'index.html', mime_type: 'text/html' }],
      },
    },
  }] });
  supabase.storage.from = () => {
    storageAccessed = true;
    return {};
  };
  t.after(() => {
    pool.query = originalQuery;
    supabase.storage.from = originalFrom;
  });
  const valid = jwt.sign(
    { purpose: 'studio-resource-runtime', resourceVersionId: 15 },
    process.env.STUDIO_RUNTIME_SECRET,
    { expiresIn: 300 }
  );
  await assert.rejects(
    loadRuntimeAsset({ launchToken: valid, requestedPath: 'secret.html' }),
    (error) => error?.status === 404 && error?.message.includes('not found')
  );
  assert.equal(storageAccessed, false);
});

test('cross-tenant Resource download is hidden before a signed URL is created', async (t) => {
  const originalQuery = pool.query;
  const originalFrom = supabase.storage.from;
  let signedUrlCreated = false;
  pool.query = async () => ({ rows: [{
    id: 15,
    resource_id: 9,
    client_id: 99,
    resource_type: 'html',
    is_active: true,
    storage_key: 'resources/private.html',
  }] });
  supabase.storage.from = () => ({
    createSignedUrl: async () => {
      signedUrlCreated = true;
      return { data: { signedUrl: 'unexpected' }, error: null };
    },
  });
  t.after(() => {
    pool.query = originalQuery;
    supabase.storage.from = originalFrom;
  });

  await assert.rejects(
    getRuntimeDownload({
      versionId: 15,
      user: { id: 8, role: 'content_authorizer', client_id: 12 },
    }),
    (error) => error?.status === 404
  );
  assert.equal(signedUrlCreated, false);
});
