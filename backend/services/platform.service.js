// backend/controllers/platform.controller.js
import { query as dbQuery, getClient } from '../repositories/db.repository.js';

const parseNullableInt = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${fieldName} must be an integer`);
  }
  return parsed;
};

const PLATFORM_PROGRAM_OWNER_CLIENT_ID = 17;

// ----- Clients (Super Admin only) -----
export const listClients = async (req, res) => {
  try {
    const result = await dbQuery(
      `SELECT id, name, slug, timezone, settings, is_active, created_at, updated_at
       FROM clients
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to load clients:', err);
    res.status(500).json({ error: 'Failed to load clients' });
  }
};

export const createClient = async (req, res) => {
  const { name, slug, timezone, settings } = req.body;
  if (!name?.trim() || !slug?.trim()) {
    return res.status(400).json({ error: 'name and slug are required' });
  }
  try {
    const result = await dbQuery(
      `INSERT INTO clients (name, slug, timezone, settings)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, slug, timezone, settings, is_active, created_at`,
      [name.trim(), slug.trim(), timezone || 'Asia/Kolkata', settings || {}]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to create client:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Client slug already exists' });
    }
    res.status(500).json({ error: 'Failed to create client' });
  }
};

export const updateClient = async (req, res) => {
  const { id } = req.params;
  const { name, slug, timezone, settings, is_active } = req.body;
  try {
    const result = await dbQuery(
      `UPDATE clients
       SET name = COALESCE($1, name),
           slug = COALESCE($2, slug),
           timezone = COALESCE($3, timezone),
           settings = COALESCE($4, settings),
           is_active = COALESCE($5, is_active),
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, name, slug, timezone, settings, is_active, updated_at`,
      [
        name?.trim() || null,
        slug?.trim() || null,
        timezone || null,
        settings || null,
        typeof is_active === 'boolean' ? is_active : null,
        id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to update client:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
};

export const deactivateClient = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await dbQuery(
      `UPDATE clients SET is_active = false, updated_at = NOW()
       WHERE id = $1 RETURNING id, is_active`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json({ success: true, client: result.rows[0] });
  } catch (err) {
    console.error('Failed to deactivate client:', err);
    res.status(500).json({ error: 'Failed to deactivate client' });
  }
};

// ----- Content Packs -----
export const listContentPacks = async (req, res) => {
  try {
    const result = await dbQuery(
      `SELECT id, name, description, created_by, is_active, created_at, updated_at
       FROM content_packs
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to load content packs:', err);
    res.status(500).json({ error: 'Failed to load content packs' });
  }
};

export const createContentPack = async (req, res) => {
  const { name, description } = req.body;
  const createdBy = req.user?.id || null;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  try {
    const result = await dbQuery(
      `INSERT INTO content_packs (name, description, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, is_active, created_at`,
      [name.trim(), description?.trim() || null, createdBy]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to create content pack:', err);
    res.status(500).json({ error: 'Failed to create content pack' });
  }
};

export const updateContentPack = async (req, res) => {
  const { id } = req.params;
  const { name, description, is_active } = req.body;
  try {
    const result = await dbQuery(
      `UPDATE content_packs
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           is_active = COALESCE($3, is_active),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, name, description, is_active, updated_at`,
      [
        name?.trim() || null,
        description?.trim() || null,
        typeof is_active === 'boolean' ? is_active : null,
        id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Content pack not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to update content pack:', err);
    res.status(500).json({ error: 'Failed to update content pack' });
  }
};

export const deactivateContentPack = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await dbQuery(
      `UPDATE content_packs SET is_active = false, updated_at = NOW()
       WHERE id = $1 RETURNING id, is_active`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Content pack not found' });
    }
    res.json({ success: true, content_pack: result.rows[0] });
  } catch (err) {
    console.error('Failed to deactivate content pack:', err);
    res.status(500).json({ error: 'Failed to deactivate content pack' });
  }
};

export const addContentPackItems = async (req, res) => {
  const { id } = req.params;
  const rawIds = req.body?.item_ids ?? req.body?.content_ids;

  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    return res.status(400).json({ error: 'item_ids must be a non-empty array' });
  }

  try {
    const ids = rawIds.map((itemId) => Number(itemId)).filter(Number.isInteger);
    if (ids.length === 0) {
      return res.status(400).json({ error: 'item_ids must contain integers' });
    }
    await dbQuery(
      `INSERT INTO content_pack_items (pack_id, item_id)
       SELECT $1, UNNEST($2::int[])
       ON CONFLICT DO NOTHING`,
      [Number(id), ids]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to add content pack items:', err);
    res.status(500).json({ error: 'Failed to add content pack items' });
  }
};

export const removeContentPackItem = async (req, res) => {
  const { id, contentId } = req.params;
  try {
    await dbQuery(
      `DELETE FROM content_pack_items WHERE pack_id = $1 AND item_id = $2`,
      [id, contentId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to remove content pack item:', err);
    res.status(500).json({ error: 'Failed to remove content pack item' });
  }
};

// ----- Programs (Super Admin only) -----
export const listPrograms = async (req, res) => {
  try {
    const clientId = parseNullableInt(req.query?.client_id, 'client_id');
    const params = [];
    let query = `
      SELECT id, client_id, name, code, is_active, created_at, updated_at
      FROM programs
    `;

    if (clientId) {
      params.push(clientId, PLATFORM_PROGRAM_OWNER_CLIENT_ID);
      query += `
        WHERE client_id = $1
           OR client_id = $2
      `;
    }

    query += ` ORDER BY name ASC, id ASC`;

    const result = await dbQuery(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to load programs:', err);
    res.status(500).json({ error: 'Failed to load programs' });
  }
};

// ----- Entitlements -----
export const listEntitlements = async (req, res) => {
  let clientId = req.user?.client_id;
  if (req.user?.role === 'super_admin') {
    try {
      clientId = parseNullableInt(req.query.client_id, 'client_id');
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  try {
    const result = await dbQuery(
      `
      SELECT ce.id, ce.client_id, ce.content_id, ce.pack_id, ce.start_at, ce.end_at,
             CASE
               WHEN ce.status = 'revoked' OR ce.revoked_at IS NOT NULL THEN 'revoked'
               WHEN ce.status = 'expired' THEN 'expired'
               WHEN ce.status = 'grace' AND NOW() <= ce.end_at THEN 'grace'
               WHEN NOW() < ce.start_at THEN 'pending'
               WHEN NOW() > ce.end_at THEN 'expired'
               ELSE ce.status
             END AS status,
             ce.status AS stored_status,
             ce.granted_by, ce.granted_at, ce.revoked_at, ce.notes,
             c.name AS client_name, cp.name AS pack_name, ci.title AS content_title
      FROM content_entitlements ce
      LEFT JOIN clients c ON ce.client_id = c.id
      LEFT JOIN content_packs cp ON ce.pack_id = cp.id
      LEFT JOIN content_items ci ON ce.content_id = ci.id
      ${clientId ? 'WHERE ce.client_id = $1' : ''}
      ORDER BY ce.granted_at DESC
      `,
      clientId ? [clientId] : []
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to load entitlements:', err);
    res.status(500).json({ error: 'Failed to load entitlements' });
  }
};

export const createEntitlement = async (req, res) => {
  const { client_id, content_id, pack_id, start_at, end_at, status, notes } = req.body;
  const grantedBy = req.user?.id;

  if (!client_id || (!content_id && !pack_id) || !start_at || !end_at) {
    return res.status(400).json({ error: 'client_id, start_at, end_at and content_id or pack_id are required' });
  }

  try {
    const result = await dbQuery(
      `
      INSERT INTO content_entitlements
      (client_id, content_id, pack_id, start_at, end_at, status, granted_by, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, client_id, content_id, pack_id, start_at, end_at, status, granted_at
      `,
      [
        client_id,
        content_id || null,
        pack_id || null,
        start_at,
        end_at,
        status || 'active',
        grantedBy,
        notes || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to create entitlement:', err);
    res.status(500).json({ error: 'Failed to create entitlement' });
  }
};

export const updateEntitlement = async (req, res) => {
  const { id } = req.params;
  const { start_at, end_at, status, notes, revoked_at } = req.body;
  try {
    const result = await dbQuery(
      `
      UPDATE content_entitlements
      SET start_at = COALESCE($1, start_at),
          end_at = COALESCE($2, end_at),
          status = COALESCE($3, status),
          notes = COALESCE($4, notes),
          revoked_at = COALESCE($5, revoked_at)
      WHERE id = $6
      RETURNING *
      `,
      [
        start_at || null,
        end_at || null,
        status || null,
        notes || null,
        revoked_at || null,
        id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entitlement not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to update entitlement:', err);
    res.status(500).json({ error: 'Failed to update entitlement' });
  }
};

export const revokeEntitlement = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await dbQuery(
      `
      UPDATE content_entitlements
      SET status = 'revoked', revoked_at = NOW()
      WHERE id = $1
      RETURNING id, status, revoked_at
      `,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entitlement not found' });
    }
    res.json({ success: true, entitlement: result.rows[0] });
  } catch (err) {
    console.error('Failed to revoke entitlement:', err);
    res.status(500).json({ error: 'Failed to revoke entitlement' });
  }
};


