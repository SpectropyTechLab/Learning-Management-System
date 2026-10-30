import assert from 'node:assert/strict';

process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.LOCAL_DEV ||= 'true';
// Manual JSON documents do not call Storage, but the shared document service
// initializes the Supabase client during import.
process.env.SUPABASE_SERVICE_KEY ||= 'local-day8-acceptance-not-used-for-storage';
process.env.JWT_SECRET ||= 'local-day8-acceptance-secret';

const databaseUrl = new URL(process.env.DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(databaseUrl.hostname)) {
  throw new Error('Day 8 acceptance is destructive test setup and may run only against local PostgreSQL');
}

const { default: pool } = await import('../config/db.js');
const { createScreen } = await import('../services/studioLayouts.service.js');
const { saveDocumentContent } = await import('../services/studioDocuments.service.js');
const { saveScreen } = await import('../services/studioScreens.service.js');
const {
  publishSession,
  reviewSession,
  submitSession,
} = await import('../services/studioSessionWorkflow.service.js');
const { getCurrentTeacherRelease } = await import('../services/studioReleases.service.js');

const pass = (message) => console.log(`PASS ${message}`);
const requiredMigrationVersions = [
  '20261028150000',
  '20261028170000',
  '20261028180000',
  '20261029100000',
  '20261029160000',
  '20261030120000',
  '20261030170000',
];
const requiredRelations = [
  'session_validations',
  'session_authorizations',
  'session_releases',
  'studio_branch_runs',
  'studio_branch_checkpoints',
  'studio_scorm_attempts',
  'studio_scorm_sco_states',
];

const client = await pool.connect();
const originalConnect = pool.connect.bind(pool);
const originalQuery = pool.query.bind(pool);
let serviceSavepoint = 0;

const normalizedSql = (value) => String(value).replace(/\s+/g, ' ').trim().toLowerCase();
const transactionalClient = {
  async query(text, params) {
    const normalized = normalizedSql(text);
    if (normalized === 'begin') {
      serviceSavepoint += 1;
      const name = `day8_service_${serviceSavepoint}`;
      this.savepoints ||= [];
      this.savepoints.push(name);
      return client.query(`SAVEPOINT ${name}`);
    }
    if (normalized === 'commit') {
      const name = this.savepoints.pop();
      return client.query(`RELEASE SAVEPOINT ${name}`);
    }
    if (normalized === 'rollback') {
      const name = this.savepoints.pop();
      await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
      return client.query(`RELEASE SAVEPOINT ${name}`);
    }
    return client.query(text, params);
  },
  release() {},
};

const expectDatabaseFailure = async (name, action, pattern) => {
  await client.query(`SAVEPOINT ${name}`);
  try {
    await assert.rejects(action, pattern);
  } finally {
    await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
    await client.query(`RELEASE SAVEPOINT ${name}`);
  }
};

const insertCurriculum = async ({ suffix, clientId, schoolId }) => {
  const board = (await client.query(
    'INSERT INTO boards (client_id, name, code) VALUES ($1, $2, $3) RETURNING id',
    [clientId, `Day 8 Board ${suffix}`, `D8B-${suffix}`],
  )).rows[0];
  const program = (await client.query(
    `INSERT INTO programs (client_id, board_id, school_id, name, code)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [clientId, board.id, schoolId, `Day 8 Program ${suffix}`, `D8P-${suffix}`],
  )).rows[0];
  const grade = (await client.query(
    "INSERT INTO grades (program_id, grade_number, name) VALUES ($1, 8, 'Grade 8') RETURNING id",
    [program.id],
  )).rows[0];
  const subject = (await client.query(
    `INSERT INTO subjects (client_id, grade_id, name, code)
     VALUES ($1, $2, 'Mathematics', $3) RETURNING id`,
    [clientId, grade.id, `D8M-${suffix}`],
  )).rows[0];
  const chapter = (await client.query(
    "INSERT INTO chapters (subject_id, name, chapter_number) VALUES ($1, 'Fractions', 1) RETURNING id",
    [subject.id],
  )).rows[0];
  const topic = (await client.query(
    "INSERT INTO topics (chapter_id, name, topic_number) VALUES ($1, 'Equivalent fractions', 1) RETURNING id",
    [chapter.id],
  )).rows[0];
  const subtopic = (await client.query(
    "INSERT INTO subtopics (topic_id, name) VALUES ($1, 'Visual equivalence') RETURNING id",
    [topic.id],
  )).rows[0];
  return { board, program, grade, subject, chapter, topic, subtopic };
};

try {
  await client.query('BEGIN');
  pool.connect = async () => transactionalClient;
  pool.query = (text, params) => client.query(text, params);

  const migrations = await client.query(
    `SELECT version FROM supabase_migrations.schema_migrations
     WHERE version = ANY($1::text[]) ORDER BY version`,
    [requiredMigrationVersions],
  );
  assert.deepEqual(migrations.rows.map((row) => row.version), requiredMigrationVersions);
  const relations = await client.query(
    `SELECT name, to_regclass('public.' || name) AS relation
     FROM unnest($1::text[]) AS names(name)`,
    [requiredRelations],
  );
  assert.ok(relations.rows.every((row) => row.relation), 'Required Day 5-7 relation is missing');
  pass('all Day 3-7 migrations are registered and required acceptance relations exist');

  const constraintEvidence = await client.query(
    `SELECT conname FROM pg_constraint
     WHERE conname IN (
       'sessions_subtopic_session_number_key',
       'session_releases_session_revision_no_check',
       'studio_branch_runs_terminal_time_check',
       'studio_branch_checkpoints_return_time_check'
     )`,
  );
  assert.equal(constraintEvidence.rows.length, 4);
  const triggerEvidence = await client.query(
    `SELECT tgname FROM pg_trigger WHERE NOT tgisinternal AND tgname IN (
       'trg_studio_invalidate_authorization',
       'trg_studio_releases_immutable',
       'trg_studio_validate_branch_run',
       'trg_studio_validate_branch_checkpoint',
       'trg_studio_protect_branch_checkpoint_origin'
     )`,
  );
  assert.equal(triggerEvidence.rows.length, 5);
  pass('publication, authorization, curriculum and branch constraints/triggers are installed');

  const suffix = `${Date.now().toString(36).slice(-7)}${Math.floor(Math.random() * 1000)
    .toString().padStart(3, '0')}`;
  const tenant = (await client.query(
    'INSERT INTO clients (name, slug) VALUES ($1, $2) RETURNING id',
    [`Studio Day 8 ${suffix}`, `studio-day8-${suffix}`],
  )).rows[0];
  const otherTenant = (await client.query(
    'INSERT INTO clients (name, slug) VALUES ($1, $2) RETURNING id',
    [`Studio Day 8 other ${suffix}`, `studio-day8-other-${suffix}`],
  )).rows[0];
  const school = (await client.query(
    'INSERT INTO schools (client_id, school_code, name) VALUES ($1, $2, $3) RETURNING id',
    [tenant.id, `D8S-${suffix}`, `Day 8 School ${suffix}`],
  )).rows[0];
  const users = (await client.query(
    `INSERT INTO users (email, full_name, password_hash, role, client_id)
     VALUES
       ($1, 'Day 8 Author', 'test-only', 'content_authorizer', $4),
       ($2, 'Day 8 Teacher', 'test-only', 'teacher', $4),
       ($3, 'Day 8 Unassigned Teacher', 'test-only', 'teacher', $4)
     RETURNING id, role`,
    [`day8-author-${suffix}@example.test`, `day8-teacher-${suffix}@example.test`,
      `day8-unassigned-${suffix}@example.test`, tenant.id],
  )).rows;
  const author = { ...users[0], client_id: tenant.id };
  const teacher = { ...users[1], client_id: tenant.id };
  const unassignedTeacher = { ...users[2], client_id: tenant.id };
  await client.query(
    `INSERT INTO school_memberships (school_id, user_id, role_scope, is_primary)
     VALUES ($1, $2, 'teacher', TRUE)`,
    [school.id, teacher.id],
  );
  const curriculum = await insertCurriculum({ suffix, clientId: tenant.id, schoolId: school.id });

  const session = (await client.query(
    `INSERT INTO sessions (client_id, subtopic_id, session_number, title, status, revision_no, created_by)
     VALUES ($1, $2, 1, 'Day 8 publication acceptance', 'draft', 1, $3)
     RETURNING id, revision_no`,
    [tenant.id, curriculum.subtopic.id, author.id],
  )).rows[0];
  const secondSession = (await client.query(
    `INSERT INTO sessions (client_id, subtopic_id, session_number, title, status, revision_no, created_by)
     VALUES ($1, $2, 2, 'Day 8 second ordered Session', 'draft', 1, $3) RETURNING id`,
    [tenant.id, curriculum.subtopic.id, author.id],
  )).rows[0];
  assert.ok(secondSession.id);
  await expectDatabaseFailure(
    'cross_tenant_session',
    () => client.query(
      `INSERT INTO sessions (client_id, subtopic_id, session_number, title, status, revision_no, created_by)
       VALUES ($1, $2, 3, 'Invalid cross tenant', 'draft', 1, $3)`,
      [otherTenant.id, curriculum.subtopic.id, author.id],
    ),
    /does not match curriculum client_id/i,
  );
  pass('existing curriculum supports ordered sibling Sessions and rejects cross-tenant ownership');

  await saveDocumentContent({
    sessionId: session.id,
    documentType: 'session_plan',
    content: { title: 'Representative plan', objective: 'Equivalent fractions' },
    user: author,
  });
  await saveDocumentContent({
    sessionId: session.id,
    documentType: 'screen_script',
    content: { title: 'Representative script', prompts: ['Compare the models'] },
    user: author,
  });
  const origin = await createScreen({
    sessionId: session.id,
    body: { creation_mode: 'blank', title: 'Equivalent fractions' },
    user: author,
  });
  const remediation = await createScreen({
    sessionId: session.id,
    body: { creation_mode: 'blank', title: 'Fraction remediation' },
    user: author,
  });
  const savedOrigin = await saveScreen({
    screenId: origin.id,
    body: {
      revision_no: origin.revision_no,
      title: origin.title,
      elements: [{
        id: 'question-1', type: 'question',
        content: { prompt: 'Which fractions are equivalent?' }, position: { x: 100, y: 100 },
      }],
      tags: ['fractions', 'remediation'],
      screen_settings: { reveal_order: ['question-1'] },
    },
    user: author,
  });
  await client.query(
    `INSERT INTO screen_branches (
       session_id, branch_key, source_screen_id, destination_screen_id,
       trigger_kind, trigger_config_json, return_screen_id,
       restore_screen_state, restore_session_state, display_order
     ) VALUES ($1, 'incorrect-answer', $2, $3, 'answer',
               '{"answer":"incorrect"}'::jsonb, $2, TRUE, TRUE, 0)`,
    [session.id, origin.id, remediation.id],
  );

  const resource = (await client.query(
    `INSERT INTO resources (client_id, name, description, resource_type, created_by)
     VALUES ($1, 'Fraction model', 'Day 8 pinned Resource', 'image', $2) RETURNING id`,
    [tenant.id, author.id],
  )).rows[0];
  const resourceVersion = (await client.query(
    `INSERT INTO resource_versions (
       resource_id, version_number, storage_key, original_file_name,
       mime_type, file_size, checksum_sha256, metadata_json, uploaded_by
     ) VALUES ($1, 1, $2, 'fraction-model.png', 'image/png', 4,
               repeat('a', 64), '{"fixture":true}'::jsonb, $3) RETURNING id`,
    [resource.id, `day8/${suffix}/fraction-model.png`, author.id],
  )).rows[0];
  await client.query(
    `INSERT INTO resource_mappings (
       resource_id, resource_version_id, screen_id, element_id, usage_details_json, created_by
     ) VALUES ($1, $2, $3, 'question-1', '{"placement":"lesson"}'::jsonb, $4)`,
    [resource.id, resourceVersion.id, origin.id, author.id],
  );

  const submitted1 = await submitSession({ sessionId: session.id, user: author });
  assert.equal(submitted1.status, 'submitted');
  const approved1 = await reviewSession({
    sessionId: session.id, decision: 'approved', comment: 'Day 8 acceptance revision 1', user: author,
  });
  assert.equal(approved1.status, 'approved');
  const release1 = await publishSession({ sessionId: session.id, user: author });
  assert.equal(release1.release_number, 1);
  assert.equal(release1.manifest.session.program_id, curriculum.program.id);
  assert.equal(release1.manifest.screens[0].resource_mapping, undefined);
  const releasedElement = release1.manifest.screens
    .flatMap((screen) => screen.elements)
    .find((element) => element.element_key === 'question-1');
  assert.equal(Number(releasedElement.resource_mapping.resource_version_id), Number(resourceVersion.id));
  assert.equal(release1.manifest.screens[0].branches[0].branch_key, 'incorrect-answer');
  pass('production workflow publishes revision 1 with pinned curriculum, Screen, branch and Resource evidence');

  const teacherRelease1 = await getCurrentTeacherRelease({ sessionId: session.id, user: teacher });
  assert.equal(Number(teacherRelease1.id), Number(release1.id));
  await assert.rejects(
    getCurrentTeacherRelease({ sessionId: session.id, user: unassignedTeacher }),
    (error) => error?.status === 403,
  );
  pass('assigned teacher reads the immutable release and an unassigned teacher is denied');

  const edited = await saveScreen({
    screenId: origin.id,
    body: {
      revision_no: savedOrigin.revision_no,
      title: 'Equivalent fractions revision 2',
      elements: [{
        id: 'question-1', type: 'question',
        content: { prompt: 'Select every equivalent fraction.' }, position: { x: 110, y: 100 },
        resource: {
          resource_id: resource.id,
          resource_version_id: resourceVersion.id,
          usage: { placement: 'lesson' },
        },
      }],
      tags: ['fractions', 'remediation', 'revision-2'],
      screen_settings: { reveal_order: ['question-1'] },
    },
    user: author,
  });
  const invalidated = await client.query(
    `SELECT sa.invalidated_at, sv.session_revision_no
     FROM session_authorizations sa JOIN session_validations sv ON sv.id = sa.validation_id
     WHERE sa.id = $1`,
    [approved1.authorization.id],
  );
  assert.ok(invalidated.rows[0].invalidated_at);
  assert.ok(Number(edited.session_revision_no) > Number(invalidated.rows[0].session_revision_no));

  await client.query(
    `UPDATE sessions SET status = 'approved', approved_by = $2, approved_at = NOW()
     WHERE id = $1`,
    [session.id, author.id],
  );
  await assert.rejects(
    publishSession({ sessionId: session.id, user: author }),
    (error) => error?.status === 409 && /exact current Session revision is not authorized/i.test(error.message),
  );
  await client.query(
    `UPDATE sessions SET status = 'draft', approved_by = NULL, approved_at = NULL WHERE id = $1`,
    [session.id],
  );
  pass('relevant draft edit advances the revision, invalidates authorization and blocks stale publication');

  await submitSession({ sessionId: session.id, user: author });
  await reviewSession({
    sessionId: session.id, decision: 'approved', comment: 'Day 8 acceptance revision 2', user: author,
  });
  const release2 = await publishSession({ sessionId: session.id, user: author });
  assert.equal(release2.release_number, 2);
  assert.equal(release2.manifest.screens[0].title, 'Equivalent fractions revision 2');
  const retained = await client.query(
    'SELECT manifest_json FROM session_releases WHERE id = $1',
    [release1.id],
  );
  assert.equal(retained.rows[0].manifest_json.screens[0].title, 'Equivalent fractions');
  pass('reauthorized revision publishes release 2 while release 1 remains byte-for-byte historical state');

  await expectDatabaseFailure(
    'immutable_release_update',
    () => client.query(
      `UPDATE session_releases SET manifest_json = '{}'::jsonb WHERE id = $1`,
      [release1.id],
    ),
    /immutable/i,
  );
  await expectDatabaseFailure(
    'immutable_release_delete',
    () => client.query('DELETE FROM session_releases WHERE id = $1', [release1.id]),
    /immutable/i,
  );
  await expectDatabaseFailure(
    'duplicate_session_revision',
    () => client.query(
      `INSERT INTO session_releases (
         client_id, session_id, release_number, session_revision_no,
         validation_id, authorization_id, manifest_json, published_by
       ) SELECT client_id, session_id, 99, session_revision_no,
                validation_id, authorization_id, manifest_json, published_by
         FROM session_releases WHERE id = $1`,
      [release1.id],
    ),
    /session_revision|duplicate key/i,
  );
  pass('release update/delete and duplicate exact-revision publication are rejected by database constraints');

  const curriculumRead = await client.query(
    `SELECT b.id AS board_id, p.id AS program_id, g.id AS grade_id,
            su.id AS subject_id, ch.id AS chapter_id, t.id AS topic_id, st.id AS subtopic_id,
            COUNT(se.id)::int AS session_count
     FROM boards b
     JOIN programs p ON p.board_id = b.id
     JOIN grades g ON g.program_id = p.id
     JOIN subjects su ON su.grade_id = g.id
     JOIN chapters ch ON ch.subject_id = su.id
     JOIN topics t ON t.chapter_id = ch.id
     JOIN subtopics st ON st.topic_id = t.id
     JOIN sessions se ON se.subtopic_id = st.id
     WHERE b.id = $1
     GROUP BY b.id, p.id, g.id, su.id, ch.id, t.id, st.id`,
    [curriculum.board.id],
  );
  assert.equal(curriculumRead.rows[0].session_count, 2);
  pass('complete existing curriculum chain remains readable with multiple ordered Studio Sessions');

  console.log('PASS Day 8 Developer 1 backend acceptance gate completed');
} finally {
  try { await client.query('ROLLBACK'); } catch { /* outer transaction was unavailable */ }
  pool.connect = originalConnect;
  pool.query = originalQuery;
  client.release();
  await pool.end();
}
