import { query as dbQuery } from '../repositories/db.repository.js';
import { getEnabledProgramIdsIfFeatureEnabled } from './moduleEntitlements.service.js';

const PLATFORM_OWNER_CLIENT_ID = 17;
const SCHOOL_OWNER_ROLE_SCOPES = ['school_owner', 'admin'];
const TEACHER_ROLE_SCOPES = ['teacher'];

const isSuperAdmin = (role) => role === 'super_admin';
const isContentAuthorizer = (role) => role === 'content_authorizer';
const isClientAdmin = (role) => role === 'client_admin';
const isSchoolUser = (role) => role === 'school_owner' || role === 'teacher';
const isPlatformTenantClientAdmin = (user) =>
  user?.role === 'client_admin' && Number(user?.client_id) === PLATFORM_OWNER_CLIENT_ID;
const isPlatformOperator = (user) =>
  isSuperAdmin(user?.role) || isContentAuthorizer(user?.role) || isPlatformTenantClientAdmin(user);

const hasPermission = (permissions, permission, role = null) => {
  if (isSuperAdmin(role)) return true;
  if (permissions instanceof Map) return permissions.get(permission) === true;
  if (permissions instanceof Set) return permissions.has(permission);
  if (Array.isArray(permissions)) return permissions.includes(permission);
  return false;
};

const fetchSchoolIdsForUser = async (user) => {
  if (!isSchoolUser(user?.role)) return [];
  const roleScopes = user.role === 'teacher' ? TEACHER_ROLE_SCOPES : SCHOOL_OWNER_ROLE_SCOPES;
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

const hasAssignedCourse = async (schoolIds) => {
  if (schoolIds.length === 0) return false;
  const result = await dbQuery(
    `
    SELECT 1
    FROM course_school_assignments
    WHERE school_id = ANY($1::int[])
    LIMIT 1
    `,
    [schoolIds]
  );
  return result.rows.length > 0;
};

const hasAssignedQuestionBankProgram = async (schoolIds) => {
  if (schoolIds.length === 0) return false;
  const result = await dbQuery(
    `
    SELECT 1
    FROM question_bank_school_assignments
    WHERE school_id = ANY($1::int[])
    LIMIT 1
    `,
    [schoolIds]
  );
  return result.rows.length > 0;
};

const hasAssignedExam = async (schoolIds) => {
  if (schoolIds.length === 0) return false;
  const result = await dbQuery(
    `
    SELECT 1
    FROM exam_school_assignments esa
    JOIN exams e ON e.id = esa.exam_id
    WHERE esa.school_id = ANY($1::int[])
      AND e.status = ANY($2::text[])
    LIMIT 1
    `,
    [schoolIds, ['published', 'active']]
  );
  return result.rows.length > 0;
};

const hasClientFeature = async (moduleKey, clientId) => {
  if (!clientId) return false;
  if (Number(clientId) === PLATFORM_OWNER_CLIENT_ID) return true;
  const ids = await getEnabledProgramIdsIfFeatureEnabled(moduleKey, Number(clientId));
  return ids.length > 0;
};

export const resolveModuleVisibility = async ({ user, permissions }) => {
  const canReadCourses = hasPermission(permissions, 'courses.read', user?.role);
  const canReadQuestions = hasPermission(permissions, 'questions.read', user?.role);
  const canReadExams = hasPermission(permissions, 'exams.read', user?.role);
  const canUseTeachingSessions =
    isSuperAdmin(user?.role) ||
    [
      'teaching_sessions.read_client',
      'teaching_sessions.read_school',
      'teaching_sessions.read_own',
      'teaching_sessions.analytics_client',
      'teaching_sessions.analytics_school',
      'teaching_sessions.analytics_own',
      'teaching_sessions.client_setup',
      'teaching_sessions.assign_teacher',
    ].some((permission) => hasPermission(permissions, permission, user?.role));

  if (isPlatformOperator(user)) {
    return {
      courses: canReadCourses,
      question_bank: canReadQuestions,
      exams: canReadExams,
      teaching_sessions: canUseTeachingSessions,
    };
  }

  if (isSchoolUser(user?.role)) {
    const schoolIds = await fetchSchoolIdsForUser(user);
    const [courses, questionBank, exams] = await Promise.all([
      canReadCourses ? hasAssignedCourse(schoolIds) : Promise.resolve(false),
      canReadQuestions ? hasAssignedQuestionBankProgram(schoolIds) : Promise.resolve(false),
      canReadExams ? hasAssignedExam(schoolIds) : Promise.resolve(false),
    ]);

    return {
      courses,
      question_bank: questionBank,
      exams,
      teaching_sessions: canUseTeachingSessions,
    };
  }

  if (isClientAdmin(user?.role)) {
    const [questionBank, exams] = await Promise.all([
      canReadQuestions ? hasClientFeature('question_bank', user.client_id) : Promise.resolve(false),
      canReadExams ? hasClientFeature('exams', user.client_id) : Promise.resolve(false),
    ]);

    return {
      courses: canReadCourses,
      question_bank: questionBank,
      exams,
      teaching_sessions: canUseTeachingSessions,
    };
  }

  return {
    courses: canReadCourses,
    question_bank: canReadQuestions,
    exams: canReadExams,
    teaching_sessions: canUseTeachingSessions,
  };
};
