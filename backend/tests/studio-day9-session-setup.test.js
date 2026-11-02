import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudioSession, listStudioSessions } from '../services/studioSessions.service.js';

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
