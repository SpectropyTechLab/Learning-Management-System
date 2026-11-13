import { getClient, query as dbQuery } from '../repositories/db.repository.js';
import { AppError } from '../utils/errors.js';
import { removeStoredSessionDocuments } from './studioDocuments.service.js';

const AUTHOR_ROLES = new Set(['super_admin', 'content_authorizer']);
const SESSION_STATUSES = new Set(['draft', 'submitted', 'approved', 'rejected', 'published']);

const parseId = (value, label) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(`${label} must be a positive integer`, 400, 'INVALID_ID');
  }
  return id;
};

const requiredText = (value, label, maxLength) => {
  const text = String(value ?? '').trim();
  if (!text) throw new AppError(`${label} is required`, 422, 'VALIDATION_FAILED');
  if (text.length > maxLength) {
    throw new AppError(`${label} must be ${maxLength} characters or fewer`, 422, 'VALIDATION_FAILED');
  }
  return text;
};

const optionalText = (value, label, maxLength) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (text.length > maxLength) {
    throw new AppError(`${label} must be ${maxLength} characters or fewer`, 422, 'VALIDATION_FAILED');
  }
  return text || null;
};

const canAccessTenant = (clientId, user) =>
  user?.role === 'super_admin' ||
  (user?.role === 'content_authorizer' && !user?.client_id) ||
  (user?.client_id !== null &&
    user?.client_id !== undefined &&
    clientId !== null &&
    clientId !== undefined &&
    Number(clientId) === Number(user.client_id));

const assertTenant = (clientId, user) => {
  if (!canAccessTenant(clientId, user)) {
    throw new AppError('This curriculum selection is outside your client access', 403, 'CLIENT_ACCESS_DENIED');
  }
};

const assertAuthor = (user) => {
  if (!AUTHOR_ROLES.has(user?.role)) {
    throw new AppError('Only Content Authorizers can create or update Studio sessions', 403, 'AUTHOR_ROLE_REQUIRED');
  }
};

const loadSubtopicContext = async (db, subtopicId, user, { lock = false } = {}) => {
  const result = await db.query(
    `SELECT st.id, st.name AS subtopic_name, p.client_id,
            b.id AS board_id, p.id AS program_id, g.id AS grade_id,
            su.id AS subject_id, ch.id AS chapter_id, t.id AS topic_id
     FROM subtopics st
     JOIN topics t ON t.id = st.topic_id
     JOIN chapters ch ON ch.id = t.chapter_id
     JOIN subjects su ON su.id = ch.subject_id
     JOIN grades g ON g.id = su.grade_id
     JOIN programs p ON p.id = g.program_id
     JOIN boards b ON b.id = p.board_id
     WHERE st.id = $1 ${lock ? 'FOR UPDATE OF st' : ''}`,
    [subtopicId],
  );
  const context = result.rows[0];
  if (!context) {
    throw new AppError(
      'Subtopic was not found or its curriculum parent chain is incomplete',
      404,
      'SUBTOPIC_CHAIN_NOT_FOUND',
    );
  }
  assertTenant(context.client_id, user);
  return context;
};

const loadSession = async (db, sessionId, user, { lock = false } = {}) => {
  const result = await db.query(
    `SELECT s.*, st.name AS subtopic_name, t.name AS topic_name, ch.name AS chapter_name
     FROM sessions s
     JOIN subtopics st ON st.id = s.subtopic_id
     JOIN topics t ON t.id = st.topic_id
     JOIN chapters ch ON ch.id = t.chapter_id
     WHERE s.id = $1 ${lock ? 'FOR UPDATE OF s' : ''}`,
    [sessionId],
  );
  const session = result.rows[0];
  if (!session) throw new AppError('Studio session not found', 404, 'SESSION_NOT_FOUND');
  assertTenant(session.client_id, user);
  return session;
};

export const listSubtopicSessions = async ({ subtopicId: rawSubtopicId, user, db = { query: dbQuery } }) => {
  const subtopicId = parseId(rawSubtopicId, 'Subtopic ID');
  const context = await loadSubtopicContext(db, subtopicId, user);
  const result = await db.query(
    `SELECT id, client_id, subtopic_id, session_number, title, description,
            status, revision_no, created_by, created_at, updated_at
     FROM sessions
     WHERE subtopic_id = $1
     ORDER BY session_number, id`,
    [subtopicId],
  );
  return { curriculum: context, sessions: result.rows };
};

// Compatibility name used by the Day 9 session-setup acceptance suite.
// Both names intentionally share the same permission and parent-chain checks.
export const listStudioSessions = listSubtopicSessions;

export const listAllStudioSessions = async ({ status, user, db = { query: dbQuery } }) => {
  const normalizedStatus = String(status ?? '').trim().toLowerCase();
  if (normalizedStatus && !SESSION_STATUSES.has(normalizedStatus)) {
    throw new AppError('status must be draft, submitted, approved, rejected, or published', 400, 'INVALID_STATUS');
  }
  const tenantId = user?.role === 'super_admin' || (user?.role === 'content_authorizer' && !user?.client_id)
    ? null
    : Number(user?.client_id);
  const result = await db.query(
    `SELECT s.id, s.client_id, s.subtopic_id, s.session_number, s.title, s.description,
            s.status, s.revision_no, s.created_by, s.created_at, s.updated_at,
            s.submitted_by, s.submitted_at, s.approved_by, s.approved_at,
            s.approval_comment, s.published_at,
            b.id AS board_id, b.name AS board_name,
            p.id AS program_id, p.name AS program_name,
            g.id AS grade_id, g.grade_number,
            su.id AS subject_id, su.name AS subject_name,
            ch.id AS chapter_id, ch.chapter_number, ch.name AS chapter_name,
            t.id AS topic_id, t.name AS topic_name,
            st.name AS subtopic_name,
            (SELECT COUNT(*)::int FROM screens sc WHERE sc.session_id = s.id) AS screen_count,
            (SELECT sr.release_number
             FROM session_releases sr
             WHERE sr.session_id = s.id
             ORDER BY sr.release_number DESC
             LIMIT 1) AS latest_release_number,
            EXISTS (
              SELECT 1 FROM session_documents sd
              WHERE sd.session_id = s.id AND sd.document_type = 'session_plan' AND sd.is_current = TRUE
            ) AS has_session_plan
     FROM sessions s
     JOIN subtopics st ON st.id = s.subtopic_id
     JOIN topics t ON t.id = st.topic_id
     JOIN chapters ch ON ch.id = t.chapter_id
     JOIN subjects su ON su.id = ch.subject_id
     JOIN grades g ON g.id = su.grade_id
     JOIN programs p ON p.id = g.program_id
     JOIN boards b ON b.id = p.board_id
     WHERE ($1::bigint IS NULL OR s.client_id = $1)
       AND (
         $2::text IS NULL
         OR ($2 = 'published' AND EXISTS (
           SELECT 1 FROM session_releases published_release WHERE published_release.session_id = s.id
         ))
         OR ($2 <> 'published' AND s.status = $2)
       )
     ORDER BY s.updated_at DESC, s.id DESC`,
    [tenantId, normalizedStatus || null],
  );
  return { sessions: result.rows };
};

export const getStudioSession = async ({ sessionId: rawSessionId, user, db = { query: dbQuery } }) =>
  loadSession(db, parseId(rawSessionId, 'Session ID'), user);

export const createStudioSession = async ({
  subtopicId: rawSubtopicId,
  body = {},
  user,
  getDbClient = getClient,
}) => {
  assertAuthor(user);
  const subtopicId = parseId(rawSubtopicId, 'Subtopic ID');
  const title = requiredText(body.title, 'title', 250);
  const description = optionalText(body.description, 'description', 5000);
  const client = await getDbClient();
  try {
    await client.query('BEGIN');
    const context = await loadSubtopicContext(client, subtopicId, user, { lock: true });
    const orderResult = await client.query(
      'SELECT COALESCE(MAX(session_number), 0) + 1 AS next_number FROM sessions WHERE subtopic_id = $1',
      [subtopicId],
    );
    const sessionNumber = Number(orderResult.rows[0].next_number);
    const result = await client.query(
      `INSERT INTO sessions
         (client_id, subtopic_id, session_number, title, description, status, revision_no, created_by)
       VALUES ($1, $2, $3, $4, $5, 'draft', 1, $6)
       RETURNING id, client_id, subtopic_id, session_number, title, description,
                 status, revision_no, created_by, created_at, updated_at`,
      [context.client_id ?? user?.client_id ?? null, subtopicId, sessionNumber, title, description, user?.id ?? null],
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    if (error?.code === '23505') {
      throw new AppError('Another session was created at the same time. Retry the request.', 409, 'SESSION_ORDER_CONFLICT');
    }
    throw error;
  } finally {
    client.release();
  }
};

export const updateStudioSession = async ({ sessionId: rawSessionId, body = {}, user }) => {
  assertAuthor(user);
  const sessionId = parseId(rawSessionId, 'Session ID');
  const expectedRevision = parseId(body.revision_no, 'revision_no');
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const session = await loadSession(client, sessionId, user, { lock: true });
    if (session.status !== 'draft') {
      throw new AppError('Only draft sessions can be edited', 409, 'SESSION_NOT_DRAFT');
    }
    if (Number(session.revision_no) !== expectedRevision) {
      throw new AppError('Session revision is stale; reload before saving', 409, 'STALE_SESSION_REVISION');
    }
    const title = body.title === undefined ? session.title : requiredText(body.title, 'title', 250);
    const description = body.description === undefined
      ? session.description
      : optionalText(body.description, 'description', 5000);
    let subtopicId = session.subtopic_id;
    let sessionNumber = session.session_number;
    if (body.subtopic_id !== undefined) {
      const destinationId = parseId(body.subtopic_id, 'subtopic_id');
      if (destinationId !== Number(session.subtopic_id)) {
        const destination = await loadSubtopicContext(client, destinationId, user, { lock: true });
        if (Number(destination.client_id) !== Number(session.client_id)) {
          throw new AppError('The destination Subtopic is outside this curriculum scope', 403, 'CLIENT_ACCESS_DENIED');
        }
        subtopicId = destinationId;
        sessionNumber = Number((await client.query(
          'SELECT COALESCE(MAX(session_number), 0) + 1 AS value FROM sessions WHERE subtopic_id = $1',
          [destinationId],
        )).rows[0].value);
      }
    }
    const result = await client.query(
      `UPDATE sessions
       SET title = $1, description = $2, subtopic_id = $3, session_number = $4,
           revision_no = revision_no + 1, updated_at = NOW()
       WHERE id = $5 AND revision_no = $6
       RETURNING id, client_id, subtopic_id, session_number, title, description,
                 status, revision_no, created_by, created_at, updated_at`,
      [title, description, subtopicId, sessionNumber, sessionId, expectedRevision],
    );
    if (!result.rows[0]) {
      throw new AppError('Session revision is stale; reload before saving', 409, 'STALE_SESSION_REVISION');
    }
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const deleteStudioSession = async ({
  sessionId: rawSessionId,
  user,
  getDbClient = getClient,
  removeFiles = removeStoredSessionDocuments,
}) => {
  assertAuthor(user);
  const sessionId = parseId(rawSessionId, 'Session ID');
  const client = await getDbClient();
  let storageKeys = [];
  let deleted;
  try {
    await client.query('BEGIN');
    const session = await loadSession(client, sessionId, user, { lock: true });
    if (!['draft', 'rejected'].includes(session.status)) {
      throw new AppError(
        'Only draft or rejected Sessions can be deleted',
        409,
        'SESSION_DELETE_NOT_ALLOWED',
      );
    }
    const release = await client.query(
      'SELECT 1 FROM session_releases WHERE session_id = $1 LIMIT 1',
      [sessionId],
    );
    if (release.rows[0]) {
      throw new AppError(
        'Published Sessions cannot be deleted because their releases are immutable',
        409,
        'PUBLISHED_SESSION_DELETE_FORBIDDEN',
      );
    }
    const documents = await client.query(
      `SELECT storage_key FROM session_documents
       WHERE session_id = $1 AND storage_key IS NOT NULL`,
      [sessionId],
    );
    storageKeys = documents.rows.map((row) => row.storage_key).filter(Boolean);

    // These rows point to immutable document revisions with RESTRICT constraints.
    await client.query('DELETE FROM session_authorizations WHERE session_id = $1', [sessionId]);
    await client.query('DELETE FROM session_validations WHERE session_id = $1', [sessionId]);
    // The live schema keeps restrictive references from Zoom links, branches and
    // Screen Script revisions to Screens. Remove those rows explicitly first.
    await client.query('DELETE FROM screen_zoom_links WHERE session_id = $1', [sessionId]);
    await client.query('DELETE FROM screen_branches WHERE session_id = $1', [sessionId]);
    await client.query('DELETE FROM screen_script_revisions WHERE session_id = $1', [sessionId]);
    // Remaining Screen-owned editor content and resource mappings cascade here.
    await client.query('DELETE FROM screens WHERE session_id = $1', [sessionId]);
    await client.query('DELETE FROM session_documents WHERE session_id = $1', [sessionId]);
    const result = await client.query(
      `DELETE FROM sessions WHERE id = $1
       RETURNING id, title, subtopic_id, session_number`,
      [sessionId],
    );
    deleted = result.rows[0];
    if (!deleted) throw new AppError('Studio session not found', 404, 'SESSION_NOT_FOUND');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error?.code === '23503') {
      throw new AppError(
        'This Session still has related Studio activity and cannot be deleted',
        409,
        'SESSION_DELETE_DEPENDENCY_CONFLICT',
      );
    }
    throw error;
  } finally {
    client.release();
  }

  const storageCleanupComplete = await removeFiles(storageKeys);
  return {
    ...deleted,
    deleted_document_count: storageKeys.length,
    storage_cleanup_complete: storageCleanupComplete,
  };
};
