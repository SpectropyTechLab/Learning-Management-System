import { query as dbQuery } from '../repositories/db.repository.js';
import { AppError } from '../utils/errors.js';

const PLATFORM_EXAM_OWNER_CLIENT_ID = 17;

const isPlatformAdmin = (role) => role === 'super_admin' || role === 'content_authorizer';
const isSchoolOwner = (role) => role === 'school_owner';
const isTeacher = (role) => role === 'teacher';
const isPlatformOwnedExamClientId = (clientId) => Number(clientId) === PLATFORM_EXAM_OWNER_CLIENT_ID;

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
    `SELECT id, client_id, school_id FROM courses WHERE id = ANY($1::int[])`,
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

    if (!isPlatformOwnedExamClientId(examClientId) && courseClientId !== examClientId) {
      throw new AppError('Course does not belong to the same client as the exam', 403);
    }

    if (isPlatformOwnedExamClientId(examClientId) && !isPlatformAdmin(user?.role)) {
      const requesterClientId = Number(user?.client_id);
      if (!requesterClientId || courseClientId !== requesterClientId) {
        throw new AppError('Course does not belong to the requester client scope', 403);
      }
    }

    if (exam.school_id && Number(course.school_id) !== Number(exam.school_id)) {
      throw new AppError('Course does not belong to the same school as the exam', 403);
    }

    if (scopedSchoolIds && course.school_id && !scopedSchoolIds.includes(Number(course.school_id))) {
      throw new AppError('Access denied for one or more courses', 403);
    }
  }
};
