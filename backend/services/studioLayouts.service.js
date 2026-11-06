import { getClient, query as dbQuery } from '../repositories/db.repository.js';
import { AppError } from '../utils/errors.js';
import { returnSessionToDraft } from './studioSessionWorkflow.service.js';

const AUTHOR_ROLES = new Set(['super_admin', 'content_authorizer']);
const ELEMENT_TYPES = new Set([
  'title', 'text', 'visual', 'question', 'response', 'steps', 'workspace',
  'footer', 'simulation', 'activity', 'media', 'graph', 'data', 'options',
  'math', 'shape',
]);
const REGIONS = new Set(['header', 'content', 'footer']);

const parsePositiveInt = (value, label, fallback) => {
  const candidate = value === undefined ? fallback : value;
  const parsed = Number(candidate);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError(`${label} must be a positive integer`);
  return parsed;
};

const parseNonNegativeInt = (value, label, fallback) => {
  const candidate = value === undefined ? fallback : value;
  const parsed = Number(candidate);
  if (!Number.isInteger(parsed) || parsed < 0) throw new AppError(`${label} must be a non-negative integer`);
  return parsed;
};

const requireText = (value, label, maxLength) => {
  const text = String(value ?? '').trim();
  if (!text) throw new AppError(`${label} is required`);
  if (text.length > maxLength) throw new AppError(`${label} must be ${maxLength} characters or fewer`);
  return text;
};

const assertAuthor = (user) => {
  if (!AUTHOR_ROLES.has(user?.role)) throw new AppError('Only Content Authorizers can change Studio layouts or screens', 403);
};

const canReadTenant = (clientId, user) => (
  clientId === null || user?.role === 'super_admin' ||
  (user?.client_id !== null && user?.client_id !== undefined && Number(clientId) === Number(user.client_id)) ||
  (user?.role === 'content_authorizer' && !user?.client_id)
);

const assertTenantAccess = (clientId, user) => {
  if (!canReadTenant(clientId, user)) throw new AppError('Access denied', 403);
};

const resolveWriteClientId = (user, requestedClientId) => {
  if (user?.role === 'super_admin' || (user?.role === 'content_authorizer' && !user?.client_id)) {
    if (requestedClientId === null || requestedClientId === undefined || requestedClientId === '') return null;
    return parsePositiveInt(requestedClientId, 'client_id');
  }
  if (requestedClientId !== undefined && Number(requestedClientId) !== Number(user.client_id)) {
    throw new AppError('Access denied', 403);
  }
  return parsePositiveInt(user?.client_id, 'client_id');
};

const rectanglesOverlap = (left, right) => (
  left.x < right.x + right.width && left.x + left.width > right.x &&
  left.y < right.y + right.height && left.y + left.height > right.y
);

export const validateLayoutDefinition = (input = {}) => {
  const canvasWidth = parsePositiveInt(input.canvas_width, 'canvas_width', 1920);
  const canvasHeight = parsePositiveInt(input.canvas_height, 'canvas_height', 1080);
  const safeMargin = parseNonNegativeInt(input.safe_margin, 'safe_margin', 90);
  if (safeMargin * 2 >= canvasWidth || safeMargin * 2 >= canvasHeight) {
    throw new AppError('safe_margin must leave a usable canvas area');
  }

  const layoutData = input.layout_data_json;
  if (!layoutData || typeof layoutData !== 'object' || Array.isArray(layoutData)) {
    throw new AppError('layout_data_json must be an object');
  }
  if (!Array.isArray(layoutData.slots) || layoutData.slots.length === 0) {
    throw new AppError('layout_data_json.slots must contain at least one slot');
  }

  const slotIds = new Set();
  const slots = layoutData.slots.map((rawSlot, index) => {
    if (!rawSlot || typeof rawSlot !== 'object' || Array.isArray(rawSlot)) {
      throw new AppError(`Slot ${index + 1} must be an object`);
    }
    const id = requireText(rawSlot.id, `Slot ${index + 1} id`, 100);
    if (slotIds.has(id)) throw new AppError(`Duplicate slot id: ${id}`);
    slotIds.add(id);
    const label = requireText(rawSlot.label, `Slot ${id} label`, 150);
    const region = String(rawSlot.region || '').trim();
    if (!REGIONS.has(region)) throw new AppError(`Slot ${id} has an invalid region`);
    if (!Array.isArray(rawSlot.allowed) || rawSlot.allowed.length === 0) {
      throw new AppError(`Slot ${id} must allow at least one element type`);
    }
    const allowed = [...new Set(rawSlot.allowed.map((value) => String(value).trim()))];
    const unsupported = allowed.find((type) => !ELEMENT_TYPES.has(type));
    if (unsupported) throw new AppError(`Slot ${id} has unsupported element type: ${unsupported}`);
    const bounds = rawSlot.bounds;
    if (!bounds || typeof bounds !== 'object' || Array.isArray(bounds)) {
      throw new AppError(`Slot ${id} bounds are required`);
    }
    const normalizedBounds = {
      x: parseNonNegativeInt(bounds.x, `Slot ${id} x`),
      y: parseNonNegativeInt(bounds.y, `Slot ${id} y`),
      width: parsePositiveInt(bounds.width, `Slot ${id} width`),
      height: parsePositiveInt(bounds.height, `Slot ${id} height`),
    };
    if (normalizedBounds.x + normalizedBounds.width > canvasWidth ||
        normalizedBounds.y + normalizedBounds.height > canvasHeight) {
      throw new AppError(`Slot ${id} exceeds the canvas dimensions`);
    }
    return { ...rawSlot, id, label, region, allowed, bounds: normalizedBounds };
  });

  for (let left = 0; left < slots.length; left += 1) {
    for (let right = left + 1; right < slots.length; right += 1) {
      if (rectanglesOverlap(slots[left].bounds, slots[right].bounds)) {
        throw new AppError(`Slots ${slots[left].id} and ${slots[right].id} overlap`);
      }
    }
  }

  const layoutKey = requireText(input.layout_key, 'layout_key', 40);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(layoutKey)) {
    throw new AppError('layout_key may contain only letters, numbers, hyphens and underscores');
  }

  return {
    layoutKey,
    name: requireText(input.name, 'name', 150),
    description: input.description === undefined ? null : String(input.description || '').trim() || null,
    thumbnailUrl: input.thumbnail_url === undefined ? null : String(input.thumbnail_url || '').trim() || null,
    layoutData: { ...layoutData, slots },
    canvasWidth,
    canvasHeight,
    safeMargin,
  };
};

const normalizeLayoutRow = (row) => ({
  ...row,
  canvas_width: Number(row.canvas_width),
  canvas_height: Number(row.canvas_height),
  safe_margin: Number(row.safe_margin),
  version_no: Number(row.version_no),
});

export const listLayouts = async ({ user, query = {} }) => {
  const includeHistory = query.include_history === 'true' || query.include_history === '1';
  const clientId = user?.role === 'super_admin' && query.client_id
    ? parsePositiveInt(query.client_id, 'client_id')
    : user?.client_id || null;
  const result = await dbQuery(
    `WITH visible AS (
       SELECT l.*,
              ROW_NUMBER() OVER (
                PARTITION BY COALESCE(l.client_id, 0), LOWER(l.layout_key)
                ORDER BY l.version_no DESC
              ) AS version_rank
       FROM layouts l
       WHERE l.is_active = TRUE
         AND (l.client_id IS NULL OR l.client_id = $1)
     )
     SELECT * FROM visible
     WHERE $2::boolean OR version_rank = 1
     ORDER BY is_default DESC, layout_key, version_no DESC`,
    [clientId, includeHistory]
  );
  return result.rows.map(normalizeLayoutRow);
};

export const getLayout = async ({ layoutId, user, db = { query: dbQuery }, lock = false }) => {
  const id = parsePositiveInt(layoutId, 'Layout ID');
  const result = await db.query(
    `SELECT * FROM layouts WHERE id = $1 ${lock ? 'FOR UPDATE' : ''}`,
    [id]
  );
  if (!result.rows[0] || !canReadTenant(result.rows[0].client_id, user)) {
    throw new AppError('Studio layout not found', 404);
  }
  return normalizeLayoutRow(result.rows[0]);
};

export const createLayout = async ({ body, user }) => {
  assertAuthor(user);
  const definition = validateLayoutDefinition(body);
  const clientId = resolveWriteClientId(user, body.client_id);
  const existing = await dbQuery(
    `SELECT id FROM layouts
     WHERE client_id IS NOT DISTINCT FROM $1 AND LOWER(layout_key) = LOWER($2)
     LIMIT 1`,
    [clientId, definition.layoutKey]
  );
  if (existing.rows[0]) {
    throw new AppError(
      'A layout with this key already exists. Open that custom layout and create a new revision instead.',
      409,
      'LAYOUT_KEY_EXISTS'
    );
  }
  const result = await dbQuery(
    `INSERT INTO layouts (
       client_id, layout_key, version_no, name, description, layout_data_json,
       thumbnail_url, is_default, is_active, created_by,
       canvas_width, canvas_height, safe_margin
     ) VALUES ($1, $2, 1, $3, $4, $5::jsonb, $6, $7, TRUE, $8, $9, $10, $11)
     RETURNING *`,
    [clientId, definition.layoutKey, definition.name, definition.description,
      JSON.stringify(definition.layoutData), definition.thumbnailUrl, body.is_default === true,
      user.id || null, definition.canvasWidth, definition.canvasHeight, definition.safeMargin]
  );
  return normalizeLayoutRow(result.rows[0]);
};

export const updateLayout = async ({ layoutId, body, user }) => {
  assertAuthor(user);
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const current = await getLayout({ layoutId, user, db: client, lock: true });
    assertTenantAccess(current.client_id, user);
    if (current.is_default) {
      throw new AppError(
        'Default layouts are protected. Create a custom layout instead of changing an LYT template.',
        409,
        'DEFAULT_LAYOUT_PROTECTED'
      );
    }
    const definition = validateLayoutDefinition({
      layout_key: current.layout_key,
      name: body.name ?? current.name,
      description: body.description ?? current.description,
      thumbnail_url: body.thumbnail_url ?? current.thumbnail_url,
      layout_data_json: body.layout_data_json ?? current.layout_data_json,
      canvas_width: body.canvas_width ?? current.canvas_width,
      canvas_height: body.canvas_height ?? current.canvas_height,
      safe_margin: body.safe_margin ?? current.safe_margin,
    });
    const versionResult = await client.query(
      `SELECT COALESCE(MAX(version_no), 0) + 1 AS version_no
       FROM layouts
       WHERE client_id IS NOT DISTINCT FROM $1 AND LOWER(layout_key) = LOWER($2)`,
      [current.client_id, current.layout_key]
    );
    const versionNo = Number(versionResult.rows[0].version_no);
    const result = await client.query(
      `INSERT INTO layouts (
         client_id, layout_key, version_no, name, description, layout_data_json,
         thumbnail_url, is_default, is_active, created_by,
         canvas_width, canvas_height, safe_margin
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, TRUE, $9, $10, $11, $12)
       RETURNING *`,
      [current.client_id, current.layout_key, versionNo, definition.name,
        definition.description, JSON.stringify(definition.layoutData), definition.thumbnailUrl,
        body.is_default ?? current.is_default, user.id || null,
        definition.canvasWidth, definition.canvasHeight, definition.safeMargin]
    );
    await client.query('COMMIT');
    return normalizeLayoutRow(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const validateScreenElements = (elements, layout) => {
  if (!Array.isArray(elements)) throw new AppError('elements must be an array');
  const slots = new Map(layout.layout_data_json.slots.map((slot) => [slot.id, slot]));
  const keys = new Set();
  return elements.map((element, index) => {
    if (!element || typeof element !== 'object' || Array.isArray(element)) {
      throw new AppError(`Element ${index + 1} must be an object`);
    }
    const key = requireText(element.id, `Element ${index + 1} id`, 150);
    if (keys.has(key)) throw new AppError(`Duplicate element id: ${key}`);
    keys.add(key);
    const slotId = requireText(element.slotId, `Element ${key} slotId`, 100);
    const slot = slots.get(slotId);
    if (!slot) throw new AppError(`Element ${key} uses an unknown layout slot`);
    const type = String(element.type || '').trim();
    if (!slot.allowed.includes(type)) throw new AppError(`Element ${key} has an unsupported type for slot ${slotId}`);
    return { key, slotId, type, content: element.content || {}, position: element.position || {}, displayOrder: index };
  });
};

export const createScreen = async ({ sessionId: rawSessionId, body = {}, user }) => {
  assertAuthor(user);
  const sessionId = parsePositiveInt(rawSessionId, 'Session ID');
  const creationMode = body.creation_mode || 'blank';
  if (!['blank', 'layout'].includes(creationMode)) throw new AppError('creation_mode must be blank or layout');
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const sessionResult = await client.query('SELECT id, client_id FROM sessions WHERE id = $1 FOR UPDATE', [sessionId]);
    const session = sessionResult.rows[0];
    if (!session) throw new AppError('Studio session not found', 404);
    assertTenantAccess(session.client_id, user);

    let layout = null;
    let elements = [];
    if (creationMode === 'blank') {
      if (body.layout_id !== undefined && body.layout_id !== null) throw new AppError('A blank screen cannot reference a layout');
      if (Array.isArray(body.elements) && body.elements.length > 0) throw new AppError('A blank screen cannot contain preset elements');
    } else {
      if (!body.layout_id) throw new AppError('layout_id is required for layout creation mode');
      layout = await getLayout({ layoutId: body.layout_id, user, db: client });
      elements = validateScreenElements(body.elements || [], layout);
    }

    const orderResult = await client.query(
      `SELECT COALESCE(MAX(screen_number), 0) + 1 AS screen_number,
              COALESCE(MAX(display_order), -1) + 1 AS display_order
       FROM screens WHERE session_id = $1`,
      [session.id]
    );
    const screenNumber = Number(orderResult.rows[0].screen_number);
    const displayOrder = Number(orderResult.rows[0].display_order);
    const screenResult = await client.query(
      `INSERT INTO screens (
         client_id, session_id, title, screen_number, layout_id,
         screen_settings_json, display_order, created_by, creation_mode, revision_no
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, 1)
       RETURNING id, client_id, session_id, title, screen_number, layout_id,
                 screen_settings_json, display_order, creation_mode, revision_no,
                 created_by, created_at, updated_at`,
      [session.client_id, session.id, String(body.title || '').trim(), screenNumber,
        layout?.id || null, JSON.stringify(body.screen_settings || {}), displayOrder,
        user.id || null, creationMode]
    );
    for (const element of elements) {
      await client.query(
        `INSERT INTO screen_elements (
           screen_id, element_key, slot_id, element_type,
           content_json, position_json, display_order
         ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)`,
        [screenResult.rows[0].id, element.key, element.slotId, element.type,
          JSON.stringify(element.content), JSON.stringify(element.position), element.displayOrder]
      );
    }
    await returnSessionToDraft(session.id, client);
    await client.query('COMMIT');
    return {
      ...screenResult.rows[0],
      revision_no: Number(screenResult.rows[0].revision_no),
      elements: elements.map((element) => ({
        id: element.key,
        slotId: element.slotId,
        type: element.type,
        content: element.content,
        position: element.position,
      })),
      tags: [],
      branches: [],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
