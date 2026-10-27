import { query as dbQuery } from '../repositories/db.repository.js';
import { handleServiceError } from '../utils/errors.js';
import {
  buildFeatureEntitlementMiddleware,
  ensureProgramEntitledForModule,
} from '../services/moduleEntitlements.service.js';

const PLATFORM_OWNER_CLIENT_ID = 17;
const isPlatformAdmin = (role) => role === 'super_admin' || role === 'content_authorizer';
const isPlatformTenantClientAdmin = (user) =>
  user?.role === 'client_admin' && Number(user?.client_id) === PLATFORM_OWNER_CLIENT_ID;
const isPlatformOperator = (user) => isPlatformAdmin(user?.role) || isPlatformTenantClientAdmin(user);
const isSchoolUser = (user) => user?.role === 'school_owner' || user?.role === 'teacher';

const resolveClientId = (req) => {
  const clientId = req.clientId || req.user?.client_id;
  return clientId ? Number(clientId) : null;
};

const parseIntSafe = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const resolveProgramIdFromSubject = async (subjectId) => {
  if (!subjectId) return null;
  const result = await dbQuery(
    `
    SELECT g.program_id
    FROM subjects s
    LEFT JOIN grades g ON g.id = s.grade_id
    WHERE s.id = $1
    LIMIT 1
    `,
    [subjectId]
  );
  return result.rows[0]?.program_id ? Number(result.rows[0].program_id) : null;
};

const resolveProgramIdFromChapter = async (chapterId) => {
  if (!chapterId) return null;
  const result = await dbQuery(
    `
    SELECT g.program_id
    FROM chapters c
    JOIN subjects s ON s.id = c.subject_id
    LEFT JOIN grades g ON g.id = s.grade_id
    WHERE c.id = $1
    LIMIT 1
    `,
    [chapterId]
  );
  return result.rows[0]?.program_id ? Number(result.rows[0].program_id) : null;
};

const resolveProgramIdFromTopic = async (topicId) => {
  if (!topicId) return null;
  const result = await dbQuery(
    `
    SELECT g.program_id
    FROM topics t
    JOIN chapters c ON c.id = t.chapter_id
    JOIN subjects s ON s.id = c.subject_id
    LEFT JOIN grades g ON g.id = s.grade_id
    WHERE t.id = $1
    LIMIT 1
    `,
    [topicId]
  );
  return result.rows[0]?.program_id ? Number(result.rows[0].program_id) : null;
};

const resolveProgramIdFromQuestion = async (questionId) => {
  if (!questionId) return null;
  const result = await dbQuery(
    `
    SELECT g.program_id
    FROM questions q
    LEFT JOIN subjects s ON s.id = q.subject_id
    LEFT JOIN grades g ON g.id = s.grade_id
    WHERE q.id = $1
    LIMIT 1
    `,
    [questionId]
  );
  return result.rows[0]?.program_id ? Number(result.rows[0].program_id) : null;
};

const resolveProgramIdFromExam = async (examId) => {
  if (!examId) return null;
  const result = await dbQuery(`SELECT program_id FROM exams WHERE id = $1 LIMIT 1`, [examId]);
  return result.rows[0]?.program_id ? Number(result.rows[0].program_id) : null;
};

const fetchUserSchoolIds = async (userId) => {
  const result = await dbQuery(
    `SELECT school_id FROM school_memberships WHERE user_id = $1 AND status = 'active'`,
    [userId]
  );
  return result.rows.map((row) => Number(row.school_id)).filter(Number.isInteger);
};

const isOwnQuestionBankProgram = async ({ user, clientId, programId }) => {
  if (!programId) return false;
  const result = await dbQuery(
    `SELECT id, client_id, school_id FROM programs WHERE id = $1 LIMIT 1`,
    [programId]
  );
  const program = result.rows[0];
  if (!program) return false;

  if (
    user?.role === 'client_admin' &&
    Number(clientId) === Number(program.client_id) &&
    Number(program.client_id) !== PLATFORM_OWNER_CLIENT_ID &&
    !program.school_id
  ) {
    return true;
  }

  if (isSchoolUser(user) && program.school_id) {
    const schoolIds = await fetchUserSchoolIds(user.id);
    return schoolIds.includes(Number(program.school_id));
  }

  return false;
};

const isOwnSchoolProgram = async ({ user, programId }) => {
  if (!isSchoolUser(user) || !programId) return false;
  const result = await dbQuery(
    `SELECT school_id FROM programs WHERE id = $1 LIMIT 1`,
    [programId]
  );
  const schoolId = result.rows[0]?.school_id ? Number(result.rows[0].school_id) : null;
  if (!schoolId) return false;

  const schoolIds = await fetchUserSchoolIds(user.id);
  return schoolIds.includes(schoolId);
};

const resolveQuestionBankProgramId = async (req) => {
  const directProgramId = parseIntSafe(req.body?.program_id) ?? parseIntSafe(req.query?.program_id) ?? parseIntSafe(req.params?.programId);
  if (directProgramId) return directProgramId;

  const subjectId = parseIntSafe(req.body?.subject_id) ?? parseIntSafe(req.query?.subject_id);
  if (subjectId) return resolveProgramIdFromSubject(subjectId);

  const chapterId = parseIntSafe(req.body?.chapter_id) ?? parseIntSafe(req.query?.chapter_id);
  if (chapterId) return resolveProgramIdFromChapter(chapterId);

  const topicId = parseIntSafe(req.body?.topic_id) ?? parseIntSafe(req.query?.topic_id);
  if (topicId) return resolveProgramIdFromTopic(topicId);

  const entityId = parseIntSafe(req.params?.id);
  const path = req.path || '';
  if (entityId && path.startsWith('/questions/')) {
    return resolveProgramIdFromQuestion(entityId);
  }

  return null;
};

const resolveExamProgramId = async (req) => {
  const directProgramId = parseIntSafe(req.body?.program_id) ?? parseIntSafe(req.query?.program_id);
  if (directProgramId) return directProgramId;

  const examId = parseIntSafe(req.params?.id);
  if (examId) {
    return resolveProgramIdFromExam(examId);
  }

  return null;
};

const buildProgramEntitlementMiddleware = (moduleKey, resolver) => async (req, res, next) => {
  try {
    if (isPlatformOperator(req.user)) {
      return next();
    }
    const clientId = resolveClientId(req);
    if (!clientId) {
      return next();
    }

    const programId = await resolver(req);
    if (!programId) {
      return next();
    }

    if (moduleKey === 'question_bank' && await isOwnQuestionBankProgram({ user: req.user, clientId, programId })) {
      return next();
    }

    if (moduleKey === 'exams' && await isOwnSchoolProgram({ user: req.user, programId })) {
      return next();
    }

    await ensureProgramEntitledForModule(moduleKey, clientId, programId);
    return next();
  } catch (err) {
    return handleServiceError(res, err, `Failed program entitlement check for ${moduleKey}`);
  }
};

export const requireQuestionBankFeatureEntitlement = buildFeatureEntitlementMiddleware('question_bank');
export const requireExamFeatureEntitlement = buildFeatureEntitlementMiddleware('exams');
export const requireQuestionBankProgramEntitlement = buildProgramEntitlementMiddleware('question_bank', resolveQuestionBankProgramId);
export const requireExamProgramEntitlement = buildProgramEntitlementMiddleware('exams', resolveExamProgramId);
