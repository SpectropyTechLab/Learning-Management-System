import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

process.env.JWT_SECRET ||= 'studio-day8-test-secret';
process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_KEY ||= 'test-only-service-key';

const { default: pool } = await import('../config/db.js');
const { default: supabase } = await import('../config/supabaseClient.js');
const {
  downloadSessionPlan,
  downloadScreenScript,
} = await import('../controllers/studioDocuments.controller.js');
const {
  downloadSessionPlan: downloadSessionPlanService,
} = await import('../services/studioDocuments.service.js');
const { getRuntimeDownload } = await import('../services/studioResourceRuntime.service.js');

const normalizeSql = (value) => String(value).replace(/\s+/g, ' ').trim().toLowerCase();
const author = { id: 8, role: 'content_authorizer', client_id: 12 };
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

const responseRecorder = () => ({
  statusCode: 200,
  headers: new Map(),
  body: null,
  setHeader(name, value) { this.headers.set(name, value); },
  status(code) { this.statusCode = code; return this; },
  json(value) { this.body = value; return this; },
  send(value) { this.body = value; return this; },
});

const documentRecord = ({ id, type, revision, storageKey, fileName, contentType, bytes }) => ({
  id,
  session_id: 41,
  document_type: type,
  revision_no: revision,
  source_mode: 'upload',
  storage_key: storageKey,
  original_file_name: fileName,
  content_type: contentType,
  size_bytes: bytes.length,
  content_sha256: sha256(bytes),
});

test('original Session Plan and Screen Script downloads preserve bytes and metadata', async (t) => {
  const planBytes = Buffer.from('Day 8 original Session Plan bytes');
  const scriptBytes = Buffer.from('Day 8 original Screen Script bytes');
  const records = {
    session_plan: documentRecord({
      id: 101,
      type: 'session_plan',
      revision: 3,
      storageKey: 'sessions/41/session_plan/original-plan.docx',
      fileName: 'Physics Session Plan ü.docx',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      bytes: planBytes,
    }),
    screen_script: documentRecord({
      id: 102,
      type: 'screen_script',
      revision: 5,
      storageKey: 'sessions/41/screen_script/original-script.pdf',
      fileName: 'Kinematics Screen Script.pdf',
      contentType: 'application/pdf',
      bytes: scriptBytes,
    }),
  };
  const storedBytes = new Map([
    [records.session_plan.storage_key, planBytes],
    [records.screen_script.storage_key, scriptBytes],
  ]);
  const downloadedKeys = [];
  const originalQuery = pool.query;
  const originalFrom = supabase.storage.from;

  pool.query = async (text, params = []) => {
    const sql = normalizeSql(text);
    if (sql.includes('from sessions se')) {
      return { rows: [{
        id: 41,
        client_id: 12,
        status: 'published',
        program_id: 55,
        program_school_id: null,
      }] };
    }
    if (sql.includes('from session_documents')) return { rows: [records[params[1]]] };
    throw new Error(`Unhandled query: ${sql}`);
  };
  supabase.storage.from = (bucket) => {
    assert.equal(bucket, 'sessions-scripts-plans');
    return {
      download: async (storageKey) => {
        downloadedKeys.push(storageKey);
        const bytes = storedBytes.get(storageKey);
        return bytes
          ? { data: new Blob([bytes]), error: null }
          : { data: null, error: new Error('Not found') };
      },
    };
  };
  t.after(() => {
    pool.query = originalQuery;
    supabase.storage.from = originalFrom;
  });

  const cases = [
    { controller: downloadSessionPlan, record: records.session_plan, bytes: planBytes },
    { controller: downloadScreenScript, record: records.screen_script, bytes: scriptBytes },
  ];
  for (const acceptanceCase of cases) {
    const response = responseRecorder();
    await acceptanceCase.controller(
      { params: { sessionId: '41' }, user: author },
      response
    );

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, acceptanceCase.bytes);
    assert.equal(response.headers.get('Content-Type'), acceptanceCase.record.content_type);
    assert.equal(response.headers.get('Content-Length'), String(acceptanceCase.bytes.length));
    assert.equal(response.headers.get('X-Content-SHA256'), sha256(acceptanceCase.bytes));
    assert.equal(
      response.headers.get('X-Studio-Document-Revision'),
      String(acceptanceCase.record.revision_no)
    );
    assert.match(
      response.headers.get('Content-Disposition'),
      new RegExp(`filename\\*=UTF-8''${encodeURIComponent(acceptanceCase.record.original_file_name)}`)
    );
  }

  assert.deepEqual(downloadedKeys, [
    records.session_plan.storage_key,
    records.screen_script.storage_key,
  ]);
});

test('original document download rejects changed Storage bytes', async (t) => {
  const originalBytes = Buffer.from('approved original bytes');
  const changedBytes = Buffer.from('changed bytes');
  const originalQuery = pool.query;
  const originalFrom = supabase.storage.from;

  pool.query = async (text) => {
    const sql = normalizeSql(text);
    if (sql.includes('from sessions se')) {
      return { rows: [{
        id: 41,
        client_id: 12,
        status: 'published',
        program_id: 55,
        program_school_id: null,
      }] };
    }
    if (sql.includes('from session_documents')) return { rows: [documentRecord({
      id: 101,
      type: 'session_plan',
      revision: 1,
      storageKey: 'sessions/41/session_plan/original.docx',
      fileName: 'original.docx',
      contentType: 'application/octet-stream',
      bytes: originalBytes,
    })] };
    throw new Error(`Unhandled query: ${sql}`);
  };
  supabase.storage.from = () => ({
    download: async () => ({ data: new Blob([changedBytes]), error: null }),
  });
  t.after(() => {
    pool.query = originalQuery;
    supabase.storage.from = originalFrom;
  });

  await assert.rejects(
    downloadSessionPlanService({ sessionId: 41, user: author }),
    (error) => error?.status === 502 && error?.message.includes('integrity verification')
  );
});

test('original Resource download signs the exact immutable version object', async (t) => {
  const originalQuery = pool.query;
  const originalFrom = supabase.storage.from;
  let signedRequest = null;

  pool.query = async () => ({ rows: [{
    id: 301,
    resource_id: 201,
    version_number: 2,
    client_id: 12,
    resource_type: 'zip',
    is_active: true,
    storage_key: 'resources/version-2-original.zip',
    original_file_name: 'Kinematics Interactive v2.zip',
    mime_type: 'application/zip',
    file_size: 4096,
    checksum_sha256: 'recorded-resource-sha256',
  }] });
  supabase.storage.from = (bucket) => {
    assert.equal(bucket, 'studio-resources');
    return {
      createSignedUrl: async (storageKey, expiresIn, options) => {
        signedRequest = { storageKey, expiresIn, options };
        return {
          data: { signedUrl: 'https://storage.example.test/signed-original' },
          error: null,
        };
      },
    };
  };
  t.after(() => {
    pool.query = originalQuery;
    supabase.storage.from = originalFrom;
  });

  const result = await getRuntimeDownload({ versionId: 301, user: author });

  assert.deepEqual(signedRequest, {
    storageKey: 'resources/version-2-original.zip',
    expiresIn: 60,
    options: { download: 'Kinematics Interactive v2.zip' },
  });
  assert.deepEqual(result, {
    url: 'https://storage.example.test/signed-original',
    expires_in_seconds: 60,
    file_name: 'Kinematics Interactive v2.zip',
  });
});

test('original Resource download rejects teachers and hides cross-tenant versions', async (t) => {
  await assert.rejects(
    getRuntimeDownload({
      versionId: 301,
      user: { id: 700, role: 'teacher', client_id: 12 },
    }),
    (error) => error?.status === 403
  );

  const originalQuery = pool.query;
  const originalFrom = supabase.storage.from;
  let storageAccessed = false;
  pool.query = async () => ({ rows: [{
    id: 301,
    resource_id: 201,
    client_id: 99,
    resource_type: 'zip',
    is_active: true,
    storage_key: 'resources/private-other-tenant.zip',
  }] });
  supabase.storage.from = () => {
    storageAccessed = true;
    return {};
  };
  t.after(() => {
    pool.query = originalQuery;
    supabase.storage.from = originalFrom;
  });

  await assert.rejects(
    getRuntimeDownload({ versionId: 301, user: author }),
    (error) => error?.status === 404
  );
  assert.equal(storageAccessed, false);
});
