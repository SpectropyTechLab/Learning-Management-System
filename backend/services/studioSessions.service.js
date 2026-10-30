import { getClient, query as dbQuery } from '../repositories/db.repository.js';
import { AppError } from '../utils/errors.js';

const AUTHOR_ROLES = new Set(['super_admin', 'content_authorizer']);

const parseId = (value, label) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(`${label} must be a positive integer`, 400);
  return id;
};

const requireText = (value, label, maxLength) => {
  const text = String(value ?? '').trim();
  if (!text) throw new AppError(`${label} is required`, 422);
  if (text.length > maxLength) throw new AppError(`${label} must be ${maxLength} characters or fewer`, 422);
  return text;
};

const assertAuthor = (user) => {
  if (!AUTHOR_ROLES.has(user?.role)) throw new AppError('Only Content Authorizers can manage Studio Sessions', 403);
};

const assertTenant = (clientId, user) => {
  if (user?.role === 'super_admin' || (user?.role === 'content_authorizer' && !user?.client_id)) return;
  if (!user?.client_id || Number(clientId) !== Number(user.client_id)) throw new AppError('Access denied', 403);
};

const loadSubtopicContext = async (db, subtopicId, user, { lock = false } = {}) => {
  const result = await db.query(
    `SELECT st.id, p.client_id
     FROM subtopics st
     JOIN topics t ON t.id = st.topic_id
     JOIN chapters ch ON ch.id = t.chapter_id
     JOIN subjects su ON su.id = ch.subject_id
     JOIN grades g ON g.id = su.grade_id
     JOIN programs p ON p.id = g.program_id
     WHERE st.id = $1${lock ? ' FOR SHARE OF st, p' : ''}`,
    [subtopicId],
  );
  const context = result.rows[0];
  if (!context) throw new AppError('Subtopic not found', 404);
  assertTenant(context.client_id, user);
  return context;
};

const sessionView = (row) => ({
  id: Number(row.id),
  client_id: row.client_id === null ? null : Number(row.client_id),
  subtopic_id: Number(row.subtopic_id),
  session_number: Number(row.session_number),
  title: row.title,
  description: row.description,
  status: row.status,
  revision_no: Number(row.revision_no),
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const columns = `id, client_id, subtopic_id, session_number, title, description,
  status, revision_no, created_at, updated_at`;

export const listStudioSessions = async ({ subtopicId: rawSubtopicId, user, db = { query: dbQuery } }) => {
  assertAuthor(user);
  const subtopicId = parseId(rawSubtopicId, 'Subtopic ID');
  await loadSubtopicContext(db, subtopicId, user);
  const result = await db.query(
    `SELECT ${columns} FROM sessions
     WHERE subtopic_id = $1 ORDER BY session_number, id`,
    [subtopicId],
  );
  return { subtopic_id: subtopicId, sessions: result.rows.map(sessionView) };
};

export const getStudioSession = async ({ sessionId: rawSessionId, user, db = { query: dbQuery } }) => {
  assertAuthor(user);
  const sessionId = parseId(rawSessionId, 'Session ID');
  const result = await db.query(`SELECT ${columns} FROM sessions WHERE id = $1`, [sessionId]);
  const session = result.rows[0];
  if (!session) throw new AppError('Studio Session not found', 404);
  assertTenant(session.client_id, user);
  return sessionView(session);
};

export const createStudioSession = async ({ subtopicId: rawSubtopicId, body = {}, user,
  getDbClient = getClient }) => {
  assertAuthor(user);
  const subtopicId = parseId(rawSubtopicId, 'Subtopic ID');
  const sessionNumber = parseId(body.session_number, 'session_number');
  const title = requireText(body.title, 'title', 250);
  const description = body.description === undefined || body.description === null
    ? null
    : String(body.description).trim().slice(0, 5000) || null;
  const db = await getDbClient();
  try {
    await db.query('BEGIN');
    const context = await loadSubtopicContext(db, subtopicId, user, { lock: true });
    const result = await db.query(
      `INSERT INTO sessions (
         client_id, subtopic_id, session_number, title, description,
         status, revision_no, created_by
       ) VALUES ($1, $2, $3, $4, $5, 'draft', 1, $6)
       RETURNING ${columns}`,
      [context.client_id, subtopicId, sessionNumber, title, description, user.id || null],
    );
    await db.query('COMMIT');
    return sessionView(result.rows[0]);
  } catch (error) {
    await db.query('ROLLBACK');
    if (error?.code === '23505') {
      throw new AppError(`Session ${sessionNumber} already exists for this Subtopic`, 409);
    }
    throw error;
  } finally {
    db.release?.();
  }
};
