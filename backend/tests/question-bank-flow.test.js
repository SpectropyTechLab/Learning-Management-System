import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../config/db.js';
import {
  approveQuestion,
  archiveQuestionFolderQuestions,
  bulkUploadQuestions,
  createQuestion,
  getQuestionById,
  listQuestions,
  rejectQuestion,
  updateQuestion,
} from '../services/questions.service.js';

const makeRes = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const parseInsertColumns = (sql) => {
  const match = sql.match(/insert into questions \((.+?)\)\s+values/is);
  if (!match) return [];
  return match[1].split(',').map((column) => column.trim());
};

const parsePassageInsertColumns = (sql) => {
  const match = sql.match(/insert into comprehension_passages \((.+?)\)\s+values/is);
  if (!match) return [];
  return match[1].split(',').map((column) => column.trim());
};

const createMockDb = () => {
  const data = {
    programs: [
      { id: 401, client_id: 101, school_id: 10001, name: 'STEM' },
      { id: 402, client_id: 202, school_id: 10002, name: 'STEM' },
    ],
    grades: [
      { id: 501, program_id: 401, grade_number: 11 },
      { id: 502, program_id: 402, grade_number: 11 },
    ],
    subjects: [
      { id: 1001, client_id: 101, grade_id: 501, program_id: 401, name: 'Physics' },
      { id: 1002, client_id: 202, grade_id: 502, program_id: 402, name: 'Physics' },
    ],
    chapters: [
      { id: 2001, subject_id: 1001, client_id: 101, name: 'Thermodynamics' },
      { id: 2002, subject_id: 1002, client_id: 202, name: 'Thermodynamics' },
    ],
    questionFolders: [
      { id: 701, client_id: 101, school_id: 10001, is_active: true, name: 'Tenant A Folder' },
      { id: 702, client_id: 101, school_id: 10001, is_active: true, name: 'Tenant A Folder Two' },
      { id: 801, client_id: 202, school_id: 10002, is_active: true, name: 'Tenant B Folder' },
    ],
    comprehensionPassages: [
      {
        id: 901,
        client_id: 101,
        school_id: 10001,
        title: { html: '<p>Heat Transfer Passage</p>' },
        passage_content: { html: '<p>Passage body</p>' },
        subject_id: 1001,
        chapter_id: 2001,
        topic_id: null,
        created_by: 11,
      },
    ],
    questions: [],
    nextQuestionId: 1,
    nextPassageId: 1000,
  };
  let transactionSnapshot = null;

  const enrichQuestion = (question) => {
    const subject = data.subjects.find((item) => item.id === question.subject_id) ?? null;
    const program = data.programs.find((item) => item.id === subject?.program_id) ?? null;
    return {
      ...question,
      grade_id: subject?.grade_id ?? null,
      program_id: subject?.program_id ?? null,
      program_client_id: program?.client_id ?? question.client_id ?? null,
      program_school_id: program?.school_id ?? null,
    };
  };

  const applyQuestionFilters = (sql, params) => {
    const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();
    let rows = [...data.questions];

    const clientMatch = normalized.match(/q\.client_id = \$(\d+)/);
    if (clientMatch) {
      const clientId = Number(params[Number(clientMatch[1]) - 1]);
      rows = rows.filter((question) => Number(question.client_id) === clientId);
    }

    if (normalized.includes('q.school_id is null')) {
      rows = rows.filter((question) => question.school_id == null);
    }

    const ownedProgramSchoolMatch = normalized.match(/owned_programs\.school_id = any\(\$(\d+)\)/);
    if (ownedProgramSchoolMatch) {
      const schoolIds = params[Number(ownedProgramSchoolMatch[1]) - 1] ?? [];
      rows = rows.filter((question) => {
        const subject = data.subjects.find((item) => item.id === question.subject_id);
        const program = data.programs.find((item) => item.id === subject?.program_id);
        return schoolIds.map(Number).includes(Number(program?.school_id));
      });
    }

    const idMatch = normalized.match(/q\.id = \$(\d+)/);
    if (idMatch) {
      const questionId = Number(params[Number(idMatch[1]) - 1]);
      rows = rows.filter((question) => Number(question.id) === questionId);
    }

    const createdByMatch = normalized.match(/\(q\.status = 'approved' or q\.created_by = \$(\d+)\)/);
    if (createdByMatch) {
      const userId = Number(params[Number(createdByMatch[1]) - 1]);
      rows = rows.filter((question) => question.status === 'approved' || Number(question.created_by) === userId);
    }

    if (normalized.includes("q.status <> 'archived'")) {
      rows = rows.filter((question) => question.status !== 'archived');
    }

    const folderMatch = normalized.match(/q\.folder_id = \$(\d+)/);
    if (folderMatch) {
      const folderId = Number(params[Number(folderMatch[1]) - 1]);
      rows = rows.filter((question) => Number(question.folder_id) === folderId);
    }

    const searchMatch = normalized.match(/plainto_tsquery\('simple', \$(\d+)\)/);
    if (searchMatch) {
      const term = String(params[Number(searchMatch[1]) - 1] ?? '').trim().toLowerCase();
      rows = rows.filter((question) => {
        const haystack = JSON.stringify(question.question_text) + ' ' + JSON.stringify(question.options);
        return haystack.toLowerCase().includes(term);
      });
    }

    return rows.map(enrichQuestion);
  };

  return {
    comprehensionPassages: data.comprehensionPassages,
    async query(text, params = []) {
      const sql = String(text);
      const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();

      if (normalized === 'begin') {
        transactionSnapshot = {
          questions: structuredClone(data.questions),
          comprehensionPassages: structuredClone(data.comprehensionPassages),
          nextQuestionId: data.nextQuestionId,
          nextPassageId: data.nextPassageId,
        };
        return { rows: [] };
      }

      if (normalized === 'commit') {
        transactionSnapshot = null;
        return { rows: [] };
      }

      if (normalized === 'rollback') {
        if (transactionSnapshot) {
          data.questions.splice(0, data.questions.length, ...transactionSnapshot.questions);
          data.comprehensionPassages.splice(
            0,
            data.comprehensionPassages.length,
            ...transactionSnapshot.comprehensionPassages
          );
          data.nextQuestionId = transactionSnapshot.nextQuestionId;
          data.nextPassageId = transactionSnapshot.nextPassageId;
          transactionSnapshot = null;
        }
        return { rows: [] };
      }

      if (normalized.startsWith('create table if not exists question_bank_school_assignments')) {
        return { rows: [] };
      }

      if (normalized.startsWith('create index if not exists idx_question_bank_school_assignments_')) {
        return { rows: [] };
      }

      if (normalized.includes("from information_schema.columns") && normalized.includes("table_name = 'questions'")) {
        return {
          rows: [
            { column_name: 'comprehension_passage' },
            { column_name: 'comprehension_questions' },
            { column_name: 'comprehension_passage_id' },
            { column_name: 'folder_id' },
          ],
        };
      }

      if (normalized.includes("from information_schema.tables") && normalized.includes("table_name = 'comprehension_passages'")) {
        return { rows: [{ '?column?': 1 }] };
      }

      if (
        normalized.includes('select pg_get_constraintdef(c.oid) as definition') &&
        normalized.includes("c.conname = 'questions_question_type_check'")
      ) {
        return {
          rows: [{
            definition: "CHECK (question_type::text = ANY (ARRAY['mcq_single', 'assertion_reasoning']))",
          }],
        };
      }

      if (normalized.startsWith('select id, client_id, school_id from programs where id = $1 limit 1')) {
        const program = data.programs.find((item) => Number(item.id) === Number(params[0]));
        return {
          rows: program
            ? [{ id: program.id, client_id: program.client_id, school_id: program.school_id }]
            : [],
        };
      }

      if (normalized.startsWith('select id from programs where id = $1 and client_id = $2')) {
        const program = data.programs.find(
          (item) => Number(item.id) === Number(params[0]) && Number(item.client_id) === Number(params[1]),
        );
        return { rows: program ? [{ id: program.id }] : [] };
      }

      if (
        normalized.startsWith('select g.id, g.program_id from grades g join programs p on p.id = g.program_id') &&
        normalized.includes('where g.grade_number = $1 and g.program_id = $2 and p.client_id = $3')
      ) {
        const grade = data.grades.find(
          (item) =>
            Number(item.grade_number) === Number(params[0]) &&
            Number(item.program_id) === Number(params[1]),
        );
        const program = data.programs.find((item) => Number(item.id) === Number(grade?.program_id));
        return {
          rows: grade && Number(program?.client_id) === Number(params[2])
            ? [{ id: grade.id, program_id: grade.program_id }]
            : [],
        };
      }

      if (normalized.includes('from subjects s left join grades g on g.id = s.grade_id where s.id = $1')) {
        const subject = data.subjects.find((item) => item.id === Number(params[0]));
        if (!subject) return { rows: [] };
        if (params[1] !== undefined && Number(subject.client_id) !== Number(params[1])) return { rows: [] };
        return {
          rows: [
            {
              id: subject.id,
              grade_id: subject.grade_id,
              program_id: subject.program_id,
              client_id: subject.client_id,
            },
          ],
        };
      }

      if (normalized.includes('from chapters c join subjects s on s.id = c.subject_id where c.id = $1')) {
        const chapter = data.chapters.find((item) => item.id === Number(params[0]));
        if (!chapter) return { rows: [] };
        if (params[1] !== undefined && Number(chapter.client_id) !== Number(params[1])) return { rows: [] };
        return {
          rows: [
            {
              id: chapter.id,
              subject_id: chapter.subject_id,
              client_id: chapter.client_id,
            },
          ],
        };
      }

      if (normalized.startsWith('select school_id from school_memberships where user_id = $1')) {
        const schoolIdByUserId = new Map([
          [11, 10001],
          [22, 10002],
          [31, 10001],
          [32, 10002],
        ]);
        const schoolId = schoolIdByUserId.get(Number(params[0]));
        return { rows: schoolId ? [{ school_id: schoolId }] : [] };
      }

      if (normalized.startsWith('select id, client_id, school_id, is_active from question_folders where id = $1 limit 1')) {
        const folder = data.questionFolders.find((item) => Number(item.id) === Number(params[0]));
        return { rows: folder ? [{ ...folder }] : [] };
      }

      if (
        normalized.startsWith("update questions set status = 'archived', updated_at = now()") &&
        normalized.includes('where folder_id = $1')
      ) {
        const folderId = Number(params[0]);
        const clientId = params[1] == null ? null : Number(params[1]);
        const archivedRows = [];
        data.questions.forEach((question) => {
          const matchesFolder = Number(question.folder_id) === folderId;
          const matchesClient = clientId == null || Number(question.client_id) === clientId;
          if (matchesFolder && matchesClient && question.status !== 'archived') {
            question.status = 'archived';
            question.updated_at = new Date(Date.UTC(2026, 2, 25, 12, 30, 0)).toISOString();
            archivedRows.push({ id: question.id });
          }
        });
        return { rows: archivedRows };
      }

      if (normalized.startsWith('insert into questions (')) {
        const columns = parseInsertColumns(sql);
        const jsonColumns = new Set([
          'question_text',
          'options',
          'correct_answer',
          'solution',
          'comprehension_passage',
          'comprehension_questions',
          'category',
        ]);

        const record = { id: data.nextQuestionId++, approved_by: null, approved_at: null };
        columns.forEach((column, index) => {
          const value = params[index];
          record[column] =
            jsonColumns.has(column) && typeof value === 'string' ? JSON.parse(value) : value;
        });
        record.created_at = new Date(Date.UTC(2026, 2, 25, 10, data.questions.length)).toISOString();
        record.updated_at = record.created_at;
        data.questions.push(record);
        return { rows: [{ id: record.id }] };
      }

      if (normalized.startsWith('insert into comprehension_passages (')) {
        const columns = parsePassageInsertColumns(sql);
        const jsonColumns = new Set(['title', 'passage_content']);
        const record = { id: data.nextPassageId++ };
        columns.forEach((column, index) => {
          const value = params[index];
          record[column] =
            jsonColumns.has(column) && typeof value === 'string' ? JSON.parse(value) : value;
        });
        data.comprehensionPassages.push(record);
        return { rows: [{ ...record }] };
      }

      if (normalized.startsWith('select * from comprehension_passages where id = $1')) {
        const passage = data.comprehensionPassages.find((item) => Number(item.id) === Number(params[0]));
        return { rows: passage ? [{ ...passage }] : [] };
      }

      if (normalized.startsWith('select id, title, passage_content from comprehension_passages where id = any($1::int[])')) {
        const ids = Array.isArray(params[0]) ? params[0].map((entry) => Number(entry)) : [];
        return {
          rows: data.comprehensionPassages
            .filter((item) => ids.includes(Number(item.id)))
            .map((item) => ({
              id: item.id,
              title: item.title,
              passage_content: item.passage_content,
            })),
        };
      }

      if (
        normalized.includes('select q.*, s.grade_id, g.program_id') &&
        normalized.includes('from questions q') &&
        normalized.includes('where q.id = $1') &&
        !normalized.includes('order by')
      ) {
        const rows = applyQuestionFilters(sql, params);
        return { rows: rows.slice(0, 1) };
      }

      if (normalized.startsWith('select count(*) as total from questions q')) {
        const rows = applyQuestionFilters(sql, params);
        return { rows: [{ total: String(rows.length) }] };
      }

      if (
        normalized.includes('select q.*, s.grade_id, g.program_id') &&
        normalized.includes('from questions q') &&
        normalized.includes('order by q.created_at desc')
      ) {
        const rows = applyQuestionFilters(sql, params)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const pageSize = Number(params[params.length - 2]);
        const offset = Number(params[params.length - 1]);
        return { rows: rows.slice(offset, offset + pageSize) };
      }

      if (normalized.startsWith('select * from questions where id = $1')) {
        const question = data.questions.find((item) => Number(item.id) === Number(params[0]));
        return { rows: question ? [{ ...question }] : [] };
      }

      if (normalized.startsWith("update questions set status = 'approved'")) {
        const question = data.questions.find((item) => Number(item.id) === Number(params[0]));
        if (!question || question.status !== 'draft') return { rows: [] };
        question.status = 'approved';
        question.approved_by = params[1];
        question.approved_at = new Date(Date.UTC(2026, 2, 25, 11, 0, 0)).toISOString();
        question.rejection_reason = null;
        question.updated_at = question.approved_at;
        return { rows: [{ ...question }] };
      }

      if (normalized.startsWith("update questions set status = 'rejected'")) {
        const question = data.questions.find((item) => Number(item.id) === Number(params[0]));
        if (!question || question.status !== 'draft') return { rows: [] };
        question.status = 'rejected';
        question.approved_by = params[1];
        question.approved_at = null;
        question.rejection_reason = params[2];
        question.updated_at = new Date(Date.UTC(2026, 2, 25, 11, 15, 0)).toISOString();
        return { rows: [{ ...question }] };
      }

      if (
        normalized.startsWith('update questions set ') &&
        normalized.includes('updated_at = now() where id = $') &&
        !normalized.includes("status = 'approved'") &&
        !normalized.includes("status = 'rejected'")
      ) {
        const questionId = Number(params[params.length - 1]);
        const question = data.questions.find((item) => Number(item.id) === questionId);
        if (!question) return { rows: [] };

        const setMatch = sql.match(/update questions set (.+), updated_at = now\(\) where id = \$\d+/is);
        const assignments = setMatch
          ? setMatch[1].split(',').map((part) => part.trim()).filter(Boolean)
          : [];
        const jsonColumns = new Set([
          'question_text',
          'options',
          'correct_answer',
          'solution',
          'comprehension_passage',
          'comprehension_questions',
          'category',
        ]);

        assignments.forEach((assignment, index) => {
          const columnMatch = assignment.match(/^([a-z_]+)\s*=\s*\$\d+$/i);
          if (!columnMatch) return;
          const column = columnMatch[1];
          const value = params[index];
          question[column] =
            jsonColumns.has(column) && typeof value === 'string' ? JSON.parse(value) : value;
        });

        question.updated_at = new Date(Date.UTC(2026, 2, 25, 12, 0, 0)).toISOString();
        return { rows: [{ id: question.id }] };
      }

      throw new Error(`Unhandled mock query: ${normalized}`);
    },
    async connect() {
      return {
        query: this.query.bind(this),
        release() {},
      };
    },
  };
};

test('Question Bank flow: create, approve, search, and isolate tenants', async (t) => {
  const originalQuery = pool.query.bind(pool);
  const originalConnect = pool.connect.bind(pool);
  const mockDb = createMockDb();
  pool.query = mockDb.query.bind(mockDb);
  pool.connect = mockDb.connect.bind(mockDb);
  t.after(() => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
  });

  const teacherTenantA = { id: 11, role: 'teacher', client_id: 101 };
  const teacherTenantB = { id: 22, role: 'teacher', client_id: 202 };
  const adminTenantA = { id: 31, role: 'school_owner', client_id: 101 };
  const adminTenantB = { id: 32, role: 'school_owner', client_id: 202 };

  const createReq = {
    user: teacherTenantA,
    body: {
      question_type: 'mcq_single',
      question_text: { html: '<p>Thermo test question</p>' },
      options: [
        { id: 'opt-1', text: 'Heat energy' },
        { id: 'opt-2', text: 'Sound energy' },
      ],
      correct_answer: { answer_ids: ['opt-1'] },
      subject_id: 1001,
      chapter_id: 2001,
      topic_id: null,
      difficulty_level: 'medium',
      marks_positive: 4,
      marks_negative: 1,
      exam_tags: ['tenant-a', 'physics'],
      solution: { html: '<p>Because thermodynamics deals with heat.</p>' },
    },
  };
  const createRes = makeRes();

  await createQuestion(createReq, createRes);

  assert.equal(createRes.statusCode, 201);
  assert.equal(createRes.body.status, 'draft');
  assert.equal(createRes.body.client_id, 101);
  assert.equal(createRes.body.created_by, 11);
  assert.equal(createRes.body.question_text.html, '<p>Thermo test question</p>');

  const ownDraftSearchRes = makeRes();
  await listQuestions(
    {
      user: teacherTenantA,
      query: { q: 'thermo', page: '1', page_size: '20' },
    },
    ownDraftSearchRes
  );

  assert.equal(ownDraftSearchRes.statusCode, 200);
  assert.equal(ownDraftSearchRes.body.total, 1);
  assert.equal(ownDraftSearchRes.body.data[0].status, 'draft');

  const crossTenantDraftSearchRes = makeRes();
  await listQuestions(
    {
      user: teacherTenantB,
      query: { q: 'thermo', page: '1', page_size: '20' },
    },
    crossTenantDraftSearchRes
  );

  assert.equal(crossTenantDraftSearchRes.statusCode, 200);
  assert.equal(crossTenantDraftSearchRes.body.total, 0);

  const wrongTenantApproveRes = makeRes();
  await approveQuestion(
    {
      user: adminTenantB,
      params: { id: String(createRes.body.id) },
    },
    wrongTenantApproveRes
  );

  assert.equal(wrongTenantApproveRes.statusCode, 403);
  assert.equal(wrongTenantApproveRes.body.error, 'Access denied');

  const approveRes = makeRes();
  await approveQuestion(
    {
      user: adminTenantA,
      params: { id: String(createRes.body.id) },
    },
    approveRes
  );

  assert.equal(approveRes.statusCode, 200);
  assert.equal(approveRes.body.status, 'approved');
  assert.equal(approveRes.body.approved_by, 31);

  const approvedSearchRes = makeRes();
  await listQuestions(
    {
      user: teacherTenantA,
      query: { q: 'thermo', page: '1', page_size: '20' },
    },
    approvedSearchRes
  );

  assert.equal(approvedSearchRes.statusCode, 200);
  assert.equal(approvedSearchRes.body.total, 1);
  assert.equal(approvedSearchRes.body.data[0].status, 'approved');

  const crossTenantApprovedSearchRes = makeRes();
  await listQuestions(
    {
      user: teacherTenantB,
      query: { q: 'thermo', page: '1', page_size: '20' },
    },
    crossTenantApprovedSearchRes
  );

  assert.equal(crossTenantApprovedSearchRes.statusCode, 200);
  assert.equal(crossTenantApprovedSearchRes.body.total, 0);

  const tenantAGetRes = makeRes();
  await getQuestionById(
    {
      user: teacherTenantA,
      params: { id: String(createRes.body.id) },
    },
    tenantAGetRes
  );

  assert.equal(tenantAGetRes.statusCode, 200);
  assert.equal(tenantAGetRes.body.id, createRes.body.id);

  const tenantBGetRes = makeRes();
  await getQuestionById(
    {
      user: teacherTenantB,
      params: { id: String(createRes.body.id) },
    },
    tenantBGetRes
  );

  assert.equal(tenantBGetRes.statusCode, 404);
  assert.equal(tenantBGetRes.body.error, 'Question not found');
});

test('Question rejection clears approval fields and remains atomic', async (t) => {
  const originalQuery = pool.query.bind(pool);
  const originalConnect = pool.connect.bind(pool);
  const mockDb = createMockDb();
  pool.query = mockDb.query.bind(mockDb);
  pool.connect = mockDb.connect.bind(mockDb);
  t.after(() => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
  });

  const teacherTenantA = { id: 11, role: 'teacher', client_id: 101 };
  const adminTenantA = { id: 31, role: 'school_owner', client_id: 101 };

  const createRes = makeRes();
  await createQuestion(
    {
      user: teacherTenantA,
      body: {
        question_type: 'mcq_single',
        question_text: { html: '<p>Reject me</p>' },
        options: [
          { id: 'opt-1', text: 'A' },
          { id: 'opt-2', text: 'B' },
        ],
        correct_answer: { answer_ids: ['opt-1'] },
        subject_id: 1001,
        chapter_id: 2001,
        difficulty_level: 'medium',
        marks_positive: 4,
        marks_negative: 1,
      },
    },
    createRes
  );

  assert.equal(createRes.statusCode, 201);

  const rejectRes = makeRes();
  await rejectQuestion(
    {
      user: adminTenantA,
      params: { id: String(createRes.body.id) },
      body: { reason: 'Needs correction' },
    },
    rejectRes
  );

  assert.equal(rejectRes.statusCode, 200);
  assert.equal(rejectRes.body.status, 'rejected');
  assert.equal(rejectRes.body.approved_at, null);
  assert.equal(rejectRes.body.rejection_reason, 'Needs correction');

  const approveAfterRejectRes = makeRes();
  await approveQuestion(
    {
      user: adminTenantA,
      params: { id: String(createRes.body.id) },
    },
    approveAfterRejectRes
  );

  assert.equal(approveAfterRejectRes.statusCode, 400);
  assert.equal(approveAfterRejectRes.body.error, 'Only draft questions can be approved');
});

test('Question scoring_mode persists on create and update', async (t) => {
  const originalQuery = pool.query.bind(pool);
  const originalConnect = pool.connect.bind(pool);
  const mockDb = createMockDb();
  pool.query = mockDb.query.bind(mockDb);
  pool.connect = mockDb.connect.bind(mockDb);
  t.after(() => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
  });

  const teacherTenantA = { id: 11, role: 'teacher', client_id: 101 };

  const createRes = makeRes();
  await createQuestion(
    {
      user: teacherTenantA,
      body: {
        question_type: 'mcq_multiple',
        question_text: { html: '<p>Select heat transfer modes</p>' },
        options: [
          { id: 'opt-1', text: 'Conduction' },
          { id: 'opt-2', text: 'Convection' },
          { id: 'opt-3', text: 'Reflection' },
        ],
        correct_answer: { answer_ids: ['opt-1', 'opt-2'] },
        scoring_mode: 'partial',
        subject_id: 1001,
        chapter_id: 2001,
        difficulty_level: 'medium',
        marks_positive: 4,
        marks_negative: 1,
      },
    },
    createRes
  );

  assert.equal(createRes.statusCode, 201);
  assert.equal(createRes.body.scoring_mode, 'partial');

  const updateRes = makeRes();
  await updateQuestion(
    {
      user: teacherTenantA,
      params: { id: String(createRes.body.id) },
      body: {
        scoring_mode: 'mixed',
      },
    },
    updateRes
  );

  assert.equal(updateRes.statusCode, 200);
  assert.equal(updateRes.body.scoring_mode, 'mixed');
});

test('Question category persists on create and update', async (t) => {
  const originalQuery = pool.query.bind(pool);
  const mockDb = createMockDb();
  pool.query = mockDb.query.bind(mockDb);
  t.after(() => {
    pool.query = originalQuery;
  });

  const teacherTenantA = { id: 11, role: 'teacher', client_id: 101 };

  const createRes = makeRes();
  await createQuestion(
    {
      user: teacherTenantA,
      body: {
        question_type: 'mcq_single',
        question_text: { html: '<p>Find the referenced direction</p>' },
        options: [
          { id: 'opt-1', text: 'North' },
          { id: 'opt-2', text: 'South' },
        ],
        correct_answer: { answer_ids: ['opt-1'] },
        category: 'direct question',
        subject_id: 1001,
        chapter_id: 2001,
      },
    },
    createRes
  );

  assert.equal(createRes.statusCode, 201);
  assert.equal(createRes.body.category, 'direct question');

  const updateRes = makeRes();
  await updateQuestion(
    {
      user: teacherTenantA,
      params: { id: String(createRes.body.id) },
      body: {
        category: 'reference question',
      },
    },
    updateRes
  );

  assert.equal(updateRes.statusCode, 200);
  assert.equal(updateRes.body.category, 'reference question');
});

test('Question can link to a comprehension passage and returns passage summary', async (t) => {
  const originalQuery = pool.query.bind(pool);
  const originalConnect = pool.connect.bind(pool);
  const mockDb = createMockDb();
  pool.query = mockDb.query.bind(mockDb);
  pool.connect = mockDb.connect.bind(mockDb);
  t.after(() => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
  });

  const teacherTenantA = { id: 11, role: 'teacher', client_id: 101 };

  const createRes = makeRes();
  await createQuestion(
    {
      user: teacherTenantA,
      body: {
        question_type: 'mcq_single',
        question_text: { html: '<p>Which mode transfers heat through solids?</p>' },
        options: [
          { id: 'opt-1', text: 'Conduction' },
          { id: 'opt-2', text: 'Diffusion' },
        ],
        correct_answer: { answer_ids: ['opt-1'] },
        comprehension_passage_id: 901,
        subject_id: 1001,
        chapter_id: 2001,
        difficulty_level: 'medium',
        marks_positive: 4,
        marks_negative: 1,
      },
    },
    createRes
  );

  assert.equal(createRes.statusCode, 201);
  assert.equal(createRes.body.comprehension_passage_id, 901);
  assert.equal(createRes.body.comprehension.id, 901);
  assert.equal(createRes.body.comprehension.passage_content.html, '<p>Passage body</p>');

  const updateRes = makeRes();
  await updateQuestion(
    {
      user: teacherTenantA,
      params: { id: String(createRes.body.id) },
      body: {
        comprehension_passage_id: null,
      },
    },
    updateRes
  );

  assert.equal(updateRes.statusCode, 200);
  assert.equal(updateRes.body.comprehension_passage_id, null);
  assert.equal(updateRes.body.comprehension, undefined);
});

test('Bulk upload can create one linked passage and reuse it across multiple child questions', async (t) => {
  const originalQuery = pool.query.bind(pool);
  const originalConnect = pool.connect.bind(pool);
  const mockDb = createMockDb();
  pool.query = mockDb.query.bind(mockDb);
  pool.connect = mockDb.connect.bind(mockDb);
  t.after(() => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
  });

  const teacherTenantA = { id: 11, role: 'teacher', client_id: 101 };

  const bulkReq = {
    user: teacherTenantA,
    body: {},
    file: {
      originalname: 'linked-passage.csv',
      buffer: Buffer.from(
        [
          'Type,Question,Options,Correct Answer,Solution,Program,Grade,Subject,Chapter,Topic,Has Comprehension,Passage Key,Passage Title,Passage Content,Passage Action',
          'mcq_single,What is the main idea?,Forest life;Ocean life;Desert life;Mountain life,A,The passage focuses on forest life.,401,11,1001,2001,,yes,P1,Rainforest Reading,"<p>Rainforests support rich biodiversity.</p>",create',
          'mcq_single,Which habitat is described?,Forest;Ocean;Desert;Tundra,A,The habitat is forest.,401,11,1001,2001,,yes,P1,Rainforest Reading,"<p>Rainforests support rich biodiversity.</p>",create',
        ].join('\n'),
        'utf8'
      ),
    },
  };
  const bulkRes = makeRes();

  await bulkUploadQuestions(bulkReq, bulkRes);

  assert.equal(bulkRes.statusCode, 200, JSON.stringify(bulkRes.body));
  assert.equal(bulkRes.body.inserted, 2);
  assert.equal(bulkRes.body.errors.length, 0);
  assert.equal(mockDb.comprehensionPassages.length, 2);
  const createdPassages = mockDb.comprehensionPassages.filter((item) => Number(item.id) !== 901);
  assert.equal(createdPassages.length, 1);
  const linkedPassageId = createdPassages[0].id;
  assert.equal(bulkRes.body.data[0].comprehension_passage_id, linkedPassageId);
  assert.equal(bulkRes.body.data[1].comprehension_passage_id, linkedPassageId);
});

test('Bulk upload maps Category only to category', async (t) => {
  const originalQuery = pool.query.bind(pool);
  const originalConnect = pool.connect.bind(pool);
  const mockDb = createMockDb();
  pool.query = mockDb.query.bind(mockDb);
  pool.connect = mockDb.connect.bind(mockDb);
  t.after(() => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
  });

  const teacherTenantA = { id: 11, role: 'teacher', client_id: 101 };

  const bulkReq = {
    user: teacherTenantA,
    body: {},
    file: {
      originalname: 'question-group-type.csv',
      buffer: Buffer.from(
        [
          'Type,Question,Options,Correct Answer,Tags,Category,Program,Grade,Subject,Chapter',
          'mcq_single,Which value is grouped?,A;B;C;D,A,physics,direction,401,11,1001,2001',
        ].join('\n'),
        'utf8'
      ),
    },
  };
  const bulkRes = makeRes();

  await bulkUploadQuestions(bulkReq, bulkRes);

  assert.equal(bulkRes.statusCode, 200, JSON.stringify(bulkRes.body));
  assert.equal(bulkRes.body.inserted, 1);
  assert.equal(bulkRes.body.data[0].category, 'direction');
  assert.deepEqual(bulkRes.body.data[0].exam_tags, ['physics']);
});

test('Bulk upload maps Marks- into marks_negative', async (t) => {
  const originalQuery = pool.query.bind(pool);
  const originalConnect = pool.connect.bind(pool);
  const mockDb = createMockDb();
  pool.query = mockDb.query.bind(mockDb);
  pool.connect = mockDb.connect.bind(mockDb);
  t.after(() => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
  });

  const teacherTenantA = { id: 11, role: 'teacher', client_id: 101 };

  const bulkReq = {
    user: teacherTenantA,
    body: {},
    file: {
      originalname: 'marks-negative.csv',
      buffer: Buffer.from(
        [
          'Type,Question,Options,Correct Answer,Marks+,Marks-,Program,Grade,Subject,Chapter',
          'mcq_single,Which value is negative?,A;B;C;D,A,4,1,401,11,1001,2001',
        ].join('\n'),
        'utf8'
      ),
    },
  };
  const bulkRes = makeRes();

  await bulkUploadQuestions(bulkReq, bulkRes);

  assert.equal(bulkRes.statusCode, 200, JSON.stringify(bulkRes.body));
  assert.equal(bulkRes.body.inserted, 1);
  assert.equal(Number(bulkRes.body.data[0].marks_positive), 4);
  assert.equal(Number(bulkRes.body.data[0].marks_negative), 1);
});

test('Question create and list support folder_id scoping', async (t) => {
  const originalQuery = pool.query.bind(pool);
  const mockDb = createMockDb();
  pool.query = mockDb.query.bind(mockDb);
  t.after(() => {
    pool.query = originalQuery;
  });

  const teacherTenantA = { id: 11, role: 'teacher', client_id: 101 };

  const folderCreateRes = makeRes();
  await createQuestion(
    {
      user: teacherTenantA,
      body: {
        question_type: 'mcq_single',
        question_text: { html: '<p>Folder scoped question</p>' },
        options: [
          { id: 'opt-1', text: 'A' },
          { id: 'opt-2', text: 'B' },
        ],
        correct_answer: { answer_ids: ['opt-1'] },
        folder_id: 701,
        subject_id: 1001,
        chapter_id: 2001,
      },
    },
    folderCreateRes
  );

  assert.equal(folderCreateRes.statusCode, 201);
  assert.equal(folderCreateRes.body.folder_id, 701);

  const otherCreateRes = makeRes();
  await createQuestion(
    {
      user: teacherTenantA,
      body: {
        question_type: 'mcq_single',
        question_text: { html: '<p>Different folder question</p>' },
        options: [
          { id: 'opt-1', text: 'A' },
          { id: 'opt-2', text: 'B' },
        ],
        correct_answer: { answer_ids: ['opt-1'] },
        folder_id: 702,
        subject_id: 1001,
        chapter_id: 2001,
      },
    },
    otherCreateRes
  );

  assert.equal(otherCreateRes.statusCode, 201);
  assert.equal(otherCreateRes.body.folder_id, 702);

  const listRes = makeRes();
  await listQuestions(
    {
      user: teacherTenantA,
      query: { folder_id: '701', page: '1', page_size: '20' },
    },
    listRes
  );

  assert.equal(listRes.statusCode, 200);
  assert.equal(listRes.body.data.length, 1);
  assert.equal(listRes.body.data[0].folder_id, 701);
});

test('Folder question bulk delete archives all questions in that folder', async (t) => {
  const originalQuery = pool.query.bind(pool);
  const mockDb = createMockDb();
  pool.query = mockDb.query.bind(mockDb);
  t.after(() => {
    pool.query = originalQuery;
  });

  const adminTenantA = { id: 31, role: 'school_owner', client_id: 101 };

  const firstCreateRes = makeRes();
  await createQuestion(
    {
      user: adminTenantA,
      body: {
        question_type: 'mcq_single',
        question_text: { html: '<p>Folder delete one</p>' },
        options: [
          { id: 'opt-1', text: 'A' },
          { id: 'opt-2', text: 'B' },
        ],
        correct_answer: { answer_ids: ['opt-1'] },
        folder_id: 701,
        subject_id: 1001,
        chapter_id: 2001,
        status: 'approved',
      },
    },
    firstCreateRes
  );

  const secondCreateRes = makeRes();
  await createQuestion(
    {
      user: adminTenantA,
      body: {
        question_type: 'mcq_single',
        question_text: { html: '<p>Folder delete two</p>' },
        options: [
          { id: 'opt-1', text: 'A' },
          { id: 'opt-2', text: 'B' },
        ],
        correct_answer: { answer_ids: ['opt-1'] },
        folder_id: 701,
        subject_id: 1001,
        chapter_id: 2001,
        status: 'approved',
      },
    },
    secondCreateRes
  );

  const thirdCreateRes = makeRes();
  await createQuestion(
    {
      user: adminTenantA,
      body: {
        question_type: 'mcq_single',
        question_text: { html: '<p>Keep this folder question</p>' },
        options: [
          { id: 'opt-1', text: 'A' },
          { id: 'opt-2', text: 'B' },
        ],
        correct_answer: { answer_ids: ['opt-1'] },
        folder_id: 702,
        subject_id: 1001,
        chapter_id: 2001,
        status: 'approved',
      },
    },
    thirdCreateRes
  );

  const deleteRes = makeRes();
  await archiveQuestionFolderQuestions(
    {
      user: adminTenantA,
      params: { id: '701' },
    },
    deleteRes
  );

  assert.equal(deleteRes.statusCode, 200);
  assert.equal(deleteRes.body.archived, 2);

  const listDeletedFolderRes = makeRes();
  await listQuestions(
    {
      user: adminTenantA,
      query: { folder_id: '701', page: '1', page_size: '20' },
    },
    listDeletedFolderRes
  );

  assert.equal(listDeletedFolderRes.statusCode, 200);
  assert.equal(listDeletedFolderRes.body.data.length, 0);

  const listOtherFolderRes = makeRes();
  await listQuestions(
    {
      user: adminTenantA,
      query: { folder_id: '702', page: '1', page_size: '20' },
    },
    listOtherFolderRes
  );

  assert.equal(listOtherFolderRes.statusCode, 200);
  assert.equal(listOtherFolderRes.body.data.length, 1);
});
