import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../config/db.js';
import { createEntitlement } from '../services/platform.service.js';

const normalizeSql = (value) => String(value).replace(/\s+/g, ' ').trim().toLowerCase();

const createResponse = () => ({
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

test('createEntitlement builds a derived client course from pack items', async (t) => {
  const originalQuery = pool.query;
  const createdCourseIds = [];
  const createdContentTitles = [];

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);

    if (normalized.startsWith('insert into content_entitlements')) {
      return {
        rows: [
          {
            id: 41,
            client_id: 301,
            content_id: null,
            pack_id: 8,
            start_at: params[3],
            end_at: params[4],
            status: params[5],
            granted_at: '2026-06-12T00:00:00.000Z',
          },
        ],
      };
    }

    if (normalized.includes("table_schema = 'public'") && normalized.includes("table_name = 'courses'") && normalized.includes("column_name = 'metadata'")) {
      return { rows: [{ exists: true }] };
    }

    if (normalized.includes("table_schema = 'public'") && normalized.includes("table_name = 'content_items'") && normalized.includes("column_name = 'metadata'")) {
      return { rows: [{ exists: true }] };
    }

    if (normalized.includes("table_name = 'content_pack_items'") && normalized.includes("column_name in ('item_id', 'content_id')")) {
      return { rows: [{ column_name: 'item_id' }] };
    }

    if (normalized.startsWith('select id, name from content_packs where id = $1 limit 1')) {
      return { rows: [{ id: 8, name: 'techno' }] };
    }

    if (normalized.includes('from content_pack_items cpi') && normalized.includes('join content_items ci on ci.id = cpi.item_id') && normalized.includes('join courses c on c.id = ci.course_id')) {
      return {
        rows: [
          {
            source_course_id: 10,
            source_course_title: 'Techno_PHY',
            grade: '6',
            subject: 'Physics',
            item_id: 100,
          },
          {
            source_course_id: 10,
            source_course_title: 'Techno_PHY',
            grade: '6',
            subject: 'Physics',
            item_id: 101,
          },
        ],
      };
    }

    if (normalized.startsWith('select id, title, metadata from courses where client_id = $1')) {
      return { rows: [] };
    }

    if (normalized === 'begin' || normalized === 'commit' || normalized === 'rollback') {
      return { rows: [] };
    }

    if (
      normalized.includes('create table if not exists course_exams')
      || normalized.includes('create index if not exists idx_course_exams_exam_id')
      || normalized.includes('create index if not exists idx_course_exams_course_id')
    ) {
      return { rows: [] };
    }

    if (normalized.startsWith('insert into courses (title, description, published, created_by, client_id, metadata)')) {
      createdCourseIds.push(501);
      return { rows: [{ id: 501 }] };
    }

    if (normalized.startsWith('select id, parent_id, item_type, title, content_url, order_index, created_at, metadata from content_items where course_id = $1')) {
      assert.equal(Number(params[0]), 10);
      assert.deepEqual(params[1], [100, 101]);
      return {
        rows: [
          {
            id: 100,
            parent_id: null,
            item_type: 'folder',
            title: 'Mathematical Tools',
            content_url: null,
            order_index: 0,
            created_at: '2026-06-12T00:00:00.000Z',
            metadata: {},
          },
          {
            id: 101,
            parent_id: 100,
            item_type: 'folder',
            title: 'Squares and Square roots',
            content_url: null,
            order_index: 0,
            created_at: '2026-06-12T00:01:00.000Z',
            metadata: {},
          },
        ],
      };
    }

    if (normalized.startsWith('delete from course_exams where course_id = $1') || normalized.startsWith('delete from content_items where course_id = $1')) {
      return { rows: [] };
    }

    if (normalized.startsWith('select coalesce(max(order_index), -1) as max_order from content_items where course_id = $1')) {
      return { rows: [{ max_order: -1 }] };
    }

    if (normalized.startsWith('insert into content_items (course_id, parent_id, item_type, title, content_url, order_index, metadata)')) {
      createdContentTitles.push(String(params[3]));
      return { rows: [{ id: 900 + createdContentTitles.length }] };
    }

    throw new Error(`Unexpected query: ${normalized}`);
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  const req = {
    body: {
      client_id: 301,
      pack_id: 8,
      start_at: '2026-06-12T07:09:00.000Z',
      end_at: '2027-06-30T07:09:00.000Z',
      status: 'active',
    },
    user: {
      id: 15,
      role: 'super_admin',
    },
  };
  const res = createResponse();

  await createEntitlement(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body?.pack_id, 8);
  assert.deepEqual(createdCourseIds, [501]);
  assert.deepEqual(createdContentTitles, ['Mathematical Tools', 'Squares and Square roots']);
});
