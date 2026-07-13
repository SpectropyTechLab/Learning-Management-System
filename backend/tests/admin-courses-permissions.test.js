import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../config/db.js';
import { getAllCourses, getCourseContent } from '../services/admin.service.js';

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
      || normalized.includes('create table if not exists course_linked_content')
      || normalized.includes('create index if not exists idx_course_linked_content_course')
      || normalized.includes('create index if not exists idx_course_linked_content_item')
      || normalized.includes('create index if not exists idx_course_linked_content_parent_order')
    ) {
      return { rows: [] };
    }

    if (normalized.includes("table_name = 'content_items'") && normalized.includes("column_name = 'metadata'")) {
      return { rows: [{ exists: true }] };
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

test('getCourseContent limits entitled platform courses to the client entitled branch', async (t) => {
  const calls = [];
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = String(text).replace(/\s+/g, ' ').trim().toLowerCase();
    calls.push({
      text: String(text).replace(/\s+/g, ' ').trim(),
      params,
    });

    if (
      normalized.includes('create table if not exists course_school_assignments')
      || normalized.includes('create index if not exists idx_course_school_assignments_course')
      || normalized.includes('create index if not exists idx_course_school_assignments_school')
      || normalized.includes('create table if not exists course_linked_content')
      || normalized.includes('create index if not exists idx_course_linked_content_course')
      || normalized.includes('create index if not exists idx_course_linked_content_item')
      || normalized.includes('create index if not exists idx_course_linked_content_parent_order')
    ) {
      return { rows: [] };
    }

    if (normalized.includes("table_name = 'content_items'") && normalized.includes("column_name = 'metadata'")) {
      return { rows: [{ exists: true }] };
    }

    if (normalized.includes("table_name = 'content_pack_items'") && normalized.includes("column_name in ('item_id', 'content_id')")) {
      return { rows: [{ column_name: 'item_id' }] };
    }

    if (normalized.includes('from content_entitlements ce') && normalized.includes('where c.client_id is null or c.client_id = 17')) {
      return { rows: [{ course_id: 77 }] };
    }

    if (normalized.includes('from client_course_title_overrides')) {
      return { rows: [] };
    }

    if (/from courses c/i.test(normalized) && /where c\.id = \$1/i.test(normalized) && /group by c\.id/i.test(normalized)) {
      return {
        rows: [
          {
            id: 77,
            title: 'Platform Physics',
            description: 'Platform owned course',
            published: true,
            created_at: '2026-04-01T10:00:00.000Z',
            updated_at: null,
            created_by: 9,
            client_id: null,
            assigned_school_ids: [],
            assigned_school_names: [],
            assigned_school_count: 0,
          },
        ],
      };
    }

    if (normalized.startsWith('with recursive entitled_seed as')) {
      assert.deepEqual(params, [301, 77]);
      return {
        rows: [
          {
            id: 100,
            course_id: 77,
            parent_id: null,
            item_type: 'folder',
            title: 'Mathematical Tools',
            content_url: null,
            metadata: {},
            order_index: 0,
            created_at: '2026-06-12T00:00:00.000Z',
            completion_status: null,
            is_linked_content: false,
            linked_content_id: null,
            source_pack_id: null,
            download_allowed: true,
            link_origin: 'course',
            is_editable: false,
            linked_at: null,
          },
          {
            id: 101,
            course_id: 77,
            parent_id: 100,
            item_type: 'folder',
            title: 'Squares and Square roots',
            content_url: null,
            metadata: {},
            order_index: 0,
            created_at: '2026-06-12T00:01:00.000Z',
            completion_status: null,
            is_linked_content: false,
            linked_content_id: null,
            source_pack_id: null,
            download_allowed: true,
            link_origin: 'course',
            is_editable: false,
            linked_at: null,
          },
        ],
      };
    }

    throw new Error(`Unexpected query: ${normalized}`);
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  const req = {
    baseUrl: '/api/admin',
    params: { courseId: '77' },
    user: {
      id: 15,
      role: 'client_admin',
      client_id: 301,
    },
  };
  const res = makeRes();

  await getCourseContent(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.items?.length, 2);
  assert.equal(res.body?.items?.[0]?.title, 'Mathematical Tools');
  assert.equal(res.body?.course?.is_entitled_platform_course, true);
  assert.ok(calls.some((call) => call.text.toLowerCase().startsWith('with recursive entitled_seed as')));
  assert.ok(!calls.some((call) => call.text.toLowerCase().includes('union all') && call.text.toLowerCase().includes('course_linked_content clc')));
});

test('getCourseContent returns pack-derived course content without blocking on entitlement sync', async (t) => {
  const calls = [];
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = String(text).replace(/\s+/g, ' ').trim().toLowerCase();
    calls.push({
      text: String(text).replace(/\s+/g, ' ').trim(),
      params,
    });

    if (
      normalized.includes('create table if not exists course_school_assignments')
      || normalized.includes('create index if not exists idx_course_school_assignments_course')
      || normalized.includes('create index if not exists idx_course_school_assignments_school')
      || normalized.includes('create table if not exists client_course_title_overrides')
      || normalized.includes('create index if not exists idx_client_course_title_overrides_client')
      || normalized.includes('create index if not exists idx_client_course_title_overrides_course')
      || normalized.includes('create table if not exists course_linked_content')
      || normalized.includes('create index if not exists idx_course_linked_content_course')
      || normalized.includes('create index if not exists idx_course_linked_content_item')
      || normalized.includes('create index if not exists idx_course_linked_content_parent_order')
    ) {
      return { rows: [] };
    }

    if (normalized.includes("table_name = 'content_items'") && normalized.includes("column_name = 'metadata'")) {
      return { rows: [{ exists: true }] };
    }

    if (normalized.includes("table_name = 'content_pack_items'") && normalized.includes("column_name in ('item_id', 'content_id')")) {
      return { rows: [{ column_name: 'item_id' }] };
    }

    if (normalized.includes('from client_course_title_overrides')) {
      return { rows: [] };
    }

    if (/from courses c/i.test(normalized) && /where c\.id = \$1/i.test(normalized) && /group by c\.id/i.test(normalized)) {
      return {
        rows: [
          {
            id: 314,
            title: 'Derived Chemistry',
            description: 'Derived from pack: techno',
            published: true,
            created_at: '2026-04-01T10:00:00.000Z',
            updated_at: null,
            created_by: 9,
            client_id: 301,
            assigned_school_ids: [],
            assigned_school_names: [],
            assigned_school_count: 0,
          },
        ],
      };
    }

    if (normalized.startsWith('select * from (')) {
      assert.deepEqual(params, [314]);
      return {
        rows: [
          {
            id: 900,
            course_id: 314,
            parent_id: null,
            item_type: 'folder',
            title: 'Synced Chapter',
            content_url: null,
            metadata: {},
            order_index: 0,
            created_at: '2026-06-12T00:00:00.000Z',
            completion_status: null,
            is_linked_content: false,
            linked_content_id: null,
            source_pack_id: null,
            download_allowed: true,
            link_origin: 'course',
            is_editable: true,
            linked_at: null,
          },
        ],
      };
    }

    throw new Error(`Unexpected query: ${normalized}`);
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  const req = {
    baseUrl: '/api/admin',
    params: { courseId: '314' },
    user: {
      id: 15,
      role: 'client_admin',
      client_id: 301,
    },
  };
  const res = makeRes();

  await getCourseContent(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.items?.[0]?.title, 'Synced Chapter');
  const contentCallIndex = calls.findIndex((call) => call.text.toLowerCase().startsWith('select * from ('));
  assert.notEqual(contentCallIndex, -1);
  assert.ok(!calls.some((call) => call.text.toLowerCase().startsWith('select distinct pack_id from content_entitlements')));
});
