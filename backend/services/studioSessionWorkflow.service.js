import { getClient, query as dbQuery } from '../repositories/db.repository.js';
import { AppError } from '../utils/errors.js';
import { publishSessionRelease } from './studioReleases.service.js';

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
    `SELECT id, client_id, subtopic_id, title, status, revision_no,
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
    `SELECT id, document_type, revision_no, source_mode
     FROM session_documents
     WHERE session_id = $1 AND is_current = TRUE`,
    [session.id]
  );
  const documents = Object.fromEntries(documentsResult.rows.map((row) => [row.document_type, row]));
  if (!documents.session_plan) {
    errors.push({ code: 'SESSION_PLAN_MISSING', message: 'Session Plan is required.' });
  }
  if (!documents.screen_script) {
    errors.push({ code: 'SCREEN_SCRIPT_MISSING', message: 'A session-level Screen Script is required.' });
  }

  const screensResult = await db.query(
    `SELECT id, screen_number, revision_no
     FROM screens WHERE session_id = $1 ORDER BY display_order, screen_number`,
    [session.id]
  );

  if (screensResult.rows.length === 0) {
    errors.push({ code: 'SCREENS_MISSING', message: 'At least one Screen is required.' });
  }

  return {
    valid: errors.length === 0,
    errors,
    screen_count: screensResult.rows.length,
    exact_revision: {
      session_revision_no: Number(session.revision_no),
      session_plan_document_id: documents.session_plan?.id ?? null,
      session_plan_revision_no: documents.session_plan ? Number(documents.session_plan.revision_no) : null,
      screen_script_document_id: documents.screen_script?.id ?? null,
      screen_script_revision_no: documents.screen_script ? Number(documents.screen_script.revision_no) : null,
      screens: screensResult.rows.map((screen) => ({
        screen_id: Number(screen.id),
        screen_number: Number(screen.screen_number),
        revision_no: Number(screen.revision_no),
      })),
    },
  };
};

const recordValidation = async (db, session, validation, user) => {
  const exact = validation.exact_revision;
  const result = await db.query(
    `INSERT INTO session_validations (
       session_id, session_revision_no, session_plan_document_id,
       screen_script_document_id, screen_revisions_json, is_valid,
       validation_errors_json, validated_by
     ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8)
     RETURNING id, session_id, session_revision_no, is_valid, validated_by, validated_at`,
    [session.id, exact.session_revision_no, exact.session_plan_document_id,
      exact.screen_script_document_id, JSON.stringify(exact.screens), validation.valid,
      JSON.stringify(validation.errors), user?.id || null]
  );
  return result.rows[0];
};

const loadCurrentValidation = async (db, session) => {
  const result = await db.query(
    `SELECT sv.*
     FROM session_validations sv
     WHERE sv.session_id = $1
       AND sv.session_revision_no = $2
       AND sv.is_valid = TRUE
     ORDER BY sv.validated_at DESC, sv.id DESC
     LIMIT 1`,
    [session.id, session.revision_no]
  );
  if (!result.rows[0]) throw new AppError('The current Session revision must be validated first', 409);
  return result.rows[0];
};

const exactRevisionMatches = (validationRow, validation) => {
  const exact = validation.exact_revision;
  const recordedScreens = Array.isArray(validationRow.screen_revisions_json)
    ? validationRow.screen_revisions_json
    : JSON.parse(validationRow.screen_revisions_json || '[]');
  const recordedById = new Map(recordedScreens.map((screen) => [
    Number(screen.screen_id),
    { screen_number: Number(screen.screen_number), revision_no: Number(screen.revision_no) },
  ]));
  const screensMatch = recordedById.size === exact.screens.length && exact.screens.every((screen) => {
    const recorded = recordedById.get(Number(screen.screen_id));
    return recorded?.screen_number === Number(screen.screen_number) &&
      recorded?.revision_no === Number(screen.revision_no);
  });
  return Number(validationRow.session_revision_no) === exact.session_revision_no &&
    Number(validationRow.session_plan_document_id) === Number(exact.session_plan_document_id) &&
    Number(validationRow.screen_script_document_id) === Number(exact.screen_script_document_id) &&
    screensMatch;
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
    const validationRecord = await recordValidation(db, session, validation, user);
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
    return { ...result.rows[0], workflow_state: 'validated', validation, validation_record: validationRecord };
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
    const validationRecord = await loadCurrentValidation(db, session);
    if (!exactRevisionMatches(validationRecord, validation)) {
      throw new AppError('The validated Session revision no longer matches current content', 409);
    }
    const result = await db.query(
      `UPDATE sessions
       SET status = $1, approved_by = $2, approved_at = NOW(),
           approval_comment = $3, published_at = NULL, updated_at = NOW()
       WHERE id = $4 AND status = 'submitted'
       RETURNING id AS session_id, status, approved_by, approved_at, approval_comment`,
      [normalizedDecision, user.id, normalizedComment || null, session.id]
    );
    if (!result.rows[0]) throw new AppError('Session status changed; review again', 409);
    const authorizationResult = await db.query(
      `INSERT INTO session_authorizations (
         session_id, validation_id, decision, comment, authorized_by
       ) VALUES ($1, $2, $3, $4, $5)
       RETURNING id, validation_id, decision, comment, authorized_by, authorized_at`,
      [session.id, validationRecord.id,
        normalizedDecision === 'approved' ? 'authorized' : 'rejected',
        normalizedComment || null, user.id || null]
    );
    return {
      ...result.rows[0],
      workflow_state: normalizedDecision === 'approved' ? 'authorized' : 'saved',
      validation,
      authorization: authorizationResult.rows[0],
    };
  });
};

// Publication has one authoritative transaction: status changes only after the
// immutable release row has been created successfully.
export const publishSession = async ({ sessionId, user }) => {
  const release = await publishSessionRelease({ sessionId, user });
  return { ...release, status: 'published', workflow_state: 'published' };
};

export const getSessionStatus = async ({ sessionId: rawSessionId, user }) => {
  assertWorkflowRole(user);
  const sessionId = parseId(rawSessionId, 'Session ID');
  const session = await loadSession({ query: dbQuery }, sessionId);
  assertTenantAccess(session, user);
  const validation = await validateContent({ query: dbQuery }, session);
  const stateMap = {
    draft: 'saved', rejected: 'saved', submitted: 'validated',
    approved: 'authorized', published: 'published',
  };
  return {
    session_id: session.id,
    status: session.status,
    submitted_by: session.submitted_by,
    submitted_at: session.submitted_at,
    approved_by: session.approved_by,
    approved_at: session.approved_at,
    approval_comment: session.approval_comment,
    published_at: session.published_at,
    revision_no: Number(session.revision_no),
    workflow_state: stateMap[session.status] || session.status,
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
     SET status = 'draft', revision_no = revision_no + 1,
         submitted_by = NULL, submitted_at = NULL,
         approved_by = NULL, approved_at = NULL, approval_comment = NULL,
         published_at = NULL, updated_at = NOW()
     WHERE id = $1
     RETURNING id, status, revision_no`,
    [id]
  );
  if (!result.rows[0]) throw new AppError('Studio session not found', 404);
  return result.rows[0];
};
