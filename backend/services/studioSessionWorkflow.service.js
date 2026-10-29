import { getClient, query as dbQuery } from '../repositories/db.repository.js';
import { AppError } from '../utils/errors.js';

const WORKFLOW_ROLES = new Set(['super_admin', 'content_authorizer']);
const VALID_REVIEW_DECISIONS = new Set(['approved', 'rejected']);

const parseId = (value, label) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(`${label} must be a positive integer`);
  return id;
};

const assertWorkflowRole = (user) => {
  if (!WORKFLOW_ROLES.has(user?.role)) {
    throw new AppError('Only Content Authorizers can manage the Session workflow', 403);
  }
};

const assertTenantAccess = (session, user) => {
  if (user?.role === 'super_admin') return;
  if (user?.role === 'content_authorizer' && !user?.client_id) return;
  if (!user?.client_id || Number(session.client_id) !== Number(user.client_id)) {
    throw new AppError('Access denied', 403);
  }
};

const loadSession = async (db, sessionId, { lock = false } = {}) => {
  const result = await db.query(
    `SELECT id, client_id, subtopic_id, title, status,
            submitted_by, submitted_at, approved_by, approved_at,
            approval_comment, published_at
     FROM sessions
     WHERE id = $1
     ${lock ? 'FOR UPDATE' : ''}`,
    [sessionId]
  );
  if (!result.rows[0]) throw new AppError('Studio session not found', 404);
  return result.rows[0];
};

const validateContent = async (db, session) => {
  const errors = [];
  const documentsResult = await db.query(
    `SELECT document_type, source_mode
     FROM session_documents
     WHERE session_id = $1 AND is_current = TRUE`,
    [session.id]
  );
  const documentTypes = new Set(documentsResult.rows.map((row) => row.document_type));
  if (!documentTypes.has('session_plan')) {
    errors.push({ code: 'SESSION_PLAN_MISSING', message: 'Session Plan is required.' });
  }
  if (!documentTypes.has('screen_script')) {
    errors.push({ code: 'SCREEN_SCRIPT_MISSING', message: 'A session-level Screen Script is required.' });
  }

  const screensResult = await db.query(
    `SELECT id, screen_number
     FROM screens WHERE session_id = $1 ORDER BY display_order, screen_number`,
    [session.id]
  );

  if (screensResult.rows.length === 0) {
    errors.push({ code: 'SCREENS_MISSING', message: 'At least one Screen is required.' });
  }

  return { valid: errors.length === 0, errors, screen_count: screensResult.rows.length };
};

const throwValidationError = (validation) => {
  if (validation.valid) return;
  const error = new AppError('Session content validation failed', 422);
  error.details = validation.errors;
  throw error;
};

const runTransaction = async (operation) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const submitSession = async ({ sessionId: rawSessionId, user }) => {
  assertWorkflowRole(user);
  const sessionId = parseId(rawSessionId, 'Session ID');
  return runTransaction(async (db) => {
    const session = await loadSession(db, sessionId, { lock: true });
    assertTenantAccess(session, user);
    if (!['draft', 'rejected'].includes(session.status)) {
      throw new AppError('Only draft or rejected Sessions can be submitted', 409);
    }
    const validation = await validateContent(db, session);
    throwValidationError(validation);
    const result = await db.query(
      `UPDATE sessions
       SET status = 'submitted', submitted_by = $1, submitted_at = NOW(),
           approved_by = NULL, approved_at = NULL, approval_comment = NULL,
           published_at = NULL, updated_at = NOW()
       WHERE id = $2 AND status = $3
       RETURNING id AS session_id, status, submitted_by, submitted_at`,
      [user.id, session.id, session.status]
    );
    if (!result.rows[0]) throw new AppError('Session status changed; submit again', 409);
    return { ...result.rows[0], validation };
  });
};

export const reviewSession = async ({ sessionId: rawSessionId, decision, comment, user }) => {
  assertWorkflowRole(user);
  const sessionId = parseId(rawSessionId, 'Session ID');
  const normalizedDecision = String(decision || '').trim().toLowerCase();
  const normalizedComment = typeof comment === 'string' ? comment.trim() : '';
  if (!VALID_REVIEW_DECISIONS.has(normalizedDecision)) {
    throw new AppError('Decision must be approved or rejected');
  }
  if (normalizedDecision === 'rejected' && !normalizedComment) {
    throw new AppError('A rejection comment is required');
  }

  return runTransaction(async (db) => {
    const session = await loadSession(db, sessionId, { lock: true });
    assertTenantAccess(session, user);
    if (session.status !== 'submitted') {
      throw new AppError('Only submitted Sessions can be reviewed', 409);
    }
    const validation = await validateContent(db, session);
    throwValidationError(validation);
    const result = await db.query(
      `UPDATE sessions
       SET status = $1, approved_by = $2, approved_at = NOW(),
           approval_comment = $3, published_at = NULL, updated_at = NOW()
       WHERE id = $4 AND status = 'submitted'
       RETURNING id AS session_id, status, approved_by, approved_at, approval_comment`,
      [normalizedDecision, user.id, normalizedComment || null, session.id]
    );
    if (!result.rows[0]) throw new AppError('Session status changed; review again', 409);
    return { ...result.rows[0], validation };
  });
};

export const publishSession = async ({ sessionId: rawSessionId, user }) => {
  assertWorkflowRole(user);
  const sessionId = parseId(rawSessionId, 'Session ID');
  return runTransaction(async (db) => {
    const session = await loadSession(db, sessionId, { lock: true });
    assertTenantAccess(session, user);
    if (session.status !== 'approved') {
      throw new AppError('Only approved Sessions can be published', 409);
    }
    const validation = await validateContent(db, session);
    throwValidationError(validation);
    const result = await db.query(
      `UPDATE sessions
       SET status = 'published', published_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'approved'
       RETURNING id AS session_id, status, published_at`,
      [session.id]
    );
    if (!result.rows[0]) throw new AppError('Session status changed; publish again', 409);
    return { ...result.rows[0], validation };
  });
};

export const getSessionStatus = async ({ sessionId: rawSessionId, user }) => {
  assertWorkflowRole(user);
  const sessionId = parseId(rawSessionId, 'Session ID');
  const session = await loadSession({ query: dbQuery }, sessionId);
  assertTenantAccess(session, user);
  const validation = await validateContent({ query: dbQuery }, session);
  return {
    session_id: session.id,
    status: session.status,
    submitted_by: session.submitted_by,
    submitted_at: session.submitted_at,
    approved_by: session.approved_by,
    approved_at: session.approved_at,
    approval_comment: session.approval_comment,
    published_at: session.published_at,
    can_submit: ['draft', 'rejected'].includes(session.status) && validation.valid,
    can_review: session.status === 'submitted' && validation.valid,
    can_publish: session.status === 'approved' && validation.valid,
    validation,
  };
};

export const returnSessionToDraft = async (sessionId, db = { query: dbQuery }) => {
  const id = parseId(sessionId, 'Session ID');
  const result = await db.query(
    `UPDATE sessions
     SET status = 'draft', submitted_by = NULL, submitted_at = NULL,
         approved_by = NULL, approved_at = NULL, approval_comment = NULL,
         published_at = NULL, updated_at = NOW()
     WHERE id = $1
     RETURNING id, status`,
    [id]
  );
  if (!result.rows[0]) throw new AppError('Studio session not found', 404);
  return result.rows[0];
};
