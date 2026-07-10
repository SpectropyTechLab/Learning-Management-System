// backend/services/curriculum.service.js
import { AppError } from '../utils/errors.js';
import {
  parseNullableInt,
  parseRequiredInt,
  parseBoolean,
  requireString,
} from '../schemas/curriculum.schema.js';
import * as curriculumRepo from '../repositories/curriculum.repository.js';
import { getEnabledProgramIdsIfFeatureEnabled } from './moduleEntitlements.service.js';
import { query as dbQuery } from '../repositories/db.repository.js';

const PLATFORM_PROGRAM_OWNER_CLIENT_ID = 17;

const isSuperAdmin = (role) => role === 'super_admin';
const isContentAuthorizer = (role) => role === 'content_authorizer';
const isPlatformTenantClientAdmin = (user) =>
  user?.role === 'client_admin' && Number(user?.client_id) === PLATFORM_PROGRAM_OWNER_CLIENT_ID;
const isPlatformCurriculumAdmin = (user) =>
  isSuperAdmin(user?.role) || isContentAuthorizer(user?.role) || isPlatformTenantClientAdmin(user);
const isSchoolUser = (user) => user?.role === 'school_owner' || user?.role === 'teacher';
const SCHOOL_OWNER_ROLE_SCOPES = ['school_owner', 'admin'];
const TEACHER_ROLE_SCOPES = ['teacher'];

const resolveClientId = (user, sourceClientId) => {
  if (isSuperAdmin(user?.role)) {
    return parseNullableInt(sourceClientId, 'client_id') ?? PLATFORM_PROGRAM_OWNER_CLIENT_ID;
  }
  if (isContentAuthorizer(user?.role) || isPlatformTenantClientAdmin(user)) {
    return PLATFORM_PROGRAM_OWNER_CLIENT_ID;
  }
  const clientId = user?.client_id ?? null;
  if (!clientId) {
    throw new AppError('client_id is required', 400);
  }
  return clientId;
};

const resolveScopedClientId = (user) => {
  if (isSuperAdmin(user?.role)) return null;
  if (isContentAuthorizer(user?.role) || isPlatformTenantClientAdmin(user)) return PLATFORM_PROGRAM_OWNER_CLIENT_ID;
  const clientId = user?.client_id ?? null;
  if (!clientId) {
    throw new AppError('client_id is required', 400);
  }
  return clientId;
};

const fetchUserSchoolIds = async (userId) => {
  const result = await dbQuery(
    `SELECT school_id FROM school_memberships WHERE user_id = $1 AND status = 'active'`,
    [userId]
  );
  return result.rows.map((row) => Number(row.school_id)).filter(Number.isInteger);
};

const fetchUserSchoolIdsByRoleScope = async (user) => {
  if (!isSchoolUser(user)) return [];
  const roleScopes = user?.role === 'teacher' ? TEACHER_ROLE_SCOPES : SCHOOL_OWNER_ROLE_SCOPES;
  const result = await dbQuery(
    `
    SELECT DISTINCT school_id
    FROM school_memberships
    WHERE user_id = $1
      AND status = 'active'
      AND role_scope = ANY($2::text[])
    `,
    [user.id, roleScopes]
  );
  return result.rows.map((row) => Number(row.school_id)).filter(Number.isInteger);
};

const resolveOwnedSchoolId = async (user, requestedSchoolId = null) => {
  if (!isSchoolUser(user)) return parseNullableInt(requestedSchoolId, 'school_id');
  const schoolIds = await fetchUserSchoolIdsByRoleScope(user);
  if (schoolIds.length === 0) {
    throw new AppError('No active school membership found for this user', 403);
  }
  const parsedRequestedSchoolId = parseNullableInt(requestedSchoolId, 'school_id');
  if (parsedRequestedSchoolId) {
    if (!schoolIds.includes(parsedRequestedSchoolId)) {
      throw new AppError('Access denied for this school', 403);
    }
    return parsedRequestedSchoolId;
  }
  return schoolIds[0];
};

const isPlatformOwned = (record) =>
  Number(record?.client_id) === PLATFORM_PROGRAM_OWNER_CLIENT_ID && !record?.school_id;
const isClientOwnedByUser = (record, user) =>
  user?.role === 'client_admin' &&
  Number(user?.client_id) !== PLATFORM_PROGRAM_OWNER_CLIENT_ID &&
  Number(record?.client_id) === Number(user.client_id) &&
  !record?.school_id;
const isSchoolOwnedByUser = async (record, user) => {
  if (!isSchoolUser(user) || !record?.school_id) return false;
  const schoolIds = await fetchUserSchoolIdsByRoleScope(user);
  return schoolIds.includes(Number(record.school_id));
};

const canManageCurriculumContext = async (user, context) => {
  if (isPlatformCurriculumAdmin(user)) {
    return isPlatformOwned(context);
  }
  if (isClientOwnedByUser(context, user)) return true;
  return isSchoolOwnedByUser(context, user);
};

const decorateCurriculumItem = async (item, user) => {
  const canManage = await canManageCurriculumContext(user, item);
  return {
    ...item,
    ownership_scope: item?.school_id
      ? 'school'
      : Number(item?.client_id) === PLATFORM_PROGRAM_OWNER_CLIENT_ID
        ? 'platform'
        : 'client',
    canEdit: canManage,
    canDelete: canManage,
  };
};

const decorateCurriculumItems = async (items, user) =>
  Promise.all((items ?? []).map((item) => decorateCurriculumItem(item, user)));

const ensureClientAccess = (ownerClientId, requester) => {
  if (isSuperAdmin(requester?.role)) return;
  if (isContentAuthorizer(requester?.role) || isPlatformTenantClientAdmin(requester)) {
    if (Number(ownerClientId) === PLATFORM_PROGRAM_OWNER_CLIENT_ID) return;
    throw new AppError('Access denied', 403);
  }
  if (!requester?.client_id || Number(requester.client_id) !== Number(ownerClientId)) {
    throw new AppError('Access denied', 403);
  }
};

const getReadableSharedProgramIds = async (clientId) => {
  if (!clientId) return [];
  const [questionBankProgramIds, examProgramIds] = await Promise.all([
    getEnabledProgramIdsIfFeatureEnabled('question_bank', clientId),
    getEnabledProgramIdsIfFeatureEnabled('exams', clientId),
  ]);
  return Array.from(new Set([...questionBankProgramIds, ...examProgramIds])).filter((value) => Number.isInteger(value));
};

let questionBankSchoolAssignmentsTableEnsured = false;

const ensureQuestionBankSchoolAssignmentsTable = async () => {
  if (questionBankSchoolAssignmentsTableEnsured) return;

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS question_bank_school_assignments (
      id SERIAL PRIMARY KEY,
      program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(program_id, school_id)
    )
  `);
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_question_bank_school_assignments_program ON question_bank_school_assignments(program_id)`);
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_question_bank_school_assignments_school ON question_bank_school_assignments(school_id)`);

  questionBankSchoolAssignmentsTableEnsured = true;
};

const getAssignedQuestionBankProgramIds = async (schoolIds) => {
  const ids = (schoolIds ?? []).map(Number).filter(Number.isInteger);
  if (ids.length === 0) return [];
  await ensureQuestionBankSchoolAssignmentsTable();
  const result = await dbQuery(
    `
    SELECT DISTINCT program_id
    FROM question_bank_school_assignments
    WHERE school_id = ANY($1::int[])
    `,
    [ids]
  );
  return result.rows.map((row) => Number(row.program_id)).filter(Number.isInteger);
};

const generateProgramCode = (name) =>
  String(name || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);

export const listPrograms = async ({ user, query }) => {
  const clientId = resolveClientId(user, query?.client_id);
  const writableOnly = query?.writable === '1' || query?.writable === 'true';
  const assignedOnly = query?.assigned_only === '1' || query?.assigned_only === 'true';
  const schoolIds = isSchoolUser(user) ? await fetchUserSchoolIdsByRoleScope(user) : [];
  const schoolAssignedOnly = isSchoolUser(user) && !writableOnly;
  const sharedProgramIds = isPlatformCurriculumAdmin(user) || writableOnly ? [] : await getReadableSharedProgramIds(clientId);
  const assignedProgramIds = isSchoolUser(user) && !writableOnly ? await getAssignedQuestionBankProgramIds(schoolIds) : [];
  const result = await curriculumRepo.fetchPrograms({
    clientId: isPlatformCurriculumAdmin(user) && !writableOnly ? null : clientId,
    sharedProgramIds,
    assignedProgramIds,
    schoolIds,
    writableOnly,
    assignedOnly: (assignedOnly && isSchoolUser(user)) || schoolAssignedOnly,
  });
  return decorateCurriculumItems(result.rows, user);
};

export const getProgram = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const clientId = resolveScopedClientId(user);
  const sharedProgramIds = isPlatformCurriculumAdmin(user) ? [] : await getReadableSharedProgramIds(clientId);
  const schoolIds = isSchoolUser(user) ? await fetchUserSchoolIdsByRoleScope(user) : [];
  const assignedProgramIds = isSchoolUser(user) ? await getAssignedQuestionBankProgramIds(schoolIds) : [];
  if (isSchoolUser(user) && !assignedProgramIds.includes(id)) {
    const schoolOwnedResult = await dbQuery(
      `SELECT school_id FROM programs WHERE id = $1 LIMIT 1`,
      [id]
    );
    const programSchoolId = Number(schoolOwnedResult.rows[0]?.school_id);
    if (!schoolIds.includes(programSchoolId)) {
      throw new AppError('Program not found', 404);
    }
  }
  const result = await curriculumRepo.fetchProgramById({
    id,
    clientId: isPlatformCurriculumAdmin(user) ? null : clientId,
    sharedProgramIds,
    assignedProgramIds,
    schoolIds,
  });
  if (result.rows.length === 0) {
    throw new AppError('Program not found', 404);
  }
  return decorateCurriculumItem(result.rows[0], user);
};

export const createProgram = async ({ user, body }) => {
  const name = requireString(body?.name, 'name');
  const codeInput = body?.code ? requireString(body?.code, 'code') : null;
  const code = codeInput || generateProgramCode(name);
  const clientId = resolveClientId(user, body?.client_id);
  const schoolId = await resolveOwnedSchoolId(user, body?.school_id);
  const isActive = parseBoolean(body?.is_active, 'is_active');

  const result = await curriculumRepo.insertProgram({
    clientId,
    schoolId,
    name,
    code,
    is_active: isActive ?? true,
  });

  return decorateCurriculumItem(result.rows[0], user);
};

export const updateProgram = async ({ user, params, body }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const updates = {};

  if (body?.name !== undefined) updates.name = requireString(body?.name, 'name');
  if (body?.code !== undefined) {
    const nextCode = String(body.code ?? '').trim();
    if (nextCode) updates.code = nextCode;
  }
  if (body?.is_active !== undefined) {
    updates.is_active = parseBoolean(body?.is_active, 'is_active');
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError('No updates provided', 400);
  }

  const clientId = resolveScopedClientId(user);
  const context = await curriculumRepo.fetchProgramContext(id);
  if (context.rows.length === 0) {
    throw new AppError('Program not found', 404);
  }
  if (!(await canManageCurriculumContext(user, context.rows[0]))) {
    throw new AppError('Access denied', 403);
  }

  const result = await curriculumRepo.updateProgram({ id, clientId, updates });
  if (result.rows.length === 0) {
    throw new AppError('Program not found', 404);
  }
  return decorateCurriculumItem(result.rows[0], user);
};

export const deleteProgram = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const clientId = resolveScopedClientId(user);
  const context = await curriculumRepo.fetchProgramContext(id);
  if (context.rows.length === 0) {
    throw new AppError('Program not found', 404);
  }
  if (!(await canManageCurriculumContext(user, context.rows[0]))) {
    throw new AppError('Access denied', 403);
  }
  const questionCount = await curriculumRepo.countQuestionsByProgram(id);
  if (Number(questionCount.rows[0]?.total || 0) > 0) {
    throw new AppError('Questions exist for this program. Delete or move those questions before deleting the program.', 400);
  }
  const result = await curriculumRepo.deleteProgram({ id, clientId });
  if (result.rows.length === 0) {
    throw new AppError('Program not found', 404);
  }
  return { success: true, id: result.rows[0].id };
};

export const listGrades = async ({ user, params }) => {
  const programId = parseRequiredInt(params?.programId, 'programId');
  const clientId = resolveScopedClientId(user);
  const sharedProgramIds = isPlatformCurriculumAdmin(user) ? [] : await getReadableSharedProgramIds(clientId);
  const result = await curriculumRepo.fetchGradesByProgram({
    programId,
    clientId: isPlatformCurriculumAdmin(user) ? null : clientId,
    sharedProgramIds,
  });
  return decorateCurriculumItems(result.rows, user);
};

export const getGrade = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const clientId = resolveScopedClientId(user);
  const sharedProgramIds = isPlatformCurriculumAdmin(user) ? [] : await getReadableSharedProgramIds(clientId);
  const result = await curriculumRepo.fetchGradeById({
    id,
    clientId: isPlatformCurriculumAdmin(user) ? null : clientId,
    sharedProgramIds,
  });
  if (result.rows.length === 0) {
    throw new AppError('Grade not found', 404);
  }
  return decorateCurriculumItem(result.rows[0], user);
};

export const createGrade = async ({ user, params, body }) => {
  const programId = parseRequiredInt(params?.programId, 'programId');
  const gradeNumber = parseRequiredInt(body?.grade_number, 'grade_number');
  const active = parseBoolean(body?.is_active, 'is_active');

  const programContext = await curriculumRepo.fetchProgramContext(programId);
  if (programContext.rows.length === 0) {
    throw new AppError('Program not found', 404);
  }
  if (!(await canManageCurriculumContext(user, programContext.rows[0]))) {
    throw new AppError('Access denied', 403);
  }

  const result = await curriculumRepo.insertGrade({
    programId,
    grade_number: gradeNumber,
    is_active: active ?? true,
  });
  return decorateCurriculumItem(result.rows[0], user);
};

export const updateGrade = async ({ user, params, body }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const updates = {};

  if (body?.grade_number !== undefined) {
    updates.grade_number = parseRequiredInt(body?.grade_number, 'grade_number');
  }
  if (body?.is_active !== undefined) {
    updates.is_active = parseBoolean(body?.is_active, 'is_active');
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError('No updates provided', 400);
  }

  const gradeContext = await curriculumRepo.fetchGradeContext(id);
  if (gradeContext.rows.length === 0) {
    throw new AppError('Grade not found', 404);
  }
  if (!(await canManageCurriculumContext(user, gradeContext.rows[0]))) {
    throw new AppError('Access denied', 403);
  }

  const result = await curriculumRepo.updateGrade({ id, updates });
  return result.rows[0];
};

export const deleteGrade = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const gradeContext = await curriculumRepo.fetchGradeContext(id);
  if (gradeContext.rows.length === 0) {
    throw new AppError('Grade not found', 404);
  }
  if (!(await canManageCurriculumContext(user, gradeContext.rows[0]))) {
    throw new AppError('Access denied', 403);
  }

  const result = await curriculumRepo.deleteGrade(id);
  if (result.rows.length === 0) {
    throw new AppError('Grade not found', 404);
  }
  return { success: true, id: result.rows[0].id };
};

export const listSubjects = async ({ user, query }) => {
  const clientId = resolveClientId(user, query?.client_id);
  const gradeId = parseNullableInt(query?.grade_id, 'grade_id');
  const sharedProgramIds = isPlatformCurriculumAdmin(user) ? [] : await getReadableSharedProgramIds(clientId);
  const result = await curriculumRepo.fetchSubjects(
    isPlatformCurriculumAdmin(user) ? null : clientId || null,
    gradeId,
    sharedProgramIds
  );
  return decorateCurriculumItems(result.rows, user);
};

export const listSubjectsByGrade = async ({ user, params }) => {
  const gradeId = parseRequiredInt(params?.gradeId, 'gradeId');
  const clientId = resolveScopedClientId(user);
  const sharedProgramIds = isPlatformCurriculumAdmin(user) ? [] : await getReadableSharedProgramIds(clientId);
  const result = await curriculumRepo.fetchSubjectsByGrade({
    gradeId,
    clientId: isPlatformCurriculumAdmin(user) ? null : clientId,
    sharedProgramIds,
  });
  return decorateCurriculumItems(result.rows, user);
};

export const getSubject = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const clientId = resolveScopedClientId(user);
  const sharedProgramIds = isPlatformCurriculumAdmin(user) ? [] : await getReadableSharedProgramIds(clientId);
  const result = await curriculumRepo.fetchSubjectById(
    id,
    isPlatformCurriculumAdmin(user) ? null : clientId || null,
    sharedProgramIds
  );
  if (result.rows.length === 0) {
    throw new AppError('Subject not found', 404);
  }
  return decorateCurriculumItem(result.rows[0], user);
};

export const createSubject = async ({ user, body }) => {
  const name = requireString(body?.name, 'name');
  const code = requireString(body?.code, 'code');
  const clientId = resolveClientId(user, body?.client_id);
  const gradeId = parseNullableInt(body?.grade_id, 'grade_id');
  const displayOrder = body?.display_order ?? 0;
  const isActive = parseBoolean(body?.is_active, 'is_active');

  if (gradeId) {
    const gradeContext = await curriculumRepo.fetchGradeContext(gradeId);
    if (gradeContext.rows.length === 0) {
      throw new AppError('Grade not found', 404);
    }
    if (clientId && Number(gradeContext.rows[0].client_id) !== Number(clientId)) {
      throw new AppError('Grade does not belong to this client', 403);
    }
  }

  const result = await curriculumRepo.insertSubject({
    clientId,
    grade_id: gradeId,
    name,
    code,
    description: body?.description ?? null,
    display_order: displayOrder,
    is_active: isActive ?? true,
  });

  return decorateCurriculumItem((await curriculumRepo.fetchSubjectById(result.rows[0].id, clientId || null)).rows[0], user);
};

export const updateSubject = async ({ user, params, body }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const updates = {};

  if (body?.name !== undefined) updates.name = requireString(body?.name, 'name');
  if (body?.code !== undefined) updates.code = requireString(body?.code, 'code');
  if (body?.description !== undefined) updates.description = body?.description ?? null;
  if (body?.display_order !== undefined) {
    updates.display_order = parseRequiredInt(body?.display_order, 'display_order');
  }
  if (body?.grade_id !== undefined) {
    updates.grade_id = parseNullableInt(body?.grade_id, 'grade_id');
  }
  if (body?.is_active !== undefined) {
    updates.is_active = parseBoolean(body?.is_active, 'is_active');
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError('No updates provided', 400);
  }

  const clientId = resolveScopedClientId(user);

  if (updates.grade_id !== undefined && updates.grade_id !== null) {
    const gradeContext = await curriculumRepo.fetchGradeContext(updates.grade_id);
    if (gradeContext.rows.length === 0) {
      throw new AppError('Grade not found', 404);
    }
    if (clientId && Number(gradeContext.rows[0].client_id) !== Number(clientId)) {
      throw new AppError('Grade does not belong to this client', 403);
    }
  }

  const result = await curriculumRepo.updateSubject({ id, clientId, updates });
  if (result.rows.length === 0) {
    throw new AppError('Subject not found', 404);
  }
  return decorateCurriculumItem((await curriculumRepo.fetchSubjectById(id, clientId || null)).rows[0], user);
};

export const deleteSubject = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const clientId = resolveScopedClientId(user);
  const result = await curriculumRepo.deleteSubject({ id, clientId });
  if (result.rows.length === 0) {
    throw new AppError('Subject not found', 404);
  }
  return { success: true, id: result.rows[0].id };
};

export const listChapters = async ({ user, params }) => {
  const subjectId = parseRequiredInt(params?.subjectId, 'subjectId');
  const clientId = resolveScopedClientId(user);
  const sharedProgramIds = isPlatformCurriculumAdmin(user) ? [] : await getReadableSharedProgramIds(clientId);
  const result = await curriculumRepo.fetchChaptersBySubject({
    subjectId,
    clientId: isPlatformCurriculumAdmin(user) ? null : clientId,
    sharedProgramIds,
  });
  return decorateCurriculumItems(result.rows, user);
};

export const getChapter = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const clientId = resolveScopedClientId(user);
  const sharedProgramIds = isPlatformCurriculumAdmin(user) ? [] : await getReadableSharedProgramIds(clientId);
  const result = await curriculumRepo.fetchChapterById({
    id,
    clientId: isPlatformCurriculumAdmin(user) ? null : clientId,
    sharedProgramIds,
  });
  if (result.rows.length === 0) {
    throw new AppError('Chapter not found', 404);
  }
  return decorateCurriculumItem(result.rows[0], user);
};

export const createChapter = async ({ user, params, body }) => {
  const subjectId = parseRequiredInt(params?.subjectId, 'subjectId');
  const name = requireString(body?.name, 'name');
  const chapterNumber = parseRequiredInt(body?.chapter_number, 'chapter_number');
  const active = parseBoolean(body?.is_active, 'is_active');

  const subjectContext = await curriculumRepo.fetchSubjectContext(subjectId);
  if (subjectContext.rows.length === 0) {
    throw new AppError('Subject not found', 404);
  }
  if (!(await canManageCurriculumContext(user, subjectContext.rows[0]))) {
    throw new AppError('Access denied', 403);
  }

  const result = await curriculumRepo.insertChapter({
    subjectId,
    name,
    chapter_number: chapterNumber,
    description: body?.description ?? null,
    is_active: active ?? true,
  });
  return decorateCurriculumItem(result.rows[0], user);
};

export const updateChapter = async ({ user, params, body }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const updates = {};

  if (body?.name !== undefined) updates.name = requireString(body?.name, 'name');
  if (body?.chapter_number !== undefined) {
    updates.chapter_number = parseRequiredInt(body?.chapter_number, 'chapter_number');
  }
  if (body?.description !== undefined) updates.description = body?.description ?? null;
  if (body?.is_active !== undefined) {
    updates.is_active = parseBoolean(body?.is_active, 'is_active');
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError('No updates provided', 400);
  }

  const chapterContext = await curriculumRepo.fetchChapterContext(id);
  if (chapterContext.rows.length === 0) {
    throw new AppError('Chapter not found', 404);
  }
  if (!(await canManageCurriculumContext(user, chapterContext.rows[0]))) {
    throw new AppError('Access denied', 403);
  }

  const result = await curriculumRepo.updateChapter({ id, updates });
  return decorateCurriculumItem(result.rows[0], user);
};

export const deleteChapter = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const chapterContext = await curriculumRepo.fetchChapterContext(id);
  if (chapterContext.rows.length === 0) {
    throw new AppError('Chapter not found', 404);
  }
  if (!(await canManageCurriculumContext(user, chapterContext.rows[0]))) {
    throw new AppError('Access denied', 403);
  }

  const result = await curriculumRepo.deleteChapter(id);
  if (result.rows.length === 0) {
    throw new AppError('Chapter not found', 404);
  }
  return { success: true, id: result.rows[0].id };
};

export const listTopics = async ({ user, params }) => {
  const chapterId = parseRequiredInt(params?.chapterId, 'chapterId');
  const clientId = resolveScopedClientId(user);
  const sharedProgramIds = isPlatformCurriculumAdmin(user) ? [] : await getReadableSharedProgramIds(clientId);
  const result = await curriculumRepo.fetchTopicsByChapter({
    chapterId,
    clientId: isPlatformCurriculumAdmin(user) ? null : clientId,
    sharedProgramIds,
  });
  return decorateCurriculumItems(result.rows, user);
};

export const getTopic = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const clientId = resolveScopedClientId(user);
  const sharedProgramIds = isPlatformCurriculumAdmin(user) ? [] : await getReadableSharedProgramIds(clientId);
  const result = await curriculumRepo.fetchTopicById({
    id,
    clientId: isPlatformCurriculumAdmin(user) ? null : clientId,
    sharedProgramIds,
  });
  if (result.rows.length === 0) {
    throw new AppError('Topic not found', 404);
  }
  return decorateCurriculumItem(result.rows[0], user);
};

export const createTopic = async ({ user, params, body }) => {
  const chapterId = parseRequiredInt(params?.chapterId, 'chapterId');
  const name = requireString(body?.name, 'name');
  const topicNumber = parseRequiredInt(body?.topic_number, 'topic_number');
  const active = parseBoolean(body?.is_active, 'is_active');

  const chapterContext = await curriculumRepo.fetchChapterContext(chapterId);
  if (chapterContext.rows.length === 0) {
    throw new AppError('Chapter not found', 404);
  }
  if (!(await canManageCurriculumContext(user, chapterContext.rows[0]))) {
    throw new AppError('Access denied', 403);
  }

  const result = await curriculumRepo.insertTopic({
    chapterId,
    name,
    topic_number: topicNumber,
    is_active: active ?? true,
  });
  return decorateCurriculumItem(result.rows[0], user);
};

export const updateTopic = async ({ user, params, body }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const updates = {};

  if (body?.name !== undefined) updates.name = requireString(body?.name, 'name');
  if (body?.topic_number !== undefined) {
    updates.topic_number = parseRequiredInt(body?.topic_number, 'topic_number');
  }
  if (body?.is_active !== undefined) {
    updates.is_active = parseBoolean(body?.is_active, 'is_active');
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError('No updates provided', 400);
  }

  const topicContext = await curriculumRepo.fetchTopicContext(id);
  if (topicContext.rows.length === 0) {
    throw new AppError('Topic not found', 404);
  }
  if (!(await canManageCurriculumContext(user, topicContext.rows[0]))) {
    throw new AppError('Access denied', 403);
  }

  const result = await curriculumRepo.updateTopic({ id, updates });
  return decorateCurriculumItem(result.rows[0], user);
};

export const deleteTopic = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const topicContext = await curriculumRepo.fetchTopicContext(id);
  if (topicContext.rows.length === 0) {
    throw new AppError('Topic not found', 404);
  }
  if (!(await canManageCurriculumContext(user, topicContext.rows[0]))) {
    throw new AppError('Access denied', 403);
  }

  const result = await curriculumRepo.deleteTopic(id);
  if (result.rows.length === 0) {
    throw new AppError('Topic not found', 404);
  }
  return { success: true, id: result.rows[0].id };
};


