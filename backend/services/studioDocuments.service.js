import { createHash, randomUUID } from 'node:crypto';
import supabase from '../config/supabaseClient.js';
import { getClient, query as dbQuery } from '../repositories/db.repository.js';
import { AppError } from '../utils/errors.js';
import { returnSessionToDraft } from './studioSessionWorkflow.service.js';
import { parseScreenScriptDocx, parseSessionPlanDocx } from './studioDocumentParser.service.js';

const BUCKET = process.env.STUDIO_DOCUMENTS_BUCKET || 'sessions-scripts-plans';
const AUTHOR_ROLES = new Set(['super_admin', 'content_authorizer']);
const DOWNLOAD_ROLES = new Set(['super_admin', 'content_authorizer', 'client_admin', 'school_owner', 'teacher']);
const DOCUMENT_TYPES = new Set(['session_plan', 'screen_script']);
const REQUIRED_PLAN_FIELDS = [
  'time_duration', 'screen_mapped', 'learning_objective_evidence', 'pedagogy',
  'teacher_action_todo', 'narration_dialogue_cue', 'student_action_reflection',
];
const REQUIRED_SCRIPT_FIELDS = ['visual_animation_interaction_assets', 'teacher_narration'];

const isAuthor = (user) => AUTHOR_ROLES.has(user?.role);
const safePathName = (value) => String(value || 'document').replace(/[^a-zA-Z0-9._-]+/g, '_');

const parseId = (value, label) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(`${label} must be a positive integer`);
  return id;
};

const validateDocumentType = (value) => {
  if (!DOCUMENT_TYPES.has(value)) throw new AppError('Unsupported Studio document type');
  return value;
};

const validateSessionPlanContent = (content) => {
  if (!content || typeof content !== 'object' || !Array.isArray(content.rows) || content.rows.length === 0) {
    throw new AppError('Session Plan must contain at least one structured Screen row', 422);
  }
  content.rows.forEach((row, index) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new AppError(`Session Plan row ${index + 1} is invalid`, 422);
    const missing = REQUIRED_PLAN_FIELDS.filter((field) => !String(row[field] || '').trim());
    if (missing.length) throw new AppError(`Session Plan row ${index + 1} is missing: ${missing.join(', ')}`, 422);
  });
  return content;
};

const validateScreenScriptContent = (content) => {
  if (!content || typeof content !== 'object' || Array.isArray(content)) throw new AppError('Screen Script content must be an object', 422);
  const missing = REQUIRED_SCRIPT_FIELDS.filter((field) => !String(content[field] || '').trim());
  if (missing.length) throw new AppError(`Screen Script is missing: ${missing.join(', ')}`, 422);
  return content;
};

const getSession = async (db, sessionId, { lock = false } = {}) => {
  const result = await db.query(
    `SELECT se.id, se.client_id, se.status, p.id AS program_id, p.school_id AS program_school_id
     FROM sessions se
     JOIN subtopics st ON st.id = se.subtopic_id
     JOIN topics t ON t.id = st.topic_id
     JOIN chapters ch ON ch.id = t.chapter_id
     JOIN subjects su ON su.id = ch.subject_id
     JOIN grades g ON g.id = su.grade_id
     JOIN programs p ON p.id = g.program_id
     WHERE se.id = $1
     ${lock ? 'FOR UPDATE OF se' : ''}`,
    [sessionId]
  );
  if (!result.rows[0]) throw new AppError('Studio session not found', 404);
  return result.rows[0];
};

const assertTenant = (session, user) => {
  if (user?.role === 'super_admin') return;
  if (user?.role === 'content_authorizer' && !user?.client_id) return;
  if (!user?.client_id || Number(session.client_id) !== Number(user.client_id)) {
    throw new AppError('Access denied', 403);
  }
};

const assertAuthor = (user) => {
  if (!isAuthor(user)) throw new AppError('Only Content Authorizers can change Studio documents', 403);
};

const assertDownloadAccess = async (session, user) => {
  if (!DOWNLOAD_ROLES.has(user?.role)) throw new AppError('Access denied', 403);
  assertTenant(session, user);
  if (!isAuthor(user) && session.status !== 'published') {
    throw new AppError('Studio documents are available to readers only after publishing', 403);
  }
  if (user?.role === 'school_owner' || user?.role === 'teacher') {
    const roleScopes = user.role === 'teacher' ? ['teacher'] : ['school_owner', 'admin'];
    const membership = await dbQuery(
      `SELECT DISTINCT school_id
       FROM school_memberships
       WHERE user_id = $1 AND status = 'active' AND role_scope = ANY($2::text[])`,
      [user.id, roleScopes]
    );
    const schoolIds = membership.rows.map((row) => Number(row.school_id)).filter(Number.isInteger);
    const ownsProgram = session.program_school_id && schoolIds.includes(Number(session.program_school_id));
    let hasAssignment = false;
    if (!ownsProgram && schoolIds.length > 0) {
      const assignment = await dbQuery(
        `SELECT 1 FROM question_bank_school_assignments
         WHERE program_id = $1 AND school_id = ANY($2::int[]) LIMIT 1`,
        [session.program_id, schoolIds]
      );
      hasAssignment = assignment.rows.length > 0;
    }
    if (!ownsProgram && !hasAssignment) throw new AppError('Access denied', 403);
  }
};

const getCurrentDocument = async (db, sessionId, documentType, { lock = false } = {}) => {
  const result = await db.query(
    `SELECT id, session_id, document_type, revision_no, source_mode, storage_key,
            original_file_name, content_type, size_bytes, content_sha256,
            manual_content, structured_content, metadata_json, created_by, created_at
     FROM session_documents
     WHERE session_id = $1 AND document_type = $2 AND is_current = TRUE
     ${lock ? 'FOR UPDATE' : ''}`,
    [sessionId, documentType]
  );
  return result.rows[0] || null;
};

const uploadFile = async ({ sessionId, documentType, file }) => {
  if (!file?.buffer || file.buffer.length === 0) throw new AppError('A non-empty file is required');
  const objectPath = `sessions/${sessionId}/${documentType}/${randomUUID()}-${safePathName(file.originalname)}`;
  const contentType = file.mimetype || 'application/octet-stream';
  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, file.buffer, {
    contentType,
    upsert: false,
  });
  if (error) throw new AppError(`Unable to upload file to Supabase Storage: ${error.message}`, 502);
  return {
    storageKey: objectPath,
    originalFileName: String(file.originalname || 'document'),
    contentType,
    sizeBytes: file.buffer.length,
    sha256: createHash('sha256').update(file.buffer).digest('hex'),
  };
};

const removeFile = async (objectPath) => {
  if (!objectPath) return;
  const { error } = await supabase.storage.from(BUCKET).remove([objectPath]);
  if (error) console.error('Studio document cleanup failed:', error.message);
};

const createRevision = async ({
  sessionId, documentType, user, upload, manualContent, structuredContent, metadata = {}, afterInsert,
}) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const session = await getSession(client, sessionId, { lock: true });
    assertTenant(session, user);
    const current = await getCurrentDocument(client, session.id, documentType, { lock: true });
    const revisionResult = await client.query(
      `SELECT COALESCE(MAX(revision_no), 0) + 1 AS revision_no
       FROM session_documents
       WHERE session_id = $1 AND document_type = $2`,
      [session.id, documentType]
    );
    const revisionNo = Number(revisionResult.rows[0].revision_no);

    if (current) {
      await client.query('UPDATE session_documents SET is_current = FALSE WHERE id = $1', [current.id]);
    }

    const result = await client.query(
      `INSERT INTO session_documents (
         session_id, document_type, revision_no, source_mode,
         storage_key, original_file_name, content_type, size_bytes,
         content_sha256, manual_content, structured_content, metadata_json, is_current, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, TRUE, $13)
       RETURNING id, session_id, document_type, revision_no, source_mode,
                 storage_key, original_file_name, content_type, size_bytes,
                 content_sha256, manual_content, structured_content, metadata_json, is_current,
                 created_by, created_at`,
      [
        session.id,
        documentType,
        revisionNo,
        upload ? 'upload' : 'manual',
        upload?.storageKey || null,
        upload?.originalFileName || null,
        upload?.contentType || null,
        upload?.sizeBytes ?? null,
        upload?.sha256 || null,
        manualContent === undefined ? null : JSON.stringify(manualContent),
        structuredContent === undefined
          ? (manualContent === undefined ? null : JSON.stringify(manualContent))
          : JSON.stringify(structuredContent),
        JSON.stringify({ metadata_complete: true, ...metadata }),
        user.id || null,
      ]
    );
    const related = afterInsert ? await afterInsert(client, result.rows[0], session) : undefined;
    await returnSessionToDraft(session.id, client);
    await client.query('COMMIT');
    return related === undefined ? result.rows[0] : { ...result.rows[0], related };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const uploadDocument = async ({ sessionId: rawSessionId, documentType: rawType, file, user }) => {
  assertAuthor(user);
  const sessionId = parseId(rawSessionId, 'Session ID');
  const documentType = validateDocumentType(rawType);
  const upload = await uploadFile({ sessionId, documentType, file });
  try {
    return await createRevision({ sessionId, documentType, user, upload });
  } catch (error) {
    await removeFile(upload.storageKey);
    throw error;
  }
};

export const saveDocumentContent = async ({ sessionId: rawSessionId, documentType: rawType, content, user }) => {
  assertAuthor(user);
  const sessionId = parseId(rawSessionId, 'Session ID');
  const documentType = validateDocumentType(rawType);
  if (content === null || typeof content !== 'object') {
    throw new AppError('Studio document content must be a JSON object or array');
  }
  const validated = documentType === 'session_plan' ? validateSessionPlanContent(content) : content;
  return createRevision({ sessionId, documentType, user, manualContent: validated });
};

export const getDocument = async ({ sessionId: rawSessionId, documentType: rawType, user }) => {
  const sessionId = parseId(rawSessionId, 'Session ID');
  const documentType = validateDocumentType(rawType);
  const session = await getSession({ query: dbQuery }, sessionId);
  if (isAuthor(user)) assertTenant(session, user);
  else await assertDownloadAccess(session, user);
  return getCurrentDocument({ query: dbQuery }, session.id, documentType);
};

export const previewSessionPlanImport = async ({ file, user }) => {
  assertAuthor(user);
  return parseSessionPlanDocx(file);
};

export const importSessionPlan = async ({ sessionId: rawSessionId, file, content, user }) => {
  assertAuthor(user);
  const sessionId = parseId(rawSessionId, 'Session ID');
  validateSessionPlanContent(content);
  const upload = await uploadFile({ sessionId, documentType: 'session_plan', file });
  try {
    return await createRevision({
      sessionId,
      documentType: 'session_plan',
      user,
      upload,
      structuredContent: content,
      metadata: { extracted: true, parser: 'mammoth-day10-v1' },
    });
  } catch (error) {
    await removeFile(upload.storageKey);
    throw error;
  }
};

export const previewScreenScriptImport = async ({ sessionId: rawSessionId, file, user }) => {
  assertAuthor(user);
  const sessionId = parseId(rawSessionId, 'Session ID');
  const session = await getSession({ query: dbQuery }, sessionId);
  assertTenant(session, user);
  const [parsed, screensResult] = await Promise.all([
    parseScreenScriptDocx(file),
    dbQuery(
      `SELECT id, screen_number, title, display_order
       FROM screens WHERE session_id = $1 ORDER BY display_order, screen_number, id`,
      [sessionId],
    ),
  ]);
  const byNumber = new Map(screensResult.rows.map((screen) => [Number(screen.screen_number), screen]));
  return {
    ...parsed,
    scripts: parsed.scripts.map((script) => {
      const screen = byNumber.get(Number(script.screen_number));
      return {
        ...script,
        suggested_screen_id: screen ? Number(screen.id) : null,
        suggested_screen_title: screen?.title || null,
        mapping_status: screen ? 'matched' : 'unmatched',
      };
    }),
    available_screens: screensResult.rows.map((screen) => ({
      ...screen,
      id: Number(screen.id),
      screen_number: Number(screen.screen_number),
      display_order: Number(screen.display_order),
    })),
  };
};

const normalizeScriptContent = (value) => {
  return validateScreenScriptContent(value);
};

const createScreenScriptRevision = async ({ db, sessionId, screenId, content, user, sourceDocumentId }) => {
  const screenResult = await db.query(
    'SELECT id FROM screens WHERE id = $1 AND session_id = $2 FOR UPDATE',
    [screenId, sessionId],
  );
  if (!screenResult.rows[0]) throw new AppError(`Screen ${screenId} does not belong to this Session`, 422);
  await db.query('UPDATE screen_script_revisions SET is_current = FALSE WHERE screen_id = $1 AND is_current = TRUE', [screenId]);
  const revisionResult = await db.query(
    'SELECT COALESCE(MAX(revision_no), 0) + 1 AS revision_no FROM screen_script_revisions WHERE screen_id = $1',
    [screenId],
  );
  const result = await db.query(
    `INSERT INTO screen_script_revisions (
       session_id, screen_id, revision_no, source_mode, source_document_id,
       content_json, is_current, created_by
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, TRUE, $7)
     RETURNING id, session_id, screen_id, revision_no, source_mode,
               source_document_id, content_json, is_current, created_by, created_at`,
    [sessionId, screenId, Number(revisionResult.rows[0].revision_no),
      sourceDocumentId ? 'import' : 'manual', sourceDocumentId || null,
      JSON.stringify(normalizeScriptContent(content)), user.id || null],
  );
  return result.rows[0];
};

export const importScreenScripts = async ({ sessionId: rawSessionId, file, mappings, user }) => {
  assertAuthor(user);
  const sessionId = parseId(rawSessionId, 'Session ID');
  if (!Array.isArray(mappings) || mappings.length === 0) {
    throw new AppError('At least one confirmed Screen Script mapping is required');
  }
  const screenIds = mappings.map((mapping) => parseId(mapping.screen_id, 'Screen ID'));
  if (new Set(screenIds).size !== screenIds.length) {
    throw new AppError('Only one imported script can be mapped to each Screen');
  }
  const upload = await uploadFile({ sessionId, documentType: 'screen_script', file });
  try {
    return await createRevision({
      sessionId,
      documentType: 'screen_script',
      user,
      upload,
      structuredContent: { scripts: mappings.map((mapping) => mapping.content) },
      metadata: { extracted: true, parser: 'mammoth-day10-v1', screen_count: mappings.length },
      afterInsert: async (db, sourceDocument) => {
        const revisions = [];
        for (const mapping of mappings) {
          revisions.push(await createScreenScriptRevision({
            db,
            sessionId,
            screenId: parseId(mapping.screen_id, 'Screen ID'),
            content: mapping.content,
            user,
            sourceDocumentId: sourceDocument.id,
          }));
        }
        return { screen_scripts: revisions };
      },
    });
  } catch (error) {
    await removeFile(upload.storageKey);
    throw error;
  }
};

export const saveScreenScript = async ({ sessionId: rawSessionId, screenId: rawScreenId, content, user }) => {
  assertAuthor(user);
  const sessionId = parseId(rawSessionId, 'Session ID');
  const screenId = parseId(rawScreenId, 'Screen ID');
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const session = await getSession(client, sessionId, { lock: true });
    assertTenant(session, user);
    const revision = await createScreenScriptRevision({ db: client, sessionId, screenId, content, user });
    await returnSessionToDraft(sessionId, client);
    await client.query('COMMIT');
    return revision;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const listScreenScripts = async ({ sessionId: rawSessionId, user }) => {
  const sessionId = parseId(rawSessionId, 'Session ID');
  const session = await getSession({ query: dbQuery }, sessionId);
  if (isAuthor(user)) assertTenant(session, user);
  else await assertDownloadAccess(session, user);
  const result = await dbQuery(
    `SELECT sc.id AS screen_id, sc.screen_number, sc.title, sc.display_order,
            ssr.id AS script_revision_id, ssr.revision_no AS script_revision_no,
            ssr.source_mode, ssr.source_document_id, ssr.content_json, ssr.created_at
     FROM screens sc
     LEFT JOIN screen_script_revisions ssr ON ssr.screen_id = sc.id AND ssr.is_current = TRUE
     WHERE sc.session_id = $1 ORDER BY sc.display_order, sc.screen_number, sc.id`,
    [sessionId],
  );
  return result.rows.map((row) => ({
    ...row,
    screen_id: Number(row.screen_id),
    screen_number: Number(row.screen_number),
    display_order: Number(row.display_order),
    script_revision_id: row.script_revision_id ? Number(row.script_revision_id) : null,
    script_revision_no: row.script_revision_no ? Number(row.script_revision_no) : null,
  }));
};

export const downloadDocument = async ({ sessionId: rawSessionId, documentType: rawType, user }) => {
  const sessionId = parseId(rawSessionId, 'Session ID');
  const documentType = validateDocumentType(rawType);
  const session = await getSession({ query: dbQuery }, sessionId);
  await assertDownloadAccess(session, user);
  const document = await getCurrentDocument({ query: dbQuery }, session.id, documentType);
  if (!document || document.source_mode !== 'upload') {
    throw new AppError('No uploaded original is available for this Studio document', 404);
  }
  const { data, error } = await supabase.storage.from(BUCKET).download(document.storage_key);
  if (error || !data) throw new AppError('Unable to download the protected original file', 502);
  const bytes = Buffer.from(await data.arrayBuffer());
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (bytes.length !== Number(document.size_bytes) || sha256 !== document.content_sha256) {
    throw new AppError('Stored Studio document failed integrity verification', 502);
  }
  return {
    bytes,
    fileName: document.original_file_name,
    contentType: document.content_type,
    sizeBytes: bytes.length,
    sha256,
    revisionNo: document.revision_no,
  };
};

export const uploadSessionPlan = (input) => uploadDocument({ ...input, documentType: 'session_plan' });
export const uploadScreenScript = (input) => uploadDocument({ ...input, documentType: 'screen_script' });
export const downloadSessionPlan = (input) => downloadDocument({ ...input, documentType: 'session_plan' });
export const downloadScreenScript = (input) => downloadDocument({ ...input, documentType: 'screen_script' });
export const saveSessionPlanContent = (input) => saveDocumentContent({ ...input, documentType: 'session_plan' });
export const saveScreenScriptContent = (input) => saveDocumentContent({ ...input, documentType: 'screen_script' });
