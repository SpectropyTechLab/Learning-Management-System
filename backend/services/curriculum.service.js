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
import { getClient, query as dbQuery } from '../repositories/db.repository.js';
import { removeStoredSessionDocuments } from './studioDocuments.service.js';

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
  if (isSuperAdmin(user?.role)) return true;
  if (isContentAuthorizer(user?.role) || isPlatformTenantClientAdmin(user)) {
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

const getBoardReadScope = async (user) => {
  const clientId = resolveScopedClientId(user);
  const sharedProgramIds = isPlatformCurriculumAdmin(user)
    ? []
    : await getReadableSharedProgramIds(clientId);
  const schoolIds = isSchoolUser(user) ? await fetchUserSchoolIdsByRoleScope(user) : [];
  const assignedProgramIds = isSchoolUser(user)
    ? await getAssignedQuestionBankProgramIds(schoolIds)
    : [];

  return {
    clientId: isPlatformCurriculumAdmin(user) ? null : clientId,
    sharedProgramIds,
    assignedProgramIds,
    schoolIds,
  };
};

const ensureBoardMatchesClient = (board, clientId) => {
  if (board?.client_id !== null && Number(board?.client_id) !== Number(clientId)) {
    throw new AppError('Board does not belong to this client', 403);
  }
};

export const listBoards = async ({ user }) => {
  const scope = await getBoardReadScope(user);
  const result = await curriculumRepo.fetchBoards(scope);
  return decorateCurriculumItems(result.rows, user);
};

export const getBoard = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const scope = await getBoardReadScope(user);
  const result = await curriculumRepo.fetchBoardById({ id, ...scope });
  if (result.rows.length === 0) {
    throw new AppError('Board not found', 404);
  }
  return decorateCurriculumItem(result.rows[0], user);
};

export const createBoard = async ({ user, body }) => {
  if (isSchoolUser(user) || user?.role === 'student') {
    throw new AppError('Access denied', 403);
  }

  const name = requireString(body?.name, 'name');
  const codeInput = body?.code ? requireString(body?.code, 'code') : null;
  const code = codeInput || generateProgramCode(name);
  const clientId = resolveClientId(user, body?.client_id);
  const isActive = parseBoolean(body?.is_active, 'is_active');

  const result = await curriculumRepo.insertBoard({
    clientId,
    name,
    code,
    description: body?.description ?? null,
    is_active: isActive ?? true,
  });
  return decorateCurriculumItem(result.rows[0], user);
};

export const updateBoard = async ({ user, params, body }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const updates = {};

  if (body?.name !== undefined) updates.name = requireString(body?.name, 'name');
  if (body?.code !== undefined) updates.code = requireString(body?.code, 'code');
  if (body?.description !== undefined) updates.description = body.description ?? null;
  if (body?.is_active !== undefined) {
    updates.is_active = parseBoolean(body.is_active, 'is_active');
  }
  if (Object.keys(updates).length === 0) {
    throw new AppError('No updates provided', 400);
  }

  const context = await curriculumRepo.fetchBoardContext(id);
  if (context.rows.length === 0) {
    throw new AppError('Board not found', 404);
  }
  if (!(await canManageCurriculumContext(user, context.rows[0]))) {
    throw new AppError('Access denied', 403);
  }

  const clientId = isSuperAdmin(user?.role) ? null : context.rows[0].client_id;
  const result = await curriculumRepo.updateBoard({ id, clientId, updates });
  if (result.rows.length === 0) {
    throw new AppError('Board not found', 404);
  }
  return decorateCurriculumItem(result.rows[0], user);
};

export const deleteBoard = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const context = await curriculumRepo.fetchBoardContext(id);
  if (context.rows.length === 0) {
    throw new AppError('Board not found', 404);
  }
  if (!(await canManageCurriculumContext(user, context.rows[0]))) {
    throw new AppError('Access denied', 403);
  }

  const clientId = isSuperAdmin(user?.role) ? null : context.rows[0].client_id;
  const result = await curriculumRepo.deleteBoard({ id, clientId });
  if (result.rows.length === 0) {
    throw new AppError('Board not found', 404);
  }
  return { success: true, id: result.rows[0].id };
};

export const listProgramsByBoard = async ({ user, params, query }) => {
  const boardId = parseRequiredInt(params?.boardId, 'boardId');
  const boardScope = await getBoardReadScope(user);
  const board = await curriculumRepo.fetchBoardById({ id: boardId, ...boardScope });
  if (board.rows.length === 0) {
    throw new AppError('Board not found', 404);
  }

  const clientId = resolveClientId(user, query?.client_id);
  const writableOnly = query?.writable === '1' || query?.writable === 'true';
  const assignedOnly = query?.assigned_only === '1' || query?.assigned_only === 'true';
  const assignmentOnly = query?.assignment_only === '1' || query?.assignment_only === 'true';
  const schoolIds = boardScope.schoolIds;
  const schoolAssignedOnly = isSchoolUser(user) && !writableOnly;
  const sharedProgramIds = isPlatformCurriculumAdmin(user) || writableOnly || assignmentOnly
    ? []
    : await getReadableSharedProgramIds(clientId);
  const assignedProgramIds = isSchoolUser(user) && !writableOnly
    ? await getAssignedQuestionBankProgramIds(schoolIds)
    : [];

  const result = await curriculumRepo.fetchProgramsByBoard({
    boardId,
    clientId: isPlatformCurriculumAdmin(user) && !writableOnly ? null : clientId,
    sharedProgramIds,
    assignedProgramIds,
    schoolIds,
    writableOnly,
    assignedOnly: ((assignedOnly || assignmentOnly) && isSchoolUser(user)) || schoolAssignedOnly,
    assignmentOnly: assignmentOnly && isSchoolUser(user),
  });
  return decorateCurriculumItems(result.rows, user);
};

export const createProgramForBoard = async ({ user, params, body }) => {
  const boardId = parseRequiredInt(params?.boardId, 'boardId');
  const boardResult = await curriculumRepo.fetchBoardContext(boardId);
  if (boardResult.rows.length === 0) {
    throw new AppError('Board not found', 404);
  }

  const name = requireString(body?.name, 'name');
  const codeInput = body?.code ? requireString(body?.code, 'code') : null;
  const code = codeInput || generateProgramCode(name);
  const clientId = resolveClientId(user, body?.client_id);
  const schoolId = await resolveOwnedSchoolId(user, body?.school_id);
  const isActive = parseBoolean(body?.is_active, 'is_active');
  ensureBoardMatchesClient(boardResult.rows[0], clientId);

  const result = await curriculumRepo.insertProgram({
    clientId,
    schoolId,
    boardId,
    name,
    code,
    is_active: isActive ?? true,
  });
  return decorateCurriculumItem(result.rows[0], user);
};

export const listPrograms = async ({ user, query }) => {
  const clientId = resolveClientId(user, query?.client_id);
  const writableOnly = query?.writable === '1' || query?.writable === 'true';
  const assignedOnly = query?.assigned_only === '1' || query?.assigned_only === 'true';
  const assignmentOnly = query?.assignment_only === '1' || query?.assignment_only === 'true';
  const schoolIds = isSchoolUser(user) ? await fetchUserSchoolIdsByRoleScope(user) : [];
  const schoolAssignedOnly = isSchoolUser(user) && !writableOnly;
  const sharedProgramIds = isPlatformCurriculumAdmin(user) || writableOnly || assignmentOnly ? [] : await getReadableSharedProgramIds(clientId);
  const assignedProgramIds = isSchoolUser(user) && !writableOnly ? await getAssignedQuestionBankProgramIds(schoolIds) : [];
  const result = await curriculumRepo.fetchPrograms({
    clientId: isPlatformCurriculumAdmin(user) && !writableOnly ? null : clientId,
    sharedProgramIds,
    assignedProgramIds,
    schoolIds,
    writableOnly,
    assignedOnly: ((assignedOnly || assignmentOnly) && isSchoolUser(user)) || schoolAssignedOnly,
    assignmentOnly: assignmentOnly && isSchoolUser(user),
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
  const boardId = parseNullableInt(body?.board_id, 'board_id');
  const isActive = parseBoolean(body?.is_active, 'is_active');

  if (boardId !== null) {
    const boardResult = await curriculumRepo.fetchBoardContext(boardId);
    if (boardResult.rows.length === 0) {
      throw new AppError('Board not found', 404);
    }
    ensureBoardMatchesClient(boardResult.rows[0], clientId);
  }

  const result = await curriculumRepo.insertProgram({
    clientId,
    schoolId,
    boardId,
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
  if (body?.board_id !== undefined) {
    updates.board_id = parseNullableInt(body.board_id, 'board_id');
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

  if (updates.board_id !== undefined && updates.board_id !== null) {
    const boardResult = await curriculumRepo.fetchBoardContext(updates.board_id);
    if (boardResult.rows.length === 0) {
      throw new AppError('Board not found', 404);
    }
    ensureBoardMatchesClient(boardResult.rows[0], context.rows[0].client_id);
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
  const scopedClientId = isPlatformCurriculumAdmin(user) ? null : clientId;
  const program = await curriculumRepo.fetchProgramById({
    id: programId,
    clientId: scopedClientId,
    sharedProgramIds,
  });
  if (program.rows.length === 0) {
    throw new AppError('Program not found', 404);
  }
  const result = await curriculumRepo.fetchGradesByProgram({
    programId,
    clientId: scopedClientId,
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
  if (body?.program_id !== undefined) {
    updates.program_id = parseRequiredInt(body?.program_id, 'program_id');
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
  if (updates.program_id !== undefined && Number(updates.program_id) !== Number(gradeContext.rows[0].program_id)) {
    const destination = await curriculumRepo.fetchProgramContext(updates.program_id);
    if (!destination.rows[0]) throw new AppError('Destination Program not found', 404);
    if (!(await canManageCurriculumContext(user, destination.rows[0])) || Number(destination.rows[0].client_id) !== Number(gradeContext.rows[0].client_id)) {
      throw new AppError('The destination Program is outside this curriculum scope', 403);
    }
    const gradeNumber = updates.grade_number ?? (await dbQuery('SELECT grade_number FROM grades WHERE id = $1', [id])).rows[0].grade_number;
    const duplicate = await dbQuery('SELECT 1 FROM grades WHERE program_id = $1 AND grade_number = $2 AND id <> $3', [updates.program_id, gradeNumber, id]);
    if (duplicate.rows[0]) throw new AppError(`Grade ${gradeNumber} already exists in the destination Program`, 409);
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
  const scopedClientId = isPlatformCurriculumAdmin(user) ? null : clientId;
  const grade = await curriculumRepo.fetchGradeById({
    id: gradeId,
    clientId: scopedClientId,
    sharedProgramIds,
  });
  if (grade.rows.length === 0) {
    throw new AppError('Grade not found', 404);
  }
  const result = await curriculumRepo.fetchSubjectsByGrade({
    gradeId,
    clientId: scopedClientId,
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
  const scopedClientId = isPlatformCurriculumAdmin(user) ? null : clientId;
  const subject = await curriculumRepo.fetchSubjectById(
    subjectId,
    scopedClientId,
    sharedProgramIds
  );
  if (subject.rows.length === 0) {
    throw new AppError('Subject not found', 404);
  }
  const result = await curriculumRepo.fetchChaptersBySubject({
    subjectId,
    clientId: scopedClientId,
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

  let result;
  try {
    result = await curriculumRepo.insertChapter({
      subjectId,
      name,
      chapter_number: chapterNumber,
      description: body?.description ?? null,
      is_active: active ?? true,
    });
  } catch (error) {
    if (error?.code === '23505' && error?.constraint === 'idx_chapters_number') {
      throw new AppError(`Chapter number ${chapterNumber} already exists for this Subject`, 409);
    }
    throw error;
  }
  return decorateCurriculumItem(result.rows[0], user);
};

export const updateChapter = async ({ user, params, body }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const updates = {};

  if (body?.name !== undefined) updates.name = requireString(body?.name, 'name');
  if (body?.chapter_number !== undefined) {
    updates.chapter_number = parseRequiredInt(body?.chapter_number, 'chapter_number');
  }
  if (body?.subject_id !== undefined) updates.subject_id = parseRequiredInt(body.subject_id, 'subject_id');
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
  if (updates.subject_id !== undefined) {
    const current = await dbQuery('SELECT subject_id FROM chapters WHERE id = $1', [id]);
    if (Number(updates.subject_id) !== Number(current.rows[0]?.subject_id)) {
      const destination = await curriculumRepo.fetchSubjectContext(updates.subject_id);
      if (!destination.rows[0]) throw new AppError('Destination Subject not found', 404);
      if (!(await canManageCurriculumContext(user, destination.rows[0])) || Number(destination.rows[0].client_id) !== Number(chapterContext.rows[0].client_id)) throw new AppError('The destination Subject is outside this curriculum scope', 403);
      updates.chapter_number = Number((await dbQuery('SELECT COALESCE(MAX(chapter_number), 0) + 1 AS value FROM chapters WHERE subject_id = $1', [updates.subject_id])).rows[0].value);
    }
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
  const scopedClientId = isPlatformCurriculumAdmin(user) ? null : clientId;
  const chapter = await curriculumRepo.fetchChapterById({
    id: chapterId,
    clientId: scopedClientId,
    sharedProgramIds,
  });
  if (chapter.rows.length === 0) {
    throw new AppError('Chapter not found', 404);
  }
  const result = await curriculumRepo.fetchTopicsByChapter({
    chapterId,
    clientId: scopedClientId,
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
  if (body?.chapter_id !== undefined) updates.chapter_id = parseRequiredInt(body.chapter_id, 'chapter_id');
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
  if (updates.chapter_id !== undefined) {
    const current = await dbQuery('SELECT chapter_id FROM topics WHERE id = $1', [id]);
    if (Number(updates.chapter_id) !== Number(current.rows[0]?.chapter_id)) {
      const destination = await curriculumRepo.fetchChapterContext(updates.chapter_id);
      if (!destination.rows[0]) throw new AppError('Destination Chapter not found', 404);
      if (!(await canManageCurriculumContext(user, destination.rows[0])) || Number(destination.rows[0].client_id) !== Number(topicContext.rows[0].client_id)) throw new AppError('The destination Chapter is outside this curriculum scope', 403);
      updates.topic_number = Number((await dbQuery('SELECT COALESCE(MAX(topic_number), 0) + 1 AS value FROM topics WHERE chapter_id = $1', [updates.chapter_id])).rows[0].value);
    }
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

export const listSubtopics = async ({ user, params }) => {
  const topicId = parseRequiredInt(params?.topicId, 'topicId');
  const clientId = resolveScopedClientId(user);
  const sharedProgramIds = isPlatformCurriculumAdmin(user)
    ? []
    : await getReadableSharedProgramIds(clientId);
  const scopedClientId = isPlatformCurriculumAdmin(user) ? null : clientId;

  const topic = await curriculumRepo.fetchTopicById({
    id: topicId,
    clientId: scopedClientId,
    sharedProgramIds,
  });
  if (topic.rows.length === 0) {
    throw new AppError('Topic not found', 404);
  }

  const result = await curriculumRepo.fetchSubtopicsByTopic({
    topicId,
    clientId: scopedClientId,
    sharedProgramIds,
  });
  return decorateCurriculumItems(result.rows, user);
};

export const getSubtopic = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const clientId = resolveScopedClientId(user);
  const sharedProgramIds = isPlatformCurriculumAdmin(user)
    ? []
    : await getReadableSharedProgramIds(clientId);
  const result = await curriculumRepo.fetchSubtopicById({
    id,
    clientId: isPlatformCurriculumAdmin(user) ? null : clientId,
    sharedProgramIds,
  });
  if (result.rows.length === 0) {
    throw new AppError('Subtopic not found', 404);
  }
  return decorateCurriculumItem(result.rows[0], user);
};

export const createSubtopic = async ({ user, params, body }) => {
  const topicId = parseRequiredInt(params?.topicId, 'topicId');
  const name = requireString(body?.name, 'name');
  const displayOrder = parseRequiredInt(body?.display_order ?? 0, 'display_order');
  const isActive = parseBoolean(body?.is_active, 'is_active');

  const topicContext = await curriculumRepo.fetchTopicContext(topicId);
  if (topicContext.rows.length === 0) {
    throw new AppError('Topic not found', 404);
  }
  if (!(await canManageCurriculumContext(user, topicContext.rows[0]))) {
    throw new AppError('Access denied', 403);
  }

  const result = await curriculumRepo.insertSubtopic({
    topicId,
    name,
    description: body?.description ?? null,
    display_order: displayOrder,
    is_active: isActive ?? true,
  });
  return decorateCurriculumItem(
    { ...topicContext.rows[0], ...result.rows[0], topic_id: topicId },
    user
  );
};

export const updateSubtopic = async ({ user, params, body }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const updates = {};

  if (body?.name !== undefined) updates.name = requireString(body.name, 'name');
  if (body?.description !== undefined) updates.description = body.description ?? null;
  if (body?.display_order !== undefined) {
    updates.display_order = parseRequiredInt(body.display_order, 'display_order');
  }
  if (body?.topic_id !== undefined) updates.topic_id = parseRequiredInt(body.topic_id, 'topic_id');
  if (body?.is_active !== undefined) {
    updates.is_active = parseBoolean(body.is_active, 'is_active');
  }
  if (Object.keys(updates).length === 0) {
    throw new AppError('No updates provided', 400);
  }

  const context = await curriculumRepo.fetchSubtopicContext(id);
  if (context.rows.length === 0) {
    throw new AppError('Subtopic not found', 404);
  }
  if (!(await canManageCurriculumContext(user, context.rows[0]))) {
    throw new AppError('Access denied', 403);
  }
  if (updates.topic_id !== undefined && Number(updates.topic_id) !== Number(context.rows[0].topic_id)) {
    const destination = await curriculumRepo.fetchTopicContext(updates.topic_id);
    if (!destination.rows[0]) throw new AppError('Destination Topic not found', 404);
    if (!(await canManageCurriculumContext(user, destination.rows[0])) || Number(destination.rows[0].client_id) !== Number(context.rows[0].client_id)) throw new AppError('The destination Topic is outside this curriculum scope', 403);
    updates.display_order = Number((await dbQuery('SELECT COALESCE(MAX(display_order), 0) + 1 AS value FROM subtopics WHERE topic_id = $1', [updates.topic_id])).rows[0].value);
  }

  const result = await curriculumRepo.updateSubtopic({ id, updates });
  if (result.rows.length === 0) {
    throw new AppError('Subtopic not found', 404);
  }
  return decorateCurriculumItem({ ...context.rows[0], ...result.rows[0] }, user);
};

export const deleteSubtopic = async ({
  user,
  params,
  getDbClient = getClient,
  removeFiles = removeStoredSessionDocuments,
}) => {
  const id = parseRequiredInt(params?.id, 'id');
  const context = await curriculumRepo.fetchSubtopicContext(id);
  if (context.rows.length === 0) {
    throw new AppError('Subtopic not found', 404);
  }
  if (!(await canManageCurriculumContext(user, context.rows[0]))) {
    throw new AppError('Access denied', 403);
  }

  const client = await getDbClient();
  let storageKeys = [];
  let deletedSessionCount = 0;
  try {
    await client.query('BEGIN');
    const lockedSubtopic = await client.query(
      'SELECT id FROM subtopics WHERE id = $1 FOR UPDATE',
      [id],
    );
    if (!lockedSubtopic.rows[0]) throw new AppError('Subtopic not found', 404);

    const sessions = await client.query(
      'SELECT id, status FROM sessions WHERE subtopic_id = $1 FOR UPDATE',
      [id],
    );
    const published = sessions.rows.find((session) => session.status === 'published');
    if (published) {
      throw new AppError(
        'This Subtopic contains a published Session. Published Sessions must be unpublished before deleting the Subtopic.',
        409,
        'SUBTOPIC_HAS_PUBLISHED_SESSION',
      );
    }

    const sessionIds = sessions.rows.map((session) => Number(session.id));
    deletedSessionCount = sessionIds.length;
    if (sessionIds.length > 0) {
      const releases = await client.query(
        'SELECT 1 FROM session_releases WHERE session_id = ANY($1::int[]) LIMIT 1',
        [sessionIds],
      );
      if (releases.rows[0]) {
        throw new AppError(
          'This Subtopic contains a Session with a published release. Published releases are immutable.',
          409,
          'SUBTOPIC_HAS_PUBLISHED_RELEASE',
        );
      }
      const documents = await client.query(
        `SELECT storage_key FROM session_documents
         WHERE session_id = ANY($1::int[]) AND storage_key IS NOT NULL`,
        [sessionIds],
      );
      storageKeys = documents.rows.map((row) => row.storage_key).filter(Boolean);

      await client.query('DELETE FROM session_authorizations WHERE session_id = ANY($1::int[])', [sessionIds]);
      await client.query('DELETE FROM session_validations WHERE session_id = ANY($1::int[])', [sessionIds]);
      await client.query('DELETE FROM screen_zoom_links WHERE session_id = ANY($1::int[])', [sessionIds]);
      await client.query('DELETE FROM screen_branches WHERE session_id = ANY($1::int[])', [sessionIds]);
      await client.query('DELETE FROM screen_script_revisions WHERE session_id = ANY($1::int[])', [sessionIds]);
      await client.query('DELETE FROM screens WHERE session_id = ANY($1::int[])', [sessionIds]);
      await client.query('DELETE FROM session_documents WHERE session_id = ANY($1::int[])', [sessionIds]);
      await client.query('DELETE FROM sessions WHERE id = ANY($1::int[])', [sessionIds]);
    }

    const result = await client.query('DELETE FROM subtopics WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) throw new AppError('Subtopic not found', 404);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error?.code === '23503') {
      throw new AppError(
        'This Subtopic still has related activity and cannot be deleted',
        409,
        'SUBTOPIC_DELETE_DEPENDENCY_CONFLICT',
      );
    }
    throw error;
  } finally {
    client.release();
  }

  const storageCleanupComplete = await removeFiles(storageKeys);
  return {
    success: true,
    id,
    deleted_session_count: deletedSessionCount,
    deleted_document_count: storageKeys.length,
    storage_cleanup_complete: storageCleanupComplete,
  };
};
