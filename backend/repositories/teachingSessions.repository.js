import { query as dbQuery } from './db.repository.js';

const execute = (executor, text, params) => (executor ? executor.query(text, params) : dbQuery(text, params));

export const listTrackerProgramsForPlatform = () =>
  dbQuery(
    `
    SELECT id, name, code, client_id, is_active
    FROM programs
    WHERE COALESCE(is_active, TRUE) = TRUE
    ORDER BY name ASC
    `
  );

export const listTrackerProgramsForClient = (clientId) =>
  dbQuery(
    `
    SELECT DISTINCT p.id, p.name, p.code, p.client_id, p.is_active
    FROM programs p
    JOIN client_entitlements ce
      ON ce.program_id = p.id
     AND ce.entitlement_type = 'program'
     AND ce.enabled = TRUE
    WHERE ce.client_id = $1
      AND COALESCE(p.is_active, TRUE) = TRUE
      AND EXISTS (
        SELECT 1
        FROM client_entitlements feature
        WHERE feature.client_id = ce.client_id
          AND feature.entitlement_type = 'feature'
          AND feature.feature_key = 'teacher_session_tracker'
          AND feature.enabled = TRUE
      )
    ORDER BY p.name ASC
    `,
    [clientId]
  );

export const listTrackerGradesForPlatform = (programId) =>
  dbQuery(
    `
    SELECT g.id, g.program_id, g.grade_number, g.is_active
    FROM grades g
    JOIN programs p ON p.id = g.program_id
    WHERE g.program_id = $1
      AND COALESCE(g.is_active, TRUE) = TRUE
      AND COALESCE(p.is_active, TRUE) = TRUE
    ORDER BY g.grade_number ASC
    `,
    [programId]
  );

export const listTrackerGradesForClient = (clientId, programId) =>
  dbQuery(
    `
    SELECT DISTINCT g.id, g.program_id, g.grade_number, g.is_active
    FROM grades g
    JOIN programs p ON p.id = g.program_id
    JOIN client_entitlements ce
      ON ce.program_id = p.id
     AND ce.entitlement_type = 'program'
     AND ce.enabled = TRUE
    WHERE ce.client_id = $1
      AND g.program_id = $2
      AND COALESCE(g.is_active, TRUE) = TRUE
      AND COALESCE(p.is_active, TRUE) = TRUE
      AND EXISTS (
        SELECT 1
        FROM client_entitlements feature
        WHERE feature.client_id = ce.client_id
          AND feature.entitlement_type = 'feature'
          AND feature.feature_key = 'teacher_session_tracker'
          AND feature.enabled = TRUE
      )
    ORDER BY g.grade_number ASC
    `,
    [clientId, programId]
  );

export const listTrackerSubjectsForPlatform = (programId, gradeId) =>
  dbQuery(
    `
    SELECT s.id, s.grade_id, g.program_id, s.name, s.code, s.is_active
    FROM subjects s
    JOIN grades g ON g.id = s.grade_id
    JOIN programs p ON p.id = g.program_id
    WHERE g.program_id = $1
      AND s.grade_id = $2
      AND COALESCE(s.is_active, TRUE) = TRUE
      AND COALESCE(g.is_active, TRUE) = TRUE
      AND COALESCE(p.is_active, TRUE) = TRUE
    ORDER BY s.display_order ASC, s.name ASC
    `,
    [programId, gradeId]
  );

export const listTrackerSubjectsForClient = (clientId, programId, gradeId) =>
  dbQuery(
    `
    SELECT subject_options.id,
           subject_options.grade_id,
           subject_options.program_id,
           subject_options.name,
           subject_options.code,
           subject_options.is_active
    FROM (
      SELECT DISTINCT s.id,
             s.grade_id,
             g.program_id,
             s.name,
             s.code,
             s.is_active,
             s.display_order
      FROM subjects s
      JOIN grades g ON g.id = s.grade_id
      JOIN programs p ON p.id = g.program_id
      JOIN client_entitlements ce
        ON ce.program_id = p.id
       AND ce.entitlement_type = 'program'
       AND ce.enabled = TRUE
      WHERE ce.client_id = $1
        AND g.program_id = $2
        AND s.grade_id = $3
        AND COALESCE(s.is_active, TRUE) = TRUE
        AND COALESCE(g.is_active, TRUE) = TRUE
        AND COALESCE(p.is_active, TRUE) = TRUE
        AND EXISTS (
          SELECT 1
          FROM client_entitlements feature
          WHERE feature.client_id = ce.client_id
            AND feature.entitlement_type = 'feature'
            AND feature.feature_key = 'teacher_session_tracker'
            AND feature.enabled = TRUE
        )
    ) AS subject_options
    ORDER BY subject_options.display_order ASC, subject_options.name ASC
    `,
    [clientId, programId, gradeId]
  );

export const fetchTrackerGradeContext = (gradeId) =>
  dbQuery(
    `
    SELECT g.id, g.program_id, g.grade_number, g.is_active, p.client_id
    FROM grades g
    JOIN programs p ON p.id = g.program_id
    WHERE g.id = $1
    LIMIT 1
    `,
    [gradeId]
  );

export const fetchTrackerSubjectContext = (subjectId) =>
  dbQuery(
    `
    SELECT s.id, s.grade_id, s.name, s.code, s.client_id, s.is_active, g.program_id
    FROM subjects s
    JOIN grades g ON g.id = s.grade_id
    WHERE s.id = $1
    LIMIT 1
    `,
    [subjectId]
  );

export const insertMicroScheduleUpload = (executor, payload) =>
  execute(
    executor,
    `
    INSERT INTO program_micro_schedule_uploads
    (program_id, grade_id, subject_id, uploaded_by_user_id, file_name, file_storage_path, version_no, status, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
    `,
    [
      payload.programId,
      payload.gradeId,
      payload.subjectId,
      payload.uploadedByUserId,
      payload.fileName,
      payload.fileStoragePath,
      payload.versionNo,
      payload.status,
      payload.notes,
    ]
  );

export const insertMicroScheduleRow = (executor, payload) =>
  execute(
    executor,
    `
    INSERT INTO program_micro_schedule_rows
    (micro_schedule_upload_id, program_id, row_no, serial_no, grade_label, subject_label, session_label, session_no, chapter_label, learning_goal, topic_label, raw_row_json, normalized_key)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING *
    `,
    [
      payload.microScheduleUploadId,
      payload.programId,
      payload.rowNo,
      payload.serialNo,
      payload.gradeLabel,
      payload.subjectLabel,
      payload.sessionLabel,
      payload.sessionNo,
      payload.chapterLabel,
      payload.learningGoal,
      payload.topicLabel,
      payload.rawRowJson,
      payload.normalizedKey,
    ]
  );

export const listMicroScheduleUploads = ({ programId = null, gradeId = null, subjectId = null }) =>
  dbQuery(
    `
    SELECT u.id, u.program_id, u.grade_id, u.subject_id, u.uploaded_by_user_id, u.file_name, u.file_storage_path, u.version_no, u.status, u.notes, u.created_at, u.updated_at,
           g.grade_number,
           s.name AS subject_name,
           s.code AS subject_code
    FROM program_micro_schedule_uploads u
    LEFT JOIN grades g ON g.id = u.grade_id
    LEFT JOIN subjects s ON s.id = u.subject_id
    WHERE ($1::int IS NULL OR u.program_id = $1)
      AND ($2::int IS NULL OR u.grade_id = $2)
      AND ($3::int IS NULL OR u.subject_id = $3)
    ORDER BY u.created_at DESC
    `,
    [programId, gradeId, subjectId]
  );

export const fetchMicroScheduleUploadById = (id) =>
  dbQuery(
    `
    SELECT u.*, g.grade_number, s.name AS subject_name, s.code AS subject_code
    FROM program_micro_schedule_uploads u
    LEFT JOIN grades g ON g.id = u.grade_id
    LEFT JOIN subjects s ON s.id = u.subject_id
    WHERE u.id = $1
    LIMIT 1
    `,
    [id]
  );

export const fetchMicroScheduleRowsByUploadId = (uploadId) =>
  dbQuery(
    `
    SELECT *
    FROM program_micro_schedule_rows
    WHERE micro_schedule_upload_id = $1
    ORDER BY row_no ASC
    `,
    [uploadId]
  );

export const insertLessonPlannerUpload = (executor, payload) =>
  execute(
    executor,
    `
    INSERT INTO program_lesson_planner_uploads
    (program_id, grade_id, subject_id, uploaded_by_user_id, file_name, file_storage_path, source_type, version_no, status, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
    `,
    [
      payload.programId,
      payload.gradeId,
      payload.subjectId,
      payload.uploadedByUserId,
      payload.fileName,
      payload.fileStoragePath,
      payload.sourceType,
      payload.versionNo,
      payload.status,
      payload.notes,
    ]
  );

export const insertLessonPlannerSession = (executor, payload) =>
  execute(
    executor,
    `
    INSERT INTO program_lesson_planner_sessions
    (lesson_planner_upload_id, program_id, session_no, session_label, part_type, duration_minutes, title, chapter_label, topic_label, learning_objectives, materials_needed, worksheet_questions_covered, shortcuts_introduced, common_errors_addressed, homework, next_session_preview, pedagogy_note, minute_plan_json, teacher_script_text, raw_source_json, normalized_key)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
    RETURNING *
    `,
    [
      payload.lessonPlannerUploadId,
      payload.programId,
      payload.sessionNo,
      payload.sessionLabel,
      payload.partType,
      payload.durationMinutes,
      payload.title,
      payload.chapterLabel,
      payload.topicLabel,
      payload.learningObjectives,
      payload.materialsNeeded,
      payload.worksheetQuestionsCovered,
      payload.shortcutsIntroduced,
      payload.commonErrorsAddressed,
      payload.homework,
      payload.nextSessionPreview,
      payload.pedagogyNote,
      payload.minutePlanJson,
      payload.teacherScriptText,
      payload.rawSourceJson,
      payload.normalizedKey,
    ]
  );

export const listLessonPlannerUploads = ({ programId = null, gradeId = null, subjectId = null }) =>
  dbQuery(
    `
    SELECT u.id, u.program_id, u.grade_id, u.subject_id, u.uploaded_by_user_id, u.file_name, u.file_storage_path, u.source_type, u.version_no, u.status, u.notes, u.created_at, u.updated_at,
           g.grade_number,
           s.name AS subject_name,
           s.code AS subject_code
    FROM program_lesson_planner_uploads u
    LEFT JOIN grades g ON g.id = u.grade_id
    LEFT JOIN subjects s ON s.id = u.subject_id
    WHERE ($1::int IS NULL OR u.program_id = $1)
      AND ($2::int IS NULL OR u.grade_id = $2)
      AND ($3::int IS NULL OR u.subject_id = $3)
    ORDER BY u.created_at DESC
    `,
    [programId, gradeId, subjectId]
  );

export const fetchLessonPlannerUploadById = (id) =>
  dbQuery(
    `
    SELECT u.*, g.grade_number, s.name AS subject_name, s.code AS subject_code
    FROM program_lesson_planner_uploads u
    LEFT JOIN grades g ON g.id = u.grade_id
    LEFT JOIN subjects s ON s.id = u.subject_id
    WHERE u.id = $1
    LIMIT 1
    `,
    [id]
  );

export const fetchLessonPlannerSessionsByUploadId = (uploadId) =>
  dbQuery(
    `
    SELECT *
    FROM program_lesson_planner_sessions
    WHERE lesson_planner_upload_id = $1
    ORDER BY session_no ASC, part_type ASC
    `,
    [uploadId]
  );

export const deleteProgramSessionTemplatesByVersion = (executor, { programId, templateVersionNo }) =>
  execute(
    executor,
    `DELETE FROM program_session_templates WHERE program_id = $1 AND template_version_no = $2`,
    [programId, templateVersionNo]
  );

export const insertProgramSessionTemplate = (executor, payload) =>
  execute(
    executor,
    `
    INSERT INTO program_session_templates
    (program_id, template_version_no, grade_label, subject_label, session_no, session_label, chapter_label, learning_goal, topic_label, planner_title, part_type, duration_minutes, learning_objectives, materials_needed, worksheet_questions_covered, shortcuts_introduced, common_errors_addressed, homework, next_session_preview, pedagogy_note, minute_plan_json, teacher_script_text, micro_schedule_row_id, lesson_planner_session_id, mapping_status, issue_details, is_published, published_by_user_id, published_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)
    RETURNING *
    `,
    [
      payload.programId,
      payload.templateVersionNo,
      payload.gradeLabel,
      payload.subjectLabel,
      payload.sessionNo,
      payload.sessionLabel,
      payload.chapterLabel,
      payload.learningGoal,
      payload.topicLabel,
      payload.plannerTitle,
      payload.partType,
      payload.durationMinutes,
      payload.learningObjectives,
      payload.materialsNeeded,
      payload.worksheetQuestionsCovered,
      payload.shortcutsIntroduced,
      payload.commonErrorsAddressed,
      payload.homework,
      payload.nextSessionPreview,
      payload.pedagogyNote,
      payload.minutePlanJson,
      payload.teacherScriptText,
      payload.microScheduleRowId,
      payload.lessonPlannerSessionId,
      payload.mappingStatus,
      payload.issueDetails,
      payload.isPublished,
      payload.publishedByUserId,
      payload.publishedAt,
    ]
  );

export const listProgramSessionTemplates = ({ programId, templateVersionNo = null, includeUnpublished = true }) =>
  dbQuery(
    `
    SELECT *
    FROM program_session_templates
    WHERE program_id = $1
      AND ($2::int IS NULL OR template_version_no = $2)
      AND ($3::boolean = TRUE OR is_published = TRUE)
    ORDER BY template_version_no DESC, session_no ASC, id ASC
    `,
    [programId, templateVersionNo, includeUnpublished]
  );

export const publishProgramSessionTemplates = (executor, { programId, templateVersionNo, publishedByUserId }) =>
  execute(
    executor,
    `
    UPDATE program_session_templates
    SET is_published = TRUE,
        published_by_user_id = $3,
        published_at = NOW(),
        updated_at = NOW()
    WHERE program_id = $1
      AND template_version_no = $2
      AND mapping_status = 'matched'
    RETURNING *
    `,
    [programId, templateVersionNo, publishedByUserId]
  );

export const upsertClientEntitlement = (payload) =>
  dbQuery(
    `
    INSERT INTO client_entitlements
    (client_id, entitlement_type, feature_key, program_id, enabled, assigned_by_user_id, assigned_at)
    VALUES ($1,$2,$3,$4,$5,$6,NOW())
    RETURNING *
    `,
    [
      payload.clientId,
      payload.entitlementType,
      payload.featureKey,
      payload.programId,
      payload.enabled,
      payload.assignedByUserId,
    ]
  );

export const updateClientEntitlement = ({ id, enabled }) =>
  dbQuery(
    `
    UPDATE client_entitlements
    SET enabled = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
    `,
    [enabled, id]
  );

export const listClientEntitlements = ({ clientId = null }) =>
  dbQuery(
    `
    SELECT *
    FROM client_entitlements
    WHERE ($1::int IS NULL OR client_id = $1)
    ORDER BY assigned_at DESC, id DESC
    `,
    [clientId]
  );

export const fetchClientEntitlementById = (id) =>
  dbQuery(`SELECT * FROM client_entitlements WHERE id = $1 LIMIT 1`, [id]);

export const fetchClientFeatureEntitlement = ({ clientId, featureKey }) =>
  dbQuery(
    `
    SELECT *
    FROM client_entitlements
    WHERE client_id = $1
      AND entitlement_type = 'feature'
      AND feature_key = $2
      AND enabled = TRUE
    ORDER BY id DESC
    LIMIT 1
    `,
    [clientId, featureKey]
  );

export const fetchClientProgramEntitlement = ({ clientId, programId }) =>
  dbQuery(
    `
    SELECT *
    FROM client_entitlements
    WHERE client_id = $1
      AND entitlement_type = 'program'
      AND program_id = $2
      AND enabled = TRUE
    ORDER BY id DESC
    LIMIT 1
    `,
    [clientId, programId]
  );

export const fetchProgramTemplatesForVersion = ({ programId, templateVersionNo }) =>
  dbQuery(
    `
    SELECT *
    FROM program_session_templates
    WHERE program_id = $1
      AND template_version_no = $2
      AND is_published = TRUE
      AND mapping_status = 'matched'
    ORDER BY session_no ASC, id ASC
    `,
    [programId, templateVersionNo]
  );

export const insertTeachingSession = (executor, payload) =>
  execute(
    executor,
    `
    INSERT INTO teaching_sessions
    (client_id, school_id, batch_id, program_id, program_session_template_id, grade_label, subject_label, chapter_label, session_no, session_label, part_type, planned_date, period_slot, duration_minutes, teacher_user_id, learning_goal, topic_label, planner_title, learning_objectives, materials_needed, worksheet_questions_covered, shortcuts_introduced, common_errors_addressed, homework, next_session_preview, pedagogy_note, minute_plan_json, teacher_script_text, status, completion_percentage, actual_date, topics_covered, pending_topics, reason_code, remarks, last_updated_by_user_id, last_updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37)
    RETURNING *
    `,
    [
      payload.clientId,
      payload.schoolId,
      payload.batchId,
      payload.programId,
      payload.programSessionTemplateId,
      payload.gradeLabel,
      payload.subjectLabel,
      payload.chapterLabel,
      payload.sessionNo,
      payload.sessionLabel,
      payload.partType,
      payload.plannedDate,
      payload.periodSlot,
      payload.durationMinutes,
      payload.teacherUserId,
      payload.learningGoal,
      payload.topicLabel,
      payload.plannerTitle,
      payload.learningObjectives,
      payload.materialsNeeded,
      payload.worksheetQuestionsCovered,
      payload.shortcutsIntroduced,
      payload.commonErrorsAddressed,
      payload.homework,
      payload.nextSessionPreview,
      payload.pedagogyNote,
      payload.minutePlanJson,
      payload.teacherScriptText,
      payload.status,
      payload.completionPercentage,
      payload.actualDate,
      payload.topicsCovered,
      payload.pendingTopics,
      payload.reasonCode,
      payload.remarks,
      payload.lastUpdatedByUserId,
      payload.lastUpdatedAt,
    ]
  );

export const listTeachingSessions = ({ whereSql = '1=1', params = [] }) =>
  dbQuery(
    `
    SELECT ts.*,
           s.name AS school_name,
           u.full_name AS teacher_name
    FROM teaching_sessions ts
    LEFT JOIN schools s ON s.id = ts.school_id
    LEFT JOIN users u ON u.id = ts.teacher_user_id
    WHERE ${whereSql}
    ORDER BY ts.planned_date ASC, ts.session_no ASC, ts.id ASC
    `,
    params
  );

export const fetchTeachingSessionById = (id) =>
  dbQuery(`SELECT * FROM teaching_sessions WHERE id = $1 LIMIT 1`, [id]);

export const updateTeachingSessionAssignment = ({ id, fields }) => {
  const updates = [];
  const params = [];

  const assign = (column, value) => {
    if (value === undefined) return;
    updates.push(`${column} = $${params.length + 1}`);
    params.push(value);
  };

  assign('school_id', fields.schoolId);
  assign('batch_id', fields.batchId);
  assign('teacher_user_id', fields.teacherUserId);
  assign('planned_date', fields.plannedDate);
  assign('period_slot', fields.periodSlot);
  assign('duration_minutes', fields.durationMinutes);
  assign('remarks', fields.remarks);
  assign('updated_at', new Date());

  if (updates.length === 0) {
    return fetchTeachingSessionById(id);
  }

  params.push(id);
  return dbQuery(
    `
    UPDATE teaching_sessions
    SET ${updates.join(', ')}
    WHERE id = $${params.length}
    RETURNING *
    `,
    params
  );
};

export const insertTeacherSessionTrackerPermission = (payload) =>
  dbQuery(
    `
    INSERT INTO teacher_session_tracker_permissions
    (client_id, teacher_user_id, school_id, batch_id, program_id, can_view_tracker, can_update_tracker, granted_by_user_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *
    `,
    [
      payload.clientId,
      payload.teacherUserId,
      payload.schoolId,
      payload.batchId,
      payload.programId,
      payload.canViewTracker,
      payload.canUpdateTracker,
      payload.grantedByUserId,
    ]
  );

export const listTeacherSessionTrackerPermissions = ({ clientId = null, teacherUserId = null }) =>
  dbQuery(
    `
    SELECT tsp.*,
           c.name AS client_name,
           u.full_name AS teacher_name,
           s.name AS school_name,
           b.name AS batch_name,
           p.name AS program_name,
           p.code AS program_code
    FROM teacher_session_tracker_permissions tsp
    LEFT JOIN clients c ON c.id = tsp.client_id
    LEFT JOIN users u ON u.id = tsp.teacher_user_id
    LEFT JOIN schools s ON s.id = tsp.school_id
    LEFT JOIN batches b ON b.id = tsp.batch_id
    LEFT JOIN programs p ON p.id = tsp.program_id
    WHERE ($1::int IS NULL OR tsp.client_id = $1)
      AND ($2::int IS NULL OR tsp.teacher_user_id = $2)
    ORDER BY tsp.created_at DESC
    `,
    [clientId, teacherUserId]
  );

export const deleteTeacherSessionTrackerPermission = (id) =>
  dbQuery(`DELETE FROM teacher_session_tracker_permissions WHERE id = $1 RETURNING id`, [id]);

export const fetchTeacherTrackerPermissionForSession = ({ clientId, teacherUserId, schoolId, batchId, programId }) =>
  dbQuery(
    `
    SELECT *
    FROM teacher_session_tracker_permissions
    WHERE client_id = $1
      AND teacher_user_id = $2
      AND (school_id IS NULL OR school_id = $3)
      AND (batch_id IS NULL OR batch_id = $4)
      AND (program_id IS NULL OR program_id = $5)
      AND can_view_tracker = TRUE
    ORDER BY
      CASE WHEN school_id IS NULL THEN 1 ELSE 0 END,
      CASE WHEN batch_id IS NULL THEN 1 ELSE 0 END,
      CASE WHEN program_id IS NULL THEN 1 ELSE 0 END,
      id DESC
    LIMIT 1
    `,
    [clientId, teacherUserId, schoolId, batchId, programId]
  );

export const insertTeachingSessionUpdate = (payload) =>
  dbQuery(
    `
    INSERT INTO teaching_session_updates
    (teaching_session_id, teacher_user_id, status_submitted, completion_percentage, actual_date, topics_covered, pending_topics, reason_code, remarks)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
    `,
    [
      payload.teachingSessionId,
      payload.teacherUserId,
      payload.statusSubmitted,
      payload.completionPercentage,
      payload.actualDate,
      payload.topicsCovered,
      payload.pendingTopics,
      payload.reasonCode,
      payload.remarks,
    ]
  );

export const listTeachingSessionUpdatesBySessionId = (teachingSessionId) =>
  dbQuery(
    `
    SELECT *
    FROM teaching_session_updates
    WHERE teaching_session_id = $1
    ORDER BY created_at DESC, id DESC
    `,
    [teachingSessionId]
  );

export const updateTeachingSessionProgress = ({ id, fields }) =>
  dbQuery(
    `
    UPDATE teaching_sessions
    SET status = $1,
        completion_percentage = $2,
        actual_date = $3,
        topics_covered = $4,
        pending_topics = $5,
        reason_code = $6,
        remarks = $7,
        last_updated_by_user_id = $8,
        last_updated_at = NOW(),
        updated_at = NOW()
    WHERE id = $9
    RETURNING *
    `,
    [
      fields.status,
      fields.completionPercentage,
      fields.actualDate,
      fields.topicsCovered,
      fields.pendingTopics,
      fields.reasonCode,
      fields.remarks,
      fields.lastUpdatedByUserId,
      id,
    ]
  );

export const fetchTeacherOwnedSession = ({ sessionId, teacherUserId }) =>
  dbQuery(
    `
    SELECT *
    FROM teaching_sessions
    WHERE id = $1
      AND teacher_user_id = $2
    LIMIT 1
    `,
    [sessionId, teacherUserId]
  );

export const fetchSchoolIdsForOwner = (userId) =>
  dbQuery(
    `
    SELECT school_id
    FROM school_memberships
    WHERE user_id = $1
      AND role_scope IN ('school_owner', 'admin')
      AND status = 'active'
    `,
    [userId]
  );

export const fetchAnalyticsSummary = ({ whereSql = '1=1', params = [] }) =>
  dbQuery(
    `
    SELECT
      COUNT(*)::int AS total_sessions,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_sessions,
      COUNT(*) FILTER (WHERE status = 'partially_completed')::int AS partial_sessions,
      COUNT(*) FILTER (WHERE status = 'not_completed')::int AS not_completed_sessions,
      COUNT(*) FILTER (WHERE status = 'update_pending')::int AS update_pending_sessions,
      COUNT(*) FILTER (WHERE status = 'lagging')::int AS lagging_sessions,
      COALESCE(ROUND(AVG(completion_percentage)::numeric, 2), 0) AS average_completion_percentage
    FROM teaching_sessions
    WHERE ${whereSql}
    `,
    params
  );
