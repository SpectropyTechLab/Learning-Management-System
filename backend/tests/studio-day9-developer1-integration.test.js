import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.env.JWT_SECRET ||= 'studio-day9-test-secret-at-least-32-characters';
process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_KEY ||= 'test-only-service-key';

const { default: pool } = await import('../config/db.js');
const { attachClientContext } = await import('../middleware/auth.js');
const { default: sessionRouter } = await import('../routes/studioSessions.routes.js');
const {
  createStudioSession,
  deleteStudioSession,
  listSubtopicSessions,
} = await import('../services/studioSessions.service.js');

const normalizeSql = (value) => String(value).replace(/\s+/g, ' ').trim().toLowerCase();
const author = { id: 8, role: 'content_authorizer', client_id: 12 };

const routes = sessionRouter.stack.filter((layer) => layer.route).flatMap((layer) =>
  Object.keys(layer.route.methods).map((method) => `${method.toUpperCase()} ${layer.route.path}`));

test('Day 9 exposes separate Studio session create and selection APIs', () => {
  assert.deepEqual(routes, [
    'GET /studio/sessions',
    'GET /studio/subtopics/:subtopicId/sessions',
    'POST /studio/subtopics/:subtopicId/sessions',
    'GET /studio/sessions/:sessionId',
    'PATCH /studio/sessions/:sessionId',
    'DELETE /studio/sessions/:sessionId',
  ]);
});

test('Studio session routes deny a direct teacher request even if a sidebar link is fabricated', () => {
  const roleLayer = sessionRouter.stack[2];
  const response = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  let nextCalled = false;
  roleLayer.handle(
    { user: { id: 700, role: 'teacher', client_id: 12 } },
    response,
    () => { nextCalled = true; },
  );
  assert.equal(response.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('stale token client context is rejected and the database user remains authoritative', () => {
  const response = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  let nextCalled = false;
  attachClientContext(
    { auth: { clientId: 99 }, user: author },
    response,
    () => { nextCalled = true; },
  );
  assert.equal(response.statusCode, 403);
  assert.equal(response.body.error.code, 'CLIENT_CONTEXT_MISMATCH');
  assert.equal(nextCalled, false);

  const request = { auth: { clientId: 12 }, user: author };
  attachClientContext(request, response, () => { nextCalled = true; });
  assert.equal(request.clientId, 12);
  assert.equal(nextCalled, true);
});

test('session selection preserves ordered multiple sessions under one subtopic', async () => {
  const db = {
    async query(text) {
      const sql = normalizeSql(text);
      if (sql.includes('from subtopics st')) {
        return { rows: [{
          id: 31, subtopic_name: 'Fractions', client_id: 12,
          board_id: 1, program_id: 2, grade_id: 3, subject_id: 4,
          chapter_id: 5, topic_id: 6,
        }] };
      }
      if (sql.includes('from sessions')) {
        return { rows: [
          { id: 101, subtopic_id: 31, session_number: 1, title: 'Introduction' },
          { id: 102, subtopic_id: 31, session_number: 2, title: 'Practice' },
        ] };
      }
      throw new Error(`Unhandled query: ${sql}`);
    },
  };
  const result = await listSubtopicSessions({ subtopicId: 31, user: author, db });
  assert.deepEqual(result.sessions.map((session) => session.session_number), [1, 2]);
  assert.equal(result.curriculum.subtopic_name, 'Fractions');
});

test('session creation assigns the next order and starts at revision one', async (t) => {
  const originalConnect = pool.connect;
  const calls = [];
  pool.connect = async () => ({
    async query(text, params) {
      const sql = normalizeSql(text);
      calls.push({ sql, params });
      if (['begin', 'commit', 'rollback'].includes(sql)) return { rows: [] };
      if (sql.includes('from subtopics st')) {
        return { rows: [{
          id: 31, subtopic_name: 'Fractions', client_id: 12,
          board_id: 1, program_id: 2, grade_id: 3, subject_id: 4,
          chapter_id: 5, topic_id: 6,
        }] };
      }
      if (sql.startsWith('select coalesce(max(session_number)')) {
        return { rows: [{ next_number: 3 }] };
      }
      if (sql.startsWith('insert into sessions')) {
        return { rows: [{
          id: 103, client_id: 12, subtopic_id: 31, session_number: 3,
          title: 'Assessment', description: null, status: 'draft', revision_no: 1,
          created_by: 8,
        }] };
      }
      throw new Error(`Unhandled query: ${sql}`);
    },
    release() {},
  });
  t.after(() => { pool.connect = originalConnect; });

  const session = await createStudioSession({
    subtopicId: 31,
    body: { title: 'Assessment' },
    user: author,
  });
  assert.equal(session.session_number, 3);
  assert.equal(session.revision_no, 1);
  assert.ok(calls.some((call) => call.sql === 'commit'));
});

test('draft Session deletion removes dependent content before document revisions', async () => {
  const calls = [];
  let released = false;
  let removedKeys = [];
  const db = {
    async query(text, params) {
      const sql = normalizeSql(text);
      calls.push({ sql, params });
      if (['begin', 'commit', 'rollback'].includes(sql)) return { rows: [] };
      if (sql.includes('select s.*, st.name as subtopic_name')) {
        return { rows: [{ id: 103, client_id: 12, subtopic_id: 31, status: 'draft', title: 'Assessment' }] };
      }
      if (sql.startsWith('select 1 from session_releases')) return { rows: [] };
      if (sql.startsWith('select storage_key from session_documents')) {
        return { rows: [{ storage_key: 'sessions/103/session_plan/plan.docx' }, { storage_key: 'sessions/103/screen_script/script.docx' }] };
      }
      if (sql.startsWith('delete from sessions')) {
        return { rows: [{ id: 103, title: 'Assessment', subtopic_id: 31, session_number: 3 }] };
      }
      if (sql.startsWith('delete from')) return { rows: [] };
      throw new Error(`Unhandled query: ${sql}`);
    },
    release() { released = true; },
  };
  const result = await deleteStudioSession({
    sessionId: 103,
    user: author,
    getDbClient: async () => db,
    removeFiles: async (keys) => { removedKeys = keys; return true; },
  });
  assert.equal(result.id, 103);
  assert.equal(result.deleted_document_count, 2);
  assert.equal(result.storage_cleanup_complete, true);
  assert.deepEqual(removedKeys, ['sessions/103/session_plan/plan.docx', 'sessions/103/screen_script/script.docx']);
  assert.ok(calls.some((call) => call.sql.startsWith('delete from screen_zoom_links')));
  assert.ok(calls.findIndex((call) => call.sql.startsWith('delete from screen_script_revisions'))
    < calls.findIndex((call) => call.sql.startsWith('delete from screens')));
  assert.ok(calls.findIndex((call) => call.sql.startsWith('delete from screens'))
    < calls.findIndex((call) => call.sql.startsWith('delete from session_documents')));
  assert.ok(calls.some((call) => call.sql === 'commit'));
  assert.equal(released, true);
});

test('submitted Session deletion is rejected and rolled back', async () => {
  const calls = [];
  const db = {
    async query(text) {
      const sql = normalizeSql(text);
      calls.push(sql);
      if (['begin', 'rollback'].includes(sql)) return { rows: [] };
      if (sql.includes('select s.*, st.name as subtopic_name')) {
        return { rows: [{ id: 104, client_id: 12, subtopic_id: 31, status: 'submitted', title: 'Reviewing' }] };
      }
      throw new Error(`Unhandled query: ${sql}`);
    },
    release() {},
  };
  await assert.rejects(
    deleteStudioSession({ sessionId: 104, user: author, getDbClient: async () => db, removeFiles: async () => true }),
    (error) => error.code === 'SESSION_DELETE_NOT_ALLOWED' && error.status === 409,
  );
  assert.ok(calls.includes('rollback'));
  assert.equal(calls.some((sql) => sql.startsWith('delete from sessions')), false);
});

test('unexpected Session dependency conflicts return an actionable 409 error', async () => {
  const db = {
    async query(text) {
      const sql = normalizeSql(text);
      if (['begin', 'rollback'].includes(sql)) return { rows: [] };
      if (sql.includes('select s.*, st.name as subtopic_name')) {
        return { rows: [{ id: 105, client_id: 12, subtopic_id: 31, status: 'draft', title: 'Referenced' }] };
      }
      if (sql.startsWith('select 1 from session_releases')) return { rows: [] };
      if (sql.startsWith('select storage_key from session_documents')) return { rows: [] };
      if (sql.startsWith('delete from screen_zoom_links')) {
        const error = new Error('foreign key violation');
        error.code = '23503';
        throw error;
      }
      if (sql.startsWith('delete from')) return { rows: [] };
      throw new Error(`Unhandled query: ${sql}`);
    },
    release() {},
  };
  await assert.rejects(
    deleteStudioSession({ sessionId: 105, user: author, getDbClient: async () => db, removeFiles: async () => true }),
    (error) => error.code === 'SESSION_DELETE_DEPENDENCY_CONFLICT' && error.status === 409,
  );
});

test('frontend exposes one actionable error parser for legacy and structured APIs', () => {
  const source = readFileSync(
    new URL('../../frontend/src/lib/api.ts', import.meta.url),
    'utf8',
  );
  assert.match(source, /export const getApiErrorDetails/);
  assert.match(source, /nested\?\.message \?\? legacyMessage/);
  assert.match(source, /nested\.code \?\? payload\.code/);
});
