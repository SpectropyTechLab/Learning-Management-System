import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import pool from '../config/db.js';
import supabase from '../config/supabaseClient.js';
import {
  createLayout, updateLayout, listLayouts, createScreen, validateLayoutDefinition,
} from '../services/studioLayouts.service.js';
import {
  uploadSessionPlan, uploadScreenScript, downloadSessionPlan, downloadScreenScript,
} from '../services/studioDocuments.service.js';

const pass = (message) => console.log(`PASS ${message}`);
const created = {};

if (['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) {
  pool.options.ssl = false;
}

const layoutBody = (clientId) => ({
  client_id: clientId,
  layout_key: 'day4-verification',
  name: 'Day 4 verification layout',
  canvas_width: 1920,
  canvas_height: 1080,
  safe_margin: 90,
  layout_data_json: {
    slots: [
      { id: 'title', label: 'Title', region: 'header', allowed: ['title'], bounds: { x: 90, y: 60, width: 1740, height: 150 } },
      { id: 'content', label: 'Content', region: 'content', allowed: ['text', 'visual'], bounds: { x: 90, y: 250, width: 1740, height: 680 } },
    ],
  },
});

try {
  const migration = await pool.query(
    `SELECT version FROM supabase_migrations.schema_migrations WHERE version = '20261028180000'`
  );
  assert.equal(migration.rows.length, 1);
  const legacyColumns = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND ((table_name = 'sessions' AND column_name LIKE 'session_plan%')
         OR (table_name = 'screens' AND column_name LIKE 'screen_script%'))`
  );
  assert.equal(legacyColumns.rows.length, 0);
  const bucket = await pool.query(`SELECT public FROM storage.buckets WHERE id = 'sessions-scripts-plans'`);
  assert.equal(bucket.rows[0]?.public, false);
  pass('Day 4 migration is registered, document storage is private and legacy document columns are absent');

  const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  created.client = (await pool.query(
    `INSERT INTO clients (name, slug) VALUES ($1, $2) RETURNING id`,
    [`Studio Day 4 ${suffix}`, `studio-day4-${suffix}`]
  )).rows[0];
  created.board = (await pool.query(
    `INSERT INTO boards (client_id, name, code) VALUES ($1, $2, $3) RETURNING id`,
    [created.client.id, `Board ${suffix}`, `B-${suffix}`]
  )).rows[0];
  created.program = (await pool.query(
    `INSERT INTO programs (client_id, board_id, name, code) VALUES ($1, $2, $3, $4) RETURNING id`,
    [created.client.id, created.board.id, `Program ${suffix}`, `P-${suffix}`]
  )).rows[0];
  created.grade = (await pool.query(
    `INSERT INTO grades (program_id, grade_number, name) VALUES ($1, 8, 'Grade 8') RETURNING id`,
    [created.program.id]
  )).rows[0];
  created.subject = (await pool.query(
    `INSERT INTO subjects (client_id, grade_id, name, code) VALUES ($1, $2, 'Mathematics', $3) RETURNING id`,
    [created.client.id, created.grade.id, `M-${suffix}`]
  )).rows[0];
  created.chapter = (await pool.query(
    `INSERT INTO chapters (subject_id, name, chapter_number) VALUES ($1, 'Fractions', 1) RETURNING id`,
    [created.subject.id]
  )).rows[0];
  created.topic = (await pool.query(
    `INSERT INTO topics (chapter_id, name, topic_number) VALUES ($1, 'Equivalent fractions', 1) RETURNING id`,
    [created.chapter.id]
  )).rows[0];
  created.subtopic = (await pool.query(
    `INSERT INTO subtopics (topic_id, name) VALUES ($1, 'Visual equivalence') RETURNING id`,
    [created.topic.id]
  )).rows[0];
  created.session = (await pool.query(
    `INSERT INTO sessions (client_id, subtopic_id, session_number, title)
     VALUES ($1, $2, 1, 'Day 4 session') RETURNING id`,
    [created.client.id, created.subtopic.id]
  )).rows[0];

  const admin = { id: null, role: 'super_admin', client_id: null };
  const first = await createLayout({ body: layoutBody(created.client.id), user: admin });
  const second = await updateLayout({
    layoutId: first.id,
    body: { name: 'Day 4 verification layout v2' },
    user: admin,
  });
  assert.equal(first.version_no, 1);
  assert.equal(second.version_no, 2);
  assert.equal(first.layout_key, second.layout_key);
  const history = await listLayouts({
    user: admin,
    query: { client_id: String(created.client.id), include_history: 'true' },
  });
  assert.equal(history.filter((layout) => layout.layout_key === first.layout_key).length, 2);
  pass('layout create, immutable update/version and history listing work against local Supabase');

  const blank = await createScreen({
    sessionId: created.session.id,
    body: { creation_mode: 'blank' },
    user: admin,
  });
  assert.equal(blank.creation_mode, 'blank');
  assert.equal(blank.layout_id, null);
  assert.equal(blank.elements.length, 0);
  const persisted = await pool.query(
    `SELECT s.creation_mode, s.layout_id, COUNT(se.id)::integer AS element_count
     FROM screens s
     LEFT JOIN screen_elements se ON se.screen_id = s.id
     WHERE s.id = $1
     GROUP BY s.id`,
    [blank.id]
  );
  assert.deepEqual(persisted.rows[0], { creation_mode: 'blank', layout_id: null, element_count: 0 });
  pass('blank-screen API persists no layout and no preset elements');

  const invalid = layoutBody(created.client.id);
  invalid.layout_data_json.slots[1].allowed = ['invalid-type'];
  assert.throws(() => validateLayoutDefinition(invalid), /unsupported element type/);
  pass('invalid layout definitions are rejected before persistence');

  const firstPlanBytes = Buffer.from('Day 4 original Session Plan bytes');
  const replacementPlanBytes = Buffer.from('Day 4 replacement Session Plan bytes');
  const scriptBytes = Buffer.from('Day 4 original Screen Script bytes');
  const firstPlan = await uploadSessionPlan({
    sessionId: created.session.id,
    user: admin,
    file: { buffer: firstPlanBytes, originalname: 'Session Plan v1.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  });
  const replacementPlan = await uploadSessionPlan({
    sessionId: created.session.id,
    user: admin,
    file: { buffer: replacementPlanBytes, originalname: 'Session Plan final.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  });
  const script = await uploadScreenScript({
    sessionId: created.session.id,
    user: admin,
    file: { buffer: scriptBytes, originalname: 'Screen Script.pdf', mimetype: 'application/pdf' },
  });
  assert.equal(firstPlan.revision_no, 1);
  assert.equal(replacementPlan.revision_no, 2);
  assert.equal(script.revision_no, 1);
  const documents = await pool.query(
    `SELECT storage_key, document_type, revision_no, is_current
     FROM session_documents WHERE session_id = $1 ORDER BY document_type, revision_no`,
    [created.session.id]
  );
  created.storageKeys = documents.rows.map((row) => row.storage_key).filter(Boolean);
  assert.equal(documents.rows.length, 3);
  assert.equal(documents.rows.filter((row) => row.is_current).length, 2);
  const downloadedPlan = await downloadSessionPlan({ sessionId: created.session.id, user: admin });
  const downloadedScript = await downloadScreenScript({ sessionId: created.session.id, user: admin });
  assert.deepEqual(downloadedPlan.bytes, replacementPlanBytes);
  assert.equal(downloadedPlan.fileName, 'Session Plan final.docx');
  assert.equal(downloadedPlan.sha256, createHash('sha256').update(replacementPlanBytes).digest('hex'));
  assert.deepEqual(downloadedScript.bytes, scriptBytes);
  assert.equal(downloadedScript.contentType, 'application/pdf');
  pass('real private Storage upload, replacement and protected download preserve byte-identical originals and revision history');
} finally {
  if (created.client?.id) {
    if (created.storageKeys?.length) {
      const { error } = await supabase.storage.from('sessions-scripts-plans').remove(created.storageKeys);
      if (error) throw error;
    }
    await pool.query('DELETE FROM session_documents WHERE session_id = $1', [created.session?.id]);
    await pool.query('DELETE FROM layouts WHERE client_id = $1', [created.client.id]);
    await pool.query('DELETE FROM sessions WHERE client_id = $1', [created.client.id]);
    await pool.query('DELETE FROM subtopics WHERE topic_id = $1', [created.topic?.id]);
    await pool.query('DELETE FROM topics WHERE chapter_id = $1', [created.chapter?.id]);
    await pool.query('DELETE FROM chapters WHERE subject_id = $1', [created.subject?.id]);
    await pool.query('DELETE FROM subjects WHERE client_id = $1', [created.client.id]);
    await pool.query('DELETE FROM grades WHERE program_id = $1', [created.program?.id]);
    await pool.query('DELETE FROM programs WHERE client_id = $1', [created.client.id]);
    await pool.query('DELETE FROM boards WHERE client_id = $1', [created.client.id]);
    await pool.query('DELETE FROM clients WHERE id = $1', [created.client.id]);
  }
  await pool.end();
}

console.log('Day 4 API verification passed. Verification data was removed.');
