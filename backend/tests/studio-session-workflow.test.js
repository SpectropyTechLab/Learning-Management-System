import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../config/db.js';
import { startSessionRevision, submitSession } from '../services/studioSessionWorkflow.service.js';

const normalizedSql = (value) => String(value).replace(/\s+/g, ' ').trim().toLowerCase();

test('submitSession validates complete content and submits a draft session', async (t) => {
  const calls = [];
  const client = {
    async query(text, params = []) {
      const sql = normalizedSql(text);
      calls.push({ sql, params });

      if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return { rows: [] };
      if (sql.includes('from sessions') && sql.includes('for update')) {
        return {
          rows: [{
            id: 41,
            client_id: 12,
            subtopic_id: 9,
            title: 'Fractions',
            status: 'draft',
            revision_no: 3,
          }],
        };
      }
      if (sql.includes('from session_documents')) {
        return { rows: [
          { id: 101, document_type: 'session_plan', revision_no: 2 },
          { id: 102, document_type: 'screen_script', revision_no: 4 },
        ] };
      }
      if (sql.includes('from screens')) {
        return {
          rows: [{
            id: 71,
            screen_number: 1,
            revision_no: 5,
          }],
        };
      }
      if (sql.startsWith('insert into session_validations')) {
        return { rows: [{ id: 201, session_id: 41, session_revision_no: 3, is_valid: true }] };
      }
      if (sql.startsWith("update sessions set status = 'submitted'")) {
        return {
          rows: [{
            session_id: 41,
            status: 'submitted',
            submitted_by: 8,
            submitted_at: '2026-10-27T12:00:00.000Z',
          }],
        };
      }
      throw new Error(`Unhandled query: ${sql}`);
    },
    release() {},
  };

  const originalConnect = pool.connect;
  pool.connect = async () => client;
  t.after(() => {
    pool.connect = originalConnect;
  });

  const result = await submitSession({
    sessionId: '41',
    user: { id: 8, role: 'content_authorizer', client_id: '12' },
  });

  assert.equal(result.session_id, 41);
  assert.equal(result.status, 'submitted');
  assert.equal(result.workflow_state, 'validated');
  assert.equal(result.validation.exact_revision.session_plan_revision_no, 2);
  assert.equal(result.validation.exact_revision.screen_script_revision_no, 4);
  assert.equal(result.validation.valid, true);
  assert.equal(result.validation.screen_count, 1);
  assert.ok(calls.some(({ sql }) => sql === 'commit'));
  assert.ok(!calls.some(({ sql }) => sql === 'rollback'));
});

test('submitSession rejects access to a session from another tenant', async (t) => {
  const calls = [];
  const client = {
    async query(text) {
      const sql = normalizedSql(text);
      calls.push(sql);
      if (sql === 'begin' || sql === 'rollback') return { rows: [] };
      if (sql.includes('from sessions') && sql.includes('for update')) {
        return {
          rows: [{
            id: 41,
            client_id: 99,
            subtopic_id: 9,
            title: 'Fractions',
            status: 'draft',
            revision_no: 1,
          }],
        };
      }
      throw new Error(`Unhandled query: ${sql}`);
    },
    release() {},
  };

  const originalConnect = pool.connect;
  pool.connect = async () => client;
  t.after(() => {
    pool.connect = originalConnect;
  });

  await assert.rejects(
    submitSession({
      sessionId: 41,
      user: { id: 8, role: 'content_authorizer', client_id: 12 },
    }),
    (error) => error?.status === 403 && error?.message === 'Access denied'
  );

  assert.ok(calls.includes('rollback'));
  assert.ok(!calls.includes('commit'));
});

test('startSessionRevision preserves a published release while creating a new draft revision', async (t) => {
  const calls = [];
  const client = {
    async query(text, params = []) {
      const sql = normalizedSql(text);
      calls.push({ sql, params });
      if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return { rows: [] };
      if (sql.includes('from sessions') && sql.includes('for update')) {
        return { rows: [{ id: 41, client_id: 12, status: 'published', revision_no: 7 }] };
      }
      if (sql.startsWith("update sessions set status = 'draft'")) {
        assert.deepEqual(params, [41, 'published']);
        return { rows: [{ session_id: 41, status: 'draft', revision_no: 8 }] };
      }
      throw new Error(`Unhandled query: ${sql}`);
    },
    release() {},
  };
  const originalConnect = pool.connect;
  pool.connect = async () => client;
  t.after(() => { pool.connect = originalConnect; });

  const result = await startSessionRevision({
    sessionId: 41,
    user: { id: 8, role: 'content_authorizer', client_id: 12 },
  });

  assert.equal(result.status, 'draft');
  assert.equal(result.revision_no, 8);
  assert.equal(result.previous_status, 'published');
  assert.equal(result.creates_new_release, true);
  assert.ok(calls.some(({ sql }) => sql === 'commit'));
  assert.ok(calls.every(({ sql }) => !sql.includes('session_releases')));
});
