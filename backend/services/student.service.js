import { query as dbQuery, getClient } from "../repositories/db.repository.js"; // or your db connection
import { AppError } from "../utils/errors.js";
import { getAccessibleLinkedCourseIdsForContent, userCanAccessContentItem } from "./clientContent.service.js";

let enrollmentsUserColumnCache = null;
let examResultColumnsEnsured = false;
let examInstructionsColumnKnown = null;
let attemptSweepTimer = null;
let attemptSweepInProgress = false;

const ensureCourseExamsTable = async () => {
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
};

const ensureExamResultConfigColumns = async () => {
  if (examResultColumnsEnsured) return;

  await dbQuery(`
    ALTER TABLE exams
    ADD COLUMN IF NOT EXISTS show_score BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS show_pass_or_fail BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS show_solutions_to_user BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS instructions TEXT
  `);

  examInstructionsColumnKnown = true;
  examResultColumnsEnsured = true;
};

const hasExamInstructionsColumn = async () => {
  if (examInstructionsColumnKnown !== null) return examInstructionsColumnKnown;

  const result = await dbQuery(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'exams'
        AND column_name = 'instructions'
      LIMIT 1
    `
  );

  examInstructionsColumnKnown = result.rows.length > 0;
  return examInstructionsColumnKnown;
};

const resolveEnrollmentUserColumn = async () => {
  if (enrollmentsUserColumnCache) return enrollmentsUserColumnCache;

  const columnResult = await dbQuery(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'enrollments'
        AND column_name IN ('user_id', 'student_id')
      ORDER BY CASE WHEN column_name = 'user_id' THEN 0 ELSE 1 END
      LIMIT 1
    `
  );

  const columnName = columnResult.rows[0]?.column_name;
  if (!columnName) {
    throw new AppError('Enrollments table is missing user linkage column', 500);
  }

  enrollmentsUserColumnCache = columnName;
  return enrollmentsUserColumnCache;
};

const getStudentCourseIds = async (studentId) => {
  const enrollmentUserColumn = await resolveEnrollmentUserColumn();
  const courseRes = await dbQuery(
    `SELECT course_id FROM enrollments WHERE ${enrollmentUserColumn} = $1`,
    [studentId]
  );
  return courseRes.rows.map((r) => Number(r.course_id)).filter((courseId) => Number.isInteger(courseId) && courseId > 0);
};

const resolveExamContentMapping = async ({ examId, preferredCourseId = null, courseIds = null, client = null }) => {
  const parsedExamId = Number(examId);
  if (!Number.isInteger(parsedExamId) || parsedExamId <= 0) {
    return { course_id: null, content_id: null };
  }

  const runner = client || { query: dbQuery };
  const params = [parsedExamId];
  const filters = [
    `ci.item_type = 'exam'`,
    `(
      (
        ci.metadata IS NOT NULL
        AND COALESCE(ci.metadata->>'exam_id', '') ~ '^[0-9]+$'
        AND (ci.metadata->>'exam_id')::int = $1
      )
      OR (
        COALESCE(ci.content_url, '') ~ '^exam:[0-9]+$'
        AND SUBSTRING(ci.content_url FROM '^exam:([0-9]+)$')::int = $1
      )
      OR (
        COALESCE(ci.content_url, '') ~ '^[0-9]+$'
        AND ci.content_url::int = $1
      )
    )`,
  ];
  let orderBySql = 'ci.id ASC';

  if (Number.isInteger(preferredCourseId) && preferredCourseId > 0) {
    params.push(preferredCourseId);
    filters.push(`ci.course_id = $${params.length}`);
  } else if (Array.isArray(courseIds) && courseIds.length > 0) {
    const normalizedCourseIds = courseIds
      .map((courseId) => Number(courseId))
      .filter((courseId) => Number.isInteger(courseId) && courseId > 0);

    if (normalizedCourseIds.length > 0) {
      params.push(normalizedCourseIds);
      filters.push(`ci.course_id = ANY($${params.length}::int[])`);
      orderBySql = 'ci.course_id ASC, ci.id ASC';
    }
  }

  const mappingResult = await runner.query(
    `
      SELECT
        ci.course_id::int AS course_id,
        ci.id::int AS content_id
      FROM content_items ci
      WHERE ${filters.join('\n        AND ')}
      ORDER BY ${orderBySql}
      LIMIT 1
    `,
    params
  );

  const mapping = mappingResult.rows[0];
  return {
    course_id: mapping?.course_id ? Number(mapping.course_id) : null,
    content_id: mapping?.content_id ? Number(mapping.content_id) : null,
  };
};

const assertStudentCanAccessExam = async ({ examId, courseIds }) => {
  if (!Array.isArray(courseIds) || courseIds.length === 0) {
    return false;
  }

  const accessRes = await dbQuery(
    `
      SELECT 1
      FROM course_exams ce
      WHERE ce.exam_id = $1
        AND ce.course_id = ANY($2::int[])
      LIMIT 1
    `,
    [examId, courseIds]
  );

  return accessRes.rows.length > 0;
};

const normalizeExamFlag = (value, defaultValue) => {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes"].includes(normalized)) return true;
  if (["0", "false", "no"].includes(normalized)) return false;
  return defaultValue;
};

const resolveExamResultVisibility = (exam) => {
  const showResultImmediately = normalizeExamFlag(exam?.show_result_immediately, true);
  const showScore = normalizeExamFlag(exam?.show_score, true);
  const showPassOrFail = normalizeExamFlag(exam?.show_pass_or_fail, true);
  const showSolutionsToUser = normalizeExamFlag(exam?.show_solutions_to_user, false);
  const endDate = exam?.end_datetime ? new Date(exam.end_datetime) : null;
  const isReleased = showResultImmediately || (endDate instanceof Date && !Number.isNaN(endDate.getTime()) && new Date() >= endDate);

  return {
    show_result_immediately: showResultImmediately,
    show_score: showScore,
    show_pass_or_fail: showPassOrFail,
    show_solutions_to_user: showSolutionsToUser,
    is_released: Boolean(isReleased),
  };
};

const fetchAttemptWithExam = async ({ attemptId, client = null }) => {
  await ensureExamResultConfigColumns();
  const runner = client || { query: dbQuery };
  const supportsExamInstructions = await hasExamInstructionsColumn();
  const instructionsSelect = supportsExamInstructions
    ? 'e.instructions AS instructions,'
    : 'NULL::text AS instructions,';
  const result = await runner.query(
    `SELECT
       ea.*,
       e.total_duration_minutes,
       e.start_datetime,
       e.end_datetime,
       e.title AS exam_title,
       ${instructionsSelect}
       e.show_result_immediately,
       e.show_score,
       e.show_pass_or_fail,
       e.show_solutions_to_user
     FROM exam_attempts ea
     JOIN exams e ON e.id = ea.exam_id
     WHERE ea.id = $1`,
    [attemptId]
  );
  return result.rows[0] || null;
};

const fetchAttemptTotalPossibleMarks = async ({ attemptId, client = null }) => {
  const runner = client || { query: dbQuery };
  const result = await runner.query(
    `
      SELECT COALESCE(
        SUM(COALESCE(eq.marks_override, es.marks_per_question, q.marks_positive, 0)),
        0
      )::numeric AS total_possible_marks
      FROM exam_attempts ea
      JOIN exam_sections es ON es.exam_id = ea.exam_id
      JOIN exam_questions eq ON eq.section_id = es.id
      JOIN questions q ON q.id = eq.question_id
      WHERE ea.id = $1
    `,
    [attemptId]
  );
  return Number(result.rows[0]?.total_possible_marks || 0);
};

const computeRemainingSeconds = ({ startedAtRaw, totalDurationMinutes }) => {
  const startedAt = startedAtRaw ? new Date(startedAtRaw) : null;
  const durationSeconds = totalDurationMinutes ? Number(totalDurationMinutes) * 60 : null;
  if (!startedAt || durationSeconds === null || durationSeconds < 0) return null;

  const elapsed = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000));
  return Math.max(0, durationSeconds - elapsed);
};

const sanitizeQuestionOptions = (options) => {
  if (Array.isArray(options)) {
    return options.map((option) => {
      if (!option || typeof option !== "object" || Array.isArray(option)) {
        return option;
      }

      const safeOption = { ...option };
      delete safeOption.is_correct;
      return safeOption;
    });
  }

  if (options && typeof options === "object") {
    const source = options;
    if (Array.isArray(source.left) || Array.isArray(source.right)) {
      return {
        left: sanitizeQuestionOptions(source.left || []),
        right: sanitizeQuestionOptions(source.right || []),
      };
    }
  }

  return options ?? null;
};

const extractBlankIdsFromQuestion = (correctAnswer, questionText) => {
  if (correctAnswer && typeof correctAnswer === "object" && Array.isArray(correctAnswer.blanks)) {
    const ids = correctAnswer.blanks
      .map((item) => String(item?.id ?? "").trim())
      .filter(Boolean);
    if (ids.length > 0) {
      return ids;
    }
  }

  const html = typeof questionText === "string"
    ? questionText
    : questionText && typeof questionText === "object" && typeof questionText.html === "string"
      ? questionText.html
      : "";

  return Array.from(html.matchAll(/\{\{([^}]+)\}\}/g))
    .map((match) => String(match[1] ?? "").trim())
    .filter(Boolean);
};

const gradeSubmittedAttempt = async ({ attemptId }) => {
  const tx = await getClient();
  try {
    await tx.query("BEGIN");
    const lockedAttemptResult = await tx.query(
      `
        SELECT
          ea.id,
          ea.status
        FROM exam_attempts ea
        WHERE ea.id = $1
        FOR UPDATE
      `,
      [attemptId]
    );

    if (lockedAttemptResult.rows.length === 0) {
      await tx.query("ROLLBACK");
      return null;
    }

    if (lockedAttemptResult.rows[0].status === "submitted") {
      await gradeAttempt(tx, attemptId);
    }

    const finalizedAttempt = await fetchAttemptWithExam({ attemptId, client: tx });
    await tx.query("COMMIT");
    return finalizedAttempt;
  } catch (error) {
    await tx.query("ROLLBACK");
    throw error;
  } finally {
    tx.release();
  }
};

const maybeAutoSubmitExpiredAttempt = async (attempt) => {
  if (!attempt || attempt.status !== "in_progress") return attempt;

  const remainingSeconds = computeRemainingSeconds({
    startedAtRaw: attempt.started_at,
    totalDurationMinutes: attempt.total_duration_minutes,
  });
  if (remainingSeconds === null || remainingSeconds > 0) {
    return attempt;
  }

  const tx = await getClient();
  try {
    await tx.query("BEGIN");
    const supportsExamInstructions = await hasExamInstructionsColumn();
    const instructionsSelect = supportsExamInstructions
      ? 'e.instructions AS instructions,'
      : 'NULL::text AS instructions,';
    const lockResult = await tx.query(
      `
        SELECT
          ea.*,
          e.total_duration_minutes,
          e.start_datetime,
          e.end_datetime,
          e.title AS exam_title,
          ${instructionsSelect}
          e.show_result_immediately,
          e.show_score,
          e.show_pass_or_fail,
          e.show_solutions_to_user
        FROM exam_attempts ea
        JOIN exams e ON e.id = ea.exam_id
        WHERE ea.id = $1
        FOR UPDATE
      `,
      [attempt.id]
    );

    if (lockResult.rows.length === 0) {
      await tx.query("ROLLBACK");
      return attempt;
    }

    let lockedAttempt = lockResult.rows[0];
    const lockedRemaining = computeRemainingSeconds({
      startedAtRaw: lockedAttempt.started_at,
      totalDurationMinutes: lockedAttempt.total_duration_minutes,
    });

    if (lockedAttempt.status !== "in_progress" || lockedRemaining === null || lockedRemaining > 0) {
      if (lockedAttempt.status === "submitted") {
        await gradeAttempt(tx, lockedAttempt.id);
        lockedAttempt = await fetchAttemptWithExam({ attemptId: lockedAttempt.id, client: tx }) || lockedAttempt;
      }
      await tx.query("COMMIT");
      return lockedAttempt;
    }

    await tx.query(
      `
        UPDATE exam_attempts
        SET status = 'submitted',
            submitted_at = COALESCE(submitted_at, NOW()),
            auto_submitted = TRUE
        WHERE id = $1
      `,
      [lockedAttempt.id]
    );
    await gradeAttempt(tx, lockedAttempt.id);

    const finalizedAttempt = await fetchAttemptWithExam({ attemptId: lockedAttempt.id, client: tx });
    await tx.query("COMMIT");
    return finalizedAttempt || lockedAttempt;
  } catch (error) {
    await tx.query("ROLLBACK");
    throw error;
  } finally {
    tx.release();
  }
};

const ensureAttemptFinalized = async ({ attemptId, studentId = null }) => {
  const attempt = await fetchAttemptWithExam({ attemptId });
  if (!attempt) {
    throw new AppError("Attempt not found", 404);
  }

  if (studentId !== null && Number(attempt.student_id) !== Number(studentId)) {
    throw new AppError("Access denied", 403);
  }

  if (attempt.status === "in_progress") {
    return maybeAutoSubmitExpiredAttempt(attempt);
  }

  if (attempt.status === "submitted") {
    return (await gradeSubmittedAttempt({ attemptId })) || attempt;
  }

  return attempt;
};

const getAttemptQuestionsAndSections = async (examId) => {
  const result = await dbQuery(
    `
      SELECT
        es.id AS section_id,
        es.title AS section_title,
        es.order_index AS section_order,
        es.instructions AS section_instructions,
        eq.question_id,
        eq.order_index AS question_order,
        q.question_type,
        q.question_text,
        q.options,
        q.correct_answer,
        cp.id AS comprehension_id,
        cp.title AS comprehension_title,
        cp.passage_content AS comprehension_passage_content,
        q.marks_positive,
        q.marks_negative
      FROM exam_sections es
      JOIN exam_questions eq ON eq.section_id = es.id
      JOIN questions q ON q.id = eq.question_id
      LEFT JOIN comprehension_passages cp ON cp.id = q.comprehension_passage_id
      WHERE es.exam_id = $1
      ORDER BY es.order_index, eq.order_index, eq.id
    `,
    [examId]
  );

  const sectionMap = new Map();
  const questions = [];

  result.rows.forEach((row, index) => {
    const sectionId = Number(row.section_id);
    if (!sectionMap.has(sectionId)) {
      sectionMap.set(sectionId, {
        id: sectionId,
        title: row.section_title,
        order_index: row.section_order,
        instructions: row.section_instructions ?? null,
        question_count: 0,
      });
    }

    const section = sectionMap.get(sectionId);
    section.question_count += 1;

    questions.push({
      id: Number(row.question_id),
      question_id: Number(row.question_id),
      section_id: sectionId,
      section_order: row.section_order,
      section_title: row.section_title,
      question_order: row.question_order,
      sequence: index + 1,
      question_type: row.question_type,
      question_text: row.question_text,
      options: sanitizeQuestionOptions(row.options),
      comprehension: row.comprehension_id
        ? {
            id: Number(row.comprehension_id),
            title: row.comprehension_title,
            passage_content: row.comprehension_passage_content,
          }
        : null,
      blank_ids: extractBlankIdsFromQuestion(row.correct_answer, row.question_text),
      marks_positive: row.marks_positive,
      marks_negative: row.marks_negative,
    });
  });

  const sections = Array.from(sectionMap.values()).sort((a, b) => {
    if (a.order_index === b.order_index) return a.id - b.id;
    return a.order_index - b.order_index;
  });

  return { sections, questions };
};

const getAttemptStateInternal = async ({ attemptId, studentId }) => {
  const attempt = await ensureAttemptFinalized({ attemptId, studentId });

  const [responsesResult, questionBundle, courseIds] = await Promise.all([
    dbQuery(
      `SELECT id, question_id, section_id, student_answer, is_marked_for_review, is_attempted, answered_at
       FROM exam_responses
       WHERE attempt_id = $1
       ORDER BY id ASC`,
      [attemptId]
    ),
    getAttemptQuestionsAndSections(attempt.exam_id),
    studentId ? getStudentCourseIds(studentId) : Promise.resolve([]),
  ]);
  const mapping = await resolveExamContentMapping({ examId: attempt.exam_id, courseIds });

  const remainingSeconds = computeRemainingSeconds({
    startedAtRaw: attempt.started_at,
    totalDurationMinutes: attempt.total_duration_minutes,
  });

  return {
    attempt,
    exam: {
      id: attempt.exam_id,
      title: attempt.exam_title,
      instructions: attempt.instructions ?? null,
      total_duration_minutes: attempt.total_duration_minutes,
      start_datetime: attempt.start_datetime,
      end_datetime: attempt.end_datetime,
      course_id: mapping.course_id,
      content_id: mapping.content_id,
      show_result_immediately: attempt.show_result_immediately,
      show_score: attempt.show_score,
      show_pass_or_fail: attempt.show_pass_or_fail,
      show_solutions_to_user: attempt.show_solutions_to_user,
    },
    sections: questionBundle.sections,
    questions: questionBundle.questions,
    responses: responsesResult.rows,
    remaining_seconds: remainingSeconds,
    status: attempt.status,
    is_read_only: attempt.status !== 'in_progress',
  };
};

const fetchAttemptQuestionResults = async ({ attemptId }) => {
  const result = await dbQuery(
    `
      SELECT
        er.id AS response_id,
        er.question_id,
        er.section_id,
        er.student_answer,
        er.is_attempted,
        er.is_marked_for_review,
        er.answered_at,
        er.is_correct,
        er.marks_awarded,
        q.question_type,
        q.question_text,
        q.options,
        q.correct_answer,
        q.solution,
        q.solution_video_url,
        cp.id AS comprehension_id,
        cp.title AS comprehension_title,
        cp.passage_content AS comprehension_passage_content,
        COALESCE(eq.marks_override, es.marks_per_question, q.marks_positive, 0) AS max_marks,
        COALESCE(q.marks_negative, 0) AS negative_marks,
        es.title AS section_title,
        es.order_index AS section_order,
        eq.order_index AS question_order
      FROM exam_responses er
      JOIN questions q ON q.id = er.question_id
      LEFT JOIN comprehension_passages cp ON cp.id = q.comprehension_passage_id
      JOIN exam_sections es ON es.id = er.section_id
      JOIN exam_questions eq ON eq.section_id = er.section_id AND eq.question_id = er.question_id
      WHERE er.attempt_id = $1
      ORDER BY es.order_index ASC, eq.order_index ASC, er.id ASC
    `,
    [attemptId]
  );
  return result.rows;
};

const buildAttemptResultPayload = async ({ attempt, allowUnreleased = false, studentId = null }) => {
  const visibility = resolveExamResultVisibility(attempt);
  if (!allowUnreleased && !visibility.is_released) {
    throw new AppError("Result not available yet", 403);
  }

  const [questionResults, totalPossibleMarks, courseIds] = await Promise.all([
    fetchAttemptQuestionResults({ attemptId: attempt.id }),
    fetchAttemptTotalPossibleMarks({ attemptId: attempt.id }),
    studentId ? getStudentCourseIds(studentId) : Promise.resolve([]),
  ]);
  const mapping = await resolveExamContentMapping({ examId: attempt.exam_id, courseIds });

  const attemptedCount = questionResults.filter((item) => Boolean(item.is_attempted)).length;
  const correctCount = questionResults.filter((item) => item.is_correct === true).length;
  const wrongCount = questionResults.filter((item) => item.is_correct === false && item.is_attempted === true).length;
  const unattemptedCount = questionResults.length - attemptedCount;
  const totalScore = attempt.total_score === null || attempt.total_score === undefined ? null : Number(attempt.total_score);
  const percentage = totalScore === null || totalPossibleMarks <= 0 ? null : Number(((totalScore / totalPossibleMarks) * 100).toFixed(2));
  const passStatus = totalScore === null || totalPossibleMarks <= 0
    ? null
    : totalScore >= (totalPossibleMarks * 0.5);

  const responses = questionResults.map((item) => {
      const response = {
        question_id: Number(item.question_id),
        section_id: Number(item.section_id),
        section_title: item.section_title,
        section_order: item.section_order,
        question_order: item.question_order,
        question_type: item.question_type,
        question_text: item.question_text,
        options: sanitizeQuestionOptions(item.options),
        comprehension: item.comprehension_id
          ? {
              id: Number(item.comprehension_id),
              title: item.comprehension_title,
              passage_content: item.comprehension_passage_content,
            }
          : null,
        blank_ids: extractBlankIdsFromQuestion(item.correct_answer, item.question_text),
        student_answer: item.student_answer,
        is_attempted: item.is_attempted,
        is_marked_for_review: item.is_marked_for_review,
        answered_at: item.answered_at,
      };

    if (visibility.show_score && visibility.is_released) {
      response.is_correct = item.is_correct;
      response.marks_awarded = item.marks_awarded;
      response.max_marks = item.max_marks === null || item.max_marks === undefined
        ? null
        : Number(item.max_marks);
      response.negative_marks = item.negative_marks === null || item.negative_marks === undefined
        ? null
        : Number(item.negative_marks);
    }

    if (visibility.show_solutions_to_user && visibility.is_released) {
      response.correct_answer = item.correct_answer;
      response.solution = item.solution;
      response.solution_video_url = item.solution_video_url;
    }

    return response;
  });

  const summary = {
    total_questions: questionResults.length,
    attempted: attemptedCount,
    unattempted: unattemptedCount,
    correct: visibility.show_score && visibility.is_released ? correctCount : null,
    wrong: visibility.show_score && visibility.is_released ? wrongCount : null,
    total_possible_marks: visibility.show_score && visibility.is_released ? totalPossibleMarks : null,
    total_score: visibility.show_score && visibility.is_released ? totalScore : null,
    percentage: visibility.show_score && visibility.is_released ? percentage : null,
    is_passed: visibility.show_pass_or_fail && visibility.is_released ? passStatus : null,
  };

  return {
    attempt: {
      id: Number(attempt.id),
      exam_id: Number(attempt.exam_id),
      student_id: Number(attempt.student_id),
      attempt_number: attempt.attempt_number,
      status: attempt.status,
      started_at: attempt.started_at,
      submitted_at: attempt.submitted_at,
      auto_submitted: attempt.auto_submitted,
      graded_at: attempt.status === "graded" ? attempt.submitted_at : null,
    },
    exam: {
      id: Number(attempt.exam_id),
      title: attempt.exam_title,
      start_datetime: attempt.start_datetime,
      end_datetime: attempt.end_datetime,
      total_duration_minutes: attempt.total_duration_minutes,
      course_id: mapping.course_id,
      content_id: mapping.content_id,
    },
    visibility,
    summary,
    responses,
  };
};

export const getStudentContentById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const role = req.user?.role;

  try {
    if (!userId || !role) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const contentResult = await dbQuery(
      `
        SELECT ci.*
        FROM content_items ci
        WHERE ci.id = $1
        LIMIT 1
      `,
      [id]
    );

    if (contentResult.rows.length === 0) {
      return res.status(404).json({ message: "Content not found" });
    }

    const hasAccess = await userCanAccessContentItem({
      user: req.user,
      contentItemId: Number(id),
    });

    if (!hasAccess) {
      return res.status(404).json({ message: "Content not found" });
    }

    const content = contentResult.rows[0];
    const linkedCourseIds = await getAccessibleLinkedCourseIdsForContent({
      user: req.user,
      contentItemId: Number(id),
    });

    if (linkedCourseIds.length > 0) {
      content.course_id = linkedCourseIds[0];
    }

    res.json(content);
  } catch (err) {
    console.error("Error fetching content:", err);
    res.status(500).json({ message: "Error fetching content" });
  }
};

export const getStudentExams = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const studentId = req.user.id;
    await ensureCourseExamsTable();
    const courseIds = await getStudentCourseIds(studentId);
    if (courseIds.length === 0) {
      return res.json([]);
    }

    const examsResult = await dbQuery(
      `
        SELECT
          e.*,
          MIN(ce.course_id)::int AS course_id,
          COALESCE(a.attempt_count, 0) AS attempt_count,
          COALESCE(a.completed, false) AS has_completed,
          MAX(ip.id)::int AS in_progress_attempt_id,
          MAX(lca.id)::int AS latest_completed_attempt_id
        FROM course_exams ce
        JOIN exams e ON e.id = ce.exam_id
        LEFT JOIN (
          SELECT exam_id,
            COUNT(*)::int AS attempt_count,
            MAX(CASE WHEN status IN ('submitted', 'graded') THEN 1 ELSE 0 END)::boolean AS completed
          FROM exam_attempts
          WHERE student_id = $1
          GROUP BY exam_id
        ) a ON a.exam_id = e.id
        LEFT JOIN LATERAL (
          SELECT ea.id
          FROM exam_attempts ea
          WHERE ea.exam_id = e.id
            AND ea.student_id = $1
            AND ea.status = 'in_progress'
          ORDER BY ea.started_at DESC, ea.id DESC
          LIMIT 1
        ) ip ON TRUE
        LEFT JOIN LATERAL (
          SELECT ea.id
          FROM exam_attempts ea
          WHERE ea.exam_id = e.id
            AND ea.student_id = $1
            AND ea.status IN ('submitted', 'graded')
          ORDER BY COALESCE(ea.submitted_at, ea.started_at) DESC, ea.id DESC
          LIMIT 1
        ) lca ON TRUE
        WHERE ce.course_id = ANY($2::int[])
          AND e.status IN ('published', 'active', 'completed')
        GROUP BY e.id, a.attempt_count, a.completed
        ORDER BY e.start_datetime DESC, e.id DESC
      `,
      [studentId, courseIds]
    );

    const now = new Date();
    const exams = await Promise.all(examsResult.rows.map(async (item) => {
      let computed_status = item.status || 'draft';
      const startDt = item.start_datetime ? new Date(item.start_datetime) : null;
      const endDt = item.end_datetime ? new Date(item.end_datetime) : null;

      if (item.has_completed) {
        computed_status = 'completed';
      } else if (item.attempt_count >= (item.max_attempts || 1)) {
        computed_status = 'max_attempts_reached';
      } else if (startDt && now < startDt) {
        computed_status = 'upcoming';
      } else if (startDt && endDt && now >= startDt && now <= endDt) {
        computed_status = 'ongoing';
      } else if (endDt && now > endDt) {
        computed_status = 'expired';
      } else if (item.status) {
        computed_status = item.status;
      }

      const preferredCourseId = item.course_id ? Number(item.course_id) : null;
      const mapping = await resolveExamContentMapping({
        examId: item.id,
        preferredCourseId,
        courseIds,
      });

      return {
        ...item,
        course_id: mapping.course_id ?? preferredCourseId ?? null,
        content_id: mapping.content_id,
        computed_status,
        in_progress_attempt_id: item.in_progress_attempt_id ? Number(item.in_progress_attempt_id) : null,
        has_in_progress_attempt: Boolean(item.in_progress_attempt_id),
        latest_completed_attempt_id: item.latest_completed_attempt_id
          ? Number(item.latest_completed_attempt_id)
          : null,
      };
    }));

    res.json(exams);
  } catch (err) {
    console.error('Error fetching student exams:', err);
    res.status(500).json({ message: 'Error fetching student exams' });
  }
};

export const getAttemptState = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const attemptId = Number(req.params.aid);
    if (!attemptId || Number.isNaN(attemptId)) {
      return res.status(400).json({ message: 'Invalid attempt id' });
    }

    const state = await getAttemptStateInternal({ attemptId, studentId: req.user.id });
    res.json(state);
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error('Error fetching attempt state:', err);
    res.status(500).json({ message: 'Error fetching attempt state' });
  }
};

export const getAttemptResult = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const attemptId = Number(req.params.aid);
    if (!attemptId || Number.isNaN(attemptId)) {
      return res.status(400).json({ message: "Invalid attempt id" });
    }

    const resultPayload = await getAttemptResultPayloadByAttemptId({
      attemptId,
      studentId: req.user.id,
      allowUnreleased: false,
    });
    return res.json(resultPayload);
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("Error fetching attempt result:", err);
    return res.status(500).json({ message: "Error fetching attempt result" });
  }
};

export const getAttemptResultPayloadByAttemptId = async ({ attemptId, studentId = null, allowUnreleased = false }) => {
  const attempt = await ensureAttemptFinalized({ attemptId, studentId });
  if (attempt.status === "in_progress") {
    throw new AppError("Attempt is still in progress", 409);
  }
  return buildAttemptResultPayload({ attempt, allowUnreleased, studentId });
};

export const startExamAttempt = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const examId = Number(req.params.id);
    if (!examId || Number.isNaN(examId)) {
      return res.status(400).json({ message: 'Invalid exam id' });
    }

    const examResult = await dbQuery('SELECT * FROM exams WHERE id = $1', [examId]);
    if (examResult.rows.length === 0) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    await ensureCourseExamsTable();
    const enrolledCourseIds = await getStudentCourseIds(req.user.id);
    const hasAccess = await assertStudentCanAccessExam({
      examId,
      courseIds: enrolledCourseIds,
    });
    if (!hasAccess) {
      return res.status(403).json({ message: 'Exam is not assigned to your enrolled courses' });
    }

    const exam = examResult.rows[0];
    const now = new Date();
    const startDt = new Date(exam.start_datetime);
    const endDt = new Date(exam.end_datetime);

    if (!['published', 'active'].includes(exam.status)) {
      return res.status(403).json({ message: 'Exam is not available for attempt' });
    }
    if (now < startDt) {
      return res.status(403).json({ message: 'Exam has not started yet' });
    }
    if (now > endDt) {
      return res.status(403).json({ message: 'Exam has already ended' });
    }

    const existingAttemptResult = await dbQuery(
      `SELECT id
       FROM exam_attempts
       WHERE exam_id = $1
         AND student_id = $2
         AND status = 'in_progress'
       ORDER BY started_at DESC, id DESC
       LIMIT 1`,
      [examId, req.user.id]
    );
    const existingAttemptId = existingAttemptResult.rows[0]?.id;
    if (existingAttemptId) {
      const runtimeState = await getAttemptStateInternal({
        attemptId: existingAttemptId,
        studentId: req.user.id,
      });
      return res.json(runtimeState);
    }

    const previousAttempts = await dbQuery(
      'SELECT COUNT(*)::int AS count FROM exam_attempts WHERE exam_id = $1 AND student_id = $2',
      [examId, req.user.id]
    );
    const attemptCount = Number(previousAttempts.rows[0]?.count || 0);

    const maxAttempts = exam.max_attempts ? Number(exam.max_attempts) : 1;
    if (attemptCount >= maxAttempts) {
      return res.status(403).json({ message: 'Max attempts reached' });
    }

    const attemptNumber = attemptCount + 1;

    const client = await getClient();
    try {
      await client.query('BEGIN');
      const insertAttemptRes = await client.query(
        `INSERT INTO exam_attempts
         (exam_id, student_id, attempt_number, started_at, status)
         VALUES ($1, $2, $3, NOW(), 'in_progress')
         RETURNING *`,
        [examId, req.user.id, attemptNumber]
      );

      const attempt = insertAttemptRes.rows[0];

      const questionsRes = await client.query(
        `SELECT eq.question_id, eq.section_id, eq.order_index AS question_order, es.order_index AS section_order
         FROM exam_questions eq
         JOIN exam_sections es ON es.id = eq.section_id
         WHERE es.exam_id = $1
         ORDER BY es.order_index, eq.order_index`,
        [examId]
      );

      const questionRows = questionsRes.rows;

      for (const q of questionRows) {
        await client.query(
          `INSERT INTO exam_responses (attempt_id, question_id, section_id, is_marked_for_review, is_attempted)
           VALUES ($1, $2, $3, FALSE, FALSE)
           ON CONFLICT (attempt_id, question_id) DO NOTHING`,
          [attempt.id, q.question_id, q.section_id]
        );
      }

      await client.query('COMMIT');
      const runtimeState = await getAttemptStateInternal({
        attemptId: attempt.id,
        studentId: req.user.id,
      });
      return res.json(runtimeState);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error('Error starting exam attempt:', err);
    res.status(500).json({ message: 'Error starting exam attempt' });
  }
};

export const saveExamResponse = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const attemptId = Number(req.params.aid);
    if (!attemptId || Number.isNaN(attemptId)) {
      return res.status(400).json({ message: 'Invalid attempt id' });
    }

    const responses = req.body?.responses;
    if (!Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({ message: 'responses must be a non-empty array' });
    }

    const attempt = await ensureAttemptFinalized({ attemptId, studentId: req.user.id });
    if (attempt.status !== "in_progress") {
      const statusCode = attempt.status === "graded" || attempt.status === "submitted" ? 409 : 403;
      return res.status(statusCode).json({ message: "Cannot save responses for a non-active attempt" });
    }

    if (req.body?.omr_lock) {
      return res.status(423).json({ message: 'OMR lock enabled, cannot save responses at this time' });
    }

    const questionIds = responses
      .map((item) => Number(item.question_id))
      .filter((id) => id && !Number.isNaN(id));

    if (questionIds.length === 0) {
      return res.status(400).json({ message: 'responses must include question_id values' });
    }

    const questionMetaRes = await dbQuery(
      `SELECT eq.question_id, eq.section_id
       FROM exam_questions eq
       JOIN exam_sections es ON es.id = eq.section_id
       WHERE es.exam_id = $1
         AND eq.question_id = ANY($2::int[])`,
      [attempt.exam_id, questionIds]
    );

    const questionMap = questionMetaRes.rows.reduce((acc, row) => {
      acc[row.question_id] = row.section_id;
      return acc;
    }, {});

    const toJsonColumnValue = (value) => {
      if (value === undefined || value === null || value === '') {
        return { answer: null, answerJson: null };
      }

      if (typeof value === 'number' && !Number.isFinite(value)) {
        return { answer: null, answerJson: null };
      }

      let normalized = value;
      if (typeof normalized === 'bigint') {
        normalized = normalized.toString();
      }

      try {
        return {
          answer: normalized,
          answerJson: JSON.stringify(normalized),
        };
      } catch {
        throw new AppError('student_answer must be JSON-serializable', 400);
      }
    };

    const client = await getClient();
    try {
      await client.query('BEGIN');
      for (const item of responses) {
        const questionId = Number(item.question_id);
        if (!questionId || Number.isNaN(questionId)) {
          continue;
        }

        const sectionId = questionMap[questionId];
        if (!sectionId) {
          continue;
        }

        const { answer: studentAnswer, answerJson: studentAnswerJson } = toJsonColumnValue(item.student_answer);
        const isAttempted = item.is_attempted !== undefined
          ? Boolean(item.is_attempted)
          : !(studentAnswer === null || studentAnswer === '');
        const isMarkedForReview = Boolean(item.is_marked_for_review);

        await client.query(
          `INSERT INTO exam_responses
             (attempt_id, question_id, section_id, student_answer, is_attempted, answered_at, is_marked_for_review)
           VALUES ($1, $2, $3, $4::jsonb, $5, NOW(), $6)
           ON CONFLICT (attempt_id, question_id)
           DO UPDATE SET student_answer = EXCLUDED.student_answer,
                         is_attempted = EXCLUDED.is_attempted,
                         answered_at = EXCLUDED.answered_at,
                         is_marked_for_review = EXCLUDED.is_marked_for_review`,
          [attemptId, questionId, sectionId, studentAnswerJson, isAttempted, isMarkedForReview]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const updatedState = await getAttemptStateInternal({ attemptId, studentId: req.user.id });
    res.json({ message: 'Responses saved', attemptState: updatedState });
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error('Error saving exam response:', err);
    res.status(500).json({ message: 'Error saving exam response' });
  }
};

// ============================================
// TASK 1: Submit Exam API
// ============================================
export const submitExamAttempt = async (req, res) => {
  const attemptId = Number(req.params.aid);
  const studentId = req.user?.id;

  if (!attemptId || Number.isNaN(attemptId)) {
    return res.status(400).json({ error: 'Invalid attempt ID' });
  }

  if (!studentId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const preAttempt = await ensureAttemptFinalized({ attemptId, studentId });
    if (preAttempt.status !== "in_progress") {
      const statusCode = preAttempt.status === "graded" || preAttempt.status === "submitted" ? 409 : 403;
      return res.status(statusCode).json({ error: "Attempt already submitted or graded" });
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 1. Fetch attempt + exam window
      const attemptRes = await client.query(
        `SELECT ea.*, e.end_datetime, e.start_datetime, e.total_duration_minutes
         FROM exam_attempts ea
         JOIN exams e ON ea.exam_id = e.id
         WHERE ea.id = $1 AND ea.student_id = $2
         FOR UPDATE`,
        [attemptId, studentId]
      );

      if (attemptRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Attempt not found or access denied' });
      }

      const attempt = attemptRes.rows[0];
      const now = new Date();
      const startDt = new Date(attempt.start_datetime);
      const endDt = new Date(attempt.end_datetime);

      // Validate exam window
      if (now < startDt) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Exam has not started yet' });
      }

      // Validate attempt not already submitted
      if (attempt.status !== 'in_progress') {
        if (attempt.status === "submitted") {
          await gradeAttempt(client, attemptId);
          await client.query("COMMIT");
          const finalAttempt = await dbQuery(
            `SELECT id, exam_id, student_id, attempt_number, status, submitted_at, total_score,
                    total_correct, total_wrong, total_unattempted
             FROM exam_attempts WHERE id = $1`,
            [attemptId]
          );
          return res.status(200).json({
            message: "Attempt already submitted; grading completed",
            attempt: finalAttempt.rows[0],
          });
        }
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Attempt already submitted or graded' });
      }

      const remainingSeconds = computeRemainingSeconds({
        startedAtRaw: attempt.started_at,
        totalDurationMinutes: attempt.total_duration_minutes,
      });
      const expiredByDuration = remainingSeconds !== null && remainingSeconds <= 0;
      const isLate = now > endDt;
      const autoSubmitted = expiredByDuration || isLate;

      // 2. Atomic status transition (WHERE status='in_progress')
      const updateRes = await client.query(
        `UPDATE exam_attempts
         SET status = 'submitted', submitted_at = $1, auto_submitted = $2
         WHERE id = $3 AND status = 'in_progress'
         RETURNING id`,
        [now, autoSubmitted, attemptId]
      );

      if (updateRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Attempt already submitted (race condition)' });
      }

      // 3. Trigger grading
      await gradeAttempt(client, attemptId);

      await client.query('COMMIT');

      // Return attempt summary
      const finalAttempt = await dbQuery(
        `SELECT id, exam_id, student_id, attempt_number, status, submitted_at, total_score, 
                total_correct, total_wrong, total_unattempted
         FROM exam_attempts WHERE id = $1`,
        [attemptId]
      );

      return res.status(200).json({
        message: autoSubmitted
          ? 'Exam auto-submitted and graded successfully'
          : 'Exam submitted and graded successfully',
        attempt: finalAttempt.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Submit exam error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error("Submit exam error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ============================================
// TASK 2 & 3: Grading Functions by Question Type
// ============================================

const isObject = (value) => value !== null && typeof value === "object";

const isBlankValue = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

const toFiniteNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const normalizeToken = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value).trim();
};

const normalizeTrueFalseToken = (value) => {
  const raw = normalizeToken(value).toLowerCase();
  if (["true", "1", "yes"].includes(raw)) return "true";
  if (["false", "0", "no"].includes(raw)) return "false";
  return raw;
};

const extractSingleValue = (value) => {
  if (isBlankValue(value)) return null;

  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : null;
  }

  if (isObject(value)) {
    if (Array.isArray(value.answer_ids) && value.answer_ids.length > 0) return value.answer_ids[0];
    if (Array.isArray(value.answers) && value.answers.length > 0) return value.answers[0];
    if (value.answer !== undefined) return value.answer;
    if (value.value !== undefined) return value.value;
    if (value.raw !== undefined) return value.raw;
    return null;
  }

  return value;
};

const extractMultipleValues = (value) => {
  if (isBlankValue(value)) return [];

  if (Array.isArray(value)) return value;

  if (isObject(value)) {
    if (Array.isArray(value.answer_ids)) return value.answer_ids;
    if (Array.isArray(value.answers)) return value.answers;
    if (value.answer !== undefined) return [value.answer];
    return [];
  }

  return [value];
};

const extractNumericValueAndTolerance = (value, defaultTolerance = 0.01) => {
  if (isBlankValue(value)) return { value: null, tolerance: defaultTolerance };

  if (isObject(value)) {
    const resolvedValue =
      value.raw !== undefined
        ? value.raw
        : value.value !== undefined
          ? value.value
          : value.answer;
    const resolvedTolerance = value.tolerance !== undefined
      ? toFiniteNumber(value.tolerance, defaultTolerance)
      : defaultTolerance;
    return { value: resolvedValue, tolerance: resolvedTolerance };
  }

  return { value, tolerance: defaultTolerance };
};

// Grade single MCQ - exact match
const gradeMCQSingle = (studentAnswer, correctAnswer) => {
  const studentValue = extractSingleValue(studentAnswer);
  if (isBlankValue(studentValue)) {
    return { isCorrect: false, isUnattempted: true };
  }

  const correctValue = extractSingleValue(correctAnswer);
  if (isBlankValue(correctValue)) {
    return { isCorrect: false, isUnattempted: false };
  }

  return {
    isCorrect: normalizeToken(studentValue) === normalizeToken(correctValue),
    isUnattempted: false,
  };
};

// Grade multiple MCQ - exact full set match
const normalizeScoringMode = (value) => {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'partial') return 'partial';
  if (raw === 'mixed') return 'mixed';
  return 'all_or_nothing';
};

const roundToTwo = (value) => Math.round(Number(value || 0) * 100) / 100;

const gradeMCQMultiple = (
  studentAnswer,
  correctAnswer,
  { scoringMode = 'all_or_nothing', posMarks = 0 } = {}
) => {
  const studentArray = extractMultipleValues(studentAnswer)
    .map((item) => normalizeToken(item))
    .filter((item) => item.length > 0);

  if (studentArray.length === 0) {
    return { isCorrect: false, isUnattempted: true };
  }

  const correctArray = extractMultipleValues(correctAnswer)
    .map((item) => normalizeToken(item))
    .filter((item) => item.length > 0);

  if (correctArray.length === 0) {
    return { isCorrect: false, isUnattempted: false };
  }

  const studentNorm = [...new Set(studentArray)].sort();
  const correctNorm = [...new Set(correctArray)].sort();
  const isExactMatch = studentNorm.length === correctNorm.length &&
    studentNorm.every((val, idx) => val === correctNorm[idx]);

  const normalizedScoringMode = normalizeScoringMode(scoringMode);

  if (normalizedScoringMode === 'partial' && !isExactMatch) {
    const correctSet = new Set(correctNorm);
    const selectedCorrect = studentNorm.filter((item) => correctSet.has(item));
    const selectedWrong = studentNorm.filter((item) => !correctSet.has(item));

    if (selectedWrong.length > 0 || selectedCorrect.length === 0) {
      return {
        isCorrect: false,
        isUnattempted: false,
        outcome: 'wrong',
      };
    }

    const awardedMarks = roundToTwo((posMarks * selectedCorrect.length) / correctNorm.length);
    return {
      isCorrect: null,
      isUnattempted: false,
      outcome: awardedMarks > 0 ? 'partial' : 'wrong',
      marksAwarded: awardedMarks,
    };
  }

  return {
    isCorrect: isExactMatch,
    isUnattempted: false,
    outcome: isExactMatch ? 'correct' : 'wrong',
  };
};

// Grade numerical - tolerance check (default 0.01)
const gradeNumerical = (studentAnswer, correctAnswer, defaultTolerance = 0.01) => {
  const studentValue = extractSingleValue(studentAnswer);
  if (isBlankValue(studentValue)) {
    return { isCorrect: false, isUnattempted: true };
  }

  const { value: correctValue, tolerance } = extractNumericValueAndTolerance(correctAnswer, defaultTolerance);
  if (isBlankValue(correctValue)) {
    return { isCorrect: false, isUnattempted: false };
  }

  const studentNum = parseFloat(String(studentValue).replace(/,/g, ""));
  const correctNum = parseFloat(String(correctValue).replace(/,/g, ""));

  if (Number.isNaN(studentNum) || Number.isNaN(correctNum)) {
    return {
      isCorrect: normalizeAnswerString(studentValue) === normalizeAnswerString(correctValue),
      isUnattempted: false,
    };
  }

  return {
    isCorrect: Math.abs(studentNum - correctNum) <= Math.max(0, toFiniteNumber(tolerance, defaultTolerance)),
    isUnattempted: false,
  };
};

// Grade true/false - exact match
const gradeTrueFalse = (studentAnswer, correctAnswer) => {
  const studentValue = extractSingleValue(studentAnswer);
  if (isBlankValue(studentValue)) {
    return { isCorrect: false, isUnattempted: true };
  }

  const correctValue = extractSingleValue(correctAnswer);
  if (isBlankValue(correctValue)) {
    return { isCorrect: false, isUnattempted: false };
  }

  return {
    isCorrect: normalizeTrueFalseToken(studentValue) === normalizeTrueFalseToken(correctValue),
    isUnattempted: false,
  };
};

// Grade integer - exact match after parsing
const gradeInteger = (studentAnswer, correctAnswer) => {
  const studentValue = extractSingleValue(studentAnswer);
  if (isBlankValue(studentValue)) {
    return { isCorrect: false, isUnattempted: true };
  }

  const correctValue = extractSingleValue(correctAnswer);
  if (isBlankValue(correctValue)) {
    return { isCorrect: false, isUnattempted: false };
  }

  const studentInt = parseInt(String(studentValue), 10);
  const correctInt = parseInt(String(correctValue), 10);
  if (Number.isNaN(studentInt) || Number.isNaN(correctInt)) {
    return { isCorrect: false, isUnattempted: false };
  }

  return {
    isCorrect: studentInt === correctInt,
    isUnattempted: false,
  };
};

const extractMatchPairs = (value) => {
  const source = isObject(value) ? value : null;
  const rawPairs = Array.isArray(source?.pairs)
    ? source.pairs
    : Array.isArray(value)
      ? value
      : [];

  return rawPairs
    .map((item) => {
      if (!isObject(item)) return null;
      const leftId = normalizeToken(item.left_id);
      const rightId = normalizeToken(item.right_id);
      if (!leftId || !rightId) return null;
      return {
        left_id: leftId,
        right_id: rightId,
      };
    })
    .filter(Boolean);
};

const extractFillBlankValues = (value) => {
  if (isBlankValue(value)) return [];

  if (isObject(value) && Array.isArray(value.blanks)) {
    return value.blanks
      .map((item) => {
        if (!isObject(item)) return null;
        const id = normalizeToken(item.id);
        const entryValue = item.value ?? item.answer ?? item.raw ?? "";
        if (!id) return null;
        return {
          id,
          value: String(entryValue ?? "").trim(),
        };
      })
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!isObject(item)) return null;
        const id = normalizeToken(item.id);
        if (!id) return null;
        return {
          id,
          value: String(item.value ?? item.answer ?? item.raw ?? "").trim(),
        };
      })
      .filter(Boolean);
  }

  if (isObject(value)) {
    return Object.entries(value)
      .filter(([key]) => key !== "blanks")
      .map(([key, item]) => ({
        id: String(key).trim(),
        value: String(item ?? "").trim(),
      }))
      .filter((item) => item.id);
  }

  return [];
};

const normalizeAnswerString = (value) => String(value ?? "").trim().toLowerCase();
const normalizeCaseSensitiveAnswerString = (value) => String(value ?? "").trim();

const extractShortAnswerConfig = (correctAnswer) => {
  if (!isObject(correctAnswer)) {
    return {
      answers: [],
      caseSensitive: false,
    };
  }

  return {
    answers: Array.isArray(correctAnswer.answers)
      ? correctAnswer.answers.map((answer) => normalizeCaseSensitiveAnswerString(answer)).filter(Boolean)
      : [],
    caseSensitive: Boolean(correctAnswer.case_sensitive),
  };
};

const gradeMatchFollowing = (studentAnswer, correctAnswer) => {
  const studentPairs = extractMatchPairs(studentAnswer);
  if (studentPairs.length === 0) {
    return { isCorrect: false, isUnattempted: true };
  }

  const correctPairs = extractMatchPairs(correctAnswer);
  if (correctPairs.length === 0) {
    return { isCorrect: false, isUnattempted: false };
  }

  const studentNormalized = [...new Set(studentPairs.map((pair) => `${pair.left_id}=>${pair.right_id}`))].sort();
  const correctNormalized = [...new Set(correctPairs.map((pair) => `${pair.left_id}=>${pair.right_id}`))].sort();

  const isExactMatch = studentNormalized.length === correctNormalized.length &&
    studentNormalized.every((pair, index) => pair === correctNormalized[index]);

  return {
    isCorrect: isExactMatch,
    isUnattempted: false,
  };
};

const gradeFillInBlank = (studentAnswer, correctAnswer) => {
  const studentBlanks = extractFillBlankValues(studentAnswer);
  const answeredBlanks = studentBlanks.filter((item) => normalizeAnswerString(item.value).length > 0);

  if (answeredBlanks.length === 0) {
    return { isCorrect: false, isUnattempted: true };
  }

  const correctBlanks = isObject(correctAnswer) && Array.isArray(correctAnswer.blanks)
    ? correctAnswer.blanks
      .map((item) => {
        if (!isObject(item)) return null;
        return {
          id: normalizeToken(item.id),
          answers: Array.isArray(item.answers)
            ? item.answers.map((answer) => normalizeAnswerString(answer)).filter(Boolean)
            : [],
        };
      })
      .filter((item) => item && item.id)
    : [];

  if (correctBlanks.length === 0) {
    return { isCorrect: false, isUnattempted: false };
  }

  const studentMap = new Map(studentBlanks.map((item) => [item.id, normalizeAnswerString(item.value)]));

  const allCorrect = correctBlanks.every((blank) => {
    const studentValue = studentMap.get(blank.id) ?? "";
    if (!studentValue) return false;
    return blank.answers.includes(studentValue);
  });

  return {
    isCorrect: allCorrect,
    isUnattempted: false,
  };
};

const gradeShortAnswer = (studentAnswer, correctAnswer) => {
  const studentValue = normalizeCaseSensitiveAnswerString(extractSingleValue(studentAnswer));
  if (!studentValue) {
    return { isCorrect: false, isUnattempted: true };
  }

  const { answers, caseSensitive } = extractShortAnswerConfig(correctAnswer);
  if (answers.length === 0) {
    return { isCorrect: false, isUnattempted: false };
  }

  const normalizedStudentValue = caseSensitive
    ? studentValue
    : normalizeAnswerString(studentValue);
  const isCorrect = answers.some((answer) =>
    (caseSensitive ? answer : normalizeAnswerString(answer)) === normalizedStudentValue
  );

  return {
    isCorrect,
    isUnattempted: false,
  };
};

// ============================================
// Task 4: Grading Orchestrator + Totals
// ============================================

const gradeAttempt = async (client, attemptId) => {
  // Fetch all responses with question/section scoring metadata
  const responsesRes = await client.query(
    `SELECT 
       er.id,
       er.question_id,
       er.section_id,
       er.student_answer,
       q.question_type,
       q.correct_answer,
       q.scoring_mode,
       q.marks_positive,
       q.marks_negative,
       eq.marks_override,
       eq.negative_override,
       es.marks_per_question,
       es.negative_marks
     FROM exam_responses er
     JOIN questions q ON er.question_id = q.id
     JOIN exam_questions eq ON er.question_id = eq.question_id AND er.section_id = eq.section_id
     JOIN exam_sections es ON er.section_id = es.id
     WHERE er.attempt_id = $1`,
    [attemptId]
  );

  const responses = responsesRes.rows;
  let totalScore = 0;
  let totalCorrect = 0;
  let totalWrong = 0;
  let totalUnattempted = 0;

  // Grade each response
  for (const response of responses) {
    const {
      id: responseId,
      question_type: questionType,
      student_answer: studentAnswer,
      correct_answer: correctAnswer,
      scoring_mode: scoringMode,
      marks_positive: markPositive,
      marks_negative: markNegative,
      marks_override: marksOverride,
      negative_override: negativeOverride,
      marks_per_question: markPerQuestion,
      negative_marks: negativeMarks
    } = response;

    // Mark source resolution: override → section default → question default
    const posMarks = marksOverride !== null
      ? toFiniteNumber(marksOverride, 0)
      : (markPerQuestion !== null
        ? toFiniteNumber(markPerQuestion, 0)
        : (markPositive !== null ? toFiniteNumber(markPositive, 0) : 0));

    const rawNegMarks = negativeOverride !== null
      ? toFiniteNumber(negativeOverride, 0)
      : (negativeMarks !== null
        ? toFiniteNumber(negativeMarks, 0)
        : (markNegative !== null ? toFiniteNumber(markNegative, 0) : 0));
    const negMarks = Math.abs(rawNegMarks);

    let isCorrect = false;
    let isUnattempted = false;
    let marksAwarded = 0;
    let outcome = 'wrong';

    // Grade based on question type
    switch (questionType) {
      case 'mcq_single': {
        const result = gradeMCQSingle(studentAnswer, correctAnswer);
        isCorrect = result.isCorrect;
        isUnattempted = result.isUnattempted;
        outcome = isUnattempted ? 'unattempted' : (isCorrect ? 'correct' : 'wrong');
        break;
      }
      case 'mcq_multiple': {
        const result = gradeMCQMultiple(studentAnswer, correctAnswer, {
          scoringMode,
          posMarks,
        });
        isCorrect = result.isCorrect;
        isUnattempted = result.isUnattempted;
        outcome = result.outcome ?? (isUnattempted ? 'unattempted' : (isCorrect ? 'correct' : 'wrong'));
        if (result.marksAwarded !== undefined) {
          marksAwarded = result.marksAwarded;
        }
        break;
      }
      case 'numerical': {
        const result = gradeNumerical(studentAnswer, correctAnswer);
        isCorrect = result.isCorrect;
        isUnattempted = result.isUnattempted;
        outcome = isUnattempted ? 'unattempted' : (isCorrect ? 'correct' : 'wrong');
        break;
      }
      case 'true_false': {
        const result = gradeTrueFalse(studentAnswer, correctAnswer);
        isCorrect = result.isCorrect;
        isUnattempted = result.isUnattempted;
        outcome = isUnattempted ? 'unattempted' : (isCorrect ? 'correct' : 'wrong');
        break;
      }
      case 'integer': {
        const result = gradeInteger(studentAnswer, correctAnswer);
        isCorrect = result.isCorrect;
        isUnattempted = result.isUnattempted;
        outcome = isUnattempted ? 'unattempted' : (isCorrect ? 'correct' : 'wrong');
        break;
      }
      case 'match_following': {
        const result = gradeMatchFollowing(studentAnswer, correctAnswer);
        isCorrect = result.isCorrect;
        isUnattempted = result.isUnattempted;
        outcome = isUnattempted ? 'unattempted' : (isCorrect ? 'correct' : 'wrong');
        break;
      }
      case 'fill_in_blank': {
        const result = gradeFillInBlank(studentAnswer, correctAnswer);
        isCorrect = result.isCorrect;
        isUnattempted = result.isUnattempted;
        outcome = isUnattempted ? 'unattempted' : (isCorrect ? 'correct' : 'wrong');
        break;
      }
      case 'short_answer': {
        const result = gradeShortAnswer(studentAnswer, correctAnswer);
        isCorrect = result.isCorrect;
        isUnattempted = result.isUnattempted;
        outcome = isUnattempted ? 'unattempted' : (isCorrect ? 'correct' : 'wrong');
        break;
      }
      default:
        // Skip unsupported types for MVP
        continue;
    }

    // Calculate marks awarded
    if (outcome === 'partial') {
      totalScore += marksAwarded;
    } else if (isUnattempted) {
      marksAwarded = 0;
      totalUnattempted++;
    } else if (isCorrect) {
      marksAwarded = posMarks;
      totalCorrect++;
    } else {
      // Negative marking only on wrong (not unattempted)
      marksAwarded = -negMarks;
      totalWrong++;
      outcome = 'wrong';
    }

    if (outcome !== 'partial') {
      totalScore += marksAwarded;
    }

    // Update response with grading results
    await client.query(
      `UPDATE exam_responses
       SET is_correct = $1, marks_awarded = $2
       WHERE id = $3`,
      [isCorrect, marksAwarded, responseId]
    );
  }

  // Round final score to 2 decimal places
  const finalScore = Math.round(totalScore * 100) / 100;

  // Update attempt with final totals
  await client.query(
    `UPDATE exam_attempts
     SET status = 'graded',
         total_score = $1,
         total_correct = $2,
         total_wrong = $3,
         total_unattempted = $4
     WHERE id = $5`,
    [finalScore, totalCorrect, totalWrong, totalUnattempted, attemptId]
  );
};

export const sweepExpiredInProgressAttempts = async ({ batchSize = 100 } = {}) => {
  const normalizedBatchSize = Number.isInteger(batchSize) && batchSize > 0 ? batchSize : 100;
  const result = await dbQuery(
    `
      SELECT ea.id
      FROM exam_attempts ea
      JOIN exams e ON e.id = ea.exam_id
      WHERE ea.status = 'in_progress'
        AND (
          (
            e.total_duration_minutes IS NOT NULL
            AND e.total_duration_minutes > 0
            AND ea.started_at + (e.total_duration_minutes || ' minutes')::interval <= NOW()
          )
          OR (e.end_datetime IS NOT NULL AND e.end_datetime <= NOW())
        )
      ORDER BY ea.started_at ASC
      LIMIT $1
    `,
    [normalizedBatchSize]
  );

  let finalizedCount = 0;
  for (const row of result.rows) {
    try {
      await ensureAttemptFinalized({ attemptId: Number(row.id) });
      finalizedCount += 1;
    } catch (error) {
      console.error("Attempt sweep finalize error:", error);
    }
  }

  return {
    scanned: result.rows.length,
    finalized: finalizedCount,
  };
};

const parseCronBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

export const startAttemptExpiryCron = (intervalMs = Number(process.env.EXAM_ATTEMPT_SWEEP_INTERVAL_MS || 30000)) => {
  if (attemptSweepTimer) {
    return () => { };
  }

  const cronEnabled = parseCronBoolean(
    process.env.EXAM_ATTEMPT_SWEEP_ENABLED,
    false
  );
  if (!cronEnabled) {
    console.log('Attempt expiry cron disabled');
    return () => { };
  }

  const normalizedInterval = Number.isFinite(intervalMs) && intervalMs >= 5000 ? Math.floor(intervalMs) : 30000;
  const runOnStart = parseCronBoolean(
    process.env.EXAM_ATTEMPT_SWEEP_RUN_ON_START,
    false
  );
  const batchSize = Number.parseInt(process.env.EXAM_ATTEMPT_SWEEP_BATCH_SIZE || '25', 10);
  const normalizedBatchSize = Number.isFinite(batchSize) && batchSize > 0 ? batchSize : 25;

  const runSweep = async () => {
    if (attemptSweepInProgress) return;
    attemptSweepInProgress = true;
    try {
      await sweepExpiredInProgressAttempts({ batchSize: normalizedBatchSize });
    } catch (error) {
      console.error("Attempt expiry cron error:", error);
    } finally {
      attemptSweepInProgress = false;
    }
  };

  if (runOnStart) {
    void runSweep();
  }

  attemptSweepTimer = setInterval(() => {
    void runSweep();
  }, normalizedInterval);

  if (typeof attemptSweepTimer.unref === "function") {
    attemptSweepTimer.unref();
  }

  return () => {
    if (attemptSweepTimer) {
      clearInterval(attemptSweepTimer);
      attemptSweepTimer = null;
    }
  };
};


