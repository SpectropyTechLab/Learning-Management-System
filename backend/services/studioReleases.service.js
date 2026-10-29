import { getClient, query as dbQuery } from '../repositories/db.repository.js';
import { AppError } from '../utils/errors.js';

const PUBLISHER_ROLES = new Set(['super_admin', 'content_authorizer']);

const parseId = (value, label) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(`${label} must be a positive integer`, 400);
  return id;
};

const assertPublisher = (user) => {
  if (!PUBLISHER_ROLES.has(user?.role)) {
    throw new AppError('Only Content Authorizers can publish Studio Sessions', 403);
  }
};

const assertPublisherTenant = (session, user) => {
  if (user?.role === 'super_admin') return;
  if (user?.role === 'content_authorizer' && !user?.client_id) return;
  if (!user?.client_id || Number(session.client_id) !== Number(user.client_id)) {
    throw new AppError('Access denied', 403);
  }
};

const assertTeacherTenant = (release, user) => {
  if (user?.role !== 'teacher') throw new AppError('Teacher access required', 403);
  if (!user?.client_id || Number(release.client_id) !== Number(user.client_id)) {
    throw new AppError('Access denied', 403);
  }
};

const loadSessionForPublish = async (db, sessionId) => {
  const result = await db.query(
    `SELECT id, client_id, subtopic_id, title, description, status,
            session_plan_file_url, session_plan_file_name, session_plan_file_type,
            session_plan_uploaded_at, session_plan_content,
            approved_by, approved_at
     FROM sessions
     WHERE id = $1
     FOR UPDATE`,
    [sessionId]
  );
  if (!result.rows[0]) throw new AppError('Studio Session not found', 404);
  return result.rows[0];
};

const loadScreens = async (db, sessionId) => {
  const result = await db.query(
    `SELECT sc.id, sc.client_id, sc.title, sc.screen_number, sc.display_order,
            sc.layout_id, sc.screen_script_file_url, sc.screen_script_file_name,
            sc.screen_script_file_type, sc.screen_script_uploaded_at, sc.screen_script_content,
            sc.elements_json, sc.branches_json, sc.branch_tags_json, sc.screen_settings_json,
            l.name AS layout_name, l.description AS layout_description,
            l.layout_data_json, l.thumbnail_url, l.is_default
     FROM screens sc
     LEFT JOIN layouts l ON l.id = sc.layout_id
     WHERE sc.session_id = $1
     ORDER BY sc.display_order, sc.screen_number, sc.id`,
    [sessionId]
  );
  return result.rows;
};

const loadResourceMappings = async (db, screenIds) => {
  if (screenIds.length === 0) return [];
  const result = await db.query(
    `SELECT rm.id AS mapping_id, rm.screen_id, rm.element_id, rm.usage_details_json,
            r.id AS resource_id, r.client_id, r.name, r.description, r.resource_type,
            r.file_url, r.file_name, r.file_type, r.file_size, r.thumbnail_url,
            r.external_url, r.resource_data_json, r.version
     FROM resource_mappings rm
     JOIN resources r ON r.id = rm.resource_id
     WHERE rm.screen_id = ANY($1::int[])
     ORDER BY rm.screen_id, rm.id`,
    [screenIds]
  );
  return result.rows;
};

const validateForPublication = (session, screens) => {
  const errors = [];
  const hasPlan = Boolean(session.session_plan_file_url) || session.session_plan_content !== null;
  if (!hasPlan) errors.push({ code: 'SESSION_PLAN_MISSING', message: 'Session Plan is required.' });
  if (screens.length === 0) errors.push({ code: 'SCREENS_MISSING', message: 'At least one Screen is required.' });

  for (const screen of screens) {
    const hasScript = Boolean(screen.screen_script_file_url) || screen.screen_script_content !== null;
    if (!hasScript) {
      errors.push({
        code: 'SCREEN_SCRIPT_MISSING',
        screen_id: screen.id,
        screen_number: screen.screen_number,
        message: `Screen ${screen.screen_number} requires a Screen Script.`,
      });
    }
    if (screen.layout_id && screen.layout_data_json === null) {
      errors.push({
        code: 'LAYOUT_MISSING',
        screen_id: screen.id,
        layout_id: screen.layout_id,
        message: `Layout ${screen.layout_id} used by Screen ${screen.screen_number} was not found.`,
      });
    }
  }

  if (errors.length > 0) {
    const error = new AppError('Session content validation failed', 422);
    error.details = errors;
    throw error;
  }
};

const buildManifest = ({ session, screens, mappings, releaseNumber }) => {
  const mappingsByScreen = new Map();
  for (const mapping of mappings) {
    const entries = mappingsByScreen.get(mapping.screen_id) || [];
    entries.push({
      mapping_id: mapping.mapping_id,
      element_id: mapping.element_id,
      usage_details_json: mapping.usage_details_json,
      resource: {
        resource_id: mapping.resource_id,
        client_id: mapping.client_id,
        version: mapping.version,
        name: mapping.name,
        description: mapping.description,
        resource_type: mapping.resource_type,
        file_url: mapping.file_url,
        file_name: mapping.file_name,
        file_type: mapping.file_type,
        file_size: mapping.file_size,
        thumbnail_url: mapping.thumbnail_url,
        external_url: mapping.external_url,
        resource_data_json: mapping.resource_data_json,
      },
    });
    mappingsByScreen.set(mapping.screen_id, entries);
  }

  return {
    manifest_version: 1,
    release_number: releaseNumber,
    session: {
      session_id: session.id,
      client_id: session.client_id,
      subtopic_id: session.subtopic_id,
      title: session.title,
      description: session.description,
    },
    session_plan: {
      file_url: session.session_plan_file_url,
      file_name: session.session_plan_file_name,
      file_type: session.session_plan_file_type,
      uploaded_at: session.session_plan_uploaded_at,
      content: session.session_plan_content,
    },
    authorization: {
      approved_by: session.approved_by,
      approved_at: session.approved_at,
    },
    screens: screens.map((screen) => ({
      screen_id: screen.id,
      client_id: screen.client_id,
      title: screen.title,
      screen_number: screen.screen_number,
      display_order: screen.display_order,
      screen_script: {
        file_url: screen.screen_script_file_url,
        file_name: screen.screen_script_file_name,
        file_type: screen.screen_script_file_type,
        uploaded_at: screen.screen_script_uploaded_at,
        content: screen.screen_script_content,
      },
      layout: screen.layout_id
        ? {
            layout_id: screen.layout_id,
            name: screen.layout_name,
            description: screen.layout_description,
            layout_data_json: screen.layout_data_json,
            thumbnail_url: screen.thumbnail_url,
            is_default: screen.is_default,
          }
        : null,
      elements_json: screen.elements_json,
      branches_json: screen.branches_json,
      branch_tags_json: screen.branch_tags_json,
      screen_settings_json: screen.screen_settings_json,
      resource_mappings: mappingsByScreen.get(screen.id) || [],
    })),
  };
};

const serializeRelease = (row) => ({
  id: row.id,
  client_id: row.client_id,
  session_id: row.session_id,
  release_number: row.release_number,
  manifest: row.manifest_json,
  approved_by: row.approved_by,
  approved_at: row.approved_at,
  published_by: row.published_by,
  published_at: row.published_at,
});

export const publishSessionRelease = async ({ sessionId: rawSessionId, user }) => {
  assertPublisher(user);
  const sessionId = parseId(rawSessionId, 'Session ID');
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const session = await loadSessionForPublish(client, sessionId);
    assertPublisherTenant(session, user);
    if (session.status !== 'approved') {
      throw new AppError('Only approved Sessions can be published', 409);
    }

    const screens = await loadScreens(client, session.id);
    validateForPublication(session, screens);
    const mappings = await loadResourceMappings(client, screens.map((screen) => screen.id));
    const numberResult = await client.query(
      `SELECT COALESCE(MAX(release_number), 0) + 1 AS release_number
       FROM session_releases
       WHERE session_id = $1`,
      [session.id]
    );
    const releaseNumber = Number(numberResult.rows[0].release_number);
    const manifest = buildManifest({ session, screens, mappings, releaseNumber });
    const releaseResult = await client.query(
      `INSERT INTO session_releases
        (client_id, session_id, release_number, manifest_json,
         approved_by, approved_at, published_by, published_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, NOW())
       RETURNING id, client_id, session_id, release_number, manifest_json,
                 approved_by, approved_at, published_by, published_at`,
      [
        session.client_id,
        session.id,
        releaseNumber,
        JSON.stringify(manifest),
        session.approved_by,
        session.approved_at,
        user.id,
      ]
    );
    await client.query(
      `UPDATE sessions
       SET status = 'published', published_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'approved'`,
      [session.id]
    );
    await client.query('COMMIT');
    return serializeRelease(releaseResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getTeacherRelease = async ({ sql, params, user }) => {
  const result = await dbQuery(sql, params);
  const release = result.rows[0];
  if (!release) throw new AppError('Published Session release not found', 404);
  assertTeacherTenant(release, user);
  return serializeRelease(release);
};

export const getCurrentTeacherRelease = ({ sessionId: rawSessionId, user }) => {
  const sessionId = parseId(rawSessionId, 'Session ID');
  return getTeacherRelease({
    sql: `SELECT id, client_id, session_id, release_number, manifest_json,
                 approved_by, approved_at, published_by, published_at
          FROM session_releases
          WHERE session_id = $1 AND client_id = $2
          ORDER BY release_number DESC
          LIMIT 1`,
    params: [sessionId, user?.client_id || null],
    user,
  });
};

export const getTeacherReleaseByNumber = ({ sessionId: rawSessionId, releaseNumber: rawReleaseNumber, user }) => {
  const sessionId = parseId(rawSessionId, 'Session ID');
  const releaseNumber = parseId(rawReleaseNumber, 'Release number');
  return getTeacherRelease({
    sql: `SELECT id, client_id, session_id, release_number, manifest_json,
                 approved_by, approved_at, published_by, published_at
          FROM session_releases
          WHERE session_id = $1 AND release_number = $2 AND client_id = $3
          LIMIT 1`,
    params: [sessionId, releaseNumber, user?.client_id || null],
    user,
  });
};

export const listTeacherReleases = async ({ sessionId: rawSessionId, user }) => {
  const sessionId = parseId(rawSessionId, 'Session ID');
  if (user?.role !== 'teacher') throw new AppError('Teacher access required', 403);
  if (!user?.client_id) throw new AppError('Access denied', 403);
  const result = await dbQuery(
    `SELECT id, client_id, session_id, release_number,
            approved_by, approved_at, published_by, published_at
     FROM session_releases
     WHERE session_id = $1 AND client_id = $2
     ORDER BY release_number DESC`,
    [sessionId, user.client_id]
  );
  return result.rows;
};
