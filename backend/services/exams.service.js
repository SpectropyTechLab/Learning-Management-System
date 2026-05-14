import { query as dbQuery, getClient } from '../repositories/db.repository.js';
import { AppError, handleServiceError } from '../utils/errors.js';
import { parseNullableInt, parseRequiredInt, requireString } from '../schemas/questions.schema.js';
import { getAttemptResultPayloadByAttemptId } from './student.service.js';
import { load as loadHtml } from 'cheerio';
import AdmZip from 'adm-zip';
import path from 'node:path';
import { existsSync } from 'node:fs';
import {
  AlignmentType,
  BorderStyle,
  Footer,
  Header,
  Document,
  Packer,
  Paragraph,
  PageBorderDisplay,
  PageBorderOffsetFrom,
  PageBorderZOrder,
  PageNumber,
  TextRun,
  HeadingLevel,
  ImageRun,
  SectionType,
  TabStopType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  WidthType,
  Math as DocxMath,
  MathRun,
  MathFraction,
  MathRadical,
  MathSuperScript,
  MathSubScript,
  MathSubSuperScript,
} from 'docx';

const VALID_EXAM_STATUSES = ['draft', 'published', 'active', 'completed'];
const VALID_BLUEPRINT_STATUSES = ['active', 'inactive', 'archived'];
const QUESTION_GROUP_TYPES = ['direction', 'similar', 'previous_year', 'reference'];
const PROGRAM_TEMPLATE_PREVIEW_V1 = String(process.env.PROGRAM_TEMPLATE_PREVIEW_V1 || 'true').toLowerCase() !== 'false';
const MAESTRO_TEMPLATE_FILES = Object.freeze({
  WT: 'MAESTRO_WT-1_G6_PCMB_QP.docx',
  UT: 'MAESTRO_UT-1_G6_PCMB_QP (1).docx',
  GT: 'MAESTRO_GT-1_G6.docx',
});
const CATALYST_TEMPLATE_FILES = Object.freeze({
  PT: 'CATALYST_PT-1_G6_PCMB_QP.docx',
});
const FUTURE_FOUNDATION_TEMPLATE_FILES = Object.freeze({
  WT: 'SLATES_FUTURE_FOUNDATION_WT-1_G6_PCMB_QP.docx',
});
const TEMPLATE_ASSET_KEYS = Object.freeze({
  maestro: 'templates/maestro',
  catalyst: 'templates/catalyst',
  future_foundation: 'templates/future-foundation',
});
const TEMPLATE_ASSET_FS_ROOTS = Object.freeze([
  path.resolve(process.cwd(), 'templates'),
  path.resolve(process.cwd(), 'backend', 'templates'),
]);

const TEMPLATE_REGISTRY = Object.freeze({
  catalyst: {
    template_key: 'catalyst_v3',
    template_version: '3.1',
    fallback_template_key: 'default_v1',
    strict_mode: true,
  },
  maestro: {
    template_key: 'maestro_generic_v1',
    template_version: '1.2',
    fallback_template_key: 'default_v1',
    strict_mode: true,
  },
  pioneer: {
    template_key: 'pioneer_v2',
    template_version: '2.4',
    fallback_template_key: 'default_v1',
    strict_mode: true,
  },
  'future foundation': {
    template_key: 'future_foundation_v1',
    template_version: '1.0',
    fallback_template_key: 'default_v1',
    strict_mode: true,
  },
  default: {
    template_key: 'default_v1',
    template_version: '1.0',
    fallback_template_key: null,
    strict_mode: false,
  },
});

const TEMPLATE_SCHEMAS = Object.freeze({
  catalyst_v3: {
    required_metadata: ['exam_title', 'duration', 'program_name'],
    required_regions: ['header', 'sections', 'footer_signature'],
    required_question_types: [],
    section_order_mode: 'template_then_order_index',
  },
  maestro_v1: {
    required_metadata: ['exam_title', 'duration', 'program_name'],
    required_regions: ['header', 'sections', 'footer_signature'],
    required_question_types: [],
    section_order_mode: 'template_then_order_index',
  },
  maestro_generic_v1: {
    required_metadata: ['exam_title', 'duration', 'program_name'],
    required_regions: ['header', 'sections', 'footer_signature'],
    required_question_types: [],
    section_order_mode: 'template_then_order_index',
  },
  maestro_wt_v1: {
    required_metadata: ['exam_title', 'duration', 'program_name'],
    required_regions: ['header', 'sections', 'footer_signature'],
    required_question_types: [],
    section_order_mode: 'template_then_order_index',
  },
  maestro_ut_v1: {
    required_metadata: ['exam_title', 'duration', 'program_name'],
    required_regions: ['header', 'sections', 'footer_signature'],
    required_question_types: [],
    section_order_mode: 'template_then_order_index',
  },
  maestro_gt_v1: {
    required_metadata: ['exam_title', 'duration', 'program_name'],
    required_regions: ['header', 'sections', 'footer_signature'],
    required_question_types: [],
    section_order_mode: 'template_then_order_index',
  },
  pioneer_v2: {
    required_metadata: ['exam_title', 'duration', 'program_name'],
    required_regions: ['header', 'sections', 'footer_signature'],
    required_question_types: [],
    section_order_mode: 'template_then_order_index',
  },
  future_foundation_v1: {
    required_metadata: ['exam_title', 'duration', 'program_name'],
    required_regions: ['header', 'sections', 'footer_signature'],
    required_question_types: [],
    section_order_mode: 'template_then_order_index',
  },
  default_v1: {
    required_metadata: ['exam_title'],
    required_regions: ['header', 'sections'],
    required_question_types: [],
    section_order_mode: 'order_index',
  },
});

const normalizeQuestionGroupTypeFromCategory = (category) => {
  const normalizeToken = (value) => {
    const normalized = String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');

    if (!normalized) return null;
    if (QUESTION_GROUP_TYPES.includes(normalized)) return normalized;
    if (['direct', 'direction_question', 'direct_question'].includes(normalized)) {
      return 'direction';
    }
    if (['similar_question', 'similar_questions'].includes(normalized)) {
      return 'similar';
    }
    if (
      [
        'previous_year_question',
        'previous_year_questions',
        'previousyear',
        'previousyear_question',
      ].includes(normalized)
    ) {
      return 'previous_year';
    }
    if (['reference_question', 'reference_questions'].includes(normalized)) {
      return 'reference';
    }
    return null;
  };

  if (typeof category === 'string') return normalizeToken(category);

  if (Array.isArray(category)) {
    for (const entry of category) {
      const match = normalizeToken(entry);
      if (match) return match;
    }
    return null;
  }

  if (category && typeof category === 'object') {
    return (
      normalizeToken(category.label) ||
      normalizeToken(category.name) ||
      normalizeToken(category.value) ||
      normalizeToken(category.type) ||
      (Array.isArray(category.tags)
        ? category.tags.map((entry) => normalizeToken(entry)).find(Boolean) ?? null
        : null)
    );
  }

  return null;
};

let examResultColumnsEnsured = false;
let examInstructionsColumnKnown = null;
let blueprintDistributionColumnsKnown = null;
let examSectionDistributionColumnsKnown = null;

const isSuperAdmin = (role) => role === 'super_admin';
const isPlatformAdmin = (role) => role === 'super_admin' || role === 'content_authorizer';
const isClientAdmin = (role) => role === 'client_admin';
const isSchoolOwner = (role) => role === 'school_owner';
const isTeacher = (role) => role === 'teacher';

const parseBoolean = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes'].includes(normalized)) return true;
  if (['0', 'false', 'no'].includes(normalized)) return false;
  throw new AppError(`${fieldName} must be a boolean`, 400);
};

const parseDateTime = (value, fieldName) => {
  if (!value) throw new AppError(`${fieldName} is required`, 400);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`${fieldName} must be a valid datetime`, 400);
  }
  return parsed.toISOString();
};

const parseOptionalNumber = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) throw new AppError(`${fieldName} must be a number`, 400);
  return parsed;
};

const normalizeProgramLookupKey = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const resolveMaestroExamType = ({ examTitle, blueprintName }) => {
  const text = `${String(examTitle ?? '')} ${String(blueprintName ?? '')}`
    .toUpperCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;

  const hasWT = /\bWT\b|\bWEEK\s*TEST\b/.test(text);
  const hasUT = /\bUT\b|\bUNIT\s*TEST\b/.test(text);
  const hasGT = /\bGT\b|\bGRAND\s*TEST\b/.test(text);

  const matches = [hasWT ? 'WT' : null, hasUT ? 'UT' : null, hasGT ? 'GT' : null].filter(Boolean);
  if (matches.length !== 1) return null;
  return matches[0];
};

const resolveGeneralExamType = ({ examTitle, blueprintName }) => {
  const text = `${String(examTitle ?? '')} ${String(blueprintName ?? '')}`
    .toUpperCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  if (/\bWT\b|\bWEEK\s*TEST\b/.test(text)) return 'WT';
  if (/\bUT\b|\bUNIT\s*TEST\b/.test(text)) return 'UT';
  if (/\bPT\b|\bPERIODIC\s*TEST\b/.test(text)) return 'PT';
  if (/\bGT\b|\bGRAND\s*TEST\b/.test(text)) return 'GT';
  return null;
};

const resolveMaestroTemplateMapping = ({ examType }) => {
  if (examType === 'WT') {
    return {
      template_key: 'maestro_wt_v1',
      template_version: '1.0',
      source_file: MAESTRO_TEMPLATE_FILES.WT,
      source_path: `${TEMPLATE_ASSET_KEYS.maestro}/${MAESTRO_TEMPLATE_FILES.WT}`,
      strict_mode: true,
      fallback_template_key: null,
      fallback_used: false,
      exam_type: 'WT',
    };
  }
  if (examType === 'UT') {
    return {
      template_key: 'maestro_ut_v1',
      template_version: '1.0',
      source_file: MAESTRO_TEMPLATE_FILES.UT,
      source_path: `${TEMPLATE_ASSET_KEYS.maestro}/${MAESTRO_TEMPLATE_FILES.UT}`,
      strict_mode: true,
      fallback_template_key: null,
      fallback_used: false,
      exam_type: 'UT',
    };
  }
  if (examType === 'GT') {
    return {
      template_key: 'maestro_gt_v1',
      template_version: '1.0',
      source_file: MAESTRO_TEMPLATE_FILES.GT,
      source_path: `${TEMPLATE_ASSET_KEYS.maestro}/${MAESTRO_TEMPLATE_FILES.GT}`,
      strict_mode: true,
      fallback_template_key: null,
      fallback_used: false,
      exam_type: 'GT',
    };
  }

  return {
    template_key: null,
    template_version: null,
    source_file: null,
    source_path: null,
    strict_mode: true,
    fallback_template_key: null,
    fallback_used: false,
    exam_type: null,
    maestro_resolution_error: 'Unable to resolve Maestro exam type (expected WT, UT, or GT in exam title/blueprint name).',
  };
};

const resolveTemplateMapping = ({ programName, examTitle, blueprintName }) => {
  const key = normalizeProgramLookupKey(programName);
  const isMaestroProgram = key.includes('maestro');
  if (isMaestroProgram) {
    const examType = resolveMaestroExamType({ examTitle, blueprintName });
    const maestro = resolveMaestroTemplateMapping({ examType });
    return {
      ...maestro,
      registry_key: key,
      is_maestro_program: true,
    };
  }

  const examType = resolveGeneralExamType({ examTitle, blueprintName });
  if (key.includes('catalyst')) {
    const sourceFile = examType === 'PT' ? CATALYST_TEMPLATE_FILES.PT : null;
    return {
      ...TEMPLATE_REGISTRY.catalyst,
      source_file: sourceFile,
      source_path: sourceFile ? `${TEMPLATE_ASSET_KEYS.catalyst}/${sourceFile}` : null,
      exam_type: examType,
      registry_key: key,
      fallback_used: false,
      is_maestro_program: false,
    };
  }

  if (key.includes('future foundation')) {
    const sourceFile = examType === 'WT' ? FUTURE_FOUNDATION_TEMPLATE_FILES.WT : null;
    return {
      ...TEMPLATE_REGISTRY['future foundation'],
      source_file: sourceFile,
      source_path: sourceFile ? `${TEMPLATE_ASSET_KEYS.future_foundation}/${sourceFile}` : null,
      exam_type: examType,
      registry_key: key,
      fallback_used: false,
      is_maestro_program: false,
    };
  }

  const direct = key ? TEMPLATE_REGISTRY[key] : null;
  if (direct) {
    return {
      ...direct,
      source_file: null,
      source_path: null,
      exam_type: null,
      registry_key: key,
      fallback_used: false,
      is_maestro_program: false,
    };
  }

  const fallback = TEMPLATE_REGISTRY.default;
  if (!fallback) {
    return {
      template_key: null,
      template_version: null,
      fallback_template_key: null,
      strict_mode: true,
      registry_key: key || null,
      fallback_used: false,
      source_file: null,
      source_path: null,
      exam_type: null,
      is_maestro_program: false,
    };
  }

  return {
    ...fallback,
    source_file: null,
    source_path: null,
    exam_type: null,
    registry_key: key || null,
    fallback_used: true,
    is_maestro_program: false,
  };
};

const getTemplateSchema = (templateKey) => TEMPLATE_SCHEMAS[templateKey] ?? TEMPLATE_SCHEMAS.default_v1;

const normalizeSectionTemplateLabel = (section) => {
  const raw = String(section?.title || section?.blueprint_section_name || '').trim().toUpperCase();
  if (!raw) return '';
  if (raw.startsWith('SECTION ')) return raw;
  if (/^[A-Z]$/.test(raw)) return `SECTION ${raw}`;
  return raw;
};

const getTemplateOrderedSections = (sections, schema) => {
  if (!Array.isArray(sections)) return [];
  if (schema?.section_order_mode !== 'template_then_order_index') {
    return [...sections].sort((a, b) => Number(a?.order_index || 0) - Number(b?.order_index || 0));
  }

  const decorated = sections.map((section, index) => {
    const label = normalizeSectionTemplateLabel(section);
    const match = label.match(/^SECTION\s+([A-Z])/);
    const sectionToken = match?.[1] || null;
    const sectionRank = sectionToken ? sectionToken.charCodeAt(0) - 64 : Number.POSITIVE_INFINITY;
    return { section, index, sectionRank };
  });

  decorated.sort((a, b) => {
    if (a.sectionRank !== b.sectionRank) return a.sectionRank - b.sectionRank;
    const orderDiff = Number(a.section?.order_index || 0) - Number(b.section?.order_index || 0);
    if (orderDiff !== 0) return orderDiff;
    return a.index - b.index;
  });

  return decorated.map((item) => item.section);
};

const buildTemplateValidation = ({ examSummary, orderedSections, schema, templateResolution }) => {
  const warnings = [];
  const blockingReasons = [];
  const metadata = {
    exam_title: examSummary?.title ?? '',
    duration: examSummary?.total_duration_minutes ?? examSummary?.duration_minutes ?? '',
    program_name: examSummary?.program_name ?? '',
  };

  for (const key of schema.required_metadata ?? []) {
    const value = metadata[key];
    if (value === null || value === undefined || String(value).trim() === '') {
      blockingReasons.push(`Missing required metadata: ${key}`);
    }
  }

  if ((schema.required_regions ?? []).includes('sections') && orderedSections.length === 0) {
    blockingReasons.push('Template requires at least one section, but no sections are available.');
  }

  for (const section of orderedSections) {
    const requiredCount = Number(section?.required_question_count || 0);
    const currentCount = Number(section?.question_count || 0);
    if (requiredCount > 0 && currentCount !== requiredCount) {
      blockingReasons.push(
        `Section "${section?.title || section?.blueprint_section_name || section?.id}" requires ${requiredCount} questions but has ${currentCount}.`
      );
    }
    if (!section?.instructions || String(section.instructions).trim() === '') {
      warnings.push(`Section "${section?.title || section?.id}" is missing instructions.`);
    }
  }

  if (templateResolution?.strict_mode && templateResolution?.fallback_used) {
    blockingReasons.push('No direct program-template mapping found for strict mode.');
  }
  if (templateResolution?.strict_mode && !templateResolution?.template_key) {
    blockingReasons.push(
      templateResolution?.maestro_resolution_error || 'No valid template mapping resolved for this exam.'
    );
  }

  return {
    warnings,
    blocking_reasons: blockingReasons,
    has_warnings: warnings.length > 0,
    can_save_draft: true,
    can_finalize: blockingReasons.length === 0,
  };
};

const validateQuestionForExamSection = async ({ exam, questionId }) => {
  const questionResult = await dbQuery('SELECT * FROM questions WHERE id = $1', [questionId]);
  if (questionResult.rows.length === 0) {
    throw new AppError('Question not found', 404);
  }

  const question = questionResult.rows[0];
  if (String(question.status).toLowerCase() !== 'approved') {
    throw new AppError('Only approved questions can be added', 400);
  }
  if (String(question.question_type).toLowerCase() === 'comprehensive') {
    throw new AppError('Legacy comprehensive parent records cannot be added to exams. Add linked child questions instead.', 400);
  }

  if (question.client_id && Number(question.client_id) !== Number(exam.client_id)) {
    throw new AppError('Question does not belong to the same client scope as the exam', 403);
  }

  if (question.school_id && exam.school_id && Number(question.school_id) !== Number(exam.school_id)) {
    throw new AppError('Question does not belong to the same school scope as the exam', 403);
  }

  return {
    ...question,
    normalized_question_group_type: normalizeQuestionGroupTypeFromCategory(question.category),
  };
};

const parsePagination = (query) => {
  const page = Math.max(parseInt(query?.page || '1', 10), 1);
  const pageSize = Math.min(Math.max(parseInt(query?.page_size || '20', 10), 1), 100);
  return { page, pageSize, offset: (page - 1) * pageSize };
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

const hasBlueprintDistributionColumns = async () => {
  if (blueprintDistributionColumnsKnown !== null) return blueprintDistributionColumnsKnown;

  const result = await dbQuery(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'blueprint_sections'
        AND column_name IN (
          'direction_question_count',
          'similar_question_count',
          'previous_year_question_count',
          'reference_question_count'
        )
    `
  );

  blueprintDistributionColumnsKnown = result.rows.length === 4;
  return blueprintDistributionColumnsKnown;
};

const hasExamSectionDistributionColumns = async () => {
  if (examSectionDistributionColumnsKnown !== null) return examSectionDistributionColumnsKnown;

  const result = await dbQuery(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'exam_sections'
        AND column_name IN (
          'direction_question_count',
          'similar_question_count',
          'previous_year_question_count',
          'reference_question_count'
        )
    `
  );

  examSectionDistributionColumnsKnown = result.rows.length === 4;
  return examSectionDistributionColumnsKnown;
};

const ensureClientScope = (clientId, role) => {
  if (isPlatformAdmin(role)) return null;
  if (!clientId) {
    throw new AppError('client_id is required for this role', 400);
  }
  return clientId;
};

const fetchUserSchoolIds = async (userId) => {
  const result = await dbQuery(
    `SELECT school_id FROM school_memberships WHERE user_id = $1 AND status = 'active'`,
    [userId]
  );
  return result.rows.map((row) => Number(row.school_id));
};

const resolveSchoolScope = async ({ schoolId, user, clientId }) => {
  if (!schoolId) return { schoolId: null, resolvedClientId: clientId };

  const schoolResult = await dbQuery(`SELECT id, client_id FROM schools WHERE id = $1`, [schoolId]);
  if (schoolResult.rows.length === 0) {
    throw new AppError('School not found', 404);
  }
  const school = schoolResult.rows[0];

  if (clientId && Number(school.client_id) !== Number(clientId)) {
    throw new AppError('School does not belong to this client', 403);
  }

  const resolvedClientId = clientId || Number(school.client_id);
  if (!resolvedClientId) {
    throw new AppError('client_id is required', 400);
  }

  if (isSchoolOwner(user?.role) || isTeacher(user?.role)) {
    const schoolIds = await fetchUserSchoolIds(user.id);
    if (!schoolIds.includes(Number(schoolId))) {
      throw new AppError('Access denied for this school', 403);
    }
  }

  return { schoolId: Number(schoolId), resolvedClientId };
};

const ensureValidStatus = (status) => {
  if (!VALID_EXAM_STATUSES.includes(status)) {
    throw new AppError('Invalid status', 400);
  }
};

const buildExamWhere = async ({ user, query }) => {
  const params = [];
  const conditions = [];
  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  const explicitClientId = parseNullableInt(query?.client_id, 'client_id');
  const clientId = isPlatformAdmin(user?.role) ? explicitClientId : (user?.client_id ?? null);

  if (clientId) {
    conditions.push(`e.client_id = ${addParam(clientId)}`);
  }

  let schoolIds = [];
  if (isSchoolOwner(user?.role) || isTeacher(user?.role)) {
    schoolIds = await fetchUserSchoolIds(user.id);
    if (schoolIds.length > 0) {
      conditions.push(`(e.school_id IS NULL OR e.school_id = ANY(${addParam(schoolIds)}))`);
    } else {
      conditions.push(`e.school_id IS NULL`);
    }
  }

  const schoolIdFilter = parseNullableInt(query?.school_id, 'school_id');
  if (schoolIdFilter) {
    if ((isSchoolOwner(user?.role) || isTeacher(user?.role)) && !schoolIds.includes(schoolIdFilter)) {
      throw new AppError('Access denied for this school', 403);
    }
    conditions.push(`e.school_id = ${addParam(schoolIdFilter)}`);
  }

  if (query?.status) {
    const status = String(query.status).trim();
    ensureValidStatus(status);
    conditions.push(`e.status = ${addParam(status)}`);
  }

  const mine = (() => {
    if (query?.mine === undefined || query?.mine === null || query?.mine === '') return false;
    const val = String(query.mine).trim().toLowerCase();
    return ['1', 'true', 'yes'].includes(val);
  })();

  const createdBy = parseNullableInt(query?.created_by, 'created_by');
  if (mine) {
    conditions.push(`e.created_by = ${addParam(user.id)}`);
  } else if (createdBy) {
    conditions.push(`e.created_by = ${addParam(createdBy)}`);
  }

  if (query?.q) {
    const q = String(query.q).trim();
    if (q.length > 0) {
      conditions.push(`(e.title ILIKE ${addParam(`%${q}%`)} OR COALESCE(e.description, '') ILIKE $${params.length})`);
    }
  }

  return { conditions, params };
};

const getExamByIdForAccess = async ({ examId, user, requireOwner = false }) => {
  const id = parseRequiredInt(examId, 'id');
  const result = await dbQuery(
    `
    SELECT e.*, p.name AS program_name
    FROM exams e
    LEFT JOIN programs p ON p.id = e.program_id
    WHERE e.id = $1
    `,
    [id]
  );
  if (result.rows.length === 0) {
    throw new AppError('Exam not found', 404);
  }
  const exam = result.rows[0];

  if (!isPlatformAdmin(user?.role)) {
    const clientId = user?.client_id;
    if (!clientId || Number(exam.client_id) !== Number(clientId)) {
      throw new AppError('Exam not found', 404);
    }
  }

  if (isSchoolOwner(user?.role) || isTeacher(user?.role)) {
    const schoolIds = await fetchUserSchoolIds(user.id);
    if (exam.school_id && !schoolIds.includes(Number(exam.school_id))) {
      throw new AppError('Access denied', 403);
    }
  }

  if (requireOwner && Number(exam.created_by) !== Number(user.id) && !isPlatformAdmin(user?.role) && !isClientAdmin(user?.role) && !isSchoolOwner(user?.role)) {
    throw new AppError('Access denied', 403);
  }

  return exam;
};

const getSectionByIdForAccess = async ({ examId, sectionId, user, requireOwner = false }) => {
  const parsedExamId = parseRequiredInt(examId, 'id');
  const parsedSectionId = parseRequiredInt(sectionId, 'sectionId');
  const result = await dbQuery(
    `
    SELECT es.*, e.client_id, e.school_id, e.created_by, e.status
    FROM exam_sections es
    JOIN exams e ON e.id = es.exam_id
    WHERE es.id = $1 AND es.exam_id = $2
    `,
    [parsedSectionId, parsedExamId]
  );
  if (result.rows.length === 0) {
    throw new AppError('Section not found', 404);
  }

  const row = result.rows[0];
  await getExamByIdForAccess({ examId: row.exam_id, user, requireOwner });
  return row;
};

const ensureExamEditable = (exam) => {
  if (!exam) {
    throw new AppError('Exam not found', 404);
  }
  if (exam.status !== 'draft') {
    throw new AppError('Exam is locked and cannot be modified', 403);
  }
};

const ensureExamDeletable = (exam) => {
  if (!exam) {
    throw new AppError('Exam not found', 404);
  }

  if (!VALID_EXAM_STATUSES.includes(String(exam.status))) {
    throw new AppError('Exam status is invalid and cannot be deleted', 409);
  }
};

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

const parseCourseIds = (value) => {
  if (!Array.isArray(value)) {
    throw new AppError('course_ids must be an array', 400);
  }

  const normalized = [...new Set(value.map((item) => Number(item)).filter((id) => Number.isInteger(id) && id > 0))];
  if (normalized.length !== value.length) {
    throw new AppError('course_ids must contain unique positive integers', 400);
  }
  return normalized;
};

const parsePositiveIntArray = (value, fieldName) => {
  if (!Array.isArray(value)) {
    throw new AppError(`${fieldName} must be an array`, 400);
  }

  const normalized = value.map((item, index) => parseRequiredInt(item, `${fieldName}[${index}]`));
  if (normalized.some((item) => item <= 0)) {
    throw new AppError(`${fieldName} must contain positive integers`, 400);
  }

  const deduped = [...new Set(normalized)];
  if (deduped.length !== normalized.length) {
    throw new AppError(`${fieldName} must not contain duplicates`, 400);
  }

  return deduped;
};

const parseNonNegativeInteger = (value, fieldName) => {
  const parsed = parseOptionalNumber(value, fieldName);
  if (parsed === null) return 0;
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new AppError(`${fieldName} must be a non-negative integer`, 400);
  }
  return parsed;
};

const parseBlueprintSectionsInput = async (sections) => {
  if (!Array.isArray(sections) || sections.length === 0) {
    throw new AppError('sections must be a non-empty array', 400);
  }

  const seenNames = new Set();
  const seenOrders = new Set();
  const supportsDistributionColumns = await hasBlueprintDistributionColumns();

  return sections.map((section, index) => {
    const sectionName = requireString(section?.section_name ?? section?.sectionName, `sections[${index}].section_name`);
    const normalizedName = sectionName.toLowerCase();
    if (seenNames.has(normalizedName)) {
      throw new AppError('section names must be unique within a blueprint', 400);
    }
    seenNames.add(normalizedName);

    const requiredQuestionCount = parseRequiredInt(
      section?.required_question_count ?? section?.requiredQuestionCount,
      `sections[${index}].required_question_count`
    );
    if (requiredQuestionCount <= 0) {
      throw new AppError(`sections[${index}].required_question_count must be greater than 0`, 400);
    }

    const rawDirectionQuestionCount =
      section?.direction_question_count ?? section?.directionQuestionCount;
    const rawSimilarQuestionCount =
      section?.similar_question_count ?? section?.similarQuestionCount;
    const rawPreviousYearQuestionCount =
      section?.previous_year_question_count ?? section?.previousYearQuestionCount;
    const rawReferenceQuestionCount =
      section?.reference_question_count ?? section?.referenceQuestionCount;
    const hasExplicitDistribution =
      rawDirectionQuestionCount !== undefined ||
      rawSimilarQuestionCount !== undefined ||
      rawPreviousYearQuestionCount !== undefined ||
      rawReferenceQuestionCount !== undefined;

    const directionQuestionCount = hasExplicitDistribution
      ? parseNonNegativeInteger(rawDirectionQuestionCount, `sections[${index}].direction_question_count`)
      : requiredQuestionCount;
    const similarQuestionCount = hasExplicitDistribution
      ? parseNonNegativeInteger(rawSimilarQuestionCount, `sections[${index}].similar_question_count`)
      : 0;
    const previousYearQuestionCount = hasExplicitDistribution
      ? parseNonNegativeInteger(rawPreviousYearQuestionCount, `sections[${index}].previous_year_question_count`)
      : 0;
    const referenceQuestionCount = hasExplicitDistribution
      ? parseNonNegativeInteger(rawReferenceQuestionCount, `sections[${index}].reference_question_count`)
      : 0;

    const distributedTotal =
      directionQuestionCount +
      similarQuestionCount +
      previousYearQuestionCount +
      referenceQuestionCount;
    if (distributedTotal !== requiredQuestionCount) {
      throw new AppError(
        `sections[${index}] distribution must total exactly required_question_count`,
        400
      );
    }

    if (
      !supportsDistributionColumns &&
      (directionQuestionCount !== requiredQuestionCount ||
        similarQuestionCount !== 0 ||
        previousYearQuestionCount !== 0 ||
        referenceQuestionCount !== 0)
    ) {
      throw new AppError(
        'Blueprint distribution fields require the latest database migration. Run exam_blueprint_distribution_migration_20260429.sql first.',
        400
      );
    }

    const displayOrder = section?.display_order !== undefined
      ? parseRequiredInt(section.display_order, `sections[${index}].display_order`)
      : index + 1;
    if (displayOrder <= 0) {
      throw new AppError(`sections[${index}].display_order must be greater than 0`, 400);
    }
    if (seenOrders.has(displayOrder)) {
      throw new AppError('display_order values must be unique within a blueprint', 400);
    }
    seenOrders.add(displayOrder);

    return {
      section_name: sectionName,
      required_question_count: requiredQuestionCount,
      direction_question_count: directionQuestionCount,
      similar_question_count: similarQuestionCount,
      previous_year_question_count: previousYearQuestionCount,
      reference_question_count: referenceQuestionCount,
      display_order: displayOrder,
    };
  });
};

const ensureBlueprintStatus = (status) => {
  if (!VALID_BLUEPRINT_STATUSES.includes(status)) {
    throw new AppError('Invalid blueprint status', 400);
  }
};

const ensureProgramAccess = async ({ programId, user, clientId }) => {
  const result = await dbQuery(`SELECT id, client_id FROM programs WHERE id = $1`, [programId]);
  if (result.rows.length === 0) {
    throw new AppError('Program not found', 404);
  }
  const program = result.rows[0];

  if (!isPlatformAdmin(user?.role) && Number(program.client_id) !== Number(clientId)) {
    throw new AppError('Program does not belong to this client', 403);
  }

  return program;
};

const ensureBlueprintAccessible = async ({ blueprintId, user, clientId }) => {
  const supportsDistributionColumns = await hasBlueprintDistributionColumns();
  const distributionSelect = supportsDistributionColumns
    ? `
                    'direction_question_count', bs.direction_question_count,
                    'similar_question_count', bs.similar_question_count,
                    'previous_year_question_count', bs.previous_year_question_count,
                    'reference_question_count', bs.reference_question_count,
    `
    : `
                    'direction_question_count', bs.required_question_count,
                    'similar_question_count', 0,
                    'previous_year_question_count', 0,
                    'reference_question_count', 0,
    `;

  const result = await dbQuery(
    `
      SELECT b.*,
             COALESCE(
                JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'id', bs.id,
                    'section_name', bs.section_name,
                    'required_question_count', bs.required_question_count,
                    ${distributionSelect}
                    'display_order', bs.display_order
                  )
                 ORDER BY bs.display_order, bs.id
               ) FILTER (WHERE bs.id IS NOT NULL),
               '[]'::json
             ) AS sections
      FROM blueprints b
      LEFT JOIN blueprint_sections bs ON bs.blueprint_id = b.id
      WHERE b.id = $1
      GROUP BY b.id
    `,
    [blueprintId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Blueprint not found', 404);
  }

  const blueprint = result.rows[0];
  if (!isPlatformAdmin(user?.role) && Number(blueprint.client_id) !== Number(clientId)) {
    throw new AppError('Blueprint not found', 404);
  }

  if ((isSchoolOwner(user?.role) || isTeacher(user?.role)) && blueprint.school_id) {
    const schoolIds = await fetchUserSchoolIds(user.id);
    if (!schoolIds.includes(Number(blueprint.school_id))) {
      throw new AppError('Access denied for this blueprint', 403);
    }
  }

  return blueprint;
};

const fetchSubjectsForProgram = async ({ programId, clientId }) => {
  const result = await dbQuery(
    `
      SELECT s.*, g.program_id, g.grade_number
      FROM subjects s
      JOIN grades g ON g.id = s.grade_id
      WHERE g.program_id = $1
        AND ($2::int IS NULL OR s.client_id = $2)
      ORDER BY COALESCE(s.display_order, 0), s.name, s.id
    `,
    [programId, clientId]
  );
  return result.rows;
};

const ensureSubjectWithinProgram = async ({ subjectId, programId, clientId }) => {
  const result = await dbQuery(
    `
      SELECT s.*, g.program_id
      FROM subjects s
      JOIN grades g ON g.id = s.grade_id
      WHERE s.id = $1
        AND g.program_id = $2
        AND ($3::int IS NULL OR s.client_id = $3)
    `,
    [subjectId, programId, clientId]
  );
  if (result.rows.length === 0) {
    throw new AppError('Subject does not belong to the selected program', 400);
  }
  return result.rows[0];
};

const fetchChaptersForSubject = async ({ subjectId, clientId }) => {
  const result = await dbQuery(
    `
      SELECT c.*, s.client_id
      FROM chapters c
      JOIN subjects s ON s.id = c.subject_id
      WHERE c.subject_id = $1
        AND ($2::int IS NULL OR s.client_id = $2)
      ORDER BY c.chapter_number, c.id
    `,
    [subjectId, clientId]
  );
  return result.rows;
};

const ensureChaptersWithinSubject = async ({ chapterIds, subjectId, clientId }) => {
  if (chapterIds.length === 0) {
    throw new AppError('chapter_ids must contain at least one chapter', 400);
  }

  const result = await dbQuery(
    `
      SELECT c.*, s.client_id
      FROM chapters c
      JOIN subjects s ON s.id = c.subject_id
      WHERE c.id = ANY($1::int[])
        AND c.subject_id = $2
        AND ($3::int IS NULL OR s.client_id = $3)
      ORDER BY c.chapter_number, c.id
    `,
    [chapterIds, subjectId, clientId]
  );

  if (result.rows.length !== chapterIds.length) {
    throw new AppError('One or more chapters do not belong to the selected subject', 400);
  }

  return result.rows;
};

const fetchTopicsForChapters = async ({ chapterIds, clientId }) => {
  if (chapterIds.length === 0) return [];

  const result = await dbQuery(
    `
      SELECT t.*, c.subject_id, s.client_id
      FROM topics t
      JOIN chapters c ON c.id = t.chapter_id
      JOIN subjects s ON s.id = c.subject_id
      WHERE t.chapter_id = ANY($1::int[])
        AND ($2::int IS NULL OR s.client_id = $2)
      ORDER BY c.chapter_number, t.topic_number, t.id
    `,
    [chapterIds, clientId]
  );
  return result.rows;
};

const ensureTopicsWithinChapters = async ({ topicIds, chapterIds, clientId }) => {
  if (topicIds.length === 0) {
    throw new AppError('topic_ids must contain at least one topic', 400);
  }

  const result = await dbQuery(
    `
      SELECT t.*, c.subject_id, s.client_id
      FROM topics t
      JOIN chapters c ON c.id = t.chapter_id
      JOIN subjects s ON s.id = c.subject_id
      WHERE t.id = ANY($1::int[])
        AND t.chapter_id = ANY($2::int[])
        AND ($3::int IS NULL OR s.client_id = $3)
      ORDER BY c.chapter_number, t.topic_number, t.id
    `,
    [topicIds, chapterIds, clientId]
  );

  if (result.rows.length !== topicIds.length) {
    throw new AppError('One or more topics do not belong to the selected chapters', 400);
  }

  return result.rows;
};

const groupQuestionsByType = (questions) =>
  QUESTION_GROUP_TYPES.reduce((acc, groupType) => {
    acc[groupType] = questions.filter((question) => question.question_group_type === groupType);
    return acc;
  }, {});

const createEmptyQuestionGroupCounts = () => ({
  direction: 0,
  similar: 0,
  reference: 0,
  previous_year: 0,
  total: 0,
});

const getSectionDistributionTargets = (section) => {
  const targets = {
    direction: Number(section.direction_question_count || 0),
    similar: Number(section.similar_question_count || 0),
    previous_year: Number(section.previous_year_question_count || 0),
    reference: Number(section.reference_question_count || 0),
  };

  const total =
    targets.direction + targets.similar + targets.previous_year + targets.reference;

  return {
    ...targets,
    total,
    isExplicit:
      total > 0 && total === Number(section.required_question_count || 0),
  };
};

const buildEvenTopicDistributionPlan = ({ topicRows, section }) => {
  const targets = getSectionDistributionTargets(section);
  if (!targets.isExplicit || topicRows.length === 0) return null;

  const topicPlans = topicRows.map((topic) => ({
    topic_id: Number(topic.id),
    direction: 0,
    similar: 0,
    previous_year: 0,
    reference: 0,
  }));

  for (const groupType of QUESTION_GROUP_TYPES) {
    const targetCount = Number(targets[groupType] || 0);
    if (targetCount === 0) continue;

    const baseCount = Math.floor(targetCount / topicPlans.length);
    const remainder = targetCount % topicPlans.length;
    for (let index = 0; index < topicPlans.length; index += 1) {
      topicPlans[index][groupType] = baseCount + (index < remainder ? 1 : 0);
    }
  }

  return topicPlans;
};

const pickQuestionsForSection = ({ candidates, requiredCount }) => {
  if (candidates.length < requiredCount) {
    throw new AppError('Not enough approved questions available for this section', 400);
  }

  const groups = QUESTION_GROUP_TYPES.map((groupType) =>
    candidates.filter((candidate) => candidate.question_group_type === groupType)
  );
  const selected = [];

  while (selected.length < requiredCount) {
    let addedInRound = false;
    for (const group of groups) {
      if (group.length === 0) continue;
      selected.push(group.shift());
      addedInRound = true;
      if (selected.length === requiredCount) break;
    }

    if (!addedInRound) break;
  }

  if (selected.length < requiredCount) {
    throw new AppError('Not enough approved questions available for this section', 400);
  }

  return selected;
};

const isConnectionTerminationError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === '57P01' ||
    error?.code === '57P02' ||
    message.includes('connection terminated unexpectedly') ||
    message.includes('connection terminated due to connection timeout') ||
    message.includes('timeout exceeded when trying to connect')
  );
};

const resolveSectionGenerationPlan = async ({ exam, section, planOverride = null }) => {
  if (!exam.program_id) {
    throw new AppError('Exam program is not configured', 400);
  }
  if (!section.selected_subject_id) {
    throw new AppError('Select a subject before generating this section', 400);
  }

  const topicResult = await dbQuery(
    `
      SELECT t.id, t.name, t.topic_number
      FROM exam_section_topics est
      JOIN topics t ON t.id = est.topic_id
      WHERE est.exam_section_id = $1
      ORDER BY t.topic_number, t.id
    `,
    [section.id]
  );

  const topicRows = topicResult.rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    topic_number: row.topic_number !== null && row.topic_number !== undefined ? Number(row.topic_number) : null,
  }));

  if (topicRows.length === 0) {
    throw new AppError('Select at least one topic before generating this section', 400);
  }

  const requiredCount = Number(section.required_question_count || 0);
  if (requiredCount <= 0) {
    throw new AppError('Section required question count is not configured', 400);
  }

  const planTopicsInput = Array.isArray(planOverride?.topics)
    ? planOverride.topics
    : buildEvenTopicDistributionPlan({ topicRows, section }) ?? [];

  if (planTopicsInput.length === 0) {
    throw new AppError('Unable to build a generation plan for this section', 400);
  }

  const validTopicIds = new Set(topicRows.map((topic) => Number(topic.id)));
  const seenTopicIds = new Set();
  const normalizedPlanTopics = planTopicsInput.map((topic) => {
    const topicId = Number(topic.topic_id);
    if (!Number.isInteger(topicId) || !validTopicIds.has(topicId)) {
      throw new AppError(`Invalid topic_id ${topic.topic_id} in generation plan`, 400);
    }
    if (seenTopicIds.has(topicId)) {
      throw new AppError(`Topic ${topicId} appears multiple times in generation plan`, 400);
    }
    seenTopicIds.add(topicId);

    const direction = Number(topic.direction || 0);
    const similar = Number(topic.similar || 0);
    const previousYear = Number(topic.previous_year || 0);
    const reference = Number(topic.reference || 0);

    for (const [label, value] of [
      ['direction', direction],
      ['similar', similar],
      ['previous_year', previousYear],
      ['reference', reference],
    ]) {
      if (!Number.isInteger(value) || value < 0) {
        throw new AppError(`Generation plan ${label} count must be a non-negative integer`, 400);
      }
    }

    return {
      topic_id: topicId,
      direction,
      similar,
      previous_year: previousYear,
      reference,
      total: direction + similar + previousYear + reference,
    };
  });

  const totals = normalizedPlanTopics.reduce(
    (acc, topic) => ({
      direction: acc.direction + topic.direction,
      similar: acc.similar + topic.similar,
      previous_year: acc.previous_year + topic.previous_year,
      reference: acc.reference + topic.reference,
      total: acc.total + topic.total,
    }),
    createEmptyQuestionGroupCounts()
  );

  const targets = getSectionDistributionTargets(section);
  if (totals.total !== requiredCount) {
    throw new AppError(`Planned total must exactly match the section question count (${requiredCount})`, 400);
  }
  if (targets.isExplicit) {
    for (const groupType of QUESTION_GROUP_TYPES) {
      if (Number(totals[groupType] || 0) !== Number(targets[groupType] || 0)) {
        throw new AppError(`Generation plan must match blueprint count for ${groupType}`, 400);
      }
    }
  }

  const usedQuestionResult = await dbQuery(
    `
      SELECT eq.question_id
      FROM exam_questions eq
      JOIN exam_sections es ON es.id = eq.section_id
      WHERE es.exam_id = $1
        AND es.id <> $2
    `,
    [Number(exam.id), Number(section.id)]
  );
  const usedQuestionIds = new Set(usedQuestionResult.rows.map((row) => Number(row.question_id)));

  const candidateResult = await dbQuery(
    `
      SELECT
        q.id,
        q.topic_id,
        q.category,
        q.question_text,
        q.options,
        q.correct_answer,
        q.solution,
        q.question_type,
        q.status,
        q.subject_id,
        q.chapter_id,
        q.difficulty_level
      FROM questions q
      WHERE q.status = 'approved'
        AND q.question_type <> 'comprehensive'
        AND q.subject_id = $1
        AND q.topic_id = ANY($2::int[])
      ORDER BY q.id
    `,
    [Number(section.selected_subject_id), topicRows.map((topic) => Number(topic.id))]
  );

  const normalizedCandidates = candidateResult.rows
    .map((row) => ({
      id: Number(row.id),
      topic_id: row.topic_id ? Number(row.topic_id) : null,
      question_group_type: normalizeQuestionGroupTypeFromCategory(row.category),
      question_text: row.question_text,
      options: row.options,
      correct_answer: row.correct_answer,
      solution: row.solution,
      question_type: row.question_type,
      status: row.status,
      subject_id: row.subject_id ? Number(row.subject_id) : null,
      chapter_id: row.chapter_id ? Number(row.chapter_id) : null,
      difficulty_level: row.difficulty_level,
    }))
    .filter((row) => row.topic_id && row.question_group_type)
    .filter((row) => !usedQuestionIds.has(row.id));

  const selectedQuestions = [];
  const availableCounts = createEmptyQuestionGroupCounts();

  for (const topicPlan of normalizedPlanTopics) {
    for (const groupType of QUESTION_GROUP_TYPES) {
      const requestedCount = Number(topicPlan[groupType] || 0);
      const matchingCandidates = normalizedCandidates.filter(
        (candidate) =>
          Number(candidate.topic_id) === Number(topicPlan.topic_id) &&
          candidate.question_group_type === groupType &&
          !selectedQuestions.some((selected) => selected.id === candidate.id)
      );

      availableCounts[groupType] += matchingCandidates.length;
      availableCounts.total += matchingCandidates.length;

      if (matchingCandidates.length < requestedCount) {
        const topicMeta = topicRows.find((topic) => Number(topic.id) === Number(topicPlan.topic_id));
        throw new AppError(
          `Not enough approved ${groupType} questions available for topic ${topicMeta?.name ?? topicPlan.topic_id}`,
          400
        );
      }

      selectedQuestions.push(...matchingCandidates.slice(0, requestedCount));
    }
  }

  const plan = {
    section_id: Number(section.id),
    section_title: section.title ?? section.section_name ?? null,
    required_question_count: requiredCount,
    total_planned_questions: totals.total,
    available_question_count: availableCounts.total,
    topics: normalizedPlanTopics.map((topicPlan) => {
      const topicMeta = topicRows.find((topic) => Number(topic.id) === Number(topicPlan.topic_id));
      return {
        topic_id: Number(topicPlan.topic_id),
        topic_name: topicMeta?.name ?? null,
        topic_number: topicMeta?.topic_number ?? null,
        direction: topicPlan.direction,
        similar: topicPlan.similar,
        previous_year: topicPlan.previous_year,
        reference: topicPlan.reference,
        total: topicPlan.total,
      };
    }),
    totals,
    available_counts: availableCounts,
  };

  return {
    plan,
    selectedQuestions,
  };
};

const hydrateSectionRows = async (sectionRows) => {
  if (sectionRows.length === 0) return [];

  const sectionIds = sectionRows.map((row) => Number(row.id));
  let chaptersResult;
  let topicsResult;
  let questionsResult;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let client;
    try {
      client = await getClient();
      chaptersResult = await client.query(
        `
          SELECT esc.exam_section_id, c.id, c.name, c.chapter_number
          FROM exam_section_chapters esc
          JOIN chapters c ON c.id = esc.chapter_id
          WHERE esc.exam_section_id = ANY($1::int[])
          ORDER BY c.chapter_number, c.id
        `,
        [sectionIds]
      );

      topicsResult = await client.query(
        `
          SELECT est.exam_section_id, t.id, t.name, t.topic_number, t.chapter_id
          FROM exam_section_topics est
          JOIN topics t ON t.id = est.topic_id
          WHERE est.exam_section_id = ANY($1::int[])
          ORDER BY t.topic_number, t.id
        `,
        [sectionIds]
      );

      questionsResult = await client.query(
        `
          SELECT
            eq.section_id,
            eq.question_id,
            eq.order_index,
            eq.question_group_type,
            q.question_type,
            q.question_text,
            q.options,
            q.correct_answer,
            q.solution,
            q.subject_id,
            q.chapter_id,
            q.topic_id,
            q.difficulty_level,
            q.status
          FROM exam_questions eq
          JOIN questions q ON q.id = eq.question_id
          WHERE eq.section_id = ANY($1::int[])
          ORDER BY eq.section_id, eq.order_index, eq.id
        `,
        [sectionIds]
      );
      break;
    } catch (error) {
      if (attempt === 1 || !isConnectionTerminationError(error)) {
        throw error;
      }
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  const chaptersBySection = new Map();
  for (const row of chaptersResult.rows) {
    const current = chaptersBySection.get(Number(row.exam_section_id)) ?? [];
    current.push({
      id: Number(row.id),
      name: row.name,
      chapter_number: Number(row.chapter_number),
    });
    chaptersBySection.set(Number(row.exam_section_id), current);
  }

  const topicsBySection = new Map();
  for (const row of topicsResult.rows) {
    const current = topicsBySection.get(Number(row.exam_section_id)) ?? [];
    current.push({
      id: Number(row.id),
      name: row.name,
      topic_number: Number(row.topic_number),
      chapter_id: Number(row.chapter_id),
    });
    topicsBySection.set(Number(row.exam_section_id), current);
  }

  const questionsBySection = new Map();
  for (const row of questionsResult.rows) {
    const current = questionsBySection.get(Number(row.section_id)) ?? [];
    current.push({
      question_id: Number(row.question_id),
      order_index: Number(row.order_index),
      question_group_type: row.question_group_type,
      question_type: row.question_type,
      question_text: normalizeRichValueForPreview(row.question_text),
      options: Array.isArray(row.options)
        ? row.options.map((option) => ({
          ...option,
          text: normalizeRichValueForPreview(option?.text),
        }))
        : row.options,
      correct_answer: row.correct_answer,
      solution: normalizeRichValueForPreview(row.solution),
      subject_id: row.subject_id ? Number(row.subject_id) : null,
      chapter_id: row.chapter_id ? Number(row.chapter_id) : null,
      topic_id: row.topic_id ? Number(row.topic_id) : null,
      difficulty_level: row.difficulty_level,
      status: row.status,
    });
    questionsBySection.set(Number(row.section_id), current);
  }

  return sectionRows.map((row) => {
    const sectionId = Number(row.id);
    const questionRows = questionsBySection.get(sectionId) ?? [];
    return {
      ...row,
      chapter_ids: (chaptersBySection.get(sectionId) ?? []).map((item) => item.id),
      topic_ids: (topicsBySection.get(sectionId) ?? []).map((item) => item.id),
      chapters: chaptersBySection.get(sectionId) ?? [],
      topics: topicsBySection.get(sectionId) ?? [],
      question_count: questionRows.length,
      question_groups: groupQuestionsByType(questionRows),
    };
  });
};

const fetchExamSectionsWithBlueprintData = async (examId) => {
  const result = await dbQuery(
    `
      SELECT
        es.*,
        s.name AS selected_subject_name,
        bs.section_name AS blueprint_section_name
      FROM exam_sections es
      LEFT JOIN subjects s ON s.id = es.selected_subject_id
      LEFT JOIN blueprint_sections bs ON bs.id = es.blueprint_section_id
      WHERE es.exam_id = $1
      ORDER BY es.order_index, es.id
    `,
    [examId]
  );

  return hydrateSectionRows(result.rows.map((row) => ({
    ...row,
    id: Number(row.id),
    exam_id: Number(row.exam_id),
    blueprint_section_id: row.blueprint_section_id ? Number(row.blueprint_section_id) : null,
    required_question_count: row.required_question_count ? Number(row.required_question_count) : null,
    direction_question_count: row.direction_question_count ? Number(row.direction_question_count) : 0,
    similar_question_count: row.similar_question_count ? Number(row.similar_question_count) : 0,
    previous_year_question_count: row.previous_year_question_count ? Number(row.previous_year_question_count) : 0,
    reference_question_count: row.reference_question_count ? Number(row.reference_question_count) : 0,
    selected_subject_id: row.selected_subject_id ? Number(row.selected_subject_id) : null,
  })));
};

const buildExamPreviewPayload = async (exam) => {
  const blueprint = exam.blueprint_id
    ? await ensureBlueprintAccessible({
      blueprintId: Number(exam.blueprint_id),
      user: { role: 'super_admin', id: exam.created_by },
      clientId: Number(exam.client_id),
    })
    : null;

  const sections = await fetchExamSectionsWithBlueprintData(Number(exam.id));
  const examSummary = {
    ...exam,
    id: Number(exam.id),
    client_id: Number(exam.client_id),
    school_id: exam.school_id ? Number(exam.school_id) : null,
    program_id: exam.program_id ? Number(exam.program_id) : null,
    program_name: exam.program_name ? String(exam.program_name) : null,
    blueprint_id: exam.blueprint_id ? Number(exam.blueprint_id) : null,
  };
  const allSectionsCompleted = sections.every(
    (section) =>
      Number(section.question_count) === Number(section.required_question_count || 0) &&
      section.completion_status === 'completed'
  );
  const templateResolution = PROGRAM_TEMPLATE_PREVIEW_V1
    ? resolveTemplateMapping({
      programName: examSummary.program_name,
      examTitle: examSummary.title,
      blueprintName: blueprint?.name,
    })
    : {
      template_key: 'default_v1',
      template_version: '1.0',
      fallback_template_key: null,
      strict_mode: false,
      registry_key: 'default',
      fallback_used: false,
      source_file: null,
      source_path: null,
      exam_type: null,
      is_maestro_program: false,
    };
  const schema = getTemplateSchema(templateResolution.template_key);
  const orderedSections = getTemplateOrderedSections(sections, schema);
  const renderBlocks = orderedSections.map((section) => ({
    section_id: Number(section.id),
    section_title: section.title || section.blueprint_section_name || `Section ${section.id}`,
    section_label: normalizeSectionTemplateLabel(section),
    order_index: Number(section.order_index || 0),
    instructions: section.instructions ?? '',
    question_count: Number(section.question_count || 0),
    required_question_count: Number(section.required_question_count || 0),
    question_groups: section.question_groups ?? {},
    render_metadata: {
      marks_per_question: section.marks_per_question ?? null,
      negative_marks: section.negative_marks ?? null,
      completion_status: section.completion_status ?? null,
      selected_subject_name: section.selected_subject_name ?? null,
    },
  }));
  const validation = buildTemplateValidation({
    examSummary,
    orderedSections,
    schema,
    templateResolution,
  });

  return {
    exam: examSummary,
    blueprint: blueprint
      ? {
        ...blueprint,
        id: Number(blueprint.id),
        client_id: Number(blueprint.client_id),
        school_id: blueprint.school_id ? Number(blueprint.school_id) : null,
      }
      : null,
    sections: orderedSections,
    template_resolution: {
      template_key: templateResolution.template_key,
      template_version: templateResolution.template_version,
      source_file: templateResolution.source_file ?? null,
      source_path: templateResolution.source_path ?? null,
      exam_type: templateResolution.exam_type ?? null,
      strict_mode: Boolean(templateResolution.strict_mode),
      fallback_used: Boolean(templateResolution.fallback_used),
      fallback_template_key: templateResolution.fallback_template_key ?? null,
    },
    render_blocks: renderBlocks,
    validation,
    totals: {
      section_count: orderedSections.length,
      question_count: orderedSections.reduce((sum, section) => sum + Number(section.question_count || 0), 0),
      required_question_count: orderedSections.reduce((sum, section) => sum + Number(section.required_question_count || 0), 0),
      completed_section_count: orderedSections.filter((section) => section.completion_status === 'completed').length,
    },
    all_sections_completed: allSectionsCompleted && validation.can_finalize,
  };
};

const QUESTION_GROUP_TYPE_LABELS = {
  direction: 'Direct Questions',
  similar: 'Similar Questions',
  previous_year: 'Previous Year Questions',
  reference: 'Reference Questions',
};

const normalizeLatexForDocx = (value) => {
  if (!value) return '';
  let text = String(value);

  // Normalize escaped delimiters across multiple escaping levels.
  // Example: \\\(x\\\\) -> \\(x\\)
  text = text
    .replace(/\\+\(/g, '\\(')
    .replace(/\\+\)/g, '\\)')
    .replace(/\\+\[/g, '\\[')
    .replace(/\\+\]/g, '\\]');

  // Remove TeX math wrappers while preserving expression content.
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, '$1');
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, '$1');
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, '$1');
  text = text.replace(/\$([^$]+)\$/g, '$1');

  // Common TeX operator aliases to readable ASCII fallback for DOCX text mode.
  text = text
    .replace(/\\times/g, ' x ')
    .replace(/\\cdot/g, ' * ')
    .replace(/\\div/g, ' / ')
    .replace(/\\pm/g, ' +/- ')
    .replace(/\\neq/g, ' != ')
    .replace(/\\geq/g, ' >= ')
    .replace(/\\leq/g, ' <= ')
    .replace(/\\to/g, ' -> ');

  // Best-effort simplification of \frac{a}{b} => (a)/(b)
  text = text.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1)/($2)');

  // Best-effort simplification of \sqrt{a} => sqrt(a)
  text = text.replace(/\\sqrt\s*\{([^{}]+)\}/g, 'sqrt($1)');

  // Remove remaining escaped braces to avoid noisy output.
  text = text.replace(/\\\{/g, '{').replace(/\\\}/g, '}');
  // Strip any remaining delimiter slashes in malformed strings.
  text = text.replace(/\\([()[\]])/g, '$1');

  return text.replace(/\s+/g, ' ').trim();
};

const normalizeLatexDelimitersForPreview = (value) => {
  if (value === null || value === undefined) return value;
  let text = String(value);
  for (let i = 0; i < 3; i += 1) {
    const next = text
      .replace(/\\\\\(/g, '\\(')
      .replace(/\\\\\)/g, '\\)')
      .replace(/\\\\\[/g, '\\[')
      .replace(/\\\\\]/g, '\\]')
      .replace(/\\\\\{/g, '\\{')
      .replace(/\\\\\}/g, '\\}');
    if (next === text) break;
    text = next;
  }
  return text;
};

const normalizeRichValueForPreview = (value) => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return normalizeLatexDelimitersForPreview(value);
  if (typeof value === 'object') {
    const clone = { ...value };
    if ('html' in clone && typeof clone.html === 'string') {
      clone.html = normalizeLatexDelimitersForPreview(clone.html);
    }
    if ('text' in clone && typeof clone.text === 'string') {
      clone.text = normalizeLatexDelimitersForPreview(clone.text);
    }
    return clone;
  }
  return value;
};

const extractRichHtmlString = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return String(value);
  if (typeof value === 'object') return String(value.html ?? value.text ?? '');
  return '';
};

const normalizeDocxHtml = (value) =>
  String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/&nbsp;/gi, ' ')
    .trim();

const decodeHtmlEntitiesForDocx = (value) => {
  const $ = loadHtml(`<div>${String(value || '')}</div>`);
  return $('div').text();
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

    const data = Buffer.from(match[2], 'base64');
    if (!data || data.length === 0) return null;
    return { mimeType, data, type };
  } catch (_err) {
    return null;
  }
};

const htmlMathToLinearText = (mathHtml) => {
  const source = normalizeDocxHtml(mathHtml);
  if (!source) return '';
  const text = decodeHtmlEntitiesForDocx(source)
    .replace(/\s+/g, ' ')
    .trim();
  return normalizeLatexForDocx(text);
};

const LATEX_SYMBOL_MAP = {
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  theta: 'θ',
  lambda: 'λ',
  mu: 'μ',
  pi: 'π',
  sigma: 'σ',
  phi: 'φ',
  omega: 'ω',
  Delta: 'Δ',
  Sigma: 'Σ',
  Omega: 'Ω',
  times: '×',
  cdot: '·',
  div: '÷',
  pm: '±',
  leq: '≤',
  geq: '≥',
  neq: '≠',
  to: '→',
};

const latexToMathComponents = (latexInput) => {
  const input = String(latexInput || '').trim();
  if (!input) return [];

  let index = 0;
  const len = input.length;

  const skipSpaces = () => {
    while (index < len && /\s/.test(input[index])) index += 1;
  };

  const readGroupRaw = () => {
    skipSpaces();
    if (input[index] === '{') {
      let depth = 0;
      const start = index + 1;
      index += 1;
      while (index < len) {
        const ch = input[index];
        if (ch === '{') depth += 1;
        if (ch === '}') {
          if (depth === 0) {
            const value = input.slice(start, index);
            index += 1;
            return value;
          }
          depth -= 1;
        }
        index += 1;
      }
      return input.slice(start);
    }
    if (index < len) {
      const ch = input[index];
      index += 1;
      return ch;
    }
    return '';
  };

  const parseScript = () => {
    skipSpaces();
    if (input[index] === '{') {
      const raw = readGroupRaw();
      return latexToMathComponents(raw);
    }
    if (index < len) {
      const ch = input[index];
      index += 1;
      if (ch === '\\') {
        let name = '';
        while (index < len && /[A-Za-z]/.test(input[index])) {
          name += input[index];
          index += 1;
        }
        return [new MathRun(LATEX_SYMBOL_MAP[name] || name || '\\')];
      }
      return [new MathRun(ch)];
    }
    return [new MathRun('')];
  };

  const parseAtom = () => {
    skipSpaces();
    if (index >= len) return [new MathRun('')];

    if (input.startsWith('\\frac', index)) {
      index += 5;
      const numeratorRaw = readGroupRaw();
      const denominatorRaw = readGroupRaw();
      return [
        new MathFraction({
          numerator: latexToMathComponents(numeratorRaw),
          denominator: latexToMathComponents(denominatorRaw),
        }),
      ];
    }

    if (input.startsWith('\\sqrt', index)) {
      index += 5;
      skipSpaces();
      let degree = null;
      if (input[index] === '[') {
        index += 1;
        const start = index;
        while (index < len && input[index] !== ']') index += 1;
        degree = input.slice(start, index);
        if (input[index] === ']') index += 1;
      }
      const bodyRaw = readGroupRaw();
      return [
        new MathRadical({
          children: latexToMathComponents(bodyRaw),
          degree: degree ? latexToMathComponents(degree) : undefined,
        }),
      ];
    }

    if (input[index] === '\\') {
      index += 1;
      let cmd = '';
      while (index < len && /[A-Za-z]/.test(input[index])) {
        cmd += input[index];
        index += 1;
      }
      return [new MathRun(LATEX_SYMBOL_MAP[cmd] || cmd || '\\')];
    }

    if (input[index] === '{') {
      const raw = readGroupRaw();
      return latexToMathComponents(raw);
    }

    const ch = input[index];
    index += 1;
    return [new MathRun(ch)];
  };

  const out = [];
  while (index < len) {
    const base = parseAtom();
    skipSpaces();

    if (input[index] === '^' || input[index] === '_') {
      const firstOp = input[index];
      index += 1;
      const firstScript = parseScript();
      skipSpaces();
      if ((firstOp === '^' && input[index] === '_') || (firstOp === '_' && input[index] === '^')) {
        const secondOp = input[index];
        index += 1;
        const secondScript = parseScript();
        const superScript = firstOp === '^' ? firstScript : secondScript;
        const subScript = firstOp === '_' ? firstScript : secondScript;
        out.push(
          new MathSubSuperScript({
            children: base,
            subScript,
            superScript,
          })
        );
      } else if (firstOp === '^') {
        out.push(
          new MathSuperScript({
            children: base,
            superScript: firstScript,
          })
        );
      } else {
        out.push(
          new MathSubScript({
            children: base,
            subScript: firstScript,
          })
        );
      }
    } else {
      out.push(...base);
    }
  }
  return out;
};

const htmlToDocxRuns = (html, styles = {}) => {
  const source = normalizeDocxHtml(html);
  if (!source) return [];
  const $ = loadHtml(`<root>${source}</root>`);
  const runs = [];

  const pushPlainTextRun = (text, inherited = {}) => {
    const normalized = normalizeLatexForDocx(text);
    if (!normalized) return;
    runs.push(
      new TextRun({
        ...buildDocxTextRunOptions({
          text: normalized,
          size: inherited.size,
        }),
        bold: Boolean(inherited.bold),
        italics: Boolean(inherited.italics),
        underline: inherited.underline ? {} : undefined,
        superScript: Boolean(inherited.superScript),
        subScript: Boolean(inherited.subScript),
      })
    );
  };

  const splitLatexSegments = (text) => {
    const source = decodeHtmlEntitiesForDocx(text);
    if (!source) return [];
    const regex = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$|\$([^\n$]+?)\$/g;
    const segments = [];
    let lastIndex = 0;
    for (const match of source.matchAll(regex)) {
      const idx = match.index ?? 0;
      if (idx > lastIndex) {
        segments.push({ type: 'text', value: source.slice(lastIndex, idx) });
      }
      const expr = (match[1] ?? match[2] ?? match[3] ?? match[4] ?? '').trim();
      if (expr) segments.push({ type: 'math', value: expr });
      lastIndex = idx + match[0].length;
    }
    if (lastIndex < source.length) {
      segments.push({ type: 'text', value: source.slice(lastIndex) });
    }
    if (segments.length === 0) segments.push({ type: 'text', value: source });
    return segments;
  };

  const pushTextRun = (text, inherited = {}) => {
    const segments = splitLatexSegments(text);
    for (const segment of segments) {
      if (segment.type === 'math') {
        const components = latexToMathComponents(String(segment.value));
        runs.push(
          new DocxMath({
            children: components.length > 0 ? components : [new MathRun(normalizeLatexForDocx(String(segment.value)))],
          })
        );
      } else {
        pushPlainTextRun(String(segment.value), inherited);
      }
    }
  };

  const walk = (node, inherited = {}) => {
    if (!node) return;
    if (node.type === 'text') {
      pushTextRun($(node).text(), inherited);
      return;
    }
    if (node.type !== 'tag') return;

    const tag = String(node.name || '').toLowerCase();
    if (tag === 'br') {
      runs.push(new TextRun({ ...buildDocxTextRunOptions({ text: '' }), break: 1 }));
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
            transformation: { width: 220, height: 140 },
          })
        );
      } else {
        const alt = decodeHtmlEntitiesForDocx($(node).attr('alt') || 'image');
        runs.push(new TextRun(buildDocxTextRunOptions({ text: `[${alt}]` })));
      }
      return;
    }

    if (tag === 'span') {
      const className = String($(node).attr('class') || '').toLowerCase();
      if (className.includes('math-equation') || className.includes('math-matrix')) {
        const linearMath = htmlMathToLinearText($(node).html() || $(node).text() || '');
        if (linearMath) {
          runs.push(new DocxMath({ children: [new MathRun(linearMath)] }));
        }
        return;
      }
    }

    const next = {
      ...inherited,
      bold: inherited.bold || ['strong', 'b'].includes(tag),
      italics: inherited.italics || ['em', 'i'].includes(tag),
      underline: inherited.underline || tag === 'u',
      superScript: inherited.superScript || tag === 'sup',
      subScript: inherited.subScript || tag === 'sub',
    };

    (node.children || []).forEach((child) => walk(child, next));
  };

  $('root')
    .contents()
    .each((_, node) => walk(node, styles));
  return runs;
};

const stripHtmlToText = (value) => {
  if (!value) return '';
  if (typeof value === 'string') {
    const $ = loadHtml(`<div>${value}</div>`);
    return normalizeLatexForDocx($('div').text()).replace(/\s+/g, ' ').trim();
  }
  if (typeof value === 'object') {
    const html = value.html ?? value.text ?? '';
    if (!html) return '';
    const $ = loadHtml(`<div>${String(html)}</div>`);
    return normalizeLatexForDocx($('div').text()).replace(/\s+/g, ' ').trim();
  }
  return '';
};

const richTextToMultilineText = (value) => {
  if (!value) return '';
  const raw =
    typeof value === 'string'
      ? value
      : typeof value === 'object'
        ? String(value.html ?? value.text ?? '')
        : '';
  if (!raw) return '';

  let normalized = raw;
  normalized = normalized.replace(/<br\s*\/?>/gi, '\n');
  normalized = normalized.replace(/<\/p>/gi, '\n');
  normalized = normalized.replace(/<\/li>/gi, '\n');
  normalized = normalized.replace(/<\/div>/gi, '\n');

  const $ = loadHtml(`<div>${normalized}</div>`);
  const text = normalizeLatexForDocx($('div').text());
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
};

const extractOptionText = (option) => stripHtmlToText(option?.text);

const optionLabelFromIndex = (index) => String.fromCharCode(65 + index);

const resolveOptionIndex = (options, raw) => {
  const id = String(raw ?? '').trim();
  if (!id) return undefined;
  const byId = options.findIndex((option, index) => String(option?.id ?? index) === id);
  if (byId >= 0) return byId;
  if (/^[a-z]$/i.test(id)) {
    const idx = id.toUpperCase().charCodeAt(0) - 65;
    if (idx >= 0 && idx < options.length) return idx;
  }
  if (/^\d+$/.test(id)) {
    const num = Number(id);
    if (num >= 1 && num <= options.length) return num - 1;
    if (num >= 0 && num < options.length) return num;
  }
  return undefined;
};

const resolveAnswerText = (question) => {
  const answer = question?.correct_answer;
  if (answer === null || answer === undefined) return '';
  if (Array.isArray(question?.options) && question.options.length > 0) {
    const options = question.options;
    const toLabeledText = (raw) => {
      const idx = resolveOptionIndex(options, raw);
      if (idx === undefined) return String(raw);
      const txt = extractOptionText(options[idx]);
      return `${optionLabelFromIndex(idx)}${txt ? `. ${txt}` : ''}`;
    };

    if (typeof answer === 'string' || typeof answer === 'number' || typeof answer === 'boolean') {
      return toLabeledText(answer);
    }

    if (Array.isArray(answer)) return answer.map((item) => toLabeledText(item)).join(', ');

    if (typeof answer === 'object') {
      if (Array.isArray(answer.answer_ids)) return answer.answer_ids.map((item) => toLabeledText(item)).join(', ');
      if (Array.isArray(answer.answers)) return answer.answers.map((item) => toLabeledText(item)).join(', ');
      if (answer.answer !== undefined) return toLabeledText(answer.answer);
    }

    const flagged = options
      .map((option, index) => (option?.is_correct ? `${optionLabelFromIndex(index)}. ${extractOptionText(option)}`.trim() : null))
      .filter(Boolean);
    if (flagged.length > 0) return flagged.join(', ');
  }

  if (typeof answer === 'string' || typeof answer === 'number' || typeof answer === 'boolean') {
    return String(answer);
  }
  if (Array.isArray(answer)) return answer.map(String).join(', ');
  if (typeof answer === 'object') {
    if (Array.isArray(answer.answer_ids)) return answer.answer_ids.map(String).join(', ');
    if (Array.isArray(answer.answers)) return answer.answers.map(String).join(', ');
    if (answer.answer !== undefined) return String(answer.answer);
    if (answer.value !== undefined) return String(answer.value);
  }
  return '';
};

const resolveSolutionLines = (question) => {
  const multiline = richTextToMultilineText(question?.solution);
  if (!multiline) return [];

  const explicitLines = multiline
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const lines = [];
  for (const line of explicitLines) {
    const normalized = String(line).replace(/\s+/g, ' ').trim();
    if (!normalized) continue;

    const stepMatches = normalized.match(/(?:Step\s*\d+[.:]?[\s\S]*?)(?=Step\s*\d+[.:]?|$)/gi);
    if (stepMatches && stepMatches.length > 1) {
      lines.push(...stepMatches.map((entry) => entry.trim()).filter(Boolean));
      continue;
    }

    lines.push(normalized);
  }

  return lines;
};

const resolveSolutionHtmlLines = (question) => {
  const raw = extractRichHtmlString(question?.solution);
  if (!raw) return [];

  let normalized = raw
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/<br\s*\/?>/gi, '<br/>');

  const $ = loadHtml(`<root>${normalized}</root>`);
  const root = $('root');
  const segments = [];

  root.contents().each((_, node) => {
    if (!node) return;
    if (node.type === 'text') {
      const text = $(node).text().trim();
      if (text) segments.push(text);
      return;
    }
    if (node.type !== 'tag') return;

    const tag = String(node.name || '').toLowerCase();
    if (['p', 'div', 'li'].includes(tag)) {
      const innerHtml = $(node).html()?.trim();
      if (innerHtml) segments.push(innerHtml);
      return;
    }
    if (tag === 'br') return;

    const outerHtml = $.html(node)?.trim();
    if (outerHtml) segments.push(outerHtml);
  });

  const lines = [];
  for (const segment of segments) {
    const parts = segment
      .split(/(?=(?:<[^>]+>\s*)*Step\s*\d+[.:]?)/i)
      .map((part) => part.trim())
      .filter(Boolean);

    let pendingInlineTags = '';
    for (const part of parts) {
      const plainText = stripHtmlToText(part).trim();

      // If a fragment is only formatting tags, carry it forward so it stays attached
      // to the next real step content instead of becoming literal text in Word.
      if (!plainText) {
        pendingInlineTags += part;
        continue;
      }

      const merged = `${pendingInlineTags}${part}`.trim();
      pendingInlineTags = '';
      lines.push(merged);
    }
  }

  return lines;
};

const resolveAnswerRuns = (question) => {
  const prefixRuns = [new TextRun(buildDocxTextRunOptions({ text: 'Correct Answer: ', bold: true }))];
  const options = Array.isArray(question?.options) ? question.options : [];
  const answer = question?.correct_answer;

  const buildOptionRuns = (raw) => {
    const idx = resolveOptionIndex(options, raw);
    if (idx === undefined || !options[idx]) return null;
    const label = `${optionLabelFromIndex(idx)}. `;
    const optionHtml = extractRichHtmlString(options[idx]?.text);
    const optionRuns = htmlToDocxRuns(optionHtml, { size: DOCX_BODY_FONT_SIZE });
    const optionText = extractOptionText(options[idx]);
    return [
      new TextRun(buildDocxTextRunOptions({ text: label })),
      ...(optionRuns.length > 0
        ? optionRuns
        : optionText
          ? [new TextRun(buildDocxTextRunOptions({ text: optionText }))]
          : []),
    ];
  };

  if (options.length > 0) {
    if (typeof answer === 'string' || typeof answer === 'number' || typeof answer === 'boolean') {
      const runs = buildOptionRuns(answer);
      if (runs) return [...prefixRuns, ...runs];
    }

    if (Array.isArray(answer) && answer.length > 0) {
      const combined = [];
      answer.forEach((item, index) => {
        const runs = buildOptionRuns(item);
        if (!runs) return;
        if (index > 0) combined.push(new TextRun(buildDocxTextRunOptions({ text: ', ' })));
        combined.push(...runs);
      });
      if (combined.length > 0) return [...prefixRuns, ...combined];
    }

    if (answer && typeof answer === 'object') {
      const answerList = Array.isArray(answer.answer_ids)
        ? answer.answer_ids
        : Array.isArray(answer.answers)
          ? answer.answers
          : answer.answer !== undefined
            ? [answer.answer]
            : [];
      if (answerList.length > 0) {
        const combined = [];
        answerList.forEach((item, index) => {
          const runs = buildOptionRuns(item);
          if (!runs) return;
          if (index > 0) combined.push(new TextRun(buildDocxTextRunOptions({ text: ', ' })));
          combined.push(...runs);
        });
        if (combined.length > 0) return [...prefixRuns, ...combined];
      }
    }
  }

  const fallback = resolveAnswerText(question);
  return [...prefixRuns, new TextRun(buildDocxTextRunOptions({ text: fallback || '--' }))];
};

const sanitizeFilenamePart = (value) =>
  String(value || 'question-paper')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'question-paper';

const resolveTemplateAssetAbsolutePath = (templateResolution) => {
  const sourcePath = String(templateResolution?.source_path || '').trim();
  if (!sourcePath) return null;
  const normalized = sourcePath.replace(/^[/\\]+/, '').replace(/[\\/]+/g, path.sep);
  const relativePath = normalized.replace(/^templates[\\/]/i, '');
  for (const root of TEMPLATE_ASSET_FS_ROOTS) {
    const abs = path.resolve(root, relativePath);
    if (existsSync(abs)) return abs;
  }
  return null;
};

const extractBodyWithoutSectPr = (documentXml) => {
  const xml = String(documentXml || '');
  const bodyMatch = xml.match(/<w:body>([\s\S]*?)<\/w:body>/i);
  if (!bodyMatch) return null;
  const bodyInner = bodyMatch[1];
  return bodyInner.replace(/<w:sectPr[\s\S]*?<\/w:sectPr>\s*$/i, '');
};

const extractSectPr = (documentXml) => {
  const xml = String(documentXml || '');
  const bodyMatch = xml.match(/<w:body>([\s\S]*?)<\/w:body>/i);
  if (!bodyMatch) return null;
  const bodyInner = bodyMatch[1];
  const sect = bodyInner.match(/<w:sectPr[\s\S]*?<\/w:sectPr>\s*$/i);
  return sect ? sect[0] : null;
};

const mergeGeneratedBodyIntoTemplate = ({ generatedBuffer, templateAbsolutePath }) => {
  if (!generatedBuffer || !templateAbsolutePath || !existsSync(templateAbsolutePath)) return generatedBuffer;

  const generatedZip = new AdmZip(generatedBuffer);
  const templateZip = new AdmZip(templateAbsolutePath);
  const generatedEntry = generatedZip.getEntry('word/document.xml');
  const templateEntry = templateZip.getEntry('word/document.xml');
  if (!generatedEntry || !templateEntry) return generatedBuffer;

  const generatedXml = generatedEntry.getData().toString('utf8');
  let templateXml = templateEntry.getData().toString('utf8');
  let generatedBody = extractBodyWithoutSectPr(generatedXml);
  const templateSectPr = extractSectPr(templateXml);
  if (!generatedBody || !templateSectPr) return generatedBuffer;

  // Ensure template root declares all namespaces required by injected generated body.
  const generatedRootTag = (generatedXml.match(/<w:document\b[\s\S]*?>/i) || [null])[0];
  const templateRootTag = (templateXml.match(/<w:document\b[\s\S]*?>/i) || [null])[0];
  if (generatedRootTag && templateRootTag) {
    const generatedNs = new Map();
    const templateNs = new Set();
    for (const m of generatedRootTag.matchAll(/(xmlns:[A-Za-z0-9_\-]+)="([^"]+)"/g)) {
      generatedNs.set(m[1], m[2]);
    }
    for (const m of templateRootTag.matchAll(/(xmlns:[A-Za-z0-9_\-]+)="([^"]+)"/g)) {
      templateNs.add(m[1]);
    }

    let mergedRootTag = templateRootTag;
    for (const [nsAttr, nsValue] of generatedNs.entries()) {
      if (!templateNs.has(nsAttr)) {
        mergedRootTag = mergedRootTag.replace(/>$/, ` ${nsAttr}="${nsValue}">`);
      }
    }

    // Ensure drawing namespaces required by image/picture runs are always present.
    const requiredNs = {
      'xmlns:a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'xmlns:pic': 'http://schemas.openxmlformats.org/drawingml/2006/picture',
    };
    for (const [nsAttr, nsValue] of Object.entries(requiredNs)) {
      if (!new RegExp(`${nsAttr}=`).test(mergedRootTag)) {
        mergedRootTag = mergedRootTag.replace(/>$/, ` ${nsAttr}="${nsValue}">`);
      }
    }
    templateXml = templateXml.replace(templateRootTag, mergedRootTag);
  }

  const generatedRelsEntry = generatedZip.getEntry('word/_rels/document.xml.rels');
  const templateRelsEntry = templateZip.getEntry('word/_rels/document.xml.rels');
  const generatedCtEntry = generatedZip.getEntry('[Content_Types].xml');
  const templateCtEntry = templateZip.getEntry('[Content_Types].xml');
  if (!generatedRelsEntry || !templateRelsEntry || !generatedCtEntry || !templateCtEntry) return generatedBuffer;

  const generatedRelsXml = generatedRelsEntry.getData().toString('utf8');
  let templateRelsXml = templateRelsEntry.getData().toString('utf8');
  const generatedCtXml = generatedCtEntry.getData().toString('utf8');
  let templateCtXml = templateCtEntry.getData().toString('utf8');

  const usedRelIds = new Set();
  const relRefRegex = /r:(?:embed|id|link)="([^"]+)"/g;
  for (const match of generatedBody.matchAll(relRefRegex)) {
    if (match[1]) usedRelIds.add(match[1]);
  }

  const parseRelationshipTag = (tag) => {
    const attrs = {};
    const attrRegex = /([A-Za-z:]+)="([^"]*)"/g;
    for (const m of tag.matchAll(attrRegex)) {
      attrs[m[1]] = m[2];
    }
    return attrs;
  };

  const generatedRelationships = new Map();
  const relTagRegex = /<Relationship\b[^>]*\/>/g;
  for (const tagMatch of generatedRelsXml.matchAll(relTagRegex)) {
    const tag = tagMatch[0];
    const attrs = parseRelationshipTag(tag);
    if (attrs.Id) generatedRelationships.set(attrs.Id, { tag, attrs });
  }

  const existingTemplateIds = new Set();
  for (const tagMatch of templateRelsXml.matchAll(relTagRegex)) {
    const attrs = parseRelationshipTag(tagMatch[0]);
    if (attrs.Id) existingTemplateIds.add(attrs.Id);
  }

  const allocateRelId = () => {
    let n = 1;
    while (existingTemplateIds.has(`rId${n}`)) n += 1;
    const allocated = `rId${n}`;
    existingTemplateIds.add(allocated);
    return allocated;
  };

  const relIdMap = new Map();
  for (const oldId of usedRelIds) {
    const rel = generatedRelationships.get(oldId);
    if (!rel) continue;
    const newId = allocateRelId();
    relIdMap.set(oldId, { newId, attrs: rel.attrs });
  }

  // Remap relationship ids in generated body.
  generatedBody = generatedBody.replace(/r:(embed|id|link)="([^"]+)"/g, (full, attrName, id) => {
    const mapped = relIdMap.get(id);
    if (!mapped) return full;
    return `r:${attrName}="${mapped.newId}"`;
  });

  const copiedPartPaths = new Set();
  // Append remapped relationships and copy target parts into template zip.
  for (const [oldId, mapped] of relIdMap.entries()) {
    const attrs = { ...mapped.attrs, Id: mapped.newId };
    const relTag =
      `<Relationship Id="${attrs.Id}"` +
      `${attrs.Type ? ` Type="${attrs.Type}"` : ''}` +
      `${attrs.Target ? ` Target="${attrs.Target}"` : ''}` +
      `${attrs.TargetMode ? ` TargetMode="${attrs.TargetMode}"` : ''}` +
      '/>';

    templateRelsXml = templateRelsXml.replace('</Relationships>', `  ${relTag}\n</Relationships>`);

    if (!attrs.Target || String(attrs.TargetMode || '').toLowerCase() === 'external') continue;
    const normalizedTarget = attrs.Target.replace(/\\/g, '/');
    const sourcePartPath = path.posix.normalize(path.posix.join('word', normalizedTarget));
    const sourceEntry = generatedZip.getEntry(sourcePartPath);
    if (!sourceEntry) continue;
    const existingEntry = templateZip.getEntry(sourcePartPath);
    if (!existingEntry) {
      templateZip.addFile(sourcePartPath, sourceEntry.getData());
      copiedPartPaths.add(`/${sourcePartPath}`);
    }
  }

  if (copiedPartPaths.size > 0) {
    const templateDefaultExts = new Set(
      Array.from(templateCtXml.matchAll(/<Default\s+Extension="([^"]+)"/gi)).map((m) => m[1].toLowerCase())
    );
    const templateOverrides = new Set(
      Array.from(templateCtXml.matchAll(/<Override\s+PartName="([^"]+)"/gi)).map((m) => m[1])
    );

    const generatedDefaults = new Map();
    for (const m of generatedCtXml.matchAll(/<Default\s+Extension="([^"]+)"\s+ContentType="([^"]+)"\s*\/>/gi)) {
      generatedDefaults.set(m[1].toLowerCase(), m[2]);
    }
    const generatedOverrides = new Map();
    for (const m of generatedCtXml.matchAll(/<Override\s+PartName="([^"]+)"\s+ContentType="([^"]+)"\s*\/>/gi)) {
      generatedOverrides.set(m[1], m[2]);
    }

    let insertion = '';
    for (const partName of copiedPartPaths) {
      if (generatedOverrides.has(partName) && !templateOverrides.has(partName)) {
        insertion += `<Override PartName="${partName}" ContentType="${generatedOverrides.get(partName)}"/>\n`;
        templateOverrides.add(partName);
        continue;
      }

      const ext = partName.split('.').pop()?.toLowerCase() || '';
      if (!ext || templateDefaultExts.has(ext) || !generatedDefaults.has(ext)) continue;
      insertion += `<Default Extension="${ext}" ContentType="${generatedDefaults.get(ext)}"/>\n`;
      templateDefaultExts.add(ext);
    }

    if (insertion) {
      templateCtXml = templateCtXml.replace('</Types>', `${insertion}</Types>`);
    }
  }

  const mergedXml = templateXml.replace(
    /<w:body>[\s\S]*?<\/w:body>/i,
    `<w:body>${generatedBody}${templateSectPr}</w:body>`
  );

  templateZip.updateFile('word/document.xml', Buffer.from(mergedXml, 'utf8'));
  templateZip.updateFile('word/_rels/document.xml.rels', Buffer.from(templateRelsXml, 'utf8'));
  templateZip.updateFile('[Content_Types].xml', Buffer.from(templateCtXml, 'utf8'));
  return templateZip.toBuffer();
};

const getDocxLayoutProfile = (preview) => {
  const templateKey = String(preview?.template_resolution?.template_key || '').toLowerCase();
  const examType = String(preview?.template_resolution?.exam_type || '').toUpperCase();
  const programName = String(preview?.exam?.program_name || '').toUpperCase();

  // Catalyst PT format: two-column body with explicit exam info fields.
  if (templateKey === 'catalyst_v3' && examType === 'PT' && programName.includes('CATALYST')) {
    return {
      twoColumn: true,
      includeStructuredHeader: true,
      headerLabel: 'CATALYST PERIODIC TEST',
    };
  }

  return {
    twoColumn: false,
    includeStructuredHeader: false,
    headerLabel: null,
  };
};

const DOCX_PAGE_BORDER = Object.freeze({
  pageBorders: {
    display: PageBorderDisplay.ALL_PAGES,
    offsetFrom: PageBorderOffsetFrom.PAGE,
    zOrder: PageBorderZOrder.FRONT,
  },
  top: { style: BorderStyle.SINGLE, size: 4, color: '000000', space: 24 },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000', space: 24 },
  left: { style: BorderStyle.SINGLE, size: 4, color: '000000', space: 24 },
  right: { style: BorderStyle.SINGLE, size: 4, color: '000000', space: 24 },
});

const DOCX_TABLE_BORDER = Object.freeze({
  top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
});

const DOCX_CELL_MARGINS = Object.freeze({
  top: 80,
  bottom: 80,
  left: 90,
  right: 90,
});

const DOCX_FONT_FAMILY = 'Times New Roman';
const DOCX_BODY_FONT_SIZE = 24;
const DOCX_QUESTION_AFTER = 160;
const DOCX_OPTION_AFTER = 160;

const buildDocxTextRunOptions = ({ text = '', bold = false, italics = false, size = DOCX_BODY_FONT_SIZE } = {}) => ({
  text: String(text || ''),
  bold,
  italics,
  size,
  font: DOCX_FONT_FAMILY,
});

const buildDocxSectionProperties = ({ columns = 1, type = undefined } = {}) => ({
  page: {
    margin: {
      top: 720,
      right: 720,
      bottom: 720,
      left: 720,
      header: 220,
      footer: 220,
      gutter: 0,
    },
    borders: DOCX_PAGE_BORDER,
  },
  column: columns > 1
    ? {
      count: columns,
      space: 520,
      equalWidth: true,
      sep: true,
    }
    : {
      count: 1,
      space: 0,
    },
  ...(type ? { type } : {}),
});

const getExamDurationMinutes = (preview) =>
  Number(preview?.exam?.total_duration_minutes || preview?.exam?.duration_minutes || 0) || null;

const getExamMaxMarks = (preview) => {
  const sectionMarks = (preview?.sections ?? []).reduce((sum, section) => {
    const perQuestion = Number(section?.marks_per_question || 0);
    const count = Number(section?.required_question_count || section?.question_count || 0);
    return sum + (Number.isFinite(perQuestion) ? perQuestion : 0) * (Number.isFinite(count) ? count : 0);
  }, 0);
  return sectionMarks > 0 ? sectionMarks : null;
};

const buildDocxTextParagraph = (text, options = {}) =>
  new Paragraph({
    ...(options.alignment ? { alignment: options.alignment } : {}),
    ...(options.spacing ? { spacing: options.spacing } : {}),
    ...(options.indent ? { indent: options.indent } : {}),
    children: [
      new TextRun(
        buildDocxTextRunOptions({
          text,
          bold: Boolean(options.bold),
          italics: Boolean(options.italics),
          size: options.size,
        })
      ),
    ],
  });

const buildDocxCell = ({
  text = '',
  children = null,
  bold = false,
  size = 20,
  alignment = AlignmentType.CENTER,
  widthPct = null,
  columnSpan = undefined,
} = {}) =>
  new TableCell({
    children:
      children ??
      [
        new Paragraph({
          alignment,
          spacing: { after: 0, before: 0 },
          children: [new TextRun(buildDocxTextRunOptions({ text, bold, size }))],
        }),
      ],
    margins: DOCX_CELL_MARGINS,
    verticalAlign: 'center',
    ...(widthPct !== null
      ? {
        width: {
          size: widthPct,
          type: WidthType.PERCENTAGE,
        },
      }
      : {}),
    ...(columnSpan ? { columnSpan } : {}),
  });

const buildExamPaperHeader = (preview) => {
  const classLabel = String(
    preview?.exam?.description || preview?.exam?.grade_name || preview?.exam?.grade_label || preview?.exam?.grade_id || '--'
  );
  const title = String(preview?.exam?.title || 'QUESTION PAPER').toUpperCase();

  return new Header({
    children: [
      new Paragraph({
        spacing: { before: 0, after: 0 },
        tabStops: [
          { type: TabStopType.CENTER, position: 4680 },
          { type: TabStopType.RIGHT, position: 9360 },
        ],
        children: [
          new TextRun(buildDocxTextRunOptions({ text: `CLASS ${classLabel}`, bold: true, size: 15 })),
          new TextRun({ text: '\t' }),
          new TextRun(buildDocxTextRunOptions({ text: title, bold: true, size: 15 })),
          new TextRun({ text: '\t' }),
          new TextRun(buildDocxTextRunOptions({ text: 'SPECTROPY', bold: true, size: 15 })),
        ],
      }),
    ],
  });
};

const buildExamPaperFooter = () =>
  new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 0 },
        children: [
          new TextRun({
            ...buildDocxTextRunOptions({ size: 16 }),
            children: ['Page ', PageNumber.CURRENT],
          }),
        ],
      }),
    ],
  });

const collectSectionOverviewRows = (preview) =>
  (preview?.sections ?? []).map((section, index) => ({
    label: section?.title || `Section ${index + 1}`,
    subject: section?.selected_subject_name || '--',
    chapter:
      Array.isArray(section?.chapters) && section.chapters.length > 0
        ? section.chapters
          .map((item) => item?.name || item?.title || item)
          .filter(Boolean)
          .join(', ')
        : '--',
    topic:
      Array.isArray(section?.topics) && section.topics.length > 0
        ? section.topics
          .map((item) => item?.name || item?.title || item)
          .filter(Boolean)
          .join(', ')
        : '--',
  }));

const buildFirstPageInfoTable = (preview) => {
  const classLabel = String(
    preview?.exam?.description || preview?.exam?.grade_name || preview?.exam?.grade_label || preview?.exam?.grade_id || '--'
  );
  const title = String(preview?.exam?.program_name || 'QUESTION PAPER').toUpperCase();
  const examCode = String(preview?.exam?.title || preview?.template_resolution?.exam_type || 'EXAM').toUpperCase();
  const duration = getExamDurationMinutes(preview);
  const maxMarks = getExamMaxMarks(preview);

  return new Table({
    width: { size: 96, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: DOCX_TABLE_BORDER,
    columnWidths: [1800, 6000, 2200],
    rows: [
      new TableRow({
        children: [
          buildDocxCell({
            text: `CLASS: ${classLabel}`,
            bold: true,
            size: 18,
          }),
          buildDocxCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 60 },
                children: [new TextRun(buildDocxTextRunOptions({ text: title, bold: true, size: 28 }))],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [new TextRun(buildDocxTextRunOptions({ text: examCode, bold: true, size: 24 }))],
              }),
            ],
          }),
          buildDocxCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 0, after: 80 },
                children: [new TextRun(buildDocxTextRunOptions({ text: `TIME: ${duration ?? '--'} minutes`, bold: true, size: 18 }))],
              }),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 0, after: 0 },
                children: [new TextRun(buildDocxTextRunOptions({ text: `Max. Marks: ${maxMarks ?? '--'}`, bold: true, size: 18 }))],
              }),
            ],
          }),
        ],
      }),
    ],
  });
};

const buildSectionOverviewTable = (preview) => {
  const rows = collectSectionOverviewRows(preview);
  const tableRows = [
      new TableRow({
        children: [
          buildDocxCell({ text: 'Section', bold: true, size: 24 }),
          buildDocxCell({ text: 'Subject', bold: true, size: 24 }),
          buildDocxCell({ text: 'Chapters', bold: true, size: 24 }),
          buildDocxCell({ text: 'Topics', bold: true, size: 24 }),
        ],
      }),
    ...rows.map((row) =>
      new TableRow({
        children: [
          buildDocxCell({ text: row.label, size: 18 }),
          buildDocxCell({ text: row.subject, size: 18 }),
          buildDocxCell({ text: row.chapter, size: 18 }),
          buildDocxCell({ text: row.topic, size: 18 }),
        ],
      })
    ),
  ];

  return new Table({
    width: { size: 96, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: DOCX_TABLE_BORDER,
    columnWidths: [1700, 2200, 3200, 2900],
    rows: tableRows,
  });
};

const buildInstructionsTable = (preview) => {
  const customInstructions = richTextToMultilineText(preview?.exam?.instructions || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const lines = customInstructions.length > 0 ? customInstructions : ['--'];

  return new Table({
    width: { size: 96, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: DOCX_TABLE_BORDER,
    rows: [
      new TableRow({
        children: [
          buildDocxCell({
            text: 'Instructions',
            bold: true,
            size: 24,
          }),
        ],
      }),
      new TableRow({
        children: [
          buildDocxCell({
            alignment: AlignmentType.LEFT,
            children: lines.map((line) =>
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 0, after: 40, line: 360, lineRule: 'auto' },
                children: [new TextRun(buildDocxTextRunOptions({ text: line, size: 24 }))],
              })
            ),
          }),
        ],
      }),
    ],
  });
};

const buildQuestionParagraphsForSection = (section, startingQuestionIndex) => {
  const children = [];
  let runningQuestionIndex = startingQuestionIndex;

  for (const groupType of QUESTION_GROUP_TYPES) {
    const questions = section?.question_groups?.[groupType] ?? [];
    if (!Array.isArray(questions) || questions.length === 0) continue;

    for (const question of questions) {
      const questionHtml = extractRichHtmlString(question?.question_text);
      const questionRuns = htmlToDocxRuns(questionHtml, { size: DOCX_BODY_FONT_SIZE });
      const questionFallback = stripHtmlToText(question?.question_text) || 'Question text unavailable';
      children.push(
        new Paragraph({
          spacing: { after: DOCX_QUESTION_AFTER },
          children: [
            new TextRun(buildDocxTextRunOptions({ text: `${runningQuestionIndex}) `, bold: true })),
            ...(questionRuns.length > 0 ? questionRuns : [new TextRun(buildDocxTextRunOptions({ text: questionFallback }))]),
          ],
        })
      );

      if (Array.isArray(question?.options) && question.options.length > 0) {
        question.options.forEach((option, optionIndex) => {
          const optionPrefix = String.fromCharCode(97 + optionIndex);
          const optionHtml = extractRichHtmlString(option?.text);
          const optionRuns = htmlToDocxRuns(optionHtml, { size: DOCX_BODY_FONT_SIZE });
          const optionText = extractOptionText(option);
          if (!optionText && optionRuns.length === 0) return;
          children.push(
            new Paragraph({
              spacing: { after: DOCX_OPTION_AFTER },
              indent: { left: 220, hanging: 120 },
              children: [
                new TextRun(buildDocxTextRunOptions({ text: `(${optionPrefix}) ` })),
                ...(optionRuns.length > 0 ? optionRuns : [new TextRun(buildDocxTextRunOptions({ text: optionText }))]),
              ],
            })
          );
        });
      } else if (
        question?.question_type === 'match_following' &&
        question?.options &&
        typeof question.options === 'object'
      ) {
        const left = Array.isArray(question.options.left) ? question.options.left : [];
        const right = Array.isArray(question.options.right) ? question.options.right : [];
        left.forEach((item, idx) => {
          const optionRuns = htmlToDocxRuns(extractRichHtmlString(item?.text), { size: DOCX_BODY_FONT_SIZE });
          const text = extractOptionText(item);
          if (!text && optionRuns.length === 0) return;
          children.push(
            new Paragraph({
              spacing: { after: DOCX_OPTION_AFTER },
              indent: { left: 220, hanging: 120 },
              children: [
                new TextRun(buildDocxTextRunOptions({ text: `L${idx + 1}. ` })),
                ...(optionRuns.length > 0 ? optionRuns : [new TextRun(buildDocxTextRunOptions({ text }))]),
              ],
            })
          );
        });
        right.forEach((item, idx) => {
          const optionRuns = htmlToDocxRuns(extractRichHtmlString(item?.text), { size: DOCX_BODY_FONT_SIZE });
          const text = extractOptionText(item);
          if (!text && optionRuns.length === 0) return;
          children.push(
            new Paragraph({
              spacing: { after: DOCX_OPTION_AFTER },
              indent: { left: 220, hanging: 120 },
              children: [
                new TextRun(buildDocxTextRunOptions({ text: `R${idx + 1}. ` })),
                ...(optionRuns.length > 0 ? optionRuns : [new TextRun(buildDocxTextRunOptions({ text }))]),
              ],
            })
          );
        });
      }

      runningQuestionIndex += 1;
    }
  }

  return {
    children,
    nextQuestionIndex: runningQuestionIndex,
  };
};

const normalizeExamDocxXml = (xml) => {
  if (!xml || typeof xml !== 'string') return xml;

  let normalized = xml.replace(
    /<w:pgBorders\b([^>]*)\/>/g,
    '<w:pgBorders$1><w:top w:val="single" w:sz="4" w:space="24" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="24" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="24" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="24" w:color="auto"/></w:pgBorders>'
  );

  normalized = normalized.replace(
    /<w:cols\b([^>]*\bw:num="2"[^>]*)\/>/g,
    (match, attrs) => {
      if (/\bw:sep="/.test(match)) return match;
      return `<w:cols${attrs} w:sep="1"/>`;
    }
  );

  normalized = normalized.replace(
    /<w:cols\b([^>]*\bw:num="2"[^>]*)>/g,
    (match, attrs) => {
      if (/\bw:sep="/.test(match)) return match;
      return `<w:cols${attrs} w:sep="1">`;
    }
  );

  return normalized;
};

const finalizeExamDocxBuffer = async (doc) => {
  const buffer = await Packer.toBuffer(doc);
  const zip = new AdmZip(buffer);
  const documentEntry = zip.getEntry('word/document.xml');
  if (!documentEntry) return buffer;

  const documentXml = zip.readAsText(documentEntry);
  const normalizedXml = normalizeExamDocxXml(documentXml);
  if (normalizedXml !== documentXml) {
    zip.updateFile('word/document.xml', Buffer.from(normalizedXml, 'utf8'));
    return zip.toBuffer();
  }

  return buffer;
};

const buildExamDocxBuffer = async (preview) => {
  const firstPageChildren = [
    buildFirstPageInfoTable(preview),
    buildDocxTextParagraph('', { spacing: { after: 140 } }),
    buildSectionOverviewTable(preview),
    buildDocxTextParagraph('', { spacing: { after: 140 } }),
    buildInstructionsTable(preview),
  ];

  const questionSections = [];
  let runningQuestionIndex = 1;

  for (let sectionIndex = 0; sectionIndex < (preview?.sections ?? []).length; sectionIndex += 1) {
    const section = preview.sections[sectionIndex];
    const headingChildren = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 60 },
        children: [
          new TextRun(
            buildDocxTextRunOptions({
              text: `${section?.title || `Section ${sectionIndex + 1}`}`.toUpperCase(),
              bold: true,
              size: 24,
            })
          ),
        ],
      }),
    ];

    questionSections.push({
      properties: buildDocxSectionProperties({
        columns: 1,
        type: sectionIndex === 0 ? undefined : SectionType.CONTINUOUS,
      }),
      headers: { default: buildExamPaperHeader(preview) },
      footers: { default: buildExamPaperFooter() },
      children: headingChildren,
    });

    const questionContent = buildQuestionParagraphsForSection(section, runningQuestionIndex);
    runningQuestionIndex = questionContent.nextQuestionIndex;

    questionSections.push({
      properties: buildDocxSectionProperties({
        columns: 2,
        type: SectionType.CONTINUOUS,
      }),
      headers: { default: buildExamPaperHeader(preview) },
      footers: { default: buildExamPaperFooter() },
      children: questionContent.children.length > 0
        ? questionContent.children
        : [buildDocxTextParagraph('No questions available in this section.', { size: 18 })],
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: buildDocxSectionProperties({ columns: 1 }),
        headers: { default: buildExamPaperHeader(preview) },
        footers: { default: buildExamPaperFooter() },
        children: firstPageChildren,
      },
      ...(questionSections.length > 0
      ? questionSections
      : [
        {
          properties: buildDocxSectionProperties({ columns: 1 }),
          headers: { default: buildExamPaperHeader(preview) },
          footers: { default: buildExamPaperFooter() },
          children: [buildDocxTextParagraph('No questions available in this exam.', { size: 18 })],
        },
      ]),
    ],
  });

  return finalizeExamDocxBuffer(doc);
};

const listAssignedCoursesForExam = async (examId) => {
  const assignedResult = await dbQuery(
    `
      SELECT c.id, c.title, c.description, c.published, c.created_at, ce.assigned_at, ce.assigned_by
      FROM course_exams ce
      JOIN courses c ON c.id = ce.course_id
      WHERE ce.exam_id = $1
      ORDER BY c.title ASC, c.id ASC
    `,
    [examId]
  );
  return assignedResult.rows;
};

const validateCoursesForExamAssignment = async ({ courseIds, exam, user }) => {
  if (courseIds.length === 0) return;

  const courseResult = await dbQuery(
    `SELECT id, client_id, school_id FROM courses WHERE id = ANY($1::int[])`,
    [courseIds]
  );

  if (courseResult.rows.length !== courseIds.length) {
    throw new AppError('One or more course_ids are invalid', 404);
  }

  let scopedSchoolIds = null;
  if (isSchoolOwner(user?.role) || isTeacher(user?.role)) {
    scopedSchoolIds = await fetchUserSchoolIds(user.id);
  }

  for (const course of courseResult.rows) {
    if (Number(course.client_id) !== Number(exam.client_id)) {
      throw new AppError('Course does not belong to the same client as the exam', 403);
    }

    if (exam.school_id && Number(course.school_id) !== Number(exam.school_id)) {
      throw new AppError('Course does not belong to the same school as the exam', 403);
    }

    if (scopedSchoolIds && course.school_id && !scopedSchoolIds.includes(Number(course.school_id))) {
      throw new AppError('Access denied for one or more courses', 403);
    }
  }
};

export const addQuestionToSection = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: examId, sectionId } = req.params;
    const questionId = parseRequiredInt(req.body?.question_id, 'question_id');

    const section = await getSectionByIdForAccess({ examId, sectionId, user: req.user });
    const exam = await getExamByIdForAccess({ examId, user: req.user });
    ensureExamEditable(exam);

    const questionResult = await dbQuery('SELECT * FROM questions WHERE id = $1', [questionId]);
    if (questionResult.rows.length === 0) {
      throw new AppError('Question not found', 404);
    }

    const question = questionResult.rows[0];
    if (String(question.status).toLowerCase() !== 'approved') {
      throw new AppError('Only approved questions can be added', 400);
    }
    if (String(question.question_type).toLowerCase() === 'comprehensive') {
      throw new AppError('Legacy comprehensive parent records cannot be added to exams. Add linked child questions instead.', 400);
    }

    if (question.client_id && Number(question.client_id) !== Number(exam.client_id)) {
      throw new AppError('Question does not belong to the same client scope as the exam', 403);
    }

    if (question.school_id && exam.school_id && Number(question.school_id) !== Number(exam.school_id)) {
      throw new AppError('Question does not belong to the same school scope as the exam', 403);
    }

    const duplicateCheck = await dbQuery(
      'SELECT 1 FROM exam_questions WHERE section_id = $1 AND question_id = $2',
      [section.id, questionId]
    );
    if (duplicateCheck.rows.length > 0) {
      throw new AppError('Question already exists in this section', 409);
    }

    const examDuplicateCheck = await dbQuery(
      `
        SELECT 1
        FROM exam_questions eq
        JOIN exam_sections es ON es.id = eq.section_id
        WHERE es.exam_id = $1
          AND eq.question_id = $2
        LIMIT 1
      `,
      [exam.id, questionId]
    );
    if (examDuplicateCheck.rows.length > 0) {
      throw new AppError('Question already exists in this exam', 409);
    }

    let orderIndex = req.body?.order_index !== undefined ? parseRequiredInt(req.body.order_index, 'order_index') : null;
    if (orderIndex !== null) {
      if (orderIndex <= 0) throw new AppError('order_index must be greater than 0', 400);
    } else {
      const nextResult = await dbQuery(
        'SELECT COALESCE(MAX(order_index), 0) + 1 AS next_index FROM exam_questions WHERE section_id = $1',
        [section.id]
      );
      orderIndex = Number(nextResult.rows[0].next_index);
    }

    const insertResult = await dbQuery(
      `
        INSERT INTO exam_questions
          (section_id, question_id, order_index, question_group_type, generated_from_topic_selection)
        VALUES
          ($1, $2, $3, $4, FALSE)
        RETURNING *
      `,
      [section.id, questionId, orderIndex, normalized_question_group_type]
    );

    res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to add question to section');
  }
};

const reindexSectionQuestionOrder = async (tx, sectionId) => {
  await tx.query(
    `
      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY order_index, id) AS next_order_index
        FROM exam_questions
        WHERE section_id = $1
      )
      UPDATE exam_questions eq
      SET order_index = ranked.next_order_index
      FROM ranked
      WHERE eq.id = ranked.id
    `,
    [sectionId]
  );
};

const syncSectionCompletionState = async (tx, sectionId) => {
  const result = await tx.query(
    `
      SELECT
        es.selected_subject_id,
        es.required_question_count,
        COUNT(eq.id)::int AS question_count
      FROM exam_sections es
      LEFT JOIN exam_questions eq ON eq.section_id = es.id
      WHERE es.id = $1
      GROUP BY es.id
    `,
    [sectionId]
  );

  const row = result.rows[0];
  const requiredQuestionCount = row?.required_question_count ? Number(row.required_question_count) : 0;
  const questionCount = Number(row?.question_count ?? 0);
  const hasSyllabus = Boolean(row?.selected_subject_id);
  const isCompleted = requiredQuestionCount > 0 && questionCount === requiredQuestionCount;

  await tx.query(
    `
      UPDATE exam_sections
      SET completion_status = $1,
          syllabus_locked = $2
      WHERE id = $3
    `,
    [isCompleted ? 'completed' : hasSyllabus ? 'configured' : 'pending', isCompleted, sectionId]
  );
};

export const removeQuestionFromSection = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: examId, sectionId, questionId } = req.params;

    const section = await getSectionByIdForAccess({ examId, sectionId, user: req.user });
    const exam = await getExamByIdForAccess({ examId, user: req.user });
    ensureExamEditable(exam);

    const supportsDistributionColumns = await hasBlueprintDistributionColumns();
    const tx = await getClient();
    try {
      await tx.query('BEGIN');

      const deleteResult = await tx.query(
        `
          DELETE FROM exam_questions
          WHERE section_id = $1
            AND question_id = $2
          RETURNING question_id
        `,
        [Number(sectionId), parseRequiredInt(questionId, 'questionId')]
      );

      if (deleteResult.rows.length === 0) {
        throw new AppError('Question does not exist in this section', 404);
      }

      await reindexSectionQuestionOrder(tx, Number(sectionId));
      await syncSectionCompletionState(tx, Number(sectionId));
      await tx.query('COMMIT');
    } catch (error) {
      await tx.query('ROLLBACK');
      throw error;
    } finally {
      tx.release();
    }

    const sections = await fetchExamSectionsWithBlueprintData(Number(exam.id));
    const updatedSection = sections.find((item) => Number(item.id) === Number(section.id));
    if (!updatedSection) {
      throw new AppError('Section not found after removing question', 500);
    }

    res.json(updatedSection);
  } catch (err) {
    handleServiceError(res, err, 'Failed to remove question from section');
  }
};

export const clearQuestionGroupFromSection = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: examId, sectionId, groupType } = req.params;

    const section = await getSectionByIdForAccess({ examId, sectionId, user: req.user });
    const exam = await getExamByIdForAccess({ examId, user: req.user });
    ensureExamEditable(exam);

    const normalizedGroupType = requireString(groupType, 'groupType').trim().toLowerCase();
    if (!QUESTION_GROUP_TYPES.includes(normalizedGroupType)) {
      throw new AppError('Invalid question group type', 400);
    }

    const tx = await getClient();
    let deletedCount = 0;
    try {
      await tx.query('BEGIN');

      const deleteResult = await tx.query(
        `
          DELETE FROM exam_questions
          WHERE section_id = $1
            AND question_group_type = $2
          RETURNING question_id
        `,
        [Number(sectionId), normalizedGroupType]
      );
      deletedCount = deleteResult.rows.length;

      await reindexSectionQuestionOrder(tx, Number(sectionId));
      await syncSectionCompletionState(tx, Number(sectionId));
      await tx.query('COMMIT');
    } catch (error) {
      await tx.query('ROLLBACK');
      throw error;
    } finally {
      tx.release();
    }

    const sections = await fetchExamSectionsWithBlueprintData(Number(exam.id));
    const updatedSection = sections.find((item) => Number(item.id) === Number(section.id));
    if (!updatedSection) {
      throw new AppError('Section not found after clearing question group', 500);
    }

    res.json(updatedSection);
  } catch (err) {
    handleServiceError(res, err, 'Failed to clear question group from section');
  }
};

export const replaceQuestionInSection = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: examId, sectionId } = req.params;
    const currentQuestionId = parseRequiredInt(req.body?.current_question_id, 'current_question_id');
    const newQuestionId = parseRequiredInt(req.body?.new_question_id, 'new_question_id');

    const section = await getSectionByIdForAccess({ examId, sectionId, user: req.user });
    const exam = await getExamByIdForAccess({ examId, user: req.user });
    ensureExamEditable(exam);

    const existingResult = await dbQuery(
      `SELECT * FROM exam_questions WHERE section_id = $1 AND question_id = $2 LIMIT 1`,
      [section.id, currentQuestionId]
    );
    if (existingResult.rows.length === 0) {
      throw new AppError('Current question does not exist in this section', 404);
    }

    if (currentQuestionId === newQuestionId) {
      return res.json(existingResult.rows[0]);
    }

    const replacementQuestion = await validateQuestionForExamSection({ exam, questionId: newQuestionId });

    const duplicateCheck = await dbQuery(
      `
        SELECT 1
        FROM exam_questions eq
        JOIN exam_sections es ON es.id = eq.section_id
        WHERE es.exam_id = $1
          AND eq.question_id = $2
        LIMIT 1
      `,
      [exam.id, newQuestionId]
    );
    if (duplicateCheck.rows.length > 0) {
      throw new AppError('Question already exists in this exam', 409);
    }

    const updateResult = await dbQuery(
      `
        UPDATE exam_questions
        SET question_id = $1,
            question_group_type = $2,
            generated_from_topic_selection = FALSE
        WHERE section_id = $3
          AND question_id = $4
        RETURNING *
      `,
      [newQuestionId, replacementQuestion.normalized_question_group_type, section.id, currentQuestionId]
    );

    const sections = await fetchExamSectionsWithBlueprintData(Number(exam.id));
    const updatedSection = sections.find((item) => Number(item.id) === Number(section.id));
    if (!updatedSection) {
      throw new AppError('Section not found after replacing question', 500);
    }

    res.json(updatedSection);
  } catch (err) {
    handleServiceError(res, err, 'Failed to replace question in section');
  }
};

export const publishExam = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const exam = await getExamByIdForAccess({ examId: req.params.id, user: req.user });

    if (exam.status === 'published' || exam.status === 'active' || exam.status === 'completed') {
      throw new AppError('Exam is already published or locked', 409);
    }

    const sectionCountRes = await dbQuery('SELECT COUNT(*)::int AS count FROM exam_sections WHERE exam_id = $1', [exam.id]);
    const sectionCount = Number(sectionCountRes.rows[0]?.count || 0);
    if (sectionCount === 0) {
      throw new AppError('Exam must have at least one section before publishing', 400);
    }

    const questionCountRes = await dbQuery(
      `SELECT COUNT(eq.*)::int AS count
       FROM exam_sections es
       JOIN exam_questions eq ON eq.section_id = es.id
       WHERE es.exam_id = $1`,
      [exam.id]
    );
    const questionCount = Number(questionCountRes.rows[0]?.count || 0);
    if (questionCount === 0) {
      throw new AppError('Exam must have at least one question before publishing', 400);
    }

    const attemptCheck = await dbQuery('SELECT COUNT(*)::int AS count FROM exam_attempts WHERE exam_id = $1', [exam.id]);
    if (Number(attemptCheck.rows[0]?.count || 0) > 0) {
      throw new AppError('Cannot publish exam after attempts have been made', 403);
    }

    if (!exam.start_datetime || !exam.end_datetime || new Date(exam.end_datetime) <= new Date(exam.start_datetime)) {
      throw new AppError('Exam must have valid start and end datetimes before publishing', 400);
    }

    const updateResult = await dbQuery(
      `UPDATE exams
       SET status = 'published', updated_at = NOW()
       WHERE id = $1
         AND status = 'draft'
         AND NOT EXISTS (SELECT 1 FROM exam_attempts WHERE exam_id = $1)
       RETURNING *`,
      [exam.id]
    );
    if (updateResult.rows.length === 0) {
      throw new AppError('Exam status changed. Please refresh and try again.', 409);
    }

    res.json(updateResult.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to publish exam');
  }
};

export const getExamAssignedCourses = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await ensureCourseExamsTable();

    const exam = await getExamByIdForAccess({
      examId: req.params.id,
      user: req.user,
    });

    const courses = await listAssignedCoursesForExam(exam.id);
    res.json({
      exam_id: Number(exam.id),
      assigned_count: courses.length,
      courses,
    });
  } catch (err) {
    handleServiceError(res, err, 'Failed to load assigned courses');
  }
};

export const assignExamCourses = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await ensureCourseExamsTable();

    const exam = await getExamByIdForAccess({
      examId: req.params.id,
      user: req.user,
    });

    const courseIds = parseCourseIds(req.body?.course_ids);
    await validateCoursesForExamAssignment({ courseIds, exam, user: req.user });

    const tx = await getClient();
    try {
      await tx.query('BEGIN');
      await tx.query('DELETE FROM course_exams WHERE exam_id = $1', [exam.id]);

      if (courseIds.length > 0) {
        await tx.query(
          `
            INSERT INTO course_exams (course_id, exam_id, assigned_by)
            SELECT UNNEST($1::int[]), $2, $3
            ON CONFLICT (course_id, exam_id) DO UPDATE
            SET assigned_by = EXCLUDED.assigned_by,
                assigned_at = NOW()
          `,
          [courseIds, exam.id, req.user.id]
        );
      }

      await tx.query('COMMIT');
    } catch (error) {
      await tx.query('ROLLBACK');
      throw error;
    } finally {
      tx.release();
    }

    const courses = await listAssignedCoursesForExam(exam.id);
    res.json({
      exam_id: Number(exam.id),
      assigned_count: courses.length,
      courses,
    });
  } catch (err) {
    handleServiceError(res, err, 'Failed to assign exam courses');
  }
};

export const listBlueprints = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const explicitClientId = parseNullableInt(req.query?.client_id, 'client_id');
    const clientId = isPlatformAdmin(req.user.role) ? explicitClientId : (req.clientId || req.user.client_id);
    const schoolId = parseNullableInt(req.query?.school_id, 'school_id');
    const status = req.query?.status ? requireString(req.query.status, 'status') : null;
    if (status) ensureBlueprintStatus(status);

    if (!clientId && !isPlatformAdmin(req.user.role)) {
      throw new AppError('client_id is required', 400);
    }

    const params = [];
    const conditions = [];
    const addParam = (value) => {
      params.push(value);
      return `$${params.length}`;
    };

    if (clientId) {
      conditions.push(`b.client_id = ${addParam(clientId)}`);
    }
    if (schoolId) {
      conditions.push(`b.school_id = ${addParam(schoolId)}`);
    } else if (isSchoolOwner(req.user.role) || isTeacher(req.user.role)) {
      const schoolIds = await fetchUserSchoolIds(req.user.id);
      if (schoolIds.length > 0) {
        conditions.push(`(b.school_id IS NULL OR b.school_id = ANY(${addParam(schoolIds)}))`);
      } else {
        conditions.push(`b.school_id IS NULL`);
      }
    }
    if (status) {
      conditions.push(`b.status = ${addParam(status)}`);
    }
    if (req.query?.q) {
      const search = String(req.query.q).trim();
      if (search) {
        conditions.push(`b.name ILIKE ${addParam(`%${search}%`)}`);
      }
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const supportsDistributionColumns = await hasBlueprintDistributionColumns();
    const distributionSelect = supportsDistributionColumns
      ? `
                'direction_question_count', bs.direction_question_count,
                'similar_question_count', bs.similar_question_count,
                'previous_year_question_count', bs.previous_year_question_count,
                'reference_question_count', bs.reference_question_count,
      `
      : `
                'direction_question_count', bs.required_question_count,
                'similar_question_count', 0,
                'previous_year_question_count', 0,
                'reference_question_count', 0,
      `;
    const result = await dbQuery(
      `
        SELECT
          b.*,
          COALESCE(COUNT(bs.id), 0)::int AS section_count,
          COALESCE(SUM(bs.required_question_count), 0)::int AS total_required_questions,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', bs.id,
                'section_name', bs.section_name,
                'required_question_count', bs.required_question_count,
                ${distributionSelect}
                'display_order', bs.display_order
              )
              ORDER BY bs.display_order, bs.id
            ) FILTER (WHERE bs.id IS NOT NULL),
            '[]'::json
          ) AS sections
        FROM blueprints b
        LEFT JOIN blueprint_sections bs ON bs.blueprint_id = b.id
        ${whereClause}
        GROUP BY b.id
        ORDER BY b.updated_at DESC, b.id DESC
      `,
      params
    );

    res.json(result.rows);
  } catch (err) {
    handleServiceError(res, err, 'Failed to list blueprints');
  }
};

export const getBlueprintById = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const clientId = isPlatformAdmin(req.user.role) ? null : (req.clientId || req.user.client_id);
    const blueprint = await ensureBlueprintAccessible({
      blueprintId: parseRequiredInt(req.params.id, 'id'),
      user: req.user,
      clientId,
    });

    res.json(blueprint);
  } catch (err) {
    handleServiceError(res, err, 'Failed to load blueprint');
  }
};

export const createBlueprint = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const name = requireString(req.body?.name, 'name');
    const sections = await parseBlueprintSectionsInput(req.body?.sections);
    const clientId = isPlatformAdmin(req.user.role) ? parseRequiredInt(req.body?.client_id, 'client_id') : (req.clientId || req.user.client_id);
    if (!clientId) throw new AppError('client_id is required', 400);

    const schoolIdInput = parseNullableInt(req.body?.school_id, 'school_id');
    const schoolScope = await resolveSchoolScope({
      schoolId: schoolIdInput,
      user: req.user,
      clientId,
    });
    const status = req.body?.status ? requireString(req.body.status, 'status') : 'active';
    ensureBlueprintStatus(status);

    const supportsDistributionColumns = await hasBlueprintDistributionColumns();
    const tx = await getClient();
    let blueprintId;
    try {
      await tx.query('BEGIN');
      const blueprintResult = await tx.query(
        `
          INSERT INTO blueprints (client_id, school_id, name, status, created_by)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `,
        [clientId, schoolScope.schoolId, name, status, req.user.id]
      );
      blueprintId = Number(blueprintResult.rows[0].id);

      for (const section of sections) {
        if (supportsDistributionColumns) {
          await tx.query(
            `
              INSERT INTO blueprint_sections (
                blueprint_id,
                section_name,
                required_question_count,
                direction_question_count,
                similar_question_count,
                previous_year_question_count,
                reference_question_count,
                display_order
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `,
            [
              blueprintId,
              section.section_name,
              section.required_question_count,
              section.direction_question_count,
              section.similar_question_count,
              section.previous_year_question_count,
              section.reference_question_count,
              section.display_order,
            ]
          );
        } else {
          await tx.query(
            `
              INSERT INTO blueprint_sections (blueprint_id, section_name, required_question_count, display_order)
              VALUES ($1, $2, $3, $4)
            `,
            [blueprintId, section.section_name, section.required_question_count, section.display_order]
          );
        }
      }

      await tx.query('COMMIT');
    } catch (error) {
      await tx.query('ROLLBACK');
      throw error;
    } finally {
      tx.release();
    }

    const blueprint = await ensureBlueprintAccessible({
      blueprintId,
      user: req.user,
      clientId,
    });
    res.status(201).json(blueprint);
  } catch (err) {
    handleServiceError(res, err, 'Failed to create blueprint');
  }
};

export const updateBlueprint = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const clientId = isPlatformAdmin(req.user.role) ? null : (req.clientId || req.user.client_id);
    const blueprintId = parseRequiredInt(req.params.id, 'id');
    const existing = await ensureBlueprintAccessible({
      blueprintId,
      user: req.user,
      clientId,
    });

    const nextName = req.body?.name !== undefined ? requireString(req.body.name, 'name') : existing.name;
    const nextStatus = req.body?.status !== undefined ? requireString(req.body.status, 'status') : existing.status;
    ensureBlueprintStatus(nextStatus);

    const schoolId = req.body?.school_id !== undefined
      ? (await resolveSchoolScope({
        schoolId: parseNullableInt(req.body.school_id, 'school_id'),
        user: req.user,
        clientId: Number(existing.client_id),
      })).schoolId
      : existing.school_id;

    const sections = req.body?.sections !== undefined
      ? await parseBlueprintSectionsInput(req.body.sections)
      : (Array.isArray(existing.sections) ? existing.sections : []);

    const supportsDistributionColumns = await hasBlueprintDistributionColumns();
    const tx = await getClient();
    try {
      await tx.query('BEGIN');
      await tx.query(
        `
          UPDATE blueprints
          SET name = $1, status = $2, school_id = $3, updated_at = NOW()
          WHERE id = $4
        `,
        [nextName, nextStatus, schoolId, blueprintId]
      );

      if (req.body?.sections !== undefined) {
        await tx.query(`DELETE FROM blueprint_sections WHERE blueprint_id = $1`, [blueprintId]);
        for (const section of sections) {
          if (supportsDistributionColumns) {
            await tx.query(
              `
                INSERT INTO blueprint_sections (
                  blueprint_id,
                  section_name,
                  required_question_count,
                  direction_question_count,
                  similar_question_count,
                  previous_year_question_count,
                  reference_question_count,
                  display_order
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              `,
              [
                blueprintId,
                section.section_name,
                section.required_question_count,
                section.direction_question_count,
                section.similar_question_count,
                section.previous_year_question_count,
                section.reference_question_count,
                section.display_order,
              ]
            );
          } else {
            await tx.query(
              `
                INSERT INTO blueprint_sections (blueprint_id, section_name, required_question_count, display_order)
                VALUES ($1, $2, $3, $4)
              `,
              [blueprintId, section.section_name, section.required_question_count, section.display_order]
            );
          }
        }
      }

      await tx.query('COMMIT');
    } catch (error) {
      await tx.query('ROLLBACK');
      throw error;
    } finally {
      tx.release();
    }

    const blueprint = await ensureBlueprintAccessible({
      blueprintId,
      user: req.user,
      clientId: Number(existing.client_id),
    });
    res.json(blueprint);
  } catch (err) {
    handleServiceError(res, err, 'Failed to update blueprint');
  }
};

export const deleteBlueprint = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const clientId = isPlatformAdmin(req.user.role) ? null : (req.clientId || req.user.client_id);
    const blueprintId = parseRequiredInt(req.params.id, 'id');
    await ensureBlueprintAccessible({
      blueprintId,
      user: req.user,
      clientId,
    });

    const usageResult = await dbQuery(`SELECT COUNT(*)::int AS count FROM exams WHERE blueprint_id = $1`, [blueprintId]);
    if (Number(usageResult.rows[0]?.count || 0) > 0) {
      throw new AppError('Blueprint is already linked to exams and cannot be deleted', 409);
    }

    await dbQuery(`DELETE FROM blueprints WHERE id = $1`, [blueprintId]);
    res.json({ success: true, id: blueprintId });
  } catch (err) {
    handleServiceError(res, err, 'Failed to delete blueprint');
  }
};

export const listExams = async (req, res) => {

  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await ensureExamResultConfigColumns();
    await ensureCourseExamsTable();

    const { page, pageSize, offset } = parsePagination(req.query);
    const { conditions, params } = await buildExamWhere({ user: req.user, query: req.query });
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await dbQuery(`SELECT COUNT(*)::int AS total FROM exams e ${whereClause}`, params);
    const total = Number(countResult.rows[0]?.total || 0);

    const listParams = [...params, pageSize, offset];
    const result = await dbQuery(
      `
      SELECT
        e.*,
        COALESCE(course_stats.course_count, 0)::int AS course_count,
        COALESCE(course_stats.course_names, ARRAY[]::text[]) AS course_names,
        COALESCE(section_stats.section_count, 0)::int AS section_count,
        COALESCE(section_stats.question_count, 0)::int AS question_count,
        COALESCE(attempt_stats.attempts_count, 0)::int AS attempts_count,
        COALESCE(NULLIF(TRIM(u.full_name), ''), u.email, NULL) AS created_by_name
      FROM exams e
      LEFT JOIN users u ON u.id = e.created_by
      LEFT JOIN LATERAL (
        SELECT
          COUNT(DISTINCT ce.course_id) AS course_count,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT c.title ORDER BY c.title), NULL) AS course_names
        FROM course_exams ce
        LEFT JOIN courses c ON c.id = ce.course_id
        WHERE ce.exam_id = e.id
      ) course_stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(DISTINCT es.id) AS section_count,
          COUNT(eq.id) AS question_count
        FROM exam_sections es
        LEFT JOIN exam_questions eq ON eq.section_id = es.id
        WHERE es.exam_id = e.id
      ) section_stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS attempts_count
        FROM exam_attempts ea
        WHERE ea.exam_id = e.id
      ) attempt_stats ON TRUE
      ${whereClause}
      ORDER BY e.created_at DESC, e.id DESC
      LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
      `,
      listParams
    );

    res.json({
      data: result.rows,
      page,
      page_size: pageSize,
      total,
    });
  } catch (err) {
    handleServiceError(res, err, 'Failed to load exams');
  }
};

export const getExamById = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await ensureExamResultConfigColumns();
    await ensureCourseExamsTable();

    const exam = await getExamByIdForAccess({ examId: req.params.id, user: req.user });

    const examResult = await dbQuery(
      `
      SELECT
        e.*,
        COALESCE(course_stats.course_count, 0)::int AS course_count,
        COALESCE(course_stats.course_names, ARRAY[]::text[]) AS course_names,
        COALESCE(section_stats.section_count, 0)::int AS section_count,
        COALESCE(section_stats.question_count, 0)::int AS question_count,
        COALESCE(attempt_stats.attempts_count, 0)::int AS attempts_count,
        COALESCE(NULLIF(TRIM(u.full_name), ''), u.email, NULL) AS created_by_name
      FROM exams e
      LEFT JOIN users u ON u.id = e.created_by
      LEFT JOIN LATERAL (
        SELECT
          COUNT(DISTINCT ce.course_id) AS course_count,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT c.title ORDER BY c.title), NULL) AS course_names
        FROM course_exams ce
        LEFT JOIN courses c ON c.id = ce.course_id
        WHERE ce.exam_id = e.id
      ) course_stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(DISTINCT es.id) AS section_count,
          COUNT(eq.id) AS question_count
        FROM exam_sections es
        LEFT JOIN exam_questions eq ON eq.section_id = es.id
        WHERE es.exam_id = e.id
      ) section_stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS attempts_count
        FROM exam_attempts ea
        WHERE ea.exam_id = e.id
      ) attempt_stats ON TRUE
      WHERE e.id = $1
      `,
      [exam.id]
    );

    const assignedCourses = await listAssignedCoursesForExam(exam.id);
    const preview = await buildExamPreviewPayload(examResult.rows[0]);

    res.json({
      ...preview.exam,
      blueprint: preview.blueprint,
      sections: preview.sections,
      totals: preview.totals,
      all_sections_completed: preview.all_sections_completed,
      assigned_courses: assignedCourses,
      course_count: examResult.rows[0].course_count,
      course_names: examResult.rows[0].course_names,
      attempts_count: examResult.rows[0].attempts_count,
    });
  } catch (err) {
    handleServiceError(res, err, 'Failed to load exam');
  }
};

export const getExamResults = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await ensureExamResultConfigColumns();

    const exam = await getExamByIdForAccess({
      examId: req.params.id,
      user: req.user,
    });

    const { page, pageSize, offset } = parsePagination(req.query);

    const countResult = await dbQuery(
      `SELECT COUNT(*)::int AS total FROM exam_attempts WHERE exam_id = $1`,
      [exam.id]
    );
    const total = Number(countResult.rows[0]?.total || 0);

    const attemptsResult = await dbQuery(
      `
      SELECT
        ea.id,
        ea.student_id,
        ea.attempt_number,
        ea.status,
        ea.started_at,
        ea.submitted_at,
        ea.auto_submitted,
        u.full_name,
        u.email
      FROM exam_attempts ea
      LEFT JOIN users u ON u.id = ea.student_id
      WHERE ea.exam_id = $1
      ORDER BY ea.started_at DESC, ea.id DESC
      LIMIT $2 OFFSET $3
      `,
      [exam.id, pageSize, offset]
    );

    const results = await Promise.all(
      attemptsResult.rows.map(async (attemptRow) => {
        try {
          const payload = await getAttemptResultPayloadByAttemptId({
            attemptId: Number(attemptRow.id),
            allowUnreleased: true,
          });
          return {
            ...payload,
            student: {
              id: Number(attemptRow.student_id),
              name: attemptRow.full_name || attemptRow.email || null,
              email: attemptRow.email || null,
            },
          };
        } catch (err) {
          if (err instanceof AppError && err.status === 409) {
            return {
              attempt: {
                id: Number(attemptRow.id),
                exam_id: Number(exam.id),
                student_id: Number(attemptRow.student_id),
                attempt_number: attemptRow.attempt_number,
                status: attemptRow.status,
                started_at: attemptRow.started_at,
                submitted_at: attemptRow.submitted_at,
                auto_submitted: attemptRow.auto_submitted,
              },
              student: {
                id: Number(attemptRow.student_id),
                name: attemptRow.full_name || attemptRow.email || null,
                email: attemptRow.email || null,
              },
              summary: null,
              responses: [],
            };
          }
          throw err;
        }
      })
    );

    return res.json({
      exam_id: Number(exam.id),
      page,
      page_size: pageSize,
      total,
      results,
    });
  } catch (err) {
    handleServiceError(res, err, 'Failed to load exam results');
  }
};

export const createExam = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await ensureExamResultConfigColumns();

    const title = requireString(req.body?.title, 'title');
    const description = req.body?.description ? String(req.body.description).trim() : null;
    const instructions = req.body?.instructions ? String(req.body.instructions).trim() : null;
    const supportsExamInstructions = await hasExamInstructionsColumn();
    const totalDuration = parseRequiredInt(req.body?.total_duration_minutes, 'total_duration_minutes');
    if (totalDuration <= 0) throw new AppError('total_duration_minutes must be greater than 0', 400);

    const startDateTime = parseDateTime(req.body?.start_datetime, 'start_datetime');
    const endDateTime = parseDateTime(req.body?.end_datetime, 'end_datetime');
    if (new Date(endDateTime) <= new Date(startDateTime)) {
      throw new AppError('end_datetime must be after start_datetime', 400);
    }

    const clientId = isPlatformAdmin(req.user.role) ? parseRequiredInt(req.body?.client_id, 'client_id') : (req.clientId || req.user.client_id);
    if (!clientId) throw new AppError('client_id is required', 400);

    const schoolIdInput = parseNullableInt(req.body?.school_id, 'school_id');
    if (schoolIdInput) {
      const schoolResult = await dbQuery(`SELECT id, client_id FROM schools WHERE id = $1`, [schoolIdInput]);
      if (schoolResult.rows.length === 0) {
        throw new AppError('School not found', 404);
      }
      const school = schoolResult.rows[0];
      if (Number(school.client_id) !== Number(clientId)) {
        throw new AppError('School does not belong to this client', 403);
      }
    }
    const schoolId = schoolIdInput;
    const programId = parseNullableInt(req.body?.program_id, 'program_id');
    const blueprintId = parseNullableInt(req.body?.blueprint_id, 'blueprint_id');

    if (blueprintId && !programId) {
      throw new AppError('program_id is required when blueprint_id is provided', 400);
    }

    if (programId) {
      await ensureProgramAccess({ programId, user: req.user, clientId: Number(clientId) });
    }

    let blueprint = null;
    if (blueprintId) {
      blueprint = await ensureBlueprintAccessible({
        blueprintId,
        user: req.user,
        clientId: Number(clientId),
      });
      if (!Array.isArray(blueprint.sections) || blueprint.sections.length === 0) {
        throw new AppError('Selected blueprint does not contain any sections', 400);
      }
      if (schoolId && blueprint.school_id && Number(blueprint.school_id) !== Number(schoolId)) {
        throw new AppError('Blueprint does not belong to the selected school scope', 403);
      }
    }

    const shuffleQuestions = parseBoolean(req.body?.shuffle_questions, 'shuffle_questions');
    const shuffleOptions = parseBoolean(req.body?.shuffle_options, 'shuffle_options');
    const showResultImmediately = parseBoolean(req.body?.show_result_immediately, 'show_result_immediately');
    const showScore = parseBoolean(req.body?.show_score, 'show_score');
    const showPassOrFail = parseBoolean(req.body?.show_pass_or_fail, 'show_pass_or_fail');
    const showSolutionsToUser = parseBoolean(req.body?.show_solutions_to_user, 'show_solutions_to_user');

    const maxAttempts = req.body?.max_attempts === undefined || req.body?.max_attempts === null || req.body?.max_attempts === ''
      ? 1
      : parseRequiredInt(req.body?.max_attempts, 'max_attempts');
    if (maxAttempts <= 0) throw new AppError('max_attempts must be greater than 0', 400);

    const statusInput = req.body?.status ? requireString(req.body.status, 'status') : 'draft';
    ensureValidStatus(statusInput);
    const status = isTeacher(req.user.role) ? 'draft' : statusInput;

    const tx = await getClient();
    let createdExam;
    try {
      await tx.query('BEGIN');
      const result = supportsExamInstructions
        ? await tx.query(
          `
          INSERT INTO exams
            (client_id, school_id, program_id, blueprint_id, title, description, instructions, total_duration_minutes, start_datetime, end_datetime,
             shuffle_questions, shuffle_options, show_result_immediately, show_score, show_pass_or_fail, show_solutions_to_user,
             max_attempts, status, created_by)
          VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, FALSE), COALESCE($12, FALSE), COALESCE($13, TRUE),
             COALESCE($14, TRUE), COALESCE($15, TRUE), COALESCE($16, FALSE), $17, $18, $19)
          RETURNING *
          `,
          [
            clientId,
            schoolId,
            programId,
            blueprintId,
            title,
            description,
            instructions,
            totalDuration,
            startDateTime,
            endDateTime,
            shuffleQuestions,
            shuffleOptions,
            showResultImmediately,
            showScore,
            showPassOrFail,
            showSolutionsToUser,
            maxAttempts,
            status,
            req.user.id,
          ]
        )
        : await tx.query(
          `
          INSERT INTO exams
            (client_id, school_id, program_id, blueprint_id, title, description, total_duration_minutes, start_datetime, end_datetime,
             shuffle_questions, shuffle_options, show_result_immediately, show_score, show_pass_or_fail, show_solutions_to_user,
             max_attempts, status, created_by)
          VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, FALSE), COALESCE($11, FALSE), COALESCE($12, TRUE),
             COALESCE($13, TRUE), COALESCE($14, TRUE), COALESCE($15, FALSE), $16, $17, $18)
          RETURNING *
          `,
          [
            clientId,
            schoolId,
            programId,
            blueprintId,
            title,
            description,
            totalDuration,
            startDateTime,
            endDateTime,
            shuffleQuestions,
            shuffleOptions,
            showResultImmediately,
            showScore,
            showPassOrFail,
            showSolutionsToUser,
            maxAttempts,
            status,
            req.user.id,
          ]
        );

      createdExam = result.rows[0];

      const supportsSectionDistributionColumns = await hasExamSectionDistributionColumns();
      if (blueprint) {
        for (const section of blueprint.sections) {
          if (supportsSectionDistributionColumns) {
            await tx.query(
              `
                INSERT INTO exam_sections
                  (
                    exam_id,
                    title,
                    order_index,
                    required_question_count,
                    direction_question_count,
                    similar_question_count,
                    previous_year_question_count,
                    reference_question_count,
                    blueprint_section_id,
                    completion_status,
                    instructions,
                    marks_per_question,
                    negative_marks
                  )
                VALUES
                  ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NULL, 4, 1)
              `,
              [
                createdExam.id,
                section.section_name,
                section.display_order,
                section.required_question_count,
                section.direction_question_count,
                section.similar_question_count,
                section.previous_year_question_count,
                section.reference_question_count,
                section.id,
              ]
            );
          } else {
            await tx.query(
              `
                INSERT INTO exam_sections
                  (exam_id, title, order_index, required_question_count, blueprint_section_id, completion_status, instructions, marks_per_question, negative_marks)
                VALUES
                  ($1, $2, $3, $4, $5, 'pending', NULL, 4, 1)
              `,
              [
                createdExam.id,
                section.section_name,
                section.display_order,
                section.required_question_count,
                section.id,
              ]
            );
          }
        }
      }

      await tx.query('COMMIT');
    } catch (error) {
      await tx.query('ROLLBACK');
      throw error;
    } finally {
      tx.release();
    }

    const payload = await buildExamPreviewPayload(createdExam);
    res.status(201).json(payload);
  } catch (err) {
    handleServiceError(res, err, 'Failed to create exam');
  }
};

export const updateExam = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await ensureExamResultConfigColumns();

    const exam = await getExamByIdForAccess({
      examId: req.params.id,
      user: req.user,
    });
    const supportsExamInstructions = await hasExamInstructionsColumn();

    ensureExamEditable(exam);

    const nextStartDateTime = req.body?.start_datetime !== undefined
      ? parseDateTime(req.body.start_datetime, 'start_datetime')
      : new Date(exam.start_datetime).toISOString();
    const nextEndDateTime = req.body?.end_datetime !== undefined
      ? parseDateTime(req.body.end_datetime, 'end_datetime')
      : new Date(exam.end_datetime).toISOString();
    if (new Date(nextEndDateTime) <= new Date(nextStartDateTime)) {
      throw new AppError('end_datetime must be after start_datetime', 400);
    }

    const updates = [];
    const values = [];
    const addUpdate = (column, value) => {
      values.push(value);
      updates.push(`${column} = $${values.length}`);
    };

    if (req.body?.title !== undefined) addUpdate('title', requireString(req.body.title, 'title'));
    if (req.body?.description !== undefined) {
      addUpdate('description', req.body.description ? String(req.body.description).trim() : null);
    }
    if (supportsExamInstructions && req.body?.instructions !== undefined) {
      addUpdate('instructions', req.body.instructions ? String(req.body.instructions).trim() : null);
    }
    if (req.body?.total_duration_minutes !== undefined) {
      const total = parseRequiredInt(req.body.total_duration_minutes, 'total_duration_minutes');
      if (total <= 0) throw new AppError('total_duration_minutes must be greater than 0', 400);
      addUpdate('total_duration_minutes', total);
    }
    if (req.body?.start_datetime !== undefined) addUpdate('start_datetime', nextStartDateTime);
    if (req.body?.end_datetime !== undefined) addUpdate('end_datetime', nextEndDateTime);
    if (req.body?.shuffle_questions !== undefined) {
      addUpdate('shuffle_questions', parseBoolean(req.body.shuffle_questions, 'shuffle_questions'));
    }
    if (req.body?.shuffle_options !== undefined) {
      addUpdate('shuffle_options', parseBoolean(req.body.shuffle_options, 'shuffle_options'));
    }
    if (req.body?.show_result_immediately !== undefined) {
      addUpdate('show_result_immediately', parseBoolean(req.body.show_result_immediately, 'show_result_immediately'));
    }
    if (req.body?.show_score !== undefined) {
      addUpdate('show_score', parseBoolean(req.body.show_score, 'show_score'));
    }
    if (req.body?.show_pass_or_fail !== undefined) {
      addUpdate('show_pass_or_fail', parseBoolean(req.body.show_pass_or_fail, 'show_pass_or_fail'));
    }
    if (req.body?.show_solutions_to_user !== undefined) {
      addUpdate('show_solutions_to_user', parseBoolean(req.body.show_solutions_to_user, 'show_solutions_to_user'));
    }
    if (req.body?.max_attempts !== undefined) {
      const attempts = parseRequiredInt(req.body.max_attempts, 'max_attempts');
      if (attempts <= 0) throw new AppError('max_attempts must be greater than 0', 400);
      addUpdate('max_attempts', attempts);
    }
    if (req.body?.status !== undefined) {
      const status = requireString(req.body.status, 'status');
      ensureValidStatus(status);
      if (isTeacher(req.user.role) && status !== 'draft' && status !== 'published') {
        throw new AppError('Teachers can only set status to draft or published', 403);
      }
      addUpdate('status', status);
    }
    if (req.body?.school_id !== undefined) {
      const schoolId = parseNullableInt(req.body.school_id, 'school_id');
      const scoped = await resolveSchoolScope({
        schoolId,
        user: req.user,
        clientId: Number(exam.client_id),
      });
      addUpdate('school_id', scoped.schoolId);
    }
    if (req.body?.program_id !== undefined) {
      const programId = parseNullableInt(req.body.program_id, 'program_id');
      if (programId) {
        await ensureProgramAccess({ programId, user: req.user, clientId: Number(exam.client_id) });
      }
      addUpdate('program_id', programId);
    }
    if (req.body?.blueprint_id !== undefined) {
      const blueprintId = parseNullableInt(req.body.blueprint_id, 'blueprint_id');
      if (blueprintId) {
        const nextProgramId = req.body?.program_id !== undefined
          ? parseNullableInt(req.body.program_id, 'program_id')
          : (exam.program_id ? Number(exam.program_id) : null);
        if (!nextProgramId) {
          throw new AppError('program_id is required when blueprint_id is provided', 400);
        }
        await ensureBlueprintAccessible({
          blueprintId,
          user: req.user,
          clientId: Number(exam.client_id),
        });

        const sectionCountRes = await dbQuery(`SELECT COUNT(*)::int AS count FROM exam_sections WHERE exam_id = $1`, [exam.id]);
        if (Number(sectionCountRes.rows[0]?.count || 0) > 0) {
          throw new AppError('Cannot change blueprint after exam sections have been created', 409);
        }
      }
      addUpdate('blueprint_id', blueprintId);
    }

    if (updates.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    values.push(exam.id);
    const result = await dbQuery(
      `
      UPDATE exams
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING *
      `,
      values
    );

    const refreshedExam = await getExamByIdForAccess({ examId: result.rows[0].id, user: req.user });
    const payload = await buildExamPreviewPayload(refreshedExam);
    res.json(payload);
  } catch (err) {
    handleServiceError(res, err, 'Failed to update exam');
  }
};

export const deleteExam = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const exam = await getExamByIdForAccess({
      examId: req.params.id,
      user: req.user,
    });

    ensureExamDeletable(exam);

    const tx = await getClient();
    let result;

    try {
      await tx.query('BEGIN');

      await tx.query(`DELETE FROM exam_attempts WHERE exam_id = $1`, [exam.id]);
      result = await tx.query(`DELETE FROM exams WHERE id = $1 RETURNING id`, [exam.id]);

      if (result.rows.length === 0) {
        throw new AppError('Exam not found', 404);
      }

      await tx.query('COMMIT');
    } catch (error) {
      await tx.query('ROLLBACK');
      throw error;
    } finally {
      tx.release();
    }

    res.json({ success: true, id: Number(result.rows[0].id) });
  } catch (err) {
    handleServiceError(res, err, 'Failed to delete exam');
  }
};

export const createExamSection = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const exam = await getExamByIdForAccess({
      examId: req.params.id,
      user: req.user,
    });
    ensureExamEditable(exam);

    const title = requireString(req.body?.title, 'title');
    const instructions = req.body?.instructions ? String(req.body.instructions).trim() : null;
    const marksPerQuestion = parseOptionalNumber(req.body?.marks_per_question, 'marks_per_question');
    const negativeMarks = parseOptionalNumber(req.body?.negative_marks, 'negative_marks');

    let orderIndex = parseNullableInt(req.body?.order_index, 'order_index');
    if (!orderIndex) {
      const nextResult = await dbQuery(
        `SELECT COALESCE(MAX(order_index), 0) + 1 AS next_index FROM exam_sections WHERE exam_id = $1`,
        [exam.id]
      );
      orderIndex = Number(nextResult.rows[0].next_index);
    }
    if (orderIndex <= 0) throw new AppError('order_index must be greater than 0', 400);

    const result = await dbQuery(
      `
      INSERT INTO exam_sections
        (exam_id, title, order_index, instructions, marks_per_question, negative_marks)
      VALUES
        ($1, $2, $3, $4, COALESCE($5, 4), COALESCE($6, 1))
      RETURNING *
      `,
      [exam.id, title, orderIndex, instructions, marksPerQuestion, negativeMarks]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to create exam section');
  }
};

export const updateExamSection = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const section = await getSectionByIdForAccess({
      examId: req.params.id,
      sectionId: req.params.sectionId,
      user: req.user,
    });
    const exam = await getExamByIdForAccess({ examId: req.params.id, user: req.user });
    ensureExamEditable(exam);

    const updates = [];
    const values = [];
    const addUpdate = (column, value) => {
      values.push(value);
      updates.push(`${column} = $${values.length}`);
    };

    if (req.body?.title !== undefined) addUpdate('title', requireString(req.body.title, 'title'));
    if (req.body?.order_index !== undefined) {
      const orderIndex = parseRequiredInt(req.body.order_index, 'order_index');
      if (orderIndex <= 0) throw new AppError('order_index must be greater than 0', 400);
      addUpdate('order_index', orderIndex);
    }
    if (req.body?.instructions !== undefined) {
      addUpdate('instructions', req.body.instructions ? String(req.body.instructions).trim() : null);
    }
    if (req.body?.marks_per_question !== undefined) {
      addUpdate('marks_per_question', parseOptionalNumber(req.body.marks_per_question, 'marks_per_question'));
    }
    if (req.body?.negative_marks !== undefined) {
      addUpdate('negative_marks', parseOptionalNumber(req.body.negative_marks, 'negative_marks'));
    }

    if (updates.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    values.push(section.id);
    const result = await dbQuery(
      `
      UPDATE exam_sections
      SET ${updates.join(', ')}
      WHERE id = $${values.length}
      RETURNING *
      `,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to update exam section');
  }
};

export const deleteExamSection = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const section = await getSectionByIdForAccess({
      examId: req.params.id,
      sectionId: req.params.sectionId,
      user: req.user,
    });
    const exam = await getExamByIdForAccess({ examId: req.params.id, user: req.user });
    ensureExamEditable(exam);

    await dbQuery(`DELETE FROM exam_sections WHERE id = $1`, [section.id]);
    res.json({ success: true, id: Number(section.id) });
  } catch (err) {
    handleServiceError(res, err, 'Failed to delete exam section');
  }
};

export const getExamSectionSyllabusOptions = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const exam = await getExamByIdForAccess({ examId: req.params.id, user: req.user });
    const section = await getSectionByIdForAccess({
      examId: req.params.id,
      sectionId: req.params.sectionId,
      user: req.user,
    });

    if (!exam.program_id) {
      throw new AppError('Exam program is not configured', 400);
    }

    const clientId = Number(exam.client_id);
    const subjectId = parseNullableInt(req.query?.subject_id ?? section.selected_subject_id, 'subject_id');
    const chapterIds = req.query?.chapter_ids
      ? parsePositiveIntArray(String(req.query.chapter_ids).split(',').filter(Boolean), 'chapter_ids')
      : [];

    const subjects = await fetchSubjectsForProgram({
      programId: Number(exam.program_id),
      clientId,
    });

    let chapters = [];
    let topics = [];
    if (subjectId) {
      await ensureSubjectWithinProgram({
        subjectId,
        programId: Number(exam.program_id),
        clientId,
      });
      chapters = await fetchChaptersForSubject({ subjectId, clientId });
    }

    if (chapterIds.length > 0 && subjectId) {
      await ensureChaptersWithinSubject({ chapterIds, subjectId, clientId });
      topics = await fetchTopicsForChapters({ chapterIds, clientId });
    }

    res.json({
      program_id: Number(exam.program_id),
      section_id: Number(section.id),
      selected_subject_id: section.selected_subject_id ? Number(section.selected_subject_id) : null,
      subjects,
      chapters,
      topics,
    });
  } catch (err) {
    handleServiceError(res, err, 'Failed to load section syllabus options');
  }
};

export const configureExamSectionSyllabus = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const exam = await getExamByIdForAccess({ examId: req.params.id, user: req.user });
    ensureExamEditable(exam);

    const section = await getSectionByIdForAccess({
      examId: req.params.id,
      sectionId: req.params.sectionId,
      user: req.user,
    });

    if (!exam.program_id) {
      throw new AppError('Exam program is not configured', 400);
    }

    const subjectId = parseRequiredInt(req.body?.subject_id, 'subject_id');
    const chapterIds = parsePositiveIntArray(req.body?.chapter_ids, 'chapter_ids');
    const topicIds = parsePositiveIntArray(req.body?.topic_ids, 'topic_ids');
    const clientId = Number(exam.client_id);

    await ensureSubjectWithinProgram({
      subjectId,
      programId: Number(exam.program_id),
      clientId,
    });
    await ensureChaptersWithinSubject({ chapterIds, subjectId, clientId });
    await ensureTopicsWithinChapters({ topicIds, chapterIds, clientId });

    const tx = await getClient();
    try {
      await tx.query('BEGIN');
      await tx.query(
        `
          UPDATE exam_sections
          SET selected_subject_id = $1,
              completion_status = 'configured',
              syllabus_locked = FALSE
          WHERE id = $2
        `,
        [subjectId, section.id]
      );

      await tx.query(`DELETE FROM exam_section_chapters WHERE exam_section_id = $1`, [section.id]);
      await tx.query(`DELETE FROM exam_section_topics WHERE exam_section_id = $1`, [section.id]);
      await tx.query(`DELETE FROM exam_questions WHERE section_id = $1`, [section.id]);

      for (const chapterId of chapterIds) {
        await tx.query(
          `INSERT INTO exam_section_chapters (exam_section_id, chapter_id) VALUES ($1, $2)`,
          [section.id, chapterId]
        );
      }

      for (const topicId of topicIds) {
        await tx.query(
          `INSERT INTO exam_section_topics (exam_section_id, topic_id) VALUES ($1, $2)`,
          [section.id, topicId]
        );
      }

      await tx.query('COMMIT');
    } catch (error) {
      await tx.query('ROLLBACK');
      throw error;
    } finally {
      tx.release();
    }

    const sections = await fetchExamSectionsWithBlueprintData(Number(exam.id));
    const configuredSection = sections.find((item) => Number(item.id) === Number(section.id));
    res.json(configuredSection);
  } catch (err) {
    handleServiceError(res, err, 'Failed to configure exam section');
  }
};

export const previewExamSectionGeneration = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const exam = await getExamByIdForAccess({ examId: req.params.id, user: req.user });
    ensureExamEditable(exam);

    const section = await getSectionByIdForAccess({
      examId: req.params.id,
      sectionId: req.params.sectionId,
      user: req.user,
    });

    const { plan } = await resolveSectionGenerationPlan({ exam, section });
    res.json(plan);
  } catch (err) {
    handleServiceError(res, err, 'Failed to preview section generation');
  }
};

export const generateExamSectionQuestions = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const exam = await getExamByIdForAccess({ examId: req.params.id, user: req.user });
    ensureExamEditable(exam);

    const section = await getSectionByIdForAccess({
      examId: req.params.id,
      sectionId: req.params.sectionId,
      user: req.user,
    });

    const planOverride =
      req.body?.generation_plan && typeof req.body.generation_plan === 'object'
        ? req.body.generation_plan
        : null;

    const { selectedQuestions } = await resolveSectionGenerationPlan({
      exam,
      section,
      planOverride,
    });

    const tx = await getClient();
    try {
      await tx.query('BEGIN');
      await tx.query(`DELETE FROM exam_questions WHERE section_id = $1`, [section.id]);

      let orderIndex = 1;
      for (const question of selectedQuestions) {
        await tx.query(
          `
            INSERT INTO exam_questions
              (section_id, question_id, order_index, question_group_type, generated_from_topic_selection)
            VALUES
              ($1, $2, $3, $4, TRUE)
          `,
          [section.id, question.id, orderIndex, question.question_group_type]
        );
        orderIndex += 1;
      }

      await tx.query(
        `
          UPDATE exam_sections
          SET completion_status = 'completed',
              syllabus_locked = TRUE
          WHERE id = $1
        `,
        [section.id]
      );

      await tx.query('COMMIT');
    } catch (error) {
      await tx.query('ROLLBACK');
      throw error;
    } finally {
      tx.release();
    }

    const sections = await fetchExamSectionsWithBlueprintData(Number(exam.id));
    const generatedSection = sections.find((item) => Number(item.id) === Number(section.id));
    res.json(generatedSection);
  } catch (err) {
    handleServiceError(res, err, 'Failed to generate exam section questions');
  }
};

export const getExamPreview = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const exam = await getExamByIdForAccess({ examId: req.params.id, user: req.user });
    const payload = await buildExamPreviewPayload(exam);
    res.json(payload);
  } catch (err) {
    handleServiceError(res, err, 'Failed to load exam preview');
  }
};

export const downloadExamPreviewDocx = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const exam = await getExamByIdForAccess({ examId: req.params.id, user: req.user });
    const payload = await buildExamPreviewPayload(exam);
    if (!payload?.validation?.can_finalize) {
      throw new AppError(
        payload?.validation?.blocking_reasons?.[0] || 'Exam cannot be exported until template validation passes.',
        400
      );
    }
    const fileBuffer = await buildExamDocxBuffer(payload);
    const datePart = new Date().toISOString().slice(0, 10);
    const safeTitle = sanitizeFilenamePart(payload?.exam?.title);
    const filename = `${safeTitle}_${datePart}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(fileBuffer);
  } catch (err) {
    handleServiceError(res, err, 'Failed to download exam preview docx');
  }
};

export const finalizeExamBlueprint = async (req, res) => {
  try {
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const exam = await getExamByIdForAccess({ examId: req.params.id, user: req.user });
    ensureExamEditable(exam);

    const preview = await buildExamPreviewPayload(exam);
    if (!preview.validation?.can_finalize) {
      throw new AppError(
        preview?.validation?.blocking_reasons?.[0] || 'Exam cannot be finalized until template validation passes.',
        400
      );
    }
    if (!preview.all_sections_completed) {
      throw new AppError('All blueprint sections must be completed before finalizing the exam', 400);
    }

    const nextStatus = req.body?.status ? requireString(req.body.status, 'status') : exam.status;
    ensureValidStatus(nextStatus);

    const result = await dbQuery(
      `
        UPDATE exams
        SET status = $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `,
      [nextStatus, exam.id]
    );

    const payload = await buildExamPreviewPayload(result.rows[0]);
    res.json(payload);
  } catch (err) {
    handleServiceError(res, err, 'Failed to finalize exam');
  }
};

