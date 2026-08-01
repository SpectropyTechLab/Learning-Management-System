// backend/controllers/platform.controller.js
import { getClient, query as dbQuery } from '../repositories/db.repository.js';

const parseNullableInt = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${fieldName} must be an integer`);
  }
  return parsed;
};

const PLATFORM_PROGRAM_OWNER_CLIENT_ID = 17;
let courseMetadataColumnPromise;
let contentMetadataColumnPromise;
let packItemColumnPromise;
let courseExamsTablePromise;

const hasCourseMetadataColumn = async () => {
  if (!courseMetadataColumnPromise) {
    courseMetadataColumnPromise = dbQuery(                                                    
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'courses'
            AND column_name = 'metadata'
        ) AS exists
      `
    ).then((result) => Boolean(result.rows[0]?.exists));
  }

  return courseMetadataColumnPromise;
};

const ensureCourseMetadataColumn = async (executor = dbQuery) => {
  if (await hasCourseMetadataColumn()) return;

  await executor(`
    ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB
  `);

  courseMetadataColumnPromise = Promise.resolve(true);
};

const hasContentMetadataColumn = async () => {
  if (!contentMetadataColumnPromise) {
    contentMetadataColumnPromise = dbQuery(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'content_items'
            AND column_name = 'metadata'
        ) AS exists
      `
    ).then((result) => Boolean(result.rows[0]?.exists));
  }

  return contentMetadataColumnPromise;
};

const ensureContentMetadataColumn = async (executor = dbQuery) => {
  if (await hasContentMetadataColumn()) return;

  await executor(`
    ALTER TABLE content_items
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB
  `);

  contentMetadataColumnPromise = Promise.resolve(true);
};

const getPackItemColumn = async () => {
  if (!packItemColumnPromise) {
    packItemColumnPromise = dbQuery(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'content_pack_items'
          AND column_name IN ('item_id', 'content_id')
        ORDER BY CASE WHEN column_name = 'item_id' THEN 0 ELSE 1 END
        LIMIT 1
      `
    ).then((result) => {
      const columnName = result.rows[0]?.column_name;
      if (!columnName) {
        throw new Error('content_pack_items is missing an item membership column');
      }
      return columnName;
    });
  }

  return packItemColumnPromise;
};

const ensureCourseExamsTable = async (executor = dbQuery) => {
  if (executor === dbQuery) {
    if (!courseExamsTablePromise) {
      courseExamsTablePromise = (async () => {
        await executor(`
          CREATE TABLE IF NOT EXISTS course_exams (
            id SERIAL PRIMARY KEY,
            course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
            exam_id INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
            assigned_at TIMESTAMPTZ DEFAULT NOW(),
            assigned_by INT REFERENCES users(id) ON DELETE SET NULL,
            UNIQUE(course_id, exam_id)
          )
        `);

        await executor(`CREATE INDEX IF NOT EXISTS idx_course_exams_exam_id ON course_exams(exam_id)`);
        await executor(`CREATE INDEX IF NOT EXISTS idx_course_exams_course_id ON course_exams(course_id)`);
      })();
    }

    await courseExamsTablePromise;
    return;
  }

  await executor(`
    CREATE TABLE IF NOT EXISTS course_exams (
      id SERIAL PRIMARY KEY,
      course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      exam_id INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      assigned_at TIMESTAMPTZ DEFAULT NOW(),
      assigned_by INT REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE(course_id, exam_id)
    )
  `);

  await executor(`CREATE INDEX IF NOT EXISTS idx_course_exams_exam_id ON course_exams(exam_id)`);
  await executor(`CREATE INDEX IF NOT EXISTS idx_course_exams_course_id ON course_exams(course_id)`);
};

const loadPackDerivedGroups = async ({ packId }) => {
  await ensureCourseMetadataColumn();
  const packItemColumn = await getPackItemColumn();
  const hasCourseMetadata = await hasCourseMetadataColumn();
  const gradeSql = hasCourseMetadata
    ? `NULLIF(BTRIM(COALESCE(c.metadata->>'grade', '')), '')`
    : `NULL::text`;
  const subjectSql = hasCourseMetadata
    ? `NULLIF(BTRIM(COALESCE(c.metadata->>'subject', '')), '')`
    : `NULL::text`;

  const packResult = await dbQuery(
    `SELECT id, name FROM content_packs WHERE id = $1 LIMIT 1`,
    [packId]
  );
  if (packResult.rows.length === 0) {
    throw new Error('Pack not found');
  }

  const itemsResult = await dbQuery(
    `
      WITH RECURSIVE pack_roots AS (
        SELECT
          ci.id,
          ci.course_id,
          ci.parent_id,
          ci.item_type
        FROM content_pack_items cpi
        JOIN content_items ci ON ci.id = cpi.${packItemColumn}
        WHERE cpi.pack_id = $1
      ),
      descendant_items AS (
        SELECT id, course_id, parent_id, item_type
        FROM pack_roots

        UNION

        SELECT child.id, child.course_id, child.parent_id, child.item_type
        FROM content_items child
        JOIN descendant_items parent
          ON child.parent_id = parent.id
      ),
      selected_pack_items AS (
        SELECT id, course_id, parent_id, item_type
        FROM descendant_items

        UNION

        SELECT parent.id, parent.course_id, parent.parent_id, parent.item_type
        FROM content_items parent
        JOIN selected_pack_items child
          ON child.parent_id = parent.id
      )
      SELECT DISTINCT
        c.id AS source_course_id,
        c.title AS source_course_title,
        ${gradeSql} AS grade,
        ${subjectSql} AS subject,
        ci.id AS item_id,
        ci.order_index,
        ci.created_at
      FROM selected_pack_items spi
      JOIN content_items ci ON ci.id = spi.id
      JOIN courses c ON c.id = ci.course_id
      ORDER BY c.id ASC, ci.order_index ASC, ci.created_at ASC
    `,
    [packId]
  );

  const groups = new Map();
  itemsResult.rows.forEach((row) => {
    const sourceCourseId = Number(row.source_course_id);
    if (!groups.has(sourceCourseId)) {
      groups.set(sourceCourseId, {
        sourceCourseId,
        sourceCourseTitle: String(row.source_course_title ?? 'Untitled Course'),
        grade: row.grade ?? null,
        subject: row.subject ?? null,
        itemIds: [],
      });
    }

    groups.get(sourceCourseId).itemIds.push(Number(row.item_id));
  });

  return {
    packName: String(packResult.rows[0]?.name ?? `Pack ${packId}`),
    groups: Array.from(groups.values()),
  };
};

const loadSourceContentSnapshot = async ({
  sourceCourseId,
  itemIds,
  executor = dbQuery,
}) => {
  await ensureContentMetadataColumn();

  const selectedRowsResult = await executor(
    `
      SELECT id, parent_id, item_type, title, content_url, order_index, created_at, metadata
      FROM content_items
      WHERE course_id = $1
        AND id = ANY($2::int[])
    `,
    [sourceCourseId, itemIds]
  );

  const selectedRows = selectedRowsResult.rows.map((row) => ({
    ...row,
    id: Number(row.id),
    parent_id: row.parent_id === null ? null : Number(row.parent_id),
    order_index: Number(row.order_index ?? 0),
    metadata: row.metadata ?? {},
  }));
  const selectedSet = new Set(selectedRows.map((row) => row.id));
  const childrenByParent = new Map();
  const compareRows = (left, right) => {
    const orderCompare = Number(left.order_index ?? 0) - Number(right.order_index ?? 0);
    if (orderCompare !== 0) return orderCompare;
    return String(left.created_at ?? '').localeCompare(String(right.created_at ?? ''));
  };

  selectedRows.forEach((row) => {
    const normalizedParentId = selectedSet.has(row.parent_id) ? row.parent_id : null;
    const siblings = childrenByParent.get(normalizedParentId) ?? [];
    siblings.push(row);
    childrenByParent.set(normalizedParentId, siblings);
  });

  childrenByParent.forEach((rows, parentId) => {
    childrenByParent.set(parentId, rows.sort(compareRows));
  });

  const levels = [];
  const visitChildren = (sourceParentId, depth) => {
    const sourceChildren = childrenByParent.get(sourceParentId) ?? [];
    if (sourceChildren.length === 0) return;

    if (!levels[depth]) levels[depth] = [];
    sourceChildren.forEach((sourceRow, siblingIndex) => {
      levels[depth].push({
        source_id: sourceRow.id,
        source_parent_id: sourceParentId,
        item_type: sourceRow.item_type,
        title: sourceRow.title,
        content_url: sourceRow.content_url,
        order_index: siblingIndex,
        metadata: sourceRow.metadata ?? {},
      });
      visitChildren(sourceRow.id, depth + 1);
    });
  };

  visitChildren(null, 0);

  return levels.filter(Boolean);
};

const loadPackSyncSnapshot = async ({ packId }) => {
  const { packName, groups } = await loadPackDerivedGroups({ packId });
  const groupSnapshots = [];

  for (const group of groups) {
    groupSnapshots.push({
      ...group,
      contentLevels: await loadSourceContentSnapshot({
        sourceCourseId: group.sourceCourseId,
        itemIds: group.itemIds,
      }),
    });
  }

  return {
    packId,
    packName,
    groups: groupSnapshots,
  };
};

const replaceDerivedCourseContent = async ({
  targetCourseId,
  contentLevels,
  userId,
  executor,
}) => {
  await ensureContentMetadataColumn();

  await executor.query(`DELETE FROM course_exams WHERE course_id = $1`, [targetCourseId]);
  await executor.query(`DELETE FROM content_items WHERE course_id = $1`, [targetCourseId]);

  const sourceToTargetId = new Map();
  const examIds = new Set();

  for (const levelRows of contentLevels) {
    if (!Array.isArray(levelRows) || levelRows.length === 0) continue;

    const payload = levelRows.map((row) => {
      const mergedMetadata = {
        ...(row.metadata ?? {}),
        derived_source_item_id: row.source_id,
      };
      const examId = Number(mergedMetadata.exam_id);
      if (row.item_type === 'exam' && Number.isInteger(examId) && examId > 0) {
        examIds.add(examId);
      }

      return {
        source_id: row.source_id,
        target_parent_id: row.source_parent_id === null
          ? null
          : (sourceToTargetId.get(row.source_parent_id) ?? null),
        item_type: row.item_type,
        title: row.title,
        content_url: row.content_url,
        order_index: row.order_index,
        metadata: mergedMetadata,
      };
    });

    const insertResult = await executor.query(
      `
        INSERT INTO content_items (course_id, parent_id, item_type, title, content_url, order_index, metadata)
        SELECT
          $1,
          input.target_parent_id,
          input.item_type,
          input.title,
          input.content_url,
          input.order_index,
          input.metadata
        FROM jsonb_to_recordset($2::jsonb) AS input(
          source_id INT,
          target_parent_id INT,
          item_type TEXT,
          title TEXT,
          content_url TEXT,
          order_index INT,
          metadata JSONB
        )
        ORDER BY input.order_index ASC, input.source_id ASC
        RETURNING id, (metadata->>'derived_source_item_id')::INT AS source_id
      `,
      [targetCourseId, JSON.stringify(payload)]
    );

    insertResult.rows.forEach((row) => {
      const sourceId = Number(row.source_id);
      const targetId = Number(row.id);
      if (Number.isInteger(sourceId) && sourceId > 0 && Number.isInteger(targetId) && targetId > 0) {
        sourceToTargetId.set(sourceId, targetId);
      }
    });
  }

  if (examIds.size > 0) {
    await executor.query(
      `
        INSERT INTO course_exams (course_id, exam_id, assigned_by)
        SELECT $1, UNNEST($2::int[]), $3
        ON CONFLICT (course_id, exam_id)
        DO UPDATE SET assigned_by = EXCLUDED.assigned_by, assigned_at = NOW()
      `,
      [targetCourseId, Array.from(examIds), userId ?? null]
    );
  }
};

const syncDerivedCoursesForPackEntitlement = async ({
  clientId,
  packId,
  userId,
  packSnapshot = null,
}) => {
  const normalizedClientId = Number(clientId);
  const normalizedPackId = Number(packId);
  if (!Number.isInteger(normalizedClientId) || normalizedClientId <= 0) return;
  if (!Number.isInteger(normalizedPackId) || normalizedPackId <= 0) return;

  const snapshot = packSnapshot && Number(packSnapshot.packId) === normalizedPackId
    ? packSnapshot
    : await loadPackSyncSnapshot({ packId: normalizedPackId });
  const { packName, groups } = snapshot;

  await ensureCourseMetadataColumn();
  const client = await getClient();

  try {
    await client.query('BEGIN');
    await client.query(
      `SELECT pg_advisory_xact_lock($1, $2)`,
      [normalizedClientId, normalizedPackId]
    );

    const existingResult = await client.query(
      `
        SELECT id, metadata
        FROM courses
        WHERE client_id = $1
          AND COALESCE(metadata->>'derived_pack_id', '') = $2
          AND COALESCE(metadata->>'derived_for_client_id', '') = $3
        ORDER BY id ASC
        FOR UPDATE
      `,
      [normalizedClientId, String(normalizedPackId), String(normalizedClientId)]
    );
    const existingBySourceCourseId = new Map();
    const staleCourseIds = [];

    existingResult.rows.forEach((row) => {
      const courseId = Number(row.id);
      const sourceCourseId = Number(row.metadata?.derived_source_course_id ?? 0);
      if (
        !Number.isInteger(courseId)
        || courseId <= 0
        || !Number.isInteger(sourceCourseId)
        || sourceCourseId <= 0
        || existingBySourceCourseId.has(sourceCourseId)
      ) {
        if (Number.isInteger(courseId) && courseId > 0) staleCourseIds.push(courseId);
        return;
      }
      existingBySourceCourseId.set(sourceCourseId, courseId);
    });

    const activeSourceCourseIds = new Set(groups.map((group) => group.sourceCourseId));
    existingBySourceCourseId.forEach((courseId, sourceCourseId) => {
      if (!activeSourceCourseIds.has(sourceCourseId)) staleCourseIds.push(courseId);
    });

    for (const group of groups) {
      const derivedMetadata = {
        grade: group.grade,
        subject: group.subject,
        derived_pack_id: normalizedPackId,
        derived_pack_name: packName,
        derived_source_course_id: group.sourceCourseId,
        derived_for_client_id: normalizedClientId,
        is_pack_derived: true,
      };
      let targetCourseId = existingBySourceCourseId.get(group.sourceCourseId) ?? 0;

      if (!Number.isInteger(targetCourseId) || targetCourseId <= 0) {
        const insertResult = await client.query(
          `
            INSERT INTO courses (title, description, published, created_by, client_id, metadata)
            VALUES ($1, $2, $3, $4, $5, $6::jsonb)
            RETURNING id
          `,
          [
            group.sourceCourseTitle,
            `Derived from pack: ${packName}`,
            true,
            userId ?? null,
            normalizedClientId,
            JSON.stringify(derivedMetadata),
          ]
        );
        targetCourseId = Number(insertResult.rows[0]?.id);
      } else {
        await client.query(
          `
            UPDATE courses
            SET title = $1,
                description = $2,
                published = true,
                metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
                updated_at = NOW()
            WHERE id = $4
          `,
          [
            group.sourceCourseTitle,
            `Derived from pack: ${packName}`,
            JSON.stringify(derivedMetadata),
            targetCourseId,
          ]
        );
      }

      await replaceDerivedCourseContent({
        targetCourseId,
        contentLevels: group.contentLevels ?? [],
        userId,
        executor: client,
      });
    }

    if (staleCourseIds.length > 0) {
      await client.query(
        `
          DELETE FROM courses
          WHERE id = ANY($1::int[])
            AND client_id = $2
            AND COALESCE(metadata->>'derived_pack_id', '') = $3
            AND COALESCE(metadata->>'derived_for_client_id', '') = $4
        `,
        [
          Array.from(new Set(staleCourseIds)),
          normalizedClientId,
          String(normalizedPackId),
          String(normalizedClientId),
        ]
      );
    }

    await client.query('COMMIT');
    return {
      courseCount: groups.length,
      itemCount: groups.reduce((total, group) => total + group.itemIds.length, 0),
      removedCourseCount: new Set(staleCourseIds).size,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const syncContentPackEntitlements = async (req, res) => {
  const packId = Number(req.params?.id);
  if (!Number.isInteger(packId) || packId <= 0) {
    return res.status(400).json({ error: 'pack_id must be a positive integer' });
  }

  try {
    await ensureCourseExamsTable();

    const packResult = await dbQuery(
      `SELECT id FROM content_packs WHERE id = $1 LIMIT 1`,
      [packId]
    );
    if (packResult.rows.length === 0) {
      return res.status(404).json({ error: 'Content pack not found' });
    }

    const entitlementResult = await dbQuery(
      `
        SELECT DISTINCT client_id
        FROM content_entitlements
        WHERE pack_id = $1
          AND status = 'active'
          AND revoked_at IS NULL
          AND NOW() BETWEEN start_at AND end_at
        ORDER BY client_id ASC
      `,
      [packId]
    );
    const packSnapshot = await loadPackSyncSnapshot({ packId });
    const syncedClientIds = [];
    let syncedCourseCount = 0;
    let syncedItemCount = 0;
    let removedCourseCount = 0;

    for (const row of entitlementResult.rows) {
      const clientId = Number(row.client_id);
      if (!Number.isInteger(clientId) || clientId <= 0) continue;

      const result = await syncDerivedCoursesForPackEntitlement({
        clientId,
        packId,
        userId: req.user?.id ?? null,
        packSnapshot,
      });
      syncedClientIds.push(clientId);
      syncedCourseCount += Number(result?.courseCount ?? 0);
      syncedItemCount += Number(result?.itemCount ?? 0);
      removedCourseCount += Number(result?.removedCourseCount ?? 0);
    }

    return res.json({
      success: true,
      pack_id: packId,
      synced_client_ids: syncedClientIds,
      synced_client_count: syncedClientIds.length,
      synced_course_count: syncedCourseCount,
      synced_item_count: syncedItemCount,
      removed_course_count: removedCourseCount,
    });
  } catch (err) {
    console.error('Failed to sync content pack entitlements:', err);
    return res.status(500).json({ error: 'Failed to sync content pack entitlements' });
  }
};

export const syncActivePackEntitlementsForClient = async ({ clientId, userId = null }) => {
  const normalizedClientId = Number(clientId);
  if (!Number.isInteger(normalizedClientId) || normalizedClientId <= 0) {
    return;
  }

  const result = await dbQuery(
    `
      SELECT DISTINCT pack_id
      FROM content_entitlements
      WHERE client_id = $1
        AND pack_id IS NOT NULL
        AND status = 'active'
        AND NOW() BETWEEN start_at AND end_at
      ORDER BY pack_id ASC
    `,
    [normalizedClientId]
  );

  await ensureCourseExamsTable();

  for (const row of result.rows) {
    const packId = Number(row.pack_id);
    if (!Number.isInteger(packId) || packId <= 0) continue;
    const packSnapshot = await loadPackSyncSnapshot({ packId });
    await syncDerivedCoursesForPackEntitlement({
      clientId: normalizedClientId,
      packId,
      userId,
      packSnapshot,
    });
  }
};

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
    await ensureCourseExamsTable();
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

    if (pack_id) {
      const packSnapshot = await loadPackSyncSnapshot({ packId: Number(pack_id) });
      await syncDerivedCoursesForPackEntitlement({
        clientId: client_id,
        packId: pack_id,
        userId: grantedBy ?? null,
        packSnapshot,
      });
    }

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


