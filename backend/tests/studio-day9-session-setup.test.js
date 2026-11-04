import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudioSession, listAllStudioSessions, listStudioSessions } from '../services/studioSessions.service.js';

const author = { id: 41, role: 'content_authorizer', client_id: 7 };
const row = { id: 9, client_id: 7, subtopic_id: 6, session_number: 2, title: 'Fractions', description: null, status: 'draft', revision_no: 1 };

test('Studio sessions are listed only after validating the selected subtopic tenant', async () => {
  const calls = [];
  const db = { query: async (sql, params) => {
    calls.push([sql, params]);
    if (sql.includes('FROM subtopics')) return { rows: [{ id: 6, client_id: 7 }] };
    return { rows: [row] };
  } };
  const result = await listStudioSessions({ subtopicId: '6', user: author, db });
  assert.deepEqual(result.sessions[0], row);
  assert.match(calls[1][0], /ORDER BY session_number, id/);
});

test('a Content Authorizer creates the next ordered draft Studio session transactionally', async () => {
  const calls = [];
  const client = { query: async (sql, params) => {
    calls.push(sql);
    if (sql.includes('FROM subtopics')) return { rows: [{ id: 6, client_id: 7 }] };
    if (sql.includes('MAX(session_number)')) return { rows: [{ next_number: 2 }] };
    if (sql.includes('INSERT INTO sessions')) {
      assert.deepEqual(params, [7, 6, 2, 'Fractions', null, 41]);
      return { rows: [row] };
    }
    return { rows: [] };
  }, release() { calls.push('RELEASE'); } };
  const result = await createStudioSession({ subtopicId: 6, body: { title: ' Fractions ' }, user: author, getDbClient: async () => client });
  assert.equal(result.status, 'draft');
  assert.deepEqual(calls.filter((value) => ['BEGIN', 'COMMIT', 'RELEASE'].includes(value)), ['BEGIN', 'COMMIT', 'RELEASE']);
});

test('cross-tenant subtopics are rejected before listing sessions', async () => {
  const db = { query: async () => ({ rows: [{ id: 6, client_id: 99 }] }) };
  await assert.rejects(() => listStudioSessions({ subtopicId: 6, user: author, db }), (error) => error.status === 403);
});

test('the Session Library is tenant scoped and can filter workflow status', async () => {
  const calls = [];
  const db = { query: async (sql, params) => {
    calls.push([sql, params]);
    return { rows: [{ ...row, subject_name: 'Mathematics', screen_count: 2, has_session_plan: true }] };
  } };
  const result = await listAllStudioSessions({ status: 'submitted', user: author, db });
  assert.equal(result.sessions[0].subject_name, 'Mathematics');
  assert.deepEqual(calls[0][1], [7, 'submitted']);
  assert.match(calls[0][0], /JOIN programs p/);
  assert.match(calls[0][0], /ORDER BY s\.updated_at DESC/);
});

test('the Session Library rejects unknown workflow status filters', async () => {
  await assert.rejects(
    () => listAllStudioSessions({ status: 'archived', user: author, db: { query: async () => ({ rows: [] }) } }),
    (error) => error.status === 400 && error.code === 'INVALID_STATUS',
  );
});
