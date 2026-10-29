import { query as dbQuery, getClient } from "../repositories/db.repository.js"; // or your db connection
import AdmZip from 'adm-zip';
import { parseStringPromise } from 'xml2js';
import { getMergedCourseContentRows } from "./clientContent.service.js";
import { ensureCourseActionAccess, getRequestCourseScope } from "./courseShared.service.js";

let contentMetadataColumnEnsured = false;
const VALID_ENROLLMENT_ROLES = new Set(['student', 'teacher']);

const hasCourseAccess = async (courseId, req) => {
  const access = await ensureCourseActionAccess({
    courseId,
    req,
    action: 'enroll',
    scope: getRequestCourseScope(req),
  });
  return access.ok;
};

const ensureContentMetadataColumn = async () => {
  if (contentMetadataColumnEnsured) return;
  await dbQuery(`
    ALTER TABLE content_items
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB
  `);
  contentMetadataColumnEnsured = true;
};

const createEnrollmentError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getRequesterScope = (req) => {
  const requesterClientId = req.user?.client_id;
  const requesterRole = req.user?.role;
  return {
    requesterClientId,
    requesterRole,
    shouldScope: Boolean(requesterClientId) && requesterRole !== 'super_admin',
  };
};

const normalizeEnrollmentRole = (role) => {
  if (typeof role !== 'string') return null;
  const normalizedRole = role.trim().toLowerCase();
  return VALID_ENROLLMENT_ROLES.has(normalizedRole) ? normalizedRole : null;
};

const normalizeEmail = (email) => (typeof email === 'string' ? email.trim() : '');

const isLikelyEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const extractCellText = (cell, sharedStrings) => {
  if (!cell) return '';

  if (cell.is?.[0]) {
    return String(
      cell.is[0].t?.join('') ??
        cell.is[0].r?.map((item) => item.t?.join('') ?? '').join('') ??
        ''
    ).trim();
  }

  const rawValue = cell.v?.[0];
  if (rawValue == null) return '';

  if (cell.$?.t === 's') {
    const sharedIndex = Number(rawValue);
    return String(sharedStrings[sharedIndex] ?? '').trim();
  }

  return String(rawValue).trim();
};

const getColumnNameFromCellRef = (cellRef = '') => {
  const match = String(cellRef).match(/[A-Z]+/i);
  return match ? match[0].toUpperCase() : '';
};

const parseCsvEnrollmentRows = (buffer) => {
  const text = buffer.toString('utf8').replace(/^\ufeff/, '');
  const lines = text.split(/\r?\n/);
  const nonEmptyLines = lines
    .map((line, index) => ({ line: line.trim(), rowNumber: index + 1 }))
    .filter((entry) => entry.line.length > 0);

  if (nonEmptyLines.length === 0) {
    throw createEnrollmentError(400, 'The uploaded file is empty.');
  }

  const headerCells = nonEmptyLines[0].line.split(',').map((cell) => cell.trim().toLowerCase());
  const emailColumnIndex = headerCells.findIndex((cell) => cell === 'email');
  if (emailColumnIndex === -1) {
    throw createEnrollmentError(400, 'The upload template must include an "email" column.');
  }

  return nonEmptyLines.slice(1).map(({ line, rowNumber }) => {
    const cells = line.split(',').map((cell) => cell.trim());
    return {
      rowNumber,
      email: normalizeEmail(cells[emailColumnIndex] ?? ''),
    };
  });
};

const parseXlsxEnrollmentRows = async (buffer) => {
  const zip = new AdmZip(buffer);
  const worksheetEntry = zip
    .getEntries()
    .filter((entry) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(entry.entryName))
    .sort((a, b) => a.entryName.localeCompare(b.entryName))[0];

  if (!worksheetEntry) {
    throw createEnrollmentError(400, 'The uploaded workbook does not contain a readable worksheet.');
  }

  const sharedStringsEntry = zip.getEntry('xl/sharedStrings.xml');
  const sharedStrings = [];
  if (sharedStringsEntry) {
    const sharedStringsXml = await parseStringPromise(sharedStringsEntry.getData().toString('utf8'));
    const stringItems = sharedStringsXml?.sst?.si ?? [];
    for (const item of stringItems) {
      const value = item?.t?.join('') ?? item?.r?.map((part) => part.t?.join('') ?? '').join('') ?? '';
      sharedStrings.push(String(value).trim());
    }
  }

  const worksheetXml = await parseStringPromise(worksheetEntry.getData().toString('utf8'));
  const rows = worksheetXml?.worksheet?.sheetData?.[0]?.row ?? [];
  if (rows.length === 0) {
    throw createEnrollmentError(400, 'The uploaded workbook is empty.');
  }

  const headerCells = rows[0]?.c ?? [];
  const emailColumn = headerCells.find((cell) => extractCellText(cell, sharedStrings).toLowerCase() === 'email');
  const emailColumnName = getColumnNameFromCellRef(emailColumn?.$?.r);

  if (!emailColumnName) {
    throw createEnrollmentError(400, 'The upload template must include an "email" column.');
  }

  return rows.slice(1).map((row) => {
    const cells = row?.c ?? [];
    const emailCell = cells.find((cell) => getColumnNameFromCellRef(cell?.$?.r) === emailColumnName);
    return {
      rowNumber: Number(row?.$?.r ?? 0) || 0,
      email: normalizeEmail(extractCellText(emailCell, sharedStrings)),
    };
  });
};

export const parseBulkEnrollmentFile = async ({ buffer, originalName = '' }) => {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw createEnrollmentError(400, 'A non-empty file is required for bulk enrollment.');
  }

  const fileExtension = String(originalName).split('.').pop()?.toLowerCase();
  if (fileExtension === 'csv') {
    return parseCsvEnrollmentRows(buffer);
  }

  if (fileExtension === 'xlsx') {
    return parseXlsxEnrollmentRows(buffer);
  }

  throw createEnrollmentError(400, 'Unsupported file type. Please upload a CSV or XLSX file.');
};

const enrollEmailWithClient = async ({ client, courseId, email, role, req }) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw createEnrollmentError(400, 'Valid email is required');
  }

  const normalizedRole = normalizeEnrollmentRole(role);
  if (!normalizedRole) {
    throw createEnrollmentError(400, 'Role must be "student" or "teacher"');
  }

  const userResult = await client.query(
    'SELECT id, client_id FROM users WHERE LOWER(email) = LOWER($1)',
    [normalizedEmail]
  );

  if (userResult.rows.length === 0) {
    throw createEnrollmentError(400, 'User not found. Please ensure the user exists.');
  }

  const { id: userId, client_id: userClientId } = userResult.rows[0];
  const { requesterClientId, shouldScope } = getRequesterScope(req);
  if (shouldScope && userClientId !== requesterClientId) {
    throw createEnrollmentError(403, 'User does not belong to this client.');
  }

  const existingEnrollment = await client.query(
    'SELECT 1 FROM enrollments WHERE user_id = $1 AND course_id = $2',
    [userId, courseId]
  );

  if (existingEnrollment.rows.length > 0) {
    throw createEnrollmentError(400, 'User is already enrolled in this course.');
  }

  await client.query(
    `
      INSERT INTO enrollments (user_id, course_id, role)
      VALUES ($1, $2, $3)
    `,
    [userId, courseId, normalizedRole]
  );

  return {
    userId,
    email: normalizedEmail,
    role: normalizedRole,
  };
};

// POST /admin/courses/:courseId/enrollments
export const enrollUserByEmail = async (req, res) => {
  const { courseId } = req.params;
  const { email, role } = req.body;

  // Validate input
  if (!normalizeEmail(email)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  const normalizedRole = normalizeEnrollmentRole(role);
  if (!normalizedRole) {
    return res.status(400).json({ error: 'Role must be "student" or "teacher"' });
  }

  const client = await getClient();

  try {
    const allowed = await hasCourseAccess(courseId, req);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await client.query('BEGIN');
    const enrollment = await enrollEmailWithClient({
      client,
      courseId,
      email,
      role: normalizedRole,
      req,
    });

    await client.query('COMMIT');

    res.status(201).json({
      message: `${normalizedRole === 'student' ? 'Student' : 'Teacher'} enrolled successfully`,
      data: { userId: enrollment.userId, courseId, role: normalizedRole }
    });

  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback failures
    }
    console.error('Enrollment error:', err);

    if (err?.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    res.status(500).json({ error: 'Failed to enroll user. Please try again.' });
  } finally {
    client.release();
  }
};

export const enrollUsersBulk = async (req, res) => {
  const { courseId } = req.params;
  const normalizedRole = normalizeEnrollmentRole(req.body?.role);

  if (!normalizedRole) {
    return res.status(400).json({ error: 'Role must be "student" or "teacher"' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'A CSV or XLSX file is required for bulk enrollment.' });
  }

  let rows;
  try {
    rows = await parseBulkEnrollmentFile({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
    });
  } catch (err) {
    if (err?.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error('Bulk enrollment parse error:', err);
    return res.status(400).json({ error: 'Failed to read the uploaded file.' });
  }

  const meaningfulRows = rows.filter((row) => row.email);
  if (meaningfulRows.length === 0) {
    return res.status(400).json({ error: 'The upload file does not contain any email rows.' });
  }

  const client = await getClient();
  try {
    const allowed = await hasCourseAccess(courseId, req);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const results = {
      total: meaningfulRows.length,
      successCount: 0,
      failureCount: 0,
      successes: [],
      failures: [],
    };
    const seenEmails = new Set();

    for (const row of meaningfulRows) {
      const normalizedEmail = normalizeEmail(row.email).toLowerCase();
      if (!isLikelyEmail(normalizedEmail)) {
        results.failureCount += 1;
        results.failures.push({
          row: row.rowNumber,
          email: row.email,
          error: 'Invalid email format.',
        });
        continue;
      }

      if (seenEmails.has(normalizedEmail)) {
        results.failureCount += 1;
        results.failures.push({
          row: row.rowNumber,
          email: row.email,
          error: 'Duplicate email in upload file.',
        });
        continue;
      }
      seenEmails.add(normalizedEmail);

      await client.query('BEGIN');
      try {
        const enrollment = await enrollEmailWithClient({
          client,
          courseId,
          email: row.email,
          role: normalizedRole,
          req,
        });
        await client.query('COMMIT');
        results.successCount += 1;
        results.successes.push({
          row: row.rowNumber,
          email: enrollment.email,
          user_id: enrollment.userId,
        });
      } catch (err) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // ignore rollback failures
        }
        results.failureCount += 1;
        results.failures.push({
          row: row.rowNumber,
          email: row.email,
          error: err?.message || 'Failed to enroll user.',
        });
      }
    }

    const responseMessage =
      results.failureCount === 0
        ? `Successfully enrolled ${results.successCount} ${normalizedRole}${results.successCount === 1 ? '' : 's'}.`
        : `Enrolled ${results.successCount} ${normalizedRole}${results.successCount === 1 ? '' : 's'} and found ${results.failureCount} issue${results.failureCount === 1 ? '' : 's'}.`;

    return res.status(results.successCount > 0 ? 200 : 400).json({
      message: responseMessage,
      role: normalizedRole,
      ...results,
    });
  } catch (err) {
    console.error('Bulk enrollment error:', err);
    return res.status(500).json({ error: 'Failed to process bulk enrollment.' });
  } finally {
    client.release();
  }
};

// GET /admin/courses/:courseId/enrollments
export const getCourseEnrollments = async (req, res) => {
  const { courseId } = req.params;
  const courseIdInt = parseInt(courseId, 10);
  if (isNaN(courseIdInt)) {
    return res.status(400).json({ error: 'Invalid course ID' });
  }

  try {
    const allowed = await hasCourseAccess(courseIdInt, req);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const requesterClientId = req.user?.client_id;
    const requesterRole = req.user?.role;
    const shouldScope = Boolean(requesterClientId) && requesterRole !== 'super_admin';

    const query = `
      SELECT 
        u.id AS user_id,
        u.full_name AS name,
        u.email,
        e.role,
        e.enrolled_at
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      WHERE e.course_id = $1
      ${shouldScope ? 'AND u.client_id = $2' : ''}
      ORDER BY e.role, u.email
    `;
    const params = shouldScope ? [courseIdInt, requesterClientId] : [courseIdInt];
    const result = await dbQuery(query, params);

    res.json(result.rows);
  } catch (err) {
    console.error('🚨 FULL ERROR DETAILS 🚨', {
    message: err.message,
    code: err.code,           // e.g., '42703' = column not found
    detail: err.detail,
    hint: err.hint,
    position: err.position,
    internalPosition: err.internalPosition,
    internalQuery: err.internalQuery,
    where: err.where,
    schema: err.schema,
    table: err.table,
    column: err.column,
    dataType: err.dataType,
    constraint: err.constraint,
    file: err.file,
    line: err.line,
    routine: err.routine,
    stack: err.stack
  });

  res.status(500).json({ 
    error: 'Failed to load enrollments', 
    });
  }
};

// For students: only published courses & enrolled users
export const getStudentCourse = async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.id;
  const userRole = req.user?.role;

  try {
    await ensureContentMetadataColumn();

    // 1. Verify enrollment (student must be published, teacher can view unpublished)
    let enrollment;
    if (userRole === 'teacher') {
      enrollment = await dbQuery(
        `
          SELECT e.role, c.published, c.title, c.description
          FROM enrollments e
          JOIN courses c ON e.course_id = c.id
          WHERE e.user_id = $1 AND e.course_id = $2 AND e.role = 'teacher'
        `,
        [userId, courseId]
      );
    } else {
      enrollment = await dbQuery(
        `
          SELECT e.role, c.published, c.title, c.description
          FROM enrollments e
          JOIN courses c ON e.course_id = c.id
          WHERE e.user_id = $1 AND e.course_id = $2 AND e.role = 'student' AND c.published = true
        `,
        [userId, courseId]
      );
    }

    if (enrollment.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied or course not published' });
    }

    const course = enrollment.rows[0];

      const mergedContent = await getMergedCourseContentRows({
        courseId: Number(courseId),
        includeAttemptStatus: true,
        userId,
      });

      const normalizeStudentContentItem = (item) => ({
        id: item.id,
        title: item.title,
        item_type: item.item_type,
        content_url: item.content_url,
        metadata: item.metadata ?? {},
        completion_status: item.completion_status,
        is_linked_content: item.is_linked_content,
        linked_content_id: item.linked_content_id,
        download_allowed: item.download_allowed,
      });

      const folders = mergedContent
        .filter((item) => item.item_type === 'folder' && item.parent_id === null)
        .map((item) => ({
          id: item.id,
          title: item.title,
          order_index: item.order_index,
        }));

      const chaptersWithContent = folders.map((folder) => ({
        id: folder.id,
        title: folder.title,
        position: folder.order_index || 0,
        content_items: mergedContent
          .filter((item) => item.parent_id === folder.id && item.item_type !== 'folder')
          .map(normalizeStudentContentItem),
        topics: mergedContent
          .filter((item) => item.parent_id === folder.id && item.item_type === 'folder')
          .map((topic) => ({
            id: topic.id,
            title: topic.title,
            position: topic.order_index || 0,
            content_items: mergedContent
              .filter((item) => item.parent_id === topic.id && item.item_type !== 'folder')
              .map(normalizeStudentContentItem),
          }))
          .sort((a, b) => a.position - b.position),
      }));

      const orphanedItems = mergedContent.filter(
        (item) => item.parent_id === null && item.item_type !== 'folder'
      );

      if (orphanedItems.length > 0) {
        chaptersWithContent.push({
          id: -1,
          title: 'General Content',
          position: -1,
          content_items: orphanedItems.map(normalizeStudentContentItem),
          topics: [],
        });
      }

      chaptersWithContent.sort((a, b) => a.position - b.position);

    res.json({
      id: parseInt(courseId, 10),
      title: course.title,
      description: course.description,
      chapters: chaptersWithContent,
    });
  } catch (err) {
    console.error('Error loading student course:', err);
    res.status(500).json({ error: 'Failed to load course content' });
  }
};
// ✅ ADD THIS FUNCTION — you don't have it yet!
export const getStudentEnrolledCourses = async (req, res) => {
  try {
    const userId = req.user.id; // Make sure your auth middleware sets req.user
    const userRole = req.user?.role;

    let result;
    if (userRole === 'teacher') {
      result = await dbQuery(
        `
          SELECT 
            c.id,
            c.title,
            c.description,
            e.enrolled_at
          FROM enrollments e
          JOIN courses c ON e.course_id = c.id
          WHERE e.user_id = $1 
            AND e.role = 'teacher'
          ORDER BY e.enrolled_at DESC
        `,
        [userId]
      );
    } else {
      result = await dbQuery(
        `
          SELECT 
            c.id,
            c.title,
            c.description,
            e.enrolled_at
          FROM enrollments e
          JOIN courses c ON e.course_id = c.id
          WHERE e.user_id = $1 
            AND e.role = 'student'
            AND c.published = true
          ORDER BY e.enrolled_at DESC
        `,
        [userId]
      );
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching enrolled courses:', err);
    res.status(500).json({ error: 'Failed to load your courses' });
  }
};

// For teachers: can view even unpublished courses
export const getTeacherCourse = async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.id;

  try {
    const enrollment = await dbQuery(
      `
        SELECT e.role, c.title, c.description
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.user_id = $1 AND e.course_id = $2 AND e.role = 'teacher'
      `,
      [userId, courseId]
    );

    if (enrollment.rows.length === 0) {
      return res.status(403).json({ error: 'You are not teaching this course' });
    }

    const course = enrollment.rows[0];

    // Same chapter/content loading logic
    const chapters = await dbQuery(
      `SELECT id, title, position FROM chapters WHERE course_id = $1 ORDER BY position`,
      [courseId]
    );

    const chaptersWithContent = [];
    for (const chapter of chapters.rows) {
      const contentItems = await dbQuery(
        `SELECT id, title, type, content_url, position FROM content_items WHERE chapter_id = $1 ORDER BY position`,
        [chapter.id]
      );
      chaptersWithContent.push({
        ...chapter,
        content_items: contentItems.rows,
      });
    }

    res.json({
      id: courseId,
      title: course.title,
      description: course.description,
      chapters: chaptersWithContent,
    });
  } catch (err) {
    console.error('Error loading teacher course:', err);
    res.status(500).json({ error: 'Failed to load course' });
  }
};

// DELETE /admin/courses/:id/enrollments/:userId
export const deleteEnrollment = async (req, res) => {
  const { id: courseId, userId } = req.params;

  try {
    const allowed = await hasCourseAccess(courseId, req);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const requesterClientId = req.user?.client_id;
    const requesterRole = req.user?.role;
    const shouldScope = Boolean(requesterClientId) && requesterRole !== 'super_admin';

    const query = `
      DELETE FROM enrollments 
      WHERE course_id = $1 AND user_id = $2
      ${shouldScope ? 'AND user_id IN (SELECT id FROM users WHERE client_id = $3)' : ''}
      RETURNING *
    `;
    const params = shouldScope ? [courseId, userId, requesterClientId] : [courseId, userId];
    const result = await dbQuery(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete enrollment error:', err);
    res.status(500).json({ error: 'Failed to remove user' });
  }
};

// PATCH /admin/courses/:id/enrollments/:userId
export const updateEnrollmentRole = async (req, res) => {
  const { id: courseId, userId } = req.params;
  const { role } = req.body;

  if (!['student', 'teacher'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const allowed = await hasCourseAccess(courseId, req);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const requesterClientId = req.user?.client_id;
    const requesterRole = req.user?.role;
    const shouldScope = Boolean(requesterClientId) && requesterRole !== 'super_admin';

    const query = `
      UPDATE enrollments 
      SET role = $1, enrolled_at = NOW()  -- or add updated_at if you have it
      WHERE course_id = $2 AND user_id = $3
      ${shouldScope ? 'AND user_id IN (SELECT id FROM users WHERE client_id = $4)' : ''}
      RETURNING *
    `;
    const params = shouldScope ? [role, courseId, userId, requesterClientId] : [role, courseId, userId];
    const result = await dbQuery(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Update enrollment error:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
};



