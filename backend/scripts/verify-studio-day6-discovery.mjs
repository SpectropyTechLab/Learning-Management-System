import assert from 'node:assert/strict';
import pg from 'pg';
import {
  discoverScreens,
  getBranchDestinations,
} from '../services/studioDiscovery.service.js';

const { Client } = pg;
const pass = (message) => console.log(`PASS ${message}`);
const connectionString = process.env.STUDIO_DAY6_DATABASE_URL
  || process.env.DATABASE_URL
  || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const db = new Client({ connectionString });

try {
  await db.connect();

  const schema = await db.query(`
    SELECT
      to_regclass('public.session_releases') AS release_table,
      EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_studio_releases_immutable' AND NOT tgisinternal
      ) AS immutable_trigger,
      EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'idx_session_releases_one_session_revision'
      ) AS revision_index
  `);
  assert.equal(schema.rows[0].release_table, 'session_releases');
  assert.equal(schema.rows[0].immutable_trigger, true);
  assert.equal(schema.rows[0].revision_index, true);
  pass('local database contains immutable Day 6 release infrastructure');

  await db.query('BEGIN');
  const suffix = `${Date.now().toString(36).slice(-8)}${Math.floor(Math.random() * 1000)
    .toString().padStart(3, '0')}`;
  const client = (await db.query(
    'INSERT INTO clients (name, slug) VALUES ($1, $2) RETURNING id',
    [`Studio Day 6 ${suffix}`, `studio-day6-${suffix}`],
  )).rows[0];
  const board = (await db.query(
    'INSERT INTO boards (client_id, name, code) VALUES ($1, $2, $3) RETURNING id',
    [client.id, `Board ${suffix}`, `B-${suffix}`],
  )).rows[0];
  const program = (await db.query(
    `INSERT INTO programs (client_id, board_id, name, code)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [client.id, board.id, `Program ${suffix}`, `P-${suffix}`],
  )).rows[0];
  const grade = (await db.query(
    `INSERT INTO grades (program_id, grade_number, name)
     VALUES ($1, 8, 'Grade 8') RETURNING id`,
    [program.id],
  )).rows[0];
  const subject = (await db.query(
    `INSERT INTO subjects (client_id, grade_id, name, code)
     VALUES ($1, $2, 'Mathematics', $3) RETURNING id`,
    [client.id, grade.id, `M-${suffix}`],
  )).rows[0];
  const chapter = (await db.query(
    `INSERT INTO chapters (subject_id, name, chapter_number)
     VALUES ($1, 'Fractions', 1) RETURNING id`,
    [subject.id],
  )).rows[0];
  const topic = (await db.query(
    `INSERT INTO topics (chapter_id, name, topic_number)
     VALUES ($1, 'Equivalent fractions', 1) RETURNING id`,
    [chapter.id],
  )).rows[0];
  const subtopic = (await db.query(
    "INSERT INTO subtopics (topic_id, name) VALUES ($1, 'Visual equivalence') RETURNING id",
    [topic.id],
  )).rows[0];
  const session = (await db.query(
    `INSERT INTO sessions (client_id, subtopic_id, session_number, title)
     VALUES ($1, $2, 1, 'Day 6 discovery') RETURNING id`,
    [client.id, subtopic.id],
  )).rows[0];
  const source = (await db.query(
    `INSERT INTO screens (
       client_id, session_id, title, screen_number, creation_mode, display_order
     ) VALUES ($1, $2, 'Fraction repair', 1, 'blank', 0) RETURNING id`,
    [client.id, session.id],
  )).rows[0];
  const destination = (await db.query(
    `INSERT INTO screens (
       client_id, session_id, title, screen_number, creation_mode, display_order
     ) VALUES ($1, $2, 'Remediation', 2, 'blank', 1) RETURNING id`,
    [client.id, session.id],
  )).rows[0];
  await db.query(
    `INSERT INTO screen_tags (screen_id, tag)
     VALUES ($1, 'fractions'), ($1, 'remediation'), ($1, 'visual'),
            ($2, 'fractions')`,
    [source.id, destination.id],
  );
  await db.query(
    `INSERT INTO screen_branches (
       session_id, branch_key, source_screen_id, destination_screen_id,
       trigger_kind, return_screen_id, restore_screen_state, restore_session_state
     ) VALUES ($1, 'repair', $2, $3, 'manual', $2, TRUE, TRUE)`,
    [session.id, source.id, destination.id],
  );

  const user = { id: 1, role: 'content_authorizer', client_id: client.id };
  const discovery = await discoverScreens({
    tags: 'Remediation, fractions, FRACTIONS',
    user,
    db,
  });
  assert.deepEqual(discovery.query.tags, ['remediation', 'fractions']);
  assert.deepEqual(discovery.screens.map((screen) => screen.screen_id), [source.id]);
  assert.deepEqual(discovery.screens[0].tags, ['fractions', 'remediation', 'visual']);
  pass('real multi-tag query requires every normalized requested tag');

  const branches = await getBranchDestinations({ screenId: source.id, user, db });
  assert.equal(branches.branches.length, 1);
  assert.equal(branches.branches[0].destination.screen_id, destination.id);
  assert.equal(branches.branches[0].return_to.screen_id, source.id);
  assert.equal(branches.branches[0].return_to.restore_screen_state, true);
  pass('real branch lookup resolves stable destination and return Screen IDs');

  const otherTenant = await discoverScreens({
    tags: 'fractions',
    user: { ...user, client_id: client.id + 1000000 },
    db,
  });
  assert.equal(otherTenant.screens.length, 0);
  pass('real discovery query prevents cross-tenant preview results');

  await db.query('ROLLBACK');
} catch (error) {
  try { await db.query('ROLLBACK'); } catch { /* connection or transaction was unavailable */ }
  throw error;
} finally {
  await db.end();
}

