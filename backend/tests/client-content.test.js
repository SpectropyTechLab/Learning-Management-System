import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../config/db.js';
import {
  __resetClientContentCachesForTests,
  getLicensedPackItems,
  getMergedCourseContentRows,
  linkLicensedContentToCourse,
  listLicensedPacks,
  removeLinkedContentFromCourse,
} from '../services/clientContent.service.js';

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

const createMockDb = () => {
  const data = {
    contentMetadataExists: true,
    packItemColumn: 'item_id',
    packs: [{ id: 1, name: 'STEM Starter', description: 'Starter pack', item_count: 1 }],
    courses: [
      { id: 21, title: 'Client Physics', client_id: 201, published: true },
      { id: 10, title: 'Platform Physics', client_id: null, published: true },
    ],
    contentItems: [
      { id: 500, course_id: 21, parent_id: null, item_type: 'folder', title: 'Chapter 1', content_url: null, metadata: {}, order_index: 0, created_at: '2026-04-01T10:00:00.000Z' },
      { id: 501, course_id: 21, parent_id: 500, item_type: 'video', title: 'Local Motion', content_url: 'local-motion.mp4', metadata: {}, order_index: 1, created_at: '2026-04-01T11:00:00.000Z' },
      { id: 100, course_id: 10, parent_id: null, item_type: 'video', title: 'Licensed Motion', content_url: 'licensed-motion.mp4', metadata: {}, order_index: 0, created_at: '2026-03-29T08:00:00.000Z' },
    ],
    courseLinkedContent: [],
  };

  const normalize = (sql) => String(sql).replace(/\s+/g, ' ').trim().toLowerCase();

  return {
    async query(text, params = []) {
      const normalized = normalize(text);

      if (normalized.startsWith('create table if not exists course_linked_content')) return { rows: [] };
      if (normalized.startsWith('create index if not exists idx_course_linked_content_course')) return { rows: [] };
      if (normalized.startsWith('create index if not exists idx_course_linked_content_item')) return { rows: [] };
      if (normalized.startsWith('create index if not exists idx_course_linked_content_parent_order')) return { rows: [] };
      if (normalized.startsWith('create table if not exists course_exams')) return { rows: [] };
      if (normalized.startsWith('create index if not exists idx_course_exams_exam_id')) return { rows: [] };
      if (normalized.startsWith('create index if not exists idx_course_exams_course_id')) return { rows: [] };

      if (normalized.includes("table_name = 'content_items'") && normalized.includes("column_name = 'metadata'")) {
        return { rows: [{ exists: data.contentMetadataExists }] };
      }

      if (normalized.includes("table_name = 'content_pack_items'") && normalized.includes("column_name in ('item_id', 'content_id')")) {
        return { rows: [{ column_name: data.packItemColumn }] };
      }

      if (normalized.startsWith('select count(*)::int as total from ( select ce.pack_id')) {
        return { rows: [{ total: 1 }] };
      }

      if (normalized.includes('from content_entitlements ce join content_packs cp on cp.id = ce.pack_id')) {
        return {
          rows: [{
            id: 1,
            name: 'STEM Starter',
            description: 'Starter pack',
            item_count: 1,
            active_from: '2026-04-01T00:00:00.000Z',
            active_until: '2026-05-01T00:00:00.000Z',
          }],
        };
      }

      if (normalized.startsWith('select id, name from content_packs where id = $1 limit 1')) {
        const pack = data.packs.find((entry) => Number(entry.id) === Number(params[0]));
        return { rows: pack ? [{ id: pack.id, name: pack.name }] : [] };
      }

      if (normalized.startsWith('select 1 from content_entitlements where client_id = $1 and pack_id = $2')) {
        return { rows: Number(params[0]) === 201 && Number(params[1]) === 1 ? [{}] : [] };
      }

      if (normalized.startsWith('select count(*)::int as total from content_pack_items cpi join content_items ci on ci.id = cpi.item_id where cpi.pack_id = $1')) {
        return { rows: [{ total: 1 }] };
      }

      if (normalized.includes('from content_pack_items cpi join content_items ci on ci.id = cpi.item_id where cpi.pack_id = $1')) {
        return {
          rows: [{
            id: 100,
            title: 'Licensed Motion',
            item_type: 'video',
            content_url: 'licensed-motion.mp4',
            metadata: {},
            download_allowed: false,
            is_linked_to_course: false,
          }],
        };
      }

      if (normalized.startsWith('select id, title, client_id, published from courses where id = $1 and client_id = $2 limit 1')) {
        const course = data.courses.find((entry) => Number(entry.id) === Number(params[0]) && Number(entry.client_id) === Number(params[1]));
        return { rows: course ? [course] : [] };
      }

      if (normalized.startsWith('select id, item_type from content_items where id = $1 and course_id = $2 limit 1')) {
        const item = data.contentItems.find((entry) => Number(entry.id) === Number(params[0]) && Number(entry.course_id) === Number(params[1]));
        return { rows: item ? [{ id: item.id, item_type: item.item_type }] : [] };
      }

      if (normalized.includes('from content_items ci join courses c on c.id = ci.course_id where ci.id = $1 limit 1')) {
        const item = data.contentItems.find((entry) => Number(entry.id) === Number(params[0]));
        return { rows: item ? [{ ...item, client_id: item.course_id === 10 ? null : 201 }] : [] };
      }

      if (normalized.startsWith('with recursive entitlement_ancestors as (')) {
        return { rows: Number(params[0]) === 201 && Number(params[1]) === 100 ? [{}] : [] };
      }

      if (normalized.startsWith('select id from course_linked_content where course_id = $1 and content_item_id = $2')) {
        const row = data.courseLinkedContent.find((entry) => Number(entry.course_id) === Number(params[0]) && Number(entry.content_item_id) === Number(params[1]));
        return { rows: row ? [{ id: row.id }] : [] };
      }

      if (normalized.startsWith('select coalesce(max(order_index), -1)::int + 1 as next_order_index from (')) {
        return { rows: [{ next_order_index: 2 }] };
      }

      if (normalized.startsWith('insert into course_linked_content (course_id, content_item_id, source_pack_id, parent_content_id, order_index, linked_by) values ($1, $2, $3, $4, $5, $6) returning')) {
        const row = {
          id: 900,
          course_id: Number(params[0]),
          content_item_id: Number(params[1]),
          source_pack_id: Number(params[2]),
          parent_content_id: Number(params[3]),
          order_index: Number(params[4]),
          linked_at: '2026-04-01T12:00:00.000Z',
          is_active: true,
        };
        data.courseLinkedContent.push(row);
        return { rows: [row] };
      }

      if (normalized.startsWith('select case when ci.metadata is not null')) {
        return { rows: [{ exam_id: null }] };
      }

      if (normalized.startsWith('select id, content_item_id from course_linked_content where id = $1 and course_id = $2')) {
        const row = data.courseLinkedContent.find((entry) => Number(entry.id) === Number(params[0]) && Number(entry.course_id) === Number(params[1]));
        return { rows: row ? [row] : [] };
      }

      if (normalized.startsWith('delete from course_linked_content where id = $1')) {
        data.courseLinkedContent = data.courseLinkedContent.filter((entry) => Number(entry.id) !== Number(params[0]));
        return { rows: [] };
      }

      if (normalized.includes('from content_items ci where ci.course_id = $1 and ci.item_type = \'exam\'')) {
        return { rows: [] };
      }

      if (normalized.startsWith('delete from course_exams where course_id = $1 and exam_id = $2')) {
        return { rows: [] };
      }

      if (normalized.includes('union all') && normalized.includes('course_linked_content clc')) {
        return {
          rows: [
            {
              id: 500,
              course_id: 21,
              parent_id: null,
              item_type: 'folder',
              title: 'Chapter 1',
              content_url: null,
              metadata: {},
              order_index: 0,
              created_at: '2026-04-01T10:00:00.000Z',
              completion_status: null,
              is_linked_content: false,
              linked_content_id: null,
              source_pack_id: null,
              download_allowed: true,
              link_origin: 'course',
              is_editable: true,
              linked_at: null,
            },
            {
              id: 100,
              course_id: 21,
              parent_id: 500,
              item_type: 'video',
              title: 'Licensed Motion',
              content_url: 'licensed-motion.mp4',
              metadata: {},
              order_index: 2,
              created_at: '2026-04-01T12:00:00.000Z',
              completion_status: null,
              is_linked_content: true,
              linked_content_id: 900,
              source_pack_id: 1,
              download_allowed: false,
              link_origin: 'licensed_pack',
              is_editable: false,
              linked_at: '2026-04-01T12:00:00.000Z',
            },
          ],
        };
      }

      if (normalized.includes('from course_linked_content clc join content_items ci on ci.id = clc.content_item_id')) {
        return { rows: [] };
      }

      throw new Error(`Unhandled mock query: ${normalized}`);
    },
  };
};

const useMockDb = (t) => {
  const originalQuery = pool.query.bind(pool);
  const mockDb = createMockDb();
  pool.query = mockDb.query.bind(mockDb);
  __resetClientContentCachesForTests();
  t.after(() => {
    pool.query = originalQuery;
    __resetClientContentCachesForTests();
  });
};

test('GET /client/licensed-packs returns active pack entitlements for a client admin', async (t) => {
  useMockDb(t);
  const res = makeRes();
  await listLicensedPacks({ user: { role: 'client_admin', client_id: 201 }, query: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 1);
  assert.equal(res.body.data[0].name, 'STEM Starter');
});

test('GET /client/licensed-packs/:id/items returns read-only licensed items', async (t) => {
  useMockDb(t);
  const res = makeRes();
  await getLicensedPackItems({ user: { role: 'client_admin', client_id: 201 }, params: { id: '1' }, query: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data[0].download_allowed, false);
  assert.equal(res.body.data[0].title, 'Licensed Motion');
});

test('POST /admin/courses/:courseId/linked-content creates a link row for entitled content', async (t) => {
  useMockDb(t);
  const res = makeRes();
  await linkLicensedContentToCourse(
    {
      user: { role: 'client_admin', client_id: 201, id: 9 },
      params: { courseId: '21' },
      body: { content_item_id: 100, source_pack_id: 1, parent_content_id: 500 },
    },
    res
  );
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.is_linked_content, true);
  assert.equal(res.body.download_allowed, false);
});

test('DELETE /admin/courses/:courseId/linked-content/:linkedContentId removes only the link row', async (t) => {
  useMockDb(t);
  const createRes = makeRes();
  await linkLicensedContentToCourse(
    {
      user: { role: 'client_admin', client_id: 201, id: 9 },
      params: { courseId: '21' },
      body: { content_item_id: 100, source_pack_id: 1, parent_content_id: 500 },
    },
    createRes
  );

  const removeRes = makeRes();
  await removeLinkedContentFromCourse(
    {
      user: { role: 'client_admin', client_id: 201, id: 9 },
      params: { courseId: '21', linkedContentId: '900' },
    },
    removeRes
  );
  assert.equal(removeRes.statusCode, 200);
  assert.equal(removeRes.body.removed, true);
});

test('getMergedCourseContentRows includes linked licensed items with read-only flags', async (t) => {
  useMockDb(t);
  const rows = await getMergedCourseContentRows({ courseId: 21 });
  const linkedRow = rows.find((row) => row.is_linked_content);
  assert.ok(linkedRow);
  assert.equal(linkedRow.linked_content_id, 900);
  assert.equal(linkedRow.download_allowed, false);
});
