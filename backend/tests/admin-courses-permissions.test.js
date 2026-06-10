import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../config/db.js';
import { getAllCourses } from '../services/admin.service.js';

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

const createMockQuery = (rows) => {
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
    ) {
      return { rows: [] };
    }

    if (normalized.includes("table_name = 'content_pack_items'") && normalized.includes("column_name in ('item_id', 'content_id')")) {
      return { rows: [{ column_name: 'item_id' }] };
    }

    if (normalized.includes('from content_entitlements ce') && normalized.includes('where c.client_id is null or c.client_id = 17')) {
      return { rows: [] };
    }

    if (normalized.includes('select distinct school_id from school_memberships')) {
      return { rows: [{ school_id: 14 }] };
    }

    return { rows };
  };

  return { query, calls };
};

test('getAllCourses does not force published-only filter for teacher tenant users', async (t) => {
  const mock = createMockQuery([
    { id: 2, title: 'Draft Physics', description: null, published: false, created_at: '2026-04-01T10:00:00.000Z' },
    { id: 1, title: 'Published Chemistry', description: null, published: true, created_at: '2026-04-02T10:00:00.000Z' },
  ]);

  const originalQuery = pool.query;
  pool.query = mock.query;
  t.after(() => {
    pool.query = originalQuery;
  });

  const req = {
    user: {
      id: 7,
      role: 'teacher',
      client_id: 201,
    },
  };
  const res = makeRes();

  await getAllCourses(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.length, 2);
  const listCall = mock.calls.find((call) => /from courses c/i.test(call.text) && /group by c\.id/i.test(call.text));
  assert.ok(listCall);
  assert.match(listCall.text, /c\.client_id = \$1/i);
  assert.doesNotMatch(listCall.text, /published = true/i);
  assert.deepEqual(listCall.params, [201, [14]]);
});

test('getAllCourses still forces published-only filter for student users', async (t) => {
  const mock = createMockQuery([
    { id: 1, title: 'Published Chemistry', description: null, published: true, created_at: '2026-04-02T10:00:00.000Z' },
  ]);

  const originalQuery = pool.query;
  pool.query = mock.query;
  t.after(() => {
    pool.query = originalQuery;
  });

  const req = {
    user: {
      role: 'student',
      client_id: 201,
    },
  };
  const res = makeRes();

  await getAllCourses(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.length, 1);
  const listCall = mock.calls.find((call) => /from courses c/i.test(call.text) && /group by c\.id/i.test(call.text));
  assert.ok(listCall);
  assert.match(listCall.text, /published = true/i);
  assert.deepEqual(listCall.params, [201]);
});
