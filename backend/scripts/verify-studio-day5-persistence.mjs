import assert from 'node:assert/strict';
import pool from '../config/db.js';
import supabase from '../config/supabaseClient.js';
import { createScreen } from '../services/studioLayouts.service.js';
import { uploadSessionPlan, uploadScreenScript } from '../services/studioDocuments.service.js';
import { createResource, createResourceVersion, getResourceUsages } from '../services/studioResources.service.js';
import { getScreen, saveScreen, reorderScreens } from '../services/studioScreens.service.js';
import { submitSession, reviewSession, publishSession } from '../services/studioSessionWorkflow.service.js';

const pass = (message) => console.log(`PASS ${message}`);
const created = { documentKeys: [], resourceKeys: [] };
const admin = { id: null, role: 'super_admin', client_id: null };

if (['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) {
  pool.options.ssl = false;
}

const currentSessionRevision = async (sessionId) => Number((await pool.query(
  'SELECT revision_no FROM sessions WHERE id = $1', [sessionId]
)).rows[0].revision_no);

try {
  const migration = await pool.query(
    `SELECT version FROM supabase_migrations.schema_migrations WHERE version = '20261029100000'`
  );
  assert.equal(migration.rows.length, 1);
  for (const table of ['session_validations', 'session_authorizations']) {
    const result = await pool.query('SELECT to_regclass($1) AS name', [`public.${table}`]);
    assert.equal(result.rows[0].name, table);
  }
  const resourceBucket = await pool.query(`SELECT public FROM storage.buckets WHERE id = 'studio-resources'`);
  assert.equal(resourceBucket.rows[0]?.public, false);
  pass('Day 5 migration is registered with exact-revision evidence tables and private Resource storage');

  const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  created.client = (await pool.query(
    'INSERT INTO clients (name, slug) VALUES ($1, $2) RETURNING id',
    [`Studio Day 5 ${suffix}`, `studio-day5-${suffix}`]
  )).rows[0];
  created.board = (await pool.query(
    'INSERT INTO boards (client_id, name, code) VALUES ($1, $2, $3) RETURNING id',
    [created.client.id, `Board ${suffix}`, `B-${suffix}`]
  )).rows[0];
  created.program = (await pool.query(
    'INSERT INTO programs (client_id, board_id, name, code) VALUES ($1, $2, $3, $4) RETURNING id',
    [created.client.id, created.board.id, `Program ${suffix}`, `P-${suffix}`]
  )).rows[0];
  created.grade = (await pool.query(
    "INSERT INTO grades (program_id, grade_number, name) VALUES ($1, 8, 'Grade 8') RETURNING id",
    [created.program.id]
  )).rows[0];
  created.subject = (await pool.query(
    "INSERT INTO subjects (client_id, grade_id, name, code) VALUES ($1, $2, 'Mathematics', $3) RETURNING id",
    [created.client.id, created.grade.id, `M-${suffix}`]
  )).rows[0];
  created.chapter = (await pool.query(
    "INSERT INTO chapters (subject_id, name, chapter_number) VALUES ($1, 'Fractions', 1) RETURNING id",
    [created.subject.id]
  )).rows[0];
  created.topic = (await pool.query(
    "INSERT INTO topics (chapter_id, name, topic_number) VALUES ($1, 'Equivalent fractions', 1) RETURNING id",
    [created.chapter.id]
  )).rows[0];
  created.subtopic = (await pool.query(
    "INSERT INTO subtopics (topic_id, name) VALUES ($1, 'Visual equivalence') RETURNING id",
    [created.topic.id]
  )).rows[0];
  created.session = (await pool.query(
    `INSERT INTO sessions (client_id, subtopic_id, session_number, title)
     VALUES ($1, $2, 1, 'Day 5 complete session') RETURNING id`,
    [created.client.id, created.subtopic.id]
  )).rows[0];
  created.incompleteSession = (await pool.query(
    `INSERT INTO sessions (client_id, subtopic_id, session_number, title)
     VALUES ($1, $2, 2, 'Day 5 missing documents') RETURNING id`,
    [created.client.id, created.subtopic.id]
  )).rows[0];

  const firstScreen = await createScreen({
    sessionId: created.session.id, body: { creation_mode: 'blank', title: 'Explore' }, user: admin,
  });
  const secondScreen = await createScreen({
    sessionId: created.session.id, body: { creation_mode: 'blank', title: 'Practice' }, user: admin,
  });
  await createScreen({
    sessionId: created.incompleteSession.id, body: { creation_mode: 'blank', title: 'Incomplete' }, user: admin,
  });

  await assert.rejects(
    submitSession({ sessionId: created.incompleteSession.id, user: admin }),
    (error) => error?.status === 422 && error?.details?.some(({ code }) => code === 'SESSION_PLAN_MISSING') &&
      error?.details?.some(({ code }) => code === 'SCREEN_SCRIPT_MISSING')
  );
  pass('missing Session Plan and Screen Script block validation and publication workflow entry');

  const resourceBytes = Buffer.from('day-5-resource-version-one');
  const resource = await createResource({
    user: admin,
    body: {
      client_id: created.client.id,
      name: 'Fraction bars',
      resource_type: 'image',
      width: 1280,
      height: 720,
      metadata_json: { alt_text: 'Equivalent fraction bars' },
    },
    file: { buffer: resourceBytes, originalname: 'fraction-bars.png', mimetype: 'image/png' },
  });
  created.resource = resource;
  created.resourceKeys.push(resource.latest_version.storage_key);
  const secondVersion = await createResourceVersion({
    resourceId: resource.id,
    user: admin,
    body: { width: 1920, height: 1080, metadata_json: { alt_text: 'Updated fraction bars' } },
    file: { buffer: Buffer.from('day-5-resource-version-two'), originalname: 'fraction-bars-v2.png', mimetype: 'image/png' },
  });
  created.resourceKeys.push(secondVersion.version.storage_key);
  assert.equal(secondVersion.version.version_number, 2);
  pass('reusable Resource identity has immutable versions and media metadata');

  const firstSaved = await saveScreen({
    screenId: firstScreen.id,
    user: admin,
    body: {
      revision_no: firstScreen.revision_no,
      title: 'Explore equivalent fractions',
      screen_settings: { background: '#ffffff' },
      tags: ['Fractions', 'Visual'],
      elements: [
        {
          id: 'drawing-layer', type: 'workspace',
          content: { drawing: { tool: 'pen', strokes: [{ color: '#123456', points: [[10, 20], [30, 40]] }] } },
          position: { x: 0, y: 0, width: 1920, height: 1080 },
        },
        {
          id: 'visual-primary', type: 'visual', content: { caption: 'Fraction bars' }, position: { x: 100, y: 200 },
          resource: { resource_id: resource.id, resource_version_id: resource.latest_version.id, usage: { role: 'primary' } },
        },
        {
          id: 'visual-reference', type: 'visual', content: { caption: 'Reference bars' }, position: { x: 900, y: 200 },
          resource: { resource_id: resource.id, resource_version_id: secondVersion.version.id, usage: { role: 'reference' } },
        },
      ],
    },
  });
  const secondSaved = await saveScreen({
    screenId: secondScreen.id,
    user: admin,
    body: {
      revision_no: secondScreen.revision_no,
      title: 'Practice equivalent fractions',
      tags: ['Fractions', 'Practice'],
      elements: [{
        id: 'visual-practice', type: 'visual', content: { prompt: 'Compare' }, position: { x: 200, y: 200 },
        resource: { resource_id: resource.id, resource_version_id: secondVersion.version.id, usage: { role: 'practice' } },
      }],
    },
  });
  const reopened = await getScreen({ screenId: firstScreen.id, user: admin });
  assert.deepEqual(reopened.elements[0].content.drawing.strokes[0].points[1], [30, 40]);
  assert.equal(reopened.elements.length, 3);
  assert.equal(firstSaved.revision_no, 2);
  assert.equal(secondSaved.revision_no, 2);
  const usages = await getResourceUsages({ resourceId: resource.id, user: admin });
  assert.equal(usages.placement_count, 3);
  assert.equal(usages.distinct_screen_count, 2);
  pass('saved Screens reopen with editable drawing data and transactional Resource placements');
  pass('reverse usage distinguishes three placements from two distinct Screens');

  const revisionBeforeReorder = await currentSessionRevision(created.session.id);
  const reordered = await reorderScreens({
    sessionId: created.session.id,
    user: admin,
    body: { session_revision_no: revisionBeforeReorder, screen_ids: [secondScreen.id, firstScreen.id] },
  });
  assert.equal(reordered.session_revision_no, revisionBeforeReorder + 1);
  const orderRows = await pool.query(
    'SELECT id FROM screens WHERE session_id = $1 ORDER BY display_order', [created.session.id]
  );
  assert.deepEqual(orderRows.rows.map(({ id }) => id), [secondScreen.id, firstScreen.id]);
  pass('Screen reorder uses optimistic Session revision protection and persists the requested order');

  const plan = await uploadSessionPlan({
    sessionId: created.session.id, user: admin,
    file: { buffer: Buffer.from('Day 5 Session Plan'), originalname: 'day5-plan.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  });
  const script = await uploadScreenScript({
    sessionId: created.session.id, user: admin,
    file: { buffer: Buffer.from('Day 5 Screen Script'), originalname: 'day5-script.pdf', mimetype: 'application/pdf' },
  });
  created.documentKeys.push(plan.storage_key, script.storage_key);

  const validated = await submitSession({ sessionId: created.session.id, user: admin });
  assert.equal(validated.workflow_state, 'validated');
  assert.equal(validated.validation.exact_revision.session_plan_revision_no, 1);
  assert.equal(validated.validation.exact_revision.screen_script_revision_no, 1);
  const authorized = await reviewSession({
    sessionId: created.session.id, decision: 'approved', comment: 'Academic review complete', user: admin,
  });
  assert.equal(authorized.workflow_state, 'authorized');

  await saveScreen({
    screenId: firstScreen.id,
    user: admin,
    body: {
      revision_no: reopened.revision_no,
      title: 'Explore equivalent fractions revised',
      screen_settings: reopened.screen_settings_json,
      tags: reopened.tags,
      elements: reopened.elements,
    },
  });
  const invalidated = await pool.query(
    `SELECT invalidated_at FROM session_authorizations
     WHERE session_id = $1 AND id = $2`,
    [created.session.id, authorized.authorization.id]
  );
  assert.ok(invalidated.rows[0].invalidated_at);
  await assert.rejects(
    publishSession({ sessionId: created.session.id, user: admin }),
    (error) => error?.status === 409 && /Only approved/.test(error.message)
  );
  const revalidated = await submitSession({ sessionId: created.session.id, user: admin });
  assert.equal(revalidated.workflow_state, 'validated');
  const reauthorized = await reviewSession({
    sessionId: created.session.id, decision: 'approved', comment: 'Revised academic content approved', user: admin,
  });
  assert.equal(reauthorized.workflow_state, 'authorized');
  const published = await publishSession({ sessionId: created.session.id, user: admin });
  assert.equal(published.workflow_state, 'published');
  const evidence = await pool.query(
    `SELECT sv.session_revision_no, sd_plan.revision_no AS plan_revision,
            sd_script.revision_no AS script_revision, sa.decision, sa.invalidated_at
     FROM session_authorizations sa
     JOIN session_validations sv ON sv.id = sa.validation_id
     JOIN session_documents sd_plan ON sd_plan.id = sv.session_plan_document_id
     JOIN session_documents sd_script ON sd_script.id = sv.screen_script_document_id
     WHERE sa.session_id = $1`,
    [created.session.id]
  );
  assert.equal(evidence.rows.length, 2);
  assert.equal(evidence.rows.filter((row) => row.invalidated_at === null).length, 1);
  assert.equal(evidence.rows.filter((row) => row.invalidated_at !== null).length, 1);
  pass('saved, validated, authorized and published states retain exact document and Screen revision evidence');
} finally {
  if (created.client?.id) {
    if (created.documentKeys.length) {
      const { error } = await supabase.storage.from('sessions-scripts-plans').remove(created.documentKeys);
      if (error) throw error;
    }
    if (created.resourceKeys.length) {
      const { error } = await supabase.storage.from('studio-resources').remove(created.resourceKeys);
      if (error) throw error;
    }
    await pool.query('DELETE FROM session_authorizations WHERE session_id IN ($1, $2)', [created.session?.id, created.incompleteSession?.id]);
    await pool.query('DELETE FROM session_validations WHERE session_id IN ($1, $2)', [created.session?.id, created.incompleteSession?.id]);
    await pool.query('DELETE FROM session_documents WHERE session_id IN ($1, $2)', [created.session?.id, created.incompleteSession?.id]);
    await pool.query('DELETE FROM sessions WHERE client_id = $1', [created.client.id]);
    if (created.resource?.id) await pool.query('DELETE FROM resources WHERE id = $1', [created.resource.id]);
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

console.log('Day 5 persistence verification passed. Verification data was removed.');
