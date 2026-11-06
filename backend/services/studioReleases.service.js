import { createHash } from 'node:crypto';
import supabase from '../config/supabaseClient.js';
import { getClient, query as dbQuery } from '../repositories/db.repository.js';
import { AppError } from '../utils/errors.js';

const PUBLISHER_ROLES = new Set(['super_admin', 'content_authorizer']);
const parseId = (value, label) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(`${label} must be a positive integer`, 400);
  return id;
};
const assertPublisher = (user) => {
  if (!PUBLISHER_ROLES.has(user?.role)) throw new AppError('Only Content Authorizers can publish Studio Sessions', 403);
};
const assertPublisherTenant = (session, user) => {
  if (user?.role === 'super_admin' || (user?.role === 'content_authorizer' && !user?.client_id)) return;
  if (!user?.client_id || Number(session.client_id) !== Number(user.client_id)) throw new AppError('Access denied', 403);
};
const assertTeacher = (user) => {
  if (user?.role !== 'teacher') throw new AppError('Teacher access required', 403);
  if (!user?.client_id) throw new AppError('Access denied', 403);
};
const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

const loadSessionForPublish = async (db, sessionId) => {
  const result = await db.query(
    `SELECT se.id, se.client_id, se.subtopic_id, se.title, se.description,
            se.status, se.revision_no, se.approved_by, se.approved_at,
            p.id AS program_id, p.school_id AS program_school_id
     FROM sessions se
     JOIN subtopics st ON st.id = se.subtopic_id
     JOIN topics t ON t.id = st.topic_id
     JOIN chapters ch ON ch.id = t.chapter_id
     JOIN subjects su ON su.id = ch.subject_id
     JOIN grades g ON g.id = su.grade_id
     JOIN programs p ON p.id = g.program_id
     WHERE se.id = $1 FOR UPDATE OF se`, [sessionId]
  );
  if (!result.rows[0]) throw new AppError('Studio Session not found', 404);
  return result.rows[0];
};

const loadExactAuthorization = async (db, session) => {
  const result = await db.query(
    `SELECT sa.id AS authorization_id, sa.authorized_by, sa.authorized_at,
            sv.id AS validation_id, sv.session_revision_no,
            sv.session_plan_document_id, sv.screen_script_document_id,
            sv.screen_revisions_json, sv.screen_script_revisions_json
     FROM session_authorizations sa
     JOIN session_validations sv ON sv.id = sa.validation_id
     WHERE sa.session_id = $1 AND sv.session_revision_no = $2 AND sv.is_valid = TRUE
       AND sa.decision = 'authorized' AND sa.invalidated_at IS NULL
     ORDER BY sa.authorized_at DESC, sa.id DESC LIMIT 1`,
    [session.id, session.revision_no]
  );
  if (!result.rows[0]) throw new AppError('The exact current Session revision is not authorized', 409);
  return result.rows[0];
};

const loadDocuments = async (db, sessionId, authorization) => {
  const ids = [authorization.session_plan_document_id, authorization.screen_script_document_id].filter(Boolean);
  if (!authorization.session_plan_document_id) throw new AppError('Authorized Session Plan revision is incomplete', 409);
  const result = await db.query(
    `SELECT id, session_id, document_type, revision_no, source_mode, storage_key,
            original_file_name, content_type, size_bytes, content_sha256,
            manual_content, structured_content, metadata_json, created_by, created_at
     FROM session_documents WHERE session_id = $1 AND id = ANY($2::bigint[])
     ORDER BY document_type`, [sessionId, ids]
  );
  const documents = Object.fromEntries(result.rows.map((row) => [row.document_type, row]));
  if (!documents.session_plan) throw new AppError('Authorized Session Plan revision could not be loaded', 409);
  return documents;
};

const loadScreenScripts = async (db, sessionId, authorization) => {
  const recorded = parseJsonArray(authorization.screen_script_revisions_json);
  const ids = recorded.map((script) => Number(script.script_revision_id)).filter(Number.isInteger);
  if (ids.length === 0) {
    if (authorization.screen_script_document_id) return [];
    throw new AppError('Authorized per-Screen Script revisions are incomplete', 409);
  }
  const result = await db.query(
    `SELECT id, session_id, screen_id, revision_no, source_mode, source_document_id,
            content_json, created_by, created_at
     FROM screen_script_revisions
     WHERE session_id = $1 AND id = ANY($2::bigint[]) ORDER BY screen_id`,
    [sessionId, ids],
  );
  if (result.rows.length !== ids.length) throw new AppError('Authorized Screen Script revisions could not be loaded', 409);
  return result.rows;
};

const loadScreens = async (db, sessionId) => (await db.query(
  `SELECT sc.id, sc.client_id, sc.title, sc.screen_number, sc.display_order,
          sc.creation_mode, sc.revision_no, sc.screen_settings_json, sc.layout_id,
          l.layout_key, l.version_no AS layout_version_no, l.name AS layout_name,
          l.description AS layout_description, l.layout_data_json,
          l.thumbnail_url, l.is_default, l.canvas_width, l.canvas_height, l.safe_margin
   FROM screens sc LEFT JOIN layouts l ON l.id = sc.layout_id
   WHERE sc.session_id = $1 ORDER BY sc.display_order, sc.screen_number, sc.id`, [sessionId]
)).rows;

const assertAuthorizedScreens = (screens, authorization) => {
  const recorded = parseJsonArray(authorization.screen_revisions_json);
  const byId = new Map(recorded.map((screen) => [Number(screen.screen_id), screen]));
  const matches = byId.size === screens.length && screens.every((screen) => {
    const expected = byId.get(Number(screen.id));
    return expected && Number(expected.screen_number) === Number(screen.screen_number) &&
      Number(expected.revision_no) === Number(screen.revision_no);
  });
  if (!matches) throw new AppError('Authorization does not match the current Screen revisions', 409);
};

const loadScreenContent = async (db, screenIds) => {
  if (screenIds.length === 0) return { elements: [], tags: [], branches: [] };
  const [elements, tags, branches] = await Promise.all([
    db.query(
      `SELECT se.screen_id, se.id AS screen_element_id, se.element_key, se.slot_id,
              se.element_type, se.content_json, se.position_json, se.display_order,
              rm.id AS mapping_id, rm.usage_details_json,
              r.id AS resource_id, r.client_id AS resource_client_id,
              r.name AS resource_name, r.description AS resource_description, r.resource_type,
              rv.id AS resource_version_id, rv.version_number, rv.storage_key,
              rv.original_file_name, rv.mime_type, rv.file_size, rv.checksum_sha256,
              rv.thumbnail_storage_key, rv.external_url, rv.width, rv.height,
              rv.duration_seconds, rv.entry_point, rv.metadata_json
       FROM screen_elements se
       LEFT JOIN resource_mappings rm ON rm.screen_id = se.screen_id AND rm.element_id = se.element_key
       LEFT JOIN resources r ON r.id = rm.resource_id
       LEFT JOIN resource_versions rv ON rv.id = rm.resource_version_id AND rv.resource_id = rm.resource_id
       WHERE se.screen_id = ANY($1::int[]) ORDER BY se.screen_id, se.display_order, se.id`, [screenIds]
    ),
    db.query('SELECT screen_id, tag FROM screen_tags WHERE screen_id = ANY($1::int[]) ORDER BY screen_id, tag', [screenIds]),
    db.query(
      `SELECT id, session_id, branch_key, source_screen_id, destination_screen_id,
              trigger_kind, trigger_config_json, return_screen_id,
              restore_screen_state, restore_session_state, display_order
       FROM screen_branches WHERE source_screen_id = ANY($1::int[])
       ORDER BY source_screen_id, display_order, id`, [screenIds]
    ),
  ]);
  for (const row of elements.rows) {
    if (row.mapping_id && !row.resource_version_id) throw new AppError(`Resource mapping ${row.mapping_id} has no pinned Resource version`, 409);
  }
  return { elements: elements.rows, tags: tags.rows, branches: branches.rows };
};

const groupBy = (rows, key) => {
  const grouped = new Map();
  for (const row of rows) {
    const value = Number(row[key]);
    grouped.set(value, [...(grouped.get(value) || []), row]);
  }
  return grouped;
};
const documentManifest = (document) => ({
  document_id: Number(document.id), revision_no: Number(document.revision_no),
  source_mode: document.source_mode, storage_key: document.storage_key,
  original_file_name: document.original_file_name, content_type: document.content_type,
  size_bytes: document.size_bytes === null ? null : Number(document.size_bytes),
  content_sha256: document.content_sha256, manual_content: document.manual_content,
  structured_content: document.structured_content,
  metadata_json: document.metadata_json, created_by: document.created_by, created_at: document.created_at,
});

const buildManifest = ({ session, authorization, documents, screenScripts, screens, content, releaseNumber }) => {
  const elementsByScreen = groupBy(content.elements, 'screen_id');
  const tagsByScreen = groupBy(content.tags, 'screen_id');
  const branchesByScreen = groupBy(content.branches, 'source_screen_id');
  return {
    manifest_version: 2, release_number: releaseNumber,
    session: {
      session_id: Number(session.id), revision_no: Number(session.revision_no),
      client_id: session.client_id, subtopic_id: session.subtopic_id,
      program_id: Number(session.program_id), program_school_id: session.program_school_id,
      title: session.title, description: session.description,
    },
    documents: {
      session_plan: documentManifest(documents.session_plan),
      screen_script: documents.screen_script ? documentManifest(documents.screen_script) : null,
      screen_script_source: documents.screen_script ? documentManifest(documents.screen_script) : null,
    },
    screen_scripts: screenScripts.map((script) => ({
      script_revision_id: Number(script.id), screen_id: Number(script.screen_id),
      revision_no: Number(script.revision_no), source_mode: script.source_mode,
      source_document_id: script.source_document_id ? Number(script.source_document_id) : null,
      content: script.content_json, created_by: script.created_by, created_at: script.created_at,
    })),
    authorization: {
      authorization_id: Number(authorization.authorization_id),
      validation_id: Number(authorization.validation_id),
      authorized_by: authorization.authorized_by, authorized_at: authorization.authorized_at,
    },
    screens: screens.map((screen) => ({
      screen_id: Number(screen.id), revision_no: Number(screen.revision_no),
      client_id: screen.client_id, title: screen.title,
      screen_number: Number(screen.screen_number), display_order: Number(screen.display_order),
      creation_mode: screen.creation_mode, screen_settings_json: screen.screen_settings_json,
      layout: screen.layout_id ? {
        layout_id: Number(screen.layout_id), layout_key: screen.layout_key,
        version_no: Number(screen.layout_version_no), name: screen.layout_name,
        description: screen.layout_description, layout_data_json: screen.layout_data_json,
        thumbnail_url: screen.thumbnail_url, is_default: screen.is_default,
        canvas_width: Number(screen.canvas_width), canvas_height: Number(screen.canvas_height),
        safe_margin: Number(screen.safe_margin),
      } : null,
      elements: (elementsByScreen.get(Number(screen.id)) || []).map((element) => ({
        screen_element_id: Number(element.screen_element_id), element_key: element.element_key,
        slot_id: element.slot_id, element_type: element.element_type,
        content_json: element.content_json, position_json: element.position_json,
        display_order: Number(element.display_order),
        resource_mapping: element.mapping_id ? {
          mapping_id: Number(element.mapping_id), usage_details_json: element.usage_details_json,
          resource_id: Number(element.resource_id), resource_version_id: Number(element.resource_version_id),
          version_number: Number(element.version_number), client_id: element.resource_client_id,
          name: element.resource_name, description: element.resource_description,
          resource_type: element.resource_type, storage_key: element.storage_key,
          original_file_name: element.original_file_name, mime_type: element.mime_type,
          file_size: element.file_size === null ? null : Number(element.file_size),
          checksum_sha256: element.checksum_sha256, thumbnail_storage_key: element.thumbnail_storage_key,
          external_url: element.external_url, width: element.width, height: element.height,
          duration_seconds: element.duration_seconds, entry_point: element.entry_point,
          metadata_json: element.metadata_json,
        } : null,
      })),
      tags: (tagsByScreen.get(Number(screen.id)) || []).map((row) => row.tag),
      branches: branchesByScreen.get(Number(screen.id)) || [],
    })),
  };
};

const serializeRelease = (row) => ({
  id: row.id, client_id: row.client_id, session_id: row.session_id,
  release_number: Number(row.release_number), manifest: row.manifest_json,
  authorization_id: row.authorization_id, validation_id: row.validation_id,
  published_by: row.published_by, published_at: row.published_at,
});

export const listPublishedChapters = async ({ user }) => {
  assertPublisher(user);
  const tenantId = user?.role === 'super_admin' || (user?.role === 'content_authorizer' && !user?.client_id)
    ? null : parseId(user.client_id, 'Client ID');
  const result = await dbQuery(
    `WITH latest AS (
       SELECT DISTINCT ON (sr.session_id)
              sr.id, sr.session_id, sr.release_number, sr.published_at
       FROM session_releases sr
       JOIN sessions tenant_session ON tenant_session.id = sr.session_id
       WHERE ($1::int IS NULL OR tenant_session.client_id = $1)
       ORDER BY sr.session_id, sr.release_number DESC
     )
     SELECT latest.id AS release_id, latest.release_number, latest.published_at,
            se.id AS session_id, se.title AS session_title,
            p.id AS program_id, p.name AS program_name, g.grade_number,
            su.id AS subject_id, su.name AS subject_name,
            ch.id AS chapter_id, ch.name AS chapter_name, ch.chapter_number,
            COUNT(sc.id)::int AS screen_count
     FROM latest
     JOIN sessions se ON se.id = latest.session_id
     JOIN subtopics st ON st.id = se.subtopic_id
     JOIN topics t ON t.id = st.topic_id
     JOIN chapters ch ON ch.id = t.chapter_id
     JOIN subjects su ON su.id = ch.subject_id
     JOIN grades g ON g.id = su.grade_id
     JOIN programs p ON p.id = g.program_id
     LEFT JOIN screens sc ON sc.session_id = se.id
     GROUP BY latest.id, latest.release_number, latest.published_at, se.id, se.title,
              p.id, p.name, g.grade_number, su.id, su.name, ch.id, ch.name, ch.chapter_number
     ORDER BY latest.published_at DESC, ch.chapter_number, se.id`,
    [tenantId],
  );
  return result.rows.map((row) => ({ ...row,
    release_id: Number(row.release_id), release_number: Number(row.release_number),
    session_id: Number(row.session_id), chapter_id: Number(row.chapter_id),
    grade_number: Number(row.grade_number), chapter_number: Number(row.chapter_number),
    screen_count: Number(row.screen_count),
  }));
};

export const publishSessionRelease = async ({ sessionId: rawSessionId, user }) => {
  assertPublisher(user);
  const sessionId = parseId(rawSessionId, 'Session ID');
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const session = await loadSessionForPublish(client, sessionId);
    assertPublisherTenant(session, user);
    if (session.status !== 'approved') throw new AppError('Only approved Sessions can be published', 409);
    const authorization = await loadExactAuthorization(client, session);
    const documents = await loadDocuments(client, session.id, authorization);
    const screenScripts = await loadScreenScripts(client, session.id, authorization);
    const screens = await loadScreens(client, session.id);
    if (screens.length === 0) throw new AppError('At least one Screen is required for publication', 422);
    assertAuthorizedScreens(screens, authorization);
    const content = await loadScreenContent(client, screens.map((screen) => Number(screen.id)));
    const numberResult = await client.query(
      'SELECT COALESCE(MAX(release_number), 0) + 1 AS release_number FROM session_releases WHERE session_id = $1',
      [session.id]
    );
    const releaseNumber = Number(numberResult.rows[0].release_number);
    const manifest = buildManifest({ session, authorization, documents, screenScripts, screens, content, releaseNumber });
    const releaseResult = await client.query(
      `INSERT INTO session_releases
        (client_id, session_id, release_number, session_revision_no,
         validation_id, authorization_id, manifest_json, published_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
       RETURNING id, client_id, session_id, release_number, manifest_json,
                 authorization_id, validation_id, published_by, published_at`,
      [session.client_id, session.id, releaseNumber, session.revision_no,
        authorization.validation_id, authorization.authorization_id, JSON.stringify(manifest), user.id]
    );
    const updateResult = await client.query(
      `UPDATE sessions SET status = 'published', published_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'approved' AND revision_no = $2 RETURNING id`,
      [session.id, session.revision_no]
    );
    if (!updateResult.rows[0]) throw new AppError('Session revision changed; publish again', 409);
    await client.query('COMMIT');
    return serializeRelease(releaseResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
};

const releaseColumns = `id, client_id, session_id, release_number, manifest_json,
  authorization_id, validation_id, published_by, published_at`;

const PUBLISHED_READER_ROLES = new Set([
  'super_admin',
  'content_authorizer',
  'client_admin',
  'school_owner',
  'teacher',
]);

const assertPublishedReader = (user) => {
  if (!PUBLISHED_READER_ROLES.has(user?.role)) throw new AppError('Published Studio access denied', 403);
  const platformAuthor = user.role === 'content_authorizer' && !user.client_id;
  const clientId = Number(user?.client_id);
  if (user.role !== 'super_admin' && !platformAuthor && (!Number.isInteger(clientId) || clientId <= 0)) {
    throw new AppError('Published Studio access denied', 403);
  }
};

const publishedTenantId = (user) => (
  user?.role === 'super_admin' || (user?.role === 'content_authorizer' && !user?.client_id)
    ? null
    : parseId(user.client_id, 'Client ID')
);

const readerSchoolIds = async (user) => {
  if (!['school_owner', 'teacher'].includes(user.role)) return [];
  const roleScopes = user.role === 'teacher' ? ['teacher'] : ['school_owner', 'admin'];
  const result = await dbQuery(
    `SELECT DISTINCT school_id FROM school_memberships
     WHERE user_id = $1 AND status = 'active' AND role_scope = ANY($2::text[])`,
    [user.id, roleScopes]
  );
  return result.rows.map((row) => Number(row.school_id)).filter(Number.isInteger);
};

const assignedProgramIds = async (schoolIds) => {
  if (schoolIds.length === 0) return new Set();
  const result = await dbQuery(
    `SELECT DISTINCT program_id FROM question_bank_school_assignments
     WHERE school_id = ANY($1::int[])`,
    [schoolIds]
  );
  return new Set(result.rows.map((row) => Number(row.program_id)).filter(Number.isInteger));
};

const canReadPublishedRelease = (release, user, schoolIds, programIds) => {
  if (['super_admin', 'content_authorizer', 'client_admin'].includes(user.role)) return true;
  const session = release.manifest_json?.session || {};
  const schoolId = Number(session.program_school_id);
  const programId = Number(session.program_id);
  return (Number.isInteger(schoolId) && schoolIds.includes(schoolId)) ||
    (Number.isInteger(programId) && programIds.has(programId));
};

const publishedAccessContext = async (user) => {
  assertPublishedReader(user);
  const schoolIds = await readerSchoolIds(user);
  return { schoolIds, programIds: await assignedProgramIds(schoolIds) };
};

const assertPublishedReleaseAccess = async (release, user) => {
  const { schoolIds, programIds } = await publishedAccessContext(user);
  if (!canReadPublishedRelease(release, user, schoolIds, programIds)) {
    throw new AppError('Access denied', 403);
  }
};

const serializePublishedRelease = (row) => {
  const manifest = row.manifest_json || {};
  return {
    id: Number(row.id),
    client_id: row.client_id === null ? null : Number(row.client_id),
    session_id: Number(row.session_id),
    release_number: Number(row.release_number),
    published_at: row.published_at,
    // Viewer responses deliberately omit Session Plan, Screen Script and
    // workflow authorization data. Only frozen presentation content is sent.
    manifest: {
      manifest_version: manifest.manifest_version,
      release_number: Number(row.release_number),
      session: manifest.session || null,
      screens: Array.isArray(manifest.screens) ? manifest.screens : [],
    },
  };
};

export const listPublishedSessions = async ({ user }) => {
  assertPublishedReader(user);
  const tenantId = publishedTenantId(user);
  const result = await dbQuery(
    `WITH latest AS (
       SELECT DISTINCT ON (sr.session_id)
              sr.id, sr.client_id, sr.session_id, sr.release_number,
              sr.manifest_json, sr.published_at
       FROM session_releases sr
       WHERE ($1::int IS NULL OR sr.client_id = $1)
       ORDER BY sr.session_id, sr.release_number DESC
     )
     SELECT latest.*, p.id AS program_id, p.name AS program_name,
            g.grade_number, su.id AS subject_id, su.name AS subject_name,
            ch.id AS chapter_id, ch.name AS chapter_name, ch.chapter_number,
            t.id AS topic_id, t.name AS topic_name,
            st.id AS subtopic_id, st.name AS subtopic_name
     FROM latest
     JOIN sessions se ON se.id = latest.session_id
     JOIN subtopics st ON st.id = se.subtopic_id
     JOIN topics t ON t.id = st.topic_id
     JOIN chapters ch ON ch.id = t.chapter_id
     JOIN subjects su ON su.id = ch.subject_id
     JOIN grades g ON g.id = su.grade_id
     JOIN programs p ON p.id = g.program_id
     ORDER BY latest.published_at DESC, latest.session_id`,
    [tenantId]
  );
  const { schoolIds, programIds } = await publishedAccessContext(user);
  return result.rows
    .filter((row) => canReadPublishedRelease(row, user, schoolIds, programIds))
    .map((row) => ({
      release_id: Number(row.id),
      release_number: Number(row.release_number),
      published_at: row.published_at,
      session_id: Number(row.session_id),
      session_title: row.manifest_json?.session?.title || `Session ${row.session_id}`,
      program_id: Number(row.program_id),
      program_name: row.program_name,
      grade_number: Number(row.grade_number),
      subject_id: Number(row.subject_id),
      subject_name: row.subject_name,
      chapter_id: Number(row.chapter_id),
      chapter_name: row.chapter_name,
      chapter_number: Number(row.chapter_number),
      topic_id: Number(row.topic_id),
      topic_name: row.topic_name,
      subtopic_id: Number(row.subtopic_id),
      subtopic_name: row.subtopic_name,
      screen_count: Array.isArray(row.manifest_json?.screens) ? row.manifest_json.screens.length : 0,
    }));
};

const getPublishedRelease = async ({ sessionId: rawSessionId, releaseNumber: rawReleaseNumber, user }) => {
  assertPublishedReader(user);
  const sessionId = parseId(rawSessionId, 'Session ID');
  const releaseNumber = rawReleaseNumber === undefined || rawReleaseNumber === null
    ? null
    : parseId(rawReleaseNumber, 'Release number');
  const tenantId = publishedTenantId(user);
  const result = await dbQuery(
    `SELECT ${releaseColumns} FROM session_releases
     WHERE session_id = $1 AND ($2::int IS NULL OR client_id = $2)
       AND ($3::int IS NULL OR release_number = $3)
     ORDER BY release_number DESC LIMIT 1`,
    [sessionId, tenantId, releaseNumber]
  );
  const release = result.rows[0];
  if (!release) throw new AppError('Published Session release not found', 404);
  await assertPublishedReleaseAccess(release, user);
  return serializePublishedRelease(release);
};

export const getCurrentPublishedRelease = ({ sessionId, user }) =>
  getPublishedRelease({ sessionId, user });

export const getPublishedReleaseByNumber = ({ sessionId, releaseNumber, user }) =>
  getPublishedRelease({ sessionId, releaseNumber, user });

export const listPublishedSessionReleases = async ({ sessionId: rawSessionId, user }) => {
  assertPublishedReader(user);
  const sessionId = parseId(rawSessionId, 'Session ID');
  const tenantId = publishedTenantId(user);
  const result = await dbQuery(
    `SELECT ${releaseColumns} FROM session_releases
     WHERE session_id = $1 AND ($2::int IS NULL OR client_id = $2)
     ORDER BY release_number DESC`,
    [sessionId, tenantId],
  );
  const releases = [];
  for (const row of result.rows) {
    await assertPublishedReleaseAccess(row, user);
    releases.push({
      id: Number(row.id),
      session_id: Number(row.session_id),
      release_number: Number(row.release_number),
      published_at: row.published_at,
      published_by: row.published_by === null ? null : Number(row.published_by),
      screen_count: Array.isArray(row.manifest_json?.screens) ? row.manifest_json.screens.length : 0,
    });
  }
  return releases;
};

export const assertPinnedPublishedResourceAccess = async ({ releaseId: rawReleaseId, versionId: rawVersionId, user }) => {
  assertPublishedReader(user);
  const releaseId = parseId(rawReleaseId, 'Release ID');
  const versionId = parseId(rawVersionId, 'Resource version ID');
  const tenantId = publishedTenantId(user);
  const release = (await dbQuery(
    `SELECT ${releaseColumns} FROM session_releases
     WHERE id = $1 AND ($2::int IS NULL OR client_id = $2) LIMIT 1`,
    [releaseId, tenantId]
  )).rows[0];
  if (!release) throw new AppError('Published Session release not found', 404);
  await assertPublishedReleaseAccess(release, user);
  const pinned = (release.manifest_json?.screens || []).some((screen) =>
    (screen.elements || []).some((element) =>
      Number(element.resource_mapping?.resource_version_id) === versionId));
  if (!pinned) throw new AppError('Resource version is not part of this published release', 403);
  return { release, versionId };
};

export const getPublishedTeachingMaterials = async ({ releaseId: rawReleaseId, user }) => {
  assertPublishedReader(user);
  const releaseId = parseId(rawReleaseId, 'Release ID');
  const tenantId = publishedTenantId(user);
  const release = (await dbQuery(
    `SELECT ${releaseColumns} FROM session_releases
     WHERE id = $1 AND ($2::int IS NULL OR client_id = $2) LIMIT 1`,
    [releaseId, tenantId],
  )).rows[0];
  if (!release) throw new AppError('Published Session release not found', 404);
  await assertPublishedReleaseAccess(release, user);
  const manifest = release.manifest_json || {};
  const plan = manifest.documents?.session_plan;
  const subtopicId = Number(manifest.session?.subtopic_id);
  const curriculum = Number.isInteger(subtopicId) ? (await dbQuery(
    `SELECT ch.id AS chapter_id, cd.id AS document_id, cd.revision_no,
            cd.original_file_name, cd.content_type, cd.size_bytes
     FROM subtopics st
     JOIN topics t ON t.id = st.topic_id
     JOIN chapters ch ON ch.id = t.chapter_id
     LEFT JOIN chapter_curriculum_documents cd
       ON cd.chapter_id = ch.id AND cd.is_current = TRUE
     WHERE st.id = $1 LIMIT 1`,
    [subtopicId],
  )).rows[0] : null;
  return {
    release_id: Number(release.id),
    release_number: Number(release.release_number),
    curriculum: curriculum ? {
      chapter_id: Number(curriculum.chapter_id),
      document_id: curriculum.document_id ? Number(curriculum.document_id) : null,
      revision_no: curriculum.revision_no ? Number(curriculum.revision_no) : null,
      original_file_name: curriculum.original_file_name || null,
      content_type: curriculum.content_type || null,
      size_bytes: curriculum.size_bytes === null ? null : Number(curriculum.size_bytes),
    } : null,
    session_plan: plan ? {
      revision_no: Number(plan.revision_no),
      source_mode: plan.source_mode,
      original_file_name: plan.original_file_name || null,
      content: plan.structured_content || plan.manual_content || null,
    } : null,
  };
};

export const downloadPublishedSessionPlan = async ({ releaseId: rawReleaseId, user }) => {
  const materials = await getPublishedTeachingMaterials({ releaseId: rawReleaseId, user });
  const release = (await dbQuery(
    `SELECT ${releaseColumns} FROM session_releases WHERE id = $1 LIMIT 1`,
    [materials.release_id],
  )).rows[0];
  const plan = release?.manifest_json?.documents?.session_plan;
  if (!plan || plan.source_mode !== 'upload' || !plan.storage_key) {
    throw new AppError('No uploaded Session Plan original is present in this release', 404);
  }
  const bucket = process.env.STUDIO_DOCUMENTS_BUCKET || 'sessions-scripts-plans';
  const { data, error } = await supabase.storage.from(bucket).download(plan.storage_key);
  if (error || !data) throw new AppError('Unable to download the published Session Plan', 502);
  const bytes = Buffer.from(await data.arrayBuffer());
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (bytes.length !== Number(plan.size_bytes) || sha256 !== plan.content_sha256) {
    throw new AppError('Published Session Plan failed integrity verification', 502);
  }
  return {
    bytes,
    fileName: plan.original_file_name || 'session-plan.docx',
    contentType: plan.content_type || 'application/octet-stream',
    sizeBytes: bytes.length,
    sha256,
    revisionNo: Number(plan.revision_no),
  };
};

const assertTeacherReleaseAccess = async (release, user) => {
  const programId = Number(release.manifest_json?.session?.program_id);
  const programSchoolId = Number(release.manifest_json?.session?.program_school_id);
  if (!Number.isInteger(programId)) throw new AppError('Published Session access metadata is incomplete', 409);
  const membership = await dbQuery(
    `SELECT DISTINCT school_id FROM school_memberships
     WHERE user_id = $1 AND status = 'active' AND role_scope = 'teacher'`,
    [user.id]
  );
  const schoolIds = membership.rows.map((row) => Number(row.school_id)).filter(Number.isInteger);
  const ownsProgram = Number.isInteger(programSchoolId) && schoolIds.includes(programSchoolId);
  let hasAssignment = false;
  if (!ownsProgram && schoolIds.length > 0) {
    const assignment = await dbQuery(
      `SELECT 1 FROM question_bank_school_assignments
       WHERE program_id = $1 AND school_id = ANY($2::int[]) LIMIT 1`,
      [programId, schoolIds]
    );
    hasAssignment = assignment.rows.length > 0;
  }
  if (!ownsProgram && !hasAssignment) throw new AppError('Access denied', 403);
};
const getTeacherRelease = async ({ sql, params, user }) => {
  assertTeacher(user);
  const release = (await dbQuery(sql, params)).rows[0];
  if (!release) throw new AppError('Published Session release not found', 404);
  await assertTeacherReleaseAccess(release, user);
  return serializePublishedRelease(release);
};
export const getCurrentTeacherRelease = ({ sessionId: rawSessionId, user }) => {
  const sessionId = parseId(rawSessionId, 'Session ID');
  return getTeacherRelease({
    sql: `SELECT ${releaseColumns} FROM session_releases
          WHERE session_id = $1 AND client_id = $2 ORDER BY release_number DESC LIMIT 1`,
    params: [sessionId, user?.client_id || null], user,
  });
};
export const getTeacherReleaseByNumber = ({ sessionId: rawSessionId, releaseNumber: rawReleaseNumber, user }) => {
  const sessionId = parseId(rawSessionId, 'Session ID');
  const releaseNumber = parseId(rawReleaseNumber, 'Release number');
  return getTeacherRelease({
    sql: `SELECT ${releaseColumns} FROM session_releases
          WHERE session_id = $1 AND release_number = $2 AND client_id = $3 LIMIT 1`,
    params: [sessionId, releaseNumber, user?.client_id || null], user,
  });
};
export const listTeacherReleases = async ({ sessionId: rawSessionId, user }) => {
  const sessionId = parseId(rawSessionId, 'Session ID');
  assertTeacher(user);
  const result = await dbQuery(
    `SELECT id, client_id, session_id, release_number, manifest_json, authorization_id,
            validation_id, published_by, published_at
     FROM session_releases WHERE session_id = $1 AND client_id = $2 ORDER BY release_number DESC`,
    [sessionId, user.client_id]
  );
  if (result.rows[0]) await assertTeacherReleaseAccess(result.rows[0], user);
  return result.rows.map(({ manifest_json: _manifest, ...row }) => ({
    ...row, release_number: Number(row.release_number),
  }));
};
