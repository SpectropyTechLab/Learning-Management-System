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

const PLATFORM_PROGRAM_OWNER_CLIENT_ID = 17;

const resolveClientId = (user, sourceClientId) => {
  if (user?.role === 'super_admin') {
    return parseNullableInt(sourceClientId, 'client_id');
  }
  const clientId = user?.client_id ?? null;
  if (!clientId) {
    throw new AppError('client_id is required', 400);
  }
  return clientId;
};

const ensureClientAccess = (ownerClientId, requester) => {
  if (requester?.role === 'super_admin') return;
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

const generateProgramCode = (name) =>
  String(name || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);

export const listPrograms = async ({ user, query }) => {
  const clientId = resolveClientId(user, query?.client_id);
  const sharedProgramIds = user?.role === 'super_admin' ? [] : await getReadableSharedProgramIds(clientId);
  const result = await curriculumRepo.fetchPrograms(clientId || null, sharedProgramIds);
  return result.rows;
};

export const getProgram = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const clientId = user?.role === 'super_admin' ? null : user?.client_id;
  const sharedProgramIds = user?.role === 'super_admin' ? [] : await getReadableSharedProgramIds(clientId);
  const result = await curriculumRepo.fetchProgramById(id, clientId || null, sharedProgramIds);
  if (result.rows.length === 0) {
    throw new AppError('Program not found', 404);
  }
  return result.rows[0];
};

export const createProgram = async ({ user, body }) => {
  const name = requireString(body?.name, 'name');
  const codeInput = body?.code ? requireString(body?.code, 'code') : null;
  const code = codeInput || generateProgramCode(name);
  const clientId = resolveClientId(user, body?.client_id);
  const isActive = parseBoolean(body?.is_active, 'is_active');

  const result = await curriculumRepo.insertProgram({
    clientId,
    name,
    code,
    is_active: isActive ?? true,
  });

  return result.rows[0];
};

export const updateProgram = async ({ user, params, body }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const updates = {};

  if (body?.name !== undefined) updates.name = requireString(body?.name, 'name');
  if (body?.code !== undefined) updates.code = requireString(body?.code, 'code');
  if (body?.is_active !== undefined) {
    updates.is_active = parseBoolean(body?.is_active, 'is_active');
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError('No updates provided', 400);
  }

  const clientId = user?.role === 'super_admin' ? null : user?.client_id;
  if (!clientId && user?.role !== 'super_admin') {
    throw new AppError('client_id is required', 400);
  }

  const result = await curriculumRepo.updateProgram({ id, clientId, updates });
  if (result.rows.length === 0) {
    throw new AppError('Program not found', 404);
  }
  return result.rows[0];
};

export const deleteProgram = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const clientId = user?.role === 'super_admin' ? null : user?.client_id;
  if (!clientId && user?.role !== 'super_admin') {
    throw new AppError('client_id is required', 400);
  }
  const result = await curriculumRepo.deleteProgram({ id, clientId });
  if (result.rows.length === 0) {
    throw new AppError('Program not found', 404);
  }
  return { success: true, id: result.rows[0].id };
};

export const listGrades = async ({ user, params }) => {
  const programId = parseRequiredInt(params?.programId, 'programId');
  const clientId = user?.role === 'super_admin' ? null : user?.client_id;
  const sharedProgramIds = user?.role === 'super_admin' ? [] : await getReadableSharedProgramIds(clientId);
  const result = await curriculumRepo.fetchGradesByProgram({ programId, clientId, sharedProgramIds });
  return result.rows;
};

export const getGrade = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const clientId = user?.role === 'super_admin' ? null : user?.client_id;
  const sharedProgramIds = user?.role === 'super_admin' ? [] : await getReadableSharedProgramIds(clientId);
  const result = await curriculumRepo.fetchGradeById({ id, clientId, sharedProgramIds });
  if (result.rows.length === 0) {
    throw new AppError('Grade not found', 404);
  }
  return result.rows[0];
};

export const createGrade = async ({ user, params, body }) => {
  const programId = parseRequiredInt(params?.programId, 'programId');
  const gradeNumber = parseRequiredInt(body?.grade_number, 'grade_number');
  const active = parseBoolean(body?.is_active, 'is_active');

  const programContext = await curriculumRepo.fetchProgramContext(programId);
  if (programContext.rows.length === 0) {
    throw new AppError('Program not found', 404);
  }
  ensureClientAccess(programContext.rows[0].client_id, user);

  const result = await curriculumRepo.insertGrade({
    programId,
    grade_number: gradeNumber,
    is_active: active ?? true,
  });
  return result.rows[0];
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
  ensureClientAccess(gradeContext.rows[0].client_id, user);

  const result = await curriculumRepo.updateGrade({ id, updates });
  return result.rows[0];
};

export const deleteGrade = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const gradeContext = await curriculumRepo.fetchGradeContext(id);
  if (gradeContext.rows.length === 0) {
    throw new AppError('Grade not found', 404);
  }
  ensureClientAccess(gradeContext.rows[0].client_id, user);

  const result = await curriculumRepo.deleteGrade(id);
  if (result.rows.length === 0) {
    throw new AppError('Grade not found', 404);
  }
  return { success: true, id: result.rows[0].id };
};

export const listSubjects = async ({ user, query }) => {
  const clientId = resolveClientId(user, query?.client_id);
  const gradeId = parseNullableInt(query?.grade_id, 'grade_id');
  const sharedProgramIds = user?.role === 'super_admin' ? [] : await getReadableSharedProgramIds(clientId);
  const result = await curriculumRepo.fetchSubjects(clientId || null, gradeId, sharedProgramIds);
  return result.rows;
};

export const listSubjectsByGrade = async ({ user, params }) => {
  const gradeId = parseRequiredInt(params?.gradeId, 'gradeId');
  const clientId = user?.role === 'super_admin' ? null : user?.client_id;
  const sharedProgramIds = user?.role === 'super_admin' ? [] : await getReadableSharedProgramIds(clientId);
  const result = await curriculumRepo.fetchSubjectsByGrade({ gradeId, clientId, sharedProgramIds });
  return result.rows;
};

export const getSubject = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const clientId = user?.role === 'super_admin' ? null : user?.client_id;
  const sharedProgramIds = user?.role === 'super_admin' ? [] : await getReadableSharedProgramIds(clientId);
  const result = await curriculumRepo.fetchSubjectById(id, clientId || null, sharedProgramIds);
  if (result.rows.length === 0) {
    throw new AppError('Subject not found', 404);
  }
  return result.rows[0];
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

  return (await curriculumRepo.fetchSubjectById(result.rows[0].id, clientId || null)).rows[0];
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

  const clientId = user?.role === 'super_admin' ? null : user?.client_id;
  if (!clientId && user?.role !== 'super_admin') {
    throw new AppError('client_id is required', 400);
  }

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
  return (await curriculumRepo.fetchSubjectById(id, clientId || null)).rows[0];
};

export const deleteSubject = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const clientId = user?.role === 'super_admin' ? null : user?.client_id;
  if (!clientId && user?.role !== 'super_admin') {
    throw new AppError('client_id is required', 400);
  }
  const result = await curriculumRepo.deleteSubject({ id, clientId });
  if (result.rows.length === 0) {
    throw new AppError('Subject not found', 404);
  }
  return { success: true, id: result.rows[0].id };
};

export const listChapters = async ({ user, params }) => {
  const subjectId = parseRequiredInt(params?.subjectId, 'subjectId');
  const clientId = user?.role === 'super_admin' ? null : user?.client_id;
  const sharedProgramIds = user?.role === 'super_admin' ? [] : await getReadableSharedProgramIds(clientId);
  const result = await curriculumRepo.fetchChaptersBySubject({ subjectId, clientId, sharedProgramIds });
  return result.rows;
};

export const getChapter = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const clientId = user?.role === 'super_admin' ? null : user?.client_id;
  const sharedProgramIds = user?.role === 'super_admin' ? [] : await getReadableSharedProgramIds(clientId);
  const result = await curriculumRepo.fetchChapterById({ id, clientId, sharedProgramIds });
  if (result.rows.length === 0) {
    throw new AppError('Chapter not found', 404);
  }
  return result.rows[0];
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
  ensureClientAccess(subjectContext.rows[0].client_id, user);

  const result = await curriculumRepo.insertChapter({
    subjectId,
    name,
    chapter_number: chapterNumber,
    description: body?.description ?? null,
    is_active: active ?? true,
  });
  return result.rows[0];
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
  ensureClientAccess(chapterContext.rows[0].client_id, user);

  const result = await curriculumRepo.updateChapter({ id, updates });
  return result.rows[0];
};

export const deleteChapter = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const chapterContext = await curriculumRepo.fetchChapterContext(id);
  if (chapterContext.rows.length === 0) {
    throw new AppError('Chapter not found', 404);
  }
  ensureClientAccess(chapterContext.rows[0].client_id, user);

  const result = await curriculumRepo.deleteChapter(id);
  if (result.rows.length === 0) {
    throw new AppError('Chapter not found', 404);
  }
  return { success: true, id: result.rows[0].id };
};

export const listTopics = async ({ user, params }) => {
  const chapterId = parseRequiredInt(params?.chapterId, 'chapterId');
  const clientId = user?.role === 'super_admin' ? null : user?.client_id;
  const sharedProgramIds = user?.role === 'super_admin' ? [] : await getReadableSharedProgramIds(clientId);
  const result = await curriculumRepo.fetchTopicsByChapter({ chapterId, clientId, sharedProgramIds });
  return result.rows;
};

export const getTopic = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const clientId = user?.role === 'super_admin' ? null : user?.client_id;
  const sharedProgramIds = user?.role === 'super_admin' ? [] : await getReadableSharedProgramIds(clientId);
  const result = await curriculumRepo.fetchTopicById({ id, clientId, sharedProgramIds });
  if (result.rows.length === 0) {
    throw new AppError('Topic not found', 404);
  }
  return result.rows[0];
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
  ensureClientAccess(chapterContext.rows[0].client_id, user);

  const result = await curriculumRepo.insertTopic({
    chapterId,
    name,
    topic_number: topicNumber,
    is_active: active ?? true,
  });
  return result.rows[0];
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
  ensureClientAccess(topicContext.rows[0].client_id, user);

  const result = await curriculumRepo.updateTopic({ id, updates });
  return result.rows[0];
};

export const deleteTopic = async ({ user, params }) => {
  const id = parseRequiredInt(params?.id, 'id');
  const topicContext = await curriculumRepo.fetchTopicContext(id);
  if (topicContext.rows.length === 0) {
    throw new AppError('Topic not found', 404);
  }
  ensureClientAccess(topicContext.rows[0].client_id, user);

  const result = await curriculumRepo.deleteTopic(id);
  if (result.rows.length === 0) {
    throw new AppError('Topic not found', 404);
  }
  return { success: true, id: result.rows[0].id };
};


