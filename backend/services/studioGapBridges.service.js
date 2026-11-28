import { getClient, query as dbQuery } from '../repositories/db.repository.js';
import { AppError } from '../utils/errors.js';
import { returnSessionToDraft } from './studioSessionWorkflow.service.js';

const AUTHOR_ROLES = new Set(['super_admin', 'content_authorizer']);
const MAX_NAME_LENGTH = 120;
const MAX_TITLE_LENGTH = 250;

const parseId = (value, label) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(`${label} must be a positive integer`);
  return id;
};

const parseRevision = (value) => parseId(value, 'source_session_revision_no');

const requiredText = (value, label, maxLength) => {
  const text = String(value ?? '').trim();
  if (!text) throw new AppError(`${label} is required`, 422);
  if (text.length > maxLength) throw new AppError(`${label} must be ${maxLength} characters or fewer`, 422);
  return text;
};

const optionalText = (value, label, maxLength) => {
  if (value === undefined) return undefined;
  return requiredText(value, label, maxLength);
};

const assertAuthor = (user) => {
  if (!AUTHOR_ROLES.has(user?.role)) {
    throw new AppError('Only Content Authorizers can manage Gap Bridges', 403);
  }
};

const canAccessTenant = (clientId, user) =>
  user?.role === 'super_admin' ||
  (user?.role === 'content_authorizer' && !user?.client_id) ||
  (user?.client_id !== null && user?.client_id !== undefined && Number(clientId) === Number(user.client_id));

const assertTenantAccess = (clientId, user) => {
  if (!canAccessTenant(clientId, user)) throw new AppError('Access denied', 403);
};

const sameTenant = (left, right) =>
  (left === null || left === undefined) && (right === null || right === undefined)
    ? true
    : Number(left) === Number(right);

const publishedScreens = (manifest = {}) => [
  ...(Array.isArray(manifest.screens) ? manifest.screens.map((screen) => ({ ...screen, screen_kind: 'main' })) : []),
  ...(Array.isArray(manifest.gap_bridge_screens)
    ? manifest.gap_bridge_screens.map((screen) => ({ ...screen, screen_kind: 'gap_bridge_child' }))
    : []),
];

const normalizedTags = (value) => String(value || '').split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean);
const taxonomyTerms = (screen, type) => Array.isArray(screen?.taxonomy?.[type])
  ? screen.taxonomy[type].map((term) => ({
      code: String(term?.code || term?.label || '').trim().toLowerCase(),
      label: String(term?.label || term?.code || '').trim(),
    })).filter((term) => term.code)
  : [];

const runTransaction = async (operation, getDbClient = getClient) => {
  const client = await getDbClient();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    if (error?.code === '23505') {
      throw new AppError('A Gap Bridge with this name or position already exists', 409, 'GAP_BRIDGE_CONFLICT');
    }
    throw error;
  } finally {
    client.release();
  }
};

const loadSourceScreen = async (db, screenId, user, { lock = false } = {}) => {
  const result = await db.query(
    `SELECT sc.id, sc.session_id, sc.client_id, sc.title, sc.screen_kind,
            se.status AS session_status, se.revision_no AS session_revision_no
     FROM screens sc
     JOIN sessions se ON se.id = sc.session_id
     WHERE sc.id = $1
     ${lock ? 'FOR UPDATE OF sc, se' : ''}`,
    [screenId],
  );
  const source = result.rows[0];
  if (!source) throw new AppError('Source Screen not found', 404);
  assertTenantAccess(source.client_id, user);
  if (source.screen_kind !== 'main') {
    throw new AppError('Gap Bridges can only be attached to a main Screen', 422, 'INVALID_GAP_BRIDGE_SOURCE');
  }
  return source;
};

const assertCurrentRevision = (source, requestedRevision) => {
  if (Number(source.session_revision_no) !== Number(requestedRevision)) {
    throw new AppError(
      'The Session changed since it was loaded; reload before editing Gap Bridges',
      409,
      'SESSION_REVISION_CONFLICT',
      { current_revision_no: Number(source.session_revision_no) },
    );
  }
};

const loadBridge = async (db, bridgeId, user, { lock = false } = {}) => {
  const result = await db.query(
    `SELECT gb.*, sc.client_id, sc.screen_kind,
            se.revision_no AS session_revision_no, child.title AS child_title,
            external.title AS external_session_title
     FROM gap_bridges gb
     JOIN screens sc ON sc.id = gb.source_screen_id
     JOIN sessions se ON se.id = gb.source_session_id
     LEFT JOIN screens child ON child.id = gb.child_screen_id
     LEFT JOIN sessions external ON external.id = gb.external_session_id
     WHERE gb.id = $1
     ${lock ? 'FOR UPDATE OF gb, sc, se' : ''}`,
    [bridgeId],
  );
  const bridge = result.rows[0];
  if (!bridge) throw new AppError('Gap Bridge not found', 404);
  assertTenantAccess(bridge.client_id, user);
  return bridge;
};

const loadLatestPublishedTarget = async (db, { externalSessionId, externalScreenId, source }) => {
  if (Number(externalSessionId) === Number(source.session_id)) {
    throw new AppError('A Gap Bridge cannot target the same Session', 422, 'SAME_SESSION_TARGET');
  }
  const result = await db.query(
    `SELECT sr.id AS release_id, sr.release_number, sr.manifest_json, sr.published_at,
            se.id AS session_id, se.client_id, se.title AS session_title, se.status
     FROM sessions se
     JOIN LATERAL (
       SELECT id, release_number, manifest_json, published_at
       FROM session_releases
       WHERE session_id = se.id
       ORDER BY release_number DESC
       LIMIT 1
     ) sr ON TRUE
     WHERE se.id = $1`,
    [externalSessionId],
  );
  const release = result.rows[0];
  if (!release) {
    throw new AppError('Published target Session not found', 404, 'GAP_BRIDGE_TARGET_NOT_FOUND');
  }
  if (!sameTenant(release.client_id, source.client_id)) {
    throw new AppError('Access denied', 403, 'ACCESS_DENIED');
  }
  const screens = publishedScreens(release.manifest_json);
  const screen = screens.find((item) => Number(item.screen_id) === Number(externalScreenId));
  if (!screen) {
    throw new AppError('Target Screen is not present in the latest published release', 422, 'TARGET_NOT_IN_LATEST_RELEASE');
  }
  return {
    session_id: Number(release.session_id),
    session_title: release.session_title,
    screen_id: Number(screen.screen_id),
    screen_title: screen.title,
    screen_number: screen.screen_number === null ? null : Number(screen.screen_number),
    screen_kind: screen.screen_kind,
    parent_screen_id: screen.parent_screen_id === null || screen.parent_screen_id === undefined
      ? null : Number(screen.parent_screen_id),
    release_id: Number(release.release_id),
    release_number: Number(release.release_number),
    published_at: release.published_at,
  };
};

const nextDisplayOrder = async (db, sourceScreenId) => {
  const result = await db.query(
    `SELECT COALESCE(MAX(display_order), -1) + 1 AS display_order
     FROM gap_bridges WHERE source_screen_id = $1`,
    [sourceScreenId],
  );
  return Number(result.rows[0]?.display_order ?? 0);
};

const bridgeView = (row, externalTarget = null) => ({
  id: Number(row.id),
  source_session_id: Number(row.source_session_id),
  source_screen_id: Number(row.source_screen_id),
  name: row.name,
  target_kind: row.target_kind,
  display_order: Number(row.display_order),
  target: row.target_kind === 'child'
    ? {
        screen_id: Number(row.child_screen_id),
        title: row.child_title ?? row.target_title ?? null,
        screen_kind: 'gap_bridge_child',
      }
    : externalTarget || {
        session_id: Number(row.external_session_id),
        screen_id: Number(row.external_screen_id),
        session_title: row.external_session_title ?? null,
        available: false,
      },
  created_by: row.created_by === null ? null : Number(row.created_by),
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const listGapBridges = async ({ screenId: rawScreenId, user, db = { query: dbQuery } }) => {
  assertAuthor(user);
  const screenId = parseId(rawScreenId, 'Screen ID');
  const source = await loadSourceScreen(db, screenId, user);
  const result = await db.query(
    `SELECT gb.*, child.title AS child_title, external.title AS external_session_title
     FROM gap_bridges gb
     LEFT JOIN screens child ON child.id = gb.child_screen_id
     LEFT JOIN sessions external ON external.id = gb.external_session_id
     WHERE gb.source_screen_id = $1
     ORDER BY gb.display_order, gb.id`,
    [screenId],
  );
  const bridges = [];
  for (const row of result.rows) {
    let target = null;
    if (row.target_kind === 'external') {
      try {
        target = {
          ...(await loadLatestPublishedTarget(db, {
            externalSessionId: row.external_session_id,
            externalScreenId: row.external_screen_id,
            source,
          })),
          available: true,
        };
      } catch (error) {
        if (!['GAP_BRIDGE_TARGET_NOT_FOUND', 'TARGET_NOT_IN_LATEST_RELEASE'].includes(error.code)) throw error;
      }
    }
    bridges.push(bridgeView(row, target));
  }
  return { source_session_revision_no: Number(source.session_revision_no), bridges };
};

export const createExternalGapBridge = async ({ screenId: rawScreenId, body = {}, user, getDbClient }) => {
  assertAuthor(user);
  const screenId = parseId(rawScreenId, 'Screen ID');
  const name = requiredText(body.name, 'name', MAX_NAME_LENGTH);
  const externalSessionId = parseId(body.external_session_id, 'external_session_id');
  const externalScreenId = parseId(body.external_screen_id, 'external_screen_id');
  const revision = parseRevision(body.source_session_revision_no);
  return runTransaction(async (db) => {
    const source = await loadSourceScreen(db, screenId, user, { lock: true });
    assertCurrentRevision(source, revision);
    const target = await loadLatestPublishedTarget(db, { externalSessionId, externalScreenId, source });
    const displayOrder = await nextDisplayOrder(db, screenId);
    const inserted = await db.query(
      `INSERT INTO gap_bridges (
         source_session_id, source_screen_id, name, target_kind,
         external_session_id, external_screen_id, display_order, created_by
       ) VALUES ($1, $2, $3, 'external', $4, $5, $6, $7)
       RETURNING *`,
      [source.session_id, screenId, name, externalSessionId, externalScreenId, displayOrder, user?.id || null],
    );
    const session = await returnSessionToDraft(source.session_id, db);
    return { gap_bridge: bridgeView(inserted.rows[0], { ...target, available: true }), source_session_revision_no: Number(session.revision_no) };
  }, getDbClient);
};

export const createChildGapBridge = async ({ screenId: rawScreenId, body = {}, user, getDbClient }) => {
  assertAuthor(user);
  const screenId = parseId(rawScreenId, 'Screen ID');
  const name = requiredText(body.name, 'name', MAX_NAME_LENGTH);
  const title = optionalText(body.title, 'title', MAX_TITLE_LENGTH) || name;
  if (body.creation_mode !== undefined && body.creation_mode !== 'blank') {
    throw new AppError('Gap Bridge child creation_mode must be blank', 422);
  }
  const revision = parseRevision(body.source_session_revision_no);
  return runTransaction(async (db) => {
    const source = await loadSourceScreen(db, screenId, user, { lock: true });
    assertCurrentRevision(source, revision);
    const displayOrder = await nextDisplayOrder(db, screenId);
    const child = await db.query(
      `INSERT INTO screens (
         client_id, session_id, title, screen_number, screen_settings_json,
         display_order, created_by, creation_mode, revision_no, screen_kind, parent_screen_id
       ) VALUES ($1, $2, $3, NULL, '{}'::jsonb, 0, $4, 'blank', 1, 'gap_bridge_child', $5)
       RETURNING id, title`,
      [source.client_id, source.session_id, title, user?.id || null, screenId],
    );
    const inserted = await db.query(
      `INSERT INTO gap_bridges (
         source_session_id, source_screen_id, name, target_kind,
         child_screen_id, display_order, created_by
       ) VALUES ($1, $2, $3, 'child', $4, $5, $6)
       RETURNING *`,
      [source.session_id, screenId, name, child.rows[0].id, displayOrder, user?.id || null],
    );
    const session = await returnSessionToDraft(source.session_id, db);
    return {
      gap_bridge: bridgeView({ ...inserted.rows[0], child_title: child.rows[0].title }),
      source_session_revision_no: Number(session.revision_no),
    };
  }, getDbClient);
};

export const updateGapBridge = async ({ gapBridgeId: rawBridgeId, body = {}, user, getDbClient }) => {
  assertAuthor(user);
  const bridgeId = parseId(rawBridgeId, 'Gap Bridge ID');
  const revision = parseRevision(body.source_session_revision_no);
  const replacementFields = [
    'target_kind',
    'title',
    'replace_child',
    'external_session_id',
    'external_screen_id',
  ];
  if (replacementFields.some((field) => body[field] !== undefined)) {
    throw new AppError(
      'Gap Bridge targets cannot be replaced; delete the Gap Bridge and create a new one',
      422,
      'GAP_BRIDGE_TARGET_REPLACEMENT_UNSUPPORTED',
    );
  }
  const name = requiredText(body.name, 'name', MAX_NAME_LENGTH);
  return runTransaction(async (db) => {
    const bridge = await loadBridge(db, bridgeId, user, { lock: true });
    assertCurrentRevision(bridge, revision);
    const updated = await db.query(
      `UPDATE gap_bridges
       SET name = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [name, bridgeId],
    );
    const session = await returnSessionToDraft(bridge.source_session_id, db);
    return {
      gap_bridge: bridgeView({ ...bridge, ...updated.rows[0] }),
      source_session_revision_no: Number(session.revision_no),
    };
  }, getDbClient);
};

export const deleteGapBridge = async ({ gapBridgeId: rawBridgeId, body = {}, user, getDbClient }) => {
  assertAuthor(user);
  const bridgeId = parseId(rawBridgeId, 'Gap Bridge ID');
  const revision = parseRevision(body.source_session_revision_no);
  return runTransaction(async (db) => {
    const bridge = await loadBridge(db, bridgeId, user, { lock: true });
    assertCurrentRevision(bridge, revision);
    await db.query('DELETE FROM gap_bridges WHERE id = $1', [bridgeId]);
    if (bridge.target_kind === 'child') {
      await db.query('DELETE FROM screen_script_revisions WHERE screen_id = $1', [bridge.child_screen_id]);
      await db.query('DELETE FROM screens WHERE id = $1', [bridge.child_screen_id]);
    }
    const session = await returnSessionToDraft(bridge.source_session_id, db);
    return { deleted_gap_bridge_id: bridgeId, source_session_revision_no: Number(session.revision_no) };
  }, getDbClient);
};

export const reorderGapBridges = async ({ screenId: rawScreenId, body = {}, user, getDbClient }) => {
  assertAuthor(user);
  const screenId = parseId(rawScreenId, 'Screen ID');
  const revision = parseRevision(body.source_session_revision_no);
  if (!Array.isArray(body.gap_bridge_ids)) throw new AppError('gap_bridge_ids must be an array', 422);
  const ids = body.gap_bridge_ids.map((id) => parseId(id, 'Gap Bridge ID'));
  if (new Set(ids).size !== ids.length) throw new AppError('gap_bridge_ids cannot contain duplicates', 422);
  return runTransaction(async (db) => {
    const source = await loadSourceScreen(db, screenId, user, { lock: true });
    assertCurrentRevision(source, revision);
    const existing = await db.query(
      `SELECT id FROM gap_bridges WHERE source_screen_id = $1 ORDER BY display_order, id FOR UPDATE`,
      [screenId],
    );
    const existingIds = existing.rows.map((row) => Number(row.id));
    if (ids.length !== existingIds.length || ids.some((id) => !existingIds.includes(id))) {
      throw new AppError('gap_bridge_ids must contain every Gap Bridge for the source Screen exactly once', 422);
    }
    await db.query('UPDATE gap_bridges SET display_order = display_order + 1000000 WHERE source_screen_id = $1', [screenId]);
    for (let index = 0; index < ids.length; index += 1) {
      await db.query(
        'UPDATE gap_bridges SET display_order = $1, updated_at = NOW() WHERE id = $2 AND source_screen_id = $3',
        [index, ids[index], screenId],
      );
    }
    const session = await returnSessionToDraft(source.session_id, db);
    return { gap_bridge_ids: ids, source_session_revision_no: Number(session.revision_no) };
  }, getDbClient);
};

export const moveChildGapBridge = async ({ gapBridgeId: rawBridgeId, body = {}, user, getDbClient }) => {
  assertAuthor(user);
  const bridgeId = parseId(rawBridgeId, 'Gap Bridge ID');
  const targetSourceScreenId = parseId(body.target_source_screen_id, 'target_source_screen_id');
  const revision = parseRevision(body.source_session_revision_no);
  return runTransaction(async (db) => {
    const bridge = await loadBridge(db, bridgeId, user, { lock: true });
    assertCurrentRevision(bridge, revision);
    if (bridge.target_kind !== 'child') {
      throw new AppError('Only a local Gap Bridge child can be moved to another parent Screen', 422);
    }
    if (Number(bridge.source_screen_id) === targetSourceScreenId) {
      throw new AppError('The child Screen already belongs to this parent Screen', 422);
    }

    const targetSource = await loadSourceScreen(db, targetSourceScreenId, user, { lock: true });
    if (Number(targetSource.session_id) !== Number(bridge.source_session_id)) {
      throw new AppError('A Gap Bridge child can only move within its current Session', 422);
    }

    const targetDisplayOrder = await nextDisplayOrder(db, targetSourceScreenId);
    await db.query(
      'UPDATE screens SET parent_screen_id = $1, updated_at = NOW() WHERE id = $2',
      [targetSourceScreenId, bridge.child_screen_id],
    );
    const updated = await db.query(
      `UPDATE gap_bridges
       SET source_screen_id = $1, display_order = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [targetSourceScreenId, targetDisplayOrder, bridgeId],
    );

    const remaining = await db.query(
      `SELECT id FROM gap_bridges
       WHERE source_screen_id = $1
       ORDER BY display_order, id
       FOR UPDATE`,
      [bridge.source_screen_id],
    );
    await db.query(
      'UPDATE gap_bridges SET display_order = display_order + 1000000 WHERE source_screen_id = $1',
      [bridge.source_screen_id],
    );
    for (let index = 0; index < remaining.rows.length; index += 1) {
      await db.query(
        'UPDATE gap_bridges SET display_order = $1, updated_at = NOW() WHERE id = $2',
        [index, remaining.rows[index].id],
      );
    }

    const session = await returnSessionToDraft(bridge.source_session_id, db);
    return {
      gap_bridge: bridgeView({ ...updated.rows[0], child_title: bridge.child_title }),
      previous_source_screen_id: Number(bridge.source_screen_id),
      source_session_revision_no: Number(session.revision_no),
    };
  }, getDbClient);
};

export const searchGapBridgeTargets = async ({ query = {}, user, db = { query: dbQuery } }) => {
  assertAuthor(user);
  const sourceSessionId = parseId(query.source_session_id, 'source_session_id');
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100);
  const offset = Math.max(Number(query.cursor) || 0, 0);
  if (!Number.isInteger(offset)) throw new AppError('cursor must be a non-negative integer');
  const search = String(query.search || '').trim().toLowerCase();
  const topicId = query.topic_id ? parseId(query.topic_id, 'topic_id') : null;
  const subtopicId = query.subtopic_id ? parseId(query.subtopic_id, 'subtopic_id') : null;
  const requestedTags = normalizedTags(query.tags);
  const pedagogy = String(query.pedagogy || '').trim().toLowerCase();
  const bloom = String(query.bloom || '').trim().toLowerCase();
  const targetExam = String(query.target_exam || '').trim().toLowerCase();
  const sourceResult = await db.query(
    `SELECT se.id, se.client_id, ch.id AS chapter_id, ch.name AS chapter_name,
            ch.chapter_number
     FROM sessions se
     JOIN subtopics st ON st.id = se.subtopic_id
     JOIN topics t ON t.id = st.topic_id
     JOIN chapters ch ON ch.id = t.chapter_id
     WHERE se.id = $1`,
    [sourceSessionId],
  );
  const source = sourceResult.rows[0];
  if (!source) throw new AppError('Source Session not found', 404);
  assertTenantAccess(source.client_id, user);
  const releases = await db.query(
    `SELECT se.id AS session_id, se.title AS session_title, sr.id AS release_id,
            sr.release_number, sr.published_at, sr.manifest_json,
            ch.id AS chapter_id, ch.name AS chapter_name, ch.chapter_number,
            t.id AS topic_id, t.name AS topic_name,
            st.id AS subtopic_id, st.name AS subtopic_name
     FROM sessions se
     JOIN subtopics st ON st.id = se.subtopic_id
     JOIN topics t ON t.id = st.topic_id
     JOIN chapters ch ON ch.id = t.chapter_id
     JOIN LATERAL (
       SELECT id, release_number, published_at, manifest_json
       FROM session_releases
       WHERE session_id = se.id
       ORDER BY release_number DESC
       LIMIT 1
     ) sr ON TRUE
     WHERE se.id <> $1
       AND se.client_id IS NOT DISTINCT FROM $2
       AND ch.id = $3
       AND ($4::int IS NULL OR t.id = $4)
       AND ($5::int IS NULL OR st.id = $5)
     ORDER BY se.title, se.id`,
    [sourceSessionId, source.client_id, source.chapter_id, topicId, subtopicId],
  );
  const targets = [];
  for (const release of releases.rows) {
    const releaseScreens = publishedScreens(release.manifest_json);
    const mainScreens = new Map(releaseScreens
      .filter((screen) => screen.screen_kind === 'main')
      .map((screen) => [Number(screen.screen_id), screen]));
    for (const screen of releaseScreens) {
      const tags = Array.isArray(screen.tags) ? screen.tags.map((tag) => String(tag).toLowerCase()) : [];
      const pedagogyTerms = taxonomyTerms(screen, 'pedagogy');
      const bloomTerms = taxonomyTerms(screen, 'bloom');
      const targetExamTerms = taxonomyTerms(screen, 'target_exam');
      const haystack = `${release.session_title || ''} ${screen.title || ''} ${release.topic_name || ''} ${release.subtopic_name || ''} ${tags.join(' ')}`.toLowerCase();
      if (search && !haystack.includes(search)) continue;
      if (requestedTags.some((tag) => !tags.includes(tag))) continue;
      if (pedagogy && !pedagogyTerms.some((term) => term.code === pedagogy)) continue;
      if (bloom && !bloomTerms.some((term) => term.code === bloom)) continue;
      if (targetExam && !targetExamTerms.some((term) => term.code === targetExam)) continue;
      const parent = screen.screen_kind === 'gap_bridge_child'
        ? mainScreens.get(Number(screen.parent_screen_id))
        : null;
      targets.push({
        session_id: Number(release.session_id), session_title: release.session_title,
        screen_id: Number(screen.screen_id), screen_title: screen.title,
        screen_number: screen.screen_number === null ? null : Number(screen.screen_number),
        screen_kind: screen.screen_kind,
        parent_screen_id: screen.parent_screen_id === null || screen.parent_screen_id === undefined
          ? null : Number(screen.parent_screen_id),
        parent_screen_title: parent?.title || null,
        parent_screen_number: parent?.screen_number === null || parent?.screen_number === undefined
          ? null : Number(parent.screen_number),
        release_id: Number(release.release_id),
        release_number: Number(release.release_number), published_at: release.published_at,
        topic_id: Number(release.topic_id), topic_name: release.topic_name,
        subtopic_id: Number(release.subtopic_id), subtopic_name: release.subtopic_name,
        chapter_id: Number(release.chapter_id), chapter_name: release.chapter_name,
        chapter_number: Number(release.chapter_number),
        preview_screen: {
          screen_settings_json: screen.screen_settings_json || {},
          layout: screen.layout || null,
          elements: Array.isArray(screen.elements) ? screen.elements : [],
        },
      });
    }
  }
  const items = targets.slice(offset, offset + limit);
  const unfilteredReleases = releases.rows;
  const facetScreens = unfilteredReleases.flatMap((release) => publishedScreens(release.manifest_json));
  const termFacet = (type) => [...new Map(facetScreens
    .flatMap((screen) => taxonomyTerms(screen, type))
    .map((term) => [term.code, term])).values()]
    .sort((left, right) => left.label.localeCompare(right.label));
  return {
    targets: items,
    next_cursor: offset + items.length < targets.length ? String(offset + items.length) : null,
    facets: {
      topics: [...new Map(unfilteredReleases.map((release) => [Number(release.topic_id), {
        id: Number(release.topic_id), name: release.topic_name,
      }])).values()].sort((left, right) => left.name.localeCompare(right.name)),
      subtopics: [...new Map(unfilteredReleases.map((release) => [Number(release.subtopic_id), {
        id: Number(release.subtopic_id), topic_id: Number(release.topic_id), name: release.subtopic_name,
      }])).values()].sort((left, right) => left.name.localeCompare(right.name)),
      pedagogy: termFacet('pedagogy'),
      bloom: termFacet('bloom'),
      target_exam: termFacet('target_exam'),
    },
    context: {
      chapter_id: Number(source.chapter_id),
      chapter_name: source.chapter_name,
      chapter_number: Number(source.chapter_number),
    },
  };
};
