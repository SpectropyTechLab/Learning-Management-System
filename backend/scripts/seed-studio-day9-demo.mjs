import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

const databaseUrl = new URL(process.env.DATABASE_URL || '');
if (!['127.0.0.1', 'localhost'].includes(databaseUrl.hostname)) {
  throw new Error('The Studio demo seed may run only against local PostgreSQL');
}

const DEMO_EMAIL = process.env.STUDIO_DEMO_EMAIL || 'studio.demo@spectropy.local';
const DEMO_PASSWORD = process.env.STUDIO_DEMO_PASSWORD || 'StudioDemo@2026';
const PLATFORM_CLIENT_ID = 17;

const upsertSingle = async (client, selectSql, selectParams, insertSql, insertParams) => {
  const existing = await client.query(selectSql, selectParams);
  if (existing.rows[0]) return existing.rows[0];
  return (await client.query(insertSql, insertParams)).rows[0];
};

const client = await pool.connect();
try {
  await client.query('BEGIN');

  await client.query(
    `INSERT INTO clients (id, name, slug, timezone, is_active)
     VALUES ($1, 'Spectropy Platform', 'spectropy-platform', 'Asia/Kolkata', TRUE)
     ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name, slug = EXCLUDED.slug, is_active = TRUE`,
    [PLATFORM_CLIENT_ID],
  );
  await client.query(
    `SELECT setval(
       pg_get_serial_sequence('clients', 'id'),
       GREATEST((SELECT COALESCE(MAX(id), 1) FROM clients), 1)
     )`,
  );

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const author = (await client.query(
    `INSERT INTO users (email, full_name, password_hash, role, client_id, is_active)
     VALUES ($1, 'Studio Demo Author', $2, 'content_authorizer', $3, TRUE)
     ON CONFLICT (email) DO UPDATE
       SET full_name = EXCLUDED.full_name,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           client_id = EXCLUDED.client_id,
           is_active = TRUE
     RETURNING id`,
    [DEMO_EMAIL, passwordHash, PLATFORM_CLIENT_ID],
  )).rows[0];

  for (const permission of [
    'curriculum.read',
    'curriculum.create',
    'curriculum.update',
    'curriculum.delete',
    'curriculum.authorize',
    'studio.access',
  ]) {
    await client.query(
      `DELETE FROM role_permissions
       WHERE client_id IS NULL AND role = 'content_authorizer' AND permission = $1`,
      [permission],
    );
    await client.query(
      `INSERT INTO role_permissions (client_id, role, permission, granted)
       VALUES (NULL, 'content_authorizer', $1, TRUE)`,
      [permission],
    );
  }

  const board = await upsertSingle(
    client,
    'SELECT id FROM boards WHERE client_id = $1 AND code = $2',
    [PLATFORM_CLIENT_ID, 'CBSE-DEMO'],
    `INSERT INTO boards (client_id, name, code, description)
     VALUES ($1, 'CBSE Demo Board', $2, 'Local Day 9 demonstration curriculum')
     RETURNING id`,
    [PLATFORM_CLIENT_ID, 'CBSE-DEMO'],
  );
  const program = await upsertSingle(
    client,
    'SELECT id FROM programs WHERE client_id = $1 AND code = $2',
    [PLATFORM_CLIENT_ID, 'TECHNO-MATH-DEMO'],
    `INSERT INTO programs (client_id, board_id, name, code, is_active)
     VALUES ($1, $2, 'Techno Mathematics Demo', $3, TRUE)
     RETURNING id`,
    [PLATFORM_CLIENT_ID, board.id, 'TECHNO-MATH-DEMO'],
  );
  await client.query('UPDATE programs SET board_id = $1 WHERE id = $2', [board.id, program.id]);

  const grade = await upsertSingle(
    client,
    'SELECT id FROM grades WHERE program_id = $1 AND grade_number = 8',
    [program.id],
    `INSERT INTO grades (program_id, grade_number, name, is_active)
     VALUES ($1, 8, 'Grade 8', TRUE) RETURNING id`,
    [program.id],
  );
  const subject = await upsertSingle(
    client,
    'SELECT id FROM subjects WHERE grade_id = $1 AND code = $2',
    [grade.id, 'MATH-DEMO'],
    `INSERT INTO subjects (client_id, grade_id, name, code, description, display_order, is_active)
     VALUES ($1, $2, 'Mathematics', $3, 'Local Studio demonstration subject', 1, TRUE)
     RETURNING id`,
    [PLATFORM_CLIENT_ID, grade.id, 'MATH-DEMO'],
  );
  const chapter = await upsertSingle(
    client,
    'SELECT id FROM chapters WHERE subject_id = $1 AND chapter_number = 1',
    [subject.id],
    `INSERT INTO chapters (subject_id, name, chapter_number, description, display_order, is_active)
     VALUES ($1, 'Fractions', 1, 'Representing and comparing fractions', 1, TRUE)
     RETURNING id`,
    [subject.id],
  );
  const topic = await upsertSingle(
    client,
    'SELECT id FROM topics WHERE chapter_id = $1 AND topic_number = 1',
    [chapter.id],
    `INSERT INTO topics (chapter_id, name, topic_number, description, display_order, is_active)
     VALUES ($1, 'Equivalent Fractions', 1, 'Visual and numerical equivalence', 1, TRUE)
     RETURNING id`,
    [chapter.id],
  );
  const subtopic = await upsertSingle(
    client,
    'SELECT id FROM subtopics WHERE topic_id = $1 AND name = $2',
    [topic.id, 'Visual Equivalence'],
    `INSERT INTO subtopics (topic_id, name, description, display_order, is_active)
     VALUES ($1, $2, 'Compare equivalent fractions using visual models', 1, TRUE)
     RETURNING id`,
    [topic.id, 'Visual Equivalence'],
  );
  const session = await upsertSingle(
    client,
    'SELECT id FROM sessions WHERE subtopic_id = $1 AND session_number = 1',
    [subtopic.id],
    `INSERT INTO sessions
       (client_id, subtopic_id, session_number, title, description, status, revision_no, created_by)
     VALUES ($1, $2, 1, 'Understanding Equivalent Fractions',
             'Representative Day 9 Studio session', 'draft', 1, $3)
     RETURNING id`,
    [PLATFORM_CLIENT_ID, subtopic.id, author.id],
  );

  const screenTitles = ['Welcome', 'Explore the Model', 'Guided Practice'];
  for (let index = 0; index < screenTitles.length; index += 1) {
    await client.query(
      `INSERT INTO screens
         (client_id, session_id, title, screen_number, display_order,
          creation_mode, revision_no, screen_settings_json, created_by)
       VALUES ($1, $2, $3, $4, $5, 'blank', 1, '{}'::jsonb, $6)
       ON CONFLICT (session_id, screen_number) DO UPDATE
         SET title = EXCLUDED.title,
             display_order = EXCLUDED.display_order,
             creation_mode = 'blank'`,
      [PLATFORM_CLIENT_ID, session.id, screenTitles[index], index + 1, index, author.id],
    );
  }

  await client.query('COMMIT');
  console.log('Studio Day 9 local demo data is ready.');
  console.log(`Login: ${DEMO_EMAIL}`);
  console.log(`Password: ${DEMO_PASSWORD}`);
  console.log('Path: CBSE Demo Board > Techno Mathematics Demo > Grade 8 > Mathematics > Fractions > Equivalent Fractions > Visual Equivalence');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
