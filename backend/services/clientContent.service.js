import { query as dbQuery } from '../repositories/db.repository.js';

const PLATFORM_OWNER_CLIENT_ID = 17;

const CLIENT_LIBRARY_ROLES = new Set(['client_admin']);
const PLATFORM_CONTENT_ROLES = new Set(['super_admin', 'content_authorizer']);

let linkedContentTableEnsured = false;
let courseExamsTableEnsured = false;
let contentMetadataColumnPromise;
let packItemColumnPromise;
let enrollmentsUserColumnPromise;

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

const parseOptionalInt = (value, fieldName) => {
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

const normalizeOptionalText = (value) => {
  const trimmed = String(value ?? '').trim();
  return trimmed ? trimmed : null;
};

const ensureClientLibraryRole = (role) => {
  if (!CLIENT_LIBRARY_ROLES.has(role)) {
    throw new HttpError(403, 'Access denied');
  }
};

const ensureLinkedContentAuthorRole = (role) => {
  if (!CLIENT_LIBRARY_ROLES.has(role)) {
    throw new HttpError(403, 'Access denied');
  }
};

const handleHttpError = (res, err, fallbackMessage) => {
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  console.error(fallbackMessage, err);
  return res.status(500).json({ error: fallbackMessage });
};

const ensureCourseLinkedContentTable = async () => {
  if (linkedContentTableEnsured) return;

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS course_linked_content (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      content_item_id INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
      source_pack_id INTEGER REFERENCES content_packs(id) ON DELETE SET NULL,
      parent_content_id INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
      order_index INTEGER NOT NULL DEFAULT 0,
      linked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      UNIQUE (course_id, content_item_id)
    )
  `);
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_course_linked_content_course ON course_linked_content(course_id)`);
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_course_linked_content_item ON course_linked_content(content_item_id)`);
  await dbQuery(`
    CREATE INDEX IF NOT EXISTS idx_course_linked_content_parent_order
    ON course_linked_content(course_id, parent_content_id, order_index)
  `);

  linkedContentTableEnsured = true;
};

const ensureCourseExamsTable = async () => {
  if (courseExamsTableEnsured) return;

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS course_exams (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(course_id, exam_id)
    )
  `);
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_course_exams_exam_id ON course_exams(exam_id)`);
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_course_exams_course_id ON course_exams(course_id)`);

  courseExamsTableEnsured = true;
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

const getPackItemColumn = async () => {
  if (!packItemColumnPromise) {
    packItemColumnPromise = (async () => {
      const result = await dbQuery(
        `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'content_pack_items'
            AND column_name IN ('item_id', 'content_id')
          ORDER BY CASE WHEN column_name = 'item_id' THEN 0 ELSE 1 END
          LIMIT 1
        `
      );

      const columnName = result.rows[0]?.column_name;
      if (!columnName) {
        throw new HttpError(500, 'content_pack_items is missing an item membership column');
      }

      return columnName;
    })();
  }

  return packItemColumnPromise;
};

const resolveEnrollmentUserColumn = async () => {
  if (!enrollmentsUserColumnPromise) {
    enrollmentsUserColumnPromise = dbQuery(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'enrollments'
          AND column_name IN ('user_id', 'student_id')
        ORDER BY CASE WHEN column_name = 'user_id' THEN 0 ELSE 1 END
        LIMIT 1
      `
    ).then((result) => {
      const columnName = result.rows[0]?.column_name;
      if (!columnName) {
        throw new HttpError(500, 'enrollments table is missing a user linkage column');
      }
      return columnName;
    });
  }

  return enrollmentsUserColumnPromise;
};

const getMetadataSelect = async (alias = 'ci') => (
  (await hasContentMetadataColumn()) ? `${alias}.metadata` : `'{}'::jsonb`
);

const getMetadataExamIdSql = async (alias = 'ci') => {
  if (await hasContentMetadataColumn()) {
    return `
      CASE
        WHEN ${alias}.metadata IS NOT NULL
          AND COALESCE(${alias}.metadata->>'exam_id', '') ~ '^[0-9]+$'
        THEN (${alias}.metadata->>'exam_id')::int
        WHEN COALESCE(${alias}.content_url, '') ~ '^exam:[0-9]+$'
        THEN SUBSTRING(${alias}.content_url FROM '^exam:([0-9]+)$')::int
        WHEN COALESCE(${alias}.content_url, '') ~ '^[0-9]+$'
        THEN ${alias}.content_url::int
        ELSE NULL
      END
    `;
  }

  return `
    CASE
      WHEN COALESCE(${alias}.content_url, '') ~ '^exam:[0-9]+$'
      THEN SUBSTRING(${alias}.content_url FROM '^exam:([0-9]+)$')::int
      WHEN COALESCE(${alias}.content_url, '') ~ '^[0-9]+$'
      THEN ${alias}.content_url::int
      ELSE NULL
    END
  `;
};

const buildActiveEntitlementExistsSql = async ({ clientIdExpression, contentIdExpression }) => {
  const packItemColumn = await getPackItemColumn();
  return `
    EXISTS (
      WITH RECURSIVE entitlement_ancestors AS (
        SELECT ci.id, ci.parent_id
        FROM content_items ci
        WHERE ci.id = ${contentIdExpression}

        UNION

        SELECT parent.id, parent.parent_id
        FROM content_items parent
        JOIN entitlement_ancestors ancestors
          ON ancestors.parent_id = parent.id
      )
      SELECT 1
      FROM entitlement_ancestors ea
      JOIN content_entitlements ce
        ON ce.client_id = ${clientIdExpression}
       AND ce.status = 'active'
       AND NOW() BETWEEN ce.start_at AND ce.end_at
      LEFT JOIN content_pack_items cpi ON ce.pack_id = cpi.pack_id
      WHERE ce.content_id = ea.id
         OR cpi.${packItemColumn} = ea.id
      LIMIT 1
    )
  `;
};

const getCourseForClientAdmin = async ({ courseId, clientId }) => {
  const result = await dbQuery(
    `
      SELECT id, title, client_id, published
      FROM courses
      WHERE id = $1 AND client_id = $2
      LIMIT 1
    `,
    [courseId, clientId]
  );

  if (result.rows.length === 0) {
    throw new HttpError(403, 'Access denied');
  }

  return result.rows[0];
};

const getParentFolderOrThrow = async ({ courseId, parentContentId }) => {
  const result = await dbQuery(
    `
      SELECT id, item_type
      FROM content_items
      WHERE id = $1 AND course_id = $2
      LIMIT 1
    `,
    [parentContentId, courseId]
  );

  if (result.rows.length === 0) {
    throw new HttpError(404, 'Parent content item not found');
  }

  if (result.rows[0].item_type !== 'folder') {
    throw new HttpError(400, 'Linked content can only be placed inside a chapter');
  }

  return result.rows[0];
};

const getContentItemOrThrow = async (contentItemId) => {
  const metadataSelect = await getMetadataSelect('ci');
  const result = await dbQuery(
    `
      SELECT
        ci.id,
        ci.course_id,
        ci.parent_id,
        ci.item_type,
        ci.title,
        ci.content_url,
        ${metadataSelect} AS metadata,
        ci.order_index,
        ci.created_at,
        c.client_id
      FROM content_items ci
      JOIN courses c ON c.id = ci.course_id
      WHERE ci.id = $1
      LIMIT 1
    `,
    [contentItemId]
  );

  if (result.rows.length === 0) {
    throw new HttpError(404, 'Content item not found');
  }

  return result.rows[0];
};

const assertClientHasPackAccess = async ({ clientId, packId }) => {
  const result = await dbQuery(
    `
      SELECT 1
      FROM content_entitlements
      WHERE client_id = $1
        AND pack_id = $2
        AND status = 'active'
        AND NOW() BETWEEN start_at AND end_at
      LIMIT 1
    `,
    [clientId, packId]
  );

  if (result.rows.length === 0) {
    throw new HttpError(403, 'Client is not entitled to this pack');
  }
};

const hasClientContentAccess = async ({ clientId, contentItemId }) => {
  const packItemColumn = await getPackItemColumn();
  const result = await dbQuery(
    `
      WITH RECURSIVE entitlement_ancestors AS (
        SELECT ci.id, ci.parent_id
        FROM content_items ci
        WHERE ci.id = $2

        UNION

        SELECT parent.id, parent.parent_id
        FROM content_items parent
        JOIN entitlement_ancestors ancestors
          ON ancestors.parent_id = parent.id
      )
      SELECT 1
      FROM entitlement_ancestors ea
      JOIN content_entitlements ce
        ON ce.client_id = $1
       AND ce.status = 'active'
       AND NOW() BETWEEN ce.start_at AND ce.end_at
      LEFT JOIN content_pack_items cpi ON ce.pack_id = cpi.pack_id
      WHERE ce.content_id = ea.id
         OR cpi.${packItemColumn} = ea.id
      LIMIT 1
    `,
    [clientId, contentItemId]
  );

  return result.rows.length > 0;
};

const assertClientHasContentAccess = async ({ clientId, contentItemId, sourcePackId = null }) => {
  if (sourcePackId !== null) {
    await assertClientHasPackAccess({ clientId, packId: sourcePackId });
  }

  const hasAccess = await hasClientContentAccess({ clientId, contentItemId });
  if (!hasAccess) {
    throw new HttpError(403, 'Client is not entitled to this content item');
  }
};

const getExistingLinkedItem = async ({ courseId, contentItemId }) => {
  const result = await dbQuery(
    `
      SELECT id
      FROM course_linked_content
      WHERE course_id = $1
        AND content_item_id = $2
        AND is_active = true
      LIMIT 1
    `,
    [courseId, contentItemId]
  );

  return result.rows[0] ?? null;
};

const getNextOrderIndex = async ({ courseId, parentContentId }) => {
  await ensureCourseLinkedContentTable();

  const result = await dbQuery(
    `
      SELECT COALESCE(MAX(order_index), -1)::int + 1 AS next_order_index
      FROM (
        SELECT order_index
        FROM content_items
        WHERE course_id = $1
          AND parent_id IS NOT DISTINCT FROM $2
        UNION ALL
        SELECT order_index
        FROM course_linked_content
        WHERE course_id = $1
          AND parent_content_id IS NOT DISTINCT FROM $2
          AND is_active = true
      ) items
    `,
    [courseId, parentContentId]
  );

  return Number(result.rows[0]?.next_order_index ?? 0);
};

const ensureLinkedExamMapping = async ({ courseId, contentItemId, userId }) => {
  await ensureCourseExamsTable();
  const examIdExpression = await getMetadataExamIdSql('ci');
  const result = await dbQuery(
    `
      SELECT ${examIdExpression} AS exam_id
      FROM content_items ci
      WHERE ci.id = $1
      LIMIT 1
    `,
    [contentItemId]
  );

  const examId = Number(result.rows[0]?.exam_id ?? 0);
  if (!Number.isInteger(examId) || examId <= 0) {
    return;
  }

  await dbQuery(
    `
      INSERT INTO course_exams (course_id, exam_id, assigned_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (course_id, exam_id)
      DO UPDATE SET assigned_by = EXCLUDED.assigned_by, assigned_at = NOW()
    `,
    [courseId, examId, userId ?? null]
  );
};

const removeLinkedExamMappingIfUnused = async ({ courseId, contentItemId }) => {
  await ensureCourseExamsTable();
  const examIdExpression = await getMetadataExamIdSql('ci');
  const examIdResult = await dbQuery(
    `
      SELECT ${examIdExpression} AS exam_id
      FROM content_items ci
      WHERE ci.id = $1
      LIMIT 1
    `,
    [contentItemId]
  );

  const examId = Number(examIdResult.rows[0]?.exam_id ?? 0);
  if (!Number.isInteger(examId) || examId <= 0) {
    return;
  }

  const localResult = await dbQuery(
    `
      SELECT 1
      FROM content_items ci
      WHERE ci.course_id = $1
        AND ci.item_type = 'exam'
        AND (${await getMetadataExamIdSql('ci')}) = $2
      LIMIT 1
    `,
    [courseId, examId]
  );

  if (localResult.rows.length > 0) {
    return;
  }

  const linkedResult = await dbQuery(
    `
      SELECT 1
      FROM course_linked_content clc
      JOIN content_items ci ON ci.id = clc.content_item_id
      WHERE clc.course_id = $1
        AND clc.is_active = true
        AND (${await getMetadataExamIdSql('ci')}) = $2
      LIMIT 1
    `,
    [courseId, examId]
  );

  if (linkedResult.rows.length === 0) {
    await dbQuery(`DELETE FROM course_exams WHERE course_id = $1 AND exam_id = $2`, [courseId, examId]);
  }
};

const buildCourseContentUnionSql = async ({ includeAttemptStatus }) => {
  const metadataSelect = await getMetadataSelect('ci');
  const examIdExpression = await getMetadataExamIdSql('ci');
  const activeEntitlementSql = await buildActiveEntitlementExistsSql({
    clientIdExpression: 'course_scope.client_id',
    contentIdExpression: 'ci.id',
  });

  const completionSelect = includeAttemptStatus
    ? `COALESCE(latest_sa.completion_status, 'not attempted') AS completion_status,`
    : `NULL::text AS completion_status,`;

  const attemptJoin = includeAttemptStatus
    ? `
      LEFT JOIN LATERAL (
        SELECT sa.completion_status
        FROM student_attempts sa
        WHERE sa.user_id = $2
          AND sa.content_item_id = ci.id
        ORDER BY sa.id DESC
        LIMIT 1
      ) latest_sa ON true
    `
    : '';

  return `
    SELECT *
    FROM (
      SELECT
        ci.id,
        ci.course_id,
        ci.parent_id,
        ci.item_type,
        ci.title,
        ci.content_url,
        ${metadataSelect} AS metadata,
        ci.order_index,
        ci.created_at,
        ${completionSelect}
        false AS is_linked_content,
        NULL::int AS linked_content_id,
        NULL::int AS source_pack_id,
        true AS download_allowed,
        'course'::text AS link_origin,
        true AS is_editable,
        NULL::timestamptz AS linked_at
      FROM content_items ci
      LEFT JOIN exams content_exam ON content_exam.id = ${examIdExpression}
      ${attemptJoin}
      WHERE ci.course_id = $1
        AND (ci.item_type <> 'exam' OR content_exam.status = 'published')

      UNION ALL

      SELECT
        ci.id,
        clc.course_id,
        clc.parent_content_id AS parent_id,
        ci.item_type,
        ci.title,
        ci.content_url,
        ${metadataSelect} AS metadata,
        clc.order_index,
        clc.linked_at AS created_at,
        ${completionSelect}
        true AS is_linked_content,
        clc.id AS linked_content_id,
        clc.source_pack_id,
        false AS download_allowed,
        'licensed_pack'::text AS link_origin,
        false AS is_editable,
        clc.linked_at
      FROM course_linked_content clc
      JOIN content_items ci ON ci.id = clc.content_item_id
      JOIN courses course_scope ON course_scope.id = clc.course_id
      LEFT JOIN exams content_exam ON content_exam.id = ${examIdExpression}
      ${attemptJoin}
      WHERE clc.course_id = $1
        AND clc.is_active = true
        AND ${activeEntitlementSql}
        AND (ci.item_type <> 'exam' OR content_exam.status = 'published')
    ) merged_items
    ORDER BY parent_id NULLS FIRST, order_index ASC, linked_at NULLS LAST, created_at ASC
  `;
};

export const getMergedCourseContentRows = async ({ courseId, includeAttemptStatus = false, userId = null }) => {
  await ensureCourseLinkedContentTable();
  const sql = await buildCourseContentUnionSql({ includeAttemptStatus });
  const params = includeAttemptStatus ? [courseId, userId] : [courseId];
  const result = await dbQuery(sql, params);
  return result.rows;
};

export const getEntitledCourseContentRows = async ({
  courseId,
  clientId,
  includeAttemptStatus = false,
  userId = null,
}) => {
  await ensureCourseLinkedContentTable();
  const normalizedClientId = Number(clientId);
  if (!Number.isInteger(normalizedClientId) || normalizedClientId <= 0) {
    return [];
  }

  const packItemColumn = await getPackItemColumn();
  const metadataSelect = await getMetadataSelect('ci');
  const examIdExpression = await getMetadataExamIdSql('ci');
  const completionSelect = includeAttemptStatus
    ? `COALESCE(latest_sa.completion_status, 'not attempted') AS completion_status,`
    : `NULL::text AS completion_status,`;
  const attemptJoin = includeAttemptStatus
    ? `
      LEFT JOIN LATERAL (
        SELECT sa.completion_status
        FROM student_attempts sa
        WHERE sa.user_id = $3
          AND sa.content_item_id = ci.id
        ORDER BY sa.id DESC
        LIMIT 1
      ) latest_sa ON true
    `
    : '';

  const result = await dbQuery(
    `
      WITH RECURSIVE entitled_seed AS (
        SELECT DISTINCT licensed.id
        FROM (
          SELECT ce.content_id AS id
          FROM content_entitlements ce
          JOIN content_items ci
            ON ci.id = ce.content_id
          WHERE ce.client_id = $1
            AND ce.status = 'active'
            AND NOW() BETWEEN ce.start_at AND ce.end_at
            AND ci.course_id = $2

          UNION

          SELECT cpi.${packItemColumn} AS id
          FROM content_entitlements ce
          JOIN content_pack_items cpi
            ON cpi.pack_id = ce.pack_id
          JOIN content_items ci
            ON ci.id = cpi.${packItemColumn}
          WHERE ce.client_id = $1
            AND ce.status = 'active'
            AND NOW() BETWEEN ce.start_at AND ce.end_at
            AND ci.course_id = $2
        ) licensed
        WHERE licensed.id IS NOT NULL
      ),
      entitled_descendants AS (
        SELECT ci.id, ci.parent_id
        FROM content_items ci
        JOIN entitled_seed seed
          ON seed.id = ci.id

        UNION

        SELECT child.id, child.parent_id
        FROM content_items child
        JOIN entitled_descendants branch
          ON branch.id = child.parent_id
        WHERE child.course_id = $2
      ),
      entitled_ancestors AS (
        SELECT ci.id, ci.parent_id
        FROM content_items ci
        JOIN entitled_seed seed
          ON seed.id = ci.id

        UNION

        SELECT parent.id, parent.parent_id
        FROM content_items parent
        JOIN entitled_ancestors branch
          ON branch.parent_id = parent.id
        WHERE parent.course_id = $2
      ),
      entitled_items AS (
        SELECT id FROM entitled_descendants
        UNION
        SELECT id FROM entitled_ancestors
      )
      SELECT
        ci.id,
        ci.course_id,
        ci.parent_id,
        ci.item_type,
        ci.title,
        ci.content_url,
        ${metadataSelect} AS metadata,
        ci.order_index,
        ci.created_at,
        ${completionSelect}
        false AS is_linked_content,
        NULL::int AS linked_content_id,
        NULL::int AS source_pack_id,
        true AS download_allowed,
        'course'::text AS link_origin,
        false AS is_editable,
        NULL::timestamptz AS linked_at
      FROM content_items ci
      LEFT JOIN exams content_exam ON content_exam.id = ${examIdExpression}
      ${attemptJoin}
      WHERE ci.course_id = $2
        AND ci.id IN (SELECT id FROM entitled_items)
        AND (ci.item_type <> 'exam' OR content_exam.status = 'published')
      ORDER BY ci.parent_id NULLS FIRST, ci.order_index ASC, ci.created_at ASC
    `,
    includeAttemptStatus
      ? [normalizedClientId, Number(courseId), userId]
      : [normalizedClientId, Number(courseId)]
  );

  return result.rows;
};

export const contentIsLinkedIntoCourse = async ({ courseId, contentItemId }) => {
  await ensureCourseLinkedContentTable();
  const result = await dbQuery(
    `
      SELECT id
      FROM course_linked_content
      WHERE course_id = $1
        AND content_item_id = $2
        AND is_active = true
      LIMIT 1
    `,
    [courseId, contentItemId]
  );
  return result.rows[0] ?? null;
};

export const userCanAccessContentItem = async ({ user, contentItemId }) => {
  await ensureCourseLinkedContentTable();
  const role = user?.role;
  const clientId = user?.client_id ?? null;
  const userId = user?.id ?? null;

  if (!role || !userId) {
    return false;
  }

  if (role === 'super_admin' || PLATFORM_CONTENT_ROLES.has(role)) {
    return true;
  }

  if (role === 'client_admin') {
    if (!clientId) return false;
    const directResult = await dbQuery(
      `
        SELECT 1
        FROM content_items ci
        JOIN courses c ON c.id = ci.course_id
        WHERE ci.id = $1
          AND c.client_id = $2
        LIMIT 1
      `,
      [contentItemId, clientId]
    );
    if (directResult.rows.length > 0) {
      return true;
    }
    return hasClientContentAccess({ clientId, contentItemId });
  }

  if (role === 'school_owner' || role === 'teacher') {
    if (!clientId) return false;
    const activeEntitlementSql = await buildActiveEntitlementExistsSql({
      clientIdExpression: 'linked_course.client_id',
      contentIdExpression: 'ci.id',
    });
    const directEntitlementSql = await buildActiveEntitlementExistsSql({
      clientIdExpression: String(Number(clientId)),
      contentIdExpression: 'ci.id',
    });

    const result = await dbQuery(
      `
      SELECT 1
      FROM content_items ci
      LEFT JOIN courses direct_course ON direct_course.id = ci.course_id
      LEFT JOIN course_linked_content clc
        ON clc.content_item_id = ci.id
       AND clc.is_active = true
      LEFT JOIN courses linked_course ON linked_course.id = clc.course_id
      WHERE ci.id = $1
        AND (
          direct_course.client_id = $2
          OR (
            (direct_course.client_id IS NULL OR direct_course.client_id = ${PLATFORM_OWNER_CLIENT_ID})
            AND ${directEntitlementSql}
          )
          OR (
            linked_course.client_id = $2
            AND ${activeEntitlementSql}
          )
        )
        LIMIT 1
      `,
      [contentItemId, clientId]
    );
    return result.rows.length > 0;
  }

  const enrollmentUserColumn = await resolveEnrollmentUserColumn();
  const activeEntitlementSql = await buildActiveEntitlementExistsSql({
    clientIdExpression: 'c.client_id',
    contentIdExpression: 'ci.id',
  });

  const result = await dbQuery(
    `
      SELECT 1
      FROM content_items ci
      LEFT JOIN courses direct_course ON direct_course.id = ci.course_id
      LEFT JOIN enrollments direct_enrollment
        ON direct_enrollment.course_id = direct_course.id
       AND direct_enrollment.${enrollmentUserColumn} = $2
      LEFT JOIN course_linked_content clc
        ON clc.content_item_id = ci.id
       AND clc.is_active = true
      LEFT JOIN courses c ON c.id = clc.course_id
      LEFT JOIN enrollments linked_enrollment
        ON linked_enrollment.course_id = c.id
       AND linked_enrollment.${enrollmentUserColumn} = $2
      WHERE ci.id = $1
        AND (
          direct_enrollment.${enrollmentUserColumn} IS NOT NULL
          OR (
            linked_enrollment.${enrollmentUserColumn} IS NOT NULL
            AND c.client_id IS NOT NULL
            AND ${activeEntitlementSql}
          )
        )
      LIMIT 1
    `,
    [contentItemId, userId]
  );

  return result.rows.length > 0;
};

export const getAccessibleLinkedCourseIdsForContent = async ({ user, contentItemId }) => {
  await ensureCourseLinkedContentTable();
  const role = user?.role;
  const clientId = user?.client_id ?? null;
  const userId = user?.id ?? null;

  if (!role || !userId) {
    return [];
  }

  if (role === 'client_admin') {
    if (!clientId) return [];
    const result = await dbQuery(
      `
        SELECT clc.course_id
        FROM course_linked_content clc
        JOIN courses c ON c.id = clc.course_id
        WHERE clc.content_item_id = $1
          AND clc.is_active = true
          AND c.client_id = $2
        ORDER BY clc.linked_at DESC
      `,
      [contentItemId, clientId]
    );
    return result.rows.map((row) => Number(row.course_id));
  }

  const enrollmentUserColumn = await resolveEnrollmentUserColumn();
  const activeEntitlementSql = await buildActiveEntitlementExistsSql({
    clientIdExpression: 'c.client_id',
    contentIdExpression: 'clc.content_item_id',
  });

  const result = await dbQuery(
    `
      SELECT DISTINCT clc.course_id
      FROM course_linked_content clc
      JOIN courses c ON c.id = clc.course_id
      JOIN enrollments e
        ON e.course_id = c.id
       AND e.${enrollmentUserColumn} = $2
      WHERE clc.content_item_id = $1
        AND clc.is_active = true
        AND ${activeEntitlementSql}
      ORDER BY clc.course_id ASC
    `,
    [contentItemId, userId]
  );

  return result.rows.map((row) => Number(row.course_id));
};

export const listLicensedPacks = async (req, res) => {
  try {
    ensureClientLibraryRole(req.user?.role);
    const clientId = parseRequiredInt(req.user?.client_id, 'client_id');
    const { page, pageSize, offset } = parsePagination(req.query);
    const packItemColumn = await getPackItemColumn();

    const countResult = await dbQuery(
      `
        SELECT COUNT(*)::int AS total
        FROM (
          SELECT ce.pack_id
          FROM content_entitlements ce
          WHERE ce.client_id = $1
            AND ce.pack_id IS NOT NULL
            AND ce.status = 'active'
            AND NOW() BETWEEN ce.start_at AND ce.end_at
          GROUP BY ce.pack_id
        ) licensed_packs
      `,
      [clientId]
    );

    const result = await dbQuery(
      `
        SELECT
          cp.id,
          cp.name,
          cp.description,
          COUNT(DISTINCT cpi.${packItemColumn})::int AS item_count,
          MIN(ce.start_at) AS active_from,
          MAX(ce.end_at) AS active_until
        FROM content_entitlements ce
        JOIN content_packs cp ON cp.id = ce.pack_id
        LEFT JOIN content_pack_items cpi ON cpi.pack_id = cp.id
        WHERE ce.client_id = $1
          AND ce.pack_id IS NOT NULL
          AND ce.status = 'active'
          AND NOW() BETWEEN ce.start_at AND ce.end_at
        GROUP BY cp.id, cp.name, cp.description
        ORDER BY cp.name ASC
        LIMIT $2 OFFSET $3
      `,
      [clientId, pageSize, offset]
    );

    return res.json({
      data: result.rows,
      page,
      page_size: pageSize,
      total: Number(countResult.rows[0]?.total ?? 0),
    });
  } catch (err) {
    return handleHttpError(res, err, 'Failed to load licensed packs');
  }
};

export const getLicensedPackItems = async (req, res) => {
  try {
    ensureClientLibraryRole(req.user?.role);
    const clientId = parseRequiredInt(req.user?.client_id, 'client_id');
    const packId = parseRequiredInt(req.params?.id, 'pack_id');
    const courseId = parseOptionalInt(req.query?.course_id, 'course_id');
    const { page, pageSize, offset } = parsePagination(req.query);
    const packItemColumn = await getPackItemColumn();

    const packResult = await dbQuery(`SELECT id, name FROM content_packs WHERE id = $1 LIMIT 1`, [packId]);
    if (packResult.rows.length === 0) {
      throw new HttpError(404, 'Pack not found');
    }

    await assertClientHasPackAccess({ clientId, packId });

    const metadataSelect = await getMetadataSelect('ci');
    const linkedSelect = courseId
      ? `,
          EXISTS (
            SELECT 1
            FROM course_linked_content clc
            WHERE clc.course_id = $4
              AND clc.content_item_id = ci.id
              AND clc.is_active = true
          ) AS is_linked_to_course
        `
      : `,
          false AS is_linked_to_course
        `;

    const countResult = await dbQuery(
      `
        SELECT COUNT(*)::int AS total
        FROM content_pack_items cpi
        JOIN content_items ci ON ci.id = cpi.${packItemColumn}
        WHERE cpi.pack_id = $1
      `,
      [packId]
    );

    const params = courseId ? [packId, pageSize, offset, courseId] : [packId, pageSize, offset];
    const result = await dbQuery(
      `
        SELECT
          ci.id,
          ci.title,
          ci.item_type,
          ci.content_url,
          ${metadataSelect} AS metadata,
          false AS download_allowed
          ${linkedSelect}
        FROM content_pack_items cpi
        JOIN content_items ci ON ci.id = cpi.${packItemColumn}
        WHERE cpi.pack_id = $1
        ORDER BY ci.order_index ASC, ci.created_at ASC
        LIMIT $2 OFFSET $3
      `,
      params
    );

    return res.json({
      pack: packResult.rows[0],
      data: result.rows,
      page,
      page_size: pageSize,
      total: Number(countResult.rows[0]?.total ?? 0),
    });
  } catch (err) {
    return handleHttpError(res, err, 'Failed to load licensed pack items');
  }
};

export const listLicensedContent = async (req, res) => {
  try {
    ensureClientLibraryRole(req.user?.role);
    const clientId = parseRequiredInt(req.user?.client_id, 'client_id');
    const { page, pageSize, offset } = parsePagination(req.query);
    const q = normalizeOptionalText(req.query?.q);
    const packId = parseOptionalInt(req.query?.pack_id, 'pack_id');
    const itemType = normalizeOptionalText(req.query?.item_type);
    const metadataSelect = await getMetadataSelect('ci');
    const packItemColumn = await getPackItemColumn();

    const params = [clientId];
    const filters = [
      `licensed.status = 'active'`,
      `NOW() BETWEEN licensed.start_at AND licensed.end_at`,
    ];

    if (packId !== null) {
      params.push(packId);
      filters.push(`licensed.pack_id = $${params.length}`);
    }

    if (itemType) {
      params.push(itemType);
      filters.push(`ci.item_type = $${params.length}`);
    }

    if (q) {
      params.push(`%${q}%`);
      filters.push(`(ci.title ILIKE $${params.length} OR ci.item_type ILIKE $${params.length})`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const countResult = await dbQuery(
      `
        SELECT COUNT(*)::int AS total
        FROM (
          SELECT DISTINCT ci.id
          FROM content_items ci
          JOIN (
            SELECT ce.content_id, ce.pack_id, ce.start_at, ce.end_at, ce.status, cpi.${packItemColumn} AS pack_item_id
            FROM content_entitlements ce
            LEFT JOIN content_pack_items cpi ON cpi.pack_id = ce.pack_id
            WHERE ce.client_id = $1
          ) licensed ON licensed.content_id = ci.id OR licensed.pack_item_id = ci.id
          ${whereClause}
        ) licensed_items
      `,
      params
    );

    const result = await dbQuery(
      `
        SELECT DISTINCT
          ci.id,
          ci.title,
          ci.item_type,
          ci.content_url,
          ${metadataSelect} AS metadata,
          false AS download_allowed
        FROM content_items ci
        JOIN (
          SELECT ce.content_id, ce.pack_id, ce.start_at, ce.end_at, ce.status, cpi.${packItemColumn} AS pack_item_id
          FROM content_entitlements ce
          LEFT JOIN content_pack_items cpi ON cpi.pack_id = ce.pack_id
          WHERE ce.client_id = $1
        ) licensed ON licensed.content_id = ci.id OR licensed.pack_item_id = ci.id
        ${whereClause}
        ORDER BY ci.title ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
      [...params, pageSize, offset]
    );

    return res.json({
      data: result.rows,
      page,
      page_size: pageSize,
      total: Number(countResult.rows[0]?.total ?? 0),
    });
  } catch (err) {
    return handleHttpError(res, err, 'Failed to load licensed content');
  }
};

export const linkLicensedContentToCourse = async (req, res) => {
  try {
    ensureLinkedContentAuthorRole(req.user?.role);
    await ensureCourseLinkedContentTable();

    const courseId = parseRequiredInt(req.params?.courseId, 'course_id');
    const clientId = parseRequiredInt(req.user?.client_id, 'client_id');
    const contentItemId = parseRequiredInt(req.body?.content_item_id, 'content_item_id');
    const parentContentId = parseRequiredInt(req.body?.parent_content_id, 'parent_content_id');
    const sourcePackId = parseOptionalInt(req.body?.source_pack_id, 'source_pack_id');
    const requestedOrderIndex = parseOptionalInt(req.body?.order_index, 'order_index');

    await getCourseForClientAdmin({ courseId, clientId });
    await getParentFolderOrThrow({ courseId, parentContentId });
    const sourceItem = await getContentItemOrThrow(contentItemId);

    if (sourceItem.item_type === 'folder') {
      throw new HttpError(400, 'Folders cannot be linked into client courses');
    }

    await assertClientHasContentAccess({ clientId, contentItemId, sourcePackId });

    const existingLink = await getExistingLinkedItem({ courseId, contentItemId });
    if (existingLink) {
      throw new HttpError(409, 'This licensed content item is already linked into the course');
    }

    const orderIndex = requestedOrderIndex ?? await getNextOrderIndex({ courseId, parentContentId });
    const result = await dbQuery(
      `
        INSERT INTO course_linked_content (course_id, content_item_id, source_pack_id, parent_content_id, order_index, linked_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, course_id, content_item_id, source_pack_id, parent_content_id, order_index, linked_at, is_active
      `,
      [courseId, contentItemId, sourcePackId, parentContentId, orderIndex, req.user?.id ?? null]
    );

    await ensureLinkedExamMapping({ courseId, contentItemId, userId: req.user?.id ?? null });

    return res.status(201).json({
      ...result.rows[0],
      title: sourceItem.title,
      item_type: sourceItem.item_type,
      is_linked_content: true,
      download_allowed: false,
      link_origin: 'licensed_pack',
      is_editable: false,
    });
  } catch (err) {
    return handleHttpError(res, err, 'Failed to link licensed content into course');
  }
};

export const bulkLinkPackContentToCourse = async (req, res) => {
  try {
    ensureLinkedContentAuthorRole(req.user?.role);
    await ensureCourseLinkedContentTable();

    const courseId = parseRequiredInt(req.params?.courseId, 'course_id');
    const clientId = parseRequiredInt(req.user?.client_id, 'client_id');
    const packId = parseRequiredInt(req.body?.pack_id, 'pack_id');
    const parentContentId = parseRequiredInt(req.body?.parent_content_id, 'parent_content_id');
    const startOrderIndex = parseOptionalInt(req.body?.start_order_index, 'start_order_index');
    const packItemColumn = await getPackItemColumn();

    await getCourseForClientAdmin({ courseId, clientId });
    await getParentFolderOrThrow({ courseId, parentContentId });
    await assertClientHasPackAccess({ clientId, packId });

    const result = await dbQuery(
      `
        SELECT ci.id, ci.item_type
        FROM content_pack_items cpi
        JOIN content_items ci ON ci.id = cpi.${packItemColumn}
        WHERE cpi.pack_id = $1
          AND ci.item_type <> 'folder'
        ORDER BY ci.order_index ASC, ci.created_at ASC
      `,
      [packId]
    );

    const itemIds = result.rows.map((row) => Number(row.id));
    if (itemIds.length === 0) {
      return res.json({
        added_count: 0,
        skipped_count: 0,
        added_item_ids: [],
        skipped_item_ids: [],
      });
    }

    const existingResult = await dbQuery(
      `
        SELECT content_item_id
        FROM course_linked_content
        WHERE course_id = $1
          AND content_item_id = ANY($2::int[])
          AND is_active = true
      `,
      [courseId, itemIds]
    );
    const existingSet = new Set(existingResult.rows.map((row) => Number(row.content_item_id)));
    const addedItemIds = [];
    const skippedItemIds = [];
    let orderIndex = startOrderIndex ?? await getNextOrderIndex({ courseId, parentContentId });

    for (const itemId of itemIds) {
      if (existingSet.has(itemId)) {
        skippedItemIds.push(itemId);
        continue;
      }

      await dbQuery(
        `
          INSERT INTO course_linked_content (course_id, content_item_id, source_pack_id, parent_content_id, order_index, linked_by)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [courseId, itemId, packId, parentContentId, orderIndex, req.user?.id ?? null]
      );
      await ensureLinkedExamMapping({ courseId, contentItemId: itemId, userId: req.user?.id ?? null });
      addedItemIds.push(itemId);
      orderIndex += 1;
    }

    return res.json({
      added_count: addedItemIds.length,
      skipped_count: skippedItemIds.length,
      added_item_ids: addedItemIds,
      skipped_item_ids: skippedItemIds,
    });
  } catch (err) {
    return handleHttpError(res, err, 'Failed to link licensed pack into course');
  }
};

export const removeLinkedContentFromCourse = async (req, res) => {
  try {
    ensureLinkedContentAuthorRole(req.user?.role);
    await ensureCourseLinkedContentTable();

    const courseId = parseRequiredInt(req.params?.courseId, 'course_id');
    const clientId = parseRequiredInt(req.user?.client_id, 'client_id');
    const linkedContentId = parseRequiredInt(req.params?.linkedContentId, 'linked_content_id');

    await getCourseForClientAdmin({ courseId, clientId });

    const linkResult = await dbQuery(
      `
        SELECT id, content_item_id
        FROM course_linked_content
        WHERE id = $1
          AND course_id = $2
          AND is_active = true
        LIMIT 1
      `,
      [linkedContentId, courseId]
    );

    if (linkResult.rows.length === 0) {
      throw new HttpError(404, 'Linked content not found');
    }

    const linkRow = linkResult.rows[0];
    await dbQuery(`DELETE FROM course_linked_content WHERE id = $1`, [linkedContentId]);
    await removeLinkedExamMappingIfUnused({ courseId, contentItemId: Number(linkRow.content_item_id) });

    return res.json({
      success: true,
      linked_content_id: linkedContentId,
      removed: true,
    });
  } catch (err) {
    return handleHttpError(res, err, 'Failed to remove linked content from course');
  }
};

export const __resetClientContentCachesForTests = () => {
  linkedContentTableEnsured = false;
  courseExamsTableEnsured = false;
  contentMetadataColumnPromise = undefined;
  packItemColumnPromise = undefined;
  enrollmentsUserColumnPromise = undefined;
};
