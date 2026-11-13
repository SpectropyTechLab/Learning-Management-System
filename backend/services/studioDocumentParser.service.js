import mammoth from 'mammoth';
import { load } from 'cheerio';
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

export const SCREEN_SCRIPT_V2_SECTION_HEADINGS = [
  'Layout Skeleton (in detail)',
  'Title',
  'Overall Screen Content',
  'Asset Generation Prompts',
  'Asset Output Format',
  'Animation Timeline',
  'Teacher Presenter Notes',
  'Teacher Narration — Dialogue & Sections',
  'Student Reflection',
  'Corresponding Branches',
  'Branch Roots — Misconception, Target Exam & Pedagogy',
];

export const SCREEN_SCRIPT_V2_REQUIRED_SECTIONS = [
  'Layout Skeleton (in detail)',
  'Title',
  'Overall Screen Content',
  'Animation Timeline',
  'Teacher Narration — Dialogue & Sections',
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

const normalizeHeading = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const tableText = (section) => (section?.blocks || []).map((block) => {
  if (block.type === 'table') return [block.columns, ...block.rows].map((row) => row.join(' | ')).join('\n');
  if (block.type === 'list') return block.items.map((item) => `• ${item}`).join('\n');
  return block.text || '';
}).filter(Boolean).join('\n');

const parseV2ScreenScripts = async (file) => {
  const result = await mammoth.convertToHtml(
    { buffer: file.buffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => ({
        src: `data:${image.contentType};base64,${await image.read('base64')}`,
      })),
    },
  );
  const $ = load(result.value);
  const scripts = [];
  let current = null;
  let section = null;
  let stopped = false;
  $('body').children().each((_, node) => {
    if (stopped) return;
    const tag = String(node.tagName || '').toLowerCase();
    const text = normalizeHeading($(node).text());
    if (/^h1$/.test(tag) && /^4\.\s*Exit assessment/i.test(text)) {
      stopped = true;
      return;
    }
    const screenMatch = tag === 'h2' ? text.match(/^(S\d{1,2}-\d{1,2})\s*\|\s*(.+)$/i) : null;
    if (screenMatch) {
      current = {
        schema_version: 2,
        screen_key: screenMatch[1].toUpperCase(),
        screen_number: Number(screenMatch[1].split('-').at(-1)),
        title: screenMatch[2].trim(),
        time_pedagogy: '',
        sections: [],
      };
      scripts.push(current);
      section = null;
      return;
    }
    if (!current) return;
    if (tag === 'h3') {
      section = { key: normalizeHeading(text).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), label: text, blocks: [] };
      current.sections.push(section);
      return;
    }
    if (!section) {
      if (text && !current.time_pedagogy) current.time_pedagogy = text;
      return;
    }
    if (tag === 'table') {
      const matrix = [];
      $(node).find('tr').each((__, row) => {
        matrix.push($(row).find('th,td').map((___, cell) => normalizeHeading($(cell).text())).get());
      });
      if (matrix.length) section.blocks.push({ type: 'table', columns: matrix[0], rows: matrix.slice(1) });
      return;
    }
    if (tag === 'ul' || tag === 'ol') {
      const items = $(node).children('li').map((__, item) => normalizeHeading($(item).text())).get().filter(Boolean);
      if (items.length) section.blocks.push({ type: 'list', ordered: tag === 'ol', items });
      return;
    }
    const images = $(node).find('img').map((__, image) => ({
      type: 'image',
      src: $(image).attr('src') || '',
      alt: $(image).attr('alt') || 'Screen layout reference',
    })).get().filter((image) => image.src);
    section.blocks.push(...images);
    if (text) section.blocks.push({ type: 'paragraph', text });
  });
  if (!scripts.length) return null;
  scripts.forEach((script) => {
    const byLabel = new Map(script.sections.map((item) => [normalizeHeading(item.label).toLowerCase(), item]));
    const sectionText = (label) => tableText(byLabel.get(label.toLowerCase()));
    script.visual_animation_interaction_assets = [sectionText('Overall Screen Content'), sectionText('Asset Generation Prompts'), sectionText('Asset Output Format'), sectionText('Animation Timeline')].filter(Boolean).join('\n\n');
    script.teacher_narration = sectionText('Teacher Narration — Dialogue & Sections');
    script.adaptive_branch_scripts = [sectionText('Corresponding Branches'), sectionText('Branch Roots — Misconception, Target Exam & Pedagogy')].filter(Boolean).join('\n\n');
    script.student_evidence_return_route = sectionText('Student Reflection');
    script.pyq_examination_extension = sectionText('Branch Roots — Misconception, Target Exam & Pedagogy');
    script.teacher_presenter_notes_production_checks = [sectionText('Teacher Presenter Notes'), sectionText('Layout Skeleton (in detail)')].filter(Boolean).join('\n\n');
  });
  return {
    scripts,
    messages: result.messages
      .map((message) => String(message.message || message))
      .filter((message) => !/Unrecognised paragraph style:\s*'Title'/i.test(message)),
  };
};

export const parseScreenScriptDocx = async (file) => {
  assertDocx(file);
  try {
    const modern = await parseV2ScreenScripts(file);
    if (modern) {
      const duplicateKeys = modern.scripts.map((script) => script.screen_key)
        .filter((key, index, all) => all.indexOf(key) !== index);
      const missing = modern.scripts.flatMap((script) => {
        const labels = new Set(script.sections.map((section) => normalizeHeading(section.label).toLowerCase()));
        const errors = SCREEN_SCRIPT_V2_REQUIRED_SECTIONS
          .filter((heading) => !labels.has(heading.toLowerCase()))
          .map((heading) => `${script.screen_key}: missing required section “${heading}”`);
        script.validation = { status: errors.length ? 'error' : 'valid', errors };
        return errors;
      });
      return {
        kind: 'screen_script',
        schema_version: 2,
        scripts: modern.scripts,
        warnings: [
          ...modern.messages,
          ...([...new Set(duplicateKeys)].map((key) => `Duplicate Screen identifier found: ${key}`)),
          ...missing,
        ],
      };
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Unable to read the structured Screen Script DOCX: ${error.message}`, 422);
  }
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
      // Legacy six-heading documents remain importable. Blank legacy fields are
      // surfaced as review warnings below instead of becoming hard failures.
      validation: { status: 'valid', errors: [] },
    });
  }
  if (scripts.length === 0) {
    throw new AppError('No per-Screen scripts could be extracted from the uploaded DOCX', 422);
  }
  const duplicateKeys = scripts.map((script) => script.screen_key)
    .filter((key, index, all) => all.indexOf(key) !== index);
  return {
    kind: 'screen_script',
    schema_version: 1,
    scripts,
    warnings: [
      ...extracted.messages,
      ...([...new Set(duplicateKeys)].map((key) => `Duplicate Screen identifier found: ${key}`)),
      ...(scripts.some((script) => SCREEN_SCRIPT_FIELDS.some((field) => !script[field]))
        ? ['One or more Screen Script sections are blank and require review.'] : []),
    ],
  };
};

