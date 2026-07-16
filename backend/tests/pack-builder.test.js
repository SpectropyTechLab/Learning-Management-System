import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../config/db.js';
import {
  __resetPackBuilderCachesForTests,
  addPackItems,
  attachCourseToPack,
  createCourse,
  createPack,
  getCourseContent,
  getPackItems,
  getPackSummary,
  listCourses,
  listPacks,
  removePackItem,
} from '../services/packBuilder.service.js';

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

const createMockDb = (overrides = {}) => {
  const data = {
    packItemColumn: 'item_id',
    packItemReference: 'content_items',
    courseMetadataExists: true,
    nextCourseId: 50,
    packs: [
      { id: 1, name: 'STEM Starter', description: 'Starter pack', created_at: '2026-03-29T10:00:00.000Z', is_active: true },
      { id: 2, name: 'Empty Pack', description: null, created_at: '2026-03-28T08:00:00.000Z', is_active: true },
    ],
    courses: [
      { id: 10, title: 'Physics 101', client_id: null, created_at: '2026-03-20T10:00:00.000Z', metadata: { grade: '10', subject: 'Physics' } },
      { id: 11, title: 'Chemistry Basics', client_id: null, created_at: '2026-03-18T10:00:00.000Z', metadata: { grade: '9', subject: 'Chemistry' } },
      { id: 12, title: 'Tenant Biology', client_id: 101, created_at: '2026-03-17T10:00:00.000Z', metadata: { grade: '8', subject: 'Biology' } },
      { id: 13, title: 'Platform Owner Math', client_id: 17, created_at: '2026-03-16T10:00:00.000Z', metadata: { grade: '7', subject: 'Math' } },
      { id: 14, title: 'Physics 101', client_id: 101, created_at: '2026-03-15T10:00:00.000Z', metadata: { grade: '10', subject: 'Physics', is_pack_derived: true } },
    ],
    contentItems: [
      { id: 100, course_id: 10, parent_id: null, item_type: 'video', title: 'Motion', content_url: null, order_index: 0, created_at: '2026-03-20T11:00:00.000Z' },
      { id: 101, course_id: 10, parent_id: null, item_type: 'pdf', title: 'Force Notes', content_url: null, order_index: 1, created_at: '2026-03-20T12:00:00.000Z' },
      { id: 102, course_id: 11, parent_id: null, item_type: 'exam', title: 'Atoms Quiz', content_url: null, order_index: 0, created_at: '2026-03-18T12:00:00.000Z' },
      { id: 103, course_id: 12, parent_id: null, item_type: 'video', title: 'Cells', content_url: null, order_index: 0, created_at: '2026-03-17T12:00:00.000Z' },
    ],
    packItems: [
      { pack_id: 1, item_id: 100 },
      { pack_id: 1, item_id: 102 },
    ],
    ...overrides,
  };

  const normalize = (sql) => String(sql).replace(/\s+/g, ' ').trim().toLowerCase();
  const getCourse = (courseId) => data.courses.find((course) => Number(course.id) === Number(courseId));
  const getContentItem = (itemId) => data.contentItems.find((item) => Number(item.id) === Number(itemId));
  const getPackRootItemsForPack = (packId) =>
    data.packItems.filter((entry) => Number(entry.pack_id) === Number(packId)).map((entry) => getContentItem(entry.item_id)).filter(Boolean);
  const getPackItemsForPack = (packId) => {
    const selected = new Map();
    const addWithDescendants = (item) => {
      if (!item || selected.has(item.id)) return;
      selected.set(item.id, item);
      data.contentItems
        .filter((candidate) => Number(candidate.parent_id) === Number(item.id))
        .forEach(addWithDescendants);
    };
    const addAncestors = (item) => {
      if (!item?.parent_id) return;
      const parent = getContentItem(item.parent_id);
      if (!parent || selected.has(parent.id)) return;
      selected.set(parent.id, parent);
      addAncestors(parent);
    };

    getPackRootItemsForPack(packId).forEach(addWithDescendants);
    Array.from(selected.values()).forEach(addAncestors);
    return Array.from(selected.values()).sort((left, right) => {
      const orderCompare = Number(left.order_index ?? 0) - Number(right.order_index ?? 0);
      if (orderCompare !== 0) return orderCompare;
      return String(left.created_at ?? '').localeCompare(String(right.created_at ?? ''));
    });
  };
  const buildPackItemRow = (item) => {
    const course = getCourse(item.course_id);
    return {
      id: item.id,
      course_id: item.course_id,
      course_name: course?.title ?? 'Unknown',
      parent_id: item.parent_id ?? null,
      item_type: item.item_type,
      title: item.title,
      order_index: item.order_index ?? 0,
      created_at: item.created_at,
      attached_at: null,
      grade: course?.metadata?.grade ?? null,
      subject: course?.metadata?.subject ?? null,
    };
  };
  const getPackRows = () =>
    data.packs
      .map((pack) => {
        const items = getPackItemsForPack(pack.id);
        return {
          ...pack,
          item_count: items.length,
          course_count: new Set(items.map((item) => item.course_id)).size,
        };
      })
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
  const filterCourses = (clientId, q) =>
    data.courses
      .filter((course) => (clientId === null ? course.client_id === null || Number(course.client_id) === 17 : Number(course.client_id) === Number(clientId)))
      .filter((course) => course.metadata?.is_pack_derived !== true)
      .filter((course) => {
        if (!q) return true;
        const value = q.toLowerCase();
        return (
          course.title.toLowerCase().includes(value) ||
          String(course.metadata?.grade ?? '').toLowerCase().includes(value) ||
          String(course.metadata?.subject ?? '').toLowerCase().includes(value)
        );
      })
      .sort((left, right) => left.title.localeCompare(right.title));

  return {
    async query(text, params = []) {
      const normalized = normalize(text);

      if (normalized.includes("table_name = 'content_pack_items'") && normalized.includes("column_name in ('item_id', 'content_id')")) {
        return { rows: [{ column_name: data.packItemColumn }] };
      }

      if (normalized.includes("table_name = 'courses'") && normalized.includes("column_name = 'metadata'")) {
        return { rows: [{ exists: data.courseMetadataExists }] };
      }

      if (normalized.includes("tc.table_name = 'content_pack_items'") && normalized.includes("constraint_type = 'foreign key'")) {
        return { rows: [{ referenced_table: data.packItemReference }] };
      }

      if (normalized.startsWith('alter table courses add column if not exists metadata jsonb default')) {
        data.courseMetadataExists = true;
        return { rows: [] };
      }

      if (normalized === 'select count(*)::int as total from content_packs') {
        return { rows: [{ total: data.packs.length }] };
      }

      if (normalized.startsWith('select id from content_packs where lower(btrim(name)) = lower(btrim($1)) limit 1')) {
        const pack = data.packs.find((entry) => entry.name.trim().toLowerCase() === String(params[0]).trim().toLowerCase());
        return { rows: pack ? [{ id: pack.id }] : [] };
      }

      if (normalized.startsWith('insert into content_packs (name, description, created_by)')) {
        const nextId = Math.max(...data.packs.map((pack) => pack.id), 0) + 1;
        const row = {
          id: nextId,
          name: params[0],
          description: params[1],
          created_at: '2026-03-30T10:00:00.000Z',
          is_active: true,
        };
        data.packs.unshift(row);
        return { rows: [row] };
      }

      if (normalized.includes('from content_packs cp') && normalized.includes('count(distinct ci.course_id)::int as course_count')) {
        const limit = Number(params[0]);
        const offset = Number(params[1]);
        return { rows: getPackRows().slice(offset, offset + limit) };
      }

      if (normalized.startsWith('select id, name, description, created_at, is_active from content_packs where id = $1 limit 1')) {
        const pack = data.packs.find((entry) => Number(entry.id) === Number(params[0]));
        return { rows: pack ? [pack] : [] };
      }

      if (normalized.startsWith('select count(*)::int as total from content_pack_items where pack_id = $1')) {
        return { rows: [{ total: data.packItems.filter((entry) => Number(entry.pack_id) === Number(params[0])).length }] };
      }

      if (normalized.includes('from content_pack_items cpi join content_items ci on ci.id = cpi.item_id') && normalized.includes('limit $2 offset $3')) {
        const rows = getPackItemsForPack(params[0]).map(buildPackItemRow);
        const limit = Number(params[1]);
        const offset = Number(params[2]);
        return { rows: rows.slice(offset, offset + limit) };
      }

      if (normalized.includes('from content_pack_items cpi join content_items ci on ci.id = cpi.item_id') && !normalized.includes('limit $2 offset $3')) {
        return { rows: getPackItemsForPack(params[0]).map(buildPackItemRow) };
      }

      if (normalized.startsWith('select count(*)::int as total from courses c')) {
        const clientId = normalized.includes('c.client_id = $1') ? Number(params[0]) : null;
        const qIndex = normalized.includes('ilike $2') ? 1 : normalized.includes('ilike $1') ? 0 : -1;
        const q = qIndex >= 0 ? String(params[qIndex]).replace(/%/g, '') : '';
        return { rows: [{ total: filterCourses(clientId, q).length }] };
      }

      if (normalized.includes('from courses c') && normalized.includes('content_item_count')) {
        const clientId = normalized.includes('c.client_id = $1') ? Number(params[0]) : null;
        const qIndex = normalized.includes('ilike $2') ? 1 : normalized.includes('ilike $1') ? 0 : -1;
        const q = qIndex >= 0 ? String(params[qIndex]).replace(/%/g, '') : '';
        const limit = Number(params[params.length - 2]);
        const offset = Number(params[params.length - 1]);
        const rows = filterCourses(clientId, q).map((course) => ({
          id: course.id,
          name: course.title,
          grade: course.metadata?.grade ?? null,
          subject: course.metadata?.subject ?? null,
          client_id: course.client_id,
          created_at: course.created_at,
          content_item_count: data.contentItems.filter((item) => Number(item.course_id) === Number(course.id)).length,
        }));
        return { rows: rows.slice(offset, offset + limit) };
      }

      if (normalized.includes('from courses c where c.id = $1 limit 1')) {
        const course = getCourse(params[0]);
        return {
          rows: course
            ? [{
                id: course.id,
                name: course.title,
                client_id: course.client_id,
                grade: course.metadata?.grade ?? null,
                subject: course.metadata?.subject ?? null,
              }]
            : [],
        };
      }

      if (normalized.startsWith('select count(*)::int as total from content_items where course_id = $1')) {
        return { rows: [{ total: data.contentItems.filter((item) => Number(item.course_id) === Number(params[0])).length }] };
      }

      if (normalized.startsWith('select id, course_id, parent_id, item_type, title, content_url, order_index, created_at from content_items where course_id = $1')) {
        const rows = data.contentItems
          .filter((item) => Number(item.course_id) === Number(params[0]))
          .sort((left, right) => left.order_index - right.order_index)
          .slice(Number(params[2]), Number(params[2]) + Number(params[1]));
        return { rows };
      }

      if (normalized.startsWith('select id from courses where lower(btrim(title)) = lower(btrim($1))')) {
        const course = data.courses.find(
          (entry) => entry.title.trim().toLowerCase() === String(params[0]).trim().toLowerCase() && entry.client_id === params[1]
        );
        return { rows: course ? [{ id: course.id }] : [] };
      }

      if (normalized.startsWith('insert into courses (title, description, published, created_by, client_id, metadata)')) {
        const nextId = data.nextCourseId++;
        data.courses.push({
          id: nextId,
          title: params[0],
          client_id: params[2],
          created_at: '2026-03-30T09:00:00.000Z',
          metadata: JSON.parse(params[3]),
        });
        return { rows: [{ id: nextId }] };
      }

      if (normalized.includes('from content_items ci join courses c on c.id = ci.course_id where ci.id = any($1::int[])')) {
        const ids = params[0];
        return {
          rows: ids.map((id) => {
            const item = getContentItem(id);
            const course = item ? getCourse(item.course_id) : null;
            return item ? { id: item.id, course_id: item.course_id, client_id: course?.client_id ?? null } : null;
          }).filter(Boolean),
        };
      }

      if (normalized.startsWith('select item_id as item_id from content_pack_items where pack_id = $1 and item_id = any($2::int[])')) {
        return {
          rows: data.packItems
            .filter((entry) => Number(entry.pack_id) === Number(params[0]) && params[1].includes(entry.item_id))
            .map((entry) => ({ item_id: entry.item_id })),
        };
      }

      if (normalized.startsWith('with recursive ancestors as') && normalized.includes('delete from content_pack_items cpi')) {
        const packId = Number(params[0]);
        const itemIds = params[1].map((value) => Number(value));
        const ancestorIds = new Set();
        const addAncestors = (itemId) => {
          const item = getContentItem(itemId);
          if (!item?.parent_id) return;
          const parentId = Number(item.parent_id);
          if (ancestorIds.has(parentId)) return;
          ancestorIds.add(parentId);
          addAncestors(parentId);
        };
        itemIds.forEach(addAncestors);
        data.packItems = data.packItems.filter(
          (entry) => Number(entry.pack_id) !== packId || !ancestorIds.has(Number(entry.item_id))
        );
        return { rows: [], rowCount: 0 };
      }

      if (normalized.startsWith('insert into content_pack_items (pack_id, item_id)')) {
        params[1].forEach((itemId) => {
          if (!data.packItems.some((entry) => Number(entry.pack_id) === Number(params[0]) && Number(entry.item_id) === Number(itemId))) {
            data.packItems.push({ pack_id: Number(params[0]), item_id: Number(itemId) });
          }
        });
        return { rows: [] };
      }

      if (normalized.startsWith('select id, client_id from courses where id = $1 limit 1')) {
        const course = getCourse(params[0]);
        return { rows: course ? [{ id: course.id, client_id: course.client_id }] : [] };
      }

      if (normalized.startsWith('select id from content_items where course_id = $1 order by order_index asc, created_at asc')) {
        return {
          rows: data.contentItems
            .filter((item) => Number(item.course_id) === Number(params[0]))
            .sort((left, right) => left.order_index - right.order_index)
            .map((item) => ({ id: item.id })),
        };
      }

      if (normalized.startsWith('delete from content_pack_items where pack_id = $1 and item_id = $2')) {
        const before = data.packItems.length;
        data.packItems = data.packItems.filter((entry) => !(Number(entry.pack_id) === Number(params[0]) && Number(entry.item_id) === Number(params[1])));
        return { rowCount: before - data.packItems.length, rows: [] };
      }

      throw new Error(`Unhandled mock query: ${normalized}`);
    },
  };
};

const useMockDb = (t, overrides = {}) => {
  const originalQuery = pool.query.bind(pool);
  const mockDb = createMockDb(overrides);
  pool.query = mockDb.query.bind(mockDb);
  __resetPackBuilderCachesForTests();
  t.after(() => {
    pool.query = originalQuery;
    __resetPackBuilderCachesForTests();
  });
};

test('GET /packs returns paginated item-based pack summaries', async (t) => {
  useMockDb(t);
  const res = makeRes();
  await listPacks({ user: { role: 'super_admin' }, query: { page: '1', page_size: '1' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 2);
  assert.equal(res.body.data[0].course_count, 2);
  assert.equal(res.body.data[0].item_count, 2);
});

test('POST /packs creates a new pack and blocks duplicate names', async (t) => {
  useMockDb(t);

  const createdRes = makeRes();
  await createPack({ user: { role: 'super_admin', id: 1 }, body: { name: 'Exam Essentials', description: 'Starter exam bundle' } }, createdRes);
  assert.equal(createdRes.statusCode, 201);
  assert.equal(createdRes.body.name, 'Exam Essentials');
  assert.equal(createdRes.body.item_count, 0);

  const duplicateRes = makeRes();
  await createPack({ user: { role: 'content_authorizer', id: 4 }, body: { name: 'Exam Essentials' } }, duplicateRes);
  assert.equal(duplicateRes.statusCode, 409);
  assert.equal(duplicateRes.body.error, 'A pack with this name already exists');
});

test('GET /packs/:id/items returns 404 for an invalid pack id', async (t) => {
  useMockDb(t);
  const res = makeRes();
  await getPackItems({ user: { role: 'super_admin' }, params: { id: '999' }, query: {} }, res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, 'Pack not found');
});

test('GET /packs/:id/summary returns grouped course and subject counts', async (t) => {
  useMockDb(t);
  const res = makeRes();
  await getPackSummary({ user: { role: 'content_authorizer' }, params: { id: '1' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total_items, 2);
  assert.equal(res.body.groups.length, 2);
  assert.equal(res.body.groups[0].items[0].title.length > 0, true);
});

test('GET /packs/:id/summary preserves parent-child hierarchy metadata for grouped items', async (t) => {
  useMockDb(t, {
    contentItems: [
      { id: 100, course_id: 10, parent_id: null, item_type: 'folder', title: 'Chapter 1', content_url: null, order_index: 0, created_at: '2026-03-20T11:00:00.000Z' },
      { id: 101, course_id: 10, parent_id: 100, item_type: 'folder', title: 'Topic 1.1', content_url: null, order_index: 0, created_at: '2026-03-20T12:00:00.000Z' },
      { id: 102, course_id: 10, parent_id: 101, item_type: 'pdf', title: 'Concept', content_url: null, order_index: 0, created_at: '2026-03-20T13:00:00.000Z' },
    ],
    packItems: [
      { pack_id: 1, item_id: 100 },
      { pack_id: 1, item_id: 101 },
      { pack_id: 1, item_id: 102 },
    ],
  });
  const res = makeRes();
  await getPackSummary({ user: { role: 'content_authorizer' }, params: { id: '1' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.groups.length, 1);
  assert.deepEqual(
    res.body.groups[0].items.map((item) => ({
      id: item.id,
      parent_id: item.parent_id,
      order_index: item.order_index,
    })),
    [
      { id: 100, parent_id: null, order_index: 0 },
      { id: 101, parent_id: 100, order_index: 0 },
      { id: 102, parent_id: 101, order_index: 0 },
    ],
  );
});

test('GET /packs/:id/summary expands a selected folder root to ancestors and descendants', async (t) => {
  useMockDb(t, {
    contentItems: [
      { id: 100, course_id: 10, parent_id: null, item_type: 'folder', title: 'MATHEMATICAL TOOLS', content_url: null, order_index: 0, created_at: '2026-03-20T11:00:00.000Z' },
      { id: 101, course_id: 10, parent_id: 100, item_type: 'folder', title: 'Squares and Square roots', content_url: null, order_index: 0, created_at: '2026-03-20T12:00:00.000Z' },
      { id: 102, course_id: 10, parent_id: 101, item_type: 'folder', title: 'EBook', content_url: null, order_index: 0, created_at: '2026-03-20T13:00:00.000Z' },
      { id: 103, course_id: 10, parent_id: 102, item_type: 'scorm', title: 'Concept', content_url: null, order_index: 0, created_at: '2026-03-20T14:00:00.000Z' },
    ],
    packItems: [
      { pack_id: 1, item_id: 101 },
    ],
  });
  const res = makeRes();
  await getPackSummary({ user: { role: 'content_authorizer' }, params: { id: '1' } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(
    res.body.groups[0].items.map((item) => item.title),
    ['MATHEMATICAL TOOLS', 'Squares and Square roots', 'EBook', 'Concept'],
  );
});

test('GET /courses defaults to global courses and supports search for content_authorizer without client_id', async (t) => {
  useMockDb(t);
  const res = makeRes();
  await listCourses({ user: { role: 'content_authorizer' }, query: { q: 'physics' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 1);
  assert.equal(res.body.data[0].name, 'Physics 101');
  assert.equal(res.body.data[0].client_id, null);
});

test('GET /courses includes platform-owner courses in the default source list', async (t) => {
  useMockDb(t);
  const res = makeRes();
  await listCourses({ user: { role: 'content_authorizer' }, query: { q: 'math' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 1);
  assert.equal(res.body.data[0].name, 'Platform Owner Math');
  assert.equal(res.body.data[0].client_id, 17);
});

test('GET /courses hides pack-derived client copies from source search', async (t) => {
  useMockDb(t);
  const res = makeRes();
  await listCourses({ user: { role: 'super_admin' }, query: { client_id: '101', q: 'physics' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 0);
});

test('GET /courses allows explicit client filter for super_admin', async (t) => {
  useMockDb(t);
  const res = makeRes();
  await listCourses({ user: { role: 'super_admin' }, query: { client_id: '101' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 1);
  assert.equal(res.body.data[0].name, 'Tenant Biology');
});

test('POST /courses validates required fields and allows duplicate names within the same scope', async (t) => {
  useMockDb(t);

  const missingRes = makeRes();
  await createCourse({ user: { role: 'super_admin' }, body: { name: 'New Course' } }, missingRes);
  assert.equal(missingRes.statusCode, 400);
  assert.equal(missingRes.body.error, 'grade is required');

  const duplicateRes = makeRes();
  await createCourse({ user: { role: 'super_admin', id: 7 }, body: { name: 'Physics 101', grade: '10' } }, duplicateRes);
  assert.equal(duplicateRes.statusCode, 201);
  assert.equal(duplicateRes.body.course_id, 50);
});

test('POST /courses creates a new global course and returns course_id', async (t) => {
  useMockDb(t);
  const res = makeRes();
  await createCourse({ user: { role: 'content_authorizer', id: 7 }, body: { name: 'Biology Prime', grade: '11', subject: 'Biology' } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.course_id, 50);
});

test('GET /courses/:id/content returns paginated item preview data', async (t) => {
  useMockDb(t);
  const res = makeRes();
  await getCourseContent({ user: { role: 'content_authorizer' }, params: { id: '10' }, query: { page: '1', page_size: '1' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 2);
  assert.equal(res.body.data[0].course_name, 'Physics 101');
});

test('POST /packs/:id/items adds new items and skips duplicates', async (t) => {
  useMockDb(t);
  const res = makeRes();
  await addPackItems({ user: { role: 'super_admin' }, params: { id: '1' }, body: { item_ids: [101, 102] } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.added_item_ids, [101]);
  assert.deepEqual(res.body.skipped_item_ids, [102]);
  assert.equal(res.body.item_count, 3);
});

test('POST /packs/:id/items rejects client-owned content items', async (t) => {
  useMockDb(t);
  const res = makeRes();
  await addPackItems({ user: { role: 'content_authorizer' }, params: { id: '1' }, body: { item_ids: [103] } }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, 'Only platform-global course items can be attached to a global pack');
});

test('POST /packs/:id/items replaces an existing chapter root with selected topic roots', async (t) => {
  useMockDb(t, {
    contentItems: [
      { id: 100, course_id: 10, parent_id: null, item_type: 'folder', title: 'MATHEMATICAL TOOLS', content_url: null, order_index: 0, created_at: '2026-03-20T11:00:00.000Z' },
      { id: 101, course_id: 10, parent_id: 100, item_type: 'folder', title: 'Squares and Square roots', content_url: null, order_index: 0, created_at: '2026-03-20T12:00:00.000Z' },
      { id: 102, course_id: 10, parent_id: 101, item_type: 'scorm', title: 'Concept', content_url: null, order_index: 0, created_at: '2026-03-20T13:00:00.000Z' },
      { id: 103, course_id: 10, parent_id: 100, item_type: 'folder', title: 'Applications of integration - analytical', content_url: null, order_index: 1, created_at: '2026-03-20T14:00:00.000Z' },
      { id: 104, course_id: 10, parent_id: 103, item_type: 'scorm', title: 'Workbook', content_url: null, order_index: 0, created_at: '2026-03-20T15:00:00.000Z' },
      { id: 105, course_id: 10, parent_id: 100, item_type: 'folder', title: 'Range of trigonometric functions', content_url: null, order_index: 2, created_at: '2026-03-20T16:00:00.000Z' },
    ],
    packItems: [
      { pack_id: 1, item_id: 100 },
    ],
  });

  const addRes = makeRes();
  await addPackItems({ user: { role: 'content_authorizer' }, params: { id: '1' }, body: { item_ids: [101, 103] } }, addRes);
  assert.equal(addRes.statusCode, 200);

  const summaryRes = makeRes();
  await getPackSummary({ user: { role: 'content_authorizer' }, params: { id: '1' } }, summaryRes);
  assert.equal(summaryRes.statusCode, 200);
  const titles = summaryRes.body.groups[0].items.map((item) => item.title);
  assert.equal(titles.includes('MATHEMATICAL TOOLS'), true);
  assert.equal(titles.includes('Squares and Square roots'), true);
  assert.equal(titles.includes('Concept'), true);
  assert.equal(titles.includes('Applications of integration - analytical'), true);
  assert.equal(titles.includes('Workbook'), true);
  assert.equal(titles.includes('Range of trigonometric functions'), false);
});

test('POST /packs/:id/attach-course attaches all items from a global course', async (t) => {
  useMockDb(t);
  const res = makeRes();
  await attachCourseToPack({ user: { role: 'super_admin' }, params: { id: '1' }, body: { course_id: '10' } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.added_item_ids, [101]);
  assert.deepEqual(res.body.skipped_item_ids, [100]);
});

test('DELETE /packs/:id/items/:itemId is idempotent and returns updated item_count', async (t) => {
  useMockDb(t);
  const firstRes = makeRes();
  await removePackItem({ user: { role: 'content_authorizer' }, params: { id: '1', itemId: '100' } }, firstRes);
  assert.equal(firstRes.statusCode, 200);
  assert.equal(firstRes.body.removed, true);
  assert.equal(firstRes.body.item_count, 1);

  const secondRes = makeRes();
  await removePackItem({ user: { role: 'content_authorizer' }, params: { id: '1', itemId: '100' } }, secondRes);
  assert.equal(secondRes.statusCode, 200);
  assert.equal(secondRes.body.removed, false);
  assert.equal(secondRes.body.item_count, 1);
});
