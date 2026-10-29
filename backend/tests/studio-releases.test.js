import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../config/db.js';
import {
  getCurrentTeacherRelease,
  publishSessionRelease,
} from '../services/studioReleases.service.js';

const normalizeSql = (text) => String(text).replace(/\s+/g, ' ').trim().toLowerCase();

test('publishing snapshots screens, layouts, resources and mappings into Release 1', async (t) => {
  const originalConnect = pool.connect;
  const calls = [];
  let insertedManifest;
  const client = {
    async query(text, params = []) {
      const sql = normalizeSql(text);
      calls.push(sql);
      if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return { rows: [] };
      if (sql.includes('from sessions') && sql.includes('for update')) {
        return {
          rows: [{
            id: 25,
            client_id: 7,
            subtopic_id: 8,
            title: 'Introduction to Motion',
            description: 'Lesson description',
            status: 'approved',
            session_plan_file_url: 'draft/session-plan.docx',
            session_plan_file_name: 'session-plan.docx',
            session_plan_file_type: 'application/docx',
            session_plan_uploaded_at: '2026-10-28T09:00:00.000Z',
            session_plan_content: null,
            approved_by: 12,
            approved_at: '2026-10-28T09:30:00.000Z',
          }],
        };
      }
      if (sql.includes('from screens sc')) {
        return {
          rows: [{
            id: 40,
            client_id: 7,
            title: 'Motion screen',
            screen_number: 1,
            display_order: 0,
            layout_id: 5,
            screen_script_file_url: 'draft/screen-script.docx',
            screen_script_file_name: 'screen-script.docx',
            screen_script_file_type: 'application/docx',
            screen_script_uploaded_at: '2026-10-28T09:05:00.000Z',
            screen_script_content: null,
            elements_json: [{ id: 'video-1' }],
            branches_json: [],
            branch_tags_json: ['motion'],
            screen_settings_json: { background: 'white' },
            layout_name: 'Video Left',
            layout_description: null,
            layout_data_json: { regions: ['left', 'right'] },
            thumbnail_url: null,
            is_default: true,
          }],
        };
      }
      if (sql.includes('from resource_mappings rm')) {
        return {
          rows: [{
            mapping_id: 70,
            screen_id: 40,
            element_id: 'video-1',
            usage_details_json: { fit: 'contain' },
            resource_id: 80,
            client_id: 7,
            name: 'Motion animation',
            description: null,
            resource_type: 'animation',
            file_url: 'resources/motion.html',
            file_name: 'motion.html',
            file_type: 'text/html',
            file_size: 5000,
            thumbnail_url: null,
            external_url: null,
            resource_data_json: { entry_point: 'index.html' },
            version: 2,
          }],
        };
      }
      if (sql.startsWith('select coalesce(max(release_number)')) {
        return { rows: [{ release_number: 1 }] };
      }
      if (sql.startsWith('insert into session_releases')) {
        insertedManifest = JSON.parse(params[3]);
        return {
          rows: [{
            id: '101',
            client_id: 7,
            session_id: 25,
            release_number: 1,
            manifest_json: insertedManifest,
            approved_by: 12,
            approved_at: '2026-10-28T09:30:00.000Z',
            published_by: 21,
            published_at: '2026-10-28T10:00:00.000Z',
          }],
        };
      }
      if (sql.startsWith("update sessions set status = 'published'")) return { rows: [], rowCount: 1 };
      throw new Error(`Unhandled query: ${sql}`);
    },
    release() {},
  };

  pool.connect = async () => client;
  t.after(() => {
    pool.connect = originalConnect;
  });

  const release = await publishSessionRelease({
    sessionId: '25',
    user: { id: 21, role: 'content_authorizer', client_id: 7 },
  });

  assert.equal(release.release_number, 1);
  assert.equal(insertedManifest.session.session_id, 25);
  assert.deepEqual(insertedManifest.screens[0].layout.layout_data_json, { regions: ['left', 'right'] });
  assert.equal(insertedManifest.screens[0].resource_mappings[0].resource.version, 2);
  assert.equal(insertedManifest.screens[0].resource_mappings[0].element_id, 'video-1');
  assert.ok(calls.includes('commit'));
});

test('teacher current-release read comes only from session_releases and is tenant scoped', async (t) => {
  const originalQuery = pool.query;
  let executedSql = '';
  pool.query = async (text, params) => {
    executedSql = normalizeSql(text);
    assert.deepEqual(params, [25, 7]);
    return {
      rows: [{
        id: '101',
        client_id: 7,
        session_id: 25,
        release_number: 1,
        manifest_json: { session: { session_id: 25 }, screens: [] },
        approved_by: 12,
        approved_at: '2026-10-28T09:30:00.000Z',
        published_by: 21,
        published_at: '2026-10-28T10:00:00.000Z',
      }],
    };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const release = await getCurrentTeacherRelease({
    sessionId: 25,
    user: { id: 30, role: 'teacher', client_id: 7 },
  });

  assert.equal(release.release_number, 1);
  assert.match(executedSql, /from session_releases/);
  assert.doesNotMatch(executedSql, /from sessions\b/);
});

test('publication rejects a Session that is not approved', async (t) => {
  const originalConnect = pool.connect;
  let rolledBack = false;
  const client = {
    async query(text) {
      const sql = normalizeSql(text);
      if (sql === 'begin' || sql === 'commit') return { rows: [] };
      if (sql === 'rollback') {
        rolledBack = true;
        return { rows: [] };
      }
      if (sql.includes('from sessions') && sql.includes('for update')) {
        return { rows: [{ id: 25, client_id: 7, status: 'draft' }] };
      }
      throw new Error(`Unhandled query: ${sql}`);
    },
    release() {},
  };
  pool.connect = async () => client;
  t.after(() => {
    pool.connect = originalConnect;
  });

  await assert.rejects(
    publishSessionRelease({
      sessionId: 25,
      user: { id: 21, role: 'content_authorizer', client_id: 7 },
    }),
    (error) => error.status === 409 && /Only approved/.test(error.message)
  );
  assert.equal(rolledBack, true);
});
