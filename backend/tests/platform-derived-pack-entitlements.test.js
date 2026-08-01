import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../config/db.js';
import { createEntitlement, syncContentPackEntitlements } from '../services/platform.service.js';

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
  const originalConnect = pool.connect;
  const createdCourseIds = [];
  const createdContentTitles = [];
  const createdDerivedSourceIds = [];
  const transactionQueries = [];
  let released = false;

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

    if (normalized.startsWith('with recursive pack_roots as')) {
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
          {
            source_course_id: 10,
            source_course_title: 'Techno_PHY',
            grade: '6',
            subject: 'Physics',
            item_id: 102,
          },
        ],
      };
    }

    if (
      normalized.includes('create table if not exists course_exams')
      || normalized.includes('create index if not exists idx_course_exams_exam_id')
      || normalized.includes('create index if not exists idx_course_exams_course_id')
    ) {
      return { rows: [] };
    }

    if (normalized.startsWith('select id, parent_id, item_type, title, content_url, order_index, created_at, metadata from content_items where course_id = $1')) {
      assert.equal(Number(params[0]), 10);
      assert.deepEqual(params[1], [100, 101, 102]);
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
          {
            id: 102,
            parent_id: 101,
            item_type: 'pdf',
            title: 'Future Added Worksheet',
            content_url: 'future.pdf',
            order_index: 0,
            created_at: '2026-06-13T00:01:00.000Z',
            metadata: {},
          },
        ],
      };
    }

    throw new Error(`Unexpected query: ${normalized}`);
  };

  const client = {
    query: async (text, params = []) => {
      const normalized = normalizeSql(text);
      transactionQueries.push(normalized);

      if (normalized === 'begin' || normalized === 'commit' || normalized === 'rollback') {
        return { rows: [] };
      }

      if (normalized.startsWith('select pg_advisory_xact_lock')) {
        assert.deepEqual(params, [301, 8]);
        return { rows: [] };
      }

      if (normalized.startsWith('select id, metadata from courses where client_id = $1')) {
        return { rows: [] };
      }

      if (normalized.startsWith('insert into courses (title, description, published, created_by, client_id, metadata)')) {
        createdCourseIds.push(501);
        return { rows: [{ id: 501 }] };
      }

      if (normalized.startsWith('delete from course_exams where course_id = $1') || normalized.startsWith('delete from content_items where course_id = $1')) {
        return { rows: [] };
      }

      if (normalized.startsWith('insert into content_items (course_id, parent_id, item_type, title, content_url, order_index, metadata) select')) {
        const payload = JSON.parse(params[1]);
        payload.forEach((row) => {
          createdContentTitles.push(String(row.title));
          createdDerivedSourceIds.push(Number(row.source_id));
        });
        return {
          rows: payload.map((row, index) => ({
            id: 901 + index,
            source_id: row.source_id,
          })),
        };
      }

      throw new Error(`Unexpected transaction query: ${normalized}`);
    },
    release: () => {
      released = true;
    },
  };

  pool.connect = async () => client;

  t.after(() => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
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
  assert.deepEqual(createdContentTitles, ['Mathematical Tools', 'Squares and Square roots', 'Future Added Worksheet']);
  assert.deepEqual(createdDerivedSourceIds, [100, 101, 102]);
  assert.equal(released, true);
  assert.notEqual(transactionQueries.indexOf('begin'), -1);
  assert.notEqual(transactionQueries.indexOf('select pg_advisory_xact_lock($1, $2)'), -1);
  assert.ok(transactionQueries.indexOf('begin') < transactionQueries.indexOf('select pg_advisory_xact_lock($1, $2)'));
  assert.ok(transactionQueries.includes('commit'));
});

test('syncContentPackEntitlements refreshes active clients and removes stale derived courses for an empty summary', async (t) => {
  const originalQuery = pool.query;
  const originalConnect = pool.connect;
  const transactionQueries = [];
  let compositionQuery = '';
  let released = false;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);

    if (normalized.startsWith('select id from content_packs where id = $1 limit 1')) {
      assert.deepEqual(params, [8]);
      return { rows: [{ id: 8 }] };
    }

    if (normalized.startsWith('select distinct client_id from content_entitlements')) {
      assert.deepEqual(params, [8]);
      assert.match(normalized, /status = 'active'/);
      assert.match(normalized, /revoked_at is null/);
      assert.match(normalized, /now\(\) between start_at and end_at/);
      return { rows: [{ client_id: 301 }] };
    }

    if (normalized.startsWith('select id, name from content_packs where id = $1 limit 1')) {
      return { rows: [{ id: 8, name: 'techno' }] };
    }

    if (normalized.startsWith('with recursive pack_roots as')) {
      compositionQuery = normalized;
      return { rows: [] };
    }

    if (
      normalized.includes('create table if not exists course_exams')
      || normalized.includes('create index if not exists idx_course_exams_exam_id')
      || normalized.includes('create index if not exists idx_course_exams_course_id')
    ) {
      return { rows: [] };
    }

    throw new Error(`Unexpected query: ${normalized}`);
  };

  const client = {
    query: async (text, params = []) => {
      const normalized = normalizeSql(text);
      transactionQueries.push(normalized);

      if (normalized === 'begin' || normalized === 'commit' || normalized === 'rollback') {
        return { rows: [] };
      }

      if (normalized.startsWith('select pg_advisory_xact_lock')) {
        assert.deepEqual(params, [301, 8]);
        return { rows: [] };
      }

      if (normalized.startsWith('select id, metadata from courses where client_id = $1')) {
        return {
          rows: [{
            id: 501,
            metadata: {
              derived_pack_id: 8,
              derived_source_course_id: 10,
              derived_for_client_id: 301,
            },
          }],
        };
      }

      if (normalized.startsWith('delete from courses')) {
        assert.deepEqual(params, [[501], 301, '8', '301']);
        return { rows: [], rowCount: 1 };
      }

      throw new Error(`Unexpected transaction query: ${normalized}`);
    },
    release: () => {
      released = true;
    },
  };
  pool.connect = async () => client;

  t.after(() => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
  });

  const res = createResponse();
  await syncContentPackEntitlements(
    { params: { id: '8' }, user: { id: 15, role: 'super_admin' } },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    success: true,
    pack_id: 8,
    synced_client_ids: [301],
    synced_client_count: 1,
    synced_course_count: 0,
    synced_item_count: 0,
    removed_course_count: 1,
  });
  assert.match(compositionQuery, /descendant_items as/);
  assert.match(compositionQuery, /join descendant_items parent on child\.parent_id = parent\.id/);
  assert.ok(transactionQueries.includes('commit'));
  assert.equal(released, true);
});

test('syncContentPackEntitlements replaces an existing client course with the current grouped-summary items', async (t) => {
  const originalQuery = pool.query;
  const originalConnect = pool.connect;
  const copiedTitles = [];
  const copiedSourceIds = [];
  let updatedCourseTitle = null;
  let released = false;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);

    if (normalized.startsWith('select id from content_packs where id = $1 limit 1')) {
      return { rows: [{ id: 8 }] };
    }

    if (normalized.startsWith('select distinct client_id from content_entitlements')) {
      return { rows: [{ client_id: 301 }] };
    }

    if (normalized.startsWith('select id, name from content_packs where id = $1 limit 1')) {
      return { rows: [{ id: 8, name: 'techno' }] };
    }

    if (normalized.startsWith('with recursive pack_roots as')) {
      return {
        rows: [
          {
            source_course_id: 10,
            source_course_title: 'TECHNO_BIO',
            grade: null,
            subject: null,
            item_id: 100,
          },
          {
            source_course_id: 10,
            source_course_title: 'TECHNO_BIO',
            grade: null,
            subject: null,
            item_id: 101,
          },
          {
            source_course_id: 10,
            source_course_title: 'TECHNO_BIO',
            grade: null,
            subject: null,
            item_id: 102,
          },
        ],
      };
    }

    if (
      normalized.includes('create table if not exists course_exams')
      || normalized.includes('create index if not exists idx_course_exams_exam_id')
      || normalized.includes('create index if not exists idx_course_exams_course_id')
    ) {
      return { rows: [] };
    }

    if (normalized.startsWith('select id, parent_id, item_type, title, content_url, order_index, created_at, metadata from content_items where course_id = $1')) {
      assert.deepEqual(params, [10, [100, 101, 102]]);
      return {
        rows: [
          { id: 100, parent_id: null, item_type: 'folder', title: 'BREATHING', content_url: null, order_index: 0, created_at: '2026-06-12T00:00:00.000Z', metadata: {} },
          { id: 101, parent_id: 100, item_type: 'folder', title: 'New live folder', content_url: null, order_index: 0, created_at: '2026-06-13T00:00:00.000Z', metadata: {} },
          { id: 102, parent_id: 101, item_type: 'pdf', title: 'New live content', content_url: 'new.pdf', order_index: 0, created_at: '2026-06-13T00:01:00.000Z', metadata: {} },
        ],
      };
    }

    throw new Error(`Unexpected query: ${normalized}`);
  };

  const client = {
    query: async (text, params = []) => {
      const normalized = normalizeSql(text);

      if (normalized === 'begin' || normalized === 'commit' || normalized === 'rollback') {
        return { rows: [] };
      }

      if (normalized.startsWith('select pg_advisory_xact_lock')) {
        return { rows: [] };
      }

      if (normalized.startsWith('select id, metadata from courses where client_id = $1')) {
        return {
          rows: [{
            id: 501,
            metadata: {
              derived_pack_id: 8,
              derived_source_course_id: 10,
              derived_for_client_id: 301,
            },
          }],
        };
      }

      if (normalized.startsWith('update courses set title = $1')) {
        updatedCourseTitle = params[0];
        assert.equal(params[3], 501);
        return { rows: [], rowCount: 1 };
      }

      if (normalized.startsWith('delete from course_exams where course_id = $1') || normalized.startsWith('delete from content_items where course_id = $1')) {
        assert.equal(params[0], 501);
        return { rows: [] };
      }

      if (normalized.startsWith('insert into content_items (course_id, parent_id, item_type, title, content_url, order_index, metadata) select')) {
        const payload = JSON.parse(params[1]);
        payload.forEach((row) => {
          copiedTitles.push(String(row.title));
          copiedSourceIds.push(Number(row.source_id));
        });
        return {
          rows: payload.map((row, index) => ({
            id: 901 + index,
            source_id: row.source_id,
          })),
        };
      }

      throw new Error(`Unexpected transaction query: ${normalized}`);
    },
    release: () => {
      released = true;
    },
  };
  pool.connect = async () => client;

  t.after(() => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
  });

  const res = createResponse();
  await syncContentPackEntitlements(
    { params: { id: '8' }, user: { id: 15, role: 'super_admin' } },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.synced_client_count, 1);
  assert.equal(res.body.synced_course_count, 1);
  assert.equal(res.body.synced_item_count, 3);
  assert.equal(updatedCourseTitle, 'TECHNO_BIO');
  assert.deepEqual(copiedTitles, ['BREATHING', 'New live folder', 'New live content']);
  assert.deepEqual(copiedSourceIds, [100, 101, 102]);
  assert.equal(released, true);
});
