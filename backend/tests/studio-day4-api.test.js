import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_KEY ||= 'test-only-service-key';

const { default: pool } = await import('../config/db.js');
const { default: supabase } = await import('../config/supabaseClient.js');
const { default: studioDocumentsRouter } = await import('../routes/studioDocuments.routes.js');
const { default: studioLayoutsRouter } = await import('../routes/studioLayouts.routes.js');
const { downloadSessionPlan } = await import('../controllers/studioDocuments.controller.js');
const {
  uploadSessionPlan,
  downloadSessionPlan: downloadSessionPlanService,
} = await import('../services/studioDocuments.service.js');
const { validateLayoutDefinition } = await import('../services/studioLayouts.service.js');

const normalizeSql = (value) => String(value).replace(/\s+/g, ' ').trim().toLowerCase();
const author = { id: 8, role: 'content_authorizer', client_id: 12 };

const registeredRoutes = (router) => router.stack
  .filter((layer) => layer.route)
  .flatMap((layer) => Object.keys(layer.route.methods)
    .map((method) => `${method.toUpperCase()} ${layer.route.path}`));

const validLayout = () => ({
  layout_key: 'custom-example',
  name: 'Custom example',
  canvas_width: 1920,
  canvas_height: 1080,
  safe_margin: 90,
  layout_data_json: {
    slots: [
      {
        id: 'title',
        label: 'Title',
        region: 'header',
        allowed: ['title'],
        bounds: { x: 90, y: 60, width: 1740, height: 150 },
      },
      {
        id: 'content',
        label: 'Content',
        region: 'content',
        allowed: ['text', 'visual'],
        bounds: { x: 90, y: 250, width: 1740, height: 680 },
      },
    ],
  },
});

test('Day 4 routers expose session-level documents, layout versions and screen creation', () => {
  const documentRoutes = registeredRoutes(studioDocumentsRouter);
  const layoutRoutes = registeredRoutes(studioLayoutsRouter);

  assert.ok(documentRoutes.includes('PUT /studio/sessions/:sessionId/session-plan'));
  assert.ok(documentRoutes.includes('PUT /studio/sessions/:sessionId/screen-script'));
  assert.ok(documentRoutes.includes('GET /studio/sessions/:sessionId/session-plan/download'));
  assert.ok(documentRoutes.includes('GET /studio/sessions/:sessionId/screen-script/download'));
  assert.ok(!documentRoutes.some((route) => route.includes('/studio/screens/:screenId/screen-script')));
  assert.ok(layoutRoutes.includes('GET /studio/layouts'));
  assert.ok(layoutRoutes.includes('POST /studio/layouts'));
  assert.ok(layoutRoutes.includes('PATCH /studio/layouts/:layoutId'));
  assert.ok(layoutRoutes.includes('POST /studio/sessions/:sessionId/screens'));
});

test('layout validation accepts the contract and rejects invalid dimensions, types and overlaps', () => {
  const result = validateLayoutDefinition(validLayout());
  assert.equal(result.layoutKey, 'custom-example');
  assert.equal(result.layoutData.slots.length, 2);

  const invalidDimensions = validLayout();
  invalidDimensions.layout_data_json.slots[1].bounds.width = 2000;
  assert.throws(() => validateLayoutDefinition(invalidDimensions), /exceeds the canvas dimensions/);

  const invalidType = validLayout();
  invalidType.layout_data_json.slots[1].allowed = ['unsupported-widget'];
  assert.throws(() => validateLayoutDefinition(invalidType), /unsupported element type/);

  const overlap = validLayout();
  overlap.layout_data_json.slots[1].bounds = { x: 100, y: 100, width: 500, height: 300 };
  assert.throws(() => validateLayoutDefinition(overlap), /overlap/);
});

test('upload replacement creates a new immutable document revision with exact metadata', async (t) => {
  const bytes = Buffer.from('byte-identical-session-plan');
  const expectedHash = createHash('sha256').update(bytes).digest('hex');
  const calls = [];
  let removedObjects = null;
  const originalConnect = pool.connect;
  const originalFrom = supabase.storage.from;

  supabase.storage.from = () => ({
    upload: async () => ({ error: null }),
    remove: async (objects) => {
      removedObjects = objects;
      return { error: null };
    },
  });
  pool.connect = async () => ({
    async query(text, params = []) {
      const sql = normalizeSql(text);
      calls.push({ sql, params });
      if (['begin', 'commit', 'rollback'].includes(sql)) return { rows: [] };
      if (sql.includes('from sessions') && sql.includes('for update')) {
        return { rows: [{ id: 41, client_id: 12, status: 'published' }] };
      }
      if (sql.includes('from session_documents') && sql.includes('is_current = true') && sql.includes('for update')) {
        return { rows: [{ id: 90, session_id: 41, document_type: 'session_plan', revision_no: 1 }] };
      }
      if (sql.startsWith('select coalesce(max(revision_no)')) return { rows: [{ revision_no: 2 }] };
      if (sql.startsWith('update session_documents set is_current = false')) return { rows: [] };
      if (sql.startsWith('insert into session_documents')) {
        assert.equal(params[2], 2);
        assert.equal(params[3], 'upload');
        assert.equal(params[5], 'Lesson Plan ü.docx');
        assert.equal(params[6], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        assert.equal(params[7], bytes.length);
        assert.equal(params[8], expectedHash);
        return { rows: [{ id: 91, revision_no: 2, content_sha256: params[8], size_bytes: params[7] }] };
      }
      if (sql.startsWith('update sessions set status =')) return { rows: [{ id: 41, status: 'draft' }] };
      throw new Error(`Unhandled query: ${sql}`);
    },
    release() {},
  });

  t.after(() => {
    pool.connect = originalConnect;
    supabase.storage.from = originalFrom;
  });

  const result = await uploadSessionPlan({
    sessionId: 41,
    user: author,
    file: {
      buffer: bytes,
      originalname: 'Lesson Plan ü.docx',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
  });

  assert.equal(result.revision_no, 2);
  assert.equal(result.content_sha256, expectedHash);
  assert.ok(calls.some(({ sql, params }) => sql.startsWith('update session_documents set is_current = false') && params[0] === 90));
  assert.equal(removedObjects, null, 'the previous immutable original must not be deleted on replacement');
});

test('protected download returns byte-identical content with accurate headers', async (t) => {
  const bytes = Buffer.from('protected-original-bytes');
  const hash = createHash('sha256').update(bytes).digest('hex');
  const originalQuery = pool.query;
  const originalFrom = supabase.storage.from;

  pool.query = async (text) => {
    const sql = normalizeSql(text);
    if (sql.includes('from sessions')) return { rows: [{ id: 41, client_id: 12, status: 'published' }] };
    if (sql.includes('from session_documents')) {
      return { rows: [{
        id: 91,
        session_id: 41,
        document_type: 'session_plan',
        revision_no: 2,
        source_mode: 'upload',
        storage_key: 'sessions/41/session_plan/file.docx',
        original_file_name: 'Lesson Plan ü.docx',
        content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size_bytes: bytes.length,
        content_sha256: hash,
      }] };
    }
    throw new Error(`Unhandled query: ${sql}`);
  };
  supabase.storage.from = () => ({
    download: async () => ({ data: new Blob([bytes]), error: null }),
  });
  t.after(() => {
    pool.query = originalQuery;
    supabase.storage.from = originalFrom;
  });

  const headers = new Map();
  let responseBytes = null;
  const response = {
    setHeader(name, value) { headers.set(name, value); },
    send(value) { responseBytes = value; return this; },
    status() { return this; },
    json() { return this; },
  };
  await downloadSessionPlan({ params: { sessionId: '41' }, user: author }, response);

  assert.deepEqual(responseBytes, bytes);
  assert.equal(headers.get('Content-Length'), String(bytes.length));
  assert.equal(headers.get('X-Content-SHA256'), hash);
  assert.equal(headers.get('X-Studio-Document-Revision'), '2');
  assert.match(headers.get('Content-Disposition'), /filename\*=UTF-8''Lesson%20Plan%20%C3%BC\.docx/);
});

test('teacher original-file download remains denied even for a published Session', async (t) => {
  const originalQuery = pool.query;
  let documentQueryRan = false;
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
    if (sql.includes('from session_documents')) {
      documentQueryRan = true;
      return { rows: [] };
    }
    throw new Error(`Unhandled query: ${sql}`);
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  await assert.rejects(
    downloadSessionPlanService({
      sessionId: 41,
      user: { id: 700, role: 'teacher', client_id: 12 },
    }),
    (error) => error?.status === 403 && /cannot download original files/i.test(error.message)
  );
  assert.equal(documentQueryRan, false);
});
