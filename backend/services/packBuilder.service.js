import { getClient, query as dbQuery } from '../repositories/db.repository.js';

const PACK_BUILDER_ROLES = new Set(['super_admin', 'content_authorizer']);
const PLATFORM_OWNER_CLIENT_ID = 17;

let packItemColumnConfigPromise;
let courseMetadataColumnPromise;
let contentMetadataColumnPromise;

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const parseRequiredInt = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, `${fieldName} must be a positive integer`);
  }
  return parsed;
};

const parseNullableInt = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return null;
  return parseRequiredInt(value, fieldName);
};

const parsePagination = (query) => {
  const rawPage = Number.parseInt(String(query?.page ?? '1'), 10);
  const rawPageSize = Number.parseInt(String(query?.page_size ?? '20'), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize > 0 ? Math.min(rawPageSize, 100) : 20;
  return { page, pageSize, offset: (page - 1) * pageSize };
};

const ensurePackBuilderRole = (role) => {
  if (!PACK_BUILDER_ROLES.has(role)) {
    throw new HttpError(403, 'Access denied');
  }
};

const normalizeRequiredText = (value, fieldName) => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    throw new HttpError(400, `${fieldName} is required`);
  }
  return trimmed;
};

const normalizeOptionalText = (value) => {
  const trimmed = String(value ?? '').trim();
  return trimmed ? trimmed : null;
};

const parseItemIds = (rawIds) => {
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    throw new HttpError(400, 'item_ids must be a non-empty array');
  }

  const ids = [...new Set(rawIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))];
  if (ids.length === 0) {
    throw new HttpError(400, 'item_ids must contain positive integers');
  }

  return ids;
};

const toLowerMap = (rows, key) =>
  new Set(rows.map((row) => String(row[key] ?? '').toLowerCase()).filter(Boolean));

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

const ensureCourseMetadataColumn = async () => {
  if (await hasCourseMetadataColumn()) return;

  await dbQuery(`
    ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB
  `);

  courseMetadataColumnPromise = Promise.resolve(true);
};

const getCourseMetadataExpressions = async (alias = 'c') => {
  const hasMetadata = await hasCourseMetadataColumn();
  if (!hasMetadata) {
    return {
      grade: 'NULL::text',
      subject: 'NULL::text',
      searchableGrade: "''",
      searchableSubject: "''",
    };
  }

  return {
    grade: `NULLIF(BTRIM(COALESCE(${alias}.metadata->>'grade', '')), '')`,
    subject: `NULLIF(BTRIM(COALESCE(${alias}.metadata->>'subject', '')), '')`,
    searchableGrade: `COALESCE(${alias}.metadata->>'grade', '')`,
    searchableSubject: `COALESCE(${alias}.metadata->>'subject', '')`,
  };
};

const getPackItemColumnConfig = async () => {
  if (!packItemColumnConfigPromise) {
    packItemColumnConfigPromise = (async () => {
      const columnsResult = await dbQuery(
        `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'content_pack_items'
            AND column_name IN ('item_id', 'content_id')
        `
      );

      const columns = toLowerMap(columnsResult.rows, 'column_name');

      if (columns.has('content_id')) {
        return { column: 'content_id' };
      }

      if (!columns.has('item_id')) {
        throw new HttpError(500, 'content_pack_items is missing an item membership column');
      }

      const fkResult = await dbQuery(
        `
          SELECT ccu.table_name AS referenced_table
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
           AND ccu.table_schema = tc.table_schema
          WHERE tc.table_schema = 'public'
            AND tc.table_name = 'content_pack_items'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'item_id'
          LIMIT 1
        `
      );

      const referencedTable = String(fkResult.rows[0]?.referenced_table ?? '').toLowerCase();
      if (referencedTable === 'courses') {
        throw new HttpError(
          500,
          'content_pack_items is still configured for course membership. Run the item-based pack migration and restart the server.'
        );
      }

      return { column: 'item_id' };
    })();
  }

  return packItemColumnConfigPromise;
};

const getPackItemCount = async (packId, itemColumn) => {
  const result = await dbQuery(
    `SELECT COUNT(*)::int AS total FROM content_pack_items WHERE pack_id = $1`,
    [packId]
  );

  return Number(result.rows[0]?.total ?? 0);
};

const getPackOrThrow = async (packId) => {
  const result = await dbQuery(
    `SELECT id, name, description, created_at, is_active FROM content_packs WHERE id = $1 LIMIT 1`,
    [packId]
  );

  if (result.rows.length === 0) {
    throw new HttpError(404, 'Pack not found');
  }

  return result.rows[0];
};

const loadPackCompositionRows = async (packId, itemColumn) => {
  const metadata = await getCourseMetadataExpressions('c');

  const result = await dbQuery(
    `
      WITH RECURSIVE pack_roots AS (
        SELECT
          ci.id,
          ci.course_id,
          ci.parent_id,
          ci.item_type
        FROM content_pack_items cpi
        JOIN content_items ci ON ci.id = cpi.${itemColumn}
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
        ci.id,
        ci.course_id,
        c.title AS course_name,
        ci.parent_id,
        ci.item_type,
        ci.title,
        ci.order_index,
        ci.created_at,
        NULL::timestamptz AS attached_at,
        ${metadata.grade} AS grade,
        ${metadata.subject} AS subject
      FROM selected_pack_items spi
      JOIN content_items ci ON ci.id = spi.id
      JOIN courses c ON c.id = ci.course_id
      ORDER BY course_name ASC, ci.order_index ASC, ci.created_at ASC
    `,
    [packId]
  );

  return result.rows;
};

const buildSummaryGroups = (rows) => {
  const groups = new Map();

  rows.forEach((row) => {
    const subject = row.subject ?? null;
    const key = `${row.course_id}:${subject ?? ''}`;

    if (!groups.has(key)) {
      groups.set(key, {
        course_id: row.course_id,
        course_name: row.course_name,
        grade: row.grade ?? null,
        subject,
        item_count: 0,
        items: [],
      });
    }

    const group = groups.get(key);
    group.item_count += 1;
    group.items.push({
      id: row.id,
      parent_id: row.parent_id ?? null,
      title: row.title,
      item_type: row.item_type,
      order_index: Number(row.order_index ?? 0),
    });
  });

  return Array.from(groups.values()).sort((left, right) => {
    const courseCompare = String(left.course_name).localeCompare(String(right.course_name));
    if (courseCompare !== 0) return courseCompare;
    return String(left.subject ?? '').localeCompare(String(right.subject ?? ''));
  });
};

const getExistingPackItemIds = async (packId, itemIds, itemColumn) => {
  if (itemIds.length === 0) return [];

  const result = await dbQuery(
    `SELECT ${itemColumn} AS item_id FROM content_pack_items WHERE pack_id = $1 AND ${itemColumn} = ANY($2::int[])`,
    [packId, itemIds]
  );

  return result.rows.map((row) => Number(row.item_id));
};

const removeAncestorPackRoots = async (packId, itemIds, itemColumn) => {
  if (itemIds.length === 0) return;

  await dbQuery(
    `
      WITH RECURSIVE ancestors AS (
        SELECT parent.id, parent.parent_id
        FROM content_items child
        JOIN content_items parent
          ON parent.id = child.parent_id
        WHERE child.id = ANY($2::int[])

        UNION

        SELECT parent.id, parent.parent_id
        FROM content_items parent
        JOIN ancestors child
          ON parent.id = child.parent_id
      )
      DELETE FROM content_pack_items cpi
      USING ancestors
      WHERE cpi.pack_id = $1
        AND cpi.${itemColumn} = ancestors.id
    `,
    [packId, itemIds]
  );
};

const validateAttachableItems = async (itemIds) => {
  if (itemIds.length === 0) {
    return [];
  }

  const result = await dbQuery(
    `
      SELECT ci.id, ci.course_id, c.client_id
      FROM content_items ci
      JOIN courses c ON c.id = ci.course_id
      WHERE ci.id = ANY($1::int[])
    `,
    [itemIds]
  );

  if (result.rows.length !== itemIds.length) {
    throw new HttpError(400, 'One or more content items were not found');
  }

  if (result.rows.some((row) => row.client_id !== null && Number(row.client_id) !== PLATFORM_OWNER_CLIENT_ID)) {
    throw new HttpError(403, 'Only platform-global course items can be attached to a global pack');
  }

  return result.rows;
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

const ensureCourseExamsTable = async () => {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS course_exams (
      id SERIAL PRIMARY KEY,
      course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      exam_id INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      assigned_at TIMESTAMPTZ DEFAULT NOW(),
      assigned_by INT REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE(course_id, exam_id)
    )
  `);

  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_course_exams_exam_id ON course_exams(exam_id)`);
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_course_exams_course_id ON course_exams(course_id)`);
};

const attachItemsToPack = async (packId, itemIds, itemColumn) => {
  await getPackOrThrow(packId);
  await validateAttachableItems(itemIds);
  await removeAncestorPackRoots(packId, itemIds, itemColumn);

  const existingIds = await getExistingPackItemIds(packId, itemIds, itemColumn);
  const existingSet = new Set(existingIds.map((value) => Number(value)));
  const addedItemIds = itemIds.filter((itemId) => !existingSet.has(itemId));
  const skippedItemIds = itemIds.filter((itemId) => existingSet.has(itemId));

  if (addedItemIds.length > 0) {
    await dbQuery(
      `
        INSERT INTO content_pack_items (pack_id, ${itemColumn})
        SELECT $1, UNNEST($2::int[])
        ON CONFLICT DO NOTHING
      `,
      [packId, addedItemIds]
    );
  }

  const itemCount = await getPackItemCount(packId, itemColumn);
  return { addedItemIds, skippedItemIds, itemCount };
};

const handleHttpError = (res, err, fallbackMessage) => {
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  console.error(fallbackMessage, err);
  return res.status(500).json({ error: fallbackMessage });
};

export const __resetPackBuilderCachesForTests = () => {
  packItemColumnConfigPromise = undefined;
  courseMetadataColumnPromise = undefined;
  contentMetadataColumnPromise = undefined;
};

export const listPacks = async (req, res) => {
  try {
    ensurePackBuilderRole(req.user?.role);
    const { column: itemColumn } = await getPackItemColumnConfig();
    const { page, pageSize, offset } = parsePagination(req.query);

    const countResult = await dbQuery(`SELECT COUNT(*)::int AS total FROM content_packs`);
    const total = Number(countResult.rows[0]?.total ?? 0);

    const result = await dbQuery(
      `
        SELECT
          cp.id,
          cp.name,
          cp.description,
          cp.created_at,
          cp.is_active,
          COALESCE(stats.item_count, 0)::int AS item_count,
          COALESCE(stats.course_count, 0)::int AS course_count
        FROM content_packs cp
        LEFT JOIN (
          SELECT
            cpi.pack_id,
            COUNT(*)::int AS item_count,
            COUNT(DISTINCT ci.course_id)::int AS course_count
          FROM content_pack_items cpi
          JOIN content_items ci ON ci.id = cpi.${itemColumn}
          GROUP BY cpi.pack_id
        ) stats ON stats.pack_id = cp.id
        ORDER BY cp.created_at DESC
        LIMIT $1 OFFSET $2
      `,
      [pageSize, offset]
    );

    return res.json({
      data: result.rows,
      page,
      page_size: pageSize,
      total,
    });
  } catch (err) {
    return handleHttpError(res, err, 'Failed to load packs');
  }
};

export const createPack = async (req, res) => {
  try {
    ensurePackBuilderRole(req.user?.role);
    const name = normalizeRequiredText(req.body?.name, 'name');
    const description = normalizeOptionalText(req.body?.description);
    const createdBy = req.user?.id ?? null;

    const duplicateResult = await dbQuery(
      `
        SELECT id
        FROM content_packs
        WHERE LOWER(BTRIM(name)) = LOWER(BTRIM($1))
        LIMIT 1
      `,
      [name]
    );

    if (duplicateResult.rows.length > 0) {
      throw new HttpError(409, 'A pack with this name already exists');
    }

    const result = await dbQuery(
      `
        INSERT INTO content_packs (name, description, created_by)
        VALUES ($1, $2, $3)
        RETURNING id, name, description, created_at, is_active
      `,
      [name, description, createdBy]
    );

    return res.status(201).json({
      ...result.rows[0],
      item_count: 0,
      course_count: 0,
    });
  } catch (err) {
    return handleHttpError(res, err, 'Failed to create pack');
  }
};

export const getPackItems = async (req, res) => {
  try {
    ensurePackBuilderRole(req.user?.role);
    const { column: itemColumn } = await getPackItemColumnConfig();
    const packId = parseRequiredInt(req.params?.id, 'pack_id');
    const { page, pageSize, offset } = parsePagination(req.query);

    await getPackOrThrow(packId);

    const rows = await loadPackCompositionRows(packId, itemColumn);
    const total = rows.length;

    return res.json({
      data: rows.slice(offset, offset + pageSize),
      page,
      page_size: pageSize,
      total,
    });
  } catch (err) {
    return handleHttpError(res, err, 'Failed to load pack items');
  }
};

export const getPackSummary = async (req, res) => {
  try {
    ensurePackBuilderRole(req.user?.role);
    const { column: itemColumn } = await getPackItemColumnConfig();
    const packId = parseRequiredInt(req.params?.id, 'pack_id');

    await getPackOrThrow(packId);

    const rows = await loadPackCompositionRows(packId, itemColumn);

    return res.json({
      pack_id: packId,
      total_items: rows.length,
      groups: buildSummaryGroups(rows),
    });
  } catch (err) {
    return handleHttpError(res, err, 'Failed to load pack summary');
  }
};

export const listCourses = async (req, res) => {
  try {
    ensurePackBuilderRole(req.user?.role);
    const { page, pageSize, offset } = parsePagination(req.query);
    const q = String(req.query?.q ?? '').trim();
    const hasClientFilter = Object.prototype.hasOwnProperty.call(req.query ?? {}, 'client_id');
    const clientId = hasClientFilter ? parseNullableInt(req.query?.client_id, 'client_id') : null;
    const hasMetadata = await hasCourseMetadataColumn();
    const metadata = await getCourseMetadataExpressions('c');

    const params = [];
    const conditions = [];

    if (clientId === null) {
      conditions.push(`(c.client_id IS NULL OR c.client_id = ${PLATFORM_OWNER_CLIENT_ID})`);
    } else if (clientId !== undefined) {
      params.push(clientId);
      conditions.push(`c.client_id = $${params.length}`);
    }

    if (hasMetadata) {
      conditions.push(`COALESCE(c.metadata->>'is_pack_derived', 'false') <> 'true'`);
    }

    if (q) {
      params.push(`%${q}%`);
      const searchIndex = params.length;
      conditions.push(
        `(c.title ILIKE $${searchIndex} OR ${metadata.searchableGrade} ILIKE $${searchIndex} OR ${metadata.searchableSubject} ILIKE $${searchIndex})`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await dbQuery(
      `SELECT COUNT(*)::int AS total FROM courses c ${whereClause}`,
      params
    );
    const total = Number(countResult.rows[0]?.total ?? 0);

    const listParams = [...params, pageSize, offset];
    const limitIndex = listParams.length - 1;
    const offsetIndex = listParams.length;
    const result = await dbQuery(
      `
        SELECT
          c.id,
          c.title AS name,
          ${metadata.grade} AS grade,
          ${metadata.subject} AS subject,
          c.client_id,
          c.created_at,
          COALESCE(content_stats.content_item_count, 0)::int AS content_item_count
        FROM courses c
        LEFT JOIN (
          SELECT course_id, COUNT(*)::int AS content_item_count
          FROM content_items
          GROUP BY course_id
        ) content_stats ON content_stats.course_id = c.id
        ${whereClause}
        ORDER BY c.title ASC
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `,
      listParams
    );

    return res.json({
      data: result.rows,
      page,
      page_size: pageSize,
      total,
    });
  } catch (err) {
    return handleHttpError(res, err, 'Failed to load courses');
  }
};

export const getCourseContent = async (req, res) => {
  try {
    ensurePackBuilderRole(req.user?.role);
    const courseId = parseRequiredInt(req.params?.id, 'course_id');
    const hierarchyMode = String(req.query?.view ?? '').trim().toLowerCase() === 'tree';
    const { page, pageSize, offset } = hierarchyMode
      ? { page: 1, pageSize: 1000, offset: 0 }
      : parsePagination(req.query);
    const metadata = await getCourseMetadataExpressions('c');

    const courseResult = await dbQuery(
      `
        SELECT
          c.id,
          c.title AS name,
          c.client_id,
          ${metadata.grade} AS grade,
          ${metadata.subject} AS subject
        FROM courses c
        WHERE c.id = $1
        LIMIT 1
      `,
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      throw new HttpError(404, 'Course not found');
    }

    const countResult = await dbQuery(
      `SELECT COUNT(*)::int AS total FROM content_items WHERE course_id = $1`,
      [courseId]
    );
    const total = Number(countResult.rows[0]?.total ?? 0);

    const course = courseResult.rows[0];
    const result = hierarchyMode
      ? await dbQuery(
          `
            SELECT
              id,
              course_id,
              parent_id,
              item_type,
              title,
              content_url,
              order_index,
              created_at
            FROM content_items
            WHERE course_id = $1
            ORDER BY parent_id NULLS FIRST, order_index ASC, created_at ASC
          `,
          [courseId]
        )
      : await dbQuery(
          `
            SELECT
              id,
              course_id,
              parent_id,
              item_type,
              title,
              content_url,
              order_index,
              created_at
            FROM content_items
            WHERE course_id = $1
            ORDER BY parent_id NULLS FIRST, order_index ASC, created_at ASC
            LIMIT $2 OFFSET $3
          `,
          [courseId, pageSize, offset]
        );

    return res.json({
      data: result.rows.map((row) => ({
        ...row,
        course_name: course.name,
        grade: course.grade ?? null,
        subject: course.subject ?? null,
      })),
      page,
      page_size: hierarchyMode ? total : pageSize,
      total,
    });
  } catch (err) {
    return handleHttpError(res, err, 'Failed to load course content');
  }
};

export const createCourse = async (req, res) => {
  try {
    ensurePackBuilderRole(req.user?.role);
    const name = normalizeRequiredText(req.body?.name ?? req.body?.title, 'name');
    const grade = normalizeRequiredText(req.body?.grade, 'grade');
    const subject = normalizeOptionalText(req.body?.subject);
    const clientId = parseNullableInt(req.body?.client_id, 'client_id');

    await ensureCourseMetadataColumn();

    const createdBy = req.user?.id ?? null;
    const result = await dbQuery(
      `
        INSERT INTO courses (title, description, published, created_by, client_id, metadata)
        VALUES ($1, NULL, false, $2, $3, $4::jsonb)
        RETURNING id
      `,
      [name, createdBy, clientId, JSON.stringify({ grade, subject })]
    );

    return res.status(201).json({ course_id: Number(result.rows[0]?.id) });
  } catch (err) {
    return handleHttpError(res, err, 'Failed to create course');
  }
};

export const importCourseContent = async (req, res) => {
  try {
    ensurePackBuilderRole(req.user?.role);
    const targetCourseId = parseRequiredInt(req.params?.id, 'target_course_id');
    const sourceCourseId = parseRequiredInt(req.body?.source_course_id, 'source_course_id');
    const itemIds = parseItemIds(req.body?.item_ids ?? req.body?.content_ids);

    if (targetCourseId === sourceCourseId) {
      throw new HttpError(400, 'Source and target courses must be different');
    }

    const courseResult = await dbQuery(
      `
        SELECT id, title
        FROM courses
        WHERE id = ANY($1::int[])
      `,
      [[targetCourseId, sourceCourseId]]
    );

    if (courseResult.rows.length !== 2) {
      throw new HttpError(404, 'Source or target course not found');
    }

    const sourceCourse = courseResult.rows.find((row) => Number(row.id) === sourceCourseId);
    const targetCourse = courseResult.rows.find((row) => Number(row.id) === targetCourseId);
    if (!sourceCourse || !targetCourse) {
      throw new HttpError(404, 'Source or target course not found');
    }

    const metadataColumnExists = await hasContentMetadataColumn();
    const selectedRowsResult = await dbQuery(
      metadataColumnExists
        ? `
            SELECT id, parent_id, item_type, title, content_url, order_index, created_at, metadata
            FROM content_items
            WHERE course_id = $1
              AND id = ANY($2::int[])
          `
        : `
            SELECT id, parent_id, item_type, title, content_url, order_index, created_at, '{}'::jsonb AS metadata
            FROM content_items
            WHERE course_id = $1
              AND id = ANY($2::int[])
          `,
      [sourceCourseId, itemIds]
    );

    if (selectedRowsResult.rows.length !== itemIds.length) {
      throw new HttpError(400, 'One or more selected items were not found in the source course');
    }

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

    const client = await getClient();

    try {
      await client.query('BEGIN');
      await ensureCourseExamsTable();

      const nextOrderIndexCache = new Map();
      const insertedItemIds = [];

      const getNextOrderIndex = async (parentId) => {
        const key = parentId === null ? 'root' : String(parentId);
        const cached = nextOrderIndexCache.get(key);
        if (cached !== undefined) {
          nextOrderIndexCache.set(key, cached + 1);
          return cached;
        }

        const maxOrderResult = await client.query(
          `
            SELECT COALESCE(MAX(order_index), -1) AS max_order
            FROM content_items
            WHERE course_id = $1
              AND parent_id IS NOT DISTINCT FROM $2
          `,
          [targetCourseId, parentId]
        );

        const nextValue = Number(maxOrderResult.rows[0]?.max_order ?? -1) + 1;
        nextOrderIndexCache.set(key, nextValue + 1);
        return nextValue;
      };

      const copyBranch = async (sourceParentId, targetParentId) => {
        const sourceChildren = childrenByParent.get(sourceParentId) ?? [];
        for (const sourceRow of sourceChildren) {
          const nextOrderIndex = await getNextOrderIndex(targetParentId);
          const insertQuery = metadataColumnExists
            ? `
                INSERT INTO content_items (course_id, parent_id, item_type, title, content_url, order_index, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
                RETURNING id
              `
            : `
                INSERT INTO content_items (course_id, parent_id, item_type, title, content_url, order_index)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
              `;
          const insertParams = metadataColumnExists
            ? [
                targetCourseId,
                targetParentId,
                sourceRow.item_type,
                sourceRow.title,
                sourceRow.content_url,
                nextOrderIndex,
                JSON.stringify(sourceRow.metadata ?? {}),
              ]
            : [
                targetCourseId,
                targetParentId,
                sourceRow.item_type,
                sourceRow.title,
                sourceRow.content_url,
                nextOrderIndex,
              ];

          const insertResult = await client.query(insertQuery, insertParams);
          const newItemId = Number(insertResult.rows[0]?.id);
          insertedItemIds.push(newItemId);

          if (sourceRow.item_type === 'exam') {
            const examId = Number(sourceRow.metadata?.exam_id);
            if (Number.isInteger(examId) && examId > 0) {
              await client.query(
                `
                  INSERT INTO course_exams (course_id, exam_id, assigned_by)
                  VALUES ($1, $2, $3)
                  ON CONFLICT (course_id, exam_id)
                  DO UPDATE SET assigned_by = EXCLUDED.assigned_by, assigned_at = NOW()
                `,
                [targetCourseId, examId, req.user?.id ?? null]
              );
            }
          }

          if (sourceRow.item_type === 'folder') {
            await copyBranch(sourceRow.id, newItemId);
          }
        }
      };

      await copyBranch(null, null);
      await client.query('COMMIT');

      return res.json({
        target_course_id: targetCourseId,
        source_course_id: sourceCourseId,
        added_item_ids: insertedItemIds,
        imported_count: insertedItemIds.length,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (err) {
    return handleHttpError(res, err, 'Failed to import course content');
  }
};

export const addPackItems = async (req, res) => {
  try {
    ensurePackBuilderRole(req.user?.role);
    const { column: itemColumn } = await getPackItemColumnConfig();
    const packId = parseRequiredInt(req.params?.id, 'pack_id');
    const itemIds = parseItemIds(req.body?.item_ids ?? req.body?.content_ids);
    const { addedItemIds, skippedItemIds, itemCount } = await attachItemsToPack(packId, itemIds, itemColumn);

    return res.json({
      added_item_ids: addedItemIds,
      skipped_item_ids: skippedItemIds,
      item_count: itemCount,
    });
  } catch (err) {
    return handleHttpError(res, err, 'Failed to add items to pack');
  }
};

export const attachCourseToPack = async (req, res) => {
  try {
    ensurePackBuilderRole(req.user?.role);
    const { column: itemColumn } = await getPackItemColumnConfig();
    const packId = parseRequiredInt(req.params?.id, 'pack_id');
    const courseId = parseRequiredInt(req.body?.course_id, 'course_id');

    await getPackOrThrow(packId);

    const courseResult = await dbQuery(
      `
        SELECT id, client_id
        FROM courses
        WHERE id = $1
        LIMIT 1
      `,
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      throw new HttpError(404, 'Course not found');
    }

    const itemsResult = await dbQuery(
      `
        SELECT id
        FROM content_items
        WHERE course_id = $1
        ORDER BY order_index ASC, created_at ASC
      `,
      [courseId]
    );

    const itemIds = itemsResult.rows.map((row) => Number(row.id));
    if (itemIds.length === 0) {
      const itemCount = await getPackItemCount(packId, itemColumn);
      return res.json({
        course_id: courseId,
        added_item_ids: [],
        skipped_item_ids: [],
        item_count: itemCount,
      });
    }

    const { addedItemIds, skippedItemIds, itemCount } = await attachItemsToPack(packId, itemIds, itemColumn);
    return res.json({
      course_id: courseId,
      added_item_ids: addedItemIds,
      skipped_item_ids: skippedItemIds,
      item_count: itemCount,
    });
  } catch (err) {
    return handleHttpError(res, err, 'Failed to attach course to pack');
  }
};

export const removePackItem = async (req, res) => {
  try {
    ensurePackBuilderRole(req.user?.role);
    const { column: itemColumn } = await getPackItemColumnConfig();
    const packId = parseRequiredInt(req.params?.id, 'pack_id');
    const itemId = parseRequiredInt(req.params?.itemId, 'item_id');

    await getPackOrThrow(packId);

    const result = await dbQuery(
      `DELETE FROM content_pack_items WHERE pack_id = $1 AND ${itemColumn} = $2`,
      [packId, itemId]
    );

    const itemCount = await getPackItemCount(packId, itemColumn);
    return res.json({
      removed: result.rowCount > 0,
      item_count: itemCount,
    });
  } catch (err) {
    return handleHttpError(res, err, 'Failed to remove item from pack');
  }
};
