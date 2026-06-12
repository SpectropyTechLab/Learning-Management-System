import { query as dbQuery } from '../repositories/db.repository.js';
import { syncActivePackEntitlementsForClient } from './platform.service.js';

export const COURSE_SCOPE_ADMIN = 'admin';
export const COURSE_SCOPE_SCHOOL_OWNER = 'school_owner';
export const COURSE_SCOPE_TEACHER = 'teacher';
const PLATFORM_OWNER_CLIENT_ID = 17;

const SCHOOL_OWNER_ROLE_SCOPES = ['school_owner', 'admin'];
const TEACHER_ROLE_SCOPES = ['teacher'];

let courseSchoolAssignmentsEnsured = false;
let clientCourseTitleOverridesEnsured = false;
let packItemColumnPromise;

const normalizeNumberArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
};

const buildClientCourseOverrideKey = (clientId, courseId) =>
  `${Number(clientId)}:${Number(courseId)}`;

export const getRequestCourseScope = (req) => {
  const baseUrl = String(req?.baseUrl ?? '').toLowerCase();
  const role = String(req?.user?.role ?? '').toLowerCase();

  if (role === 'teacher') {
    return COURSE_SCOPE_TEACHER;
  }

  if (role === 'school_owner') {
    return COURSE_SCOPE_SCHOOL_OWNER;
  }

  return baseUrl.includes('/school-owner')
    ? COURSE_SCOPE_SCHOOL_OWNER
    : baseUrl.includes('/teacher')
      ? COURSE_SCOPE_TEACHER
    : COURSE_SCOPE_ADMIN;
};

export const ensureCourseSchoolAssignmentsTable = async () => {
  if (courseSchoolAssignmentsEnsured) return;

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS course_school_assignments (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (course_id, school_id)
    )
  `);

  await dbQuery(`
    CREATE INDEX IF NOT EXISTS idx_course_school_assignments_course
    ON course_school_assignments(course_id)
  `);

  await dbQuery(`
    CREATE INDEX IF NOT EXISTS idx_course_school_assignments_school
    ON course_school_assignments(school_id)
  `);

  courseSchoolAssignmentsEnsured = true;
};

export const ensureClientCourseTitleOverridesTable = async () => {
  if (clientCourseTitleOverridesEnsured) return;

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS client_course_title_overrides (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (client_id, course_id)
    )
  `);

  await dbQuery(`
    CREATE INDEX IF NOT EXISTS idx_client_course_title_overrides_client
    ON client_course_title_overrides(client_id)
  `);

  await dbQuery(`
    CREATE INDEX IF NOT EXISTS idx_client_course_title_overrides_course
    ON client_course_title_overrides(course_id)
  `);

  clientCourseTitleOverridesEnsured = true;
};

const listClientCourseTitleOverrides = async ({ clientId, courseIds }) => {
  const normalizedClientId = Number(clientId);
  if (!Number.isInteger(normalizedClientId) || normalizedClientId <= 0 || courseIds.length === 0) {
    return new Map();
  }

  await ensureClientCourseTitleOverridesTable();

  const result = await dbQuery(
    `
      SELECT course_id, title
      FROM client_course_title_overrides
      WHERE client_id = $1
        AND course_id = ANY($2::int[])
    `,
    [normalizedClientId, courseIds]
  );

  return new Map(
    result.rows.map((row) => [
      Number(row.course_id),
      String(row.title ?? '').trim(),
    ]).filter((entry) => entry[1])
  );
};

const listClientCourseTitleOverridesForRows = async (rows) => {
  const clientIds = Array.from(
    new Set(
      rows
        .map((row) => Number(row.client_id))
        .filter((clientId) => Number.isInteger(clientId) && clientId > 0)
    )
  );
  const courseIds = Array.from(
    new Set(
      rows
        .map((row) => Number(row.id))
        .filter((courseId) => Number.isInteger(courseId) && courseId > 0)
    )
  );

  if (clientIds.length === 0 || courseIds.length === 0) {
    return new Map();
  }

  await ensureClientCourseTitleOverridesTable();

  const result = await dbQuery(
    `
      SELECT client_id, course_id, title
      FROM client_course_title_overrides
      WHERE client_id = ANY($1::int[])
        AND course_id = ANY($2::int[])
    `,
    [clientIds, courseIds]
  );

  return new Map(
    result.rows
      .map((row) => [
        buildClientCourseOverrideKey(row.client_id, row.course_id),
        String(row.title ?? '').trim(),
      ])
      .filter((entry) => entry[1])
  );
};

export const saveClientCourseTitleOverride = async ({ clientId, courseId, title, userId, originalTitle }) => {
  const normalizedClientId = Number(clientId);
  const normalizedCourseId = Number(courseId);
  const trimmedTitle = String(title ?? '').trim();
  const normalizedOriginalTitle = String(originalTitle ?? '').trim();

  if (!Number.isInteger(normalizedClientId) || normalizedClientId <= 0) {
    throw new Error('client_id must be a positive integer');
  }

  if (!Number.isInteger(normalizedCourseId) || normalizedCourseId <= 0) {
    throw new Error('course_id must be a positive integer');
  }

  if (!trimmedTitle) {
    throw new Error('title is required');
  }

  await ensureClientCourseTitleOverridesTable();

  if (trimmedTitle.toLowerCase() === normalizedOriginalTitle.toLowerCase()) {
    await dbQuery(
      `
        DELETE FROM client_course_title_overrides
        WHERE client_id = $1
          AND course_id = $2
      `,
      [normalizedClientId, normalizedCourseId]
    );
    return;
  }

  await dbQuery(
    `
      INSERT INTO client_course_title_overrides (client_id, course_id, title, updated_by, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (client_id, course_id)
      DO UPDATE SET
        title = EXCLUDED.title,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
    `,
    [normalizedClientId, normalizedCourseId, trimmedTitle, userId ?? null]
  );
};

export const getManagedSchoolIdsForUser = async (userId) => {
  if (!userId) return [];

  const result = await dbQuery(
    `
      SELECT DISTINCT school_id
      FROM school_memberships
      WHERE user_id = $1
        AND status = 'active'
        AND role_scope = ANY($2::text[])
    `,
    [userId, SCHOOL_OWNER_ROLE_SCOPES]
  );

  return result.rows
    .map((row) => Number(row.school_id))
    .filter((schoolId) => Number.isInteger(schoolId) && schoolId > 0);
};

export const getTeacherSchoolIdsForUser = async (userId) => {
  if (!userId) return [];

  const result = await dbQuery(
    `
      SELECT DISTINCT school_id
      FROM school_memberships
      WHERE user_id = $1
        AND status = 'active'
        AND role_scope = ANY($2::text[])
    `,
    [userId, TEACHER_ROLE_SCOPES]
  );

  return result.rows
    .map((row) => Number(row.school_id))
    .filter((schoolId) => Number.isInteger(schoolId) && schoolId > 0);
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

const shouldIncludeEntitledPlatformCourses = ({ role, scope }) =>
  Boolean(role) && role !== 'super_admin' && role !== 'content_authorizer' && (
    role === 'client_admin'
    || scope === COURSE_SCOPE_SCHOOL_OWNER
    || scope === COURSE_SCOPE_TEACHER
  );

const isPlatformOwnedCourseClientId = (clientId) =>
  clientId == null || Number(clientId) === PLATFORM_OWNER_CLIENT_ID;

const isPlatformTenantClientAdmin = (req) =>
  req.user?.role === 'client_admin'
  && Number(req.user?.client_id) === PLATFORM_OWNER_CLIENT_ID;

export const listEntitledPlatformCourseIds = async (clientId) => {
  const normalizedClientId = Number(clientId);
  if (!Number.isInteger(normalizedClientId) || normalizedClientId <= 0) {
    return [];
  }

  const packItemColumn = await getPackItemColumn();
  const result = await dbQuery(
    `
      SELECT DISTINCT c.id AS course_id
      FROM courses c
      JOIN (
        SELECT ci.course_id
        FROM content_entitlements ce
        JOIN content_items ci ON ci.id = ce.content_id
        WHERE ce.client_id = $1
          AND ce.status = 'active'
          AND NOW() BETWEEN ce.start_at AND ce.end_at

        UNION

        SELECT ci.course_id
        FROM content_entitlements ce
        JOIN content_pack_items cpi ON cpi.pack_id = ce.pack_id
        JOIN content_items ci ON ci.id = cpi.${packItemColumn}
        WHERE ce.client_id = $1
          AND ce.status = 'active'
          AND NOW() BETWEEN ce.start_at AND ce.end_at
      ) entitled_courses ON entitled_courses.course_id = c.id
      WHERE c.client_id IS NULL OR c.client_id = ${PLATFORM_OWNER_CLIENT_ID}
      ORDER BY c.id ASC
    `,
    [normalizedClientId]
  );

  return result.rows
    .map((row) => Number(row.course_id))
    .filter((courseId) => Number.isInteger(courseId) && courseId > 0);
};

export const isEntitledPlatformCourseForClient = async ({ clientId, courseId }) => {
  const normalizedClientId = Number(clientId);
  const normalizedCourseId = Number(courseId);

  if (
    !Number.isInteger(normalizedClientId)
    || normalizedClientId <= 0
    || !Number.isInteger(normalizedCourseId)
    || normalizedCourseId <= 0
  ) {
    return false;
  }

  const entitledCourseIds = await listEntitledPlatformCourseIds(normalizedClientId);
  return entitledCourseIds.includes(normalizedCourseId);
};

const mapCourseRow = ({
  row,
  req,
  scope,
  managedSchoolIds = [],
  isEntitledPlatformCourse = false,
  titleOverride = null,
}) => {
  const assignedSchoolIds = normalizeNumberArray(row.assigned_school_ids);
  const assignedSchoolNames = Array.isArray(row.assigned_school_names)
    ? row.assigned_school_names.filter(Boolean)
    : [];
  const isCreatedByMe = Number(row.created_by) === Number(req.user?.id);
  const isAssignedToMySchool = managedSchoolIds.some((schoolId) => assignedSchoolIds.includes(schoolId));
  const isSchoolOwnerScope = scope === COURSE_SCOPE_SCHOOL_OWNER;
  const isTeacherScope = scope === COURSE_SCOPE_TEACHER;
  const isPackDerivedCourse = String(row.description ?? '').toLowerCase().startsWith('derived from pack:');
  const isPlatformCourse = isPlatformOwnedCourseClientId(row.client_id);
  const isClientPlatformTenantPlatformCourse =
    isPlatformTenantClientAdmin(req) && isPlatformCourse && !isPackDerivedCourse;
  const isReadOnlySharedCourse = isEntitledPlatformCourse && req.user?.role !== 'super_admin';
  const canMutateAsSchoolOwner = isCreatedByMe && !isPlatformCourse;
  const isClientReadOnlySpecialCourse =
    req.user?.role === 'client_admin'
    && (isEntitledPlatformCourse || isPackDerivedCourse || isClientPlatformTenantPlatformCourse);
  const canRenameAssignedCourse = isClientReadOnlySpecialCourse;
  const originalTitle = row.title;
  const courseAccessType = isPackDerivedCourse
    ? 'pack_derived'
    : (isEntitledPlatformCourse || isClientPlatformTenantPlatformCourse)
      ? 'platform_assigned'
      : 'client_owned';
  const effectiveTitle = (() => {
    const normalizedOverride = titleOverride?.trim();

    if (req.user?.role === 'content_authorizer') {
      if (courseAccessType === 'pack_derived') {
        return normalizedOverride || originalTitle;
      }

      if (isPlatformCourse && !isPackDerivedCourse) {
        return originalTitle;
      }
    }

    return normalizedOverride || originalTitle;
  })();

  return {
    id: Number(row.id),
    title: effectiveTitle,
    original_title: originalTitle,
    description: row.description ?? null,
    published: row.published === true,
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
    created_by: row.created_by ?? null,
    client_id: row.client_id ?? null,
    assigned_school_ids: assignedSchoolIds,
    assigned_school_names: assignedSchoolNames,
    assigned_school_count: Number(row.assigned_school_count ?? assignedSchoolIds.length ?? 0),
    is_created_by_me: isCreatedByMe,
    is_assigned_to_my_school: isAssignedToMySchool,
    is_entitled_platform_course: isEntitledPlatformCourse,
    is_pack_derived: isPackDerivedCourse,
    course_access_type: courseAccessType,
    can_rename_assigned_course: canRenameAssignedCourse,
    can_edit_course: isTeacherScope ? false : (isSchoolOwnerScope ? canMutateAsSchoolOwner : (isClientReadOnlySpecialCourse ? false : !isReadOnlySharedCourse)),
    can_publish_course: isTeacherScope ? false : (isSchoolOwnerScope ? canMutateAsSchoolOwner : (isClientReadOnlySpecialCourse ? false : !isReadOnlySharedCourse)),
    can_delete_course: isTeacherScope ? false : (isSchoolOwnerScope ? canMutateAsSchoolOwner : (isClientReadOnlySpecialCourse ? false : !isReadOnlySharedCourse)),
    can_manage_content: isTeacherScope ? false : (isSchoolOwnerScope ? canMutateAsSchoolOwner : (isClientReadOnlySpecialCourse ? false : !isReadOnlySharedCourse)),
    can_enroll: isTeacherScope ? false : (isSchoolOwnerScope ? isAssignedToMySchool : (isClientReadOnlySpecialCourse ? false : true)),
  };
};

const buildCourseSelect = () => `
  SELECT
    c.id,
    c.title,
    c.description,
    c.published,
    c.created_at,
    c.updated_at,
    c.created_by,
    c.client_id,
    COALESCE(
      ARRAY_AGG(DISTINCT csa.school_id) FILTER (WHERE csa.school_id IS NOT NULL),
      '{}'::INTEGER[]
    ) AS assigned_school_ids,
    COALESCE(
      ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL),
      '{}'::TEXT[]
    ) AS assigned_school_names,
    COUNT(DISTINCT csa.school_id) AS assigned_school_count
  FROM courses c
  LEFT JOIN course_school_assignments csa
    ON csa.course_id = c.id
  LEFT JOIN schools s
    ON s.id = csa.school_id
`;

export const listCoursesForRequest = async (req, scope = getRequestCourseScope(req)) => {
  await ensureCourseSchoolAssignmentsTable();

  const role = req.user?.role;
  const clientId = req.user?.client_id;
  if (role === 'client_admin' && clientId) {
    await syncActivePackEntitlementsForClient({
      clientId,
      userId: req.user?.id ?? null,
    });
  }
  const shouldScopeToClient = Boolean(clientId) && role !== 'super_admin';
  const managedSchoolIds = scope === COURSE_SCOPE_SCHOOL_OWNER
    ? await getManagedSchoolIdsForUser(req.user?.id)
    : scope === COURSE_SCOPE_TEACHER
      ? await getTeacherSchoolIdsForUser(req.user?.id)
      : [];
  const entitledPlatformCourseIds = shouldIncludeEntitledPlatformCourses({ role, scope })
    ? await listEntitledPlatformCourseIds(clientId)
    : [];

  const conditions = [];
  const params = [];

  if (shouldScopeToClient) {
    params.push(clientId);
    if (entitledPlatformCourseIds.length > 0) {
      params.push(entitledPlatformCourseIds);
      conditions.push(`(c.client_id = $1 OR c.id = ANY($2::int[]))`);
    } else {
      conditions.push(`c.client_id = $1`);
    }
  }

  if (scope === COURSE_SCOPE_SCHOOL_OWNER || scope === COURSE_SCOPE_TEACHER) {
    if (managedSchoolIds.length === 0) {
      return [];
    }

    conditions.push(`
      EXISTS (
        SELECT 1
        FROM course_school_assignments scoped_csa
        WHERE scoped_csa.course_id = c.id
          AND scoped_csa.school_id = ANY($${params.length + 1}::int[])
      )
    `);
    params.push(managedSchoolIds);
  } else if (role === 'student') {
    conditions.push('c.published = true');
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `
    ${buildCourseSelect()}
    ${whereClause}
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `;

  const result = await dbQuery(query, params);
  const entitledPlatformCourseSet = new Set(entitledPlatformCourseIds);
  const titleOverrides = role === 'content_authorizer'
    ? await listClientCourseTitleOverridesForRows(result.rows)
    : shouldScopeToClient
      ? await listClientCourseTitleOverrides({
          clientId,
          courseIds: result.rows.map((row) => Number(row.id)),
        })
      : new Map();
  return result.rows.map((row) => mapCourseRow({
    row,
    req,
    scope,
    managedSchoolIds,
    isEntitledPlatformCourse: entitledPlatformCourseSet.has(Number(row.id)),
    titleOverride: role === 'content_authorizer'
      ? titleOverrides.get(buildClientCourseOverrideKey(row.client_id, row.id)) ?? null
      : titleOverrides.get(Number(row.id)) ?? null,
  }));
};

const getCourseRowById = async (courseId) => {
  await ensureCourseSchoolAssignmentsTable();

  const result = await dbQuery(
    `
      ${buildCourseSelect()}
      WHERE c.id = $1
      GROUP BY c.id
    `,
    [courseId]
  );

  return result.rows[0] ?? null;
};

export const getCourseAccessContext = async ({ courseId, req, scope = getRequestCourseScope(req) }) => {
  const numericCourseId = Number(courseId);
  if (!Number.isInteger(numericCourseId) || numericCourseId <= 0) {
    return { ok: false, status: 400, error: 'Invalid course ID' };
  }

  const courseRow = await getCourseRowById(numericCourseId);
  if (!courseRow) {
    return { ok: false, status: 404, error: 'Course not found' };
  }

  const role = req.user?.role;
  const userClientId = req.user?.client_id ?? null;
  const isEntitledPlatformCourse =
    role !== 'super_admin'
    && userClientId
    && isPlatformOwnedCourseClientId(courseRow.client_id)
    && shouldIncludeEntitledPlatformCourses({ role, scope })
      ? await isEntitledPlatformCourseForClient({ clientId: userClientId, courseId: numericCourseId })
      : false;
  const managedSchoolIds = scope === COURSE_SCOPE_SCHOOL_OWNER
    ? await getManagedSchoolIdsForUser(req.user?.id)
    : scope === COURSE_SCOPE_TEACHER
      ? await getTeacherSchoolIdsForUser(req.user?.id)
      : [];

  if (
    role !== 'super_admin'
    && userClientId
    && Number(courseRow.client_id) !== Number(userClientId)
    && !isEntitledPlatformCourse
  ) {
    return { ok: false, status: 403, error: 'Access denied' };
  }

  const course = mapCourseRow({
    row: courseRow,
    req,
    scope,
    managedSchoolIds,
    isEntitledPlatformCourse,
    titleOverride: role === 'content_authorizer'
      ? (await listClientCourseTitleOverridesForRows([courseRow])).get(buildClientCourseOverrideKey(courseRow.client_id, numericCourseId)) ?? null
      : userClientId
        ? (await listClientCourseTitleOverrides({ clientId: userClientId, courseIds: [numericCourseId] })).get(numericCourseId) ?? null
        : null,
  });

  if ((scope === COURSE_SCOPE_SCHOOL_OWNER || scope === COURSE_SCOPE_TEACHER) && !course.is_assigned_to_my_school) {
    return { ok: false, status: 403, error: 'Access denied' };
  }

  return {
    ok: true,
    scope,
    managedSchoolIds,
    course,
  };
};

export const ensureCourseActionAccess = async ({
  courseId,
  req,
  action,
  scope = getRequestCourseScope(req),
}) => {
  const context = await getCourseAccessContext({ courseId, req, scope });
  if (!context.ok) return context;

  if (scope === COURSE_SCOPE_TEACHER) {
    const allowedActions = new Set(['read']);
    if (!allowedActions.has(action)) {
      return { ok: false, status: 403, error: 'Access denied' };
    }
    return context;
  }

  if (
    req.user?.role === 'client_admin'
    && (context.course.can_rename_assigned_course || context.course.course_access_type === 'platform_assigned')
    && req.user?.role !== 'super_admin'
    && new Set(['update', 'delete', 'publish', 'manage_content']).has(action)
  ) {
    if (action !== 'update') {
      return {
        ok: false,
        status: 403,
        error: context.course.is_pack_derived
          ? 'Assigned courses are read-only.'
          : 'Platform-assigned courses are read-only.',
      };
    }
  }

  if (scope !== COURSE_SCOPE_SCHOOL_OWNER) {
    return context;
  }

  const mutateActions = new Set(['update', 'delete', 'publish', 'manage_content']);
  const assignedActions = new Set(['read', 'enroll']);

  if (mutateActions.has(action) && !context.course.is_created_by_me) {
    return { ok: false, status: 403, error: 'Assigned courses are read-only for school owners.' };
  }

  if (assignedActions.has(action) && !context.course.is_assigned_to_my_school) {
    return { ok: false, status: 403, error: 'Access denied' };
  }

  return context;
};

export const createCourseForRequest = async ({ req, title, description, published = false }) => {
  await ensureCourseSchoolAssignmentsTable();

  const createdBy = req.user?.id ?? null;
  const role = req.user?.role;
  const clientId = req.user?.client_id;
  const scope = getRequestCourseScope(req);
  const courseClientId = role === 'super_admin' ? null : (clientId ?? null);

  const result = await dbQuery(
    `
      INSERT INTO courses (title, description, published, created_by, client_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
    [title.trim(), description?.trim() || null, published, createdBy, courseClientId]
  );

  const courseId = Number(result.rows[0]?.id);

  if (scope === COURSE_SCOPE_SCHOOL_OWNER) {
    const managedSchoolIds = await getManagedSchoolIdsForUser(createdBy);
    if (managedSchoolIds.length === 0) {
      await dbQuery(`DELETE FROM courses WHERE id = $1`, [courseId]);
      return { ok: false, status: 403, error: 'School owner must belong to at least one active school.' };
    }

    await dbQuery(
      `
        INSERT INTO course_school_assignments (course_id, school_id, assigned_by)
        SELECT $1, school_id, $2
        FROM unnest($3::int[]) AS school_id
        ON CONFLICT (course_id, school_id)
        DO UPDATE SET assigned_by = EXCLUDED.assigned_by, assigned_at = NOW()
      `,
      [courseId, createdBy, managedSchoolIds]
    );
  }

  const context = await getCourseAccessContext({ courseId, req, scope });
  if (!context.ok) {
    return context;
  }

  return {
    ok: true,
    status: 201,
    course: context.course,
  };
};

