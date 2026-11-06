import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import pool from '../config/db.js';
import {
  assertPinnedPublishedResourceAccess,
  getPublishedTeachingMaterials,
  getPublishedReleaseByNumber,
  getCurrentTeacherRelease,
  getSessionPlayerPreview,
  listPublishedSessionReleases,
  listPublishedSessions,
  publishSessionRelease,
} from '../services/studioReleases.service.js';

const normalizeSql = (text) => String(text).replace(/\s+/g, ' ').trim().toLowerCase();

test('Day 6 migration makes releases append-only and unique per Session revision', () => {
  const migration = readFileSync(
    new URL('../../supabase/migrations/20261029160000_studio_day6_publication.sql', import.meta.url),
    'utf8'
  );
  assert.match(migration, /BEFORE UPDATE OR DELETE ON public\.session_releases/);
  assert.match(migration, /UNIQUE \(session_id, session_revision_no\)/);
  assert.match(migration, /validation_id BIGINT NOT NULL/);
  assert.match(migration, /authorization_id BIGINT NOT NULL/);
});

test('publishing pins exact authorized document, screen, layout and Resource revisions', async (t) => {
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
            revision_no: 6,
            program_id: 4,
            program_school_id: 9,
            approved_by: 12,
            approved_at: '2026-10-28T09:30:00.000Z',
          }],
        };
      }
      if (sql.includes('from session_authorizations sa')) {
        return { rows: [{
          authorization_id: 301, validation_id: 201, session_revision_no: 6,
          session_plan_document_id: 91, screen_script_document_id: 92,
          screen_revisions_json: [{ screen_id: 40, screen_number: 1, revision_no: 4 }],
          authorized_by: 12, authorized_at: '2026-10-28T09:30:00.000Z',
        }] };
      }
      if (sql.includes('from session_documents')) {
        return { rows: [
          { id: 91, session_id: 25, document_type: 'session_plan', revision_no: 2,
            source_mode: 'upload', storage_key: 'plans/91.docx', original_file_name: 'plan.docx',
            content_type: 'application/docx', size_bytes: 100, content_sha256: 'a'.repeat(64),
            manual_content: null, metadata_json: {}, created_by: 21, created_at: '2026-10-28T09:00:00Z' },
          { id: 92, session_id: 25, document_type: 'screen_script', revision_no: 3,
            source_mode: 'manual', storage_key: null, original_file_name: null,
            content_type: null, size_bytes: null, content_sha256: null,
            manual_content: { script: 'Motion' }, metadata_json: {}, created_by: 21,
            created_at: '2026-10-28T09:05:00Z' },
        ] };
      }
      if (sql.includes('from screens sc')) {
        return {
          rows: [{
            id: 40,
            client_id: 7,
            title: 'Motion screen',
            screen_number: 1,
            display_order: 0,
            creation_mode: 'layout',
            revision_no: 4,
            layout_id: 5,
            screen_settings_json: { background: 'white' },
            layout_key: 'video-left',
            layout_version_no: 3,
            layout_name: 'Video Left',
            layout_description: null,
            layout_data_json: { regions: ['left', 'right'] },
            thumbnail_url: null,
            is_default: true,
            canvas_width: 1920,
            canvas_height: 1080,
            safe_margin: 90,
          }],
        };
      }
      if (sql.includes('from screen_elements se')) {
        return {
          rows: [{
            screen_element_id: 60,
            mapping_id: 70,
            screen_id: 40,
            element_key: 'video-1',
            slot_id: 'left',
            element_type: 'media',
            content_json: {},
            position_json: {},
            display_order: 0,
            usage_details_json: { fit: 'contain' },
            resource_id: 80,
            resource_client_id: 7,
            resource_name: 'Motion animation',
            resource_description: null,
            resource_type: 'animation',
            resource_version_id: 82,
            version_number: 2,
            storage_key: 'resources/motion.html',
            original_file_name: 'motion.html',
            mime_type: 'text/html',
            file_size: 5000,
            checksum_sha256: 'b'.repeat(64),
            thumbnail_storage_key: null,
            external_url: null,
            entry_point: 'index.html',
            metadata_json: {},
          }],
        };
      }
      if (sql.includes('from screen_tags')) return { rows: [{ screen_id: 40, tag: 'motion' }] };
      if (sql.includes('from screen_branches')) return { rows: [] };
      if (sql.startsWith('select coalesce(max(release_number)')) {
        return { rows: [{ release_number: 1 }] };
      }
      if (sql.startsWith('insert into session_releases')) {
        insertedManifest = JSON.parse(params[6]);
        return {
          rows: [{
            id: '101',
            client_id: 7,
            session_id: 25,
            release_number: 1,
            manifest_json: insertedManifest,
            authorization_id: 301,
            validation_id: 201,
            published_by: 21,
            published_at: '2026-10-28T10:00:00.000Z',
          }],
        };
      }
      if (sql.startsWith("update sessions set status = 'published'")) return { rows: [{ id: 25 }], rowCount: 1 };
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
  assert.equal(insertedManifest.manifest_version, 2);
  assert.equal(insertedManifest.session.revision_no, 6);
  assert.equal(insertedManifest.documents.session_plan.document_id, 91);
  assert.equal(insertedManifest.documents.screen_script.revision_no, 3);
  assert.equal(insertedManifest.session.session_id, 25);
  assert.deepEqual(insertedManifest.screens[0].layout.layout_data_json, { regions: ['left', 'right'] });
  assert.equal(insertedManifest.screens[0].layout.version_no, 3);
  assert.equal(insertedManifest.screens[0].revision_no, 4);
  assert.equal(insertedManifest.screens[0].elements[0].resource_mapping.resource_version_id, 82);
  assert.equal(insertedManifest.screens[0].elements[0].resource_mapping.version_number, 2);
  assert.ok(calls.includes('commit'));
});

test('teacher current-release read comes only from session_releases and is tenant scoped', async (t) => {
  const originalQuery = pool.query;
  let executedSql = '';
  pool.query = async (text, params) => {
    const sql = normalizeSql(text);
    if (sql.includes('from session_releases')) {
      executedSql = sql;
      assert.deepEqual(params, [25, 7]);
      return { rows: [{
        id: '101',
        client_id: 7,
        session_id: 25,
        release_number: 1,
        manifest_json: { session: { session_id: 25, program_id: 4, program_school_id: 9 }, screens: [] },
        approved_by: 12,
        approved_at: '2026-10-28T09:30:00.000Z',
        published_by: 21,
        published_at: '2026-10-28T10:00:00.000Z',
      }] };
    }
    if (sql.includes('from school_memberships')) {
      assert.deepEqual(params, [30]);
      return { rows: [{ school_id: 9 }] };
    }
    throw new Error(`Unhandled query: ${sql}`);
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
  assert.equal('documents' in release.manifest, false);
  assert.equal('screen_scripts' in release.manifest, false);
  assert.equal('authorization_id' in release, false);
});

test('client admin lists the latest tenant releases and receives frozen Screen counts', async (t) => {
  const originalQuery = pool.query;
  pool.query = async (text, params) => {
    const sql = normalizeSql(text);
    assert.match(sql, /distinct on \(sr\.session_id\)/);
    assert.deepEqual(params, [7]);
    return { rows: [{
      id: 101,
      client_id: 7,
      session_id: 25,
      release_number: 2,
      published_at: '2026-11-04T10:00:00.000Z',
      manifest_json: {
        session: { title: 'Published Motion', program_id: 4, program_school_id: 9 },
        screens: [{ screen_id: 40 }, { screen_id: 41 }],
      },
      program_id: 4,
      program_name: 'Foundation',
      grade_number: 8,
      subject_id: 6,
      subject_name: 'Physics',
      chapter_id: 11,
      chapter_name: 'Motion',
      chapter_number: 2,
      topic_id: 12,
      topic_name: 'Speed',
      subtopic_id: 13,
      subtopic_name: 'Uniform motion',
    }] };
  };
  t.after(() => { pool.query = originalQuery; });

  const sessions = await listPublishedSessions({
    user: { id: 30, role: 'client_admin', client_id: 7 },
  });
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].session_title, 'Published Motion');
  assert.equal(sessions[0].screen_count, 2);
});

test('published Session history returns immutable releases newest first', async (t) => {
  const originalQuery = pool.query;
  pool.query = async (text, params) => {
    const sql = normalizeSql(text);
    assert.match(sql, /from session_releases/);
    assert.match(sql, /order by release_number desc/);
    assert.deepEqual(params, [25, 7]);
    return { rows: [
      { id: 102, client_id: 7, session_id: 25, release_number: 2, manifest_json: { screens: [{}, {}] }, published_by: 21, published_at: '2026-11-05T10:00:00Z' },
      { id: 101, client_id: 7, session_id: 25, release_number: 1, manifest_json: { screens: [{}] }, published_by: 20, published_at: '2026-11-04T10:00:00Z' },
    ] };
  };
  t.after(() => { pool.query = originalQuery; });

  const releases = await listPublishedSessionReleases({
    sessionId: 25,
    user: { id: 30, role: 'client_admin', client_id: 7 },
  });
  assert.deepEqual(releases.map((release) => release.release_number), [2, 1]);
  assert.deepEqual(releases.map((release) => release.screen_count), [2, 1]);
});

test('author player preview returns current draft screens without creating a release', async (t) => {
  const originalQuery = pool.query;
  const calls = [];
  pool.query = async (text) => {
    const sql = normalizeSql(text);
    calls.push(sql);
    if (sql.includes('from sessions se')) return { rows: [{
      id: 25, client_id: 7, subtopic_id: 8, title: 'Draft Motion', description: null,
      status: 'draft', revision_no: 7, program_id: 4, program_school_id: 9,
    }] };
    if (sql.includes('from screens sc')) return { rows: [{
      id: 40, client_id: 7, title: 'Current draft Screen', screen_number: 1,
      display_order: 0, creation_mode: 'blank', revision_no: 5,
      screen_settings_json: {}, layout_id: null,
    }] };
    if (sql.includes('from screen_elements se')) return { rows: [{
      screen_id: 40, screen_element_id: 60, element_key: 'image-1', slot_id: null,
      element_type: 'image', content_json: {}, position_json: {}, display_order: 0,
      mapping_id: 70, resource_id: 80, resource_version_id: 82, version_number: 2,
      resource_name: 'Motion image', resource_type: 'image', external_url: null,
      mime_type: 'image/png', width: 1200, height: 800,
    }] };
    if (sql.includes('from screen_tags')) return { rows: [{ screen_id: 40, tag: 'motion' }] };
    if (sql.includes('from screen_branches')) return { rows: [] };
    throw new Error(`Unhandled query: ${sql}`);
  };
  t.after(() => { pool.query = originalQuery; });

  const preview = await getSessionPlayerPreview({
    sessionId: 25,
    user: { id: 21, role: 'content_authorizer', client_id: 7 },
  });

  assert.equal(preview.release_number, 0);
  assert.equal(preview.manifest.session.title, 'Draft Motion');
  assert.equal(preview.manifest.screens[0].title, 'Current draft Screen');
  assert.equal(preview.manifest.screens[0].elements[0].resource_mapping.resource_version_id, 82);
  assert.equal(calls.some((sql) => sql.includes('insert into session_releases')), false);
  assert.equal(calls[0].includes('for update'), false);
});

test('published viewer response excludes Plan, Screen Script and workflow metadata', async (t) => {
  const originalQuery = pool.query;
  pool.query = async (text, params) => {
    const sql = normalizeSql(text);
    assert.match(sql, /from session_releases/);
    assert.deepEqual(params, [25, 7, 2]);
    return { rows: [{
      id: 101,
      client_id: 7,
      session_id: 25,
      release_number: 2,
      published_at: '2026-11-04T10:00:00.000Z',
      manifest_json: {
        session: { session_id: 25, title: 'Published Motion', program_id: 4 },
        documents: { session_plan: { document_id: 1 }, screen_script: { document_id: 2 } },
        screen_scripts: [{ script_revision_id: 3, content: { private: true } }],
        authorization: { authorization_id: 4 },
        screens: [{ screen_id: 40, title: 'Motion' }],
      },
    }] };
  };
  t.after(() => { pool.query = originalQuery; });

  const release = await getPublishedReleaseByNumber({
    sessionId: 25,
    releaseNumber: 2,
    user: { id: 30, role: 'client_admin', client_id: 7 },
  });
  assert.equal(release.manifest.screens.length, 1);
  assert.equal('documents' in release.manifest, false);
  assert.equal('screen_scripts' in release.manifest, false);
  assert.equal('authorization' in release.manifest, false);
});

test('published Resource access is limited to versions pinned in the authorized release', async (t) => {
  const originalQuery = pool.query;
  pool.query = async () => ({ rows: [{
    id: 101,
    client_id: 7,
    session_id: 25,
    release_number: 2,
    manifest_json: {
      session: { session_id: 25, title: 'Published Motion', program_id: 4 },
      screens: [{
        screen_id: 40,
        elements: [{ resource_mapping: { resource_version_id: 82 } }],
      }],
    },
  }] });
  t.after(() => { pool.query = originalQuery; });
  const user = { id: 30, role: 'client_admin', client_id: 7 };

  const allowed = await assertPinnedPublishedResourceAccess({ releaseId: 101, versionId: 82, user });
  assert.equal(allowed.versionId, 82);
  await assert.rejects(
    assertPinnedPublishedResourceAccess({ releaseId: 101, versionId: 83, user }),
    (error) => error.status === 403,
  );
});

test('published teaching materials expose Curriculum and a pinned Session Plan without Screen Scripts', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params) => {
    const sql = normalizeSql(text);
    if (sql.includes('from school_memberships')) {
      assert.deepEqual(params, [30, ['teacher']]);
      return { rows: [{ school_id: 9 }] };
    }
    if (sql.includes('from question_bank_school_assignments')) {
      assert.deepEqual(params, [[9]]);
      return { rows: [{ program_id: 4 }] };
    }
    if (sql.includes('from subtopics st')) {
      assert.deepEqual(params, [6]);
      return { rows: [{
        chapter_id: 14,
        document_id: 71,
        revision_no: 2,
        original_file_name: 'Chapter Curriculum.docx',
        content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size_bytes: 2048,
      }] };
    }
    assert.match(sql, /from session_releases/);
    assert.deepEqual(params, [101, 7]);
    return { rows: [{
      id: 101,
      client_id: 7,
      session_id: 25,
      release_number: 2,
      manifest_json: {
        session: { session_id: 25, program_id: 4, subtopic_id: 6 },
        documents: {
          session_plan: {
            document_id: 91,
            revision_no: 3,
            source_mode: 'upload',
            storage_key: 'sessions/25/session_plan/revision-3.docx',
            original_file_name: 'Approved Session Plan.docx',
            structured_content: { rows: [{ screen_mapped: 'Screen 1', pedagogy: 'Inquiry' }] },
          },
        },
        screen_scripts: [{
          screen_id: 40,
          revision_no: 5,
          content: { teacher_narration: 'Ask learners to predict.' },
        }],
        screens: [{ screen_id: 40, screen_number: 1, title: 'Mirror Mystery' }],
      },
    }] };
  };
  t.after(() => { pool.query = originalQuery; });

  const materials = await getPublishedTeachingMaterials({
    releaseId: 101,
    user: { id: 30, role: 'teacher', client_id: 7 },
  });

  assert.equal(materials.session_plan.revision_no, 3);
  assert.equal(materials.session_plan.content.rows[0].pedagogy, 'Inquiry');
  assert.equal(materials.curriculum.chapter_id, 14);
  assert.equal(materials.curriculum.original_file_name, 'Chapter Curriculum.docx');
  assert.equal('screen_scripts' in materials, false);
  assert.equal('storage_key' in materials.session_plan, false);
  assert.equal(materials.session_plan.original_file_name, 'Approved Session Plan.docx');
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
