import { getClient, query as dbQuery } from '../repositories/db.repository.js';
import { AppError } from '../utils/errors.js';
import { returnSessionToDraft } from './studioSessionWorkflow.service.js';

const AUTHOR_ROLES = new Set(['super_admin', 'content_authorizer']);
const RESOURCE_TYPES_BY_ELEMENT = new Map([
  ['visual', new Set(['image', 'animation'])],
  ['media', new Set(['image', 'video', 'animation', 'external_link', 'presentation'])],
  ['simulation', new Set(['simulation', 'html', 'zip', 'scorm', 'external_link'])],
]);
const ELEMENT_TYPES = new Set([
  'title',
  'text',
  'visual',
  'question',
  'response',
  'steps',
  'workspace',
  'footer',
  'simulation',
  'activity',
  'media',
  'graph',
  'data',
  'options',
]);

const parseId = (value, label) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(`${label} must be a positive integer`);
  return id;
};
const parseRevision = (value, label) => parseId(value, label);

const assertAuthor = (user) => {
  if (!AUTHOR_ROLES.has(user?.role))
    throw new AppError('Only Content Authorizers can change Studio screens', 403);
};

const canAccessTenant = (clientId, user) =>
  user?.role === 'super_admin' ||
  (user?.role === 'content_authorizer' && !user?.client_id) ||
  (user?.client_id !== null &&
    user?.client_id !== undefined &&
    Number(clientId) === Number(user.client_id));

const assertTenant = (clientId, user) => {
  if (!canAccessTenant(clientId, user)) throw new AppError('Access denied', 403);
};

const assertObject = (value, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new AppError(`${label} must be an object`);
  return value;
};

const optionalText = (value, label, maxLength) => {
  const text = String(value ?? '').trim();
  if (text.length > maxLength)
    throw new AppError(`${label} must be ${maxLength} characters or fewer`);
  return text;
};

const normalizeTags = (tags) => {
  if (tags === undefined) return undefined;
  if (!Array.isArray(tags)) throw new AppError('tags must be an array');
  const normalized = tags.map((tag) =>
    String(tag || '')
      .trim()
      .toLowerCase(),
  );
  if (normalized.some((tag) => !tag)) throw new AppError('tags cannot contain blank values');
  return [...new Set(normalized)];
};

const normalizePosition = (value, label) => {
  const position = value === undefined ? {} : assertObject(value, label);
  const normalized = { ...position };
  for (const key of ['x', 'y', 'width', 'height']) {
    if (position[key] === undefined) continue;
    const number = Number(position[key]);
    if (!Number.isFinite(number)) throw new AppError(`${label} ${key} must be a number`, 422);
    normalized[key] = number;
  }
  if (normalized.x !== undefined && (normalized.x < 0 || normalized.x > 1920))
    throw new AppError(`${label} x must be inside the 1920 pixel canvas`, 422);
  if (normalized.y !== undefined && (normalized.y < 0 || normalized.y > 1080))
    throw new AppError(`${label} y must be inside the 1080 pixel canvas`, 422);
  if (normalized.width !== undefined && (normalized.width < 80 || normalized.width > 1920))
    throw new AppError(`${label} width must be between 80 and 1920`, 422);
  if (normalized.height !== undefined && (normalized.height < 60 || normalized.height > 1080))
    throw new AppError(`${label} height must be between 60 and 1080`, 422);
  if (normalized.x !== undefined && normalized.width !== undefined && normalized.x + normalized.width > 1920)
    throw new AppError(`${label} extends beyond the right canvas edge`, 422);
  if (normalized.y !== undefined && normalized.height !== undefined && normalized.y + normalized.height > 1080)
    throw new AppError(`${label} extends beyond the bottom canvas edge`, 422);
  if (position.zIndex !== undefined) {
    const zIndex = Number(position.zIndex);
    if (!Number.isInteger(zIndex) || zIndex < 0 || zIndex > 100)
      throw new AppError(`${label} zIndex must be an integer from 0 to 100`, 422);
    normalized.zIndex = zIndex;
  }
  if (position.locked !== undefined && typeof position.locked !== 'boolean')
    throw new AppError(`${label} locked must be true or false`, 422);
  return normalized;
};

const normalizeScreenSettings = (value) => {
  const settings = assertObject(value, 'screen_settings');
  const drawings = settings.author_drawings;
  if (drawings === undefined) return settings;
  assertObject(drawings, 'screen_settings author_drawings');
  if (!Array.isArray(drawings.strokes)) {
    throw new AppError('screen_settings author_drawings strokes must be an array', 422);
  }
  if (drawings.strokes.length > 500) {
    throw new AppError('A Screen can contain at most 500 authored drawing strokes', 422);
  }
  let totalPoints = 0;
  const strokes = drawings.strokes.map((rawStroke, strokeIndex) => {
    const stroke = assertObject(rawStroke, `Drawing stroke ${strokeIndex + 1}`);
    const id = optionalText(stroke.id, `Drawing stroke ${strokeIndex + 1} id`, 150);
    if (!id) throw new AppError(`Drawing stroke ${strokeIndex + 1} id is required`, 422);
    const color = String(stroke.color || '').trim();
    if (!/^#[0-9a-f]{6}$/i.test(color)) {
      throw new AppError(`Drawing stroke ${strokeIndex + 1} color must be a six-digit hex colour`, 422);
    }
    const width = Number(stroke.width);
    if (!Number.isFinite(width) || width < 1 || width > 48) {
      throw new AppError(`Drawing stroke ${strokeIndex + 1} width must be between 1 and 48`, 422);
    }
    if (!Array.isArray(stroke.points) || stroke.points.length === 0 || stroke.points.length > 2000) {
      throw new AppError(`Drawing stroke ${strokeIndex + 1} must contain 1 to 2000 points`, 422);
    }
    totalPoints += stroke.points.length;
    if (totalPoints > 50000) throw new AppError('Authored drawing exceeds the 50000 point Screen limit', 422);
    const points = stroke.points.map((rawPoint, pointIndex) => {
      const point = assertObject(rawPoint, `Drawing stroke ${strokeIndex + 1} point ${pointIndex + 1}`);
      const x = Number(point.x);
      const y = Number(point.y);
      if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1920 || y < 0 || y > 1080) {
        throw new AppError(`Drawing stroke ${strokeIndex + 1} contains a point outside the 1920×1080 canvas`, 422);
      }
      return { x, y };
    });
    return { id, color: color.toLowerCase(), width, points };
  });
  return { ...settings, author_drawings: { ...drawings, strokes } };
};

const normalizeElements = (elements, layout) => {
  if (!Array.isArray(elements)) throw new AppError('elements must be an array');
  const slots = layout
    ? new Map((layout.layout_data_json?.slots || []).map((slot) => [slot.id, slot]))
    : null;
  const keys = new Set();
  return elements.map((raw, index) => {
    const element = assertObject(raw, `Element ${index + 1}`);
    const key = optionalText(element.id, `Element ${index + 1} id`, 150);
    if (!key) throw new AppError(`Element ${index + 1} id is required`);
    if (keys.has(key)) throw new AppError(`Duplicate element id: ${key}`);
    keys.add(key);
    const type = String(element.type || '').trim();
    if (!ELEMENT_TYPES.has(type))
      throw new AppError(`Element ${key} has unsupported type: ${type}`);
    const slotId = String(element.slotId || element.slot_id || '').trim() || null;
    if (slots) {
      if (!slotId || !slots.has(slotId))
        throw new AppError(`Element ${key} uses an unknown layout slot`);
      if (!slots.get(slotId).allowed.includes(type)) {
        throw new AppError(`Element ${key} has an unsupported type for slot ${slotId}`);
      }
    }
    const content =
      element.content === undefined ? {} : assertObject(element.content, `Element ${key} content`);
    const position = normalizePosition(element.position, `Element ${key} position`);
    const resourceInput =
      element.resource ||
      (element.resource_id || element.resource_version_id
        ? {
            resource_id: element.resource_id,
            resource_version_id: element.resource_version_id,
            usage: element.usage,
          }
        : null);
    let resource = null;
    if (resourceInput) {
      assertObject(resourceInput, `Element ${key} resource`);
      resource = {
        resourceId: parseId(resourceInput.resource_id, `Element ${key} resource_id`),
        resourceVersionId: parseId(
          resourceInput.resource_version_id,
          `Element ${key} resource_version_id`,
        ),
        usage:
          resourceInput.usage === undefined
            ? {}
            : assertObject(resourceInput.usage, `Element ${key} usage`),
      };
    }
    return { key, type, slotId, content, position, displayOrder: index, resource };
  });
};

const loadSession = async (db, sessionId, user, { lock = false } = {}) => {
  const result = await db.query(
    `SELECT id, client_id, status, revision_no FROM sessions
     WHERE id = $1 ${lock ? 'FOR UPDATE' : ''}`,
    [sessionId],
  );
  const session = result.rows[0];
  if (!session) throw new AppError('Studio session not found', 404);
  assertTenant(session.client_id, user);
  if (!AUTHOR_ROLES.has(user?.role) && session.status !== 'published') {
    throw new AppError('Studio screens are available to readers only after publishing', 403);
  }
  return session;
};

const loadScreenRow = async (db, screenId, user, { lock = false } = {}) => {
  const result = await db.query(
    `SELECT s.*, se.status AS session_status, se.revision_no AS session_revision_no
     FROM screens s JOIN sessions se ON se.id = s.session_id
     WHERE s.id = $1 ${lock ? 'FOR UPDATE OF s, se' : ''}`,
    [screenId],
  );
  const screen = result.rows[0];
  if (!screen) throw new AppError('Studio screen not found', 404);
  assertTenant(screen.client_id, user);
  if (!AUTHOR_ROLES.has(user?.role) && screen.session_status !== 'published') {
    throw new AppError('Studio screens are available to readers only after publishing', 403);
  }
  return screen;
};

const hydrateScreen = async (db, screen) => {
  const [elementsResult, tagsResult, branchesResult] = await Promise.all([
    db.query(
      `SELECT se.element_key AS id, se.slot_id, se.element_type AS type,
              se.content_json AS content, se.position_json AS position,
              se.display_order, rm.resource_id, rm.resource_version_id,
              rm.usage_details_json AS usage
       FROM screen_elements se
       LEFT JOIN resource_mappings rm
         ON rm.screen_id = se.screen_id AND rm.element_id = se.element_key
       WHERE se.screen_id = $1 ORDER BY se.display_order, se.id`,
      [screen.id],
    ),
    db.query('SELECT tag FROM screen_tags WHERE screen_id = $1 ORDER BY tag', [screen.id]),
    db.query(
      `SELECT branch_key AS id, destination_screen_id, trigger_kind,
              trigger_config_json AS trigger, return_screen_id,
              restore_screen_state, restore_session_state, display_order
       FROM screen_branches WHERE source_screen_id = $1 ORDER BY display_order, id`,
      [screen.id],
    ),
  ]);
  return {
    ...screen,
    revision_no: Number(screen.revision_no),
    elements: elementsResult.rows.map((element) => ({
      id: element.id,
      slotId: element.slot_id,
      type: element.type,
      content: element.content,
      position: element.position,
      ...(element.resource_id
        ? {
            resource: {
              resource_id: Number(element.resource_id),
              resource_version_id: Number(element.resource_version_id),
              usage: element.usage,
            },
          }
        : {}),
    })),
    tags: tagsResult.rows.map((row) => row.tag),
    branches: branchesResult.rows,
  };
};

export const getScreen = async ({ screenId: rawScreenId, user, db = { query: dbQuery } }) => {
  const screen = await loadScreenRow(db, parseId(rawScreenId, 'Screen ID'), user);
  return hydrateScreen(db, screen);
};

export const listSessionScreens = async ({ sessionId: rawSessionId, user }) => {
  const sessionId = parseId(rawSessionId, 'Session ID');
  const session = await loadSession({ query: dbQuery }, sessionId, user);
  const result = await dbQuery(
    'SELECT * FROM screens WHERE session_id = $1 ORDER BY display_order, screen_number, id',
    [session.id],
  );
  const screens = [];
  for (const screen of result.rows) screens.push(await hydrateScreen({ query: dbQuery }, screen));
  return { session_revision_no: Number(session.revision_no), screens };
};

const validateResourceBindings = async (db, elements, clientId) => {
  for (const element of elements.filter((candidate) => candidate.resource)) {
    const result = await db.query(
      `SELECT r.id, r.resource_type
       FROM resources r
       JOIN resource_versions rv ON rv.resource_id = r.id
       WHERE r.id = $1 AND rv.id = $2 AND r.is_active = TRUE
         AND (r.client_id IS NULL OR r.client_id IS NOT DISTINCT FROM $3)`,
      [element.resource.resourceId, element.resource.resourceVersionId, clientId],
    );
    if (!result.rows[0]) {
      throw new AppError(`Element ${element.key} references an unavailable Resource version`, 422);
    }
    const resourceType = result.rows[0].resource_type;
    if (!RESOURCE_TYPES_BY_ELEMENT.get(element.type)?.has(resourceType)) {
      throw new AppError(`Element ${element.key} does not support ${resourceType} Resources`, 422);
    }
    element.resource.resourceType = resourceType;
  }
};

export const saveScreen = async ({ screenId: rawScreenId, body = {}, user }) => {
  assertAuthor(user);
  const screenId = parseId(rawScreenId, 'Screen ID');
  const expectedRevision = parseRevision(body.revision_no, 'revision_no');
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const screen = await loadScreenRow(client, screenId, user, { lock: true });
    if (Number(screen.revision_no) !== expectedRevision) {
      throw new AppError('Screen revision is stale; reload before saving', 409);
    }
    const requestedLayoutId = body.layout_id === undefined
      ? (screen.layout_id ? Number(screen.layout_id) : null)
      : (body.layout_id === null ? null : parseId(body.layout_id, 'layout_id'));
    let layout = null;
    if (requestedLayoutId) {
      const layoutResult = await client.query(
        `SELECT id, client_id, layout_data_json
         FROM layouts
         WHERE id = $1 AND is_active = TRUE`,
        [requestedLayoutId],
      );
      layout = layoutResult.rows[0];
      if (!layout) throw new AppError('The Screen layout version no longer exists', 409);
      assertTenant(layout.client_id, user);
    }
    const elements = normalizeElements(body.elements, layout);
    const tags = normalizeTags(body.tags);
    const settings =
      body.screen_settings === undefined
        ? screen.screen_settings_json
        : normalizeScreenSettings(body.screen_settings);
    await validateResourceBindings(client, elements, screen.client_id);

    const updateResult = await client.query(
      `UPDATE screens
       SET title = $1, screen_settings_json = $2::jsonb,
           layout_id = $3, creation_mode = $4,
           revision_no = revision_no + 1, updated_at = NOW()
       WHERE id = $5 AND revision_no = $6
       RETURNING *`,
      [
        optionalText(body.title ?? screen.title, 'title', 250),
        JSON.stringify(settings),
        requestedLayoutId,
        requestedLayoutId ? 'layout' : 'blank',
        screen.id,
        expectedRevision,
      ],
    );
    if (!updateResult.rows[0])
      throw new AppError('Screen revision is stale; reload before saving', 409);

    await client.query('DELETE FROM screen_elements WHERE screen_id = $1', [screen.id]);
    for (const element of elements) {
      await client.query(
        `INSERT INTO screen_elements (
           screen_id, element_key, slot_id, element_type,
           content_json, position_json, display_order
         ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)`,
        [
          screen.id,
          element.key,
          element.slotId,
          element.type,
          JSON.stringify(element.content),
          JSON.stringify(element.position),
          element.displayOrder,
        ],
      );
      if (element.resource) {
        await client.query(
          `INSERT INTO resource_mappings (
             resource_id, resource_version_id, screen_id, element_id,
             usage_details_json, created_by
           ) VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
          [
            element.resource.resourceId,
            element.resource.resourceVersionId,
            screen.id,
            element.key,
            JSON.stringify({
              ...element.resource.usage,
              slot_id: element.slotId,
              resource_type: element.resource.resourceType,
            }),
            user?.id || null,
          ],
        );
      }
    }
    if (tags !== undefined) {
      await client.query('DELETE FROM screen_tags WHERE screen_id = $1', [screen.id]);
      for (const tag of tags) {
        await client.query('INSERT INTO screen_tags (screen_id, tag) VALUES ($1, $2)', [
          screen.id,
          tag,
        ]);
      }
    }
    const session = await returnSessionToDraft(screen.session_id, client);
    const hydrated = await hydrateScreen(client, updateResult.rows[0]);
    await client.query('COMMIT');
    return { ...hydrated, session_revision_no: Number(session.revision_no) };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const deleteScreen = async ({ screenId: rawScreenId, user }) => {
  assertAuthor(user);
  const screenId = parseId(rawScreenId, 'Screen ID');
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const screen = await loadScreenRow(client, screenId, user, { lock: true });
    const references = await client.query(
      `SELECT COUNT(*)::integer AS count FROM screen_branches
       WHERE destination_screen_id = $1 OR return_screen_id = $1`,
      [screen.id],
    );
    if (Number(references.rows[0].count) > 0) {
      throw new AppError('Remove branches that point to this Screen before deleting it', 409);
    }
    await client.query('DELETE FROM screens WHERE id = $1', [screen.id]);
    const session = await returnSessionToDraft(screen.session_id, client);
    await client.query('COMMIT');
    return { id: screen.id, session_revision_no: Number(session.revision_no) };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
export const reorderScreens = async ({ sessionId: rawSessionId, body = {}, user }) => {
  assertAuthor(user);
  const sessionId = parseId(rawSessionId, 'Session ID');
  const expectedRevision = parseRevision(body.session_revision_no, 'session_revision_no');
  if (!Array.isArray(body.screen_ids) || body.screen_ids.length === 0) {
    throw new AppError('screen_ids must be a non-empty array');
  }
  const screenIds = body.screen_ids.map((id) => parseId(id, 'screen_id'));
  if (new Set(screenIds).size !== screenIds.length)
    throw new AppError('screen_ids cannot contain duplicates');
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const session = await loadSession(client, sessionId, user, { lock: true });
    if (Number(session.revision_no) !== expectedRevision) {
      throw new AppError('Session revision is stale; reload before reordering', 409);
    }
    const existingResult = await client.query(
      'SELECT id FROM screens WHERE session_id = $1 ORDER BY id FOR UPDATE',
      [session.id],
    );
    const existing = existingResult.rows.map((row) => Number(row.id)).sort((a, b) => a - b);
    const requested = [...screenIds].sort((a, b) => a - b);
    if (JSON.stringify(existing) !== JSON.stringify(requested)) {
      throw new AppError('screen_ids must contain every Screen in the Session exactly once', 422);
    }
    for (let index = 0; index < screenIds.length; index += 1) {
      await client.query(
        'UPDATE screens SET display_order = $1, updated_at = NOW() WHERE id = $2 AND session_id = $3',
        [index, screenIds[index], session.id],
      );
    }
    const draft = await returnSessionToDraft(session.id, client);
    await client.query('COMMIT');
    return {
      session_id: session.id,
      session_revision_no: Number(draft.revision_no),
      screen_ids: screenIds,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
