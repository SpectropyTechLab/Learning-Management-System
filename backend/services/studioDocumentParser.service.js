import mammoth from 'mammoth';
import { AppError } from '../utils/errors.js';

export const SESSION_PLAN_FIELDS = [
  'time_duration',
  'screen_mapped',
  'learning_objective_evidence',
  'pedagogy',
  'resources_assets',
  'teacher_action_todo',
  'narration_dialogue_cue',
  'student_action_reflection',
  'bloom_skills',
  'references',
  'remarks_assessment',
];

const SESSION_PLAN_HEADINGS = [
  'Time / duration',
  'Screen mapped',
  'Learning objective / evidence',
  'Pedagogy',
  'Resources / assets',
  'Teacher action / to-do',
  'Narration / dialogue cue',
  'Student action / reflection',
  'Bloom / skills',
  'References',
  'Remarks / assessment',
];

export const SCREEN_SCRIPT_FIELDS = [
  'visual_animation_interaction_assets',
  'teacher_narration',
  'adaptive_branch_scripts',
  'student_evidence_return_route',
  'pyq_examination_extension',
  'teacher_presenter_notes_production_checks',
];

const SCREEN_SCRIPT_HEADINGS = [
  'Visual, animation and interaction assets',
  'Word-for-word teacher narration',
  'Adaptive branch scripts',
  'Student evidence and return route',
  'PYQ / examination extension',
  'Teacher presenter notes / production checks',
];

const assertDocx = (file) => {
  if (!file?.buffer?.length) throw new AppError('A non-empty DOCX file is required');
  const name = String(file.originalname || '').toLowerCase();
  const mime = String(file.mimetype || '').toLowerCase();
  if (!name.endsWith('.docx') && !mime.includes('wordprocessingml')) {
    throw new AppError('Structured extraction currently supports DOCX files only', 415);
  }
};

const rawText = async (file) => {
  assertDocx(file);
  try {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return {
      text: result.value.replace(/\r/g, ''),
      messages: result.messages.map((message) => String(message.message || message)),
    };
  } catch (error) {
    throw new AppError(`Unable to read the DOCX file: ${error.message}`, 422);
  }
};

const nonBlankLines = (text) => text.split('\n').map((line) => line.trim()).filter(Boolean);

export const parseSessionPlanDocx = async (file) => {
  const extracted = await rawText(file);
  const lines = nonBlankLines(extracted.text);
  const start = lines.findIndex((line, index) =>
    SESSION_PLAN_HEADINGS.every((heading, offset) => lines[index + offset] === heading));
  if (start < 0) {
    throw new AppError('The Session Plan table headings were not found in the uploaded DOCX', 422);
  }

  const cells = [];
  for (const line of lines.slice(start + SESSION_PLAN_HEADINGS.length)) {
    if (/^TIME CHECK:/i.test(line) || /^Part B\b/i.test(line)) break;
    cells.push(line);
  }
  const rows = [];
  for (let offset = 0; offset + SESSION_PLAN_FIELDS.length <= cells.length; offset += SESSION_PLAN_FIELDS.length) {
    const values = cells.slice(offset, offset + SESSION_PLAN_FIELDS.length);
    if (!/^\d{1,2}:\d{2}/.test(values[0]) || !/^S\d{1,2}-\d{1,2}/i.test(values[1])) break;
    rows.push(Object.fromEntries(SESSION_PLAN_FIELDS.map((field, index) => [field, values[index]])));
  }
  if (rows.length === 0) {
    throw new AppError('No Session Plan rows could be extracted from the uploaded DOCX', 422);
  }
  const consumed = rows.length * SESSION_PLAN_FIELDS.length;
  return {
    kind: 'session_plan',
    rows,
    warnings: [
      ...extracted.messages,
      ...(consumed < cells.length ? [`${cells.length - consumed} trailing table value(s) require review.`] : []),
    ],
  };
};

const contentBetween = (block, heading, nextHeading) => {
  const start = block.indexOf(heading);
  if (start < 0) return '';
  const contentStart = start + heading.length;
  const end = nextHeading ? block.indexOf(nextHeading, contentStart) : block.length;
  return block.slice(contentStart, end < 0 ? block.length : end).trim();
};

export const parseScreenScriptDocx = async (file) => {
  const extracted = await rawText(file);
  const marker = extracted.text.search(/3\.\s*Screen-by-screen teacher scripts/i);
  const candidate = marker >= 0 ? extracted.text.slice(marker) : extracted.text;
  const sectionEnd = candidate.search(/^4\.\s*Exit assessment/im);
  const body = sectionEnd >= 0 ? candidate.slice(0, sectionEnd) : candidate;
  const headerPattern = /^(S\d{1,2}-\d{1,2})\s*\|\s*(.+)$/gim;
  const matches = [...body.matchAll(headerPattern)];
  const scripts = [];
  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const block = body.slice(current.index + current[0].length, matches[index + 1]?.index ?? body.length).trim();
    const content = {};
    SCREEN_SCRIPT_FIELDS.forEach((field, fieldIndex) => {
      content[field] = contentBetween(
        block,
        SCREEN_SCRIPT_HEADINGS[fieldIndex],
        SCREEN_SCRIPT_HEADINGS[fieldIndex + 1],
      );
    });
    const timePedagogy = block.split('\n').map((line) => line.trim()).find(Boolean) || '';
    scripts.push({
      screen_key: current[1].toUpperCase(),
      screen_number: Number(current[1].split('-').at(-1)),
      title: current[2].trim(),
      time_pedagogy: timePedagogy,
      ...content,
    });
  }
  if (scripts.length === 0) {
    throw new AppError('No per-Screen scripts could be extracted from the uploaded DOCX', 422);
  }
  const duplicateKeys = scripts.map((script) => script.screen_key)
    .filter((key, index, all) => all.indexOf(key) !== index);
  return {
    kind: 'screen_script',
    scripts,
    warnings: [
      ...extracted.messages,
      ...([...new Set(duplicateKeys)].map((key) => `Duplicate Screen identifier found: ${key}`)),
      ...(scripts.some((script) => SCREEN_SCRIPT_FIELDS.some((field) => !script[field]))
        ? ['One or more Screen Script sections are blank and require review.'] : []),
    ],
  };
};

