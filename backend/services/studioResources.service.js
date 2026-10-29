import { createHash, randomUUID } from 'node:crypto';
import supabase from '../config/supabaseClient.js';
import { getClient, query as dbQuery } from '../repositories/db.repository.js';
import { AppError } from '../utils/errors.js';

const BUCKET = process.env.STUDIO_RESOURCES_BUCKET || 'studio-resources';
const AUTHOR_ROLES = new Set(['super_admin', 'content_authorizer']);
const RESOURCE_TYPES = new Set([
  'image', 'video', 'animation', 'simulation', 'external_link', 'html', 'zip', 'scorm',
]);

const parseId = (value, label) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(`${label} must be a positive integer`);
  return id;
};

const optionalPositiveNumber = (value, label) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new AppError(`${label} must be greater than zero`);
  return parsed;
};

const requireText = (value, label, maxLength) => {
  const text = String(value ?? '').trim();
  if (!text) throw new AppError(`${label} is required`);
  if (text.length > maxLength) throw new AppError(`${label} must be ${maxLength} characters or fewer`);
  return text;
};

const parseJsonObject = (value, label) => {
  if (value === undefined || value === null || value === '') return {};
  let parsed = value;
  if (typeof value === 'string') {
    try { parsed = JSON.parse(value); } catch { throw new AppError(`${label} must be valid JSON`); }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new AppError(`${label} must be an object`);
  }
  return parsed;
};

const safePathName = (value) => String(value || 'resource').replace(/[^a-zA-Z0-9._-]+/g, '_');

const assertAuthor = (user) => {
  if (!AUTHOR_ROLES.has(user?.role)) throw new AppError('Only Content Authorizers can change Studio resources', 403);
};

const canAccessTenant = (clientId, user) => (
  user?.role === 'super_admin' ||
  (user?.role === 'content_authorizer' && !user?.client_id) ||
  clientId === null ||
  (user?.client_id !== undefined && user?.client_id !== null && Number(clientId) === Number(user.client_id))
);

const resolveClientId = (user, requested) => {
  if (user?.role === 'super_admin' || (user?.role === 'content_authorizer' && !user?.client_id)) {
    return requested === undefined || requested === null || requested === '' ? null : parseId(requested, 'client_id');
  }
  if (requested !== undefined && Number(requested) !== Number(user?.client_id)) {
    throw new AppError('Access denied', 403);
  }
  return parseId(user?.client_id, 'client_id');
};

const normalizeVersionInput = (body, file) => {
  const externalUrl = String(body.external_url || '').trim() || null;
  if (!file && !externalUrl) throw new AppError('A resource file or external_url is required');
  if (file && externalUrl) throw new AppError('Provide either a resource file or external_url, not both');
  const metadata = parseJsonObject(body.metadata_json, 'metadata_json');
  return {
    externalUrl,
    width: optionalPositiveNumber(body.width, 'width'),
    height: optionalPositiveNumber(body.height, 'height'),
    durationSeconds: optionalPositiveNumber(body.duration_seconds, 'duration_seconds'),
    entryPoint: String(body.entry_point || '').trim() || null,
    metadata,
  };
};

const uploadFile = async (file) => {
  if (!file?.buffer?.length) return null;
  const storageKey = `resources/${randomUUID()}-${safePathName(file.originalname)}`;
  const mimeType = file.mimetype || 'application/octet-stream';
  const { error } = await supabase.storage.from(BUCKET).upload(storageKey, file.buffer, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw new AppError(`Unable to upload Studio resource: ${error.message}`, 502);
  return {
    storageKey,
    originalFileName: String(file.originalname || 'resource'),
    mimeType,
    fileSize: file.buffer.length,
    checksumSha256: createHash('sha256').update(file.buffer).digest('hex'),
  };
};

const removeUpload = async (storageKey) => {
  if (!storageKey) return;
  const { error } = await supabase.storage.from(BUCKET).remove([storageKey]);
  if (error) console.error('Studio resource cleanup failed:', error.message);
};

const loadResource = async (db, resourceId, user, { lock = false } = {}) => {
  const result = await db.query(
    `SELECT id, client_id, name, description, resource_type, is_active, created_by, created_at, updated_at
     FROM resources WHERE id = $1 ${lock ? 'FOR UPDATE' : ''}`,
    [resourceId]
  );
  const resource = result.rows[0];
  if (!resource || !canAccessTenant(resource.client_id, user)) throw new AppError('Studio resource not found', 404);
  return resource;
};

const insertVersion = async (db, { resource, versionNo, upload, versionInput, user }) => {
  const result = await db.query(
    `INSERT INTO resource_versions (
       resource_id, version_number, storage_key, original_file_name, mime_type,
       file_size, checksum_sha256, external_url, width, height,
       duration_seconds, entry_point, metadata_json, uploaded_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14)
     RETURNING *`,
    [resource.id, versionNo, upload?.storageKey || null, upload?.originalFileName || null,
      upload?.mimeType || null, upload?.fileSize ?? null, upload?.checksumSha256 || null,
      versionInput.externalUrl, versionInput.width, versionInput.height,
      versionInput.durationSeconds, versionInput.entryPoint,
      JSON.stringify(versionInput.metadata), user?.id || null]
  );
  return result.rows[0];
};

export const createResource = async ({ body = {}, file, user }) => {
  assertAuthor(user);
  const resourceType = String(body.resource_type || '').trim();
  if (!RESOURCE_TYPES.has(resourceType)) throw new AppError('Unsupported resource_type');
  const versionInput = normalizeVersionInput(body, file);
  if (resourceType === 'external_link' && !versionInput.externalUrl) {
    throw new AppError('external_link resources require external_url');
  }
  const upload = await uploadFile(file);
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const resourceResult = await client.query(
      `INSERT INTO resources (
         client_id, name, description, resource_type, is_active, created_by
       ) VALUES ($1, $2, $3, $4, TRUE, $5)
       RETURNING id, client_id, name, description, resource_type, is_active,
                 created_by, created_at, updated_at`,
      [resolveClientId(user, body.client_id), requireText(body.name, 'name', 250),
        String(body.description || '').trim() || null, resourceType, user?.id || null]
    );
    const resource = resourceResult.rows[0];
    const version = await insertVersion(client, {
      resource, versionNo: 1, upload, versionInput, user,
    });
    await client.query('COMMIT');
    return { ...resource, latest_version: version };
  } catch (error) {
    await client.query('ROLLBACK');
    await removeUpload(upload?.storageKey);
    throw error;
  } finally {
    client.release();
  }
};

export const createResourceVersion = async ({ resourceId: rawResourceId, body = {}, file, user }) => {
  assertAuthor(user);
  const resourceId = parseId(rawResourceId, 'Resource ID');
  const versionInput = normalizeVersionInput(body, file);
  const upload = await uploadFile(file);
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const resource = await loadResource(client, resourceId, user, { lock: true });
    const numberResult = await client.query(
      'SELECT COALESCE(MAX(version_number), 0) + 1 AS version_number FROM resource_versions WHERE resource_id = $1',
      [resource.id]
    );
    const version = await insertVersion(client, {
      resource, versionNo: Number(numberResult.rows[0].version_number), upload, versionInput, user,
    });
    await client.query('COMMIT');
    return { resource_id: resource.id, version };
  } catch (error) {
    await client.query('ROLLBACK');
    await removeUpload(upload?.storageKey);
    throw error;
  } finally {
    client.release();
  }
};

export const listResources = async ({ query = {}, user }) => {
  const allTenants = (user?.role === 'super_admin' || (user?.role === 'content_authorizer' && !user?.client_id)) &&
    !query.client_id;
  const clientId = user?.role === 'super_admin' && query.client_id
    ? parseId(query.client_id, 'client_id')
    : user?.client_id || null;
  const resourceType = query.resource_type ? String(query.resource_type).trim() : null;
  if (resourceType && !RESOURCE_TYPES.has(resourceType)) throw new AppError('Unsupported resource_type');
  const search = String(query.search || '').trim() || null;
  const result = await dbQuery(
    `SELECT r.*, row_to_json(rv) AS latest_version
     FROM resources r
     JOIN LATERAL (
       SELECT * FROM resource_versions candidate
       WHERE candidate.resource_id = r.id
       ORDER BY candidate.version_number DESC LIMIT 1
     ) rv ON TRUE
     WHERE r.is_active = TRUE
       AND ($1::boolean OR r.client_id IS NULL OR r.client_id = $2)
       AND ($3::text IS NULL OR r.resource_type = $3)
       AND ($4::text IS NULL OR r.name ILIKE '%' || $4 || '%')
     ORDER BY r.updated_at DESC, r.id DESC`,
    [allTenants, clientId, resourceType, search]
  );
  return result.rows;
};

export const getResource = async ({ resourceId: rawResourceId, user }) => {
  const resourceId = parseId(rawResourceId, 'Resource ID');
  const resource = await loadResource({ query: dbQuery }, resourceId, user);
  const versions = await dbQuery(
    'SELECT * FROM resource_versions WHERE resource_id = $1 ORDER BY version_number DESC',
    [resource.id]
  );
  return { ...resource, versions: versions.rows };
};

export const getResourceUsages = async ({ resourceId: rawResourceId, user }) => {
  const resourceId = parseId(rawResourceId, 'Resource ID');
  const resource = await loadResource({ query: dbQuery }, resourceId, user);
  const allTenants = user?.role === 'super_admin' || (user?.role === 'content_authorizer' && !user?.client_id);
  const clientId = user?.client_id || null;
  const result = await dbQuery(
    `SELECT rm.id AS placement_id, rm.resource_version_id, rv.version_number,
            rm.screen_id, s.session_id, s.screen_number, s.display_order,
            rm.element_id, se.element_type, rm.usage_details_json
     FROM resource_mappings rm
     JOIN resource_versions rv ON rv.id = rm.resource_version_id AND rv.resource_id = rm.resource_id
     JOIN screens s ON s.id = rm.screen_id
     JOIN screen_elements se ON se.screen_id = rm.screen_id AND se.element_key = rm.element_id
     WHERE rm.resource_id = $1
       AND ($2::boolean OR s.client_id = $3)
     ORDER BY s.session_id, s.display_order, rm.id`,
    [resource.id, allTenants, clientId]
  );
  return {
    resource_id: resource.id,
    placement_count: result.rows.length,
    distinct_screen_count: new Set(result.rows.map((row) => Number(row.screen_id))).size,
    placements: result.rows,
  };
};
