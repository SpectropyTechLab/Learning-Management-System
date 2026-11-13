import ExcelJS from 'exceljs';
import { getClient, query as dbQuery } from '../repositories/db.repository.js';
import { AppError } from '../utils/errors.js';
import { taxonomyCode } from './studioTaxonomy.service.js';

const MAX_ROWS = 1000;
const HIERARCHY_FIELDS = [
  'board_name', 'board_code', 'program_name', 'program_code', 'grade_number',
  'subject_name', 'subject_code', 'chapter_name', 'topic_name', 'subtopic_name',
];
const HEADERS = [
  ['board_name', 'Board Name'], ['board_code', 'Board Code'],
  ['program_name', 'Program Name'], ['program_code', 'Program Code'],
  ['grade_number', 'Grade Number'], ['subject_name', 'Subject Name'],
  ['subject_code', 'Subject Code'], ['chapter_name', 'Chapter Name'],
  ['topic_name', 'Topic Name'], ['topic_pedagogy_names', 'Topic Pedagogy Names'],
  ['topic_bloom_level_names', 'Topic Bloom Level Names'],
  ['topic_target_exam_names', 'Topic Target Exam Names'],
  ['subtopic_name', 'Subtopic Name'], ['session_name', 'Session Name'],
  ['session_description', 'Session Description'],
];

const normalize = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');
const key = (value) => normalize(value).toLocaleLowerCase();
const codeKey = (value) => normalize(value).toLocaleUpperCase();
const cellText = (cell) => {
  const value = cell?.value;
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) return normalize(value.richText.map((item) => item.text).join(''));
    if (value.result !== undefined) return normalize(value.result);
    if (value.text !== undefined) return normalize(value.text);
  }
  return normalize(value);
};
const splitNames = (value) => [...new Set(normalize(value).split(',').map(normalize).filter(Boolean))];

const assertAuthor = (user) => {
  if (!['super_admin', 'content_authorizer'].includes(user?.role)) {
    throw new AppError('Only Studio authors can import curriculum', 403, 'AUTHOR_ROLE_REQUIRED');
  }
};
const scopedClientId = (user) => user?.client_id ? Number(user.client_id) : null;

const parseWorkbook = async (file) => {
  if (!file?.buffer) throw new AppError('Choose an Excel workbook to upload', 422, 'FILE_REQUIRED');
  if (!/\.xlsx$/i.test(file.originalname || '')) {
    throw new AppError('The bulk import file must be an .xlsx workbook', 422, 'INVALID_FILE_TYPE');
  }
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(file.buffer);
  } catch {
    throw new AppError('The Excel workbook could not be read', 422, 'INVALID_WORKBOOK');
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new AppError('The workbook does not contain a worksheet', 422, 'EMPTY_WORKBOOK');
  const expected = new Map(HEADERS.map(([field, label]) => [key(label), field]));
  const columns = new Map();
  sheet.getRow(1).eachCell((cell, columnNumber) => {
    const field = expected.get(key(cellText(cell)));
    if (field) columns.set(field, columnNumber);
  });
  const missingHeaders = HEADERS.filter(([field]) => !columns.has(field)).map(([, label]) => label);
  if (missingHeaders.length) {
    throw new AppError(`Missing Excel headings: ${missingHeaders.join(', ')}`, 422, 'MISSING_HEADINGS');
  }
  const inherited = {};
  const rows = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const excelRow = sheet.getRow(rowNumber);
    const raw = Object.fromEntries(HEADERS.map(([field]) => [field, cellText(excelRow.getCell(columns.get(field)))]));
    if (Object.values(raw).every((value) => !value)) continue;
    for (const field of HIERARCHY_FIELDS) {
      if (raw[field]) inherited[field] = raw[field];
      else raw[field] = inherited[field] || '';
    }
    rows.push({ row_number: rowNumber, ...raw });
    if (rows.length > MAX_ROWS) throw new AppError(`A workbook can contain at most ${MAX_ROWS} data rows`, 422, 'ROW_LIMIT');
  }
  if (!rows.length) throw new AppError('The workbook contains no data rows', 422, 'EMPTY_WORKBOOK');
  return rows;
};

const loadCatalog = async (db, clientId) => {
  const [boards, programs, grades, subjects, chapters, topics, subtopics, sessions, taxonomy] = await Promise.all([
    db.query(`SELECT id, name, code FROM boards WHERE client_id IS NOT DISTINCT FROM $1 AND is_active = TRUE ORDER BY name`, [clientId]),
    db.query(`SELECT id, board_id AS parent_id, name, code FROM programs WHERE client_id IS NOT DISTINCT FROM $1 AND is_active = TRUE ORDER BY name`, [clientId]),
    db.query(`SELECT g.id, g.program_id AS parent_id, g.grade_number, 'Grade ' || g.grade_number AS name FROM grades g JOIN programs p ON p.id = g.program_id WHERE p.client_id IS NOT DISTINCT FROM $1 AND g.is_active = TRUE ORDER BY g.grade_number`, [clientId]),
    db.query(`SELECT s.id, s.grade_id AS parent_id, s.name, s.code FROM subjects s WHERE s.client_id IS NOT DISTINCT FROM $1 AND s.is_active = TRUE ORDER BY s.name`, [clientId]),
    db.query(`SELECT ch.id, ch.subject_id AS parent_id, ch.name FROM chapters ch JOIN subjects s ON s.id = ch.subject_id WHERE s.client_id IS NOT DISTINCT FROM $1 AND ch.is_active = TRUE ORDER BY ch.chapter_number, ch.id`, [clientId]),
    db.query(`SELECT t.id, t.chapter_id AS parent_id, t.name FROM topics t JOIN chapters ch ON ch.id = t.chapter_id JOIN subjects s ON s.id = ch.subject_id WHERE s.client_id IS NOT DISTINCT FROM $1 AND t.is_active = TRUE ORDER BY t.topic_number, t.id`, [clientId]),
    db.query(`SELECT st.id, st.topic_id AS parent_id, st.name FROM subtopics st JOIN topics t ON t.id = st.topic_id JOIN chapters ch ON ch.id = t.chapter_id JOIN subjects s ON s.id = ch.subject_id WHERE s.client_id IS NOT DISTINCT FROM $1 AND st.is_active = TRUE ORDER BY st.display_order, st.id`, [clientId]),
    db.query(`SELECT se.id, se.subtopic_id AS parent_id, se.title AS name FROM sessions se WHERE se.client_id IS NOT DISTINCT FROM $1 ORDER BY se.session_number, se.id`, [clientId]),
    db.query(`SELECT id, taxonomy_type AS type, code, label FROM studio_taxonomy_terms WHERE is_active = TRUE AND (client_id IS NULL OR client_id IS NOT DISTINCT FROM $1) ORDER BY taxonomy_type, label`, [clientId]),
  ]);
  return {
    board: boards.rows, program: programs.rows, grade: grades.rows, subject: subjects.rows,
    chapter: chapters.rows, topic: topics.rows, subtopic: subtopics.rows, session: sessions.rows,
    taxonomy: taxonomy.rows,
  };
};

const candidateView = (item, level) => ({
  id: Number(item.id),
  ...(item.parent_id !== undefined && item.parent_id !== null ? { parent_id: Number(item.parent_id) } : {}),
  name: level === 'grade' ? `Grade ${item.grade_number}` : item.name,
  ...(item.code ? { code: item.code } : {}),
});

const matchField = ({ level, value, code, parentId, catalog, required = true }) => {
  const options = catalog[level].filter((item) => level === 'board' || !parentId || Number(item.parent_id) === Number(parentId));
  if (!normalize(value)) return { status: required ? 'missing' : 'new', selected_id: null, candidates: options.slice(0, 50).map((item) => candidateView(item, level)) };
  const nameMatches = options.filter((item) => level === 'grade'
    ? Number(item.grade_number) === Number(value)
    : key(item.name) === key(value));
  const codeMatches = code
    ? options.filter((item) => item.code && codeKey(item.code) === codeKey(code))
    : [];
  const exact = code
    ? nameMatches.filter((item) => codeMatches.some((codeItem) => Number(codeItem.id) === Number(item.id)))
    : nameMatches;
  const conflict = code && !exact.length && (nameMatches.length || codeMatches.length);
  const parentResolved = level === 'board' || Boolean(parentId);
  const selected = exact.length === 1 && parentResolved ? exact[0] : null;
  return {
    status: selected ? 'matched' : exact.length || conflict ? 'ambiguous' : 'new',
    selected_id: selected ? Number(selected.id) : null,
    candidates: catalog[level].slice(0, 250).map((item) => candidateView(item, level)),
  };
};

const previewRow = (raw, catalog) => {
  const fields = {};
  let parentId = null;
  const definitions = [
    ['board', 'board_name', 'board_code'], ['program', 'program_name', 'program_code'],
    ['grade', 'grade_number'], ['subject', 'subject_name', 'subject_code'],
    ['chapter', 'chapter_name'], ['topic', 'topic_name'], ['subtopic', 'subtopic_name'],
  ];
  for (const [level, nameField, codeField] of definitions) {
    const match = matchField({ level, value: raw[nameField], code: codeField ? raw[codeField] : '', parentId, catalog });
    fields[level] = match;
    parentId = match.selected_id;
  }
  fields.session = matchField({ level: 'session', value: raw.session_name, parentId, catalog });
  const missing = definitions.filter(([, field]) => !normalize(raw[field])).map(([, field]) => field);
  if (!normalize(raw.session_name)) missing.push('session_name');
  const unresolved = Object.values(fields).some((field) => ['missing', 'ambiguous'].includes(field.status));
  return {
    ...raw,
    topic_pedagogy_names: splitNames(raw.topic_pedagogy_names).join(', '),
    topic_bloom_level_names: splitNames(raw.topic_bloom_level_names).join(', '),
    topic_target_exam_names: splitNames(raw.topic_target_exam_names).join(', '),
    fields,
    action: fields.session.status === 'matched' ? 'skip' : 'import',
    status: missing.length || unresolved ? 'issue' : fields.session.status === 'matched' ? 'duplicate' : 'ready',
    errors: missing.map((field) => `${field.replaceAll('_', ' ')} is required`),
  };
};

export const previewCurriculumImport = async ({ file, user, db = { query: dbQuery } }) => {
  assertAuthor(user);
  const rows = await parseWorkbook(file);
  const catalog = await loadCatalog(db, scopedClientId(user));
  const previewRows = rows.map((row) => previewRow(row, catalog));
  return {
    rows: previewRows,
    taxonomy_terms: catalog.taxonomy.map((term) => ({ id: Number(term.id), type: term.type, code: term.code, label: term.label })),
    summary: {
      total: previewRows.length,
      ready: previewRows.filter((row) => row.status === 'ready').length,
      issues: previewRows.filter((row) => row.status === 'issue').length,
      duplicates: previewRows.filter((row) => row.status === 'duplicate').length,
    },
  };
};

const required = (value, label, max = 250) => {
  const result = normalize(value);
  if (!result) throw new AppError(`${label} is required`, 422, 'VALIDATION_FAILED');
  if (result.length > max) throw new AppError(`${label} must be ${max} characters or fewer`, 422, 'VALIDATION_FAILED');
  return result;
};
const selectedId = (row, level) => {
  const value = Number(row?.fields?.[level]?.selected_id);
  return Number.isInteger(value) && value > 0 ? value : null;
};
const assertSelected = async (db, table, id, parentColumn, parentId, clientClause = '', params = []) => {
  const parentCheck = parentColumn ? ` AND ${parentColumn} = $2` : '';
  const result = await db.query(`SELECT id FROM ${table} WHERE id = $1${parentCheck}${clientClause}`, parentColumn ? [id, parentId, ...params] : [id, ...params]);
  if (!result.rows[0]) throw new AppError(`Selected ${table.replaceAll('_', ' ')} entry is no longer valid`, 409, 'STALE_IMPORT_SELECTION');
  return id;
};

const resolveTaxonomy = async (db, type, values, user, clientId) => {
  const ids = [];
  for (const value of splitNames(values)) {
    const code = taxonomyCode(value);
    let result = await db.query(`SELECT id FROM studio_taxonomy_terms WHERE taxonomy_type = $1 AND code = $2 AND is_active = TRUE AND (client_id IS NULL OR client_id IS NOT DISTINCT FROM $3) ORDER BY client_id NULLS LAST LIMIT 1`, [type, code, clientId]);
    if (!result.rows[0]) {
      result = await db.query(`INSERT INTO studio_taxonomy_terms (client_id, taxonomy_type, code, label, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [clientId, type, code, value, user?.id || null]);
    }
    ids.push(Number(result.rows[0].id));
  }
  return ids;
};

const findOrCreate = async ({ db, table, selected, parentColumn, parentId, name, code, clientId, numberColumn }) => {
  if (selected) {
    const clientClause = ['boards', 'programs', 'subjects'].includes(table) ? ` AND client_id IS NOT DISTINCT FROM $${parentColumn ? 3 : 2}` : '';
    return assertSelected(db, table, selected, parentColumn, parentId, clientClause, clientClause ? [clientId] : []);
  }
  const normalizedName = required(name, `${table.slice(0, -1)} name`);
  const values = [];
  let where = '';
  if (table === 'boards') {
    where = `client_id IS NOT DISTINCT FROM $1 AND (LOWER(name) = LOWER($2) OR LOWER(code) = LOWER($3))`;
    values.push(clientId, normalizedName, required(code, 'Board code', 40));
  } else if (table === 'programs') {
    where = `board_id = $1 AND client_id IS NOT DISTINCT FROM $2 AND (LOWER(name) = LOWER($3) OR LOWER(code) = LOWER($4))`;
    values.push(parentId, clientId, normalizedName, required(code, 'Program code', 40));
  } else if (table === 'grades') {
    where = `program_id = $1 AND grade_number = $2`;
    values.push(parentId, Number(name));
  } else if (table === 'subjects') {
    where = `grade_id = $1 AND client_id IS NOT DISTINCT FROM $2 AND (LOWER(name) = LOWER($3) OR LOWER(code) = LOWER($4))`;
    values.push(parentId, clientId, normalizedName, required(code, 'Subject code', 20));
  } else {
    where = `${parentColumn} = $1 AND LOWER(name) = LOWER($2)`;
    values.push(parentId, normalizedName);
  }
  let result = await db.query(`SELECT id FROM ${table} WHERE ${where} ORDER BY id LIMIT 1`, values);
  if (result.rows[0]) return Number(result.rows[0].id);
  if (table === 'boards') result = await db.query(`INSERT INTO boards (client_id, name, code) VALUES ($1, $2, $3) RETURNING id`, values);
  if (table === 'programs') result = await db.query(`INSERT INTO programs (board_id, client_id, school_id, name, code) VALUES ($1, $2, NULL, $3, $4) RETURNING id`, values);
  if (table === 'grades') {
    const gradeNumber = Number(name);
    result = await db.query(
      `INSERT INTO grades (program_id, grade_number, name) VALUES ($1, $2, $3) RETURNING id`,
      [parentId, gradeNumber, `Grade ${gradeNumber}`],
    );
  }
  if (table === 'subjects') result = await db.query(`INSERT INTO subjects (grade_id, client_id, name, code, display_order) VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM subjects WHERE grade_id = $1)) RETURNING id`, values);
  if (table === 'chapters' || table === 'topics' || table === 'subtopics') {
    const next = await db.query(`SELECT COALESCE(MAX(${numberColumn}), 0) + 1 AS value FROM ${table} WHERE ${parentColumn} = $1`, [parentId]);
    const number = Number(next.rows[0].value);
    const numberName = table === 'chapters' ? 'chapter_number' : table === 'topics' ? 'topic_number' : 'display_order';
    result = await db.query(`INSERT INTO ${table} (${parentColumn}, name, ${numberName}) VALUES ($1, $2, $3) RETURNING id`, [parentId, normalizedName, number]);
  }
  return Number(result.rows[0].id);
};

export const confirmCurriculumImport = async ({ body = {}, user, getDbClient = getClient }) => {
  assertAuthor(user);
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length || rows.length > MAX_ROWS) throw new AppError('No valid import rows were provided', 422, 'ROWS_REQUIRED');
  const clientId = scopedClientId(user);
  const db = await getDbClient();
  const summary = { rows_imported: 0, rows_skipped: 0, sessions_created: 0 };
  try {
    await db.query('BEGIN');
    for (const row of rows) {
      if (row.action === 'skip') { summary.rows_skipped += 1; continue; }
      const boardId = await findOrCreate({ db, table: 'boards', selected: selectedId(row, 'board'), name: row.board_name, code: row.board_code, clientId, user });
      const programId = await findOrCreate({ db, table: 'programs', selected: selectedId(row, 'program'), parentColumn: 'board_id', parentId: boardId, name: row.program_name, code: row.program_code, clientId, user });
      const gradeNumber = Number(row.grade_number);
      if (!Number.isInteger(gradeNumber) || gradeNumber <= 0) throw new AppError(`Row ${row.row_number}: Grade Number must be a positive integer`, 422, 'VALIDATION_FAILED');
      const gradeId = await findOrCreate({ db, table: 'grades', selected: selectedId(row, 'grade'), parentColumn: 'program_id', parentId: programId, name: gradeNumber, clientId, user });
      const subjectId = await findOrCreate({ db, table: 'subjects', selected: selectedId(row, 'subject'), parentColumn: 'grade_id', parentId: gradeId, name: row.subject_name, code: row.subject_code, clientId, user });
      const chapterId = await findOrCreate({ db, table: 'chapters', selected: selectedId(row, 'chapter'), parentColumn: 'subject_id', parentId: subjectId, name: row.chapter_name, numberColumn: 'chapter_number', clientId, user });
      const topicId = await findOrCreate({ db, table: 'topics', selected: selectedId(row, 'topic'), parentColumn: 'chapter_id', parentId: chapterId, name: row.topic_name, numberColumn: 'topic_number', clientId, user });
      const subtopicId = await findOrCreate({ db, table: 'subtopics', selected: selectedId(row, 'subtopic'), parentColumn: 'topic_id', parentId: topicId, name: row.subtopic_name, numberColumn: 'display_order', clientId, user });
      const taxonomyIds = [
        ...await resolveTaxonomy(db, 'pedagogy', row.topic_pedagogy_names, user, clientId),
        ...await resolveTaxonomy(db, 'bloom', row.topic_bloom_level_names, user, clientId),
        ...await resolveTaxonomy(db, 'target_exam', row.topic_target_exam_names, user, clientId),
      ];
      for (const termId of taxonomyIds) {
        await db.query(`INSERT INTO topic_taxonomy_terms (topic_id, term_id, source) VALUES ($1, $2, 'manual') ON CONFLICT DO NOTHING`, [topicId, termId]);
      }
      const sessionName = required(row.session_name, `Row ${row.row_number} Session Name`, 250);
      const existing = selectedId(row, 'session') || (await db.query(`SELECT id FROM sessions WHERE subtopic_id = $1 AND LOWER(title) = LOWER($2) LIMIT 1`, [subtopicId, sessionName])).rows[0]?.id;
      if (existing) { summary.rows_skipped += 1; continue; }
      const next = await db.query(`SELECT COALESCE(MAX(session_number), 0) + 1 AS value FROM sessions WHERE subtopic_id = $1`, [subtopicId]);
      await db.query(`INSERT INTO sessions (client_id, subtopic_id, session_number, title, description, status, revision_no, created_by) VALUES ($1, $2, $3, $4, $5, 'draft', 1, $6)`, [clientId, subtopicId, Number(next.rows[0].value), sessionName, normalize(row.session_description) || null, user?.id || null]);
      summary.rows_imported += 1;
      summary.sessions_created += 1;
    }
    await db.query('COMMIT');
    return summary;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    db.release();
  }
};

export const curriculumImportTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Curriculum and Sessions');
  sheet.columns = HEADERS.map(([, label]) => ({ header: label, key: label, width: Math.max(18, label.length + 3) }));
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.addRow(['CBSE', 'CBSE', 'Future Foundation', 'FF_CBSE', 8, 'Science', 'SCI_8', 'Crop Production', 'Agricultural Practices', 'Inquiry-Based Learning, Demonstration', 'Understand, Apply', 'NEET', 'Soil Preparation', 'Introduction to Soil', 'Basic introduction']);
  sheet.addRow(['', '', '', '', '', '', '', '', '', '', '', '', '', 'Ploughing Methods', 'Different ploughing techniques']);
  sheet.autoFilter = { from: 'A1', to: 'O1' };
  return workbook.xlsx.writeBuffer();
};
