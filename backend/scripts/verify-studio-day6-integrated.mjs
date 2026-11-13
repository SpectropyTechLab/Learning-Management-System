import assert from 'node:assert/strict';
import AdmZip from 'adm-zip';

process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.JWT_SECRET ||= 'local-day6-integrated-verification-secret';

if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is required for the real local Storage verification');
}
const { default: pool } = await import('../config/db.js');
const { default: supabase } = await import('../config/supabaseClient.js');
const {
  getCurrentTeacherRelease,
  publishSessionRelease,
} = await import('../services/studioReleases.service.js');
const { createResource } = await import('../services/studioResources.service.js');
const {
  createRuntimeLaunch,
  loadRuntimeAsset,
} = await import('../services/studioResourceRuntime.service.js');
const { serveRuntimeAsset } = await import('../controllers/studioResourceRuntime.controller.js');

const pass = (message) => console.log(`PASS ${message}`);
const originalConnect = pool.connect.bind(pool);
const originalQuery = pool.query.bind(pool);
const client = await originalConnect();
let activeSavepoint = null;
let savepointNumber = 0;
const cleanupStorageKeys = new Set();

const normalizedSql = (value) => String(value).replace(/\s+/g, ' ').trim().toLowerCase();
const transactionalClient = {
  async query(text, params) {
    const normalized = normalizedSql(text);
    if (normalized === 'begin') {
      savepointNumber += 1;
      activeSavepoint = `day6_service_${savepointNumber}`;
      return client.query(`SAVEPOINT ${activeSavepoint}`);
    }
    if (normalized === 'commit') {
      const result = await client.query(`RELEASE SAVEPOINT ${activeSavepoint}`);
      activeSavepoint = null;
      return result;
    }
    if (normalized === 'rollback') {
      const result = await client.query(`ROLLBACK TO SAVEPOINT ${activeSavepoint}`);
      await client.query(`RELEASE SAVEPOINT ${activeSavepoint}`);
      activeSavepoint = null;
      return result;
    }
    return client.query(text, params);
  },
  release() {},
};

const insertCurriculum = async (suffix, clientId, schoolId) => {
  const board = (await client.query(
    'INSERT INTO boards (client_id, name, code) VALUES ($1, $2, $3) RETURNING id',
    [clientId, `Board ${suffix}`, `B-${suffix}`],
  )).rows[0];
  const program = (await client.query(
    `INSERT INTO programs (client_id, board_id, school_id, name, code)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [clientId, board.id, schoolId, `Program ${suffix}`, `P-${suffix}`],
  )).rows[0];
  const grade = (await client.query(
    "INSERT INTO grades (program_id, grade_number, name) VALUES ($1, 8, 'Grade 8') RETURNING id",
    [program.id],
  )).rows[0];
  const subject = (await client.query(
    `INSERT INTO subjects (client_id, grade_id, name, code)
     VALUES ($1, $2, 'Mathematics', $3) RETURNING id`,
    [clientId, grade.id, `M-${suffix}`],
  )).rows[0];
  const chapter = (await client.query(
    "INSERT INTO chapters (subject_id, name, chapter_number) VALUES ($1, 'Fractions', 1) RETURNING id",
    [subject.id],
  )).rows[0];
  const topic = (await client.query(
    `INSERT INTO topics (chapter_id, name, topic_number)
     VALUES ($1, 'Equivalent fractions', 1) RETURNING id`,
    [chapter.id],
  )).rows[0];
  const subtopic = (await client.query(
    "INSERT INTO subtopics (topic_id, name) VALUES ($1, 'Visual equivalence') RETURNING id",
    [topic.id],
  )).rows[0];
  return { program, subtopic };
};

const addRuntimeStorageKeys = (version) => {
  if (version.storage_key) cleanupStorageKeys.add(version.storage_key);
  const runtime = version.metadata_json?.runtime;
  if (runtime?.package_prefix && Array.isArray(runtime.files)) {
    for (const file of runtime.files) {
      cleanupStorageKeys.add(`${runtime.package_prefix}/${file.path}`);
    }
  }
};

const makeZip = () => {
  const zip = new AdmZip();
  zip.addFile(
    'index.html',
    Buffer.from('<link rel="stylesheet" href="style.css"><h1 id="result">ZIP runtime</h1><script src="app.js"></script>'),
  );
  zip.addFile('style.css', Buffer.from('#result { color: green; }'));
  zip.addFile('app.js', Buffer.from('document.querySelector("#result").dataset.ready = "true";'));
  return {
    originalname: 'day6-browser-package.zip',
    mimetype: 'application/zip',
    buffer: zip.toBuffer(),
  };
};

try {
  await client.query('BEGIN');
  pool.connect = async () => transactionalClient;
  pool.query = (text, params) => client.query(text, params);

  const suffix = `${Date.now().toString(36).slice(-8)}${Math.floor(Math.random() * 1000)
    .toString().padStart(3, '0')}`;
  const tenant = (await client.query(
    'INSERT INTO clients (name, slug) VALUES ($1, $2) RETURNING id',
    [`Studio Day 6 integrated ${suffix}`, `studio-day6-integrated-${suffix}`],
  )).rows[0];
  const school = (await client.query(
    `INSERT INTO schools (client_id, school_code, name)
     VALUES ($1, $2, $3) RETURNING id`,
    [tenant.id, `S-${suffix}`, `School ${suffix}`],
  )).rows[0];
  const users = (await client.query(
    `INSERT INTO users (email, full_name, password_hash, role, client_id)
     VALUES
       ($1, 'Day 6 Author', 'test-only', 'content_authorizer', $4),
       ($2, 'Day 6 Teacher', 'test-only', 'teacher', $4),
       ($3, 'Day 6 Other Teacher', 'test-only', 'teacher', $4)
     RETURNING id, role`,
    [
      `day6-author-${suffix}@example.test`,
      `day6-teacher-${suffix}@example.test`,
      `day6-other-${suffix}@example.test`,
      tenant.id,
    ],
  )).rows;
  const author = { ...users[0], client_id: tenant.id };
  const teacher = { ...users[1], client_id: tenant.id };
  const otherTeacher = { ...users[2], client_id: tenant.id };
  await client.query(
    `INSERT INTO school_memberships (school_id, user_id, role_scope, is_primary)
     VALUES ($1, $2, 'teacher', TRUE)`,
    [school.id, teacher.id],
  );
  const { program, subtopic } = await insertCurriculum(suffix, tenant.id, school.id);

  const session = (await client.query(
    `INSERT INTO sessions (
       client_id, subtopic_id, session_number, title, status,
       revision_no, approved_by, approved_at, created_by
     ) VALUES ($1, $2, 1, 'Immutable release fixture', 'approved', 1, $3, NOW(), $3)
     RETURNING id, revision_no`,
    [tenant.id, subtopic.id, author.id],
  )).rows[0];
  const documents = (await client.query(
    `INSERT INTO session_documents (
       session_id, document_type, revision_no, source_mode,
       manual_content, is_current, created_by
     ) VALUES
       ($1, 'session_plan', 1, 'manual', '{"title":"Plan revision 1"}'::jsonb, TRUE, $2),
       ($1, 'screen_script', 1, 'manual', '{"title":"Script revision 1"}'::jsonb, TRUE, $2)
     RETURNING id, document_type`,
    [session.id, author.id],
  )).rows;
  const documentByType = Object.fromEntries(documents.map((document) => [document.document_type, document]));
  const screen = (await client.query(
    `INSERT INTO screens (
       client_id, session_id, title, screen_number, creation_mode,
       display_order, revision_no, created_by
     ) VALUES ($1, $2, 'Published screen revision 1', 1, 'blank', 0, 1, $3)
     RETURNING id, screen_number, revision_no`,
    [tenant.id, session.id, author.id],
  )).rows[0];
  await client.query(
    "INSERT INTO screen_tags (screen_id, tag) VALUES ($1, 'fractions'), ($1, 'published')",
    [screen.id],
  );
  const validation = (await client.query(
    `INSERT INTO session_validations (
       session_id, session_revision_no, session_plan_document_id,
       screen_script_document_id, screen_revisions_json, is_valid,
       validation_errors_json, validated_by
     ) VALUES ($1, 1, $2, $3, $4::jsonb, TRUE, '[]'::jsonb, $5)
     RETURNING id`,
    [
      session.id,
      documentByType.session_plan.id,
      documentByType.screen_script.id,
      JSON.stringify([{
        screen_id: screen.id,
        screen_number: screen.screen_number,
        revision_no: screen.revision_no,
      }]),
      author.id,
    ],
  )).rows[0];
  await client.query(
    `INSERT INTO session_authorizations (
       session_id, validation_id, decision, authorized_by
     ) VALUES ($1, $2, 'authorized', $3)`,
    [session.id, validation.id, author.id],
  );

  const release = await publishSessionRelease({ sessionId: session.id, user: author });
  assert.equal(release.release_number, 1);
  assert.equal(release.manifest.session.revision_no, 1);
  assert.equal(release.manifest.screens[0].title, 'Published screen revision 1');
  assert.equal(release.manifest.session.program_id, program.id);
  pass('real approved Session publishes an immutable revision-pinned release');

  const teacherRelease = await getCurrentTeacherRelease({ sessionId: session.id, user: teacher });
  assert.equal(Number(teacherRelease.id), Number(release.id));
  assert.equal(teacherRelease.manifest.screens[0].title, 'Published screen revision 1');
  await assert.rejects(
    getCurrentTeacherRelease({ sessionId: session.id, user: otherTeacher }),
    (error) => error?.status === 403,
  );
  pass('real teacher membership permits the release and an unassigned teacher is denied');

  await client.query(
    `UPDATE sessions SET status = 'draft', revision_no = revision_no + 1 WHERE id = $1`,
    [session.id],
  );
  await client.query(
    "UPDATE screens SET title = 'Draft screen revision 2', revision_no = revision_no + 1 WHERE id = $1",
    [screen.id],
  );
  const retainedRelease = await getCurrentTeacherRelease({ sessionId: session.id, user: teacher });
  assert.equal(retainedRelease.manifest.screens[0].title, 'Published screen revision 1');
  pass('draft edits do not rewrite the teacher-visible published release');

  const html = await createResource({
    user: author,
    body: { name: 'Day 6 HTML', resource_type: 'html' },
    file: {
      originalname: 'day6-single.html',
      mimetype: 'text/html',
      buffer: Buffer.from('<h1 id="result">HTML runtime</h1><script>document.querySelector("#result").dataset.ready="true";</script>'),
    },
  });
  addRuntimeStorageKeys(html.latest_version);
  const htmlLaunch = await createRuntimeLaunch({
    versionId: html.latest_version.id,
    user: author,
  });
  const htmlAsset = await loadRuntimeAsset({
    launchToken: decodeURIComponent(htmlLaunch.launch_url.split('/')[4]),
    requestedPath: 'index.html',
  });
  assert.match(htmlAsset.buffer.toString(), /HTML runtime/);
  pass('real local Storage upload and signed launch serve the single HTML package');

  const zip = await createResource({
    user: author,
    body: { name: 'Day 6 browser ZIP', resource_type: 'zip' },
    file: makeZip(),
  });
  addRuntimeStorageKeys(zip.latest_version);
  const zipLaunch = await createRuntimeLaunch({
    versionId: zip.latest_version.id,
    user: author,
  });
  const token = decodeURIComponent(zipLaunch.launch_url.split('/')[4]);
  const entryAsset = await loadRuntimeAsset({ launchToken: token, requestedPath: 'index.html' });
  const styleAsset = await loadRuntimeAsset({ launchToken: token, requestedPath: 'style.css' });
  const scriptAsset = await loadRuntimeAsset({ launchToken: token, requestedPath: 'app.js' });
  assert.match(entryAsset.buffer.toString(), /ZIP runtime/);
  assert.match(styleAsset.buffer.toString(), /color: green/);
  assert.match(scriptAsset.buffer.toString(), /dataset\.ready/);

  const headers = new Map();
  const response = {
    removeHeader(name) { headers.delete(name); },
    setHeader(name, value) { headers.set(name, value); },
    status(code) { this.statusCode = code; return this; },
    send(value) { this.body = value; return this; },
    json(value) { this.body = value; return this; },
  };
  await serveRuntimeAsset({ params: { launchToken: token, 0: 'index.html' } }, response);
  assert.equal(response.statusCode, 200);
  assert.match(headers.get('Content-Security-Policy'), /sandbox allow-scripts/);
  assert.match(headers.get('Content-Security-Policy'), /form-action 'none'/);
  assert.equal(headers.get('Referrer-Policy'), 'no-referrer');
  pass('real browser ZIP assets load from Storage with the isolation policy and controls contract');
} finally {
  if (cleanupStorageKeys.size > 0) {
    const { error } = await supabase.storage
      .from(process.env.STUDIO_RESOURCES_BUCKET || 'studio-resources')
      .remove([...cleanupStorageKeys]);
    if (error) console.error(`Storage cleanup warning: ${error.message}`);
  }
  try { await client.query('ROLLBACK'); } catch { /* transaction was unavailable */ }
  pool.connect = originalConnect;
  pool.query = originalQuery;
  client.release();
  await pool.end();
}
