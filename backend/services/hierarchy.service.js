// backend/controllers/hierarchy.controller.js
import { query as dbQuery, getClient } from '../repositories/db.repository.js';
import {
  canAccessSchool,
  canAccessBatch,
  ensureClientScope,
  getSchoolContext,
  getBatchContext,
  isSchoolOwnerForSchool,
} from '../utils/access.js';
import { hashPassword } from '../utils/hash.js';
import * as rolePermissionsService from '../services/rolePermissions.service.js';
import * as userPermissionsService from '../services/userPermissions.service.js';
import {
  ensureClientCourseTitleOverridesTable,
  ensureCourseSchoolAssignmentsTable,
  listEntitledPlatformCourseIds,
} from './courseShared.service.js';
import { handleServiceError } from '../utils/errors.js';
import { getEnabledProgramIdsIfFeatureEnabled } from './moduleEntitlements.service.js';

const PLATFORM_OWNER_CLIENT_ID = 17;

const VALID_ROLE_SCOPES = ['school_owner', 'teacher', 'student', 'admin'];
const VALID_USER_ROLES = [
  'super_admin',
  'content_authorizer',
  'client_admin',
  'school_owner',
  'teacher',
  'student',
];

let examSchoolAssignmentsTableEnsured = false;
let questionBankSchoolAssignmentsTableEnsured = false;

const ensureExamSchoolAssignmentsTable = async () => {
  if (examSchoolAssignmentsTableEnsured) return;

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS exam_school_assignments (
      id SERIAL PRIMARY KEY,
      exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(exam_id, school_id)
    )
  `);
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_exam_school_assignments_exam ON exam_school_assignments(exam_id)`);
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_exam_school_assignments_school ON exam_school_assignments(school_id)`);

  examSchoolAssignmentsTableEnsured = true;
};

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

const listEntitledPlatformExamProgramIds = async (clientId) => {
  if (!clientId) return [];
  try {
    return await getEnabledProgramIdsIfFeatureEnabled('exams', clientId);
  } catch {
    return [];
  }
};

const listEntitledPlatformQuestionBankProgramIds = async (clientId) => {
  if (!clientId) return [];
  try {
    return await getEnabledProgramIdsIfFeatureEnabled('question_bank', clientId);
  } catch {
    return [];
  }
};

const parseNullableInt = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${fieldName} must be an integer`);
  }
  return parsed;
};

// ---------- Schools ----------
export const listSchools = async (req, res) => {
  const role = req.user?.role;
  const userId = req.user?.id;
  const clientId = req.user?.client_id;
  let requestedClientId = clientId;
  if (role === 'super_admin') {
    try {
      requestedClientId = parseNullableInt(req.query.client_id, 'client_id');
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  try {
    let query = `
      SELECT s.*
      FROM schools s
    `;
    const params = [];

    if (role === 'school_owner') {
      query += `
        JOIN school_memberships sm
          ON sm.school_id = s.id
         AND sm.user_id = $1
         AND sm.role_scope IN ('school_owner', 'admin')
         AND sm.status = 'active'
      `;
      params.push(userId);
    }

    if (requestedClientId) {
      query += ` WHERE s.client_id = $${params.length + 1}`;
      params.push(requestedClientId);
    }

    query += ` ORDER BY s.created_at DESC`;

    const result = await dbQuery(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to load schools:', err);
    res.status(500).json({ error: 'Failed to load schools' });
  }
};

export const createSchool = async (req, res) => {
  const { name, school_code, board, affiliation_no, address_line1, city, state, pincode, country, timezone, phone, email, principal_name } = req.body;
  const role = req.user?.role;
  let clientId = req.user?.client_id;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  if (role === 'super_admin') {
    try {
      clientId = parseNullableInt(req.body.client_id, 'client_id');
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  if (!clientId) {
    return res.status(400).json({ error: 'client_id is required' });
  }

  try {
    const result = await dbQuery(
      `
      INSERT INTO schools
      (client_id, school_code, name, board, affiliation_no, address_line1, city, state, pincode, country, timezone, phone, email, principal_name)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *
      `,
      [
        clientId,
        school_code || null,
        name.trim(),
        board || null,
        affiliation_no || null,
        address_line1 || null,
        city || null,
        state || null,
        pincode || null,
        country || 'India',
        timezone || 'Asia/Kolkata',
        phone || null,
        email || null,
        principal_name || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to create school:', err);
    res.status(500).json({ error: 'Failed to create school' });
  }
};

export const updateSchool = async (req, res) => {
  const { id } = req.params;
  const canAccess = await canAccessSchool(id, req);
  if (!canAccess) return res.status(403).json({ error: 'Access denied' });

  const { name, school_code, board, affiliation_no, address_line1, city, state, pincode, country, timezone, phone, email, principal_name, status } = req.body;
  try {
    const result = await dbQuery(
      `
      UPDATE schools
      SET name = COALESCE($1, name),
          school_code = COALESCE($2, school_code),
          board = COALESCE($3, board),
          affiliation_no = COALESCE($4, affiliation_no),
          address_line1 = COALESCE($5, address_line1),
          city = COALESCE($6, city),
          state = COALESCE($7, state),
          pincode = COALESCE($8, pincode),
          country = COALESCE($9, country),
          timezone = COALESCE($10, timezone),
          phone = COALESCE($11, phone),
          email = COALESCE($12, email),
          principal_name = COALESCE($13, principal_name),
          status = COALESCE($14, status),
          updated_at = NOW()
      WHERE id = $15
      RETURNING *
      `,
      [
        name?.trim() || null,
        school_code || null,
        board || null,
        affiliation_no || null,
        address_line1 || null,
        city || null,
        state || null,
        pincode || null,
        country || null,
        timezone || null,
        phone || null,
        email || null,
        principal_name || null,
        status || null,
        id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to update school:', err);
    res.status(500).json({ error: 'Failed to update school' });
  }
};

export const deactivateSchool = async (req, res) => {
  const { id } = req.params;
  const canAccess = await canAccessSchool(id, req);
  if (!canAccess) return res.status(403).json({ error: 'Access denied' });

  try {
    const result = await dbQuery(
      `UPDATE schools SET status = 'inactive', updated_at = NOW() WHERE id = $1 RETURNING id, status`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }
    res.json({ success: true, school: result.rows[0] });
  } catch (err) {
    console.error('Failed to deactivate school:', err);
    res.status(500).json({ error: 'Failed to deactivate school' });
  }
};

// ---------- School Memberships ----------
export const listSchoolMemberships = async (req, res) => {
  const { schoolId } = req.params;
  const canAccess = await canAccessSchool(schoolId, req);
  if (!canAccess) return res.status(403).json({ error: 'Access denied' });

  try {
    const result = await dbQuery(
      `
      SELECT sm.id, sm.school_id, sm.user_id, sm.role_scope, sm.status, sm.is_primary, sm.joined_at,
             u.full_name, u.email, u.role
      FROM school_memberships sm
      JOIN users u ON sm.user_id = u.id
      WHERE sm.school_id = $1
      ORDER BY sm.joined_at DESC
      `,
      [schoolId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to load school memberships:', err);
    res.status(500).json({ error: 'Failed to load school memberships' });
  }
};

export const listSchoolCourseAssignments = async (req, res) => {
  const { schoolId } = req.params;
  const canAccess = await canAccessSchool(schoolId, req);
  if (!canAccess) return res.status(403).json({ error: 'Access denied' });

  try {
    const school = await getSchoolContext(schoolId);
    if (!school) return res.status(404).json({ error: 'School not found' });

    await ensureCourseSchoolAssignmentsTable();
    await ensureClientCourseTitleOverridesTable();

    const result = await dbQuery(
      `
        SELECT
          csa.id,
          csa.school_id,
          csa.course_id,
          csa.assigned_at,
          csa.assigned_by,
          COALESCE(ccto.title, c.title) AS title,
          c.title AS original_title,
          c.description,
          c.published,
          c.created_at,
          c.created_by,
          u.full_name AS assigned_by_name
        FROM course_school_assignments csa
        JOIN courses c
          ON c.id = csa.course_id
        LEFT JOIN client_course_title_overrides ccto
          ON ccto.course_id = c.id
         AND ccto.client_id = $2
        LEFT JOIN users u
          ON u.id = csa.assigned_by
        WHERE csa.school_id = $1
        ORDER BY COALESCE(ccto.title, c.title) ASC, csa.assigned_at DESC
      `,
      [schoolId, school.client_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Failed to load school course assignments:', err);
    res.status(500).json({ error: 'Failed to load school course assignments' });
  }
};

export const assignCoursesToSchool = async (req, res) => {
  const { schoolId } = req.params;
  const canAccess = await canAccessSchool(schoolId, req);
  if (!canAccess) return res.status(403).json({ error: 'Access denied' });

  const inputIds = Array.isArray(req.body?.course_ids)
    ? req.body.course_ids
    : req.body?.course_id !== undefined
      ? [req.body.course_id]
      : [];
  const courseIds = Array.from(
    new Set(
      inputIds
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );

  if (courseIds.length === 0) {
    return res.status(400).json({ error: 'At least one valid course_id is required' });
  }

  const school = await getSchoolContext(schoolId);
  if (!school) return res.status(404).json({ error: 'School not found' });

  try {
    await ensureCourseSchoolAssignmentsTable();
    await ensureClientCourseTitleOverridesTable();
    const entitledPlatformCourseIds = school.client_id
      ? await listEntitledPlatformCourseIds(school.client_id)
      : [];

    const courseResult = await dbQuery(
      `
        SELECT id
        FROM courses
        WHERE id = ANY($1::int[])
          AND (
            client_id = $2
            OR (
              (client_id IS NULL OR client_id = ${PLATFORM_OWNER_CLIENT_ID})
              AND id = ANY($3::int[])
            )
          )
      `,
      [courseIds, school.client_id, entitledPlatformCourseIds]
    );

    const validCourseIds = courseResult.rows.map((row) => Number(row.id));
    const missingCourseIds = courseIds.filter((courseId) => !validCourseIds.includes(courseId));

    if (missingCourseIds.length > 0) {
      return res.status(400).json({
        error: 'Some courses do not belong to this client',
        course_ids: missingCourseIds,
      });
    }

    await dbQuery(
      `
        INSERT INTO course_school_assignments (course_id, school_id, assigned_by)
        SELECT course_id, $1, $2
        FROM unnest($3::int[]) AS course_id
        ON CONFLICT (course_id, school_id)
        DO UPDATE SET assigned_by = EXCLUDED.assigned_by, assigned_at = NOW()
      `,
      [schoolId, req.user?.id ?? null, validCourseIds]
    );

    const assignments = await dbQuery(
      `
        SELECT
          csa.id,
          csa.school_id,
          csa.course_id,
          csa.assigned_at,
          COALESCE(ccto.title, c.title) AS title,
          c.title AS original_title,
          c.description,
          c.published
        FROM course_school_assignments csa
        JOIN courses c
          ON c.id = csa.course_id
        LEFT JOIN client_course_title_overrides ccto
          ON ccto.course_id = c.id
         AND ccto.client_id = $3
        WHERE csa.school_id = $1
          AND csa.course_id = ANY($2::int[])
        ORDER BY COALESCE(ccto.title, c.title) ASC
      `,
      [schoolId, validCourseIds, school.client_id]
    );

    res.status(201).json({
      success: true,
      assignments: assignments.rows,
    });
  } catch (err) {
    console.error('Failed to assign courses to school:', err);
    res.status(500).json({ error: 'Failed to assign courses to school' });
  }
};

export const removeCourseAssignmentFromSchool = async (req, res) => {
  const { schoolId, courseId } = req.params;
  const canAccess = await canAccessSchool(schoolId, req);
  if (!canAccess) return res.status(403).json({ error: 'Access denied' });

  try {
    await ensureCourseSchoolAssignmentsTable();

    const result = await dbQuery(
      `
        DELETE FROM course_school_assignments
        WHERE school_id = $1
          AND course_id = $2
        RETURNING id
      `,
      [schoolId, courseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to remove school course assignment:', err);
    res.status(500).json({ error: 'Failed to remove school course assignment' });
  }
};

export const listSchoolExamAssignments = async (req, res) => {
  const { schoolId } = req.params;
  const canAccess = await canAccessSchool(schoolId, req);
  if (!canAccess) return res.status(403).json({ error: 'Access denied' });

  try {
    const school = await getSchoolContext(schoolId);
    if (!school) return res.status(404).json({ error: 'School not found' });

    await ensureExamSchoolAssignmentsTable();

    const result = await dbQuery(
      `
        SELECT
          esa.id,
          esa.school_id,
          esa.exam_id,
          esa.assigned_at,
          esa.assigned_by,
          e.title,
          e.description,
          e.status,
          e.client_id,
          e.program_id,
          e.start_datetime,
          e.end_datetime,
          u.full_name AS assigned_by_name
        FROM exam_school_assignments esa
        JOIN exams e
          ON e.id = esa.exam_id
        LEFT JOIN users u
          ON u.id = esa.assigned_by
        WHERE esa.school_id = $1
        ORDER BY e.title ASC, esa.assigned_at DESC
      `,
      [schoolId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Failed to load school exam assignments:', err);
    res.status(500).json({ error: 'Failed to load school exam assignments' });
  }
};

export const assignExamsToSchool = async (req, res) => {
  const { schoolId } = req.params;
  const canAccess = await canAccessSchool(schoolId, req);
  if (!canAccess) return res.status(403).json({ error: 'Access denied' });

  const inputIds = Array.isArray(req.body?.exam_ids)
    ? req.body.exam_ids
    : req.body?.exam_id !== undefined
      ? [req.body.exam_id]
      : [];
  const examIds = Array.from(
    new Set(
      inputIds
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );

  if (examIds.length === 0) {
    return res.status(400).json({ error: 'At least one valid exam_id is required' });
  }

  const school = await getSchoolContext(schoolId);
  if (!school) return res.status(404).json({ error: 'School not found' });

  try {
    await ensureExamSchoolAssignmentsTable();
    const entitledPlatformProgramIds = await listEntitledPlatformExamProgramIds(school.client_id);

    const examResult = await dbQuery(
      `
        SELECT id
        FROM exams
        WHERE id = ANY($1::int[])
          AND status = 'published'
          AND (school_id IS NULL OR school_id = $2)
          AND (
            client_id = $3
            OR (
              client_id = ${PLATFORM_OWNER_CLIENT_ID}
              AND program_id IS NOT NULL
              AND program_id = ANY($4::int[])
            )
          )
      `,
      [examIds, schoolId, school.client_id, entitledPlatformProgramIds]
    );

    const validExamIds = examResult.rows.map((row) => Number(row.id));
    const missingExamIds = examIds.filter((examId) => !validExamIds.includes(examId));

    if (missingExamIds.length > 0) {
      return res.status(400).json({
        error: 'Some exams are not published or cannot be assigned to this school',
        exam_ids: missingExamIds,
      });
    }

    await dbQuery(
      `
        INSERT INTO exam_school_assignments (exam_id, school_id, assigned_by)
        SELECT exam_id, $1, $2
        FROM unnest($3::int[]) AS exam_id
        ON CONFLICT (exam_id, school_id)
        DO UPDATE SET assigned_by = EXCLUDED.assigned_by, assigned_at = NOW()
      `,
      [schoolId, req.user?.id ?? null, validExamIds]
    );

    const assignments = await dbQuery(
      `
        SELECT
          esa.id,
          esa.school_id,
          esa.exam_id,
          esa.assigned_at,
          e.title,
          e.description,
          e.status,
          e.client_id,
          e.program_id,
          e.start_datetime,
          e.end_datetime
        FROM exam_school_assignments esa
        JOIN exams e
          ON e.id = esa.exam_id
        WHERE esa.school_id = $1
          AND esa.exam_id = ANY($2::int[])
        ORDER BY e.title ASC
      `,
      [schoolId, validExamIds]
    );

    res.status(201).json({
      success: true,
      assignments: assignments.rows,
    });
  } catch (err) {
    console.error('Failed to assign exams to school:', err);
    res.status(500).json({ error: 'Failed to assign exams to school' });
  }
};

export const removeExamAssignmentFromSchool = async (req, res) => {
  const { schoolId, examId } = req.params;
  const canAccess = await canAccessSchool(schoolId, req);
  if (!canAccess) return res.status(403).json({ error: 'Access denied' });

  try {
    await ensureExamSchoolAssignmentsTable();

    const result = await dbQuery(
      `
        DELETE FROM exam_school_assignments
        WHERE school_id = $1
          AND exam_id = $2
        RETURNING id
      `,
      [schoolId, examId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to remove school exam assignment:', err);
    res.status(500).json({ error: 'Failed to remove school exam assignment' });
  }
};

export const listSchoolQuestionBankAssignments = async (req, res) => {
  const { schoolId } = req.params;
  const canAccess = await canAccessSchool(schoolId, req);
  if (!canAccess) return res.status(403).json({ error: 'Access denied' });

  try {
    await ensureQuestionBankSchoolAssignmentsTable();

    const result = await dbQuery(
      `
        SELECT
          qbsa.id,
          qbsa.school_id,
          qbsa.program_id,
          qbsa.assigned_at,
          qbsa.assigned_by,
          p.name,
          p.code,
          p.client_id,
          p.school_id AS program_school_id,
          p.is_active,
          u.full_name AS assigned_by_name
        FROM question_bank_school_assignments qbsa
        JOIN programs p
          ON p.id = qbsa.program_id
        LEFT JOIN users u
          ON u.id = qbsa.assigned_by
        WHERE qbsa.school_id = $1
        ORDER BY p.name ASC, qbsa.assigned_at DESC
      `,
      [schoolId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Failed to load school question bank assignments:', err);
    res.status(500).json({ error: 'Failed to load school question bank assignments' });
  }
};

export const assignQuestionBankProgramsToSchool = async (req, res) => {
  const { schoolId } = req.params;
  const canAccess = await canAccessSchool(schoolId, req);
  if (!canAccess) return res.status(403).json({ error: 'Access denied' });

  const inputIds = Array.isArray(req.body?.program_ids)
    ? req.body.program_ids
    : req.body?.program_id !== undefined
      ? [req.body.program_id]
      : [];
  const programIds = Array.from(
    new Set(
      inputIds
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );

  if (programIds.length === 0) {
    return res.status(400).json({ error: 'At least one valid program_id is required' });
  }

  const school = await getSchoolContext(schoolId);
  if (!school) return res.status(404).json({ error: 'School not found' });

  try {
    await ensureQuestionBankSchoolAssignmentsTable();
    const entitledPlatformProgramIds = await listEntitledPlatformQuestionBankProgramIds(school.client_id);

    const programResult = await dbQuery(
      `
        SELECT id
        FROM programs
        WHERE id = ANY($1::int[])
          AND is_active = true
          AND (
            (client_id = $2 AND (school_id IS NULL OR school_id = $3))
            OR (
              client_id = ${PLATFORM_OWNER_CLIENT_ID}
              AND school_id IS NULL
              AND id = ANY($4::int[])
            )
          )
      `,
      [programIds, school.client_id, schoolId, entitledPlatformProgramIds]
    );

    const validProgramIds = programResult.rows.map((row) => Number(row.id));
    const missingProgramIds = programIds.filter((programId) => !validProgramIds.includes(programId));

    if (missingProgramIds.length > 0) {
      return res.status(400).json({
        error: 'Some question bank programs cannot be assigned to this school',
        program_ids: missingProgramIds,
      });
    }

    await dbQuery(
      `
        INSERT INTO question_bank_school_assignments (program_id, school_id, assigned_by)
        SELECT program_id, $1, $2
        FROM unnest($3::int[]) AS program_id
        ON CONFLICT (program_id, school_id)
        DO UPDATE SET assigned_by = EXCLUDED.assigned_by, assigned_at = NOW()
      `,
      [schoolId, req.user?.id ?? null, validProgramIds]
    );

    const assignments = await dbQuery(
      `
        SELECT
          qbsa.id,
          qbsa.school_id,
          qbsa.program_id,
          qbsa.assigned_at,
          p.name,
          p.code,
          p.client_id,
          p.school_id AS program_school_id,
          p.is_active
        FROM question_bank_school_assignments qbsa
        JOIN programs p
          ON p.id = qbsa.program_id
        WHERE qbsa.school_id = $1
          AND qbsa.program_id = ANY($2::int[])
        ORDER BY p.name ASC
      `,
      [schoolId, validProgramIds]
    );

    res.status(201).json({
      success: true,
      assignments: assignments.rows,
    });
  } catch (err) {
    console.error('Failed to assign question bank programs to school:', err);
    res.status(500).json({ error: 'Failed to assign question bank programs to school' });
  }
};

export const removeQuestionBankAssignmentFromSchool = async (req, res) => {
  const { schoolId, programId } = req.params;
  const canAccess = await canAccessSchool(schoolId, req);
  if (!canAccess) return res.status(403).json({ error: 'Access denied' });

  try {
    await ensureQuestionBankSchoolAssignmentsTable();

    const result = await dbQuery(
      `
        DELETE FROM question_bank_school_assignments
        WHERE school_id = $1
          AND program_id = $2
        RETURNING id
      `,
      [schoolId, programId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to remove school question bank assignment:', err);
    res.status(500).json({ error: 'Failed to remove school question bank assignment' });
  }
};

export const addSchoolMembership = async (req, res) => {
  const { schoolId } = req.params;
  const { user_id, role_scope, is_primary } = req.body;

  if (!user_id || !role_scope) {
    return res.status(400).json({ error: 'user_id and role_scope are required' });
  }
  if (!VALID_ROLE_SCOPES.includes(role_scope)) {
    return res.status(400).json({ error: 'Invalid role_scope' });
  }

  const canAccess = await canAccessSchool(schoolId, req);
  if (!canAccess) return res.status(403).json({ error: 'Access denied' });

  const school = await getSchoolContext(schoolId);
  if (!school) return res.status(404).json({ error: 'School not found' });

  const userResult = await dbQuery(
    `SELECT id, client_id, role FROM users WHERE id = $1`,
    [user_id]
  );
  if (userResult.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (userResult.rows[0].client_id !== school.client_id) {
    return res.status(400).json({ error: 'User does not belong to this client' });
  }

  try {
    const result = await dbQuery(
      `
      INSERT INTO school_memberships (school_id, user_id, role_scope, is_primary, status)
      VALUES ($1, $2, $3, $4, 'active')
      ON CONFLICT (school_id, user_id)
      DO UPDATE SET role_scope = EXCLUDED.role_scope, is_primary = EXCLUDED.is_primary, status = 'active', updated_at = NOW()
      RETURNING *
      `,
      [schoolId, user_id, role_scope, Boolean(is_primary)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to add school membership:', err);
    res.status(500).json({ error: 'Failed to add school membership' });
  }
};

export const removeSchoolMembership = async (req, res) => {
  const { schoolId, userId } = req.params;
  const canAccess = await canAccessSchool(schoolId, req);
  if (!canAccess) return res.status(403).json({ error: 'Access denied' });

  try {
    const result = await dbQuery(
      `DELETE FROM school_memberships WHERE school_id = $1 AND user_id = $2 RETURNING id`,
      [schoolId, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Membership not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to remove school membership:', err);
    res.status(500).json({ error: 'Failed to remove school membership' });
  }
};

// ---------- Batches ----------
export const listBatches = async (req, res) => {
  const role = req.user?.role;
  const userId = req.user?.id;
  const clientId = req.user?.client_id;
  const schoolId = req.query.school_id ? parseInt(req.query.school_id, 10) : null;

  try {
    let query = `
      SELECT b.*
      FROM batches b
    `;
    const params = [];

    if (role === 'teacher' || role === 'student') {
      query += `
        JOIN batch_members bm
          ON bm.batch_id = b.id
         AND bm.user_id = $1
      `;
      params.push(userId);
    } else if (role === 'school_owner') {
      query += `
        JOIN school_memberships sm
          ON sm.school_id = b.school_id
         AND sm.user_id = $1
         AND sm.role_scope IN ('school_owner', 'admin')
         AND sm.status = 'active'
      `;
      params.push(userId);
    }

    if (clientId) {
      query += ` WHERE b.client_id = $${params.length + 1}`;
      params.push(clientId);
      if (schoolId) {
        query += ` AND b.school_id = $${params.length + 1}`;
        params.push(schoolId);
      }
    } else if (schoolId) {
      query += ` WHERE b.school_id = $${params.length + 1}`;
      params.push(schoolId);
    }

    query += ` ORDER BY b.created_at DESC`;

    const result = await dbQuery(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to load batches:', err);
    res.status(500).json({ error: 'Failed to load batches' });
  }
};

export const createBatch = async (req, res) => {
  const { school_id, name, code, metadata } = req.body;
  if (!school_id || !name?.trim()) {
    return res.status(400).json({ error: 'school_id and name are required' });
  }

  const canAccess = await canAccessSchool(school_id, req);
  if (!canAccess) return res.status(403).json({ error: 'Access denied' });

  const school = await getSchoolContext(school_id);
  if (!school) return res.status(404).json({ error: 'School not found' });

  try {
    const result = await dbQuery(
      `
      INSERT INTO batches (client_id, school_id, name, code, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [school.client_id, school_id, name.trim(), code || null, metadata || {}]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to create batch:', err);
    res.status(500).json({ error: 'Failed to create batch' });
  }
};

export const updateBatch = async (req, res) => {
  const { id } = req.params;
  const canAccess = await canAccessBatch(id, req);
  if (!canAccess) return res.status(403).json({ error: 'Access denied' });

  const { name, code, metadata, is_active } = req.body;
  try {
    const result = await dbQuery(
      `
      UPDATE batches
      SET name = COALESCE($1, name),
          code = COALESCE($2, code),
          metadata = COALESCE($3, metadata),
          is_active = COALESCE($4, is_active),
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
      `,
      [
        name?.trim() || null,
        code || null,
        metadata || null,
        typeof is_active === 'boolean' ? is_active : null,
        id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to update batch:', err);
    res.status(500).json({ error: 'Failed to update batch' });
  }
};

export const deactivateBatch = async (req, res) => {
  const { id } = req.params;
  const canAccess = await canAccessBatch(id, req);
  if (!canAccess) return res.status(403).json({ error: 'Access denied' });

  try {
    const result = await dbQuery(
      `UPDATE batches SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id, is_active`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    res.json({ success: true, batch: result.rows[0] });
  } catch (err) {
    console.error('Failed to deactivate batch:', err);
    res.status(500).json({ error: 'Failed to deactivate batch' });
  }
};

// ---------- Batch Members ----------
export const listBatchMembers = async (req, res) => {
  const { batchId } = req.params;
  const canAccess = await canAccessBatch(batchId, req);
  if (!canAccess) return res.status(403).json({ error: 'Access denied' });

  try {
    const result = await dbQuery(
      `
      SELECT bm.id, bm.batch_id, bm.user_id, bm.is_primary, bm.joined_at,
             u.full_name, u.email, u.role
      FROM batch_members bm
      JOIN users u ON bm.user_id = u.id
      WHERE bm.batch_id = $1
      ORDER BY bm.joined_at DESC
      `,
      [batchId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to load batch members:', err);
    res.status(500).json({ error: 'Failed to load batch members' });
  }
};

export const addBatchMember = async (req, res) => {
  const { batchId } = req.params;
  const { user_id, is_primary } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  const canAccess = await canAccessBatch(batchId, req);
  if (!canAccess) return res.status(403).json({ error: 'Access denied' });

  const batch = await getBatchContext(batchId);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });

  const userResult = await dbQuery(
    `SELECT id, client_id, role FROM users WHERE id = $1`,
    [user_id]
  );
  if (userResult.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (userResult.rows[0].client_id !== batch.client_id) {
    return res.status(400).json({ error: 'User does not belong to this client' });
  }

  try {
    const result = await dbQuery(
      `
      INSERT INTO batch_members (batch_id, user_id, is_primary)
      VALUES ($1, $2, $3)
      ON CONFLICT (batch_id, user_id)
      DO UPDATE SET is_primary = EXCLUDED.is_primary
      RETURNING *
      `,
      [batchId, user_id, Boolean(is_primary)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to add batch member:', err);
    res.status(500).json({ error: 'Failed to add batch member' });
  }
};

export const removeBatchMember = async (req, res) => {
  const { batchId, userId } = req.params;
  const canAccess = await canAccessBatch(batchId, req);
  if (!canAccess) return res.status(403).json({ error: 'Access denied' });

  try {
    const result = await dbQuery(
      `DELETE FROM batch_members WHERE batch_id = $1 AND user_id = $2 RETURNING id`,
      [batchId, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Batch member not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to remove batch member:', err);
    res.status(500).json({ error: 'Failed to remove batch member' });
  }
};

// ---------- Role Permissions ----------
export const listRolePermissions = async (req, res) => {
  try {
    const data = await rolePermissionsService.listRolePermissions({ user: req.user, query: req.query });
    res.json(data);
  } catch (err) {
    handleServiceError(res, err, 'Failed to load role permissions');
  }
};

export const upsertRolePermission = async (req, res) => {
  try {
    const data = await rolePermissionsService.upsertRolePermission({ user: req.user, body: req.body });
    res.status(201).json(data);
  } catch (err) {
    handleServiceError(res, err, 'Failed to upsert role permission');
  }
};

  export const deleteRolePermission = async (req, res) => {
    try {
      const data = await rolePermissionsService.deleteRolePermission({ user: req.user, params: req.params });
      res.json(data);
    } catch (err) {
      handleServiceError(res, err, 'Failed to delete role permission');
    }
  };

  // ---------- User Permissions ----------
  export const listUserPermissions = async (req, res) => {
    try {
      const data = await userPermissionsService.listUserPermissions({ user: req.user, query: req.query });
      res.json(data);
    } catch (err) {
      handleServiceError(res, err, 'Failed to load user permissions');
    }
  };

  export const upsertUserPermission = async (req, res) => {
    try {
      const data = await userPermissionsService.upsertUserPermission({ user: req.user, body: req.body });
      res.status(201).json(data);
    } catch (err) {
      handleServiceError(res, err, 'Failed to upsert user permission');
    }
  };

  export const deleteUserPermission = async (req, res) => {
    try {
      const data = await userPermissionsService.deleteUserPermission({ user: req.user, params: req.params });
      res.json(data);
    } catch (err) {
      handleServiceError(res, err, 'Failed to delete user permission');
    }
  };

// ---------- Users (Admin create/update) ----------
export const createUser = async (req, res) => {
  const { email, full_name, password, role, client_id, user_id, school_id } = req.body;
  const requesterRole = req.user?.role;
  const requesterClientId = req.user?.client_id;

  if (!email || !full_name || !password || !role) {
    return res.status(400).json({ error: 'email, full_name, password and role are required' });
  }
  if (!VALID_USER_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  let targetClientId = requesterClientId;
  if (requesterRole === 'super_admin') {
    targetClientId = client_id ? Number(client_id) : null;
  }

  if (requesterRole !== 'super_admin') {
    if (!targetClientId) {
      return res.status(400).json({ error: 'client_id is required' });
    }
    if (['super_admin', 'content_authorizer'].includes(role)) {
      return res.status(403).json({ error: 'Not allowed to create this role' });
    }
    if (requesterRole === 'school_owner' && !['teacher', 'student'].includes(role)) {
      return res.status(403).json({ error: 'School owners can only create teachers or students' });
    }
    if (requesterRole === 'school_owner' && !school_id) {
      return res.status(400).json({ error: 'school_id is required for school owners' });
    }
  }

  try {
    const hashed = await hashPassword(password);
    const result = await dbQuery(
      `
      INSERT INTO users (email, full_name, password_hash, role, client_id, user_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, full_name, role, client_id, user_id
      `,
      [email, full_name, hashed, role, targetClientId, user_id || null]
    );

    const createdUser = result.rows[0];
    if (school_id) {
      const school = await getSchoolContext(school_id);
      if (!school || school.client_id !== targetClientId) {
        return res.status(400).json({ error: 'Invalid school_id for this client' });
      }
      if (requesterRole === 'school_owner') {
        const ownsSchool = await isSchoolOwnerForSchool(school_id, req.user?.id);
        if (!ownsSchool) {
          return res.status(403).json({ error: 'Access denied to this school' });
        }
      }
      const role_scope = role === 'school_owner' ? 'school_owner' : role === 'client_admin' ? 'admin' : role;
      await dbQuery(
        `
        INSERT INTO school_memberships (school_id, user_id, role_scope, status)
        VALUES ($1, $2, $3, 'active')
        ON CONFLICT (school_id, user_id)
        DO UPDATE SET role_scope = EXCLUDED.role_scope, status = 'active', updated_at = NOW()
        `,
        [school_id, createdUser.id, role_scope]
      );
    }

    res.status(201).json(createdUser);
  } catch (err) {
    console.error('Failed to create user:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { full_name, role, is_active, user_id } = req.body;
  const requesterRole = req.user?.role;
  const requesterClientId = req.user?.client_id;

  if (role && !VALID_USER_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (requesterRole !== 'super_admin' && ['super_admin', 'content_authorizer'].includes(role)) {
    return res.status(403).json({ error: 'Not allowed to assign this role' });
  }

  try {
    if (requesterRole !== 'super_admin') {
      const target = await dbQuery(
        `SELECT client_id FROM users WHERE id = $1`,
        [id]
      );
      if (target.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      if (target.rows[0].client_id !== requesterClientId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const result = await dbQuery(
      `
      UPDATE users
      SET full_name = COALESCE($1, full_name),
          role = COALESCE($2, role),
          is_active = COALESCE($3, is_active),
          user_id = COALESCE($4, user_id)
      WHERE id = $5
      RETURNING id, email, full_name, role, client_id, user_id, is_active
      `,
      [
        full_name?.trim() || null,
        role || null,
        typeof is_active === 'boolean' ? is_active : null,
        user_id || null,
        id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to update user:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deactivateUser = async (req, res) => {
  const { id } = req.params;
  const requesterRole = req.user?.role;
  const requesterClientId = req.user?.client_id;

  try {
    if (requesterRole !== 'super_admin') {
      const target = await dbQuery(
        `SELECT client_id FROM users WHERE id = $1`,
        [id]
      );
      if (target.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      if (target.rows[0].client_id !== requesterClientId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const result = await dbQuery(
      `UPDATE users SET is_active = false WHERE id = $1 RETURNING id, is_active`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Failed to deactivate user:', err);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
};


