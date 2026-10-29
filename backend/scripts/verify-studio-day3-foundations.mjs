import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(scriptDir, '..');
const repoDir = path.resolve(backendDir, '..');
const migrationPath = path.join(repoDir, 'supabase', 'migrations', '20261028150000_studio_day3_foundations.sql');
const migration = fs.readFileSync(migrationPath, 'utf8');
const pass = (message) => console.log(`PASS ${message}`);

for (const required of [
  'session_documents',
  'screen_elements',
  'screen_tags',
  'screen_branches',
  'sessions_subtopic_session_number_key',
  'idx_session_documents_one_current',
  'screen_branches_destination_session_fkey',
]) {
  assert.ok(migration.includes(required), `Day 3 migration is missing ${required}`);
}
assert.match(migration, /DROP CONSTRAINT IF EXISTS sessions_subtopic_id_key/);
assert.match(migration, /DROP COLUMN elements_json/);
assert.match(migration, /DROP COLUMN branches_json/);
assert.match(migration, /DROP COLUMN branch_tags_json/);
pass('forward migration selects one canonical session, document, element, tag and branch model');

const frontendModel = fs.readFileSync(
  path.join(repoDir, 'frontend', 'src', 'features', 'teaching-studio', 'layouts.ts'),
  'utf8',
);
assert.match(frontendModel, /createBlankSlide/);
assert.match(frontendModel, /creationMode: 'blank'/);
pass('frontend model represents a genuinely blank screen without a layout or preset objects');

const connectionString = process.env.STUDIO_DAY3_DATABASE_URL
  || process.env.DATABASE_URL
  || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const db = new Client({ connectionString });

const expectConstraintFailure = async (name, operation) => {
  await db.query(`SAVEPOINT ${name}`);
  try {
    await operation();
    assert.fail(`${name} unexpectedly succeeded`);
  } catch (error) {
    if (error?.name === 'AssertionError') throw error;
    await db.query(`ROLLBACK TO SAVEPOINT ${name}`);
  }
};

try {
  await db.connect();

  const schemaResult = await db.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY($1::text[])
  `, [['boards', 'subtopics', 'sessions', 'session_documents', 'layouts', 'screens', 'screen_elements', 'screen_tags', 'screen_branches']]);
  assert.equal(schemaResult.rows.length, 9);

  const removedColumns = await db.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'screens'
      AND column_name = ANY($1::text[])
  `, [['elements_json', 'branches_json', 'branch_tags_json']]);
  assert.equal(removedColumns.rows.length, 0);
  pass('local database contains the Day 3 canonical tables and no competing screen JSON models');

  await db.query('BEGIN');
  const suffix = `${Date.now().toString(36).slice(-8)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  const client = (await db.query(
    `INSERT INTO clients (name, slug) VALUES ($1, $2) RETURNING id`,
    [`Studio Day 3 ${suffix}`, `studio-day3-${suffix}`],
  )).rows[0];
  const board = (await db.query(
    `INSERT INTO boards (client_id, name, code) VALUES ($1, $2, $3) RETURNING id`,
    [client.id, `Board ${suffix}`, `B-${suffix}`],
  )).rows[0];
  const program = (await db.query(
    `INSERT INTO programs (client_id, board_id, name, code) VALUES ($1, $2, $3, $4) RETURNING id`,
    [client.id, board.id, `Program ${suffix}`, `P-${suffix}`],
  )).rows[0];
  const grade = (await db.query(
    `INSERT INTO grades (program_id, grade_number, name) VALUES ($1, 8, 'Grade 8') RETURNING id`,
    [program.id],
  )).rows[0];
  const subject = (await db.query(
    `INSERT INTO subjects (client_id, grade_id, name, code) VALUES ($1, $2, 'Mathematics', $3) RETURNING id`,
    [client.id, grade.id, `M-${suffix}`],
  )).rows[0];
  const chapter = (await db.query(
    `INSERT INTO chapters (subject_id, name, chapter_number) VALUES ($1, 'Fractions', 1) RETURNING id`,
    [subject.id],
  )).rows[0];
  const topic = (await db.query(
    `INSERT INTO topics (chapter_id, name, topic_number) VALUES ($1, 'Equivalent fractions', 1) RETURNING id`,
    [chapter.id],
  )).rows[0];
  const subtopic = (await db.query(
    `INSERT INTO subtopics (topic_id, name) VALUES ($1, 'Visual equivalence') RETURNING id`,
    [topic.id],
  )).rows[0];

  const sessionOne = (await db.query(
    `INSERT INTO sessions (client_id, subtopic_id, session_number, title)
     VALUES ($1, $2, 1, 'Session one') RETURNING id`,
    [client.id, subtopic.id],
  )).rows[0];
  const sessionTwo = (await db.query(
    `INSERT INTO sessions (client_id, subtopic_id, session_number, title)
     VALUES ($1, $2, 2, 'Session two') RETURNING id`,
    [client.id, subtopic.id],
  )).rows[0];
  assert.notEqual(sessionOne.id, sessionTwo.id);
  pass('one subtopic accepts multiple ordered Studio sessions without changing curriculum IDs');

  const layout = (await db.query(
    `INSERT INTO layouts (
       client_id, layout_key, version_no, name, layout_data_json,
       canvas_width, canvas_height, safe_margin
     ) VALUES ($1, 'LYT-001', 1, 'Hook observation', '{}'::jsonb, 1920, 1080, 90)
     RETURNING id`,
    [client.id],
  )).rows[0];

  const blankScreen = (await db.query(
    `INSERT INTO screens (
       client_id, session_id, title, screen_number, layout_id,
       creation_mode, display_order
     ) VALUES ($1, $2, '', 1, NULL, 'blank', 0) RETURNING id`,
    [client.id, sessionOne.id],
  )).rows[0];
  const sourceScreen = (await db.query(
    `INSERT INTO screens (
       client_id, session_id, title, screen_number, layout_id,
       creation_mode, display_order
     ) VALUES ($1, $2, 'Question', 2, $3, 'layout', 1) RETURNING id`,
    [client.id, sessionOne.id, layout.id],
  )).rows[0];
  const destinationScreen = (await db.query(
    `INSERT INTO screens (
       client_id, session_id, title, screen_number, layout_id,
       creation_mode, display_order
     ) VALUES ($1, $2, 'Repair', 3, $3, 'layout', 2) RETURNING id`,
    [client.id, sessionOne.id, layout.id],
  )).rows[0];
  const otherSessionScreen = (await db.query(
    `INSERT INTO screens (
       client_id, session_id, title, screen_number, layout_id,
       creation_mode, display_order
     ) VALUES ($1, $2, 'Other session', 1, $3, 'layout', 0) RETURNING id`,
    [client.id, sessionTwo.id, layout.id],
  )).rows[0];

  await db.query(
    `INSERT INTO screen_elements (
       screen_id, element_key, slot_id, element_type, content_json, display_order
     ) VALUES ($1, 'prompt-1', 'question', 'question', '{"text":"Why?"}'::jsonb, 0)`,
    [sourceScreen.id],
  );
  await db.query(
    `INSERT INTO screen_tags (screen_id, tag) VALUES ($1, 'fractions'), ($1, 'remediation')`,
    [sourceScreen.id],
  );
  await db.query(
    `INSERT INTO screen_branches (
       session_id, branch_key, source_screen_id, destination_screen_id,
       trigger_kind, return_screen_id
     ) VALUES ($1, 'repair-1', $2, $3, 'manual', $2)`,
    [sessionOne.id, sourceScreen.id, destinationScreen.id],
  );

  const blankCount = await db.query(`SELECT COUNT(*)::int AS count FROM screen_elements WHERE screen_id = $1`, [blankScreen.id]);
  assert.equal(blankCount.rows[0].count, 0);

  await expectConstraintFailure('cross_session_branch', () => db.query(
    `INSERT INTO screen_branches (
       session_id, branch_key, source_screen_id, destination_screen_id,
       trigger_kind, return_screen_id
     ) VALUES ($1, 'invalid-cross-session', $2, $3, 'manual', $2)`,
    [sessionOne.id, sourceScreen.id, otherSessionScreen.id],
  ));
  pass('blank screens stay empty and branch destination/return references cannot cross sessions');

  await db.query(
    `INSERT INTO session_documents (
       session_id, document_type, revision_no, source_mode, manual_content, is_current
     ) VALUES
       ($1, 'session_plan', 1, 'manual', '{"title":"Plan"}'::jsonb, TRUE),
       ($1, 'screen_script', 1, 'manual', '{"title":"Script"}'::jsonb, TRUE)`,
    [sessionOne.id],
  );

  await expectConstraintFailure('duplicate_current_document', () => db.query(
    `INSERT INTO session_documents (
       session_id, document_type, revision_no, source_mode, manual_content, is_current
     ) VALUES ($1, 'session_plan', 2, 'manual', '{"title":"Replacement"}'::jsonb, TRUE)`,
    [sessionOne.id],
  ));
  pass('document schema enforces one current Session Plan and one current Screen Script per session');

  await db.query('ROLLBACK');
  console.log('Day 3 database foundation verification passed. Test data was rolled back.');
} catch (error) {
  try { await db.query('ROLLBACK'); } catch {}
  console.error('Day 3 verification failed:', error.message);
  process.exitCode = 1;
} finally {
  await db.end().catch(() => {});
}
