import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../config/db.js';
import { submitSession } from '../services/studioSessionWorkflow.service.js';

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
            session_plan_file_url: 'sessions/41/plan.docx',
            session_plan_content: null,
          }],
        };
      }
      if (sql.includes('from screens')) {
        return {
          rows: [{
            id: 71,
            screen_number: 1,
            screen_script_file_url: 'screens/71/script.docx',
            screen_script_content: null,
          }],
        };
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
            session_plan_file_url: 'sessions/41/plan.docx',
            session_plan_content: null,
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
