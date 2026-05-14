import { getClient, query as dbQuery } from '../repositories/db.repository.js';
import { AppError, handleServiceError } from '../utils/errors.js';
import AdmZip from 'adm-zip';
import {
  parseNullableInt,
  parseRequiredInt,
  requireString,
  parseStringArray,
  parseStringArrayParam,
} from '../schemas/questions.schema.js';
import { load as loadHtml } from 'cheerio';
import {
  Document,
  ImageRun,
  Math as DocxMath,
  MathRun,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
} from 'docx';

const VALID_QUESTION_TYPES = [
  'mcq_single',
  'mcq_multiple',
  'comprehension',
  'numerical',
  'true_false',
  'short_answer',
  'match_following',
  'fill_in_blank',
];
const VALID_DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];
const VALID_STATUSES = ['draft', 'approved', 'rejected', 'archived'];
const VALID_SCORING_MODES = ['all_or_nothing', 'partial', 'mixed'];

const isSuperAdmin = (role) => role === 'super_admin';
const isPlatformAdmin = (role) => role === 'super_admin' || role === 'content_authorizer';
const isClientAdmin = (role) => role === 'client_admin';
const isSchoolOwner = (role) => role === 'school_owner';
const isTeacher = (role) => role === 'teacher';

const getQueryRunner = (queryRunner = dbQuery) =>
  typeof queryRunner === 'function' ? queryRunner : queryRunner.query.bind(queryRunner);

const fetchUserSchoolIds = async (userId, queryRunner = dbQuery) => {
  const runQuery = getQueryRunner(queryRunner);
  const result = await runQuery(
    `SELECT school_id FROM school_memberships WHERE user_id = $1 AND status = 'active'`,
    [userId]
  );
  return result.rows.map((row) => row.school_id);
};

const ensureClientScope = (clientId, role) => {
  if (isPlatformAdmin(role)) return null;
  if (!clientId) {
    throw new AppError('client_id is required for this role', 400);
  }
  return clientId;
};

const ensureSchoolAccess = async ({ schoolId, role, userId, clientId, queryRunner = dbQuery }) => {
  const runQuery = getQueryRunner(queryRunner);
  if (!schoolId) return null;
  const school = await runQuery(`SELECT id, client_id FROM schools WHERE id = $1`, [schoolId]);
  if (school.rows.length === 0) {
    throw new AppError('School not found', 404);
  }
  if (clientId && school.rows[0].client_id !== clientId) {
    throw new AppError('School does not belong to this client', 403);
  }
  if (isPlatformAdmin(role) || isClientAdmin(role)) return schoolId;

  const memberships = await fetchUserSchoolIds(userId, queryRunner);
  if (!memberships.includes(schoolId)) {
    throw new AppError('Access denied for this school', 403);
  }
  return schoolId;
};

const ensureCurriculumScope = async ({
  programId = null,
  gradeId = null,
  subjectId,
  chapterId,
  topicId,
  clientId,
  queryRunner = dbQuery,
}) => {
  const runQuery = getQueryRunner(queryRunner);
  if (!programId && !gradeId && !subjectId && !chapterId && !topicId) return;
  if (programId && !gradeId) {
    throw new AppError('grade_id is required when program_id is provided', 400);
  }
  if (gradeId && !subjectId) {
    throw new AppError('subject_id is required when grade_id is provided', 400);
  }
  if (chapterId && !subjectId) {
    throw new AppError('subject_id is required when chapter_id is provided', 400);
  }
  if (topicId && !chapterId) {
    throw new AppError('chapter_id is required when topic_id is provided', 400);
  }
  const subjectResult = await runQuery(
    `
    SELECT s.id, s.client_id, s.grade_id, g.program_id
    FROM subjects s
    LEFT JOIN grades g ON g.id = s.grade_id
    WHERE s.id = $1
    `,
    [subjectId]
  );
  if (subjectResult.rows.length === 0) throw new AppError('Subject not found', 404);
  if (clientId && subjectResult.rows[0].client_id !== clientId) {
    throw new AppError('Subject does not belong to this client', 403);
  }
  if (gradeId && Number(subjectResult.rows[0].grade_id) !== Number(gradeId)) {
    throw new AppError('Subject does not belong to the grade', 400);
  }
  if (programId && Number(subjectResult.rows[0].program_id) !== Number(programId)) {
    throw new AppError('Grade does not belong to the program', 400);
  }

  const chapterResult = await runQuery(
    `SELECT c.id, c.subject_id, s.client_id
     FROM chapters c
     JOIN subjects s ON s.id = c.subject_id
     WHERE c.id = $1`,
    [chapterId]
  );
  if (chapterResult.rows.length === 0) throw new AppError('Chapter not found', 404);
  if (chapterResult.rows[0].subject_id !== subjectId) {
    throw new AppError('Chapter does not belong to the subject', 400);
  }
  if (clientId && chapterResult.rows[0].client_id !== clientId) {
    throw new AppError('Chapter does not belong to this client', 403);
  }

  if (topicId) {
    const topicResult = await runQuery(
      `SELECT t.id, t.chapter_id, s.client_id
       FROM topics t
       JOIN chapters c ON c.id = t.chapter_id
       JOIN subjects s ON s.id = c.subject_id
       WHERE t.id = $1`,
      [topicId]
    );
    if (topicResult.rows.length === 0) throw new AppError('Topic not found', 404);
    if (topicResult.rows[0].chapter_id !== chapterId) {
      throw new AppError('Topic does not belong to the chapter', 400);
    }
    if (clientId && topicResult.rows[0].client_id !== clientId) {
      throw new AppError('Topic does not belong to this client', 403);
    }
  }
};

const buildQuestionWhere = async ({ user, query, includeArchived = false }) => {
  const role = user?.role;
  const clientId = ensureClientScope(user?.client_id ?? null, role);
  const conditions = [];
  const params = [];

  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (clientId) {
    conditions.push(`q.client_id = ${addParam(clientId)}`);
  }

  const isScopedBySchool = isTeacher(role) || isSchoolOwner(role);
  let schoolIds = [];
  if (isScopedBySchool) {
    schoolIds = await fetchUserSchoolIds(user.id);
    if (schoolIds.length > 0) {
      conditions.push(`(q.school_id IS NULL OR q.school_id = ANY(${addParam(schoolIds)}))`);
    } else {
      conditions.push(`q.school_id IS NULL`);
    }
  }

  const schoolIdFilter = parseNullableInt(query.school_id, 'school_id');
  if (schoolIdFilter) {
    if (isScopedBySchool && !schoolIds.includes(schoolIdFilter)) {
      throw new AppError('Access denied for this school', 403);
    }
    conditions.push(`q.school_id = ${addParam(schoolIdFilter)}`);
  }

  if (isTeacher(role)) {
    conditions.push(`(q.status = 'approved' OR q.created_by = ${addParam(user.id)})`);
  }

  const statusFilter = query.status ? String(query.status) : null;
  if (statusFilter) {
    if (!VALID_STATUSES.includes(statusFilter)) {
      throw new AppError('Invalid status filter', 400);
    }
    if (statusFilter === 'archived' && isTeacher(role)) {
      throw new AppError('Teachers cannot access archived questions', 403);
    }
    conditions.push(`q.status = ${addParam(statusFilter)}`);
  } else if (!includeArchived) {
    conditions.push(`q.status <> 'archived'`);
  }

  const subjectId = parseNullableInt(query.subject_id, 'subject_id');
  if (subjectId) conditions.push(`q.subject_id = ${addParam(subjectId)}`);

  const chapterId = parseNullableInt(query.chapter_id, 'chapter_id');
  if (chapterId) conditions.push(`q.chapter_id = ${addParam(chapterId)}`);

  const topicId = parseNullableInt(query.topic_id, 'topic_id');
  if (topicId) conditions.push(`q.topic_id = ${addParam(topicId)}`);

  const gradeId = parseNullableInt(query.grade_id, 'grade_id');
  if (gradeId) {
    conditions.push(
      `EXISTS (
        SELECT 1
        FROM subjects s
        WHERE s.id = q.subject_id AND s.grade_id = ${addParam(gradeId)}
      )`
    );
  }

  const programId = parseNullableInt(query.program_id, 'program_id');
  if (programId) {
    conditions.push(
      `EXISTS (
        SELECT 1
        FROM subjects s
        JOIN grades g ON g.id = s.grade_id
        WHERE s.id = q.subject_id AND g.program_id = ${addParam(programId)}
      )`
    );
  }

  if (query.question_type) {
    const type = String(query.question_type);
    if (!VALID_QUESTION_TYPES.includes(type)) {
      throw new AppError('Invalid question type filter', 400);
    }
    conditions.push(`q.question_type = ${addParam(type)}`);
  }

  if (query.difficulty_level) {
    const difficulty = String(query.difficulty_level);
    if (!VALID_DIFFICULTY_LEVELS.includes(difficulty)) {
      throw new AppError('Invalid difficulty filter', 400);
    }
    conditions.push(`q.difficulty_level = ${addParam(difficulty)}`);
  }

  if (query.folder_id !== undefined) {
    const schemaSupport = await getQuestionSchemaSupport();
    if (!schemaSupport.hasFolderId) {
      throw new AppError('This database does not support folder assignment on questions yet', 400);
    }
    const folderId = parseNullableInt(query.folder_id, 'folder_id');
    if (folderId) {
      const scopedFolderId = await ensureBulkFolderAccess({
        folderId,
        user,
        role,
        clientId,
      });
      conditions.push(`q.folder_id = ${addParam(scopedFolderId)}`);
    }
  }

  const createdBy = parseNullableInt(query.created_by, 'created_by');
  if (createdBy) conditions.push(`q.created_by = ${addParam(createdBy)}`);

  if (query.q) {
    const search = String(query.q).trim();
    if (search.length > 0) {
      conditions.push(
        `to_tsvector('simple', coalesce(q.question_text::text,'') || ' ' || coalesce(q.options::text,'')) @@ plainto_tsquery('simple', ${addParam(search)})`
      );
    }
  }

  const examTags = parseStringArrayParam(query.exam_tags, 'exam_tags');
  if (examTags.length > 0) {
    conditions.push(`q.exam_tags && ${addParam(examTags)}::text[]`);
  }

  return { conditions, params };
};

const coerceLooseValue = (value) => {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch (err) {
      return value;
    }
  }

  if (!Number.isNaN(Number(trimmed))) {
    return Number(trimmed);
  }

  return value;
};

const parseExamTagsInput = (value) => {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return parseStringArray(value, 'exam_tags');
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  throw new AppError('exam_tags must be an array or comma-separated string', 400);
};

const parseCategoryInput = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        return JSON.parse(trimmed);
      } catch (err) {
        throw new AppError('category must be valid JSON when provided as an object or array string', 400);
      }
    }
    return trimmed;
  }
  return value;
};

const parseOptionsInput = (value) => {
  if (value === undefined) return null;
  if (value === null) return null;
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    const coerced = coerceLooseValue(value);
    if (Array.isArray(coerced)) return coerced;

    return value
      .split('|')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .map((entry, index) => ({
        id: `opt-${index + 1}`,
        text: entry,
      }));
  }

  throw new AppError('options must be an array or pipe-delimited string', 400);
};

const parseNumberField = (value, fieldName, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new AppError(`${fieldName} must be a number`, 400);
  }
  return parsed;
};

const toDbJsonParam = (value) => {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const decodeXmlEntities = (value) =>
  String(value || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const parseCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  values.push(current);
  return values;
};

const parseCsvContent = (csvText) => {
  const lines = String(csvText || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new AppError('CSV must include a header row and at least one data row', 400);
  }

  const headers = parseCsvLine(lines[0]).map((header, index) => {
    const trimmed = header.trim().toLowerCase();
    if (index === 0) {
      return trimmed.replace(/^\uFEFF/, '');
    }
    return trimmed;
  });
  const rows = [];
  for (let index = 1; index < lines.length; index += 1) {
    const values = parseCsvLine(lines[index]);
    const row = {};
    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] ?? '';
    });
    rows.push(row);
  }

  return rows;
};

const BULK_CSV_HEADER_ALIASES = {
  sno: 'sno',
  serial_no: 'sno',
  serialno: 'sno',
  'serial no': 'sno',
  question: 'question_text',
  questiontext: 'question_text',
  'question text': 'question_text',
  type: 'question_type',
  questiontype: 'question_type',
  'question type': 'question_type',
  ans: 'correct_answer',
  answer: 'correct_answer',
  'correct answer': 'correct_answer',
  correctanswer: 'correct_answer',
  'correct option': 'correct_answer',
  correctoption: 'correct_answer',
  subject: 'subject_id',
  'subject id': 'subject_id',
  program: 'program_id',
  'program id': 'program_id',
  grade: 'grade_id',
  'grade id': 'grade_id',
  chapter: 'chapter_id',
  'chapter id': 'chapter_id',
  topic: 'topic_id',
  'topic id': 'topic_id',
  has_comprehension: 'has_comprehension',
  'has comprehension': 'has_comprehension',
  passage_key: 'passage_key',
  'passage key': 'passage_key',
  passage_title: 'passage_title',
  'passage title': 'passage_title',
  passage_content: 'passage_content',
  'passage content': 'passage_content',
  use_existing_passage_id: 'use_existing_passage_id',
  'use existing passage id': 'use_existing_passage_id',
  passage_action: 'passage_action',
  'passage action': 'passage_action',
  school: 'school_id',
  'school id': 'school_id',
  difficulty: 'difficulty_level',
  'difficulty level': 'difficulty_level',
  'marks+': 'marks_positive',
  marks_positive: 'marks_positive',
  marksplus: 'marks_positive',
  'marks-': 'marks_negative',
  marks_: 'marks_negative',
  marks_negative: 'marks_negative',
  marksminus: 'marks_negative',
  tags: 'exam_tags',
  'exam tags': 'exam_tags',
  category: 'category',
  catagory: 'category',
  comprehensive_subquestions: 'category',
  'option a': 'option_a',
  'option b': 'option_b',
  'option c': 'option_c',
  'option d': 'option_d',
  'option e': 'option_e',
  'option f': 'option_f',
  'option g': 'option_g',
  'option h': 'option_h',
  option1: 'option_1',
  option2: 'option_2',
  option3: 'option_3',
  option4: 'option_4',
  option5: 'option_5',
  option6: 'option_6',
  option7: 'option_7',
  option8: 'option_8',
};

const normalizeBulkHeaderKey = (key) =>
  String(key || '')
    .trim()
    .toLowerCase()
    .replace(/\uFEFF/g, '')
    .replace(/[-\s]+/g, '_');

const normalizeBulkQuestionType = (value) => {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  if (!raw) return '';

  if (VALID_QUESTION_TYPES.includes(raw)) return raw;
  if (['mcq', 'single', 'single_choice', 'singlechoice', 'single_select'].includes(raw)) {
    return 'mcq_single';
  }
  if (['multiple', 'multiple_choice', 'multiplechoice', 'multi_select', 'mcq_multi'].includes(raw)) {
    return 'mcq_multiple';
  }
  if (['comprehension', 'comprehension_based', 'passage_based'].includes(raw)) {
    return 'comprehension';
  }
  if (['numeric', 'integer', 'float'].includes(raw)) {
    return 'numerical';
  }
  if (['truefalse', 'tf', 'boolean'].includes(raw)) {
    return 'true_false';
  }

  return raw;
};

const getFileExtension = (filename = '') => {
  const normalized = String(filename || '').toLowerCase();
  const parts = normalized.split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1];
};

const getImageMimeType = (filename = '') => {
  const ext = getFileExtension(filename);
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'webp') return 'image/webp';
  return '';
};

const detectImageMimeTypeFromBuffer = (buffer, filename = '') => {
  const extensionMimeType = getImageMimeType(filename);
  if (extensionMimeType) return extensionMimeType;
  if (!buffer || buffer.length < 4) return 'image/png';

  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return 'image/jpeg';
  }

  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif';
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  const sniff = buffer.subarray(0, Math.min(buffer.length, 256)).toString('utf8').trimStart();
  if (sniff.startsWith('<svg') || sniff.startsWith('<?xml')) {
    return 'image/svg+xml';
  }

  return 'image/png';
};

const normalizeBulkDefaults = (source) => {
  const defaults = {};
  if (source?.default_program_id !== undefined && source.default_program_id !== '') {
    defaults.program_id = source.default_program_id;
  } else if (source?.program_id !== undefined && source.program_id !== '') {
    defaults.program_id = source.program_id;
  }

  if (source?.default_grade_id !== undefined && source.default_grade_id !== '') {
    defaults.grade_id = source.default_grade_id;
  } else if (source?.grade_id !== undefined && source.grade_id !== '') {
    defaults.grade_id = source.grade_id;
  }

  if (source?.default_subject_id !== undefined && source.default_subject_id !== '') {
    defaults.subject_id = source.default_subject_id;
  } else if (source?.subject_id !== undefined && source.subject_id !== '') {
    defaults.subject_id = source.subject_id;
  }

  if (source?.default_chapter_id !== undefined && source.default_chapter_id !== '') {
    defaults.chapter_id = source.default_chapter_id;
  } else if (source?.chapter_id !== undefined && source.chapter_id !== '') {
    defaults.chapter_id = source.chapter_id;
  }

  if (source?.default_topic_id !== undefined && source.default_topic_id !== '') {
    defaults.topic_id = source.default_topic_id;
  } else if (source?.topic_id !== undefined && source.topic_id !== '') {
    defaults.topic_id = source.topic_id;
  }

  if (source?.school_id !== undefined && source.school_id !== '') {
    defaults.school_id = source.school_id;
  }

  if (source?.difficulty_level !== undefined && source.difficulty_level !== '') {
    defaults.difficulty_level = source.difficulty_level;
  } else if (source?.difficulty !== undefined && source.difficulty !== '') {
    defaults.difficulty_level = source.difficulty;
  }

  if (source?.marks_positive !== undefined && source.marks_positive !== '') {
    defaults.marks_positive = source.marks_positive;
  }

  if (source?.marks_negative !== undefined && source.marks_negative !== '') {
    defaults.marks_negative = source.marks_negative;
  }

  if (source?.exam_tags !== undefined && source.exam_tags !== '') {
    defaults.exam_tags = source.exam_tags;
  } else if (source?.tags !== undefined && source.tags !== '') {
    defaults.exam_tags = source.tags;
  }

  if (source?.category !== undefined && source.category !== '') {
    defaults.category = source.category;
  } else if (source?.catagory !== undefined && source.catagory !== '') {
    defaults.category = source.catagory;
  }

  if (source?.status !== undefined && source.status !== '') {
    defaults.status = source.status;
  }

  if (source?.solution_video_url !== undefined && source.solution_video_url !== '') {
    defaults.solution_video_url = source.solution_video_url;
  }

  return defaults;
};

const applyBulkDefaults = (row, defaults) => {
  const merged = { ...row };
  const normalizeDifficultyToken = (value) => {
    const normalized = String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[_\s-]+/g, '_');
    if (normalized === 'easy') return 'easy';
    if (normalized === 'medium') return 'medium';
    if (normalized === 'hard') return 'hard';
    return null;
  };
  const normalizeExamTagsList = (value) => {
    if (value === undefined || value === null) return [];
    const splitTokens = (input) =>
      String(input || '')
        .split(/[,\|\;\u00b7\/]+/g)
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
    if (Array.isArray(value)) {
      return value.flatMap((tag) => splitTokens(tag));
    }
    if (typeof value === 'string') {
      return splitTokens(value);
    }
    return splitTokens(value);
  };
  if (
    (merged.program_id === undefined || merged.program_id === null || merged.program_id === '') &&
    defaults.program_id !== undefined
  ) {
    merged.program_id = defaults.program_id;
  }
  if (
    (merged.grade_id === undefined || merged.grade_id === null || merged.grade_id === '') &&
    defaults.grade_id !== undefined
  ) {
    merged.grade_id = defaults.grade_id;
  }
  if (
    (merged.subject_id === undefined || merged.subject_id === null || merged.subject_id === '') &&
    defaults.subject_id !== undefined
  ) {
    merged.subject_id = defaults.subject_id;
  }
  if (
    (merged.chapter_id === undefined || merged.chapter_id === null || merged.chapter_id === '') &&
    defaults.chapter_id !== undefined
  ) {
    merged.chapter_id = defaults.chapter_id;
  }
  if (
    (merged.topic_id === undefined || merged.topic_id === null || merged.topic_id === '') &&
    defaults.topic_id !== undefined
  ) {
    merged.topic_id = defaults.topic_id;
  }
  if (
    (merged.school_id === undefined || merged.school_id === null || merged.school_id === '') &&
    defaults.school_id !== undefined
  ) {
    merged.school_id = defaults.school_id;
  }
  if (
    (merged.difficulty_level === undefined || merged.difficulty_level === null || merged.difficulty_level === '') &&
    defaults.difficulty_level !== undefined
  ) {
    merged.difficulty_level = defaults.difficulty_level;
  }
  if (
    (merged.marks_positive === undefined || merged.marks_positive === null || merged.marks_positive === '') &&
    defaults.marks_positive !== undefined
  ) {
    merged.marks_positive = defaults.marks_positive;
  }
  if (
    (merged.marks_negative === undefined || merged.marks_negative === null || merged.marks_negative === '') &&
    defaults.marks_negative !== undefined
  ) {
    merged.marks_negative = defaults.marks_negative;
  }
  if (
    (merged.exam_tags === undefined || merged.exam_tags === null || merged.exam_tags === '') &&
    defaults.exam_tags !== undefined
  ) {
    merged.exam_tags = defaults.exam_tags;
  }
  if (
    (merged.category === undefined || merged.category === null || merged.category === '') &&
    defaults.category !== undefined
  ) {
    merged.category = defaults.category;
  }
  if (
    (merged.status === undefined || merged.status === null || merged.status === '') &&
    defaults.status !== undefined
  ) {
    merged.status = defaults.status;
  }
  if (
    (merged.solution_video_url === undefined || merged.solution_video_url === null || merged.solution_video_url === '') &&
    defaults.solution_video_url !== undefined
  ) {
    merged.solution_video_url = defaults.solution_video_url;
  }

  const explicitDifficulty = normalizeDifficultyToken(merged.difficulty_level);
  const tagList = normalizeExamTagsList(merged.exam_tags);
  let derivedDifficulty = null;
  const difficultyMatchedIndexes = [];
  const difficultyPriority = { easy: 1, medium: 2, hard: 3 };
  const updateDerivedDifficulty = (candidate) => {
    if (!candidate) return;
    if (!derivedDifficulty || difficultyPriority[candidate] >= difficultyPriority[derivedDifficulty]) {
      derivedDifficulty = candidate;
    }
  };
  for (let index = 0; index < tagList.length; index += 1) {
    const tag = String(tagList[index] || '');
    const directTagDifficulty = normalizeDifficultyToken(tag);
    if (directTagDifficulty) {
      updateDerivedDifficulty(directTagDifficulty);
      difficultyMatchedIndexes.push(index);
      continue;
    }

    const embeddedDifficultyMatches = Array.from(tag.matchAll(/\b(easy|medium|hard)\b/gi));
    if (embeddedDifficultyMatches.length > 0) {
      difficultyMatchedIndexes.push(index);
      embeddedDifficultyMatches.forEach((match) => {
        updateDerivedDifficulty(normalizeDifficultyToken(match[1]));
      });
    }
  }

  if (explicitDifficulty) {
    merged.difficulty_level = explicitDifficulty;
    merged.exam_tags = tagList.filter((_tag, index) => !difficultyMatchedIndexes.includes(index));
  } else {
    merged.difficulty_level = derivedDifficulty || merged.difficulty_level;
    merged.exam_tags =
      difficultyMatchedIndexes.length > 0
        ? tagList.filter((_tag, index) => !difficultyMatchedIndexes.includes(index))
        : tagList;
  }

  return merged;
};

const normalizeCsvRowInput = (rawRow, defaults) => {
  const normalized = {};
  Object.entries(rawRow || {}).forEach(([key, value]) => {
    const originalKey = String(key).trim();
    const normalizedKey = normalizeBulkHeaderKey(originalKey);
    const compactKey = normalizedKey.replace(/_/g, ' ');
    const canonicalKey =
      BULK_CSV_HEADER_ALIASES[originalKey.toLowerCase()] ||
      BULK_CSV_HEADER_ALIASES[compactKey] ||
      BULK_CSV_HEADER_ALIASES[normalizedKey] ||
      normalizedKey;
    normalized[canonicalKey] = typeof value === 'string' ? value.trim() : value;
  });

  const optionKeys = [
    'option_a',
    'option_b',
    'option_c',
    'option_d',
    'option_e',
    'option_f',
    'option_g',
    'option_h',
    'option_1',
    'option_2',
    'option_3',
    'option_4',
    'option_5',
    'option_6',
    'option_7',
    'option_8',
  ];
  if (normalized.options === undefined || normalized.options === null || normalized.options === '') {
    const optionValues = optionKeys
      .map((optionKey) => normalized[optionKey])
      .filter((entry) => entry !== undefined && entry !== null && String(entry).trim().length > 0)
      .map((entry) => String(entry).trim());

    if (optionValues.length > 0) {
      const options = optionValues.map((text, index) => ({
        id: `opt-${index + 1}`,
        text,
      }));
      normalized.options = options;

      if (normalized.correct_answer !== undefined && normalized.correct_answer !== null) {
        const answerValue = String(normalized.correct_answer).trim();
        if (answerValue.length > 0) {
          const questionType = normalizeBulkQuestionType(normalized.question_type || 'mcq_single');
          if (questionType === 'mcq_multiple') {
            const tokens = answerValue
              .split(/[|,;]/)
              .map((token) => token.trim())
              .filter((token) => token.length > 0);
            const mapped = tokens
              .map((token) => mapAnswerTokenToOptionId(token, options))
              .filter(Boolean);
            if (tokens.length > 0 && mapped.length !== tokens.length) {
              throw new AppError('CSV: Could not map one or more MCQ multiple answers to option IDs', 400);
            }
            normalized.correct_answer = mapped;
          } else {
            const mapped = mapAnswerTokenToOptionId(answerValue, options);
            if (!mapped) {
              throw new AppError('CSV: Could not map MCQ single correct answer to an option ID', 400);
            }
            normalized.correct_answer = mapped;
          }
        }
      }
    }
  }

  if (!normalized.question_type || String(normalized.question_type).trim().length === 0) {
    normalized.question_type = 'mcq_single';
  } else {
    normalized.question_type = normalizeBulkQuestionType(normalized.question_type);
  }

  optionKeys.forEach((optionKey) => {
    delete normalized[optionKey];
  });

  return applyBulkDefaults(normalized, defaults);
};

const BULK_DOCX_TABLE_HEADER_ALIASES = {
  sno: 'sno',
  serial_no: 'sno',
  serialno: 'sno',
  type: 'question_type',
  question_type: 'question_type',
  question: 'question_text',
  question_text: 'question_text',
  options: 'options',
  answer: 'correct_answer',
  ans: 'correct_answer',
  correct_answer: 'correct_answer',
  correct_option: 'correct_answer',
  match_pairs: 'match_pairs',
  blanks: 'blanks',
  solution: 'solution',
  difficulty: 'difficulty_level',
  difficulty_level: 'difficulty_level',
  'marks+': 'marks_positive',
  marks_positive: 'marks_positive',
  marksplus: 'marks_positive',
  'marks-': 'marks_negative',
  marks_: 'marks_negative',
  marks_negative: 'marks_negative',
  marksminus: 'marks_negative',
  tags: 'exam_tags',
  exam_tags: 'exam_tags',
  subject: 'subject',
  subject_id: 'subject_id',
  program: 'program',
  program_id: 'program_id',
  grade: 'grade',
  grade_id: 'grade_id',
  chapter: 'chapter',
  chapter_id: 'chapter_id',
  topic: 'topic',
  topic_id: 'topic_id',
  has_comprehension: 'has_comprehension',
  passage_key: 'passage_key',
  passage_title: 'passage_title',
  passage_content: 'passage_content',
  use_existing_passage_id: 'use_existing_passage_id',
  passage_action: 'passage_action',
  school_id: 'school_id',
  status: 'status',
  comprehensive_passage: 'comprehension_passage',
  comprehension_passage: 'comprehension_passage',
  comprehensive_subquestions: 'category',
  comprehension_questions: 'comprehension_questions',
  category: 'category',
  catagory: 'category',
};

const BULK_PLACEHOLDER_VALUES = new Set(['-', '--', 'n/a', 'na', 'none', 'nil']);

const normalizeBulkTextValue = (value) =>
  String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const toHtmlTextWithBreaks = (value) => {
  const html = String(value ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
    .replace(/<\/li>\s*<li[^>]*>/gi, '\n')
    .replace(/<\/tr>\s*<tr[^>]*>/gi, '\n');
  const $ = loadHtml(`<div>${html}</div>`);
  return $('div').text();
};

const toPlainBulkText = (value) => {
  const raw = String(value ?? '');
  if (!raw) return '';
  if (raw.includes('<')) {
    return normalizeBulkTextValue(toHtmlTextWithBreaks(raw));
  }
  return normalizeBulkTextValue(raw);
};

const extractRichHtmlString = (value) => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value) {
    if ('html' in value) {
      return String(value.html ?? '');
    }
    if ('text' in value) {
      return extractRichHtmlString(value.text);
    }
  }
  return String(value);
};

const hasMeaningfulRichContent = (value) => {
  const html = normalizeDocxCellHtml(extractRichHtmlString(value));
  if (!html) return false;
  if (/<img\b/i.test(html)) return true;
  return toPlainBulkText(html).length > 0;
};

const isPlaceholderBulkValue = (value) => {
  const normalized = toPlainBulkText(value).toLowerCase();
  if (!normalized) return true;
  return BULK_PLACEHOLDER_VALUES.has(normalized);
};

const parseBulkBoolean = (value) => {
  const normalized = toPlainBulkText(value).toLowerCase();
  if (!normalized) return false;
  return ['true', '1', 'yes', 'y'].includes(normalized);
};

const normalizeBulkPassageAction = (value) => {
  const normalized = toPlainBulkText(value).toLowerCase();
  if (!normalized) return 'auto';
  if (['create', 'reuse', 'auto'].includes(normalized)) return normalized;
  return 'auto';
};

const normalizeDocxCellHtml = (value) =>
  String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .trim();

const richTextToSingleLineText = (value) =>
  String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|tr)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const appendRichHtmlBlock = (existing, block) => {
  const normalizedBlock = normalizeDocxCellHtml(block);
  if (!normalizedBlock) return existing || '';
  return `${existing || ''}<p>${normalizedBlock}</p>`;
};

const stripLeadingRichLabel = (html, pattern) =>
  normalizeDocxCellHtml(String(html || '').replace(pattern, ''));

const forceUppercaseStemStatementsToNewLine = (html) => {
  const source = normalizeDocxCellHtml(html);
  if (!source) return source;

  // Keep statement-style markers in question stem on separate lines:
  // "... (A) ... (B) ... (C) ... (D) ..." => each starts on a new line.
  const withBreaks = source
    // If first statement marker is glued to question end, force a break before it.
    // Example: "...?(A)..." -> "...?<br/>(A)..."
    .replace(/([?])(?=\(A\)\s*)/g, '$1<br/>')
    .replace(/([?])(?=A[\).]\s*)/g, '$1<br/>')
    // If marker already has spaces, still normalize to explicit line break.
    .replace(/\s+(?=\([A-D]\)\s*)/g, '<br/>')
    .replace(/\s+(?=[A-D][\).]\s*)/g, '<br/>')
    // Avoid duplicate breaks introduced by multiple passes.
    .replace(/(?:<br\s*\/?>\s*){2,}/gi, '<br/>');

  return normalizeDocxCellHtml(withBreaks);
};

const isConverterEquationDebugEnabled = () => {
  const value = String(
    process.env.QUESTION_CONVERTER_EQUATION_DEBUG ??
      process.env.CONVERTER_EQUATION_DEBUG ??
      ''
  )
    .trim()
    .toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(value);
};

const detectOMathKinds = (mathXml) => {
  const source = String(mathXml || '');
  const kinds = [];
  if (/<m:m[\s>]/i.test(source)) kinds.push('matrix');
  if (/<m:f[\s>]/i.test(source)) kinds.push('fraction');
  if (/<m:sSup[\s>]/i.test(source)) kinds.push('superscript');
  if (/<m:sSub[\s>]/i.test(source)) kinds.push('subscript');
  if (/<m:sSubSup[\s>]/i.test(source)) kinds.push('subsup');
  if (/<m:rad[\s>]/i.test(source)) kinds.push('radical');
  if (/<m:d[\s>]/i.test(source)) kinds.push('delimiter');
  if (/<m:nary[\s>]/i.test(source)) kinds.push('nary');
  if (/<m:func[\s>]/i.test(source)) kinds.push('function');
  if (kinds.length === 0) kinds.push('plain');
  return kinds;
};

const extractMathTextFromBlock = (blockXml) =>
  decodeXmlEntities(
    Array.from(String(blockXml || '').matchAll(/<m:t[^>]*>([\s\S]*?)<\/m:t>/g))
      .map((entry) => entry[1])
      .join('')
  );

const parseOMathToHtml = (mathXml) => {
  let transformed = String(mathXml || '');
  if (!transformed) return '';

  transformed = transformed.replace(/<m:oMathPara[\s\S]*?<\/m:oMathPara>/g, (block) => {
    const mathBlocks = Array.from(block.matchAll(/<m:oMath[\s\S]*?<\/m:oMath>/g)).map((m) =>
      normalizeDocxCellHtml(parseOMathToHtml(m[0]))
    );
    const joined = mathBlocks.filter(Boolean).join(' ');
    return joined || escapeHtml(extractMathTextFromBlock(block));
  });

  transformed = transformed.replace(/<m:m[\s\S]*?<\/m:m>/g, (block) => {
    const rowBlocks = Array.from(block.matchAll(/<m:mr[\s\S]*?<\/m:mr>/g)).map((m) => m[0]);
    if (rowBlocks.length === 0) {
      return escapeHtml(extractMathTextFromBlock(block));
    }

    const rows = rowBlocks
      .map((rowXml) => {
        const cells = Array.from(rowXml.matchAll(/<m:e[\s\S]*?<\/m:e>/g))
          .map((entry) => {
            const parsed = normalizeDocxCellHtml(parseOMathToHtml(entry[0]));
            const plain = toPlainBulkText(parsed || extractMathTextFromBlock(entry[0]));
            return plain;
          })
          .filter(Boolean);
        if (cells.length === 0) return '';
        return `[${cells.join(', ')}]`;
      })
      .filter(Boolean);

    if (rows.length === 0) {
      return escapeHtml(extractMathTextFromBlock(block));
    }
    return `<span class="math-matrix">${escapeHtml(rows.join('; '))}</span>`;
  });

  transformed = transformed.replace(/<m:rad[\s\S]*?<\/m:rad>/g, (block) => {
    const degreeBlock = block.match(/<m:deg[\s\S]*?<\/m:deg>/i)?.[0] || '';
    const exprBlock = block.match(/<m:e[\s\S]*?<\/m:e>/i)?.[0] || '';
    const degree = toPlainBulkText(parseOMathToHtml(degreeBlock) || extractMathTextFromBlock(degreeBlock));
    const expr = toPlainBulkText(parseOMathToHtml(exprBlock) || extractMathTextFromBlock(exprBlock));
    if (!expr) return '';
    return degree ? `${escapeHtml(degree)}√(${escapeHtml(expr)})` : `√(${escapeHtml(expr)})`;
  });

  transformed = transformed.replace(/<m:d[\s\S]*?<\/m:d>/g, (block) => {
    const exprBlock = block.match(/<m:e[\s\S]*?<\/m:e>/i)?.[0] || '';
    const expr = toPlainBulkText(parseOMathToHtml(exprBlock) || extractMathTextFromBlock(exprBlock));
    if (!expr) return '';
    return `(${escapeHtml(expr)})`;
  });

  transformed = transformed.replace(/<m:sSubSup[\s\S]*?<\/m:sSubSup>/g, (block) => {
    const baseBlock = block.match(/<m:e[\s\S]*?<\/m:e>/i)?.[0] || '';
    const subBlock = block.match(/<m:sub[\s\S]*?<\/m:sub>/i)?.[0] || '';
    const supBlock = block.match(/<m:sup[\s\S]*?<\/m:sup>/i)?.[0] || '';
    const base = escapeHtml(extractMathTextFromBlock(baseBlock));
    const sub = escapeHtml(extractMathTextFromBlock(subBlock));
    const sup = escapeHtml(extractMathTextFromBlock(supBlock));
    return `${base}${sub ? `<sub>${sub}</sub>` : ''}${sup ? `<sup>${sup}</sup>` : ''}`;
  });

  transformed = transformed.replace(/<m:sSup[\s\S]*?<\/m:sSup>/g, (block) => {
    const baseBlock = block.match(/<m:e[\s\S]*?<\/m:e>/i)?.[0] || '';
    const supBlock = block.match(/<m:sup[\s\S]*?<\/m:sup>/i)?.[0] || '';
    const base = escapeHtml(extractMathTextFromBlock(baseBlock));
    const sup = escapeHtml(extractMathTextFromBlock(supBlock));
    return `${base}${sup ? `<sup>${sup}</sup>` : ''}`;
  });

  transformed = transformed.replace(/<m:sSub[\s\S]*?<\/m:sSub>/g, (block) => {
    const baseBlock = block.match(/<m:e[\s\S]*?<\/m:e>/i)?.[0] || '';
    const subBlock = block.match(/<m:sub[\s\S]*?<\/m:sub>/i)?.[0] || '';
    const base = escapeHtml(extractMathTextFromBlock(baseBlock));
    const sub = escapeHtml(extractMathTextFromBlock(subBlock));
    return `${base}${sub ? `<sub>${sub}</sub>` : ''}`;
  });

  transformed = transformed.replace(/<m:f[\s\S]*?<\/m:f>/g, (block) => {
    const numBlock = block.match(/<m:num[\s\S]*?<\/m:num>/i)?.[0] || '';
    const denBlock = block.match(/<m:den[\s\S]*?<\/m:den>/i)?.[0] || '';
    const num = escapeHtml(extractMathTextFromBlock(numBlock));
    const den = escapeHtml(extractMathTextFromBlock(denBlock));
    if (!num && !den) return '';
    return den ? `${num}/${den}` : num;
  });

  transformed = transformed.replace(/<m:t[^>]*>([\s\S]*?)<\/m:t>/g, (_full, text) =>
    escapeHtml(decodeXmlEntities(text || ''))
  );

  transformed = transformed.replace(/<\/?m:[^>]+>/g, '');
  transformed = normalizeDocxCellHtml(transformed);
  return transformed;
};

const extractParagraphContent = (paragraphXml, relationshipMap, zip) => {
  const inlineTokens = [];
  const mathBlocks = [];
  const tokenMatches =
    paragraphXml.match(/<w:r[\s\S]*?<\/w:r>|<m:oMathPara[\s\S]*?<\/m:oMathPara>|<m:oMath[\s\S]*?<\/m:oMath>/g) || [];

  tokenMatches.forEach((tokenXml) => {
    if (/^<m:oMathPara/i.test(tokenXml) || /^<m:oMath/i.test(tokenXml)) {
      mathBlocks.push({
        source: /^<m:oMathPara/i.test(tokenXml) ? 'paragraph' : 'inline',
        kinds: detectOMathKinds(tokenXml),
      });
      const mathHtml = parseOMathToHtml(tokenXml);
      if (mathHtml) {
        inlineTokens.push(`<span class="math-equation">${mathHtml}</span>`);
      }
      return;
    }

    const runXml = tokenXml;
    const isSuperscript = /<w:vertAlign[^>]*w:val="superscript"[^>]*\/?>/i.test(runXml);
    const isSubscript = /<w:vertAlign[^>]*w:val="subscript"[^>]*\/?>/i.test(runXml);

    const runParts = [];
    const textMatches = Array.from(runXml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g));
    if (textMatches.length > 0) {
      runParts.push(...textMatches.map((entry) => escapeHtml(decodeXmlEntities(entry[1] || ''))));
    }

    if (/<w:tab\/>/i.test(runXml)) {
      runParts.push('\t');
    }

    if (/<w:br[^>]*\/>/i.test(runXml)) {
      runParts.push('\n');
    }

    const inlineMathMatches = Array.from(
      runXml.matchAll(/<m:oMathPara[\s\S]*?<\/m:oMathPara>|<m:oMath[\s\S]*?<\/m:oMath>/g)
    );
    inlineMathMatches.forEach((mathMatch) => {
      mathBlocks.push({
        source: /^<m:oMathPara/i.test(mathMatch[0]) ? 'paragraph' : 'inline',
        kinds: detectOMathKinds(mathMatch[0]),
      });
      const mathHtml = parseOMathToHtml(mathMatch[0]);
      if (mathHtml) runParts.push(`<span class="math-equation">${mathHtml}</span>`);
    });

    if (runParts.length === 0) return;
    const runHtml = runParts.join('');
    if (isSuperscript) {
      inlineTokens.push(`<sup>${runHtml}</sup>`);
    } else if (isSubscript) {
      inlineTokens.push(`<sub>${runHtml}</sub>`);
    } else {
      inlineTokens.push(runHtml);
    }
  });

  const imageMatches = paragraphXml.matchAll(/r:embed="([^"]+)"/g);
  for (const imageMatch of imageMatches) {
    const relId = imageMatch[1];
    const target = relationshipMap[relId];
    if (!target) continue;
    const normalizedTarget = target.replace(/^\/+/, '');
    const imageEntry = zip.getEntry(`word/${normalizedTarget}`);
    if (!imageEntry) continue;
    const imageBuffer = imageEntry.getData();
    const base64 = imageBuffer.toString('base64');
    const filename = normalizedTarget.split('/').pop() || 'image';
    const mimeType = detectImageMimeTypeFromBuffer(imageBuffer, filename);
    inlineTokens.push(`<img src="data:${mimeType};base64,${base64}" alt="${escapeHtml(filename)}" />`);
  }

  const paragraphHtml = normalizeDocxCellHtml(inlineTokens.join(''));
  const detectionText = toPlainBulkText(paragraphHtml);
  return { paragraphHtml, detectionText, mathBlocks };
};

const toRichHtmlValue = (value) => {
  const html = normalizeDocxCellHtml(value);
  if (!hasMeaningfulRichContent(html)) return null;
  return normalizeDocxCellHtml(html);
};

const parseBulkOptionText = (value) => {
  if (isPlaceholderBulkValue(value)) return null;
  const raw = normalizeDocxCellHtml(value);
  const stripOptionLabelPrefix = (input) =>
    stripLeadingRichLabel(
      input,
      /^(?:<(?:p|div|span|strong|b|em|u)[^>]*>\s*)*(?:\(\s*[A-Ha-h1-8]\s*\)|[A-Ha-h1-8])\s*[\)\].:;\-]*\s*/i
    );

  const buildTextEntries = (input) =>
    toHtmlTextWithBreaks(input)
      .split(/[\n;]+/)
      .map((entry) => normalizeBulkTextValue(entry))
      .map((entry) => entry.replace(/^(?:\(\s*[A-H0-9]\s*\)|[A-H0-9])\s*[\).:-]*\s*/i, ''))
      .filter((entry) => entry.length > 0)
      .filter((entry) => !BULK_PLACEHOLDER_VALUES.has(entry.toLowerCase()));

  if (!raw.includes('<')) {
    const entries = buildTextEntries(raw);
    if (entries.length === 0) return null;
    return entries.map((text, index) => ({
      id: `opt-${index + 1}`,
      text,
    }));
  }

  const splitToken = '__BULK_OPT_SPLIT__';
  const normalizedHtml = raw
    .replace(/<\/(p|div|li|tr)>\s*<(p|div|li|tr)[^>]*>/gi, `</$1>${splitToken}<$2>`)
    .replace(/<br\s*\/?>/gi, splitToken);

  // Also split options when users type labels in one rich block, e.g.:
  // A) <img ...> B) <img ...> C) <img ...> D) <img ...>
  const labelSplitHtml = normalizedHtml.replace(
    /(^|<\/p>|<\/div>|<\/li>|;)\s*(?:\(\s*([A-Ha-h1-8])\s*\)|([A-Ha-h1-8]))\s*[\)\].:;\-]*\s*/gi,
    (_, prefix, parenLabel, plainLabel) => `${prefix}${splitToken}${(parenLabel || plainLabel || '').toUpperCase()}) `
  );

  let chunks = labelSplitHtml
    .split(splitToken)
    .map((chunk) => normalizeDocxCellHtml(chunk))
    .filter((chunk) => chunk.length > 0);

  if (chunks.length <= 1) {
    if (/<img\b/i.test(raw)) {
      chunks = [raw];
    } else {
      const entries = buildTextEntries(raw);
      if (entries.length === 0) return null;
      return entries.map((text, index) => ({
        id: `opt-${index + 1}`,
        text,
      }));
    }
  }

  const optionItems = chunks
    .map((chunk) => stripOptionLabelPrefix(chunk))
    .filter((chunk) => hasMeaningfulRichContent(chunk))
    .map((text, index) => ({
      id: `opt-${index + 1}`,
      text,
    }));

  if (optionItems.length === 0) return null;
  return optionItems;
};

const parseBulkNumericId = (value) => {
  const text = toPlainBulkText(value);
  if (!text || BULK_PLACEHOLDER_VALUES.has(text.toLowerCase())) return null;
  if (!/^\d+$/.test(text)) return null;
  return Number.parseInt(text, 10);
};

const normalizeDocxTableAnswer = ({
  questionType,
  answerValue,
  options,
  matchPairsValue,
  blanksValue,
  subQuestionsValue,
  rowNumber,
}) => {
  let resolvedAnswer = answerValue;
  if (isPlaceholderBulkValue(resolvedAnswer)) {
    if (questionType === 'match_following' && !isPlaceholderBulkValue(matchPairsValue)) {
      resolvedAnswer = toPlainBulkText(matchPairsValue);
    } else if (questionType === 'fill_in_blank' && !isPlaceholderBulkValue(blanksValue)) {
      resolvedAnswer = toPlainBulkText(blanksValue);
    } else if (questionType === 'comprehensive' && !isPlaceholderBulkValue(subQuestionsValue)) {
      resolvedAnswer = toPlainBulkText(subQuestionsValue);
    }
  }

  if (questionType === 'true_false') {
    const normalized = toPlainBulkText(resolvedAnswer).toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    throw new AppError(`Row ${rowNumber}: Correct Answer must be true or false`, 400);
  }

  if (questionType === 'numerical') {
    const parsed = Number(toPlainBulkText(resolvedAnswer));
    if (Number.isNaN(parsed)) {
      throw new AppError(`Row ${rowNumber}: Correct Answer must be a number for numerical questions`, 400);
    }
    return parsed;
  }

  if (questionType === 'mcq_single') {
    const token = toPlainBulkText(resolvedAnswer);
    if (!token) {
      throw new AppError(`Row ${rowNumber}: Correct Answer is required for MCQ single`, 400);
    }
    const mapped = mapAnswerTokenToOptionId(token, options || []);
    return mapped ?? token;
  }

  if (questionType === 'mcq_multiple') {
    const tokens = toPlainBulkText(resolvedAnswer)
      .split(/[|,;]/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0);
    if (tokens.length === 0) {
      throw new AppError(`Row ${rowNumber}: Correct Answer is required for MCQ multiple`, 400);
    }
    const mapped = tokens
      .map((token) => mapAnswerTokenToOptionId(token, options || []))
      .filter(Boolean);
    return mapped.length > 0 ? mapped : tokens;
  }

  return toPlainBulkText(resolvedAnswer);
};

const normalizeDocxTableRowInput = (rawRow, defaults, rowNumber) => {
  const hasAnyValue = Object.values(rawRow || {}).some((value) => !isPlaceholderBulkValue(value));
  if (!hasAnyValue) {
    return null;
  }

  const questionType = normalizeBulkQuestionType(rawRow.question_type || 'mcq_single');
  if (!VALID_QUESTION_TYPES.includes(questionType)) {
    throw new AppError(`Row ${rowNumber}: Invalid question type "${toPlainBulkText(rawRow.question_type)}"`, 400);
  }

  const baseQuestionHtml = toRichHtmlValue(rawRow.question_text);
  if (!hasMeaningfulRichContent(baseQuestionHtml)) {
    throw new AppError(`Row ${rowNumber}: Question content (text or image) is required`, 400);
  }

  const passageHtml = toRichHtmlValue(rawRow.comprehension_passage);

  const options = parseBulkOptionText(rawRow.options);
  if (questionType.startsWith('mcq') && (!options || options.length === 0)) {
    throw new AppError(`Row ${rowNumber}: Options are required for MCQ questions`, 400);
  }
  if (questionType.startsWith('mcq') && options?.some((option) => !hasMeaningfulRichContent(option?.text))) {
    throw new AppError(`Row ${rowNumber}: Each option must contain text or image`, 400);
  }

  const answerValue = toPlainBulkText(rawRow.correct_answer);
  const correctAnswer = normalizeDocxTableAnswer({
    questionType,
    answerValue,
    options,
    matchPairsValue: rawRow.match_pairs,
    blanksValue: rawRow.blanks,
    subQuestionsValue: rawRow.comprehensive_subquestions,
    rowNumber,
  });

  const prepared = applyBulkDefaults(
    {
      sno: toPlainBulkText(rawRow.sno) || null,
      question_type: questionType,
      question_text: baseQuestionHtml,
      options: options || null,
      correct_answer: correctAnswer,
      program_id: toPlainBulkText(rawRow.program_id ?? rawRow.program) || null,
      grade_id: toPlainBulkText(rawRow.grade_id ?? rawRow.grade) || null,
      subject_id: toPlainBulkText(rawRow.subject_id ?? rawRow.subject) || null,
      chapter_id: toPlainBulkText(rawRow.chapter_id ?? rawRow.chapter) || null,
      topic_id: toPlainBulkText(rawRow.topic_id ?? rawRow.topic) || null,
      has_comprehension:
        parseBulkBoolean(rawRow.has_comprehension) ||
        !isPlaceholderBulkValue(rawRow.passage_key) ||
        !isPlaceholderBulkValue(rawRow.passage_title) ||
        !isPlaceholderBulkValue(rawRow.passage_content) ||
        !isPlaceholderBulkValue(rawRow.comprehension_passage),
      passage_key: toPlainBulkText(rawRow.passage_key) || null,
      passage_title: toRichHtmlValue(rawRow.passage_title),
      passage_content: toRichHtmlValue(rawRow.passage_content ?? rawRow.comprehension_passage),
      difficulty_level: toPlainBulkText(rawRow.difficulty_level) || 'medium',
      exam_tags: toPlainBulkText(rawRow.exam_tags || rawRow.tags) || '',
      category: toPlainBulkText(rawRow.category || rawRow.catagory) || null,
      comprehension_passage: passageHtml,
      comprehension_questions: rawRow.comprehension_questions ?? null,
      marks_positive: toPlainBulkText(rawRow.marks_positive),
      marks_negative: toPlainBulkText(rawRow.marks_negative),
      solution: toRichHtmlValue(rawRow.solution),
      solution_video_url: toPlainBulkText(rawRow.solution_video_url) || null,
      school_id: parseBulkNumericId(rawRow.school_id),
      status: toPlainBulkText(rawRow.status) || undefined,
    },
    defaults
  );

  if (!prepared.subject_id || !prepared.chapter_id) {
    throw new AppError(
      `Row ${rowNumber}: subject and chapter are required (IDs or names supported)`,
      400
    );
  }

  return prepared;
};

const loadDocxExtractionContext = (buffer) => {
  const zip = new AdmZip(buffer);
  const documentEntry = zip.getEntry('word/document.xml');
  if (!documentEntry) {
    throw new AppError('Invalid Word file: document.xml missing', 400);
  }

  const relsEntry = zip.getEntry('word/_rels/document.xml.rels');
  const relationshipMap = {};
  if (relsEntry) {
    const relsXml = relsEntry.getData().toString('utf8');
    const relMatches = relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/>/g);
    for (const match of relMatches) {
      relationshipMap[match[1]] = match[2];
    }
  }

  return {
    zip,
    relationshipMap,
    documentXml: documentEntry.getData().toString('utf8'),
  };
};

const extractDocxTableCellContent = (cellXml, relationshipMap, zip) => {
  const paragraphMatches = cellXml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
  let html = '';
  const textParts = [];

  paragraphMatches.forEach((paragraphXml) => {
    const { paragraphHtml, detectionText } = extractParagraphContent(paragraphXml, relationshipMap, zip);
    if (paragraphHtml) {
      html = appendRichHtmlBlock(html, paragraphHtml);
    }
    if (detectionText) {
      textParts.push(detectionText);
    }
  });

  return {
    html: normalizeDocxCellHtml(html),
    text: normalizeBulkTextValue(textParts.join('\n')),
  };
};

const extractDocxTableRows = async (buffer, defaults) => {
  const { zip, relationshipMap, documentXml } = loadDocxExtractionContext(buffer);
  const tableMatches = documentXml.match(/<w:tbl[\s\S]*?<\/w:tbl>/g) || [];
  if (tableMatches.length === 0) {
    return [{ _bulk_error: 'DOCX has no table content. Converter-template table layout is required.', _bulk_row_number: 2 }];
  }

  const rows = [];
  const richCellKeys = new Set([
    'question_text',
    'options',
    'solution',
    'comprehension_passage',
    'passage_title',
    'passage_content',
  ]);
  let sawTableWithRows = false;
  let sawHeaderRow = false;

  tableMatches.forEach((tableXml) => {
    const tableRows = tableXml.match(/<w:tr[\s\S]*?<\/w:tr>/g) || [];
    if (tableRows.length < 2) return;
    sawTableWithRows = true;

    const headerCells = tableRows[0].match(/<w:tc[\s\S]*?<\/w:tc>/g) || [];
    const headers = headerCells.map((cellXml) => {
      const { text } = extractDocxTableCellContent(cellXml, relationshipMap, zip);
      const normalizedKey = normalizeBulkHeaderKey(text);
      return BULK_DOCX_TABLE_HEADER_ALIASES[normalizedKey] || normalizedKey;
    });

    if (headers.length > 0) {
      sawHeaderRow = true;
    }

    if (!headers.includes('question_text')) {
      rows.push({
        _bulk_error:
          'DOCX table header is invalid. Required header: Question (or Question Text).',
        _bulk_row_number: 2,
      });
      return;
    }

    tableRows.slice(1).forEach((rowXml, rowIndex) => {
      const rowNumber = rowIndex + 2;
      const cellMatches = rowXml.match(/<w:tc[\s\S]*?<\/w:tc>/g) || [];
      const row = {};

      cellMatches.forEach((cellXml, cellIndex) => {
        const key = headers[cellIndex];
        if (!key) return;
        const cellContent = extractDocxTableCellContent(cellXml, relationshipMap, zip);
        row[key] = richCellKeys.has(key) ? cellContent.html : cellContent.text;
      });

      try {
        const normalized = normalizeDocxTableRowInput(row, defaults, rowNumber);
        if (normalized) {
          rows.push(normalized);
        }
      } catch (err) {
        const message = err instanceof AppError ? err.message : 'Failed to parse row';
        rows.push({ _bulk_error: message, _bulk_row_number: rowNumber });
      }
    });
  });

  if (!sawTableWithRows) {
    return [{ _bulk_error: 'DOCX tables were found, but no data rows were detected.', _bulk_row_number: 2 }];
  }
  if (!sawHeaderRow) {
    return [{ _bulk_error: 'DOCX table header row could not be read.', _bulk_row_number: 2 }];
  }
  if (rows.length === 0) {
    return [{ _bulk_error: 'No rows could be parsed from DOCX table.', _bulk_row_number: 2 }];
  }
  return rows;
};

const mapAnswerTokenToOptionId = (token, options) => {
  const raw = String(token || '').trim();
  if (!raw) return null;

  const normalizedRaw = raw.replace(/\u00a0/g, ' ').trim();
  const embeddedLetterMatch = normalizedRaw.match(/[\(\[\{]\s*([A-H])\s*[\)\]\}]/i);
  const optionWordMatch = normalizedRaw.match(/\b(?:option|opt)\s*([A-H])\b/i);
  const standaloneLetterMatch = normalizedRaw.match(/\b([A-H])\b/i);
  const compact = normalizedRaw
    .replace(/^[\s\(\[\{]+/, '')
    .replace(/[\s\)\]\};:.,-]+$/g, '')
    .trim();

  const labelledPrefixMatch = normalizedRaw.match(
    /^\(?\s*([A-H])\s*\)?(?:[\)\].:;\-])*(?:\s+.*)?$/i
  );
  const numericPrefixMatch = normalizedRaw.match(
    /^\(?\s*(\d+)\s*\)?(?:[\)\].:;\-])*(?:\s+.*)?$/i
  );

  const normalized = (
    embeddedLetterMatch?.[1] ||
    optionWordMatch?.[1] ||
    labelledPrefixMatch?.[1] ||
    numericPrefixMatch?.[1] ||
    standaloneLetterMatch?.[1] ||
    compact
  )
    .trim()
    .toUpperCase();
  if (!normalized) return null;

  if (/^\d+$/.test(normalized)) {
    const index = Number.parseInt(normalized, 10) - 1;
    return options[index]?.id ?? null;
  }

  if (/^[A-Z]$/.test(normalized)) {
    const index = normalized.charCodeAt(0) - 65;
    return options[index]?.id ?? null;
  }

  const normalizedTextToken = normalizedRaw.toLowerCase();
  const byText = options.find((option) => {
    const optionPlain = toPlainBulkText(option.text || '').toLowerCase();
    const optionWithoutLabel = optionPlain.replace(/^\s*[a-h1-8]\s*[\)\].:;\-]+\s*/i, '');
    return optionPlain === normalizedTextToken || optionWithoutLabel === normalizedTextToken;
  });
  return byText?.id ?? null;
};

const extractOptionLabelsFromAnswer = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return [];

  const numericParenthesized = raw.match(/\(((?:\d+)(?:\s*,\s*\d+)*)\)/i);
  if (numericParenthesized?.[1]) {
    return numericParenthesized[1]
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => /^\d+$/.test(entry));
  }

  const parenthesized = raw.match(/\(([a-h](?:\s*,\s*[a-h])*)\)/i);
  if (parenthesized?.[1]) {
    return parenthesized[1]
      .split(',')
      .map((entry) => entry.trim().toUpperCase())
      .filter((entry) => /^[A-H]$/.test(entry));
  }

  const prefix = raw.match(/^\(?\s*([a-h])\s*\)?(?:[\).:-])?(?:\s+.*)?$/i);
  if (prefix?.[1]) {
    return [prefix[1].toUpperCase()];
  }

  const numericPrefix = raw.match(/^\(?\s*(\d+)\s*\)?(?:[\).:-])?(?:\s+.*)?$/i);
  if (numericPrefix?.[1]) {
    return [numericPrefix[1]];
  }

  return [];
};

const normalizeDocxSectionQuestionType = (value) => {
  const text = toPlainBulkText(value).toLowerCase();
  if (!text) return '';

  if (/matching|match\s+the\s+following|match\s+type/i.test(text)) {
    return 'match_following';
  }
  if (/multiple\s+correct|more options may be correct|more than one option|mcat/i.test(text)) {
    return 'mcq_multiple';
  }
  if (/assertion|reason/i.test(text)) {
    return 'mcq_single';
  }
  if (/comprehension/i.test(text)) {
    return 'comprehension';
  }
  if (/multiple\s+correct|more options may be correct|more than one option/i.test(text)) {
    return 'mcq_multiple';
  }
  if (/single\s+correct|assertion|reason|passage-based|interdisciplinary|mcq/i.test(text)) {
    return 'mcq_single';
  }
  if (/short\s+answer|very\s+short/i.test(text)) {
    return 'short_answer';
  }
  if (/match\s+the\s+following/i.test(text)) {
    return 'match_following';
  }
  if (/fill\s+in\s+the\s+blank/i.test(text)) {
    return 'fill_in_blank';
  }
  if (/true\s*false/i.test(text)) {
    return 'true_false';
  }
  if (/numerical|integer/i.test(text)) {
    return 'numerical';
  }
  return '';
};

const extractDocxQuestionNumber = (value) => {
  const text = toPlainBulkText(value);
  const qMatch = text.match(/^q\s*(\d+)\b/i);
  if (qMatch?.[1]) return Number.parseInt(qMatch[1], 10);
  const numericMatch = text.match(/^(\d+)\s*[\).:-]\s*/);
  if (numericMatch?.[1]) return Number.parseInt(numericMatch[1], 10);
  return null;
};

const extractInlineDocxTag = (value) => {
  const match = toPlainBulkText(value).match(/\[([^\]]+)\]/);
  return match?.[1] ? normalizeBulkTextValue(match[1]) : '';
};

const stripInlineDocxTag = (value) =>
  normalizeDocxCellHtml(String(value || '').replace(/\s*\[[^\]]+\]\s*/g, ' ').replace(/\s+/g, ' '));

const isDocxSectionHeading = (value) => /^section\s+\d+\b/i.test(toPlainBulkText(value));

const isDocxTagHeading = (value) => {
  const text = toPlainBulkText(value);
  if (!text) return false;
  return /(?:remember|understand|apply|analyse|analyze|evaluate|hots|higher order|based)\b/i.test(text)
    && /\b(level|based)\b/i.test(text);
};

const normalizeDocxTagHeading = (value) => {
  const text = normalizeBulkTextValue(value);
  if (!text) return '';
  const cleaned = text.replace(/\s+(level)$/i, '');
  return normalizeBulkTextValue(cleaned);
};

const buildDocxQuestionLookupKey = (value) => {
  const numeric = Number.parseInt(String(value || '').trim(), 10);
  if (!Number.isInteger(numeric) || numeric <= 0) return null;
  return `q-${numeric}`;
};

const isBlankValue = (value) =>
  value === undefined || value === null || (typeof value === 'string' && value.trim().length === 0);

const normalizeBulkLookupText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const normalizeBulkLookupTextLower = (value) => normalizeBulkLookupText(value).toLowerCase();

const parseBulkEntityReference = (value) => {
  if (isBlankValue(value)) {
    return { provided: false, id: null, text: null };
  }

  const normalized = normalizeBulkLookupText(value);
  if (/^\d+$/.test(normalized)) {
    return { provided: true, id: Number.parseInt(normalized, 10), text: null };
  }

  return { provided: true, id: null, text: normalized };
};

const parseGradeNumberToken = (value) => {
  if (isBlankValue(value)) return null;
  const match = normalizeBulkLookupText(value).match(/(\d+)/);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
};

const resolveProgramReference = async ({ value, clientId, queryRunner = dbQuery }) => {
  const runQuery = getQueryRunner(queryRunner);
  const parsed = parseBulkEntityReference(value);
  if (!parsed.provided) {
    return null;
  }

  if (parsed.id !== null) {
    const idParams = [parsed.id];
    let idSql = `SELECT id FROM programs WHERE id = $1`;
    if (clientId) {
      idParams.push(clientId);
      idSql += ` AND client_id = $2`;
    }
    const byId = await runQuery(idSql, idParams);
    if (byId.rows.length === 0) {
      throw new AppError(`Program not found for value "${value}"`, 404);
    }
    return byId.rows[0].id;
  }

  const normalizedLookup = normalizeBulkLookupTextLower(parsed.text);
  const nameParams = [normalizedLookup];
  let nameSql = `
    SELECT id
    FROM programs
    WHERE (
      LOWER(REGEXP_REPLACE(TRIM(name), '\\s+', ' ', 'g')) = $1
      OR LOWER(REGEXP_REPLACE(TRIM(COALESCE(code, '')), '\\s+', ' ', 'g')) = $1
    )
  `;
  if (clientId) {
    nameParams.push(clientId);
    nameSql += ` AND client_id = $2`;
  }
  nameSql += ` ORDER BY id LIMIT 2`;

  const byName = await runQuery(nameSql, nameParams);
  if (byName.rows.length === 0) {
    throw new AppError(`Program not found for value "${value}"`, 404);
  }
  if (byName.rows.length > 1) {
    throw new AppError(`Multiple programs match "${value}". Use program_id to disambiguate`, 400);
  }

  return byName.rows[0].id;
};

const resolveGradeReference = async ({ value, programId, clientId, queryRunner = dbQuery }) => {
  const runQuery = getQueryRunner(queryRunner);
  const parsed = parseBulkEntityReference(value);
  if (!parsed.provided) {
    return { id: null, programId: programId ?? null };
  }

  const resolveByGradeNumber = async (gradeNumber) => {
    const nameParams = [gradeNumber];
    let nameSql = `
      SELECT g.id, g.program_id
      FROM grades g
      JOIN programs p ON p.id = g.program_id
      WHERE g.grade_number = $1
    `;
    if (programId) {
      nameParams.push(programId);
      nameSql += ` AND g.program_id = $${nameParams.length}`;
    }
    if (clientId) {
      nameParams.push(clientId);
      nameSql += ` AND p.client_id = $${nameParams.length}`;
    }
    nameSql += ` ORDER BY g.id LIMIT 2`;
    return runQuery(nameSql, nameParams);
  };

  const parsedGradeNumber = parseGradeNumberToken(parsed.text ?? value);
  if (parsedGradeNumber !== null) {
    const byNumber = await resolveByGradeNumber(parsedGradeNumber);
    if (byNumber.rows.length === 1) {
      return { id: byNumber.rows[0].id, programId: byNumber.rows[0].program_id };
    }
    if (byNumber.rows.length > 1) {
      throw new AppError(
        `Multiple grades match "${value}". Provide program/program_id or exact grade_id`,
        400
      );
    }
  }

  if (parsed.id !== null) {
    const idParams = [parsed.id];
    let idSql = `
      SELECT g.id, g.program_id
      FROM grades g
      JOIN programs p ON p.id = g.program_id
      WHERE g.id = $1
    `;
    if (clientId) {
      idParams.push(clientId);
      idSql += ` AND p.client_id = $2`;
    }
    const byId = await runQuery(idSql, idParams);
    if (byId.rows.length === 0) {
      throw new AppError(`Grade not found for value "${value}"`, 404);
    }
    const grade = byId.rows[0];
    if (programId && Number(grade.program_id) !== Number(programId)) {
      throw new AppError('Grade does not belong to the provided program', 400);
    }
    return { id: grade.id, programId: grade.program_id };
  }

  if (parsedGradeNumber === null) {
    throw new AppError(`Grade "${value}" must be a grade number (for example: 6 or Grade 6)`, 400);
  }

  const byName = await resolveByGradeNumber(parsedGradeNumber);
  if (byName.rows.length === 0) {
    throw new AppError(`Grade not found for value "${value}"`, 404);
  }
  if (byName.rows.length > 1) {
    throw new AppError(
      `Multiple grades match "${value}". Provide program/program_id or exact grade_id`,
      400
    );
  }

  return { id: byName.rows[0].id, programId: byName.rows[0].program_id };
};

const resolveSubjectReference = async ({
  value,
  gradeId,
  programId,
  clientId,
  required = false,
  queryRunner = dbQuery,
}) => {
  const runQuery = getQueryRunner(queryRunner);
  const parsed = parseBulkEntityReference(value);
  if (!parsed.provided) {
    if (required) {
      throw new AppError('subject_id (or subject name) is required', 400);
    }
    return { id: null, gradeId: gradeId ?? null, programId: programId ?? null };
  }

  if (parsed.id !== null) {
    const idParams = [parsed.id];
    let idSql = `
      SELECT s.id, s.grade_id, g.program_id, s.client_id
      FROM subjects s
      LEFT JOIN grades g ON g.id = s.grade_id
      WHERE s.id = $1
    `;
    if (clientId) {
      idParams.push(clientId);
      idSql += ` AND s.client_id = $2`;
    }
    const byId = await runQuery(idSql, idParams);
    if (byId.rows.length === 0) {
      throw new AppError(`Subject not found for value "${value}"`, 404);
    }
    const subject = byId.rows[0];
    if (gradeId && Number(subject.grade_id) !== Number(gradeId)) {
      throw new AppError('Subject does not belong to the provided grade', 400);
    }
    if (programId && Number(subject.program_id) !== Number(programId)) {
      throw new AppError('Subject does not belong to the provided program', 400);
    }
    return { id: subject.id, gradeId: subject.grade_id ?? gradeId ?? null, programId: subject.program_id ?? programId ?? null };
  }

  const normalizedLookup = normalizeBulkLookupTextLower(parsed.text);
  const nameParams = [normalizedLookup];
  let nameSql = `
    SELECT s.id, s.grade_id, g.program_id
    FROM subjects s
    LEFT JOIN grades g ON g.id = s.grade_id
    WHERE (
      LOWER(REGEXP_REPLACE(TRIM(s.name), '\\s+', ' ', 'g')) = $1
      OR LOWER(REGEXP_REPLACE(TRIM(COALESCE(s.code, '')), '\\s+', ' ', 'g')) = $1
    )
  `;
  if (gradeId) {
    nameParams.push(gradeId);
    nameSql += ` AND s.grade_id = $${nameParams.length}`;
  }
  if (clientId) {
    nameParams.push(clientId);
    nameSql += ` AND s.client_id = $${nameParams.length}`;
  }
  nameSql += ` ORDER BY s.id LIMIT 2`;

  const byName = await runQuery(nameSql, nameParams);
  if (byName.rows.length === 0) {
    throw new AppError(`Subject not found for value "${value}"`, 404);
  }
  if (byName.rows.length > 1) {
    throw new AppError(
      `Multiple subjects match "${value}". Provide grade/grade_id or exact subject_id`,
      400
    );
  }

  const subject = byName.rows[0];
  if (programId && Number(subject.program_id) !== Number(programId)) {
    throw new AppError('Subject does not belong to the provided program', 400);
  }
  return { id: subject.id, gradeId: subject.grade_id ?? gradeId ?? null, programId: subject.program_id ?? programId ?? null };
};

const resolveChapterReference = async ({
  value,
  subjectId,
  clientId,
  required = false,
  queryRunner = dbQuery,
}) => {
  const runQuery = getQueryRunner(queryRunner);
  const parsed = parseBulkEntityReference(value);
  if (!parsed.provided) {
    if (required) {
      throw new AppError('chapter_id (or chapter name/number) is required', 400);
    }
    return { id: null, subjectId: subjectId ?? null };
  }

  if (parsed.id !== null) {
    const idParams = [parsed.id];
    let idSql = `
      SELECT c.id, c.subject_id, s.client_id
      FROM chapters c
      JOIN subjects s ON s.id = c.subject_id
      WHERE c.id = $1
    `;
    if (clientId) {
      idParams.push(clientId);
      idSql += ` AND s.client_id = $2`;
    }
    const byId = await runQuery(idSql, idParams);
    if (byId.rows.length === 0) {
      throw new AppError(`Chapter not found for value "${value}"`, 404);
    }
    const chapter = byId.rows[0];
    if (subjectId && Number(chapter.subject_id) !== Number(subjectId)) {
      throw new AppError('Chapter does not belong to the provided subject', 400);
    }
    return { id: chapter.id, subjectId: chapter.subject_id };
  }

  if (!subjectId) {
    throw new AppError('subject_id is required when chapter is provided by name/number', 400);
  }

  const parsedChapterNumber = parseGradeNumberToken(parsed.text);
  const normalizedLookup = normalizeBulkLookupTextLower(parsed.text);
  const nameParams = [subjectId, normalizedLookup];
  let nameSql = `
    SELECT c.id, c.subject_id
    FROM chapters c
    JOIN subjects s ON s.id = c.subject_id
    WHERE c.subject_id = $1
      AND LOWER(REGEXP_REPLACE(TRIM(c.name), '\\s+', ' ', 'g')) = $2
  `;
  if (parsedChapterNumber !== null) {
    nameParams.push(parsedChapterNumber);
    nameSql = `
      SELECT c.id, c.subject_id
      FROM chapters c
      JOIN subjects s ON s.id = c.subject_id
      WHERE c.subject_id = $1
        AND (
          LOWER(REGEXP_REPLACE(TRIM(c.name), '\\s+', ' ', 'g')) = $2
          OR c.chapter_number = $3
        )
    `;
  }
  if (clientId) {
    nameParams.push(clientId);
    nameSql += ` AND s.client_id = $${nameParams.length}`;
  }
  nameSql += ` ORDER BY c.id LIMIT 2`;

  const byName = await runQuery(nameSql, nameParams);
  if (byName.rows.length === 0) {
    throw new AppError(`Chapter not found for value "${value}"`, 404);
  }
  if (byName.rows.length > 1) {
    throw new AppError(`Multiple chapters match "${value}". Use chapter_id to disambiguate`, 400);
  }
  return { id: byName.rows[0].id, subjectId: byName.rows[0].subject_id };
};

const resolveTopicReference = async ({ value, chapterId, clientId, queryRunner = dbQuery }) => {
  const runQuery = getQueryRunner(queryRunner);
  const parsed = parseBulkEntityReference(value);
  if (!parsed.provided) {
    return { id: null, chapterId: chapterId ?? null };
  }

  if (parsed.id !== null) {
    const idParams = [parsed.id];
    let idSql = `
      SELECT t.id, t.chapter_id, s.client_id
      FROM topics t
      JOIN chapters c ON c.id = t.chapter_id
      JOIN subjects s ON s.id = c.subject_id
      WHERE t.id = $1
    `;
    if (clientId) {
      idParams.push(clientId);
      idSql += ` AND s.client_id = $2`;
    }
    const byId = await runQuery(idSql, idParams);
    if (byId.rows.length === 0) {
      throw new AppError(`Topic not found for value "${value}"`, 404);
    }
    const topic = byId.rows[0];
    if (chapterId && Number(topic.chapter_id) !== Number(chapterId)) {
      throw new AppError('Topic does not belong to the provided chapter', 400);
    }
    return { id: topic.id, chapterId: topic.chapter_id };
  }

  if (!chapterId) {
    throw new AppError('chapter_id is required when topic is provided by name/number', 400);
  }

  const parsedTopicNumber = parseGradeNumberToken(parsed.text);
  const normalizedLookup = normalizeBulkLookupTextLower(parsed.text);
  const nameParams = [chapterId, normalizedLookup];
  let nameSql = `
    SELECT t.id, t.chapter_id
    FROM topics t
    JOIN chapters c ON c.id = t.chapter_id
    JOIN subjects s ON s.id = c.subject_id
    WHERE t.chapter_id = $1
      AND LOWER(REGEXP_REPLACE(TRIM(t.name), '\\s+', ' ', 'g')) = $2
  `;
  if (parsedTopicNumber !== null) {
    nameParams.push(parsedTopicNumber);
    nameSql = `
      SELECT t.id, t.chapter_id
      FROM topics t
      JOIN chapters c ON c.id = t.chapter_id
      JOIN subjects s ON s.id = c.subject_id
      WHERE t.chapter_id = $1
        AND (
          LOWER(REGEXP_REPLACE(TRIM(t.name), '\\s+', ' ', 'g')) = $2
          OR t.topic_number = $3
        )
    `;
  }
  if (clientId) {
    nameParams.push(clientId);
    nameSql += ` AND s.client_id = $${nameParams.length}`;
  }
  nameSql += ` ORDER BY t.id LIMIT 2`;

  const byName = await runQuery(nameSql, nameParams);
  if (byName.rows.length === 0) {
    throw new AppError(`Topic not found for value "${value}"`, 404);
  }
  if (byName.rows.length > 1) {
    throw new AppError(`Multiple topics match "${value}". Use topic_id to disambiguate`, 400);
  }
  return { id: byName.rows[0].id, chapterId: byName.rows[0].chapter_id };
};

const finalizeDocxQuestion = (question, defaults, rowNumber) => {
  if (!question || !question.question_text) {
    return null;
  }

  let normalizedQuestionText = forceUppercaseStemStatementsToNewLine(question.question_text);

  let options = (question.options || []).map((option, index) => ({
    id: option.id || `opt-${index + 1}`,
    text: option.text,
  }));

  const answerRaw = question.correct_answer;
  const answerLabels = extractOptionLabelsFromAnswer(answerRaw);
  let inferredQuestionType = normalizeBulkQuestionType(question.question_type || '');
  if (!inferredQuestionType) {
    const plainAnswer = String(answerRaw || '').trim();
    if (options.length > 0) {
      inferredQuestionType = answerLabels.length > 1 ? 'mcq_multiple' : 'mcq_single';
    } else if (/^(true|false)$/i.test(plainAnswer)) {
      inferredQuestionType = 'true_false';
    } else if (/^-?\d+(?:\.\d+)?$/.test(plainAnswer)) {
      inferredQuestionType = 'numerical';
    } else {
      inferredQuestionType = 'short_answer';
    }
  }

  const questionType = inferredQuestionType || 'mcq_single';
  if (questionType === 'match_following') {
    const plainQuestion = toPlainBulkText(normalizedQuestionText);
    const optionPlainText = options
      .map((option) => toPlainBulkText(option?.text || ''))
      .filter((line) => line.length > 0)
      .join(' ');
    const matchSourceText = normalizeBulkTextValue(`${plainQuestion} ${optionPlainText}`);
    const optionsStartMatch = matchSourceText.match(/\boptions\s*[:.-]\s*/i);
    const optionsStartIndex = optionsStartMatch?.index ?? -1;
    const columnSourceText =
      optionsStartIndex >= 0 ? matchSourceText.slice(0, optionsStartIndex).trim() : matchSourceText;
    const optionsSourceText =
      optionsStartIndex >= 0
        ? matchSourceText.slice(optionsStartIndex + String(optionsStartMatch?.[0] || '').length).trim()
        : '';

    const splitByColumns = columnSourceText.match(
      /([\s\S]*?)\bcolumn[\s-]*i\b[\s:.-]*([\s\S]*?)\bcolumn[\s-]*ii\b[\s:.-]*([\s\S]*)/i
    );
    if (splitByColumns) {
      const stem = normalizeBulkTextValue(splitByColumns[1] || '');
      const leftRaw = normalizeBulkTextValue(splitByColumns[2] || '');
      const rightRaw = normalizeBulkTextValue(splitByColumns[3] || '');

      const parseColumnItems = (value) =>
        String(value || '')
          .split(/(?=\([A-Za-z0-9]+\)\s*)/g)
          .map((entry) => normalizeBulkTextValue(entry))
          .map((entry) => entry.replace(/^\([A-Za-z0-9]+\)\s*/i, '').trim())
          .filter((entry) => entry.length > 0);

      const parseMatchChoices = (value) => {
        const chunks = String(value || '')
          .split(/(?=\([A-Da-d]\)\s*)/g)
          .map((entry) => normalizeBulkTextValue(entry))
          .filter((entry) => entry.length > 0);
        return chunks
          .map((entry, index) => {
            const withoutLabel = entry.replace(/^\([A-Da-d]\)\s*/i, '').trim();
            if (!withoutLabel) return null;
            return {
              id: `opt-${index + 1}`,
              text: withoutLabel,
            };
          })
          .filter(Boolean);
      };

      const leftItems = parseColumnItems(leftRaw);
      const rightItems = parseColumnItems(rightRaw);
      const rowCount = Math.max(leftItems.length, rightItems.length);

      if (rowCount > 0) {
        const rowsHtml = [];
        rowsHtml.push('<tr><th>Column I</th><th>Column II</th></tr>');
        for (let i = 0; i < rowCount; i += 1) {
          rowsHtml.push(
            `<tr><td>${escapeHtml(leftItems[i] || '')}</td><td>${escapeHtml(rightItems[i] || '')}</td></tr>`
          );
        }
        const stemHtml = stem ? `<p>${escapeHtml(stem)}</p>` : '';
        normalizedQuestionText = `${stemHtml}<table>${rowsHtml.join('')}</table>`;
        question.match_pairs = rowsHtml.slice(1).map((rowHtml, index) => ({
          left: leftItems[index] || '',
          right: rightItems[index] || '',
        }));
        const parsedChoices = parseMatchChoices(optionsSourceText || optionPlainText);
        if (parsedChoices.length > 0) {
          options = parsedChoices;
          question.options = parsedChoices;
        }
      } else {
        normalizedQuestionText = normalizeDocxCellHtml(
          String(normalizedQuestionText || '')
            .replace(/\bcolumn\s*i\b\s*[:.-]?\s*/gi, ' ')
            .replace(/\bcolumn\s*ii\b\s*[:.-]?\s*/gi, ' ')
            .replace(/\s{2,}/g, ' ')
        );
      }
    } else {
      normalizedQuestionText = normalizeDocxCellHtml(
        String(normalizedQuestionText || '')
          .replace(/\bcolumn\s*i\b\s*[:.-]?\s*/gi, ' ')
          .replace(/\bcolumn\s*ii\b\s*[:.-]?\s*/gi, ' ')
          .replace(/\s{2,}/g, ' ')
      );
    }
  }
  let correctAnswer = answerRaw;
  if (questionType === 'true_false') {
    const answerValue = String(answerRaw || '').trim().toLowerCase();
    correctAnswer = answerValue === 'true';
  } else if (questionType === 'numerical') {
    correctAnswer = Number(answerRaw);
  } else if (questionType === 'mcq_single') {
    const mapped = mapAnswerTokenToOptionId(answerRaw, options);
    correctAnswer = mapped ?? String(answerRaw || '').trim();
  } else if (questionType === 'mcq_multiple') {
    const tokens = String(answerRaw || '')
      .split(/[|,;]/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0);
    const mapped = tokens
      .map((token) => mapAnswerTokenToOptionId(token, options))
      .filter(Boolean);
    correctAnswer = mapped.length > 0 ? mapped : tokens;
  } else if (questionType === 'comprehension') {
    const mapped = mapAnswerTokenToOptionId(answerRaw, options);
    correctAnswer = mapped ?? String(answerRaw || '').trim();
  }

  const prepared = applyBulkDefaults(
    {
      question_type: questionType,
      question_text: normalizedQuestionText,
      options: options.length > 0 ? options : null,
      correct_answer: correctAnswer,
      match_pairs: question.match_pairs ?? null,
      program_id: question.program_id,
      grade_id: question.grade_id,
      subject_id: question.subject_id,
      chapter_id: question.chapter_id,
      topic_id: question.topic_id,
      difficulty_level: question.difficulty_level ?? null,
      exam_tags: question.exam_tags || [],
      category: question.category ?? null,
      marks_positive: question.marks_positive ?? null,
      marks_negative: question.marks_negative ?? null,
      solution: question.solution ?? null,
      solution_video_url: question.solution_video_url ?? null,
      school_id: question.school_id ?? null,
      status: question.status ?? undefined,
      has_comprehension: Boolean(question.has_comprehension || question.comprehension_passage),
      passage_key: question.passage_key ?? null,
      passage_title: question.passage_title ?? null,
      passage_content: question.passage_content ?? question.comprehension_passage ?? null,
      comprehension_passage: question.comprehension_passage ?? null,
    },
    defaults
  );

  if (!prepared.subject_id || !prepared.chapter_id) {
    throw new AppError(
      `Row ${rowNumber}: subject_id and chapter_id are required (set in file or upload defaults)`,
      400
    );
  }
  return prepared;
};

const extractDocxRows = (buffer, defaults) => {
  const { zip, relationshipMap, documentXml } = loadDocxExtractionContext(buffer);
  const paragraphMatches = documentXml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
  if (paragraphMatches.length === 0) {
    throw new AppError('Word file has no readable paragraph content', 400);
  }

  const rawQuestions = [];
  const answerKeyMap = new Map();
  const solutionMap = new Map();
  let globalMeta = {};
  let current = null;
  let pendingPassage = null;
  let sectionQuestionType = '';
  let sectionDifficultyLevel = null;
  let sectionComprehensionMode = false;
  let sectionComprehensionPassage = '';
  let sectionTags = [];
  let mode = 'questions';
  let pendingAnswerNumber = null;
  let sequentialAnswerIndex = 0;
  let currentSolutionNumber = null;
  let currentSolutionHtml = '';
  let currentSection = 'none';
  const eqDebugEnabled = isConverterEquationDebugEnabled();
  const parsedParagraphs = [];
  const questionOrderKeys = [];
  const optionStartRegex = /^\(([1-9]\d*|[A-Ha-h])\)\s*(.*)$/;

  const pushCurrent = () => {
    if (!current) return;
    const rowNumber = rawQuestions.length + 2;
    if (eqDebugEnabled && Array.isArray(current._debugMathBlocks) && current._debugMathBlocks.length > 0) {
      const blockSummary = current._debugMathBlocks
        .map((entry, idx) => `#${idx + 1}:${entry.source}:${entry.kinds.join('+')}`)
        .join(', ');
      // eslint-disable-next-line no-console
      console.log(`[converter:eq-debug] row=${rowNumber} blocks=${current._debugMathBlocks.length} ${blockSummary}`);
    }
    rawQuestions.push({ ...current });
    current = null;
    currentSection = 'none';
  };

  const flushCurrentSolution = () => {
    const solutionKey = buildDocxQuestionLookupKey(currentSolutionNumber);
    if (!solutionKey) {
      currentSolutionNumber = null;
      currentSolutionHtml = '';
      return;
    }
    if (hasMeaningfulRichContent(currentSolutionHtml)) {
      solutionMap.set(solutionKey, normalizeDocxCellHtml(currentSolutionHtml));
    }
    currentSolutionNumber = null;
    currentSolutionHtml = '';
  };

  paragraphMatches.forEach((paragraphXml) => {
    const { paragraphHtml, detectionText, mathBlocks } = extractParagraphContent(
      paragraphXml,
      relationshipMap,
      zip
    );
    if (!detectionText && !paragraphHtml) return;
    parsedParagraphs.push({ paragraphHtml, detectionText, mathBlocks });

    const metaMatch = detectionText.match(
      /^(program_id|grade_id|subject_id|chapter_id|topic_id|difficulty_level|marks_positive|marks_negative|exam_tags|status|school_id)\s*:\s*(.+)$/i
    );
    if ((mode === 'questions' || mode === 'metadata') && !current && metaMatch) {
      const key = metaMatch[1].toLowerCase();
      const value = metaMatch[2].trim();
      if (key === 'exam_tags') {
        globalMeta.exam_tags = value
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
      } else {
        globalMeta[key] = value;
      }
      return;
    }

    if (/key\s*&\s*detailed solutions|consolidated answer key/i.test(detectionText)) {
      pushCurrent();
      flushCurrentSolution();
      mode = 'answers';
      pendingAnswerNumber = null;
      sequentialAnswerIndex = 0;
      return;
    }

    const solutionStartMatch = detectionText.match(/^solution\s+(\d+)\.?\s*(.*)$/i);
    if (solutionStartMatch) {
      pushCurrent();
      flushCurrentSolution();
      mode = 'solutions';
      currentSolutionNumber = Number.parseInt(solutionStartMatch[1], 10);
      const strippedSolutionHtml = stripLeadingRichLabel(
        paragraphHtml || escapeHtml(detectionText),
        /^solution\s+\d+\.?\s*/i
      );
      if (strippedSolutionHtml) {
        currentSolutionHtml = appendRichHtmlBlock(currentSolutionHtml, strippedSolutionHtml);
      }
      return;
    }

    if (mode === 'answers') {
      if (/^(q|answer)$/i.test(detectionText)) {
        return;
      }

      const standaloneAnswerNumber = detectionText.match(/^(\d{1,4})$/);
      if (standaloneAnswerNumber) {
        pendingAnswerNumber = Number.parseInt(standaloneAnswerNumber[1], 10);
        return;
      }

      const inlineAnswerOnlyMatch = detectionText.match(/^answer\s*[:.-]\s*(.+)$/i);
      if (inlineAnswerOnlyMatch && pendingAnswerNumber === null) {
        const lookupKey = questionOrderKeys[sequentialAnswerIndex] || null;
        if (lookupKey) {
          answerKeyMap.set(
            lookupKey,
            richTextToSingleLineText(
              stripLeadingRichLabel(paragraphHtml || escapeHtml(detectionText), /^answer\s*[:.-]\s*/i)
            ) || inlineAnswerOnlyMatch[1].trim()
          );
          sequentialAnswerIndex += 1;
        }
        return;
      }

      if (pendingAnswerNumber !== null) {
        const answerKey = buildDocxQuestionLookupKey(pendingAnswerNumber);
        if (answerKey) {
          answerKeyMap.set(answerKey, richTextToSingleLineText(paragraphHtml || detectionText));
        }
        pendingAnswerNumber = null;
      }
      return;
    }

    if (mode === 'solutions') {
      const inlineSolutionAnswerMatch = detectionText.match(/^answer\s*:\s*(.+)$/i);
      const lookupKey = buildDocxQuestionLookupKey(currentSolutionNumber);
      if (inlineSolutionAnswerMatch && lookupKey) {
        answerKeyMap.set(
          lookupKey,
          richTextToSingleLineText(
            stripLeadingRichLabel(paragraphHtml || escapeHtml(detectionText), /^answer\s*:\s*/i)
          ) || inlineSolutionAnswerMatch[1].trim()
        );
      }
      currentSolutionHtml = appendRichHtmlBlock(
        currentSolutionHtml,
        paragraphHtml || escapeHtml(detectionText)
      );
      return;
    }

    if (isDocxSectionHeading(detectionText)) {
      pushCurrent();
      sectionQuestionType = normalizeDocxSectionQuestionType(detectionText);
      sectionComprehensionMode = /comprehension/i.test(detectionText);
      sectionComprehensionPassage = '';
      sectionDifficultyLevel = null;
      sectionTags = [];
      return;
    }

    const sectionDifficultyMatch = detectionText.match(/\b(easy|medium|hard)\b/i);
    if (!current && sectionDifficultyMatch) {
      sectionDifficultyLevel = String(sectionDifficultyMatch[1] || '').toLowerCase();
    }

    if (isDocxTagHeading(detectionText)) {
      const normalizedTag = normalizeDocxTagHeading(detectionText);
      if (normalizedTag) {
        sectionTags = [normalizedTag];
      }
      return;
    }

    if (
      /^(remember|understand|apply|analyse|analyze|evaluate)\s+level$/i.test(detectionText) ||
      /^one or more options may be correct\b/i.test(detectionText) ||
      /^pedagogically curated split\b/i.test(detectionText)
    ) {
      return;
    }

    if (!current) {
      const standalonePassageMatch = detectionText.match(
        /^(passage|comprehension_passage|comprehensive passage)\s*[:.-]\s*(.*)$/i
      );
      if (standalonePassageMatch) {
        const strippedStandalonePassage = stripLeadingRichLabel(
          paragraphHtml || escapeHtml(detectionText),
          /^(passage|comprehension_passage|comprehensive passage)\s*[:.-]\s*/i
        );
        pendingPassage = appendRichHtmlBlock(pendingPassage, strippedStandalonePassage);
        return;
      }

      if (pendingPassage) {
        const passageContinuationQuestion =
          detectionText.match(/^question(?:\s+\d+)?\s*[:.-]\s*(.*)$/i) ||
          detectionText.match(/^q\d+\s*[:.-]\s*(.*)$/i) ||
          detectionText.match(/^\d+\s*[\).:-]\s*(.*)$/i);
        if (!passageContinuationQuestion) {
          pendingPassage = appendRichHtmlBlock(pendingPassage, paragraphHtml || escapeHtml(detectionText));
          return;
        }
      }
      if (sectionComprehensionMode) {
        const looksLikeQuestion =
          detectionText.match(/^question(?:\s+\d+)?\s*[:.-]\s*(.*)$/i) ||
          detectionText.match(/^q\d+\s*[:.-]\s*(.*)$/i) ||
          detectionText.match(/^\d+\s*[\).:-]\s*(.*)$/i);
        if (!looksLikeQuestion) {
          sectionComprehensionPassage = appendRichHtmlBlock(
            sectionComprehensionPassage,
            paragraphHtml || escapeHtml(detectionText)
          );
          return;
        }
      }
    }

    const questionMatch =
      detectionText.match(/^question(?:\s+\d+)?\s*[:.-]\s*(.*)$/i) ||
      detectionText.match(/^q\d+\s*[:.-]\s*(.*)$/i) ||
      detectionText.match(/^\d+\s*[\).:-]\s*(.*)$/i);
    if (questionMatch) {
      pushCurrent();
      const inlineTag = extractInlineDocxTag(detectionText);
      const questionNumber = extractDocxQuestionNumber(detectionText);
      const strippedQuestionHtml = stripLeadingRichLabel(
        stripInlineDocxTag(paragraphHtml || escapeHtml(detectionText)),
        /^(?:question(?:\s+\d+)?|q\d+|\d+)\s*[:\).-]\s*/i
      );
      current = {
        ...globalMeta,
        question_number: questionNumber,
        question_type: sectionQuestionType || '',
        difficulty_level: sectionDifficultyLevel || null,
        question_text: '',
        options: [],
        exam_tags: inlineTag ? [inlineTag] : [...sectionTags],
        _debugMathBlocks: [],
      };
      if (pendingPassage) {
        current.has_comprehension = true;
        current.comprehension_passage = pendingPassage;
        current.passage_content = pendingPassage;
        pendingPassage = null;
      } else if (sectionComprehensionMode && hasMeaningfulRichContent(sectionComprehensionPassage)) {
        current.has_comprehension = true;
        current.comprehension_passage = sectionComprehensionPassage;
        current.passage_content = sectionComprehensionPassage;
      }
      if (strippedQuestionHtml) {
        current.question_text = appendRichHtmlBlock(current.question_text, strippedQuestionHtml);
      } else if (questionMatch[1]) {
        current.question_text = appendRichHtmlBlock(current.question_text, escapeHtml(questionMatch[1]));
      } else if (paragraphHtml) {
        current.question_text = appendRichHtmlBlock(current.question_text, paragraphHtml);
      }
      const normalizedOrderKey = buildDocxQuestionLookupKey(questionNumber || rawQuestions.length + 1);
      if (normalizedOrderKey) {
        questionOrderKeys.push(normalizedOrderKey);
      }
      currentSection = 'question';
      return;
    }

    if (!current) {
      return;
    }

    if (eqDebugEnabled && Array.isArray(mathBlocks) && mathBlocks.length > 0) {
      current._debugMathBlocks = current._debugMathBlocks || [];
      current._debugMathBlocks.push(...mathBlocks);
    }

    const typeMatch = detectionText.match(/^type\s*:\s*(.+)$/i);
    if (typeMatch) {
      current.question_type = typeMatch[1].trim();
      return;
    }

    if (metaMatch) {
      const key = metaMatch[1].toLowerCase();
      const value = metaMatch[2].trim();
      if (key === 'exam_tags') {
        current.exam_tags = value
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
      } else {
        current[key] = value;
      }
      return;
    }

    const inlinePassageMatch = detectionText.match(
      /^(passage|comprehension_passage|comprehensive passage)\s*[:.-]\s*(.*)$/i
    );
    if (inlinePassageMatch) {
      const strippedPassageHtml = stripLeadingRichLabel(
        paragraphHtml || escapeHtml(detectionText),
        /^(passage|comprehension_passage|comprehensive passage)\s*[:.-]\s*/i
      );
      current.comprehension_passage = appendRichHtmlBlock(current.comprehension_passage, strippedPassageHtml);
      current.passage_content = current.comprehension_passage;
      current.has_comprehension = true;
      return;
    }

    const answerMatch = detectionText.match(
      /^(answer|ans|correct_answer|correct answer|correct option|key)\s*[:.-]\s*(.+)$/i
    );
    if (answerMatch) {
      current.correct_answer = richTextToSingleLineText(
        stripLeadingRichLabel(paragraphHtml || escapeHtml(detectionText), /^(answer|ans|correct_answer|correct answer|correct option|key)\s*[:.-]\s*/i)
      ) || answerMatch[2].trim();
      currentSection = 'answer';
      current._collecting_solution = false;
      return;
    }

    const solutionLabelMatch = detectionText.match(/^solution\s*:?\s*(.*)$/i);
    if (solutionLabelMatch) {
      current._collecting_solution = true;
      currentSection = 'solution';
      const strippedSolutionHtml = stripLeadingRichLabel(
        paragraphHtml || escapeHtml(detectionText),
        /^solution\s*:?\s*/i
      );
      if (strippedSolutionHtml) {
        current.solution = appendRichHtmlBlock(current.solution, strippedSolutionHtml);
      }
      return;
    }

    if (current._collecting_solution) {
      current.solution = appendRichHtmlBlock(current.solution, paragraphHtml || escapeHtml(detectionText));
      currentSection = 'solution';
      return;
    }

    const optionMatch = detectionText.match(optionStartRegex);
    if (optionMatch) {
      const optionHtml = stripLeadingRichLabel(
        paragraphHtml || escapeHtml(detectionText),
        /^\((?:[1-9]\d*|[A-Ha-h])\)\s*/i
      );
      const optionText = optionHtml || escapeHtml(optionMatch[2] || '').trim();
      if (!optionText) return;
      current.options.push({
        id: `opt-${current.options.length + 1}`,
        text: optionText,
      });
      currentSection = 'option';
      return;
    }

    if (currentSection === 'option' && Array.isArray(current.options) && current.options.length > 0) {
      const lastIndex = current.options.length - 1;
      current.options[lastIndex].text = appendRichHtmlBlock(
        current.options[lastIndex].text,
        paragraphHtml || escapeHtml(detectionText)
      );
      return;
    }

    if (currentSection === 'answer') {
      const incoming = richTextToSingleLineText(paragraphHtml || detectionText);
      if (incoming) {
        const existing = String(current.correct_answer || '').trim();
        current.correct_answer = existing ? `${existing} ${incoming}`.trim() : incoming;
      }
      return;
    }

    currentSection = 'question';
    current.question_text = appendRichHtmlBlock(current.question_text, paragraphHtml || escapeHtml(detectionText));
  });

  pushCurrent();
  flushCurrentSolution();

  const rows = rawQuestions.map((question, index) => {
    const lookupKey = buildDocxQuestionLookupKey(question.question_number);
    if (lookupKey) {
      if (
        (question.correct_answer === undefined || question.correct_answer === null || String(question.correct_answer).trim() === '') &&
        answerKeyMap.has(lookupKey)
      ) {
        question.correct_answer = answerKeyMap.get(lookupKey);
      }
      if (!hasMeaningfulRichContent(question.solution) && solutionMap.has(lookupKey)) {
        question.solution = solutionMap.get(lookupKey);
      }
    }
    return finalizeDocxQuestion(question, defaults, index + 2);
  }).filter(Boolean);

  if (rows.length === 0) {
    const fallbackRows = extractDocxRowsByMarkerRanges(parsedParagraphs, defaults);
    if (fallbackRows.length > 0) {
      return fallbackRows;
    }
    throw new AppError(
      'No questions found in Word file. Use "Question:", option lines like "A) ...", and "Answer:"',
      400
    );
  }

  return rows;
};

const extractDocxRowsByMarkerRanges = (parsedParagraphs, defaults) => {
  const rows = [];
  let globalMeta = {};
  let current = null;
  let pendingQuestion = '';
  let inQuestionSection = false;
  let section = 'none';
  const optionStartRegex = /^\(([1-9]\d*|[A-Ha-h])\)\s*(.*)$/;
  const parseOptionIndex = (label) => {
    const token = String(label || '').trim();
    if (!token) return null;
    if (/^\d+$/.test(token)) {
      const numericIndex = Number.parseInt(token, 10) - 1;
      return numericIndex >= 0 ? numericIndex : null;
    }
    const upper = token.toUpperCase();
    const code = upper.charCodeAt(0);
    if (code >= 65 && code <= 72) return code - 65;
    return null;
  };

  const pushCurrent = () => {
    if (!current) return;
    const normalized = finalizeDocxQuestion(current, defaults, rows.length + 2);
    if (normalized) rows.push(normalized);
    current = null;
    section = 'none';
  };

  const appendPendingQuestion = (html) => {
    pendingQuestion = appendRichHtmlBlock(pendingQuestion, html);
  };

  const appendToCurrentSection = (html) => {
    if (!current) return;
    const block = html || '';
    if (!normalizeDocxCellHtml(block)) return;

    if (section === 'question') {
      current.question_text = appendRichHtmlBlock(current.question_text, block);
      return;
    }
    if (section.startsWith('opt:')) {
      current.options = current.options || [];
      const targetIndex = Number.parseInt(section.slice(4), 10);
      if (!Number.isInteger(targetIndex) || targetIndex < 0) return;
      while (current.options.length <= targetIndex) {
        current.options.push({
          id: `opt-${current.options.length + 1}`,
          text: '',
        });
      }
      current.options[targetIndex].text = appendRichHtmlBlock(current.options[targetIndex].text, block);
      return;
    }
    if (section === 'answer') {
      const existing = String(current.correct_answer || '').trim();
      const incoming = toPlainBulkText(block);
      current.correct_answer = existing ? `${existing} ${incoming}`.trim() : incoming;
      return;
    }
    if (section === 'solution') {
      current.solution = appendRichHtmlBlock(current.solution, block);
    }
  };

  const isLikelySectionHeading = (text) =>
    /^(worksheet|category|syllabus|answer key|detailed solutions|comprehension type)\b/i.test(
      String(text || '').trim()
    );

  parsedParagraphs.forEach(({ paragraphHtml, detectionText }) => {
    const text = String(detectionText || '').trim();
    if (!text) return;

    if (/answer key/i.test(text)) {
      inQuestionSection = true;
      if (!current) {
        pendingQuestion = '';
      }
      return;
    }

    const metaMatch = text.match(
      /^(program_id|grade_id|subject_id|chapter_id|topic_id|difficulty_level|marks_positive|marks_negative|exam_tags|status|school_id)\s*:\s*(.+)$/i
    );
    if (!current && metaMatch) {
      const key = metaMatch[1].toLowerCase();
      const value = metaMatch[2].trim();
      if (key === 'exam_tags') {
        globalMeta.exam_tags = value
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
      } else {
        globalMeta[key] = value;
      }
      return;
    }

    const explicitQuestionMatch =
      text.match(/^question(?:\s+\d+)?\s*[:.-]\s*(.*)$/i) ||
      text.match(/^q\d+\s*[:.-]\s*(.*)$/i) ||
      text.match(/^\d+\s*[\).:-]\s*(.*)$/i);

    const optionMatch = text.match(optionStartRegex);
    const answerMatch = text.match(
      /^(answer|ans|correct_answer|correct answer|correct option|key)\s*[:.-]?\s*(.*)$/i
    );
    const solutionMatch = text.match(/^solution\s*:?\s*(.*)$/i);

    if (!inQuestionSection && !explicitQuestionMatch) {
      return;
    }
    if (isLikelySectionHeading(text) && !explicitQuestionMatch && !optionMatch && !answerMatch && !solutionMatch) {
      return;
    }

    if (explicitQuestionMatch) {
      pushCurrent();
      current = {
        ...globalMeta,
        question_type: '',
        question_text: pendingQuestion || '',
        options: [],
      };
      pendingQuestion = '';
      section = 'question';
      const strippedQuestionHtml = stripLeadingRichLabel(
        paragraphHtml || escapeHtml(text),
        /^(?:question(?:\s+\d+)?|q\d+|\d+)\s*[:\).-]\s*/i
      );
      if (strippedQuestionHtml) {
        appendToCurrentSection(strippedQuestionHtml);
      }
      return;
    }

    if (!current) {
      if (optionMatch) {
        const optionIndex = parseOptionIndex(optionMatch[1]);
        if (optionIndex === null) {
          appendPendingQuestion(paragraphHtml || escapeHtml(text));
          return;
        }
        current = {
          ...globalMeta,
          question_type: '',
          question_text: pendingQuestion || '',
          options: [],
        };
        pendingQuestion = '';
        section = `opt:${optionIndex}`;
      } else {
        appendPendingQuestion(paragraphHtml || escapeHtml(text));
        return;
      }
    }

    if (optionMatch) {
      const optionIndex = parseOptionIndex(optionMatch[1]);
      if (optionIndex === null) return;
      section = `opt:${optionIndex}`;
      const optionHtml = stripLeadingRichLabel(
        paragraphHtml || escapeHtml(text),
        /^\((?:[1-9]\d*|[A-Ha-h])\)\s*/i
      );
      if (optionHtml) {
        appendToCurrentSection(optionHtml);
      }
      return;
    }

    if (solutionMatch) {
      section = 'solution';
      const strippedSolutionHtml = stripLeadingRichLabel(
        paragraphHtml || escapeHtml(text),
        /^solution\s*:?\s*/i
      );
      if (strippedSolutionHtml) {
        appendToCurrentSection(strippedSolutionHtml);
      }
      return;
    }

    if (answerMatch) {
      section = 'answer';
      const answerTextRaw = String(answerMatch[2] || '').trim();
      const solutionInlineMatch = answerTextRaw.match(/^(.*?)(?:\s*solution\s*:?\s*)(.*)$/i);
      if (solutionInlineMatch) {
        const answerPart = normalizeBulkTextValue(solutionInlineMatch[1]);
        if (answerPart) {
          appendToCurrentSection(escapeHtml(answerPart));
        }
        section = 'solution';
        const solutionPart = normalizeBulkTextValue(solutionInlineMatch[2]);
        if (solutionPart) {
          appendToCurrentSection(escapeHtml(solutionPart));
        }
      } else if (answerTextRaw) {
        appendToCurrentSection(escapeHtml(answerTextRaw));
      }
      return;
    }

    if (section === 'none') {
      if (current && current.options && current.options.length > 0) {
        section = 'd';
      } else if (current) {
        section = 'question';
      }
    }

    if (!current) {
      appendPendingQuestion(paragraphHtml || escapeHtml(text));
    } else {
      appendToCurrentSection(paragraphHtml || escapeHtml(text));
    }
  });

  pushCurrent();
  return rows;
};

const extractBulkRowsFromFile = async (file, defaults) => {
  const extension = getFileExtension(file?.originalname || '');
  if (extension === 'csv') {
    const csvText = file.buffer.toString('utf8');
    const parsedRows = parseCsvContent(csvText);
    return parsedRows.map((row) => normalizeCsvRowInput(row, defaults));
  }

  if (extension === 'docx') {
    const tableRows = await extractDocxTableRows(file.buffer, defaults);
    const hasTableRows = tableRows.length > 0;
    const validTableRows = tableRows.filter(
      (row) => !(row && typeof row === 'object' && row._bulk_error)
    );
    if (validTableRows.length > 0) {
      return validTableRows;
    }
    if (hasTableRows) {
      const firstTableErrorRow = tableRows.find(
        (row) => row && typeof row === 'object' && row._bulk_error
      );
      if (firstTableErrorRow && firstTableErrorRow._bulk_error) {
        const tableErrorText = String(firstTableErrorRow._bulk_error || '');
        const shouldFallbackToParagraphParser =
          /no table content|no data rows|header row could not be read|header is invalid|no rows could be parsed/i.test(
            tableErrorText
          );
        if (!shouldFallbackToParagraphParser) {
          throw new AppError(tableErrorText, 400);
        }
      }
    }
    return extractDocxRows(file.buffer, defaults);
  }

  if (extension === 'doc') {
    throw new AppError('Legacy .doc is not supported. Please upload .docx instead.', 400);
  }

  throw new AppError('Unsupported file type. Allowed: .csv, .docx', 400);
};

const buildQuestionInsertPayload = async ({ input, user, role, clientId, queryRunner = dbQuery }) => {
  if (
    input.comprehension_passage !== undefined ||
    input.comprehensive_passage !== undefined ||
    input.comprehension_questions !== undefined ||
    input.comprehensive_subquestions !== undefined
  ) {
    throw new AppError('Legacy comprehensive payloads are no longer supported. Create a passage and link comprehension_passage_id instead.', 400);
  }

  const questionType = requireString(input.question_type, 'question_type');
  if (!VALID_QUESTION_TYPES.includes(questionType)) {
    throw new AppError('Invalid question_type', 400);
  }

  const scoringModeInput = input.scoring_mode ? String(input.scoring_mode) : 'all_or_nothing';
  if (!VALID_SCORING_MODES.includes(scoringModeInput)) {
    throw new AppError('Invalid scoring_mode', 400);
  }

  const questionTextInput = input.question_text;
  if (!hasMeaningfulRichContent(questionTextInput)) {
    throw new AppError('question_text must contain text or an image', 400);
  }
  const questionText = typeof questionTextInput === 'string' ? questionTextInput.trim() : questionTextInput;

  let correctAnswerRaw = coerceLooseValue(input.correct_answer);
  const missingCorrectAnswer =
    correctAnswerRaw === undefined ||
    correctAnswerRaw === null ||
    (typeof correctAnswerRaw === 'string' && !correctAnswerRaw.trim());
  if (missingCorrectAnswer) {
    throw new AppError('correct_answer is required', 400);
  }

  const resolvedProgramId = await resolveProgramReference({
    value: input.program_id ?? input.program,
    clientId,
    queryRunner,
  });
  const resolvedGrade = await resolveGradeReference({
    value: input.grade_id ?? input.grade,
    programId: resolvedProgramId,
    clientId,
    queryRunner,
  });
  const resolvedSubject = await resolveSubjectReference({
    value: input.subject_id ?? input.subject,
    gradeId: resolvedGrade.id,
    programId: resolvedProgramId ?? resolvedGrade.programId,
    clientId,
    required: true,
    queryRunner,
  });
  const resolvedChapter = await resolveChapterReference({
    value: input.chapter_id ?? input.chapter,
    subjectId: resolvedSubject.id,
    clientId,
    required: true,
    queryRunner,
  });
  const resolvedTopic = await resolveTopicReference({
    value: input.topic_id ?? input.topic,
    chapterId: resolvedChapter.id,
    clientId,
    queryRunner,
  });

  const programId = resolvedProgramId ?? resolvedGrade.programId ?? resolvedSubject.programId ?? null;
  const gradeId = resolvedGrade.id ?? resolvedSubject.gradeId ?? null;
  const subjectId = resolvedSubject.id;
  const chapterId = resolvedChapter.id;
  const topicId = resolvedTopic.id;

  await ensureCurriculumScope({
    programId,
    gradeId,
    subjectId,
    chapterId,
    topicId,
    clientId,
    queryRunner,
  });

  const schoolId = parseNullableInt(input.school_id, 'school_id');
  await ensureSchoolAccess({ schoolId, role, userId: user.id, clientId, queryRunner });

  const difficulty = input.difficulty_level ? String(input.difficulty_level) : 'medium';
  if (!VALID_DIFFICULTY_LEVELS.includes(difficulty)) {
    throw new AppError('Invalid difficulty_level', 400);
  }

  const statusInput = input.status ? String(input.status) : null;
  const status =
    isTeacher(role) ? 'draft' : statusInput && VALID_STATUSES.includes(statusInput) ? statusInput : 'draft';

  const options = parseOptionsInput(input.options);
  if (questionType.startsWith('mcq') && (!options || options.length === 0)) {
    throw new AppError('options are required for MCQ questions', 400);
  }
  if (questionType.startsWith('mcq') && options?.some((option) => !hasMeaningfulRichContent(option?.text ?? option))) {
    throw new AppError('each MCQ option must contain text or an image', 400);
  }

  const schemaSupport = await getQuestionSchemaSupport();
  let folderId = null;
  if (input.folder_id !== undefined) {
    if (!schemaSupport.hasFolderId) {
      throw new AppError('This database does not support folder assignment on questions yet', 400);
    }
    const parsedFolderId = parseNullableInt(input.folder_id, 'folder_id');
    if (parsedFolderId) {
      folderId = await ensureBulkFolderAccess({
        folderId: parsedFolderId,
        user,
        role,
        clientId,
      });
    }
  }
  let comprehensionPassageId = null;
  if (input.comprehension_passage_id !== undefined && input.comprehension_passage_id !== null && input.comprehension_passage_id !== '') {
    if (!schemaSupport.hasComprehensionPassageId || !schemaSupport.hasComprehensionPassageTable) {
      throw new AppError('This database does not support linked passages yet', 400);
    }
    comprehensionPassageId = parseRequiredInt(input.comprehension_passage_id, 'comprehension_passage_id');
    const { error } = await getComprehensionPassageByIdScopedInternal({
      id: comprehensionPassageId,
      user,
      role,
      clientId,
    });
    if (error) {
      throw new AppError(error.body.error, error.status);
    }
  }

  return {
    client_id: clientId,
    school_id: schoolId,
    question_type: questionType,
    question_text: questionText,
    options,
    correct_answer: correctAnswerRaw,
    solution: input.solution ?? null,
    solution_video_url: input.solution_video_url ?? null,
    comprehension_passage_id: comprehensionPassageId,
    folder_id: folderId,
    subject_id: subjectId,
    chapter_id: chapterId,
    topic_id: topicId,
    scoring_mode: scoringModeInput,
    difficulty_level: difficulty,
    category: parseCategoryInput(input.category ?? input.catagory),
    exam_tags: parseExamTagsInput(input.exam_tags ?? input.tags),
    marks_positive: parseNumberField(input.marks_positive, 'marks_positive', 4),
    marks_negative: parseNumberField(input.marks_negative, 'marks_negative', 0),
    status,
    created_by: user.id,
  };
};

let questionSchemaSupportCache = null;

const getQuestionSchemaSupport = async () => {
  if (questionSchemaSupportCache) {
    return questionSchemaSupportCache;
  }

  const result = await dbQuery(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'questions'
      AND column_name = ANY($1::text[])
    `,
    [['comprehension_passage', 'comprehension_questions', 'comprehension_passage_id', 'folder_id']]
  );

  const tableResult = await dbQuery(
    `
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'comprehension_passages'
    LIMIT 1
    `
  );

  const existingColumns = new Set(result.rows.map((row) => row.column_name));
  questionSchemaSupportCache = {
    hasComprehensionPassageTable: tableResult.rows.length > 0,
    hasComprehensionPassage: existingColumns.has('comprehension_passage'),
    hasComprehensionQuestions: existingColumns.has('comprehension_questions'),
    hasComprehensionPassageId: existingColumns.has('comprehension_passage_id'),
    hasFolderId: existingColumns.has('folder_id'),
  };
  return questionSchemaSupportCache;
};

const coerceRichTextValue = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? { html: trimmed } : null;
  }
  if (typeof value === 'object') {
    if ('html' in value) {
      const html = String(value.html ?? '').trim();
      return html.length ? { ...value, html } : null;
    }
    return value;
  }
  return { html: String(value) };
};

const ensureRichTextValue = (value, fieldName) => {
  const normalized = coerceRichTextValue(value);
  if (
    !normalized ||
    (typeof normalized === 'object' && 'html' in normalized && String(normalized.html ?? '').trim().length === 0)
  ) {
    throw new AppError(`${fieldName} is required`, 400);
  }
  return normalized;
};

const normalizePassageTitle = (passage) => {
  if (!passage) return null;
  return coerceRichTextValue(passage.title ?? passage.prompt_text ?? null);
};

const buildComprehensionSummary = (source) => {
  const passageId = source.comprehension_passage_id ?? source.passage_id ?? source.id ?? null;
  const passageContent =
    source.passage_content ?? source.comprehension_passage_content ?? source.comprehension_passage ?? null;
  if (!passageId || !passageContent) return null;
  return {
    id: Number(passageId),
    title: normalizePassageTitle(source),
    passage_content: passageContent,
  };
};

const attachLegacyComprehensionFallback = (question) => {
  if (!question || question.comprehension) return question;
  if (question.question_type !== 'comprehensive') return question;
  if (!question.comprehension_passage) return question;

  return {
    ...question,
    comprehension: {
      id: Number(question.id),
      title: coerceRichTextValue(question.question_text),
      passage_content: question.comprehension_passage,
    },
  };
};

const fetchComprehensionSummaryMap = async (passageIds) => {
  const schemaSupport = await getQuestionSchemaSupport();
  if (!schemaSupport.hasComprehensionPassageTable) return new Map();

  const normalizedIds = [...new Set(
    (Array.isArray(passageIds) ? passageIds : [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
  )];

  if (normalizedIds.length === 0) return new Map();

  const result = await dbQuery(
    `
    SELECT id, title, passage_content
    FROM comprehension_passages
    WHERE id = ANY($1::int[])
    `,
    [normalizedIds]
  );

  return new Map(
    result.rows.map((row) => [
      Number(row.id),
      {
        id: Number(row.id),
        title: normalizePassageTitle(row),
        passage_content: row.passage_content,
      },
    ])
  );
};

const attachComprehensionSummaries = async (rows) => {
  const schemaSupport = await getQuestionSchemaSupport();
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const summaryMap = schemaSupport.hasComprehensionPassageId
    ? await fetchComprehensionSummaryMap(rows.map((row) => row.comprehension_passage_id))
    : new Map();

  return rows.map((row) => {
    const summary = row.comprehension_passage_id ? summaryMap.get(Number(row.comprehension_passage_id)) ?? null : null;
    if (summary) {
      return {
        ...row,
        comprehension: summary,
      };
    }
    return attachLegacyComprehensionFallback(row);
  });
};

const getComprehensionPassageByIdScopedInternal = async ({
  id,
  user,
  role,
  clientId,
  queryRunner = dbQuery,
}) => {
  const runQuery = getQueryRunner(queryRunner);
  const schemaSupport = await getQuestionSchemaSupport();
  if (!schemaSupport.hasComprehensionPassageTable) {
    throw new AppError('This database does not support comprehension passages yet', 400);
  }

  const result = await runQuery(`SELECT * FROM comprehension_passages WHERE id = $1`, [id]);
  if (result.rows.length === 0) {
    return { error: { status: 404, body: { error: 'Passage not found' } } };
  }

  const passage = result.rows[0];
  if (clientId && passage.client_id !== clientId) {
    return { error: { status: 403, body: { error: 'Access denied' } } };
  }

  if (isSchoolOwner(role) || isTeacher(role)) {
    const schoolIds = await fetchUserSchoolIds(user.id, queryRunner);
    if (passage.school_id && !schoolIds.includes(passage.school_id)) {
      return { error: { status: 403, body: { error: 'Access denied' } } };
    }
  }

  return {
    passage: {
      ...passage,
      title: normalizePassageTitle(passage),
    },
  };
};

const getQuestionByIdScoped = async ({ id, user, role, clientId }) => {
  const existing = await dbQuery(`SELECT * FROM questions WHERE id = $1`, [id]);
  if (existing.rows.length === 0 || existing.rows[0].status === 'archived') {
    return { error: { status: 404, body: { error: 'Question not found' } } };
  }

  const question = existing.rows[0];
  if (clientId && question.client_id !== clientId) {
    return { error: { status: 403, body: { error: 'Access denied' } } };
  }

  if (isSchoolOwner(role) || isTeacher(role)) {
    const schoolIds = await fetchUserSchoolIds(user.id);
    if (question.school_id && !schoolIds.includes(question.school_id)) {
      return { error: { status: 403, body: { error: 'Access denied' } } };
    }
  }

  return { question };
};

const insertQuestion = async (payload, queryRunner = dbQuery) => {
  const runQuery = getQueryRunner(queryRunner);
  const schemaSupport = await getQuestionSchemaSupport();
  const columns = [
    'client_id',
    'school_id',
    'question_type',
    'question_text',
    'options',
    'correct_answer',
    'solution',
    'solution_video_url',
    'scoring_mode',
  ];
  const values = [
    payload.client_id,
    payload.school_id,
    payload.question_type,
    toDbJsonParam(payload.question_text),
    toDbJsonParam(payload.options),
    toDbJsonParam(payload.correct_answer),
    toDbJsonParam(payload.solution),
    payload.solution_video_url,
    payload.scoring_mode,
  ];
  if (schemaSupport.hasComprehensionPassageId) {
    columns.push('comprehension_passage_id');
    values.push(payload.comprehension_passage_id);
  }
  if (schemaSupport.hasFolderId) {
    columns.push('folder_id');
    values.push(payload.folder_id ?? null);
  }

  columns.push(
    'subject_id',
    'chapter_id',
    'topic_id',
    'difficulty_level',
    'category',
    'exam_tags',
    'marks_positive',
    'marks_negative',
    'status',
    'created_by'
  );
  values.push(
    payload.subject_id,
    payload.chapter_id,
    payload.topic_id,
    payload.difficulty_level,
    toDbJsonParam(payload.category),
    payload.exam_tags,
    payload.marks_positive,
    payload.marks_negative,
    payload.status,
    payload.created_by
  );

  const placeholders = values.map((_, index) => `$${index + 1}`).join(',');
  const insertResult = await runQuery(
    `
    INSERT INTO questions (${columns.join(', ')})
    VALUES (${placeholders})
    RETURNING id
    `,
    values
  );

  const insertedId = insertResult.rows[0].id;
  const fullResult = await runQuery(
    `
    SELECT q.*, s.grade_id, g.program_id
    FROM questions q
    LEFT JOIN subjects s ON s.id = q.subject_id
    LEFT JOIN grades g ON g.id = s.grade_id
    WHERE q.id = $1
    `,
    [insertedId]
  );
  const [hydrated] = await attachComprehensionSummaries(fullResult.rows);
  return hydrated;
};

export const listQuestions = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.page_size || '20', 10), 1), 100);
    const offset = (page - 1) * pageSize;

    const { conditions, params } = await buildQuestionWhere({
      user: req.user,
      query: req.query,
    });

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await dbQuery(
      `SELECT COUNT(*) AS total FROM questions q ${whereClause}`,
      params
    );

    const total = Number(countResult.rows[0]?.total || 0);
    const listParams = [...params, pageSize, offset];
    const listResult = await dbQuery(
      `
      SELECT q.*, s.grade_id, g.program_id
      FROM questions q
      LEFT JOIN subjects s ON s.id = q.subject_id
      LEFT JOIN grades g ON g.id = s.grade_id
      ${whereClause}
      ORDER BY q.created_at DESC
      LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
      `,
      listParams
    );

    const hydratedRows = await attachComprehensionSummaries(listResult.rows);

    res.json({
      data: hydratedRows,
      page,
      page_size: pageSize,
      total,
    });
  } catch (err) {
    handleServiceError(res, err, 'Failed to load questions');
  }
};

export const getQuestionById = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = parseRequiredInt(req.params.id, 'id');
    const role = req.user.role;
    const clientId = ensureClientScope(req.user.client_id ?? null, role);

    const conditions = ['q.id = $1'];
    const params = [id];

    if (clientId) {
      conditions.push(`q.client_id = $${params.length + 1}`);
      params.push(clientId);
    }

    if (isTeacher(role) || isSchoolOwner(role)) {
      const schoolIds = await fetchUserSchoolIds(req.user.id);
      if (schoolIds.length > 0) {
        conditions.push(`(q.school_id IS NULL OR q.school_id = ANY($${params.length + 1}))`);
        params.push(schoolIds);
      } else {
        conditions.push(`q.school_id IS NULL`);
      }
    }

    if (isTeacher(role)) {
      conditions.push(`(q.status = 'approved' OR q.created_by = $${params.length + 1})`);
      params.push(req.user.id);
    }

    conditions.push(`q.status <> 'archived'`);

    const query = `
      SELECT q.*, s.grade_id, g.program_id
      FROM questions q
      LEFT JOIN subjects s ON s.id = q.subject_id
      LEFT JOIN grades g ON g.id = s.grade_id
      WHERE ${conditions.join(' AND ')}
      LIMIT 1
    `;

    const result = await dbQuery(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const [hydrated] = await attachComprehensionSummaries(result.rows);
    res.json(hydrated);
  } catch (err) {
    handleServiceError(res, err, 'Failed to load question');
  }
};

export const createQuestion = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = req.user.role;
    const clientId = ensureClientScope(req.user.client_id ?? null, role);
    const payload = await buildQuestionInsertPayload({
      input: req.body,
      user: req.user,
      role,
      clientId,
    });
    const inserted = await insertQuestion(payload);
    res.status(201).json(inserted);
  } catch (err) {
    handleServiceError(res, err, 'Failed to create question');
  }
};

export const updateQuestion = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = parseRequiredInt(req.params.id, 'id');
    const role = req.user.role;
    const clientId = ensureClientScope(req.user.client_id ?? null, role);

    const existing = await dbQuery(`SELECT * FROM questions WHERE id = $1`, [id]);
    if (existing.rows.length === 0 || existing.rows[0].status === 'archived') {
      return res.status(404).json({ error: 'Question not found' });
    }
    const question = existing.rows[0];

    if (clientId && question.client_id !== clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (isTeacher(role)) {
      if (question.created_by !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (!['draft', 'rejected'].includes(question.status)) {
        return res.status(403).json({ error: 'Only draft or rejected questions can be edited' });
      }
    }

    if (question.question_type === 'comprehensive') {
      return res.status(400).json({ error: 'Legacy comprehensive questions cannot be edited in-place. Migrate them to linked passages first.' });
    }

    if (isTeacher(role) || isSchoolOwner(role)) {
      const schoolIds = await fetchUserSchoolIds(req.user.id);
      if (question.school_id && !schoolIds.includes(question.school_id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const updates = {};

    if (req.body.question_type) {
      if (!VALID_QUESTION_TYPES.includes(req.body.question_type)) {
        throw new AppError('Invalid question_type', 400);
      }
      updates.question_type = req.body.question_type;
    }

    if (
      req.body.comprehension_passage !== undefined ||
      req.body.comprehensive_passage !== undefined ||
      req.body.comprehension_questions !== undefined ||
      req.body.comprehensive_subquestions !== undefined
    ) {
      throw new AppError('Legacy comprehensive payloads are no longer supported. Link a comprehension_passage_id instead.', 400);
    }

    if (req.body.question_text !== undefined) updates.question_text = toDbJsonParam(req.body.question_text);
    if (req.body.options !== undefined) updates.options = toDbJsonParam(req.body.options ?? null);
    if (req.body.correct_answer !== undefined) updates.correct_answer = toDbJsonParam(req.body.correct_answer);
    if (req.body.solution !== undefined) updates.solution = toDbJsonParam(req.body.solution ?? null);
    if (req.body.solution_video_url !== undefined) updates.solution_video_url = req.body.solution_video_url ?? null;
    const schemaSupport = await getQuestionSchemaSupport();
    if (req.body.comprehension_passage_id !== undefined) {
      if (!schemaSupport.hasComprehensionPassageId || !schemaSupport.hasComprehensionPassageTable) {
        throw new AppError('This database does not support linked passages yet', 400);
      }
      const passageId = parseNullableInt(req.body.comprehension_passage_id, 'comprehension_passage_id');
      if (passageId) {
        const { error } = await getComprehensionPassageByIdScopedInternal({
          id: passageId,
          user: req.user,
          role,
          clientId,
        });
        if (error) {
          return res.status(error.status).json(error.body);
        }
      }
      updates.comprehension_passage_id = passageId;
    }

    if (
      req.body.program_id !== undefined ||
      req.body.grade_id !== undefined ||
      req.body.subject_id !== undefined ||
      req.body.chapter_id !== undefined ||
      req.body.topic_id !== undefined
    ) {
      const programId = req.body.program_id !== undefined
        ? parseNullableInt(req.body.program_id, 'program_id')
        : null;
      const gradeId = req.body.grade_id !== undefined
        ? parseNullableInt(req.body.grade_id, 'grade_id')
        : null;
      const subjectId = req.body.subject_id ? parseRequiredInt(req.body.subject_id, 'subject_id') : question.subject_id;
      const chapterId = req.body.chapter_id ? parseRequiredInt(req.body.chapter_id, 'chapter_id') : question.chapter_id;
      const topicId = req.body.topic_id !== undefined ? parseNullableInt(req.body.topic_id, 'topic_id') : question.topic_id;
      await ensureCurriculumScope({ programId, gradeId, subjectId, chapterId, topicId, clientId });
      updates.subject_id = subjectId;
      updates.chapter_id = chapterId;
      updates.topic_id = topicId;
    }

    if (req.body.difficulty_level) {
      if (!VALID_DIFFICULTY_LEVELS.includes(req.body.difficulty_level)) {
        throw new AppError('Invalid difficulty_level', 400);
      }
      updates.difficulty_level = req.body.difficulty_level;
    }
    //  console.log("req.body.scoring_mode: ", req.body.scoring_mode);
    if (req.body.scoring_mode !== undefined) {
      if (!VALID_SCORING_MODES.includes(req.body.scoring_mode)) {
        throw new AppError('Invalid scoring_mode', 400);
      }
      updates.scoring_mode = req.body.scoring_mode;
    }

    if (req.body.folder_id !== undefined) {
      if (!schemaSupport.hasFolderId) {
        throw new AppError('This database does not support folder assignment on questions yet', 400);
      }
      const folderId = parseNullableInt(req.body.folder_id, 'folder_id');
      updates.folder_id = folderId
        ? await ensureBulkFolderAccess({
          folderId,
          user: req.user,
          role,
          clientId,
        })
        : null;
    }

    if (req.body.exam_tags !== undefined) {
      updates.exam_tags = parseStringArray(req.body.exam_tags, 'exam_tags');
    }
    if (req.body.category !== undefined || req.body.catagory !== undefined) {
      updates.category = toDbJsonParam(parseCategoryInput(req.body.category ?? req.body.catagory));
    }

    if (req.body.marks_positive !== undefined) updates.marks_positive = req.body.marks_positive;
    if (req.body.marks_negative !== undefined) updates.marks_negative = req.body.marks_negative;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const setClauses = [];
    const values = [];
    let idx = 1;
    Object.entries(updates).forEach(([column, value]) => {
      setClauses.push(`${column} = $${idx++}`);
      values.push(value);
    });
    values.push(id);

    const updateResult = await dbQuery(
      `UPDATE questions SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING id`,
      values
    );

    const fullResult = await dbQuery(
      `
      SELECT q.*, s.grade_id, g.program_id
      FROM questions q
      LEFT JOIN subjects s ON s.id = q.subject_id
      LEFT JOIN grades g ON g.id = s.grade_id
      WHERE q.id = $1
      `,
      [updateResult.rows[0].id]
    );
    const [hydrated] = await attachComprehensionSummaries(fullResult.rows);
    res.json(hydrated);
  } catch (err) {
    handleServiceError(res, err, 'Failed to update question');
  }
};

const buildPassageWhere = async ({ user, query }) => {
  const role = user?.role;
  const clientId = ensureClientScope(user?.client_id ?? null, role);
  const conditions = [];
  const params = [];

  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  const schemaSupport = await getQuestionSchemaSupport();
  if (!schemaSupport.hasComprehensionPassageTable) {
    throw new AppError('This database does not support comprehension passages yet', 400);
  }

  if (clientId) {
    conditions.push(`cp.client_id = ${addParam(clientId)}`);
  }

  if (isTeacher(role) || isSchoolOwner(role)) {
    const schoolIds = await fetchUserSchoolIds(user.id);
    if (schoolIds.length > 0) {
      conditions.push(`(cp.school_id IS NULL OR cp.school_id = ANY(${addParam(schoolIds)}))`);
    } else {
      conditions.push(`cp.school_id IS NULL`);
    }
  }

  const schoolId = parseNullableInt(query.school_id, 'school_id');
  if (schoolId) conditions.push(`cp.school_id = ${addParam(schoolId)}`);

  const programId = parseNullableInt(query.program_id, 'program_id');
  if (programId) conditions.push(`cp.program_id = ${addParam(programId)}`);

  const gradeId = parseNullableInt(query.grade_id, 'grade_id');
  if (gradeId) conditions.push(`cp.grade_id = ${addParam(gradeId)}`);

  const subjectId = parseNullableInt(query.subject_id, 'subject_id');
  if (subjectId) conditions.push(`cp.subject_id = ${addParam(subjectId)}`);

  const chapterId = parseNullableInt(query.chapter_id, 'chapter_id');
  if (chapterId) conditions.push(`cp.chapter_id = ${addParam(chapterId)}`);

  const topicId = parseNullableInt(query.topic_id, 'topic_id');
  if (topicId) conditions.push(`cp.topic_id = ${addParam(topicId)}`);

  if (query.q) {
    const search = String(query.q).trim();
    if (search.length > 0) {
      conditions.push(
        `to_tsvector('simple', coalesce(cp.title::text,'') || ' ' || coalesce(cp.passage_content::text,'')) @@ plainto_tsquery('simple', ${addParam(search)})`
      );
    }
  }

  return { conditions, params };
};

const normalizePassageRow = (row) => ({
  ...row,
  title: normalizePassageTitle(row),
});

const createComprehensionPassageRecord = async ({
  input,
  user,
  role,
  clientId,
  queryRunner = dbQuery,
}) => {
  const runQuery = getQueryRunner(queryRunner);
  const schemaSupport = await getQuestionSchemaSupport();
  if (!schemaSupport.hasComprehensionPassageTable) {
    throw new AppError('This database does not support comprehension passages yet', 400);
  }

  const title = ensureRichTextValue(input?.title, 'title');
  const passageContent = ensureRichTextValue(input?.passage_content, 'passage_content');
  const schoolId = parseNullableInt(input?.school_id, 'school_id');
  await ensureSchoolAccess({ schoolId, role, userId: user.id, clientId, queryRunner });

  const programId = await resolveProgramReference({
    value: input?.program_id ?? input?.program,
    clientId,
    queryRunner,
  });
  const gradeResult = await resolveGradeReference({
    value: input?.grade_id ?? input?.grade,
    programId,
    clientId,
    queryRunner,
  });
  const subjectResult = await resolveSubjectReference({
    value: input?.subject_id ?? input?.subject,
    gradeId: gradeResult.id,
    programId: gradeResult.programId ?? programId,
    clientId,
    queryRunner,
  });
  const chapterResult = await resolveChapterReference({
    value: input?.chapter_id ?? input?.chapter,
    subjectId: subjectResult.id,
    clientId,
    queryRunner,
  });
  const topicResult = await resolveTopicReference({
    value: input?.topic_id ?? input?.topic,
    chapterId: chapterResult.id,
    clientId,
    queryRunner,
  });

  const resolvedProgramId = programId ?? gradeResult.programId ?? subjectResult.programId ?? null;
  const resolvedGradeId = gradeResult.id ?? subjectResult.gradeId ?? null;
  const resolvedSubjectId = subjectResult.id ?? null;
  const resolvedChapterId = chapterResult.id ?? null;
  const resolvedTopicId = topicResult.id ?? null;

  await ensureCurriculumScope({
    programId: resolvedProgramId,
    gradeId: resolvedGradeId,
    subjectId: resolvedSubjectId,
    chapterId: resolvedChapterId,
    topicId: resolvedTopicId,
    clientId,
    queryRunner,
  });

  const result = await runQuery(
    `
    INSERT INTO comprehension_passages (
      client_id,
      school_id,
      title,
      passage_content,
      program_id,
      grade_id,
      subject_id,
      chapter_id,
      topic_id,
      created_by
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *
    `,
    [
      clientId,
      schoolId,
      toDbJsonParam(title),
      toDbJsonParam(passageContent),
      resolvedProgramId,
      resolvedGradeId,
      resolvedSubjectId,
      resolvedChapterId,
      resolvedTopicId,
      user.id,
    ]
  );

  return normalizePassageRow(result.rows[0]);
};

export const listComprehensionPassages = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.page_size || '20', 10), 1), 100);
    const offset = (page - 1) * pageSize;

    const { conditions, params } = await buildPassageWhere({ user: req.user, query: req.query });
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await dbQuery(
      `SELECT COUNT(*) AS total FROM comprehension_passages cp ${whereClause}`,
      params
    );

    const listParams = [...params, pageSize, offset];
    const result = await dbQuery(
      `
      SELECT cp.*
      FROM comprehension_passages cp
      ${whereClause}
      ORDER BY cp.updated_at DESC, cp.id DESC
      LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
      `,
      listParams
    );

    res.json({
      data: result.rows.map(normalizePassageRow),
      page,
      page_size: pageSize,
      total: Number(countResult.rows[0]?.total || 0),
    });
  } catch (err) {
    handleServiceError(res, err, 'Failed to load comprehension passages');
  }
};

export const getComprehensionPassageById = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = parseRequiredInt(req.params.id, 'id');
    const role = req.user.role;
    const clientId = ensureClientScope(req.user.client_id ?? null, role);
    const { passage, error } = await getComprehensionPassageByIdScopedInternal({
      id,
      user: req.user,
      role,
      clientId,
    });

    if (error) {
      return res.status(error.status).json(error.body);
    }

    res.json(passage);
  } catch (err) {
    handleServiceError(res, err, 'Failed to load comprehension passage');
  }
};

export const createComprehensionPassage = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = req.user.role;
    const clientId = ensureClientScope(req.user.client_id ?? null, role);
    const passage = await createComprehensionPassageRecord({
      input: req.body,
      user: req.user,
      role,
      clientId,
    });

    res.status(201).json(passage);
  } catch (err) {
    handleServiceError(res, err, 'Failed to create comprehension passage');
  }
};

export const updateComprehensionPassage = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = parseRequiredInt(req.params.id, 'id');
    const role = req.user.role;
    const clientId = ensureClientScope(req.user.client_id ?? null, role);
    const { passage, error } = await getComprehensionPassageByIdScopedInternal({
      id,
      user: req.user,
      role,
      clientId,
    });

    if (error) {
      return res.status(error.status).json(error.body);
    }

    const updates = {};

    if (req.body?.title !== undefined) {
      updates.title = toDbJsonParam(ensureRichTextValue(req.body.title, 'title'));
    }

    if (req.body?.passage_content !== undefined) {
      updates.passage_content = toDbJsonParam(ensureRichTextValue(req.body.passage_content, 'passage_content'));
    }

    if (req.body?.school_id !== undefined) {
      const schoolId = parseNullableInt(req.body.school_id, 'school_id');
      await ensureSchoolAccess({ schoolId, role, userId: req.user.id, clientId });
      updates.school_id = schoolId;
    }

    if (
      req.body?.program_id !== undefined ||
      req.body?.grade_id !== undefined ||
      req.body?.subject_id !== undefined ||
      req.body?.chapter_id !== undefined ||
      req.body?.topic_id !== undefined
    ) {
      const programId = req.body?.program_id !== undefined
        ? await resolveProgramReference({ value: req.body.program_id, clientId })
        : passage.program_id;
      const gradeResult = await resolveGradeReference({
        value: req.body?.grade_id !== undefined ? req.body.grade_id : passage.grade_id,
        programId,
        clientId,
      });
      const subjectResult = await resolveSubjectReference({
        value: req.body?.subject_id !== undefined ? req.body.subject_id : passage.subject_id,
        gradeId: gradeResult.id,
        programId: gradeResult.programId ?? programId,
        clientId,
      });
      const chapterResult = await resolveChapterReference({
        value: req.body?.chapter_id !== undefined ? req.body.chapter_id : passage.chapter_id,
        subjectId: subjectResult.id,
        clientId,
      });
      const topicResult = await resolveTopicReference({
        value: req.body?.topic_id !== undefined ? req.body.topic_id : passage.topic_id,
        chapterId: chapterResult.id,
        clientId,
      });

      const resolvedProgramId = programId ?? gradeResult.programId ?? subjectResult.programId ?? null;
      const resolvedGradeId = gradeResult.id ?? subjectResult.gradeId ?? null;
      const resolvedSubjectId = subjectResult.id ?? null;
      const resolvedChapterId = chapterResult.id ?? null;
      const resolvedTopicId = topicResult.id ?? null;

      await ensureCurriculumScope({
        programId: resolvedProgramId,
        gradeId: resolvedGradeId,
        subjectId: resolvedSubjectId,
        chapterId: resolvedChapterId,
        topicId: resolvedTopicId,
        clientId,
      });

      updates.program_id = resolvedProgramId;
      updates.grade_id = resolvedGradeId;
      updates.subject_id = resolvedSubjectId;
      updates.chapter_id = resolvedChapterId;
      updates.topic_id = resolvedTopicId;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const setClauses = [];
    const values = [];
    let idx = 1;
    Object.entries(updates).forEach(([column, value]) => {
      setClauses.push(`${column} = $${idx++}`);
      values.push(value);
    });
    values.push(id);

    const result = await dbQuery(
      `UPDATE comprehension_passages SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      values
    );

    res.json(normalizePassageRow(result.rows[0]));
  } catch (err) {
    handleServiceError(res, err, 'Failed to update comprehension passage');
  }
};

export const softDeleteQuestion = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = req.user.role;
    if (isTeacher(role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const id = parseRequiredInt(req.params.id, 'id');
    const clientId = ensureClientScope(req.user.client_id ?? null, role);

    const { question, error } = await getQuestionByIdScoped({
      id,
      user: req.user,
      role,
      clientId,
    });
    if (error) {
      return res.status(error.status).json(error.body);
    }

    const result = await dbQuery(
      `UPDATE questions
       SET status = 'archived', updated_at = NOW()
       WHERE id = $1 AND status <> 'archived'
       RETURNING id, status`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Question status changed. Please refresh and try again.' });
    }

    res.json({ success: true, question: result.rows[0] });
  } catch (err) {
    handleServiceError(res, err, 'Failed to delete question');
  }
};

export const approveQuestion = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = req.user.role;
    if (isTeacher(role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const id = parseRequiredInt(req.params.id, 'id');
    const clientId = ensureClientScope(req.user.client_id ?? null, role);

    const { question, error } = await getQuestionByIdScoped({
      id,
      user: req.user,
      role,
      clientId,
    });
    if (error) {
      return res.status(error.status).json(error.body);
    }

    if (question.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft questions can be approved' });
    }

    const result = await dbQuery(
      `
      UPDATE questions
      SET status = 'approved',
          approved_by = $2,
          approved_at = NOW(),
          rejection_reason = NULL,
          updated_at = NOW()
      WHERE id = $1
        AND status = 'draft'
      RETURNING *
      `,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Question status changed. Please refresh and try again.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to approve question');
  }
};

export const rejectQuestion = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = req.user.role;
    if (isTeacher(role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const id = parseRequiredInt(req.params.id, 'id');
    const clientId = ensureClientScope(req.user.client_id ?? null, role);
    const reason = requireString(req.body?.reason, 'reason');

    const { question, error } = await getQuestionByIdScoped({
      id,
      user: req.user,
      role,
      clientId,
    });
    if (error) {
      return res.status(error.status).json(error.body);
    }

    if (question.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft questions can be rejected' });
    }

    const result = await dbQuery(
      `
      UPDATE questions
      SET status = 'rejected',
          approved_by = $2,
          approved_at = NULL,
          rejection_reason = $3,
          updated_at = NOW()
      WHERE id = $1
        AND status = 'draft'
      RETURNING *
      `,
      [id, req.user.id, reason]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Question status changed. Please refresh and try again.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to reject question');
  }
};

const parseBooleanParam = (value, fieldName) => {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  throw new AppError(`${fieldName} must be a boolean`, 400);
};

const buildFolderAccess = async ({ user, clientId, schoolIdFilter, includeInactive }) => {
  const role = user?.role;
  const conditions = [];
  const params = [];

  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (clientId) {
    conditions.push(`f.client_id = ${addParam(clientId)}`);
  }

  if (!includeInactive) {
    conditions.push(`f.is_active = TRUE`);
  }

  const isScopedBySchool = isTeacher(role) || isSchoolOwner(role);
  let schoolIds = [];
  if (isScopedBySchool) {
    schoolIds = await fetchUserSchoolIds(user.id);
    if (schoolIds.length > 0) {
      conditions.push(`(f.school_id IS NULL OR f.school_id = ANY(${addParam(schoolIds)}))`);
    } else {
      conditions.push(`f.school_id IS NULL`);
    }
  }

  if (schoolIdFilter !== null && schoolIdFilter !== undefined) {
    conditions.push(`f.school_id = ${addParam(schoolIdFilter)}`);
  }

  return { conditions, params, addParam };
};

export const listQuestionFolders = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = req.user.role;
    const clientId = ensureClientScope(req.user.client_id ?? null, role);
    const schoolIdFilter = parseNullableInt(req.query.school_id, 'school_id');
    const includeInactive = parseBooleanParam(req.query.include_inactive, 'include_inactive') ?? false;
    await ensureSchoolAccess({ schoolId: schoolIdFilter, role, userId: req.user.id, clientId });

    const { conditions, params, addParam } = await buildFolderAccess({
      user: req.user,
      clientId,
      schoolIdFilter,
      includeInactive,
    });

    const questionJoinConditions = [
      `q.folder_id = f.id`,
      `q.status <> 'archived'`,
      `q.client_id = f.client_id`,
    ];
    if (isTeacher(role)) {
      questionJoinConditions.push(`(q.status = 'approved' OR q.created_by = ${addParam(req.user.id)})`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await dbQuery(
      `
      SELECT f.*, COUNT(q.id) AS question_count
      FROM question_folders f
      LEFT JOIN questions q ON ${questionJoinConditions.join(' AND ')}
      ${whereClause}
      GROUP BY f.id
      ORDER BY f.created_at DESC
      `,
      params
    );

    res.json(result.rows);
  } catch (err) {
    handleServiceError(res, err, 'Failed to load question folders');
  }
};

export const getQuestionFolderById = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = req.user.role;
    const clientId = ensureClientScope(req.user.client_id ?? null, role);
    const id = parseRequiredInt(req.params.id, 'id');
    const includeInactive = parseBooleanParam(req.query.include_inactive, 'include_inactive') ?? false;

    const { conditions, params, addParam } = await buildFolderAccess({
      user: req.user,
      clientId,
      schoolIdFilter: null,
      includeInactive,
    });

    conditions.push(`f.id = ${addParam(id)}`);

    const questionJoinConditions = [
      `q.folder_id = f.id`,
      `q.status <> 'archived'`,
      `q.client_id = f.client_id`,
    ];
    if (isTeacher(role)) {
      questionJoinConditions.push(`(q.status = 'approved' OR q.created_by = ${addParam(req.user.id)})`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await dbQuery(
      `
      SELECT f.*, COUNT(q.id) AS question_count
      FROM question_folders f
      LEFT JOIN questions q ON ${questionJoinConditions.join(' AND ')}
      ${whereClause}
      GROUP BY f.id
      LIMIT 1
      `,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to load folder');
  }
};

export const createQuestionFolder = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = req.user.role;
    let clientId = ensureClientScope(req.user.client_id ?? null, role);
    if (!clientId) {
      clientId = parseNullableInt(req.body.client_id, 'client_id');
      if (!clientId) {
        throw new AppError('client_id is required for this role', 400);
      }
    }

    const name = requireString(req.body?.name, 'name');
    const descriptionInput = req.body?.description;
    const description =
      descriptionInput === undefined || descriptionInput === null
        ? null
        : String(descriptionInput).trim() || null;

    const schoolId = parseNullableInt(req.body?.school_id, 'school_id');
    await ensureSchoolAccess({ schoolId, role, userId: req.user.id, clientId });

    const insertResult = await dbQuery(
      `
      INSERT INTO question_folders (client_id, school_id, name, description, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [clientId, schoolId, name, description, req.user.id]
    );

    res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to create folder');
  }
};

export const updateQuestionFolder = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = req.user.role;
    const clientId = ensureClientScope(req.user.client_id ?? null, role);
    const id = parseRequiredInt(req.params.id, 'id');

    const existing = await dbQuery(`SELECT * FROM question_folders WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    const folder = existing.rows[0];

    if (clientId && folder.client_id !== clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (isTeacher(role) || isSchoolOwner(role)) {
      const schoolIds = await fetchUserSchoolIds(req.user.id);
      if (folder.school_id && !schoolIds.includes(folder.school_id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const updates = {};

    if (req.body?.name !== undefined) {
      updates.name = requireString(req.body.name, 'name');
    }

    if (req.body?.description !== undefined) {
      const descriptionInput = req.body.description;
      updates.description =
        descriptionInput === undefined || descriptionInput === null
          ? null
          : String(descriptionInput).trim() || null;
    }

    if (req.body?.school_id !== undefined) {
      const schoolId = parseNullableInt(req.body.school_id, 'school_id');
      await ensureSchoolAccess({ schoolId, role, userId: req.user.id, clientId });
      updates.school_id = schoolId;
    }

    if (req.body?.is_active !== undefined) {
      updates.is_active = parseBooleanParam(req.body.is_active, 'is_active');
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const setClauses = [];
    const values = [];
    let idx = 1;
    Object.entries(updates).forEach(([column, value]) => {
      setClauses.push(`${column} = $${idx++}`);
      values.push(value);
    });
    values.push(id);

    const updateResult = await dbQuery(
      `UPDATE question_folders SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      values
    );

    res.json(updateResult.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to update folder');
  }
};

export const archiveQuestionFolderQuestions = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = req.user.role;
    if (isTeacher(role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const folderId = parseRequiredInt(req.params.id, 'id');
    const clientId = ensureClientScope(req.user.client_id ?? null, role);
    const scopedFolderId = await ensureBulkFolderAccess({
      folderId,
      user: req.user,
      role,
      clientId,
    });

    const schemaSupport = await getQuestionSchemaSupport();
    if (!schemaSupport.hasFolderId) {
      throw new AppError('This database does not support folder assignment on questions yet', 400);
    }

    const result = await dbQuery(
      `
      UPDATE questions
      SET status = 'archived', updated_at = NOW()
      WHERE folder_id = $1
        AND status <> 'archived'
        AND ($2::int IS NULL OR client_id = $2)
      RETURNING id
      `,
      [scopedFolderId, clientId]
    );

    res.json({
      folder_id: scopedFolderId,
      archived: result.rows.length,
    });
  } catch (err) {
    handleServiceError(res, err, 'Failed to delete folder questions');
  }
};

const buildTemplateRow = (cells) =>
  new TableRow({
    children: cells.map(
      (value) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun(String(value ?? ''))] })],
        })
    ),
  });

const TEMPLATE_HEADERS = [
  'Sno',
  'Type',
  'Question',
  'Options',
  'Correct Answer',
  'Solution',
  'Difficulty',
  'Marks+',
  'Marks-',
  'Tags',
  'Program',
  'Grade',
  'Subject',
  'Chapter',
  'Topic',
  'Has Comprehension',
  'Passage Key',
  'Passage Title',
  'Passage Content',
  'Category',
];

export const bulkUploadTemplate = async (_req, res) => {
  try {
    const table = new Table({
      rows: [
        buildTemplateRow(TEMPLATE_HEADERS),
        buildTemplateRow([
          '1',
          'mcq_single',
          'What is 2 + 2?',
          'A) 2;B) 3;C) 4;D) 5',
          'C',
          '2 + 2 = 4.',
          'easy',
          '4',
          '1',
          'math,arithmetic',
          'Catalyst',
          '6',
          'Math',
          'Basics',
          'Addition',
          'no',
          '',
          '',
          '',
          'direct question',
        ]),
        buildTemplateRow([
          '2',
          'mcq_single',
          'What is the main idea of the passage?',
          'A) Rainforests are shrinking;B) Rainforests support many species;C) Rainforests are cold deserts;D) Rainforests have no rainfall',
          'B',
          'The passage explains biodiversity in rainforests.',
          'medium',
          '4',
          '1',
          'reading,passage',
          'Catalyst',
          '8',
          'English',
          'Comprehension',
          'Rainforests',
          'yes',
          'P1',
          'Rainforest Reading',
          'Rainforests support rich biodiversity and help regulate climate across the planet.',
          'passage based',
        ]),
      ],
    });

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Question Bank Bulk Upload Template', bold: true })],
            }),
            new Paragraph(''),
            table,
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="question-bank-template.docx"');
    res.send(buffer);
  } catch (err) {
    handleServiceError(res, err, 'Failed to generate bulk upload template');
  }
};

const CONVERTER_TEMPLATE_HEADERS = TEMPLATE_HEADERS;

const decodeStoredRichText = (value) => toPlainBulkText(value ?? '');

const decodeHtmlEntitiesForDocx = (value) =>
  String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const SUPERSCRIPT_UNICODE_MAP = {
  0: '⁰',
  1: '¹',
  2: '²',
  3: '³',
  4: '⁴',
  5: '⁵',
  6: '⁶',
  7: '⁷',
  8: '⁸',
  9: '⁹',
  '+': '⁺',
  '-': '⁻',
  '=': '⁼',
  '(': '⁽',
  ')': '⁾',
  n: 'ⁿ',
  i: 'ⁱ',
};

const SUBSCRIPT_UNICODE_MAP = {
  0: '₀',
  1: '₁',
  2: '₂',
  3: '₃',
  4: '₄',
  5: '₅',
  6: '₆',
  7: '₇',
  8: '₈',
  9: '₉',
  '+': '₊',
  '-': '₋',
  '=': '₌',
  '(': '₍',
  ')': '₎',
  a: 'ₐ',
  e: 'ₑ',
  h: 'ₕ',
  i: 'ᵢ',
  j: 'ⱼ',
  k: 'ₖ',
  l: 'ₗ',
  m: 'ₘ',
  n: 'ₙ',
  o: 'ₒ',
  p: 'ₚ',
  r: 'ᵣ',
  s: 'ₛ',
  t: 'ₜ',
  u: 'ᵤ',
  v: 'ᵥ',
  x: 'ₓ',
};

const mapStringWithUnicode = (value, map, fallbackPrefix) => {
  const input = decodeHtmlEntitiesForDocx(value);
  if (!input) return '';
  let usedFallback = false;
  const transformed = Array.from(input)
    .map((ch) => {
      const key = ch.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(map, key)) {
        return map[key];
      }
      usedFallback = true;
      return ch;
    })
    .join('');
  if (!usedFallback) return transformed;
  return `${fallbackPrefix}(${input})`;
};

const htmlMathNodeToLinear = ($, node) => {
  if (!node) return '';
  if (node.type === 'text') {
    return decodeHtmlEntitiesForDocx($(node).text());
  }
  if (node.type !== 'tag') return '';

  const tag = String(node.name || '').toLowerCase();
  if (tag === 'br') return ' ';

  if (tag === 'sup') {
    return mapStringWithUnicode($(node).text(), SUPERSCRIPT_UNICODE_MAP, '^');
  }
  if (tag === 'sub') {
    return mapStringWithUnicode($(node).text(), SUBSCRIPT_UNICODE_MAP, '_');
  }

  let acc = '';
  (node.children || []).forEach((child) => {
    acc += htmlMathNodeToLinear($, child);
  });
  return acc;
};

const htmlMathToLinearText = (mathHtml) => {
  const source = normalizeDocxCellHtml(mathHtml);
  if (!source) return '';
  const $ = loadHtml(`<root>${source}</root>`);
  let linear = '';
  $('root')
    .contents()
    .each((_, node) => {
      linear += htmlMathNodeToLinear($, node);
    });
  return normalizeBulkTextValue(linear);
};

const parseDataUrlImage = (src) => {
  const match = String(src || '').match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return null;
  try {
    const mimeType = String(match[1] || '').toLowerCase();
    const docxTypeByMime = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/gif': 'gif',
      'image/bmp': 'bmp',
    };
    const type = docxTypeByMime[mimeType];
    if (!type) return null;
    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer || buffer.length === 0) return null;
    return {
      mimeType,
      type,
      data: buffer,
    };
  } catch (_err) {
    return null;
  }
};

const htmlToDocxRuns = (html, styles = {}) => {
  const source = normalizeDocxCellHtml(html);
  if (!source) return [];

  const $ = loadHtml(`<root>${source}</root>`);
  const root = $('root');
  const runs = [];
  const inlineMathTokenRegex =
    /((?:\b\d+\s*\/\s*\d+\b)|(?:\b[a-zA-Z]+\s*\/\s*[a-zA-Z0-9]+\b)|(?:[πθΔΩαβγλμ]\s*\/\s*\d+)|(?:[A-Za-z]\s*[\^]\s*[-]?\d+)|(?:sin|cos|tan)\s*[A-Za-zθπ])/gi;

  const pushInlineTextWithMath = (text, inheritedStyles = {}) => {
    const input = decodeHtmlEntitiesForDocx(text);
    if (!input) return;
    let lastIndex = 0;
    let match = inlineMathTokenRegex.exec(input);
    if (!match) {
      runs.push(
        new TextRun({
          text: input,
          bold: Boolean(inheritedStyles.bold),
          italics: Boolean(inheritedStyles.italics),
          underline: inheritedStyles.underline ? {} : undefined,
          superScript: Boolean(inheritedStyles.superScript),
          subScript: Boolean(inheritedStyles.subScript),
        })
      );
      return;
    }

    inlineMathTokenRegex.lastIndex = 0;
    for (const tokenMatch of input.matchAll(inlineMathTokenRegex)) {
      const tokenStart = tokenMatch.index ?? 0;
      const tokenText = String(tokenMatch[0] || '').trim();
      if (tokenStart > lastIndex) {
        runs.push(
          new TextRun({
            text: input.slice(lastIndex, tokenStart),
            bold: Boolean(inheritedStyles.bold),
            italics: Boolean(inheritedStyles.italics),
            underline: inheritedStyles.underline ? {} : undefined,
            superScript: Boolean(inheritedStyles.superScript),
            subScript: Boolean(inheritedStyles.subScript),
          })
        );
      }
      if (tokenText) {
        runs.push(
          new DocxMath({
            children: [new MathRun(tokenText.replace(/\s+/g, ' ').trim())],
          })
        );
      }
      lastIndex = tokenStart + String(tokenMatch[0] || '').length;
    }
    if (lastIndex < input.length) {
      runs.push(
        new TextRun({
          text: input.slice(lastIndex),
          bold: Boolean(inheritedStyles.bold),
          italics: Boolean(inheritedStyles.italics),
          underline: inheritedStyles.underline ? {} : undefined,
          superScript: Boolean(inheritedStyles.superScript),
          subScript: Boolean(inheritedStyles.subScript),
        })
      );
    }
  };

  const walkNode = (node, inheritedStyles = {}) => {
    if (!node) return;

    if (node.type === 'text') {
      const text = $(node).text();
      if (!text) return;
      pushInlineTextWithMath(text, inheritedStyles);
      return;
    }

    if (node.type !== 'tag') return;
    const tag = String(node.name || '').toLowerCase();

    if (tag === 'br') {
      runs.push(new TextRun({ text: '', break: 1 }));
      return;
    }

    if (tag === 'img') {
      const src = $(node).attr('src') || '';
      const parsed = parseDataUrlImage(src);
      if (parsed) {
        runs.push(
          new ImageRun({
            data: parsed.data,
            type: parsed.type,
            transformation: {
              width: 220,
              height: 140,
            },
          })
        );
      } else {
        const altText = decodeHtmlEntitiesForDocx($(node).attr('alt') || 'image');
        runs.push(new TextRun({ text: `[${altText}]` }));
      }
      return;
    }

    if (tag === 'span') {
      const className = String($(node).attr('class') || '').toLowerCase();
      if (className.includes('math-equation') || className.includes('math-matrix')) {
        const linearMath = htmlMathToLinearText($(node).html() || $(node).text() || '');
        if (linearMath) {
          runs.push(
            new DocxMath({
              children: [new MathRun(linearMath)],
            })
          );
        }
        return;
      }
     }

    const nextStyles = {
      ...inheritedStyles,
      bold: inheritedStyles.bold || ['strong', 'b'].includes(tag),
      italics: inheritedStyles.italics || ['em', 'i'].includes(tag),
      underline: inheritedStyles.underline || tag === 'u',
      superScript: inheritedStyles.superScript || tag === 'sup',
      subScript: inheritedStyles.subScript || tag === 'sub',
    };

    const children = node.children || [];
    children.forEach((child) => walkNode(child, nextStyles));
  };

  root.contents().each((_, node) => walkNode(node, styles));
  return runs;
};

const buildPlainCell = (value) =>
  new TableCell({
    children: [new Paragraph({ children: [new TextRun(String(value ?? ''))] })],
  });

const buildRichCell = (html) => {
  const normalized = normalizeDocxCellHtml(html);
  if (!hasMeaningfulRichContent(normalized)) {
    return buildPlainCell('');
  }

  const runs = htmlToDocxRuns(normalized);
  return new TableCell({
    children: [new Paragraph({ children: runs.length ? runs : [new TextRun('')] })],
  });
};

const buildOptionsCell = (options) => {
  if (!Array.isArray(options) || options.length === 0) return buildPlainCell('');

  const paragraphs = options.map((option, index) => {
    const label = `${String.fromCharCode(65 + index)}) `;
    const optionRuns = htmlToDocxRuns(option?.text || '');
    return new Paragraph({
      children: [new TextRun({ text: label, bold: true }), ...(optionRuns.length ? optionRuns : [new TextRun('')])],
    });
  });

  return new TableCell({
    children: paragraphs.length ? paragraphs : [new Paragraph({ children: [new TextRun('')] })],
  });
};

const splitSolutionBulletLines = (solutionHtml) => {
  const normalized = normalizeDocxCellHtml(solutionHtml);
  if (!normalized) return [];

  const $ = loadHtml(`<root>${normalized}</root>`);
  const root = $('root');
  const liNodes = root.find('li');
  if (liNodes.length > 0) {
    return liNodes
      .toArray()
      .map((li) => normalizeDocxCellHtml($.html(li)))
      .filter((line) => hasMeaningfulRichContent(line));
  }

  const blockNodes = root.children('p,div,tr');
  if (blockNodes.length > 0) {
    return blockNodes
      .toArray()
      .map((node) => normalizeDocxCellHtml($.html(node)))
      .filter((line) => hasMeaningfulRichContent(line));
  }

  const textOnlyLines = toHtmlTextWithBreaks(normalized)
    .split(/\n+/)
    .map((line) => normalizeBulkTextValue(line).replace(/^[•\-\u2022]\s*/, ''))
    .filter((line) => line.length > 0);
  if (textOnlyLines.length > 1) {
    return textOnlyLines.map((line) => escapeHtml(line));
  }

  return [normalized];
};

const buildSolutionCell = (solutionHtml) => {
  const lines = splitSolutionBulletLines(solutionHtml);
  if (lines.length === 0) return buildPlainCell('');

  const paragraphs = lines.map((line) => {
    const runs = htmlToDocxRuns(line);
    return new Paragraph({
      bullet: { level: 0 },
      children: runs.length ? runs : [new TextRun('')],
    });
  });

  return new TableCell({
    children: paragraphs.length ? paragraphs : [new Paragraph({ children: [new TextRun('')] })],
  });
};

const mapOptionIdToLabel = (optionId, options = []) => {
  const index = options.findIndex((option) => String(option.id) === String(optionId));
  if (index < 0) return String(optionId || '');
  return String.fromCharCode(65 + index);
};

const buildConverterOutputRow = (row, _index) => {
  const options = Array.isArray(row.options) ? row.options : [];
  let correctAnswer = '';

  if (row.question_type === 'mcq_single') {
    correctAnswer = mapOptionIdToLabel(row.correct_answer, options);
  } else if (row.question_type === 'mcq_multiple') {
    const answers = Array.isArray(row.correct_answer) ? row.correct_answer : [];
    correctAnswer = answers.map((answer) => mapOptionIdToLabel(answer, options)).join(';');
  } else if (row.question_type === 'true_false') {
    correctAnswer = row.correct_answer === true ? 'true' : 'false';
  } else {
    correctAnswer = Array.isArray(row.correct_answer)
      ? row.correct_answer.join(';')
      : String(row.correct_answer ?? '');
  }

  const hasComprehension = Boolean(
    row.has_comprehension ||
      row.comprehension_passage ||
      row.passage_content ||
      row.passage_title
  );

  return [
    _index + 1,
    row.question_type || '',
    row.question_text ?? '',
    options,
    row.question_type === 'match_following' || row.question_type === 'fill_in_blank' ? '' : correctAnswer,
    row.solution ?? '',
    row.difficulty_level || '',
    row.marks_positive ?? '',
    row.marks_negative ?? '',
    Array.isArray(row.exam_tags) ? row.exam_tags.join(',') : String(row.exam_tags ?? ''),
    row.program_id ?? '',
    row.grade_id ?? '',
    row.subject_id ?? '',
    row.chapter_id ?? '',
    row.topic_id ?? '',
    hasComprehension ? 'yes' : 'no',
    row.passage_key ?? '',
    row.passage_title ?? '',
    row.passage_content ?? row.comprehension_passage ?? '',
    String(row.category ?? ''),
  ];
};

const convertManualDocxRows = async ({ file, defaults }) => {
  const rows = await extractBulkRowsFromFile(file, defaults);
  if (rows.length === 0) {
    throw new AppError('No valid question rows found in the uploaded file', 400);
  }

  const rowErrors = rows.filter((row) => row && typeof row === 'object' && row._bulk_error);
  if (rowErrors.length > 0) {
    const firstError = rowErrors[0];
    throw new AppError(String(firstError._bulk_error || 'Failed to parse uploaded file'), 400);
  }

  return rows;
};

const buildConverterTemplateBuffer = async (rows) => {
  const dataRows = rows.map((row, index) => {
    const values = buildConverterOutputRow(row, index);
    const [
      sno,
      questionType,
      questionHtml,
      optionList,
      correctAnswer,
      solutionHtml,
      difficulty,
      marksPositive,
      marksNegative,
      tags,
      programId,
      gradeId,
      subjectId,
      chapterId,
      topicId,
      hasComprehension,
      passageKey,
      passageTitle,
      passageContent,
      questionGroupType,
    ] = values;

    return new TableRow({
      children: [
        buildPlainCell(sno),
        buildPlainCell(questionType),
        buildRichCell(questionHtml),
        buildOptionsCell(optionList),
        buildPlainCell(correctAnswer),
        buildSolutionCell(solutionHtml),
        buildPlainCell(difficulty),
        buildPlainCell(marksPositive),
        buildPlainCell(marksNegative),
        buildPlainCell(tags),
        buildPlainCell(programId),
        buildPlainCell(gradeId),
        buildPlainCell(subjectId),
        buildPlainCell(chapterId),
        buildPlainCell(topicId),
        buildPlainCell(hasComprehension),
        buildPlainCell(passageKey),
        buildRichCell(passageTitle),
        buildRichCell(passageContent),
        buildPlainCell(questionGroupType),
      ],
    });
  });

  const table = new Table({
    rows: [buildTemplateRow(CONVERTER_TEMPLATE_HEADERS), ...dataRows],
  });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'Question Bank Converter Output', bold: true })],
          }),
          new Paragraph(''),
          table,
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
};

const buildBulkPassageCacheKey = (row) => {
  const explicitKey = toPlainBulkText(row.passage_key);
  if (explicitKey) return `key:${explicitKey.toLowerCase()}`;

  const title = toPlainBulkText(row.passage_title);
  const content = toPlainBulkText(row.passage_content ?? row.comprehension_passage);
  const subject = toPlainBulkText(row.subject_id ?? row.subject);
  const chapter = toPlainBulkText(row.chapter_id ?? row.chapter);
  const topic = toPlainBulkText(row.topic_id ?? row.topic);
  return `derived:${title}|${content}|${subject}|${chapter}|${topic}`;
};

const resolveBulkComprehensionPassageId = async ({
  row,
  user,
  role,
  clientId,
  cache,
  queryRunner = dbQuery,
}) => {
  const shouldLinkPassage =
    Boolean(row.has_comprehension) ||
    !isPlaceholderBulkValue(row.passage_key) ||
    !isPlaceholderBulkValue(row.passage_title) ||
    !isPlaceholderBulkValue(row.passage_content) ||
    !isPlaceholderBulkValue(row.comprehension_passage);

  if (!shouldLinkPassage) return null;

  const schemaSupport = await getQuestionSchemaSupport();
  if (!schemaSupport.hasComprehensionPassageId || !schemaSupport.hasComprehensionPassageTable) {
    throw new AppError('This database does not support linked passages yet', 400);
  }

  const cacheKey = buildBulkPassageCacheKey(row);

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const title = row.passage_title ?? null;
  const passageContent = row.passage_content ?? row.comprehension_passage ?? null;
  if (!title || !passageContent) {
    throw new AppError('passage_title and passage_content are required for linked comprehension rows', 400);
  }

  const passage = await createComprehensionPassageRecord({
    input: {
      title,
      passage_content: passageContent,
      program_id: row.program_id ?? row.program,
      grade_id: row.grade_id ?? row.grade,
      subject_id: row.subject_id ?? row.subject,
      chapter_id: row.chapter_id ?? row.chapter,
      topic_id: row.topic_id ?? row.topic,
      school_id: row.school_id ?? null,
    },
    user,
    role,
    clientId,
    queryRunner,
  });

  cache.set(cacheKey, Number(passage.id));
  return Number(passage.id);
};

let hasQuestionsFolderIdColumn = null;

const checkQuestionsFolderIdColumn = async (queryRunner = dbQuery) => {
  const runQuery = getQueryRunner(queryRunner);
  if (hasQuestionsFolderIdColumn !== null) {
    return hasQuestionsFolderIdColumn;
  }

  const columnResult = await runQuery(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'questions'
      AND column_name = 'folder_id'
    LIMIT 1
    `
  );

  hasQuestionsFolderIdColumn = columnResult.rows.length > 0;
  return hasQuestionsFolderIdColumn;
};

const ensureBulkFolderAccess = async ({ folderId, user, role, clientId, queryRunner = dbQuery }) => {
  const runQuery = getQueryRunner(queryRunner);
  if (!folderId) return null;

  const result = await runQuery(
    `SELECT id, client_id, school_id, is_active FROM question_folders WHERE id = $1 LIMIT 1`,
    [folderId]
  );
  if (result.rows.length === 0) {
    throw new AppError('Folder not found', 404);
  }

  const folder = result.rows[0];
  if (!folder.is_active) {
    throw new AppError('Folder is inactive', 400);
  }

  if (clientId && folder.client_id !== clientId) {
    throw new AppError('Access denied for folder', 403);
  }

  if (isTeacher(role) || isSchoolOwner(role)) {
    const schoolIds = await fetchUserSchoolIds(user.id, queryRunner);
    if (folder.school_id && !schoolIds.includes(folder.school_id)) {
      throw new AppError('Access denied for folder', 403);
    }
  }

  return folder.id;
};

const sanitizeBulkRowForInsert = (row, comprehensionPassageId) => {
  const sanitizedRow = {
    ...row,
    comprehension_passage_id: comprehensionPassageId ?? undefined,
  };
  delete sanitizedRow.comprehension_passage;
  delete sanitizedRow.comprehensive_passage;
  delete sanitizedRow.comprehension_questions;
  delete sanitizedRow.comprehensive_subquestions;
  delete sanitizedRow.has_comprehension;
  delete sanitizedRow.passage_key;
  delete sanitizedRow.passage_title;
  delete sanitizedRow.passage_content;
  delete sanitizedRow.use_existing_passage_id;
  delete sanitizedRow.passage_action;
  return sanitizedRow;
};

const buildBulkUploadFailureResponse = ({ total, errors }) => ({
  success: false,
  inserted: 0,
  failed: errors.length,
  total,
  totalDetected: total,
  errors,
  data: [],
  message: 'Upload failed. No questions were inserted.',
});

const prepareBulkInsertPayloads = async ({
  rows,
  user,
  role,
  clientId,
  queryRunner,
}) => {
  const errors = [];
  const preparedRows = [];
  const passageCache = new Map();

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNumber = index + 2;

    if (row && typeof row === 'object' && row._bulk_error) {
      errors.push({
        row: Number(row._bulk_row_number || rowNumber),
        message: String(row._bulk_error),
      });
      continue;
    }

    try {
      const comprehensionPassageId = await resolveBulkComprehensionPassageId({
        row,
        user,
        role,
        clientId,
        cache: passageCache,
        queryRunner,
      });
      const payload = await buildQuestionInsertPayload({
        input: sanitizeBulkRowForInsert(row, comprehensionPassageId),
        user,
        role,
        clientId,
        queryRunner,
      });
      preparedRows.push({ rowNumber, payload });
    } catch (err) {
      const message =
        err instanceof AppError
          ? err.message
          : err instanceof Error && err.message
            ? err.message
            : 'Failed to prepare question for insert';
      errors.push({
        row: rowNumber,
        message: `Row ${rowNumber}: ${message}`,
      });
    }
  }

  return { errors, preparedRows };
};

const executeAtomicBulkInsert = async ({
  rows,
  selectedFolderId,
  canAssignFolder,
  user,
  role,
  clientId,
}) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const { errors, preparedRows } = await prepareBulkInsertPayloads({
      rows,
      user,
      role,
      clientId,
      queryRunner: client,
    });

    if (errors.length > 0) {
      await client.query('ROLLBACK');
      return {
        ok: false,
        statusCode: 400,
        body: buildBulkUploadFailureResponse({ total: rows.length, errors }),
      };
    }

    const inserted = [];
    for (const preparedRow of preparedRows) {
      try {
        const created = await insertQuestion(preparedRow.payload, client);
        if (selectedFolderId && canAssignFolder) {
          await client.query(`UPDATE questions SET folder_id = $1 WHERE id = $2`, [
            selectedFolderId,
            created.id,
          ]);
        }
        inserted.push(created);
      } catch (err) {
        const message =
          err instanceof AppError
            ? err.message
            : err instanceof Error && err.message
              ? err.message
              : 'Failed to insert question';
        await client.query('ROLLBACK');
        return {
          ok: false,
          statusCode: 400,
          body: buildBulkUploadFailureResponse({
            total: rows.length,
            errors: [
              {
                row: preparedRow.rowNumber,
                message: `Row ${preparedRow.rowNumber}: ${message}`,
              },
            ],
          }),
        };
      }
    }

    await client.query('COMMIT');
    return {
      ok: true,
      statusCode: 200,
      body: {
        success: true,
        inserted: inserted.length,
        failed: 0,
        total: rows.length,
        totalDetected: rows.length,
        errors: [],
        data: inserted,
      },
    };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      // Ignore rollback failures and surface the original error.
    }
    throw err;
  } finally {
    client.release();
  }
};

export const bulkUploadQuestions = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'File is required for bulk upload.' });
    }

    const role = req.user.role;
    const clientId = ensureClientScope(req.user.client_id ?? null, role);
    const defaults = normalizeBulkDefaults(req.body || {});
    const folderId = parseNullableInt(req.body?.folder_id, 'folder_id');

    let selectedFolderId = null;
    let canAssignFolder = false;
    if (folderId) {
      selectedFolderId = await ensureBulkFolderAccess({
        folderId,
        user: req.user,
        role,
        clientId,
      });
      canAssignFolder = await checkQuestionsFolderIdColumn();
      if (!canAssignFolder) {
        throw new AppError('This database does not support folder assignment on questions yet', 400);
      }
    }

    const rows = await extractBulkRowsFromFile(req.file, defaults);
    if (rows.length === 0) {
      throw new AppError('No valid question rows found in the uploaded file', 400);
    }
    const result = await executeAtomicBulkInsert({
      rows,
      selectedFolderId,
      canAssignFolder,
      user: req.user,
      role,
      clientId,
    });
    return res.status(result.statusCode).json(result.body);
  } catch (err) {
    handleServiceError(res, err, 'Failed to bulk upload questions');
  }
};

export const downloadConvertedQuestions = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'File is required for conversion.' });
    }

    const defaults = normalizeBulkDefaults(req.body || {});
    const rows = await convertManualDocxRows({
      file: req.file,
      defaults,
    });

    const buffer = await buildConverterTemplateBuffer(rows);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="question-bank-converter-output.docx"');
    return res.send(buffer);
  } catch (err) {
    handleServiceError(res, err, 'Failed to generate converted question file');
  }
};

export const insertConvertedQuestions = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'File is required for conversion.' });
    }

    const role = req.user.role;
    const clientId = ensureClientScope(req.user.client_id ?? null, role);
    const defaults = normalizeBulkDefaults(req.body || {});
    const folderId = parseNullableInt(req.body?.folder_id, 'folder_id');

    let selectedFolderId = null;
    let canAssignFolder = false;
    if (folderId) {
      selectedFolderId = await ensureBulkFolderAccess({
        folderId,
        user: req.user,
        role,
        clientId,
      });
      canAssignFolder = await checkQuestionsFolderIdColumn();
      if (!canAssignFolder) {
        throw new AppError('This database does not support folder assignment on questions yet', 400);
      }
    }

    const rows = await convertManualDocxRows({
      file: req.file,
      defaults,
    });

    const result = await executeAtomicBulkInsert({
      rows,
      selectedFolderId,
      canAssignFolder,
      user: req.user,
      role,
      clientId,
    });
    return res.status(result.statusCode).json(result.body);
  } catch (err) {
    handleServiceError(res, err, 'Failed to convert and insert questions');
  }
};
