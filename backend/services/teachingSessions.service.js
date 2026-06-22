import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import { parseStringPromise } from 'xml2js';
import supabase from '../config/supabaseClient.js';
import { getClient } from '../repositories/db.repository.js';
import { AppError, handleServiceError } from '../utils/errors.js';
import * as repo from '../repositories/teachingSessions.repository.js';
import {
  parseDateString,
  parseEnum,
  parseJsonArrayField,
  parseOptionalBoolean,
  parseOptionalInt,
  parseOptionalString,
  parseRequiredInt,
  parseRequiredString,
} from '../schemas/teachingSessions.schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const trackerStorageBucket = process.env.TEACHING_SESSION_TRACKER_BUCKET || 'teacher-session-tracker';
const fallbackStorageBucket = process.env.SUPABASE_BUCKET || null;
const trackerStoragePublicBaseUrl = parseOptionalString(
  process.env.TEACHING_SESSION_TRACKER_PUBLIC_BASE_URL
);

const safeFilename = (name) => String(name || 'upload').replace(/[^a-zA-Z0-9._-]+/g, '_');

const normalizeText = (value) => parseOptionalString(value)?.replace(/\s+/g, ' ') ?? null;
const PLATFORM_TRACKER_ROLES = new Set(['super_admin', 'content_authorizer']);

const normalizeKey = ({ programId, gradeLabel, subjectLabel, chapterLabel, sessionNo }) =>
  [programId, normalizeText(gradeLabel)?.toLowerCase(), normalizeText(subjectLabel)?.toLowerCase(), normalizeText(chapterLabel)?.toLowerCase(), sessionNo]
    .filter((part) => part !== null && part !== undefined && part !== '')
    .join('|');

const buildTrackerStorageObjectKey = (filename) => `teacher-session-tracker/${filename}`;

const resolveTrackerStorageBuckets = () =>
  [trackerStorageBucket, fallbackStorageBucket].filter(
    (bucket, index, buckets) => bucket && buckets.indexOf(bucket) === index
  );

const buildTrackerStoragePublicUrl = (bucket, objectKey) => {
  if (trackerStoragePublicBaseUrl) {
    return `${trackerStoragePublicBaseUrl.replace(/\/$/, '')}/${objectKey.replace(/^\/+/, '')}`;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectKey);
  return data?.publicUrl ?? null;
};

const saveUploadedFile = async (file, prefix) => {
  const stamped = `${Date.now()}_${safeFilename(file.originalname)}`;
  const filename = `${prefix}_${stamped}`;
  const objectKey = buildTrackerStorageObjectKey(filename);

  let lastError = null;
  for (const bucket of resolveTrackerStorageBuckets()) {
    const { error } = await supabase.storage.from(bucket).upload(objectKey, file.buffer, {
      contentType: file.mimetype || 'application/octet-stream',
      upsert: false,
    });

    if (error) {
      lastError = error;
      if (!String(error.message || '').toLowerCase().includes('bucket not found')) {
        throw new AppError(`Failed to upload file to storage: ${error.message}`, 500);
      }
      continue;
    }

    const publicUrl = buildTrackerStoragePublicUrl(bucket, objectKey);
    if (!publicUrl) {
      throw new AppError('Failed to resolve storage URL for uploaded file', 500);
    }

    return publicUrl;
  }

  if (lastError) {
    throw new AppError(`Failed to upload file to storage: ${lastError.message}`, 500);
  }

  throw new AppError('Failed to upload file to storage: No storage bucket configured', 500);
};

const columnIndexToName = (index) => {
  let dividend = index;
  let columnName = '';
  while (dividend > 0) {
    let modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }
  return columnName;
};

const getCellText = (cell, sharedStrings) => {
  if (!cell) return '';
  if (cell.$?.t === 's') {
    const index = Number(cell.v?.[0] ?? -1);
    return sharedStrings[index] ?? '';
  }
  if (cell.is?.[0]?.t?.[0]) return String(cell.is[0].t[0]);
  if (typeof cell.v?.[0] !== 'undefined') return String(cell.v[0]);
  return '';
};

const parseSharedStringNode = (node) => {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(parseSharedStringNode).join('');
  if (typeof node === 'object') {
    if (node.t) return parseSharedStringNode(node.t);
    if (node.r) return parseSharedStringNode(node.r);
    return Object.values(node).map(parseSharedStringNode).join('');
  }
  return '';
};

const parseWorkbookRows = async (buffer) => {
  const zip = new AdmZip(buffer);
  const sharedStringsEntry = zip.getEntry('xl/sharedStrings.xml');
  const sheetEntry = zip.getEntry('xl/worksheets/sheet1.xml');
  if (!sheetEntry) {
    throw new AppError('Unable to locate sheet1.xml in the uploaded workbook', 400);
  }

  const sharedStrings = [];
  if (sharedStringsEntry) {
    const sharedXml = await parseStringPromise(sharedStringsEntry.getData().toString('utf8'));
    const items = sharedXml?.sst?.si ?? [];
    for (const item of items) {
      sharedStrings.push(parseSharedStringNode(item));
    }
  }

  const sheetXml = await parseStringPromise(sheetEntry.getData().toString('utf8'));
  const rows = sheetXml?.worksheet?.sheetData?.[0]?.row ?? [];

  return rows.map((row) => {
    const rowNumber = Number(row.$?.r ?? 0);
    const cells = row.c ?? [];
    const rowMap = new Map();

    for (const cell of cells) {
      const ref = String(cell.$?.r ?? '');
      const columnName = ref.replace(/\d+/g, '');
      rowMap.set(columnName, getCellText(cell, sharedStrings));
    }

    return { rowNumber, rowMap };
  });
};

const normalizePlannerHeader = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const getPlannerValue = (record, aliases) => {
  for (const alias of aliases) {
    const key = normalizePlannerHeader(alias);
    if (record[key] !== undefined && record[key] !== null && String(record[key]).trim() !== '') {
      return record[key];
    }
  }
  return null;
};

const getWorkbookValue = (rowMap, headerMap, fixedColumn, aliases = []) => {
  for (const alias of aliases) {
    const normalizedAlias = normalizePlannerHeader(alias);
    for (const [columnName, headerName] of headerMap.entries()) {
      if (headerName === normalizedAlias) {
        const value = rowMap.get(columnName);
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          return value;
        }
      }
    }
  }

  if (!fixedColumn) return null;
  const fallbackValue = rowMap.get(fixedColumn);
  return fallbackValue !== undefined && fallbackValue !== null && String(fallbackValue).trim() !== ''
    ? fallbackValue
    : null;
};

const normalizeWorkbookDateValue = (value) => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d+(\.\d+)?$/.test(raw)) {
    const excelSerial = Number(raw);
    if (!Number.isNaN(excelSerial) && excelSerial > 0) {
      const utcDate = new Date(Date.UTC(1899, 11, 30));
      utcDate.setUTCDate(utcDate.getUTCDate() + Math.floor(excelSerial));
      return utcDate.toISOString().slice(0, 10);
    }
  }

  return raw;
};

const parseMicroScheduleFile = async (buffer, programId) => {
  const rows = await parseWorkbookRows(buffer);
  const headerMap = new Map(
    Array.from((rows[0]?.rowMap ?? new Map()).entries()).map(([columnName, value]) => [
      columnName,
      normalizePlannerHeader(value),
    ])
  );
  const parsedRows = [];

  for (const row of rows) {
      const { rowNumber, rowMap } = row;

      const sessionLabel = normalizeText(
        getWorkbookValue(rowMap, headerMap, 'D', ['session label', 'session', 'session_name'])
      );
      const gradeLabel = normalizeText(
        getWorkbookValue(rowMap, headerMap, 'B', ['grade', 'grade label'])
      );
      const subjectLabel = normalizeText(
        getWorkbookValue(rowMap, headerMap, 'C', ['subject', 'subject label'])
      );
      const chapterLabel = normalizeText(
        getWorkbookValue(rowMap, headerMap, 'E', ['chapter', 'chapter label'])
      );

      if (!sessionLabel || !/^session[-\s]?\d+/i.test(sessionLabel)) {
        continue;
      }

    const sessionNoMatch = sessionLabel.match(/(\d+)/);
    const sessionNo = sessionNoMatch ? Number(sessionNoMatch[1]) : null;
    if (!sessionNo) continue;

      const plannedDate = parseDateString(
        normalizeWorkbookDateValue(
          getWorkbookValue(rowMap, headerMap, 'H', ['planned date', 'date', 'session date', 'planned_date'])
        ),
        `planned_date (row ${rowNumber})`,
        { required: true }
      );

      const payload = {
        rowNo: rowNumber,
        serialNo: parseOptionalInt(
          getWorkbookValue(rowMap, headerMap, 'A', ['serial no', 'serial number', 's.no', 's no']),
          'serial_no'
        ),
        gradeLabel: gradeLabel ?? 'UNKNOWN',
        subjectLabel: subjectLabel ?? 'UNKNOWN',
        sessionLabel,
        sessionNo,
        chapterLabel: chapterLabel ?? 'UNKNOWN',
        learningGoal: normalizeText(
          getWorkbookValue(rowMap, headerMap, 'F', ['learning goal', 'learning outcome', 'learning_goal'])
        ),
        topicLabel: normalizeText(
          getWorkbookValue(rowMap, headerMap, 'G', ['topic', 'topic label', 'topic_label'])
        ),
        plannedDate,
        rawRowJson: {
          columns: Object.fromEntries(Array.from(rowMap.entries())),
        },
      };

    payload.normalizedKey = normalizeKey({
      programId,
      gradeLabel: payload.gradeLabel,
      subjectLabel: payload.subjectLabel,
      chapterLabel: payload.chapterLabel,
      sessionNo: payload.sessionNo,
    });
    parsedRows.push(payload);
  }

  if (parsedRows.length === 0) {
    throw new AppError('No valid micro schedule rows found in uploaded file', 400);
  }

  return parsedRows;
};

const parseLessonPlannerFile = async (buffer, programId) => {
  const workbookRows = await parseWorkbookRows(buffer);
  if (workbookRows.length < 2) {
    throw new AppError('Lesson planner workbook must contain a header row and at least one data row', 400);
  }

  const headerEntries = Array.from(workbookRows[0].rowMap.entries())
    .filter(([, value]) => normalizeText(value))
    .sort(([a], [b]) => a.localeCompare(b));
  const headerMap = new Map(headerEntries.map(([column, value]) => [column, normalizePlannerHeader(value)]));
  const sessions = [];

  for (const row of workbookRows.slice(1)) {
    const record = {};
    for (const [column, header] of headerMap.entries()) {
      if (!header) continue;
      record[header] = row.rowMap.get(column) ?? '';
    }

    const sessionLabelValue = getPlannerValue(record, ['session_label', 'session', 'session_number']);
    const sessionNoValue = getPlannerValue(record, ['session_no', 'session_number']) ?? sessionLabelValue;
    const sessionNo = parseOptionalInt(String(sessionNoValue ?? '').match(/(\d+)/)?.[1], 'session_no');
    if (!sessionNo) continue;

    const objectivesRaw = getPlannerValue(record, ['learning_objectives', 'learning_objective', 'objectives']);
    const rawSourceJson = {};
    for (const [key, value] of Object.entries(record)) {
      rawSourceJson[key] = value;
    }

    const partRaw = normalizeText(getPlannerValue(record, ['part_type', 'part', 'session_type'])) ?? 'teaching';
    const learningObjectives = String(objectivesRaw ?? '')
      .split(/\n|•/g)
      .map((entry) => normalizeText(entry))
      .filter(Boolean);
    const session = {
      sessionNo,
      sessionLabel: normalizeText(sessionLabelValue) ?? `SESSION-${sessionNo}`,
      partType: /board/.test(partRaw) ? 'board_exam' : 'teaching',
      durationMinutes: parseOptionalInt(getPlannerValue(record, ['duration_minutes', 'duration', 'minutes']), 'duration_minutes'),
      title: normalizeText(getPlannerValue(record, ['title', 'planner_title', 'session_title', 'topic_title'])) ?? `Session ${sessionNo}`,
      chapterLabel: normalizeText(getPlannerValue(record, ['chapter_label', 'chapter', 'chapter_unit', 'unit'])),
      topicLabel: normalizeText(getPlannerValue(record, ['topic_label', 'topic'])),
      learningObjectives,
      materialsNeeded: normalizeText(getPlannerValue(record, ['materials_needed', 'materials'])),
      worksheetQuestionsCovered: normalizeText(getPlannerValue(record, ['worksheet_questions_covered', 'worksheet_questions'])),
      shortcutsIntroduced: normalizeText(getPlannerValue(record, ['shortcuts_introduced', 'shortcuts'])),
      commonErrorsAddressed: normalizeText(getPlannerValue(record, ['common_errors_addressed', 'common_errors'])),
      homework: normalizeText(getPlannerValue(record, ['homework'])),
      nextSessionPreview: normalizeText(getPlannerValue(record, ['next_session_preview', 'preview'])),
      pedagogyNote: normalizeText(getPlannerValue(record, ['pedagogy_note', 'pedagogy_notes'])),
      minutePlanJson: [],
      teacherScriptText: normalizeText(getPlannerValue(record, ['teacher_script_text', 'teacher_script', 'script'])),
      rawSourceJson,
    };
    session.normalizedKey = normalizeKey({
      programId,
      gradeLabel: null,
      subjectLabel: null,
      chapterLabel: session.chapterLabel,
      sessionNo: session.sessionNo,
    });
    sessions.push(session);
  }

  if (sessions.length === 0) {
    throw new AppError('No planner sessions could be extracted from the uploaded file', 400);
  }

  return sessions;
};

const extractLessonPlannerDocxText = (buffer) => {
  const zip = new AdmZip(buffer);
  const documentEntry = zip.getEntry('word/document.xml');
  if (!documentEntry) {
    throw new AppError('Unable to locate document.xml in the uploaded Word file', 400);
  }

  let content = documentEntry.getData().toString('utf8');
  content = content.replace(/<w:tab[^>]*\/>/g, ' ');
  content = content.replace(/<\/w:p>/g, '\n');
  content = content.replace(/<[^>]+>/g, '');
  content = content
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
};

const splitPlannerLines = (rawText) =>
  String(rawText || '')
    .split('\n')
    .map((line) => normalizeText(line))
    .filter(Boolean);

const findLineIndex = (lines, matcher) =>
  lines.findIndex((line) => {
    if (!line) return false;
    if (matcher instanceof RegExp) return matcher.test(line);
    return line.toLowerCase() === String(matcher).toLowerCase();
  });

const getLineAfter = (lines, matcher) => {
  const index = findLineIndex(lines, matcher);
  if (index < 0) return null;
  return normalizeText(lines[index + 1]);
};

const getSectionBlock = (rawText, heading, nextHeadings = []) => {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedNextHeadings = nextHeadings.map((entry) => entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const lookahead = escapedNextHeadings.length > 0 ? `(?=\\n(?:${escapedNextHeadings.join('|')})\\b|$)` : '(?=$)';
  const match = rawText.match(new RegExp(`${escapedHeading}\\s+([\\s\\S]*?)${lookahead}`, 'i'));
  return normalizeText(match?.[1]);
};

const extractSessionIdentity = (rawText, lines) => {
  const headingLine = lines.find((line) => /session\s*[-:]?\s*0*\d+/i.test(line)) ?? null;
  const headingMatch = rawText.match(/([^\n]*session\s*[-:]?\s*0*(\d+)[^\n]*)/i);
  const sessionNo = parseOptionalInt(headingMatch?.[2], 'session_no');
  if (!sessionNo) return null;

  const rawLabel =
    normalizeText(headingLine?.match(/session\s*[-:]?\s*0*\d+/i)?.[0]) ??
    `SESSION-${sessionNo}`;

  return {
    sessionNo,
    sessionLabel: rawLabel.replace(/session/i, 'SESSION').replace(/\s+/g, '-'),
    headingLine: normalizeText(headingLine ?? headingMatch?.[1]),
  };
};

const extractSingleSessionPlannerTitle = (lines, identity) => {
  const titledValue = getLineAfter(lines, /^title$/i);
  if (titledValue) return titledValue;

  const headingWithInlineTitle = identity?.headingLine?.match(/session\s*[-:]?\s*0*\d+\s*[-:|]\s*(.+)$/i)?.[1];
  if (headingWithInlineTitle) return normalizeText(headingWithInlineTitle);

  const topicValue = getLineAfter(lines, /^topic$/i);
  if (topicValue) return topicValue;

  return null;
};

const mergeUniqueStrings = (...collections) => {
  const values = [];

  for (const collection of collections) {
    for (const entry of collection ?? []) {
      const normalized = normalizeText(entry);
      if (!normalized || values.includes(normalized)) continue;
      values.push(normalized);
    }
  }

  return values;
};

const pickRicherValue = (currentValue, nextValue) => {
  const currentNormalized = normalizeText(currentValue);
  const nextNormalized = normalizeText(nextValue);

  if (!currentNormalized) return nextNormalized;
  if (!nextNormalized) return currentNormalized;
  return nextNormalized.length > currentNormalized.length ? nextNormalized : currentNormalized;
};

const mergePlannerSessionRecords = (currentSession, nextSession) => {
  const mergedSourceBlocks = [];

  for (const block of [currentSession.rawSourceJson?.block, nextSession.rawSourceJson?.block]) {
    const normalized = normalizeText(block);
    if (!normalized || mergedSourceBlocks.includes(normalized)) continue;
    mergedSourceBlocks.push(normalized);
  }

  return {
    ...currentSession,
    sessionLabel: pickRicherValue(currentSession.sessionLabel, nextSession.sessionLabel) ?? currentSession.sessionLabel,
    title: pickRicherValue(currentSession.title, nextSession.title) ?? currentSession.title,
    chapterLabel: pickRicherValue(currentSession.chapterLabel, nextSession.chapterLabel),
    topicLabel: pickRicherValue(currentSession.topicLabel, nextSession.topicLabel),
    learningObjectives: mergeUniqueStrings(currentSession.learningObjectives, nextSession.learningObjectives),
    materialsNeeded: pickRicherValue(currentSession.materialsNeeded, nextSession.materialsNeeded),
    worksheetQuestionsCovered: pickRicherValue(currentSession.worksheetQuestionsCovered, nextSession.worksheetQuestionsCovered),
    shortcutsIntroduced: pickRicherValue(currentSession.shortcutsIntroduced, nextSession.shortcutsIntroduced),
    commonErrorsAddressed: pickRicherValue(currentSession.commonErrorsAddressed, nextSession.commonErrorsAddressed),
    homework: pickRicherValue(currentSession.homework, nextSession.homework),
    nextSessionPreview: pickRicherValue(currentSession.nextSessionPreview, nextSession.nextSessionPreview),
    pedagogyNote: pickRicherValue(currentSession.pedagogyNote, nextSession.pedagogyNote),
    teacherScriptText: pickRicherValue(currentSession.teacherScriptText, nextSession.teacherScriptText),
    durationMinutes: currentSession.durationMinutes ?? nextSession.durationMinutes,
    rawSourceJson: {
      blocks: mergedSourceBlocks,
      merged_duplicate_blocks: mergedSourceBlocks.length > 1,
    },
  };
};

const dedupePlannerSessions = (sessions) => {
  const dedupedSessions = new Map();

  for (const session of sessions) {
    const key = `${session.sessionNo}|${session.partType}`;
    if (!dedupedSessions.has(key)) {
      dedupedSessions.set(key, session);
      continue;
    }

    dedupedSessions.set(key, mergePlannerSessionRecords(dedupedSessions.get(key), session));
  }

  return Array.from(dedupedSessions.values()).sort((left, right) => {
    if (left.sessionNo !== right.sessionNo) return left.sessionNo - right.sessionNo;
    return left.partType.localeCompare(right.partType);
  });
};

const parseLessonPlannerDocxLegacy = async (buffer, programId) => {
  const rawText = extractLessonPlannerDocxText(buffer);
  if (!rawText) {
    throw new AppError('Lesson planner document is empty or could not be parsed', 400);
  }

  const chapterLabel = normalizeText(rawText.match(/Chapter\s+(.+?)(?=\n|Target Level|Batch Type|Board Focus)/i)?.[1]);
  const topicLabel = normalizeText(rawText.match(/Topic\s+(.+?)(?=\n|Target Level|Batch Type|Board Focus)/i)?.[1]);
  const sessionRegex = /SESSION\s+(\d+)\s+[—-]\s+([^\n]+)([\s\S]*?)(?=\nSESSION\s+\d+\s+[—-]|\s*$)/gi;
  const sessions = [];
  let match;

  while ((match = sessionRegex.exec(rawText)) !== null) {
    const sessionNo = Number(match[1]);
    const title = normalizeText(match[2]) ?? `Session ${sessionNo}`;
    const block = match[3] ?? '';
    const objectivesRaw =
      block.match(/Learning Objectives\s+([\s\S]*?)(?=\n(?:Materials Needed|Questions Covered|Shortcut Introduced|Shortcuts Introduced|Homework|Next Session Preview|Pedagogy Note|Time \(min\)|Teacher Actions))/i)?.[1] ??
      '';

    const learningObjectives = objectivesRaw
      .split(/\r?\n|•|;|,/g)
      .map((entry) => normalizeText(entry))
      .filter(Boolean);

    const session = {
      sessionNo,
      sessionLabel: `SESSION-${sessionNo}`,
      partType: /BOARD EXAM SESSION/i.test(title) ? 'board_exam' : 'teaching',
      durationMinutes: parseOptionalInt(block.match(/Duration\s+(\d+)/i)?.[1], 'duration_minutes'),
      title,
      chapterLabel,
      topicLabel,
      learningObjectives,
      materialsNeeded: null,
      worksheetQuestionsCovered: normalizeText(block.match(/Questions Covered\s+([\s\S]*?)(?=\n(?:I Do \/ We Do \/ You Do|Shortcut Introduced|Shortcuts Introduced|Homework|Time \(min\)|Teacher Actions))/i)?.[1]),
      shortcutsIntroduced: normalizeText(block.match(/Shortcut Introduced\s+([\s\S]*?)(?=\n(?:Homework|Time \(min\)|Teacher Actions))/i)?.[1] ?? block.match(/Shortcuts Introduced\s+([\s\S]*?)(?=\n(?:Homework|Time \(min\)|Teacher Actions))/i)?.[1]),
      commonErrorsAddressed: null,
      homework: normalizeText(block.match(/Homework\s+([\s\S]*?)(?=\n(?:Time \(min\)|Teacher Actions|SESSION\s+\d+))/i)?.[1]),
      nextSessionPreview: normalizeText(block.match(/Next Session Preview\s+([\s\S]*?)(?=\n(?:Pedagogy Note|Time \(min\)|Teacher Actions))/i)?.[1]),
      pedagogyNote: normalizeText(block.match(/Pedagogy Note\s+([\s\S]*?)(?=\n(?:Time \(min\)|Teacher Actions))/i)?.[1]),
      minutePlanJson: [],
      teacherScriptText: normalizeText(block),
      rawSourceJson: { block: block.trim() },
    };
    session.normalizedKey = normalizeKey({
      programId,
      gradeLabel: null,
      subjectLabel: null,
      chapterLabel: session.chapterLabel,
      sessionNo: session.sessionNo,
    });
    sessions.push(session);
  }

  if (sessions.length === 0) {
    throw new AppError('No planner sessions could be extracted from the uploaded Word document', 400);
  }

  return dedupePlannerSessions(sessions);
};

const parseLessonPlannerDocx = async (buffer, programId) => {
  const rawText = extractLessonPlannerDocxText(buffer);
  if (!rawText) {
    throw new AppError('Lesson planner document is empty or could not be parsed', 400);
  }

  const lines = splitPlannerLines(rawText);
  const identity = extractSessionIdentity(rawText, lines);
  if (!identity?.sessionNo) {
    throw new AppError('Could not extract session number from the uploaded lesson planner.', 400);
  }

  const title = extractSingleSessionPlannerTitle(lines, identity);
  if (!title) {
    throw new AppError('Could not extract title from the uploaded lesson planner.', 400);
  }

  const durationMinutes = parseOptionalInt(rawText.match(/Duration\s*:?\s*(\d+)/i)?.[1], 'duration_minutes');
  const chapterLabel = getLineAfter(lines, /^chapter$/i);
  const topicLabel = getLineAfter(lines, /^topic$/i) ?? getLineAfter(lines, /^concept focus$/i);
  const inClassQuestions = getLineAfter(lines, /^in-class teach questions$/i);
  const homeworkQuestions = getLineAfter(lines, /^homework questions$/i);
  const materialsNeeded = getSectionBlock(rawText, 'Materials', [
    'Prerequisites and Bridge Concepts',
    'In-Class Teach Questions',
    'Homework Questions',
    'Common Errors to Diagnose',
    'Pedagogy Note',
    'Minute-by-Minute Coaching Plan',
    'Next Session Preview',
  ]);
  const commonErrorsAddressed = getSectionBlock(rawText, 'Common Errors to Diagnose', [
    'Pedagogy Note',
    'Minute-by-Minute Coaching Plan',
    'Next Session Preview',
  ]);
  const pedagogyNote = getSectionBlock(rawText, 'Pedagogy Note', [
    'Minute-by-Minute Coaching Plan',
    'Next Session Preview',
  ]);
  const nextSessionPreview = getSectionBlock(rawText, 'Next Session Preview');
  const objectivesBlock = getSectionBlock(rawText, 'Objectives and Skill Outcomes', [
    'Materials',
    'Prerequisites and Bridge Concepts',
    'In-Class Teach Questions',
    'Homework Questions',
    'Common Errors to Diagnose',
    'Pedagogy Note',
    'Minute-by-Minute Coaching Plan',
    'Next Session Preview',
  ]);
  const learningObjectives = String(objectivesBlock || '')
    .split(/\n|•|;|,/g)
    .map((entry) => normalizeText(entry))
    .filter(Boolean);
  const minutePlanBlock = getSectionBlock(rawText, 'Minute-by-Minute Coaching Plan', ['Next Session Preview']);

  const session = {
    sessionNo: identity.sessionNo,
    sessionLabel: identity.sessionLabel || `SESSION-${identity.sessionNo}`,
    partType: /board exam/i.test(identity.headingLine || '') ? 'board_exam' : 'teaching',
    durationMinutes,
    title,
    chapterLabel,
    topicLabel,
    learningObjectives,
    materialsNeeded,
    worksheetQuestionsCovered: inClassQuestions,
    shortcutsIntroduced: null,
    commonErrorsAddressed,
    homework: homeworkQuestions,
    nextSessionPreview,
    pedagogyNote,
    minutePlanJson: [],
    teacherScriptText: minutePlanBlock,
    rawSourceJson: {
      block: rawText,
      parser_mode: 'single_session_minimal',
      extracted_heading: identity.headingLine,
    },
  };
  session.normalizedKey = normalizeKey({
    programId,
    gradeLabel: null,
    subjectLabel: null,
    chapterLabel: session.chapterLabel,
    sessionNo: session.sessionNo,
  });

  return [session];
};

const buildTemplateIdentityKey = ({
  gradeLabel,
  subjectLabel,
  sessionNo,
  sessionLabel,
  partType,
}) =>
  [
    normalizeText(gradeLabel) ?? 'unknown',
    normalizeText(subjectLabel) ?? 'unknown',
    Number(sessionNo) || 0,
    normalizeText(sessionLabel) ?? 'unknown',
    normalizeText(partType) ?? 'unknown',
  ].join('|');

const buildTemplateIdentityKeyFromRequestItem = (item) =>
  buildTemplateIdentityKey({
    gradeLabel: item?.grade_label,
    subjectLabel: item?.subject_label,
    sessionNo: parseOptionalInt(item?.session_no, 'session_no'),
    sessionLabel: item?.session_label,
    partType: item?.part_type,
  });

const buildPlannerChecklist = ({ microUpload, microRows, plannerUploads, plannerSessions }) => {
  const plannerUploadsBySessionNo = new Map();
  for (const upload of plannerUploads) {
    const sessionNo = Number(upload.target_session_no);
    if (!sessionNo) continue;
    if (!plannerUploadsBySessionNo.has(sessionNo)) plannerUploadsBySessionNo.set(sessionNo, []);
    plannerUploadsBySessionNo.get(sessionNo).push(upload);
  }

  const plannerSessionsByUploadId = new Map();
  for (const plannerSession of plannerSessions) {
    const uploadId = Number(plannerSession.lesson_planner_upload_id);
    if (!plannerSessionsByUploadId.has(uploadId)) plannerSessionsByUploadId.set(uploadId, []);
    plannerSessionsByUploadId.get(uploadId).push(plannerSession);
  }

  const sessionRequirements = microRows.map((microRow) => {
    const sessionNo = Number(microRow.session_no);
    const uploadsForSession = plannerUploadsBySessionNo.get(sessionNo) ?? [];
    const latestUpload = uploadsForSession[0] ?? null;
    const uploadSessions = latestUpload ? (plannerSessionsByUploadId.get(Number(latestUpload.id)) ?? []) : [];
    const parsedSessionNos = Array.from(new Set(uploadSessions.map((entry) => Number(entry.session_no)).filter(Boolean)));
    const matchedSession = uploadSessions.find((entry) => Number(entry.session_no) === sessionNo) ?? null;

    let status = 'missing';
    let issue = null;
    if (uploadsForSession.length > 1) {
      status = 'duplicate_upload';
      issue = `Multiple planner uploads are linked to session ${sessionNo}.`;
    } else if (latestUpload && parsedSessionNos.length === 0) {
      status = 'parse_error';
      issue = 'Planner upload did not produce any parsed session.';
    } else if (latestUpload && parsedSessionNos.length > 1) {
      status = 'invalid_multi_session';
      issue = 'Planner upload must contain exactly one session.';
    } else if (latestUpload && parsedSessionNos.length === 1 && parsedSessionNos[0] !== sessionNo) {
      status = 'session_mismatch';
      issue = `Planner content parsed as SESSION-${parsedSessionNos[0]} instead of SESSION-${sessionNo}.`;
    } else if (latestUpload && matchedSession) {
      status = 'complete';
    }

    return {
      micro_schedule_row_id: microRow.id,
      session_no: sessionNo,
      session_label: microRow.session_label,
      chapter_label: microRow.chapter_label,
      learning_goal: microRow.learning_goal,
      topic_label: microRow.topic_label,
      planner_status: status,
      issue,
      lesson_planner_upload_id: latestUpload?.id ?? null,
      lesson_plan_file_name: latestUpload?.file_name ?? null,
      lesson_plan_file_storage_path: latestUpload?.file_storage_path ?? null,
      planner_session_id: matchedSession?.id ?? null,
      planner_title: matchedSession?.title ?? null,
      planner_part_type: matchedSession?.part_type ?? null,
      parsed_session_nos: parsedSessionNos,
      upload_count: uploadsForSession.length,
    };
  });

  const completeCount = sessionRequirements.filter((entry) => entry.planner_status === 'complete').length;

  return {
    micro_schedule_upload_id: microUpload.id,
    program_id: microUpload.program_id,
    grade_id: microUpload.grade_id,
    subject_id: microUpload.subject_id,
    total_required_sessions: sessionRequirements.length,
    completed_sessions: completeCount,
    missing_sessions: sessionRequirements.filter((entry) => entry.planner_status !== 'complete').map((entry) => entry.session_no),
    is_publish_ready: sessionRequirements.length > 0 && completeCount === sessionRequirements.length,
    sessions: sessionRequirements,
  };
};

const buildTemplateRecords = ({ programId, templateVersionNo, microRows, plannerSessions, existingTemplates = [] }) => {
  const plannerBySessionNo = new Map();
  for (const session of plannerSessions) {
    if (!plannerBySessionNo.has(session.session_no)) plannerBySessionNo.set(session.session_no, []);
    plannerBySessionNo.get(session.session_no).push(session);
  }

  const existingPublishedByKey = new Map();
  for (const template of existingTemplates) {
    if (!template?.is_published) continue;
    const key = buildTemplateIdentityKey({
      gradeLabel: template.grade_label,
      subjectLabel: template.subject_label,
      sessionNo: template.session_no,
      sessionLabel: template.session_label,
      partType: template.part_type,
    });
    if (!existingPublishedByKey.has(key)) {
      existingPublishedByKey.set(key, template);
    }
  }

  const getPublishState = (record) => {
    const existing = existingPublishedByKey.get(
      buildTemplateIdentityKey({
        gradeLabel: record.gradeLabel,
        subjectLabel: record.subjectLabel,
        sessionNo: record.sessionNo,
        sessionLabel: record.sessionLabel,
        partType: record.partType,
      })
    );

    return {
      isPublished: Boolean(existing?.is_published),
      publishedByUserId: existing?.published_by_user_id ?? null,
      publishedAt: existing?.published_at ?? null,
    };
  };

  const usedPlannerIds = new Set();
  const records = [];

  for (const microRow of microRows) {
    const matches = plannerBySessionNo.get(microRow.session_no) ?? [];

    if (matches.length === 1) {
      const planner = matches[0];
      usedPlannerIds.add(planner.id);
      const publishState = getPublishState({
        gradeLabel: microRow.grade_label,
        subjectLabel: microRow.subject_label,
        sessionNo: microRow.session_no,
        sessionLabel: microRow.session_label,
        partType: planner.part_type,
      });
      records.push({
        programId,
        templateVersionNo,
        gradeLabel: microRow.grade_label,
        subjectLabel: microRow.subject_label,
        sessionNo: microRow.session_no,
        sessionLabel: microRow.session_label,
        chapterLabel: microRow.chapter_label ?? planner.chapter_label,
        learningGoal: microRow.learning_goal,
        topicLabel: microRow.topic_label ?? planner.topic_label,
        plannerTitle: planner.title,
        partType: planner.part_type,
        durationMinutes: planner.duration_minutes,
        learningObjectives: planner.learning_objectives ?? [],
        materialsNeeded: planner.materials_needed,
        worksheetQuestionsCovered: planner.worksheet_questions_covered,
        shortcutsIntroduced: planner.shortcuts_introduced,
        commonErrorsAddressed: planner.common_errors_addressed,
        homework: planner.homework,
        nextSessionPreview: planner.next_session_preview,
        pedagogyNote: planner.pedagogy_note,
        minutePlanJson: planner.minute_plan_json ?? [],
        teacherScriptText: planner.teacher_script_text,
        microScheduleRowId: microRow.id,
        lessonPlannerSessionId: planner.id,
        mappingStatus: 'matched',
        issueDetails: {},
        isPublished: publishState.isPublished,
        publishedByUserId: publishState.publishedByUserId,
        publishedAt: publishState.publishedAt,
      });
      continue;
    }

    const publishState = getPublishState({
      gradeLabel: microRow.grade_label,
      subjectLabel: microRow.subject_label,
      sessionNo: microRow.session_no,
      sessionLabel: microRow.session_label,
      partType: 'teaching',
    });
    records.push({
      programId,
      templateVersionNo,
      gradeLabel: microRow.grade_label,
      subjectLabel: microRow.subject_label,
      sessionNo: microRow.session_no,
      sessionLabel: microRow.session_label,
      chapterLabel: microRow.chapter_label,
      learningGoal: microRow.learning_goal,
      topicLabel: microRow.topic_label,
      plannerTitle: null,
      partType: 'teaching',
      durationMinutes: null,
      learningObjectives: [],
      materialsNeeded: null,
      worksheetQuestionsCovered: null,
      shortcutsIntroduced: null,
      commonErrorsAddressed: null,
      homework: null,
      nextSessionPreview: null,
      pedagogyNote: null,
      minutePlanJson: [],
      teacherScriptText: null,
      microScheduleRowId: microRow.id,
      lessonPlannerSessionId: null,
      mappingStatus: matches.length === 0 ? 'unmatched_micro' : 'conflict',
      issueDetails: {
        reason: matches.length === 0 ? 'No planner session found for micro schedule row' : 'Multiple planner sessions found for micro schedule row',
        plannerSessionIds: matches.map((entry) => entry.id),
        plannerUploadIds: matches.map((entry) => entry.lesson_planner_upload_id).filter(Boolean),
      },
      isPublished: publishState.isPublished,
      publishedByUserId: publishState.publishedByUserId,
      publishedAt: publishState.publishedAt,
    });
  }

  for (const planner of plannerSessions) {
    if (usedPlannerIds.has(planner.id)) continue;
    const publishState = getPublishState({
      gradeLabel: 'UNKNOWN',
      subjectLabel: 'UNKNOWN',
      sessionNo: planner.session_no,
      sessionLabel: planner.session_label,
      partType: planner.part_type,
    });
    records.push({
      programId,
      templateVersionNo,
      gradeLabel: 'UNKNOWN',
      subjectLabel: 'UNKNOWN',
      sessionNo: planner.session_no,
      sessionLabel: planner.session_label,
      chapterLabel: planner.chapter_label,
      learningGoal: null,
      topicLabel: planner.topic_label,
      plannerTitle: planner.title,
      partType: planner.part_type,
      durationMinutes: planner.duration_minutes,
      learningObjectives: planner.learning_objectives ?? [],
      materialsNeeded: planner.materials_needed,
      worksheetQuestionsCovered: planner.worksheet_questions_covered,
      shortcutsIntroduced: planner.shortcuts_introduced,
      commonErrorsAddressed: planner.common_errors_addressed,
      homework: planner.homework,
      nextSessionPreview: planner.next_session_preview,
      pedagogyNote: planner.pedagogy_note,
      minutePlanJson: planner.minute_plan_json ?? [],
      teacherScriptText: planner.teacher_script_text,
      microScheduleRowId: null,
      lessonPlannerSessionId: planner.id,
      mappingStatus: 'unmatched_planner',
      issueDetails: {
        reason: 'Planner session has no matching micro schedule row',
        plannerUploadId: planner.lesson_planner_upload_id ?? null,
      },
      isPublished: publishState.isPublished,
      publishedByUserId: publishState.publishedByUserId,
      publishedAt: publishState.publishedAt,
    });
  }

  return records;
};

const resolveClientIdForAdmin = (req, requestedClientId = null) => {
  if (req.user?.role === 'super_admin') {
    return requestedClientId ? parseRequiredInt(requestedClientId, 'client_id') : null;
  }
  if (!req.user?.client_id) {
    throw new AppError('client_id is required', 400);
  }
  if (requestedClientId && Number(requestedClientId) !== Number(req.user.client_id)) {
    throw new AppError('Access denied', 403);
  }
  return Number(req.user.client_id);
};

const ensureTrackerFeatureEnabled = async (clientId) => {
  const feature = await repo.fetchClientFeatureEntitlement({
    clientId,
    featureKey: 'teacher_session_tracker',
  });
  if (!feature.rows[0]) {
    throw new AppError('Teacher session tracker is not enabled for this client', 403);
  }
};

const ensureProgramEntitled = async (clientId, programId) => {
  const programEntitlement = await repo.fetchClientProgramEntitlement({ clientId, programId });
  if (!programEntitlement.rows[0]) {
    throw new AppError('Client does not have access to this program', 403);
  }
};

const ensureGradeBelongsToProgram = async (programId, gradeId) => {
  const gradeResult = await repo.fetchTrackerGradeContext(gradeId);
  const grade = gradeResult.rows[0];
  if (!grade) {
    throw new AppError('Grade not found', 404);
  }
  if (Number(grade.program_id) !== Number(programId)) {
    throw new AppError('Selected grade does not belong to the selected program', 400);
  }
  return grade;
};

const ensureSubjectBelongsToScope = async ({ programId, gradeId, subjectId }) => {
  const subjectResult = await repo.fetchTrackerSubjectContext(subjectId);
  const subject = subjectResult.rows[0];
  if (!subject) {
    throw new AppError('Subject not found', 404);
  }
  if (Number(subject.program_id) !== Number(programId)) {
    throw new AppError('Selected subject does not belong to the selected program', 400);
  }
  if (Number(subject.grade_id) !== Number(gradeId)) {
    throw new AppError('Selected subject does not belong to the selected grade', 400);
  }
  return subject;
};

const normalizeStoredDateValue = (value) => {
  if (value === undefined || value === null || value === '') return value;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return value;
    return value.toISOString().slice(0, 10);
  }

  const next = String(value).trim();
  if (!next) return null;

  const isoTimestampMatch = next.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (isoTimestampMatch) return isoTimestampMatch[1];

  const parsed = new Date(next);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return next;
};

const computeLiveStatus = ({ statusSubmitted, plannedDate, completionPercentage }) => {
  if (statusSubmitted === 'completed') return 'completed';
  if (statusSubmitted === 'partially_completed') return 'partially_completed';
  if (statusSubmitted === 'not_completed') {
    const today = new Date().toISOString().slice(0, 10);
    if (plannedDate && plannedDate < today) return 'lagging';
    return 'not_completed';
  }
  if (completionPercentage === 100) return 'completed';
  return 'not_started';
};

const getCurrentDateInIndia = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
  }).format(new Date());

const addDaysToDateString = (dateString, days) => {
  if (!dateString) return null;
  const [year, month, day] = String(dateString).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return utcDate.toISOString().slice(0, 10);
};

const decorateSessionExpiry = (session) => {
  if (!session) return session;
  const plannedDate = session.planned_date ? String(session.planned_date).slice(0, 10) : null;
  const expiryDate = addDaysToDateString(plannedDate, 2);
  const currentDate = getCurrentDateInIndia();
  const isExpired = Boolean(expiryDate && currentDate > expiryDate);
  return {
    ...session,
    planned_date: plannedDate ?? session.planned_date,
    expiry_date: expiryDate,
    is_expired: isExpired,
  };
};

const resolveStoredUploadAbsolutePath = (storedPath) => {
  const normalized = parseOptionalString(storedPath);
  if (!normalized) return null;
  const relativePath = normalized.replace(/^\/+/, '').replace(/\//g, path.sep);
  return path.join(__dirname, '../../', relativePath);
};

const lessonPlanDownloadContentType =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const buildDownloadFilename = (filename, fallback = 'lesson-plan.docx') =>
  safeFilename(filename || fallback).replace(/^_+/, '') || fallback;

const streamStoredLessonPlanDownload = async (res, storedPath, fileName) => {
  const normalized = parseOptionalString(storedPath);
  if (!normalized) {
    throw new AppError('Lesson plan file not found', 404);
  }

  const downloadName = buildDownloadFilename(fileName);
  res.setHeader('Content-Type', lessonPlanDownloadContentType);
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);

  if (/^https?:\/\//i.test(normalized)) {
    const upstreamResponse = await fetch(normalized);
    if (!upstreamResponse.ok) {
      throw new AppError('Lesson plan file not found', upstreamResponse.status === 404 ? 404 : 502);
    }

    const arrayBuffer = await upstreamResponse.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  }

  const absolutePath = resolveStoredUploadAbsolutePath(normalized);
  if (!absolutePath) {
    throw new AppError('Lesson plan file not found', 404);
  }

  try {
    const fileBuffer = await fs.readFile(absolutePath);
    return res.send(fileBuffer);
  } catch {
    throw new AppError('Lesson plan file not found', 404);
  }
};

const sanitizeLessonPlanLink = async (session) => {
  if (!session?.lesson_plan_file_storage_path) {
    return session;
  }

  if (/^https?:\/\//i.test(String(session.lesson_plan_file_storage_path))) {
    return session;
  }

  const absolutePath = resolveStoredUploadAbsolutePath(session.lesson_plan_file_storage_path);
  if (!absolutePath) {
    return {
      ...session,
      lesson_plan_file_name: null,
      lesson_plan_file_storage_path: null,
    };
  }

  try {
    await fs.access(absolutePath);
    return session;
  } catch {
    return {
      ...session,
      lesson_plan_file_name: null,
      lesson_plan_file_storage_path: null,
    };
  }
};

const parseCompletionPercentage = (value) => {
  if (value === undefined || value === null || value === '') {
    throw new AppError('completion_percentage is required', 400);
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
    throw new AppError('completion_percentage must be an integer between 0 and 100', 400);
  }
  return parsed;
};

export const uploadMicroSchedule = async (req, res) => {
  try {
    if (!req.file) {
      throw new AppError('file is required', 400);
    }

    const programId = parseRequiredInt(req.body?.program_id, 'program_id');
    const gradeId = parseRequiredInt(req.body?.grade_id, 'grade_id');
    const subjectId = parseRequiredInt(req.body?.subject_id, 'subject_id');
    const versionNo = parseOptionalInt(req.body?.version_no, 'version_no') ?? 1;
    const notes = parseOptionalString(req.body?.notes);
    await ensureGradeBelongsToProgram(programId, gradeId);
    await ensureSubjectBelongsToScope({ programId, gradeId, subjectId });
    const fileStoragePath = await saveUploadedFile(req.file, 'micro_schedule');
    const rows = await parseMicroScheduleFile(req.file.buffer, programId);

    const client = await getClient();
    try {
      await client.query('BEGIN');
      const uploadResult = await repo.insertMicroScheduleUpload(client, {
        programId,
        gradeId,
        subjectId,
        uploadedByUserId: req.user.id,
        fileName: req.file.originalname,
        fileStoragePath,
        versionNo,
        status: 'processed',
        notes,
      });
      const upload = uploadResult.rows[0];

      for (const row of rows) {
        await repo.insertMicroScheduleRow(client, {
          microScheduleUploadId: upload.id,
          programId,
          ...row,
        });
      }

      await client.query('COMMIT');
      return res.status(201).json({
        upload,
        row_count: rows.length,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (err) {
    return handleServiceError(res, err, 'Failed to upload micro schedule');
  }
};

export const listTrackerProgramOptions = async (req, res) => {
  try {
    const role = req.user?.role;
    let result;

    if (PLATFORM_TRACKER_ROLES.has(role)) {
      const requestedClientId = parseOptionalInt(req.query?.client_id, 'client_id');
      result = requestedClientId
        ? await repo.listTrackerProgramsForClient(requestedClientId)
        : await repo.listTrackerProgramsForPlatform();
    } else {
      const clientId = parseRequiredInt(req.user?.client_id, 'client_id');
      result = await repo.listTrackerProgramsForClient(clientId);
    }

    res.json(result.rows);
  } catch (error) {
    handleServiceError(res, error, 'Failed to load tracker program options');
  }
};

export const listTrackerGradeOptions = async (req, res) => {
  try {
    const role = req.user?.role;
    const programId = parseRequiredInt(req.params?.programId, 'programId');
    let result;

    if (PLATFORM_TRACKER_ROLES.has(role)) {
      const requestedClientId = parseOptionalInt(req.query?.client_id, 'client_id');
      result = requestedClientId
        ? await repo.listTrackerGradesForClient(requestedClientId, programId)
        : await repo.listTrackerGradesForPlatform(programId);
    } else {
      const clientId = parseRequiredInt(req.user?.client_id, 'client_id');
      result = await repo.listTrackerGradesForClient(clientId, programId);
    }

    res.json(result.rows);
  } catch (error) {
    handleServiceError(res, error, 'Failed to load tracker grade options');
  }
};

export const listTrackerSubjectOptions = async (req, res) => {
  try {
    const role = req.user?.role;
    const programId = parseRequiredInt(req.params?.programId, 'programId');
    const gradeId = parseRequiredInt(req.params?.gradeId, 'gradeId');
    await ensureGradeBelongsToProgram(programId, gradeId);
    let result;

    if (PLATFORM_TRACKER_ROLES.has(role)) {
      const requestedClientId = parseOptionalInt(req.query?.client_id, 'client_id');
      result = requestedClientId
        ? await repo.listTrackerSubjectsForClient(requestedClientId, programId, gradeId)
        : await repo.listTrackerSubjectsForPlatform(programId, gradeId);
    } else {
      const clientId = parseRequiredInt(req.user?.client_id, 'client_id');
      result = await repo.listTrackerSubjectsForClient(clientId, programId, gradeId);
    }

    res.json(result.rows);
  } catch (error) {
    handleServiceError(res, error, 'Failed to load tracker subject options');
  }
};

export const listMicroScheduleUploads = async (req, res) => {
  try {
    const programId = parseOptionalInt(req.query?.program_id, 'program_id');
    const gradeId = parseOptionalInt(req.query?.grade_id, 'grade_id');
    const subjectId = parseOptionalInt(req.query?.subject_id, 'subject_id');
    const result = await repo.listMicroScheduleUploads({ programId, gradeId, subjectId });
    res.json(result.rows);
  } catch (err) {
    handleServiceError(res, err, 'Failed to list micro schedule uploads');
  }
};

export const getMicroScheduleRows = async (req, res) => {
  try {
    const uploadId = parseRequiredInt(req.params?.uploadId, 'uploadId');
    const result = await repo.fetchMicroScheduleRowsByUploadId(uploadId);
    res.json(result.rows);
  } catch (err) {
    handleServiceError(res, err, 'Failed to load micro schedule rows');
  }
};

export const uploadLessonPlanner = async (req, res) => {
  try {
    if (!req.file) {
      throw new AppError('file is required', 400);
    }

    const programId = parseRequiredInt(req.body?.program_id, 'program_id');
    const gradeId = parseRequiredInt(req.body?.grade_id, 'grade_id');
    const subjectId = parseRequiredInt(req.body?.subject_id, 'subject_id');
    const microScheduleUploadId = parseRequiredInt(req.body?.micro_schedule_upload_id, 'micro_schedule_upload_id');
    const targetSessionNo = parseRequiredInt(req.body?.target_session_no, 'target_session_no');
    const versionNo = parseOptionalInt(req.body?.version_no, 'version_no') ?? 1;
    const notes = parseOptionalString(req.body?.notes);
    await ensureGradeBelongsToProgram(programId, gradeId);
    await ensureSubjectBelongsToScope({ programId, gradeId, subjectId });
    const microUploadResult = await repo.fetchMicroScheduleUploadById(microScheduleUploadId);
    const microUpload = microUploadResult.rows[0];
    if (!microUpload) {
      throw new AppError('Micro schedule upload not found', 404);
    }
    if (Number(microUpload.program_id) !== Number(programId) || Number(microUpload.grade_id) !== Number(gradeId) || Number(microUpload.subject_id) !== Number(subjectId)) {
      throw new AppError('Micro schedule upload does not belong to the selected program, grade, and subject', 400);
    }
    const microRowsResult = await repo.fetchMicroScheduleRowsByUploadId(microScheduleUploadId);
    const microRow = microRowsResult.rows.find((entry) => Number(entry.session_no) === Number(targetSessionNo));
    if (!microRow) {
      throw new AppError('Target session does not exist in the selected micro schedule', 404);
    }
    const sourceType = parseEnum(
      path.extname(req.file.originalname).replace('.', '').toLowerCase(),
      'source_type',
      ['docx'],
      'docx'
    );
    const fileStoragePath = await saveUploadedFile(req.file, 'lesson_planner');
    const sessions = await parseLessonPlannerDocx(req.file.buffer, programId);
    if (sessions.length !== 1) {
      throw new AppError('Each lesson planner upload must contain exactly one session.', 400);
    }
    if (Number(sessions[0].sessionNo) !== Number(targetSessionNo)) {
      throw new AppError(`Uploaded lesson planner must match SESSION-${targetSessionNo}.`, 400);
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');
      const uploadResult = await repo.insertLessonPlannerUpload(client, {
        programId,
        gradeId,
        subjectId,
        microScheduleUploadId,
        targetSessionNo,
        uploadedByUserId: req.user.id,
        fileName: req.file.originalname,
        fileStoragePath,
        sourceType,
        versionNo,
        status: 'processed',
        notes,
      });
      const upload = uploadResult.rows[0];

      for (const session of sessions) {
        await repo.insertLessonPlannerSession(client, {
          lessonPlannerUploadId: upload.id,
          programId,
          ...session,
        });
      }

      await client.query('COMMIT');
      return res.status(201).json({
        upload,
        session_count: sessions.length,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      if (
        error?.code === '23505' &&
        error?.constraint === 'program_lesson_planner_sessio_lesson_planner_upload_id_sess_key'
      ) {
        throw new AppError(
          'The lesson planner produced duplicate session entries for the same session number. Review the document structure and try again.',
          409
        );
      }
      if (
        error?.code === '23505' &&
        error?.constraint === 'uq_program_lesson_planner_uploads_micro_session'
      ) {
        throw new AppError(
          `A lesson planner is already uploaded for SESSION-${targetSessionNo} in the selected micro schedule.`,
          409
        );
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (err) {
    return handleServiceError(res, err, 'Failed to upload lesson planner');
  }
};

export const listLessonPlannerUploads = async (req, res) => {
  try {
    const programId = parseOptionalInt(req.query?.program_id, 'program_id');
    const gradeId = parseOptionalInt(req.query?.grade_id, 'grade_id');
    const subjectId = parseOptionalInt(req.query?.subject_id, 'subject_id');
    const microScheduleUploadId = parseOptionalInt(req.query?.micro_schedule_upload_id, 'micro_schedule_upload_id');
    const targetSessionNo = parseOptionalInt(req.query?.target_session_no, 'target_session_no');
    const result = await repo.listLessonPlannerUploads({ programId, gradeId, subjectId, microScheduleUploadId, targetSessionNo });
    res.json(result.rows);
  } catch (err) {
    handleServiceError(res, err, 'Failed to list lesson planner uploads');
  }
};

export const getLessonPlannerSessions = async (req, res) => {
  try {
    const uploadId = parseRequiredInt(req.params?.uploadId, 'uploadId');
    const result = await repo.fetchLessonPlannerSessionsByUploadId(uploadId);
    res.json(result.rows);
  } catch (err) {
    handleServiceError(res, err, 'Failed to load lesson planner sessions');
  }
};

export const downloadLessonPlannerUpload = async (req, res) => {
  try {
    const uploadId = parseRequiredInt(req.params?.uploadId, 'uploadId');
    const result = await repo.fetchLessonPlannerUploadById(uploadId);
    const upload = result.rows[0];
    if (!upload) {
      throw new AppError('Lesson planner upload not found', 404);
    }

    await streamStoredLessonPlanDownload(res, upload.file_storage_path, upload.file_name);
  } catch (err) {
    handleServiceError(res, err, 'Failed to download lesson planner');
  }
};

export const getPlannerChecklistByMicroScheduleUploadId = async (req, res) => {
  try {
    const uploadId = parseRequiredInt(req.params?.uploadId, 'uploadId');
    const [microUploadResult, microRowsResult, plannerUploadsResult, plannerSessionsResult] = await Promise.all([
      repo.fetchMicroScheduleUploadById(uploadId),
      repo.fetchMicroScheduleRowsByUploadId(uploadId),
      repo.fetchLessonPlannerUploadsForMicroSchedule(uploadId),
      repo.fetchLessonPlannerSessionScopeByMicroSchedule(uploadId),
    ]);

    const microUpload = microUploadResult.rows[0];
    if (!microUpload) {
      throw new AppError('Micro schedule upload not found', 404);
    }

    res.json(
      buildPlannerChecklist({
        microUpload,
        microRows: microRowsResult.rows,
        plannerUploads: plannerUploadsResult.rows,
        plannerSessions: plannerSessionsResult.rows,
      })
    );
  } catch (err) {
    handleServiceError(res, err, 'Failed to load planner checklist');
  }
};

export const mapProgramSessionTemplates = async (req, res) => {
  try {
    const programId = parseRequiredInt(req.params?.programId, 'programId');
    const microScheduleUploadId = parseRequiredInt(req.body?.micro_schedule_upload_id, 'micro_schedule_upload_id');
    const templateVersionNo = parseOptionalInt(req.body?.template_version_no, 'template_version_no') ?? 1;

    const [microUploadResult, microRowsResult, plannerUploadsResult, plannerSessionsResult, existingTemplatesResult] = await Promise.all([
      repo.fetchMicroScheduleUploadById(microScheduleUploadId),
      repo.fetchMicroScheduleRowsByUploadId(microScheduleUploadId),
      repo.fetchLessonPlannerUploadsForMicroSchedule(microScheduleUploadId),
      repo.fetchLessonPlannerSessionScopeByMicroSchedule(microScheduleUploadId),
      repo.listProgramSessionTemplates({ programId, templateVersionNo, includeUnpublished: true, microScheduleUploadId }),
    ]);

    const microUpload = microUploadResult.rows[0];

    if (!microUpload) {
      throw new AppError('Micro schedule upload not found', 404);
    }
    if (Number(microUpload.program_id) !== Number(programId)) {
      throw new AppError('Selected micro schedule upload does not belong to this program', 400);
    }

    const checklist = buildPlannerChecklist({
      microUpload,
      microRows: microRowsResult.rows,
      plannerUploads: plannerUploadsResult.rows,
      plannerSessions: plannerSessionsResult.rows,
    });

    if (!checklist.is_publish_ready) {
      throw new AppError(`Lesson planner checklist is incomplete. Missing or invalid sessions: ${checklist.missing_sessions.join(', ')}`, 400);
    }

    const templates = buildTemplateRecords({
      programId,
      templateVersionNo,
      microRows: microRowsResult.rows,
      plannerSessions: plannerSessionsResult.rows,
      existingTemplates: existingTemplatesResult.rows,
    });

    const client = await getClient();
    try {
      await client.query('BEGIN');
      await repo.deleteProgramSessionTemplatesByVersion(client, { programId, templateVersionNo, microScheduleUploadId });
      for (const template of templates) {
        await repo.insertProgramSessionTemplate(client, template);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const matched = templates.filter((entry) => entry.mappingStatus === 'matched').length;
    const conflicts = templates.length - matched;

    res.json({
      program_id: programId,
      template_version_no: templateVersionNo,
      total_records: templates.length,
      matched_records: matched,
      non_matched_records: conflicts,
    });
  } catch (err) {
    handleServiceError(res, err, 'Failed to map program session templates');
  }
};

export const listProgramSessionTemplates = async (req, res) => {
  try {
    const programId = parseRequiredInt(req.params?.programId, 'programId');
    const templateVersionNo = parseOptionalInt(req.query?.template_version_no, 'template_version_no');
    const microScheduleUploadId = parseOptionalInt(req.query?.micro_schedule_upload_id, 'micro_schedule_upload_id');
    const includeUnpublished = req.user?.role === 'client_admin'
      ? false
      : (parseOptionalBoolean(req.query?.include_unpublished) ?? true);
    const result = await repo.listProgramSessionTemplates({ programId, templateVersionNo, includeUnpublished, microScheduleUploadId });
    res.json(result.rows);
  } catch (err) {
    handleServiceError(res, err, 'Failed to load program session templates');
  }
};

export const publishProgramSessionTemplates = async (req, res) => {
  try {
    const programId = parseRequiredInt(req.params?.programId, 'programId');
    const templateVersionNo = parseRequiredInt(req.body?.template_version_no, 'template_version_no');
    const microScheduleUploadId = parseRequiredInt(req.body?.micro_schedule_upload_id, 'micro_schedule_upload_id');
    const templatesResult = await repo.listProgramSessionTemplates({ programId, templateVersionNo, includeUnpublished: true, microScheduleUploadId });
    const templates = templatesResult.rows;
    if (templates.length === 0) {
      throw new AppError('No template records found for the selected version', 404);
    }
    const matchedTemplates = templates.filter((template) => template.mapping_status === 'matched');
    const invalidTemplates = templates.filter((template) => template.mapping_status !== 'matched');
    if (invalidTemplates.length > 0) {
      throw new AppError('All micro schedule sessions must have valid lesson planners before publish.', 400);
    }
    if (matchedTemplates.length === 0) {
      throw new AppError('No matched template records found for the selected version', 400);
    }
    if (matchedTemplates.some((template) => template.is_published)) {
      throw new AppError('This template version is already published and cannot be published again.', 409);
    }
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const result = await repo.publishProgramSessionTemplates(client, {
        programId,
        templateVersionNo,
        publishedByUserId: req.user.id,
        microScheduleUploadId,
      });
      if (result.rows.length === 0) {
        throw new AppError('This template version is already published and cannot be published again.', 409);
      }
      await client.query('COMMIT');
      res.json({
        published_count: result.rows.length,
        templates: result.rows,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (err) {
    handleServiceError(res, err, 'Failed to publish program session templates');
  }
};

export const listClientEntitlements = async (req, res) => {
  try {
    const clientId = resolveClientIdForAdmin(req, req.query?.client_id);
    const result = await repo.listClientEntitlements({ clientId });
    res.json(result.rows);
  } catch (err) {
    handleServiceError(res, err, 'Failed to load client entitlements');
  }
};

export const createClientEntitlement = async (req, res) => {
  try {
    const clientId = parseRequiredInt(req.body?.client_id, 'client_id');
    const entitlementType = parseEnum(req.body?.entitlement_type, 'entitlement_type', ['feature', 'program']);
    const featureKey = entitlementType === 'feature'
      ? parseRequiredString(req.body?.feature_key, 'feature_key')
      : null;
    const programId = entitlementType === 'program'
      ? parseRequiredInt(req.body?.program_id, 'program_id')
      : null;
    const enabled = parseOptionalBoolean(req.body?.enabled) ?? true;

    const result = await repo.upsertClientEntitlement({
      clientId,
      entitlementType,
      featureKey,
      programId,
      enabled,
      assignedByUserId: req.user.id,
    });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to create client entitlement');
  }
};

export const updateClientEntitlement = async (req, res) => {
  try {
    const id = parseRequiredInt(req.params?.id, 'id');
    const enabled = parseOptionalBoolean(req.body?.enabled);
    if (enabled === null) {
      throw new AppError('enabled is required', 400);
    }
    const result = await repo.updateClientEntitlement({ id, enabled });
    if (!result.rows[0]) {
      throw new AppError('Client entitlement not found', 404);
    }
    res.json(result.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to update client entitlement');
  }
};

export const generateTeachingSessions = async (req, res) => {
  try {
    const requestedClientId = req.user?.role === 'super_admin' ? req.body?.client_id : req.user?.client_id;
    const clientId = resolveClientIdForAdmin(req, requestedClientId);
    const programId = parseRequiredInt(req.body?.program_id, 'program_id');
    const templateVersionNo = parseRequiredInt(req.body?.template_version_no, 'template_version_no');
    const microScheduleUploadId = parseOptionalInt(req.body?.micro_schedule_upload_id, 'micro_schedule_upload_id');
    const schoolId = parseRequiredInt(req.body?.school_id, 'school_id');
    const defaultBatchId = parseRequiredInt(req.body?.batch_id, 'batch_id');
    const defaultTeacherUserId = parseRequiredInt(req.body?.teacher_user_id, 'teacher_user_id');
    const sessionItems = parseJsonArrayField(req.body?.session_items, 'session_items', { required: true });

    await ensureTrackerFeatureEnabled(clientId);
    await ensureProgramEntitled(clientId, programId);

    if (microScheduleUploadId) {
      const microUploadResult = await repo.fetchMicroScheduleUploadById(microScheduleUploadId);
      const microUpload = microUploadResult.rows[0];
      if (!microUpload) {
        throw new AppError('Selected micro schedule upload not found', 404);
      }
      if (Number(microUpload.program_id) !== Number(programId)) {
        throw new AppError('Selected micro schedule upload does not belong to this program', 400);
      }
    }

    const templatesResult = await repo.fetchProgramTemplatesForVersion({
      programId,
      templateVersionNo,
      microScheduleUploadId,
    });
    const fullTemplatesResult = await repo.listProgramSessionTemplates({
      programId,
      templateVersionNo,
      includeUnpublished: true,
      microScheduleUploadId,
    });
    const nonMatchedTemplates = fullTemplatesResult.rows.filter((row) => row.mapping_status !== 'matched');
    if (nonMatchedTemplates.length > 0) {
      throw new AppError('Teaching sessions cannot be generated until every required lesson planner is uploaded and published.', 400);
    }
    const templatesById = new Map(
      templatesResult.rows.map((row) => [Number(row.id), row])
    );
    const templatesByIdentity = new Map(
      templatesResult.rows.map((row) => [
        buildTemplateIdentityKey({
          gradeLabel: row.grade_label,
          subjectLabel: row.subject_label,
          sessionNo: row.session_no,
          sessionLabel: row.session_label,
          partType: row.part_type,
        }),
        row,
      ])
    );
    if (templatesById.size === 0) {
      throw new AppError('No published templates found for the selected program/version', 404);
    }

    const selectedTemplateIds = sessionItems
      .map((item) => parseRequiredInt(item?.template_id, 'template_id'))
      .filter(Boolean);
    const selectedTemplates = selectedTemplateIds
      .map((templateId) => templatesById.get(templateId))
      .filter(Boolean);
    const scopeEntries = Array.from(
      new Set(
        selectedTemplates.map((template) => `${template.grade_label}|${template.subject_label}`)
      )
    ).map((entry) => {
      const [gradeLabel, subjectLabel] = entry.split('|');
      return { gradeLabel, subjectLabel };
    });

    const client = await getClient();
    const createdSessions = [];
    try {
      await client.query('BEGIN');
      for (const scopeEntry of scopeEntries) {
        const existingScopeSessions = await repo.listTeachingSessions({
          whereSql:
            'ts.client_id = $1 AND ts.school_id = $2 AND ts.program_id = $3 AND pst.template_version_no = $4 AND ts.grade_label = $5 AND ts.subject_label = $6',
          params: [clientId, schoolId, programId, templateVersionNo, scopeEntry.gradeLabel, scopeEntry.subjectLabel],
        });
        if (existingScopeSessions.rows.length > 0) {
          throw new AppError(
            `Teaching sessions already exist for ${scopeEntry.gradeLabel} / ${scopeEntry.subjectLabel} in template version ${templateVersionNo}.`,
            400
          );
        }
      }

      for (const item of sessionItems) {
        const templateId = parseRequiredInt(item?.template_id, 'template_id');
        const templateIdentityKey = buildTemplateIdentityKeyFromRequestItem(item);
        const template = templatesById.get(templateId) ?? templatesByIdentity.get(templateIdentityKey);
        if (!template) {
          throw new AppError(
            `Template ${templateId} is not available for generation for program ${programId} version ${templateVersionNo}. Reload published matched templates and try again.`,
            400
          );
        }

          const created = await repo.insertTeachingSession(client, {
            clientId,
            schoolId,
            batchId: defaultBatchId,
            programId,
            programSessionTemplateId: template.id,
            gradeLabel: template.grade_label,
            subjectLabel: template.subject_label,
            chapterLabel: template.chapter_label,
            sessionNo: template.session_no,
            sessionLabel: template.session_label,
            partType: template.part_type,
            plannedDate: parseDateString(
              normalizeStoredDateValue(template.planned_date),
              'planned_date',
              { required: true }
            ),
            periodSlot: null,
            durationMinutes: parseOptionalInt(item?.duration_minutes, 'duration_minutes') ?? template.duration_minutes,
            teacherUserId: defaultTeacherUserId,
            learningGoal: template.learning_goal,
            topicLabel: template.topic_label,
            plannerTitle: template.planner_title,
          learningObjectives: template.learning_objectives ?? [],
          materialsNeeded: template.materials_needed,
          worksheetQuestionsCovered: template.worksheet_questions_covered,
          shortcutsIntroduced: template.shortcuts_introduced,
          commonErrorsAddressed: template.common_errors_addressed,
          homework: template.homework,
          nextSessionPreview: template.next_session_preview,
          pedagogyNote: template.pedagogy_note,
          minutePlanJson: template.minute_plan_json ?? [],
          teacherScriptText: template.teacher_script_text,
          status: 'not_started',
          completionPercentage: 0,
          actualDate: null,
          topicsCovered: null,
          pendingTopics: null,
          reasonCode: null,
          remarks: parseOptionalString(item?.remarks),
          lastUpdatedByUserId: null,
          lastUpdatedAt: null,
        });
        createdSessions.push(created.rows[0]);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
      } finally {
        client.release();
      }

      const createdSessionIds = createdSessions.map((session) => Number(session.id)).filter(Boolean);
      const enrichedSessionsResult =
        createdSessionIds.length > 0
          ? await repo.listTeachingSessions({
              whereSql: `ts.id = ANY($1::int[])`,
              params: [createdSessionIds],
            })
          : { rows: [] };

      res.status(201).json({
        created_count: createdSessions.length,
        sessions: enrichedSessionsResult.rows,
      });
    } catch (err) {
      handleServiceError(res, err, 'Failed to generate teaching sessions');
    }
  };

export const listTeachingSessions = async (req, res) => {
  try {
    const params = [];
    const where = [];
    const role = req.user?.role;

    if (role === 'super_admin') {
      const clientId = parseOptionalInt(req.query?.client_id, 'client_id');
      if (clientId) {
        where.push(`ts.client_id = $${params.length + 1}`);
        params.push(clientId);
      }
    } else if (role === 'client_admin') {
      where.push(`ts.client_id = $${params.length + 1}`);
      params.push(Number(req.user.client_id));
    } else if (role === 'school_owner') {
      const schoolsResult = await repo.fetchSchoolIdsForOwner(req.user.id);
      const schoolIds = schoolsResult.rows.map((row) => row.school_id);
      if (schoolIds.length === 0) {
        return res.json([]);
      }
      where.push(`ts.school_id = ANY($${params.length + 1}::int[])`);
      params.push(schoolIds);
    } else if (role === 'teacher') {
      where.push(`ts.teacher_user_id = $${params.length + 1}`);
      params.push(req.user.id);
    } else {
      throw new AppError('Access denied', 403);
    }

    const schoolId = parseOptionalInt(req.query?.school_id, 'school_id');
    if (schoolId) {
      where.push(`ts.school_id = $${params.length + 1}`);
      params.push(schoolId);
    }

    const programId = parseOptionalInt(req.query?.program_id, 'program_id');
    if (programId) {
      where.push(`ts.program_id = $${params.length + 1}`);
      params.push(programId);
    }

    const teacherUserId = parseOptionalInt(req.query?.teacher_user_id, 'teacher_user_id');
    if (teacherUserId) {
      where.push(`ts.teacher_user_id = $${params.length + 1}`);
      params.push(teacherUserId);
    }

    const batchId = parseOptionalInt(req.query?.batch_id, 'batch_id');
    if (batchId) {
      where.push(`ts.batch_id = $${params.length + 1}`);
      params.push(batchId);
    }

    const templateVersionNo = parseOptionalInt(req.query?.template_version_no, 'template_version_no');
    if (templateVersionNo) {
      where.push(`pst.template_version_no = $${params.length + 1}`);
      params.push(templateVersionNo);
    }

    const gradeLabel = parseOptionalString(req.query?.grade_label);
    if (gradeLabel) {
      where.push(`LOWER(TRIM(ts.grade_label)) = LOWER(TRIM($${params.length + 1}))`);
      params.push(gradeLabel);
    }

    const subjectLabel = parseOptionalString(req.query?.subject_label);
    if (subjectLabel) {
      where.push(`LOWER(TRIM(ts.subject_label)) = LOWER(TRIM($${params.length + 1}))`);
      params.push(subjectLabel);
    }

    const status = parseOptionalString(req.query?.status);
    if (status) {
      where.push(`ts.status = $${params.length + 1}`);
      params.push(status);
    }

    const dateFrom = parseDateString(req.query?.date_from, 'date_from');
    if (dateFrom) {
      where.push(`ts.planned_date >= $${params.length + 1}`);
      params.push(dateFrom);
    }

    const dateTo = parseDateString(req.query?.date_to, 'date_to');
    if (dateTo) {
      where.push(`ts.planned_date <= $${params.length + 1}`);
      params.push(dateTo);
    }

    const result = await repo.listTeachingSessions({
      whereSql: where.length > 0 ? where.join(' AND ') : '1=1',
      params,
    });
    res.json(result.rows);
  } catch (err) {
    handleServiceError(res, err, 'Failed to list teaching sessions');
  }
};

export const updateTeachingSessionAssignment = async (req, res) => {
  try {
    const id = parseRequiredInt(req.params?.id, 'id');
    const existing = await repo.fetchTeachingSessionById(id);
    const current = existing.rows[0];
    if (!current) {
      throw new AppError('Teaching session not found', 404);
    }

    if (req.user?.role !== 'super_admin' && Number(current.client_id) !== Number(req.user?.client_id)) {
      throw new AppError('Access denied', 403);
    }

    const result = await repo.updateTeachingSessionAssignment({
      id,
      fields: {
        schoolId: parseOptionalInt(req.body?.school_id, 'school_id'),
        batchId: parseOptionalInt(req.body?.batch_id, 'batch_id'),
        teacherUserId: parseOptionalInt(req.body?.teacher_user_id, 'teacher_user_id'),
        plannedDate: parseDateString(req.body?.planned_date, 'planned_date'),
        periodSlot: parseOptionalString(req.body?.period_slot),
        durationMinutes: parseOptionalInt(req.body?.duration_minutes, 'duration_minutes'),
        remarks: parseOptionalString(req.body?.remarks),
      },
    });
    res.json(result.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to update teaching session');
  }
};

export const createTeacherTrackerPermission = async (req, res) => {
  try {
    const clientId = resolveClientIdForAdmin(req, req.body?.client_id ?? req.user?.client_id);
    const teacherUserId = parseRequiredInt(req.body?.teacher_user_id, 'teacher_user_id');
    const result = await repo.insertTeacherSessionTrackerPermission({
      clientId,
      teacherUserId,
      schoolId: parseOptionalInt(req.body?.school_id, 'school_id'),
      batchId: parseOptionalInt(req.body?.batch_id, 'batch_id'),
      programId: parseOptionalInt(req.body?.program_id, 'program_id'),
      canViewTracker: parseOptionalBoolean(req.body?.can_view_tracker) ?? true,
      canUpdateTracker: parseOptionalBoolean(req.body?.can_update_tracker) ?? true,
      grantedByUserId: req.user.id,
    });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to grant tracker permission');
  }
};

export const listTeacherTrackerPermissions = async (req, res) => {
  try {
    const clientId = resolveClientIdForAdmin(req, req.query?.client_id ?? req.user?.client_id);
    const teacherUserId = parseOptionalInt(req.query?.teacher_user_id, 'teacher_user_id');
    const result = await repo.listTeacherSessionTrackerPermissions({ clientId, teacherUserId });
    res.json(result.rows);
  } catch (err) {
    handleServiceError(res, err, 'Failed to list tracker permissions');
  }
};

export const deleteTeacherTrackerPermission = async (req, res) => {
  try {
    const id = parseRequiredInt(req.params?.id, 'id');
    const result = await repo.deleteTeacherSessionTrackerPermission(id);
    if (!result.rows[0]) {
      throw new AppError('Tracker permission not found', 404);
    }
    res.json({ success: true });
  } catch (err) {
    handleServiceError(res, err, 'Failed to revoke tracker permission');
  }
};

export const listMyTeachingSessions = async (req, res) => {
  try {
    const params = [req.user.id];
    const where = [`ts.teacher_user_id = $1`];

    const status = parseOptionalString(req.query?.status);
    if (status) {
      where.push(`ts.status = $${params.length + 1}`);
      params.push(status);
    }

    const dateFrom = parseDateString(req.query?.date_from, 'date_from');
    if (dateFrom) {
      where.push(`ts.planned_date >= $${params.length + 1}`);
      params.push(dateFrom);
    }

    const dateTo = parseDateString(req.query?.date_to, 'date_to');
    if (dateTo) {
      where.push(`ts.planned_date <= $${params.length + 1}`);
      params.push(dateTo);
    }

    const result = await repo.listTeachingSessions({
      whereSql: where.join(' AND '),
      params,
    });
    const sanitizedSessions = await Promise.all(
      result.rows.map(async (session) => sanitizeLessonPlanLink(decorateSessionExpiry(session)))
    );
    res.json(sanitizedSessions);
  } catch (err) {
    handleServiceError(res, err, 'Failed to load assigned teaching sessions');
  }
};

export const getMyTeachingSessionById = async (req, res) => {
  try {
    const sessionId = parseRequiredInt(req.params?.id, 'id');
    const sessionResult = await repo.fetchTeacherOwnedSession({ sessionId, teacherUserId: req.user.id });
    const session = sessionResult.rows[0];
    if (!session) {
      throw new AppError('Teaching session not found', 404);
    }

    const permission = await repo.fetchTeacherTrackerPermissionForSession({
      clientId: session.client_id,
      teacherUserId: req.user.id,
      schoolId: session.school_id,
      batchId: session.batch_id,
      programId: session.program_id,
    });
    if (!permission.rows[0]) {
      throw new AppError('Tracker access is not granted for this session', 403);
    }

    const updates = await repo.listTeachingSessionUpdatesBySessionId(session.id);
    res.json({
      session: await sanitizeLessonPlanLink(decorateSessionExpiry(session)),
      updates: updates.rows,
    });
  } catch (err) {
    handleServiceError(res, err, 'Failed to load teaching session');
  }
};

export const downloadMyTeachingSessionLessonPlan = async (req, res) => {
  try {
    const sessionId = parseRequiredInt(req.params?.id, 'id');
    const sessionResult = await repo.fetchTeacherOwnedSession({ sessionId, teacherUserId: req.user.id });
    const session = sessionResult.rows[0];
    if (!session) {
      throw new AppError('Teaching session not found', 404);
    }

    const permission = await repo.fetchTeacherTrackerPermissionForSession({
      clientId: session.client_id,
      teacherUserId: req.user.id,
      schoolId: session.school_id,
      batchId: session.batch_id,
      programId: session.program_id,
    });
    if (!permission.rows[0]) {
      throw new AppError('Tracker access is not granted for this session', 403);
    }

    await streamStoredLessonPlanDownload(
      res,
      session.lesson_plan_file_storage_path,
      session.lesson_plan_file_name
    );
  } catch (err) {
    handleServiceError(res, err, 'Failed to download lesson plan');
  }
};

export const createTeachingSessionUpdate = async (req, res) => {
  try {
    const sessionId = parseRequiredInt(req.params?.id, 'id');
    const sessionResult = await repo.fetchTeacherOwnedSession({ sessionId, teacherUserId: req.user.id });
    const session = sessionResult.rows[0];
    if (!session) {
      throw new AppError('Teaching session not found', 404);
    }

    const permission = await repo.fetchTeacherTrackerPermissionForSession({
      clientId: session.client_id,
      teacherUserId: req.user.id,
      schoolId: session.school_id,
      batchId: session.batch_id,
      programId: session.program_id,
    });
    const trackerPermission = permission.rows[0];
    if (!trackerPermission || trackerPermission.can_update_tracker !== true) {
      throw new AppError('Tracker update access is not granted for this session', 403);
    }

    const decoratedSession = decorateSessionExpiry(session);
    if (decoratedSession?.is_expired) {
      throw new AppError('This session is expired and can no longer accept daily updates', 403);
    }

    const statusSubmitted = parseEnum(
      req.body?.status_submitted,
      'status_submitted',
      ['completed', 'partially_completed', 'not_completed']
    );
    const completionPercentage = parseCompletionPercentage(req.body?.completion_percentage);

    const updateResult = await repo.insertTeachingSessionUpdate({
      teachingSessionId: session.id,
      teacherUserId: req.user.id,
      statusSubmitted,
      completionPercentage,
      actualDate: parseDateString(req.body?.actual_date, 'actual_date'),
      topicsCovered: parseOptionalString(req.body?.topics_covered),
      pendingTopics: parseOptionalString(req.body?.pending_topics),
      reasonCode: parseOptionalString(req.body?.reason_code),
      remarks: parseOptionalString(req.body?.remarks),
    });

    const nextStatus = computeLiveStatus({
      statusSubmitted,
      plannedDate: session.planned_date ? String(session.planned_date).slice(0, 10) : null,
      completionPercentage,
    });

    const updatedSession = await repo.updateTeachingSessionProgress({
      id: session.id,
      fields: {
        status: nextStatus,
        completionPercentage,
        actualDate: parseDateString(req.body?.actual_date, 'actual_date'),
        topicsCovered: parseOptionalString(req.body?.topics_covered),
        pendingTopics: parseOptionalString(req.body?.pending_topics),
        reasonCode: parseOptionalString(req.body?.reason_code),
        remarks: parseOptionalString(req.body?.remarks),
        lastUpdatedByUserId: req.user.id,
      },
    });

    res.status(201).json({
      update: updateResult.rows[0],
      session: decorateSessionExpiry(updatedSession.rows[0]),
    });
  } catch (err) {
    handleServiceError(res, err, 'Failed to submit teaching session update');
  }
};

export const getTeachingSessionAnalytics = async (req, res) => {
  try {
    const role = req.user?.role;
    const params = [];
    const where = [];

    if (role === 'super_admin') {
      const clientId = parseOptionalInt(req.query?.client_id, 'client_id');
      if (clientId) {
        where.push(`client_id = $${params.length + 1}`);
        params.push(clientId);
      }
    } else if (role === 'client_admin') {
      where.push(`client_id = $${params.length + 1}`);
      params.push(Number(req.user.client_id));
    } else if (role === 'school_owner') {
      const schoolsResult = await repo.fetchSchoolIdsForOwner(req.user.id);
      const schoolIds = schoolsResult.rows.map((row) => row.school_id);
      if (schoolIds.length === 0) {
        return res.json({
          total_sessions: 0,
          completed_sessions: 0,
          partial_sessions: 0,
          not_completed_sessions: 0,
          update_pending_sessions: 0,
          lagging_sessions: 0,
          average_completion_percentage: 0,
        });
      }
      where.push(`school_id = ANY($${params.length + 1}::int[])`);
      params.push(schoolIds);
    } else if (role === 'teacher') {
      where.push(`teacher_user_id = $${params.length + 1}`);
      params.push(req.user.id);
    } else {
      throw new AppError('Access denied', 403);
    }

    const programId = parseOptionalInt(req.query?.program_id, 'program_id');
    if (programId) {
      where.push(`program_id = $${params.length + 1}`);
      params.push(programId);
    }

    const schoolId = parseOptionalInt(req.query?.school_id, 'school_id');
    if (schoolId) {
      where.push(`school_id = $${params.length + 1}`);
      params.push(schoolId);
    }

    const dateFrom = parseDateString(req.query?.date_from, 'date_from');
    if (dateFrom) {
      where.push(`planned_date >= $${params.length + 1}`);
      params.push(dateFrom);
    }

    const dateTo = parseDateString(req.query?.date_to, 'date_to');
    if (dateTo) {
      where.push(`planned_date <= $${params.length + 1}`);
      params.push(dateTo);
    }

    const result = await repo.fetchAnalyticsSummary({
      whereSql: where.length ? where.join(' AND ') : '1=1',
      params,
    });
    res.json(result.rows[0]);
  } catch (err) {
    handleServiceError(res, err, 'Failed to load teaching session analytics');
  }
};
