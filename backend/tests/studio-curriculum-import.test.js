import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {
  confirmCurriculumImport,
  curriculumImportTemplate,
  previewCurriculumImport,
} from '../services/studioCurriculumImport.service.js';

const user = { id: 7, role: 'content_authorizer', client_id: 12 };

const workbookFile = async (rows) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Import');
  sheet.addRow([
    'Board Name', 'Board Code', 'Program Name', 'Program Code', 'Grade Number',
    'Subject Name', 'Subject Code', 'Chapter Name', 'Topic Name',
    'Topic Pedagogy Names', 'Topic Bloom Level Names', 'Topic Target Exam Names',
    'Subtopic Name', 'Session Name', 'Session Description',
  ]);
  rows.forEach((row) => sheet.addRow(row));
  return {
    originalname: 'curriculum.xlsx',
    buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
  };
};

test('template uses explicit headings and omits manual order columns', async () => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await curriculumImportTemplate());
  const headers = workbook.worksheets[0].getRow(1).values.slice(1);
  assert.ok(headers.includes('Topic Pedagogy Names'));
  assert.ok(headers.includes('Topic Bloom Level Names'));
  assert.ok(headers.includes('Topic Target Exam Names'));
  assert.ok(headers.includes('Session Name'));
  assert.equal(headers.includes('Chapter Number'), false);
  assert.equal(headers.includes('Topic Number'), false);
  assert.equal(headers.includes('Subtopic Display Order'), false);
});

test('preview inherits blank hierarchy cells for additional Sessions', async () => {
  const file = await workbookFile([
    ['CBSE', 'CBSE', 'Foundation', 'FOUNDATION', 8, 'Science', 'SCI_8', 'Crop Production', 'Agricultural Practices', 'Inquiry', 'Understand, Apply', 'NEET', 'Soil Preparation', 'Introduction to Soil', 'Introduction'],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', 'Ploughing Methods', 'Methods'],
  ]);
  const db = { query: async () => ({ rows: [] }) };
  const result = await previewCurriculumImport({ file, user, db });
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[1].board_name, 'CBSE');
  assert.equal(result.rows[1].subtopic_name, 'Soil Preparation');
  assert.equal(result.rows[1].session_name, 'Ploughing Methods');
  assert.equal(result.rows[1].status, 'ready');
});

test('preview flags a name/code conflict for explicit resolution', async () => {
  const file = await workbookFile([
    ['CBSE', 'WRONG_CODE', 'Foundation', 'FOUNDATION', 8, 'Science', 'SCI_8', 'Crop Production', 'Agricultural Practices', '', '', '', 'Soil Preparation', 'Introduction', ''],
  ]);
  const db = {
    query: async (sql) => sql.includes('FROM boards')
      ? { rows: [{ id: 1, name: 'CBSE', code: 'CBSE' }] }
      : { rows: [] },
  };
  const result = await previewCurriculumImport({ file, user, db });
  assert.equal(result.rows[0].fields.board.status, 'ambiguous');
  assert.equal(result.rows[0].status, 'issue');
  assert.equal(result.rows[0].fields.board.candidates[0].name, 'CBSE');
});

test('confirmation creates the hierarchy and Session in one transaction', async () => {
  const statements = [];
  let nextId = 1;
  let released = false;
  const db = {
    query: async (sql) => {
      statements.push(sql);
      const normalizedSql = String(sql).trim().toLowerCase();
      if (normalizedSql.startsWith('select coalesce(max(')) return { rows: [{ value: 1 }] };
      if (normalizedSql.startsWith('select id from')) return { rows: [] };
      if (normalizedSql.startsWith('insert into') && normalizedSql.includes('returning id')) {
        return { rows: [{ id: nextId++ }] };
      }
      return { rows: [] };
    },
    release: () => { released = true; },
  };
  const emptyMatch = { status: 'new', selected_id: null, candidates: [] };
  const row = {
    row_number: 2,
    board_name: 'CBSE', board_code: 'CBSE',
    program_name: 'Foundation', program_code: 'FOUNDATION', grade_number: '8',
    subject_name: 'Science', subject_code: 'SCI_8', chapter_name: 'Crop Production',
    topic_name: 'Agricultural Practices', topic_pedagogy_names: '',
    topic_bloom_level_names: '', topic_target_exam_names: '',
    subtopic_name: 'Soil Preparation', session_name: 'Introduction',
    session_description: 'Overview', action: 'import',
    fields: Object.fromEntries(['board', 'program', 'grade', 'subject', 'chapter', 'topic', 'subtopic', 'session'].map((level) => [level, { ...emptyMatch }])),
  };
  const result = await confirmCurriculumImport({ body: { rows: [row] }, user, getDbClient: async () => db });
  assert.deepEqual(result, { rows_imported: 1, rows_skipped: 0, sessions_created: 1 });
  assert.equal(statements[0], 'BEGIN');
  assert.equal(statements.at(-1), 'COMMIT');
  assert.ok(statements.some((sql) => sql.includes('INSERT INTO sessions')));
  assert.ok(statements.some((sql) => sql.includes('INSERT INTO grades') && sql.includes('VALUES ($1, $2, $3)')));
  assert.equal(released, true);
});
