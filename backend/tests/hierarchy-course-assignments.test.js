import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../config/db.js';
import { assignCoursesToSchool } from '../services/hierarchy.service.js';

const normalizeSql = (value) => String(value).replace(/\s+/g, ' ').trim().toLowerCase();

const createResponse = () => {
  const response = {
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
  };

  return response;
};

test('assignCoursesToSchool accepts entitled platform courses for the school client', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);

    if (normalized.startsWith('select id, client_id from schools where id = $1')) {
      return { rows: [{ id: 9, client_id: 301 }] };
    }

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
      return { rows: [{ course_id: 77 }] };
    }

    if (normalized.includes('select id from courses') && normalized.includes('id = any($1::int[])')) {
      assert.deepEqual(params[0], [77]);
      assert.equal(params[1], 301);
      assert.deepEqual(params[2], [77]);
      return { rows: [{ id: 77 }] };
    }

    if (normalized.startsWith('insert into course_school_assignments')) {
      return { rows: [] };
    }

    if (normalized.includes('from course_school_assignments csa') && normalized.includes('where csa.school_id = $1')) {
      return {
        rows: [
          {
            id: 1,
            school_id: 9,
            course_id: 77,
            assigned_at: '2026-06-12T00:00:00.000Z',
            title: 'Platform Physics',
            description: 'Platform course',
            published: true,
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
    params: { schoolId: '9' },
    body: { course_ids: [77] },
    user: { id: 15, role: 'client_admin', client_id: 301 },
  };
  const res = createResponse();

  await assignCoursesToSchool(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body?.success, true);
  assert.equal(res.body?.assignments?.length, 1);
  assert.equal(res.body?.assignments?.[0]?.course_id, 77);
});
