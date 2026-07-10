import { query as dbQuery } from '../repositories/db.repository.js';
import { AppError } from '../utils/errors.js';

const PLATFORM_EXAM_OWNER_CLIENT_ID = 17;

const isPlatformAdmin = (role) => role === 'super_admin' || role === 'content_authorizer';
const isClientAdmin = (role) => role === 'client_admin';
const isSchoolOwner = (role) => role === 'school_owner';
const isTeacher = (role) => role === 'teacher';
const isPlatformOwnedExamClientId = (clientId) => Number(clientId) === PLATFORM_EXAM_OWNER_CLIENT_ID;
const isPlatformTenantClientAdmin = (user) =>
  isClientAdmin(user?.role) && isPlatformOwnedExamClientId(user?.client_id);
const isPlatformOperator = (user) => isPlatformAdmin(user?.role) || isPlatformTenantClientAdmin(user);

const fetchUserSchoolIds = async (userId) => {
  if (!userId) return [];

  const result = await dbQuery(
    `
      SELECT DISTINCT school_id
      FROM school_memberships
      WHERE user_id = $1
        AND school_id IS NOT NULL
    `,
    [userId]
  );

  return result.rows
    .map((row) => Number(row.school_id))
    .filter((schoolId) => Number.isInteger(schoolId) && schoolId > 0);
};

export const validateCoursesForExamAccess = async ({ courseIds, exam, user }) => {
  if (!Array.isArray(courseIds) || courseIds.length === 0) return;

  const parsedCourseIds = Array.from(
    new Set(
      courseIds
        .map((courseId) => Number(courseId))
        .filter((courseId) => Number.isInteger(courseId) && courseId > 0)
    )
  );

  if (parsedCourseIds.length !== courseIds.length) {
    throw new AppError('One or more course_ids are invalid', 404);
  }

  const courseResult = await dbQuery(
    `
      SELECT
        c.id,
        c.client_id,
        c.school_id,
        COALESCE(
          ARRAY_AGG(DISTINCT csa.school_id) FILTER (WHERE csa.school_id IS NOT NULL),
          '{}'::int[]
        ) AS assigned_school_ids
      FROM courses c
      LEFT JOIN course_school_assignments csa
        ON csa.course_id = c.id
      WHERE c.id = ANY($1::int[])
      GROUP BY c.id
    `,
    [parsedCourseIds]
  );

  if (courseResult.rows.length !== parsedCourseIds.length) {
    throw new AppError('One or more course_ids are invalid', 404);
  }

  let scopedSchoolIds = null;
  if (isSchoolOwner(user?.role) || isTeacher(user?.role)) {
    scopedSchoolIds = await fetchUserSchoolIds(user?.id);
  }

  for (const course of courseResult.rows) {
    const courseClientId = Number(course.client_id);
    const examClientId = Number(exam.client_id);
    const assignedSchoolIds = Array.isArray(course.assigned_school_ids)
      ? course.assigned_school_ids.map(Number).filter((schoolId) => Number.isInteger(schoolId) && schoolId > 0)
      : [];
    const courseSchoolId = course.school_id ? Number(course.school_id) : null;
    const courseSchoolIds = Array.from(new Set([
      ...(courseSchoolId ? [courseSchoolId] : []),
      ...assignedSchoolIds,
    ]));

    if (!isPlatformOwnedExamClientId(examClientId) && courseClientId !== examClientId) {
      throw new AppError('Course does not belong to the same client as the exam', 403);
    }

    if (isPlatformOwnedExamClientId(examClientId) && !isPlatformOperator(user)) {
      const requesterClientId = Number(user?.client_id);
      if (!requesterClientId || courseClientId !== requesterClientId) {
        throw new AppError('Course does not belong to the requester client scope', 403);
      }
    }

    if (exam.school_id && !courseSchoolIds.includes(Number(exam.school_id))) {
      throw new AppError('Course does not belong to the same school as the exam', 403);
    }

    if (scopedSchoolIds && courseSchoolIds.length > 0 && !courseSchoolIds.some((schoolId) => scopedSchoolIds.includes(schoolId))) {
      throw new AppError('Access denied for one or more courses', 403);
    }
  }
};
