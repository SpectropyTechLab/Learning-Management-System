import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../config/db.js';
import { createContentItem } from '../services/admin.service.js';

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

const createMockQuery = () => {
  const calls = [];

  const query = async (text, params = []) => {
    const normalized = String(text).replace(/\s+/g, ' ').trim().toLowerCase();
    calls.push({
      text: String(text).replace(/\s+/g, ' ').trim(),
      params,
    });

    if (
      normalized.includes('create table if not exists course_school_assignments')
      || normalized.includes('create index if not exists idx_course_school_assignments_course')
      || normalized.includes('create index if not exists idx_course_school_assignments_school')
      || normalized.includes('create table if not exists course_exams')
      || normalized.includes('create index if not exists idx_course_exams_exam_id')
      || normalized.includes('create index if not exists idx_course_exams_course_id')
    ) {
      return { rows: [] };
    }

    if (normalized.includes("table_name = 'content_items'") && normalized.includes("column_name = 'metadata'")) {
      return { rows: [{ exists: true }] };
    }

    if (normalized.startsWith('select course_id, title from client_course_title_overrides where client_id = $1 and course_id = any($2::int[])')) {
      return { rows: [] };
    }

    if (normalized.includes('from school_memberships')) {
      return { rows: [{ school_id: 14 }] };
    }

    if (/from courses c/i.test(normalized) && /where c\.id = \$1/i.test(normalized) && /group by c\.id/i.test(normalized)) {
      return {
        rows: [
          {
            id: 187,
            title: 'Client Physics',
            description: null,
            published: true,
            created_at: '2026-04-01T10:00:00.000Z',
            updated_at: null,
            created_by: 8,
            client_id: 301,
            assigned_school_ids: [14],
            assigned_school_names: ['Alpha School'],
            assigned_school_count: 1,
          },
        ],
      };
    }

    if (normalized.startsWith('select id, client_id from courses where id = $1')) {
      return { rows: [{ id: 187, client_id: 301 }] };
    }

    if (normalized.startsWith('select id, title, client_id, school_id from exams where id = $1')) {
      const examId = Number(params[0]);
      if (examId === 77) {
        return { rows: [{ id: 77, title: 'Platform Exam', client_id: 17, school_id: null }] };
      }
      if (examId === 88) {
        return { rows: [{ id: 88, title: 'Foreign Exam', client_id: 999, school_id: null }] };
      }
      return { rows: [] };
    }

    if (normalized.startsWith('select id, client_id, school_id from courses where id = any($1::int[])')) {
      return { rows: [{ id: 187, client_id: 301, school_id: 14 }] };
    }

    if (normalized.startsWith('insert into course_exams (course_id, exam_id, assigned_by)')) {
      return { rows: [] };
    }

    if (normalized.startsWith('insert into content_items (course_id, parent_id, item_type, title, content_url, metadata)')) {
      return {
        rows: [
          {
            id: 901,
            course_id: 187,
            parent_id: null,
            item_type: 'exam',
            title: 'Platform Exam',
            content_url: null,
            metadata: { exam_id: Number(params[5] ? JSON.parse(params[5]).exam_id : 77) },
          },
        ],
      };
    }

    throw new Error(`Unhandled mock query: ${normalized}`);
  };

  return { query, calls };
};

test('createContentItem allows linking a platform-owned exam into a client course for that client scope', async (t) => {
  const mock = createMockQuery();
  const originalQuery = pool.query;
  pool.query = mock.query;
  t.after(() => {
    pool.query = originalQuery;
  });

  const req = {
    baseUrl: '/api/admin',
    params: { courseId: '187' },
    body: {
      item_type: 'exam',
      title: '',
      exam_id: 77,
    },
    user: {
      id: 41,
      role: 'client_admin',
      client_id: 301,
    },
  };
  const res = makeRes();

  await createContentItem(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body?.item_type, 'exam');
  assert.equal(res.body?.title, 'Platform Exam');
  assert.ok(mock.calls.some((call) => call.text.toLowerCase().includes('insert into course_exams')));
});

test('createContentItem still rejects linking an exam from another client scope', async (t) => {
  const mock = createMockQuery();
  const originalQuery = pool.query;
  pool.query = mock.query;
  t.after(() => {
    pool.query = originalQuery;
  });

  const req = {
    baseUrl: '/api/admin',
    params: { courseId: '187' },
    body: {
      item_type: 'exam',
      title: '',
      exam_id: 88,
    },
    user: {
      id: 41,
      role: 'client_admin',
      client_id: 301,
    },
  };
  const res = makeRes();

  await createContentItem(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body?.error, 'Course does not belong to the same client as the exam');
  assert.ok(!mock.calls.some((call) => call.text.toLowerCase().includes('insert into content_items')));
});
