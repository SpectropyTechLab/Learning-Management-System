import { randomUUID } from 'node:crypto';
import supabase from '../config/supabaseClient.js';
import { getClient, query as dbQuery } from '../repositories/db.repository.js';
import { AppError } from '../utils/errors.js';
import { returnSessionToDraft } from './studioSessionWorkflow.service.js';

const BUCKET = process.env.STUDIO_DOCUMENTS_BUCKET || 'sessions-scripts-plans';
const AUTHOR_ROLES = new Set(['super_admin', 'content_authorizer']);
const MAX_SIGNED_URL_SECONDS = 60;

const safeFileName = (value) => String(value || 'document').replace(/[^a-zA-Z0-9._-]+/g, '_');
const isAuthor = (user) => AUTHOR_ROLES.has(user?.role);

const getSession = async (sessionId) => {
  const result = await dbQuery(
    `SELECT id, client_id, status, session_plan_file_url, session_plan_file_name, session_plan_file_type
     FROM sessions WHERE id = $1`,
    [sessionId]
  );
  if (!result.rows[0]) throw new AppError('Studio session not found', 404);
  return result.rows[0];
};

const getScreen = async (screenId) => {
  const result = await dbQuery(
    `SELECT sc.id, sc.client_id, sc.session_id, sc.screen_script_file_url, sc.screen_script_file_name,
            sc.screen_script_file_type, se.status AS session_status
     FROM screens sc JOIN sessions se ON se.id = sc.session_id WHERE sc.id = $1`,
    [screenId]
  );
  if (!result.rows[0]) throw new AppError('Studio screen not found', 404);
  return result.rows[0];
};

const assertTenant = (record, user) => {
  if (user?.role === 'super_admin') return;
  if (user?.role === 'content_authorizer' && !user?.client_id) return;
  if (!user?.client_id || Number(record.client_id) !== Number(user.client_id)) {
    throw new AppError('Access denied', 403);
  }
};

const uploadFile = async ({ file, directory }) => {
  if (!file) throw new AppError('File is required');
  const objectPath = `${directory}/${randomUUID()}-${safeFileName(file.originalname)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, file.buffer, {
    contentType: file.mimetype || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw new AppError(`Unable to upload file to Supabase Storage: ${error.message}`, 502);
  return objectPath;
};

const removeFile = async (objectPath) => {
  if (!objectPath) return;
  const { error } = await supabase.storage.from(BUCKET).remove([objectPath]);
  if (error) console.error('Studio document cleanup failed:', error.message);
};

const getDownload = async (objectPath, filename) => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(objectPath, MAX_SIGNED_URL_SECONDS, { download: filename });
  if (error || !data?.signedUrl) throw new AppError('Unable to create secure download link', 502);
  return { url: data.signedUrl, expires_in_seconds: MAX_SIGNED_URL_SECONDS, file_name: filename };
};

export const uploadSessionPlan = async ({ sessionId, file, user }) => {
  if (!isAuthor(user)) throw new AppError('Only Content Authorizers can upload Session Plans', 403);
  const session = await getSession(sessionId);
  assertTenant(session, user);
  const objectPath = await uploadFile({ file, directory: `sessions/${session.id}/session-plan` });
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE sessions SET session_plan_file_url = $1, session_plan_file_name = $2,
       session_plan_file_type = $3, session_plan_uploaded_at = NOW(), session_plan_content = NULL
       WHERE id = $4 RETURNING id, session_plan_file_url, session_plan_file_name, session_plan_file_type, session_plan_uploaded_at`,
      [objectPath, file.originalname, file.mimetype || 'application/octet-stream', session.id]
    );
    await returnSessionToDraft(session.id, client);
    await client.query('COMMIT');
    await removeFile(session.session_plan_file_url);
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    await removeFile(objectPath);
    throw error;
  } finally {
    client.release();
  }
};

export const uploadScreenScript = async ({ screenId, file, user }) => {
  if (!isAuthor(user)) throw new AppError('Only Content Authorizers can upload Screen Scripts', 403);
  const screen = await getScreen(screenId);
  assertTenant(screen, user);
  const objectPath = await uploadFile({ file, directory: `screens/${screen.id}/screen-script` });
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE screens SET screen_script_file_url = $1, screen_script_file_name = $2,
       screen_script_file_type = $3, screen_script_uploaded_at = NOW(), screen_script_content = NULL
       WHERE id = $4 RETURNING id, screen_script_file_url, screen_script_file_name, screen_script_file_type, screen_script_uploaded_at`,
      [objectPath, file.originalname, file.mimetype || 'application/octet-stream', screen.id]
    );
    await returnSessionToDraft(screen.session_id, client);
    await client.query('COMMIT');
    await removeFile(screen.screen_script_file_url);
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    await removeFile(objectPath);
    throw error;
  } finally {
    client.release();
  }
};

export const downloadSessionPlan = async ({ sessionId, user }) => {
  const session = await getSession(sessionId);
  assertTenant(session, user);
  if (user?.role === 'teacher' && session.status !== 'published') {
    throw new AppError('Teachers can download Session Plans only after publishing', 403);
  }
  if (!isAuthor(user) && user?.role !== 'teacher') throw new AppError('Access denied', 403);
  if (!session.session_plan_file_url) throw new AppError('No uploaded Session Plan is available', 404);
  return getDownload(session.session_plan_file_url, session.session_plan_file_name);
};

export const downloadScreenScript = async ({ screenId, user }) => {
  if (!isAuthor(user)) throw new AppError('Screen Scripts are available only to Content Authorizers', 403);
  const screen = await getScreen(screenId);
  assertTenant(screen, user);
  if (!screen.screen_script_file_url) throw new AppError('No uploaded Screen Script is available', 404);
  return getDownload(screen.screen_script_file_url, screen.screen_script_file_name);
};

export const saveSessionPlanContent = async ({ sessionId, content, user }) => {
  if (!isAuthor(user)) throw new AppError('Only Content Authorizers can save Session Plans', 403);
  if (!content || !['object'].includes(typeof content)) throw new AppError('Session Plan content must be a JSON object or array');
  const session = await getSession(sessionId);
  assertTenant(session, user);
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE sessions SET session_plan_content = $1::jsonb, session_plan_file_url = NULL,
       session_plan_file_name = NULL, session_plan_file_type = NULL, session_plan_uploaded_at = NULL
       WHERE id = $2 RETURNING id, session_plan_content`,
      [JSON.stringify(content), session.id]
    );
    await returnSessionToDraft(session.id, client);
    await client.query('COMMIT');
    await removeFile(session.session_plan_file_url);
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const saveScreenScriptContent = async ({ screenId, content, user }) => {
  if (!isAuthor(user)) throw new AppError('Only Content Authorizers can save Screen Scripts', 403);
  if (!content || !['object'].includes(typeof content)) throw new AppError('Screen Script content must be a JSON object or array');
  const screen = await getScreen(screenId);
  assertTenant(screen, user);
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE screens SET screen_script_content = $1::jsonb, screen_script_file_url = NULL,
       screen_script_file_name = NULL, screen_script_file_type = NULL, screen_script_uploaded_at = NULL
       WHERE id = $2 RETURNING id, screen_script_content`,
      [JSON.stringify(content), screen.id]
    );
    await returnSessionToDraft(screen.session_id, client);
    await client.query('COMMIT');
    await removeFile(screen.screen_script_file_url);
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
