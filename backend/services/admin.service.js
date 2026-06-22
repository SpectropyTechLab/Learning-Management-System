import { query as dbQuery, getClient } from '../repositories/db.repository.js';
import { getEntitledCourseContentRows, getMergedCourseContentRows } from './clientContent.service.js';
import {
  createCourseForRequest,
  ensureCourseActionAccess,
  getRequestCourseScope,
  listCoursesForRequest,
  saveClientCourseTitleOverride,
} from './courseShared.service.js';
import { AppError } from '../utils/errors.js';
import { validateCoursesForExamAccess } from './examCourseAccess.service.js';
// In your backend (e.g., routes/admin/courses.js or .ts)

let contentItemExamSchemaEnsured = false;
let courseExamsSchemaEnsured = false;
let contentMetadataColumnExists;

const hasContentMetadataColumn = async () => {
  if (contentMetadataColumnExists !== undefined) {
    return contentMetadataColumnExists;
  }

  const result = await dbQuery(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'content_items'
          AND column_name = 'metadata'
      ) AS exists
    `
  );

  contentMetadataColumnExists = Boolean(result.rows[0]?.exists);
  return contentMetadataColumnExists;
};

const ensureContentItemExamSchema = async () => {
  if (contentItemExamSchemaEnsured) return;

  await dbQuery(`
    ALTER TABLE content_items
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB
  `);

  await dbQuery(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'content_items'
          AND c.contype = 'c'
          AND c.conname = 'content_items_item_type_check'
          AND pg_get_constraintdef(c.oid) NOT ILIKE '%exam%'
      ) THEN
        ALTER TABLE content_items DROP CONSTRAINT content_items_item_type_check;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'content_items'
          AND c.contype = 'c'
          AND c.conname = 'content_items_item_type_check'
      ) THEN
        ALTER TABLE content_items
        ADD CONSTRAINT content_items_item_type_check
        CHECK (
          item_type = ANY (
            ARRAY['folder', 'video', 'text', 'pdf', 'scorm', 'audio', 'html', 'link', 'exam']::text[]
          )
        );
      END IF;
    END $$;
  `);

  contentItemExamSchemaEnsured = true;
};

const ensureCourseExamsTable = async () => {
  if (courseExamsSchemaEnsured) return;

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS course_exams (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(course_id, exam_id)
    )
  `);
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_course_exams_exam_id ON course_exams(exam_id)`);
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_course_exams_course_id ON course_exams(course_id)`);

  courseExamsSchemaEnsured = true;
};

export const getAllCourses = async (req, res) => {
  try {
    const courses = await listCoursesForRequest(req);
    res.json(courses);
  } catch (err) {
    console.error('Failed to fetch courses:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

export const createCourse = async (req, res) => {
  const { title, description, published = false } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const result = await createCourseForRequest({ req, title, description, published });
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    res.status(result.status).json(result.course);
  } catch (err) {
    console.error('Course creation error:', err);
    res.status(500).json({ error: 'Failed to create course' });
  }
};

// GET /admin/courses/:courseId/content
export const getCourseContent = async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user?.id; // assuming you have user info from auth middleware
  const role = req.user?.role; // e.g., 'student', 'admin', 'instructor'
  const shouldIncludeAttemptStatus = role === 'student' && Boolean(userId);
  const scope = getRequestCourseScope(req);

  try {
    const access = await ensureCourseActionAccess({ courseId, req, action: 'read', scope });
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const shouldLimitToEntitledBranch =
      access.course?.is_entitled_platform_course === true
      && req.user?.role !== 'super_admin'
      && Boolean(req.user?.client_id);
    const rows = shouldLimitToEntitledBranch
      ? await getEntitledCourseContentRows({
          courseId: Number(courseId),
          clientId: Number(req.user?.client_id),
          includeAttemptStatus: shouldIncludeAttemptStatus,
          userId,
        })
      : await getMergedCourseContentRows({
          courseId: Number(courseId),
          includeAttemptStatus: shouldIncludeAttemptStatus,
          userId,
        });

    res.json({
      items: rows,
      course: access.course,
    });
  } catch (err) {
    console.error('Failed to fetch content:', err);
    res.status(500).json({ error: 'Failed to fetch course content' });
  }
};


// POST /admin/courses/:courseId/content
export const createContentItem = async (req, res) => {
  const { courseId } = req.params;
  const { item_type, title, parent_id = null, content_url = null } = req.body;
  const scope = getRequestCourseScope(req);
  const parsedParentId =
    parent_id === null || parent_id === undefined || parent_id === ''
      ? null
      : Number(parent_id);

  const validTypes = ['folder', 'link', 'exam'];

  if (!validTypes.includes(item_type)) {
    return res.status(400).json({
      error: `Invalid item type for this endpoint: ${item_type}`
    });
  }

  if (item_type === 'link') {
    if (!content_url || typeof content_url !== 'string') {
      return res.status(400).json({
        error: 'content_url is required for link type'
      });
    }
  }

  if (item_type === 'folder' && content_url !== null) {
    return res.status(400).json({
      error: 'Folders cannot have content_url'
    });
  }

  if (parsedParentId !== null && (!Number.isInteger(parsedParentId) || parsedParentId <= 0)) {
    return res.status(400).json({ error: 'parent_id must be a valid content item id or null' });
  }

  try {
    const access = await ensureCourseActionAccess({
      courseId,
      req,
      action: 'manage_content',
      scope,
    });
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const courseScopeResult = await dbQuery(
      `SELECT id, client_id FROM courses WHERE id = $1`,
      [courseId]
    );
    if (courseScopeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (parsedParentId !== null) {
      const parentResult = await dbQuery(
        `
          SELECT id, item_type
          FROM content_items
          WHERE id = $1 AND course_id = $2
        `,
        [parsedParentId, courseId]
      );

      if (parentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Parent content item not found' });
      }

      if (parentResult.rows[0].item_type !== 'folder') {
        return res.status(400).json({ error: 'Items can only be added inside folders' });
      }
    }

    const normalizedTitle = typeof title === 'string' ? title.trim() : '';
    let finalTitle = normalizedTitle;
    let finalContentUrl = content_url;
    let metadata = {};

    if (item_type === 'exam') {
      const examIdRaw = req.body?.exam_id ?? req.body?.examId ?? req.body?.metadata?.exam_id;
      const examId = Number(examIdRaw);
      if (!Number.isInteger(examId) || examId <= 0) {
        return res.status(400).json({ error: 'exam_id is required for exam content type' });
      }

      const examResult = await dbQuery(
        `SELECT id, title, client_id, school_id FROM exams WHERE id = $1`,
        [examId]
      );
      if (examResult.rows.length === 0) {
        return res.status(404).json({ error: 'Exam not found' });
      }

      const exam = examResult.rows[0];
      await validateCoursesForExamAccess({
        courseIds: [courseId],
        exam,
        user: req.user,
      });

      finalTitle = normalizedTitle || String(exam.title || 'Exam');
      finalContentUrl = null;
      metadata = { exam_id: examId };

      await ensureCourseExamsTable();
      await dbQuery(
        `
          INSERT INTO course_exams (course_id, exam_id, assigned_by)
          VALUES ($1, $2, $3)
          ON CONFLICT (course_id, exam_id)
          DO UPDATE SET assigned_by = EXCLUDED.assigned_by, assigned_at = NOW()
        `,
        [courseId, examId, req.user?.id ?? null]
      );
    } else {
      if (!normalizedTitle) {
        return res.status(400).json({ error: 'Title is required' });
      }
      if (item_type === 'folder') {
        finalContentUrl = null;
      } else if (item_type === 'link') {
        finalContentUrl = typeof content_url === 'string' ? content_url.trim() : null;
      }
    }

    const metadataColumnExists = await hasContentMetadataColumn();
    const supportsExamMetadata = item_type !== 'exam' || metadataColumnExists;

    if (!supportsExamMetadata) {
      return res.status(500).json({
        error: 'Exam content requires the content_items.metadata column to be available'
      });
    }

    const insertQuery = metadataColumnExists
      ? `INSERT INTO content_items (course_id, parent_id, item_type, title, content_url, metadata)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         RETURNING *`
      : `INSERT INTO content_items (course_id, parent_id, item_type, title, content_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *, '{}'::jsonb AS metadata`;
    const insertParams = metadataColumnExists
      ? [courseId, parsedParentId, item_type, finalTitle, finalContentUrl, JSON.stringify(metadata)]
      : [courseId, parsedParentId, item_type, finalTitle, finalContentUrl];

    const result = await dbQuery(insertQuery, insertParams);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Content creation error:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      hint: err.hint,
      where: err.where,
      table: err.table,
      column: err.column,
      constraint: err.constraint,
      stack: err.stack
    });
    res.status(500).json({ error: 'Failed to create content item' });
  }
};
// PATCH /api/courses/:id/publish
export const publishCourse = async (req, res) => {
  const { id } = req.params;
  try {
    const scope = getRequestCourseScope(req);
    const access = await ensureCourseActionAccess({ courseId: id, req, action: 'publish', scope });
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const query = `
      UPDATE courses
      SET published = true
      WHERE id = $1
      RETURNING *
    `;
    const result = await dbQuery(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const courses = await listCoursesForRequest({
      ...req,
      params: req.params,
    }, scope);
    const updatedCourse = courses.find((course) => course.id === Number(id)) ?? result.rows[0];

    res.json({ success: true, course: updatedCourse });
  } catch (err) {
    console.error('Failed to publish course:', err);
    res.status(500).json({ error: 'Failed to publish course' });
  }
};

// DELETE /admin/courses/:id
export const deleteCourse = async (req, res) => {
  const { id } = req.params;

  try {
    const scope = getRequestCourseScope(req);
    const access = await ensureCourseActionAccess({ courseId: id, req, action: 'delete', scope });
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const query = `
      DELETE FROM courses
      WHERE id = $1
      RETURNING id
    `;
    const result = await dbQuery(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Course and all associated content deleted successfully',
      deletedCourseId: result.rows[0].id
    });
  } catch (err) {
    console.error('Failed to delete course:', err);
    res.status(500).json({ error: 'Failed to delete course' });
  }
};

// PATCH /admin/courses/:id
export const updateCourse = async (req, res) => {
  const { id } = req.params;
  const { title, description, published } = req.body;

  // Basic validation
  if (title !== undefined) {
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }
  }

  try {
    const scope = getRequestCourseScope(req);
    const access = await ensureCourseActionAccess({ courseId: id, req, action: 'update', scope });
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    if (access.course?.can_rename_assigned_course && req.user?.role === 'client_admin') {
      if (title === undefined) {
        return res.status(400).json({ error: 'Title is required for assigned course rename.' });
      }

      if (description !== undefined || published !== undefined) {
        return res.status(400).json({ error: 'Only the course title can be changed for assigned courses.' });
      }

      await saveClientCourseTitleOverride({
        clientId: req.user?.client_id,
        courseId: Number(id),
        title,
        userId: req.user?.id ?? null,
        originalTitle: access.course.original_title ?? access.course.title,
      });

      const courses = await listCoursesForRequest({
        ...req,
        params: req.params,
      }, scope);
      const updatedCourse = courses.find((course) => course.id === Number(id));

      return res.json(updatedCourse ?? { id: Number(id), title: String(title).trim() });
    }

    const query = `
        UPDATE courses
        SET 
          title = COALESCE($1, title),
          description = $2,
          published = COALESCE($3, published),
          updated_at = NOW()
        WHERE id = $4
        RETURNING id
      `;
    const params = [
      title?.trim() || null,
      description?.trim() || null,
      published, // pass undefined to skip, or boolean to update
      id
    ];
    const result = await dbQuery(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const courses = await listCoursesForRequest({
      ...req,
      params: req.params,
    }, scope);
    const updatedCourse = courses.find((course) => course.id === Number(id));

    res.json(updatedCourse ?? result.rows[0]);
  } catch (err) {
    console.error('Update course error:', err);
    res.status(500).json({ error: 'Failed to update course' });
  }
};



