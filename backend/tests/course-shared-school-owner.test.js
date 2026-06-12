import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../config/db.js';
import { ensureCourseActionAccess, listCoursesForRequest } from '../services/courseShared.service.js';

const normalizeSql = (value) => String(value).replace(/\s+/g, ' ').trim().toLowerCase();

const makeReq = () => ({
  baseUrl: '/api/school-owner',
  user: {
    id: 44,
    role: 'school_owner',
    client_id: 301,
  },
});

test('listCoursesForRequest returns school-owner assigned courses with read-only flags for assigned-only courses', async (t) => {
  const originalQuery = pool.query;
  const calls = [];

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);
    calls.push({ text: normalized, params });

    if (
      normalized.includes('create table if not exists course_school_assignments')
      || normalized.includes('create index if not exists idx_course_school_assignments_course')
      || normalized.includes('create index if not exists idx_course_school_assignments_school')
      || normalized.includes('create table if not exists client_course_title_overrides')
      || normalized.includes('create index if not exists idx_client_course_title_overrides_client')
      || normalized.includes('create index if not exists idx_client_course_title_overrides_course')
    ) {
      return { rows: [] };
    }

    if (normalized.includes('select distinct school_id from school_memberships')) {
      return { rows: [{ school_id: 11 }, { school_id: 12 }] };
    }

    if (normalized.includes("table_name = 'content_pack_items'") && normalized.includes("column_name in ('item_id', 'content_id')")) {
      return { rows: [{ column_name: 'item_id' }] };
    }

    if (normalized.includes('from content_entitlements ce') && normalized.includes('from courses c')) {
      return { rows: [] };
    }

    if (normalized.includes('from client_course_title_overrides')) {
      return { rows: [] };
    }

    if (normalized.includes('from client_course_title_overrides')) {
      return { rows: [] };
    }

    if (normalized.includes('from courses c')) {
      return {
        rows: [
          {
            id: 5,
            title: 'Shared Algebra',
            description: 'Shared course',
            published: true,
            created_at: '2026-04-01T10:00:00.000Z',
            updated_at: null,
            created_by: 99,
            client_id: 301,
            assigned_school_ids: [11],
            assigned_school_names: ['North School'],
            assigned_school_count: 1,
          },
        ],
      };
    }

    throw new Error(`Unexpected query: ${normalized}`);
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  const courses = await listCoursesForRequest(makeReq());

  assert.equal(courses.length, 1);
  assert.equal(courses[0].is_assigned_to_my_school, true);
  assert.equal(courses[0].is_created_by_me, false);
  assert.equal(courses[0].can_manage_content, false);
  assert.equal(courses[0].can_edit_course, false);
  assert.equal(courses[0].can_enroll, true);
  assert.equal(courses[0].assigned_school_count, 1);
  assert.ok(calls.some((call) => call.text.includes('exists ( select 1 from course_school_assignments scoped_csa')));
});

test('ensureCourseActionAccess blocks school owners from updating assigned courses they did not create', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);

    if (
      normalized.includes('create table if not exists course_school_assignments')
      || normalized.includes('create index if not exists idx_course_school_assignments_course')
      || normalized.includes('create index if not exists idx_course_school_assignments_school')
      || normalized.includes('create table if not exists client_course_title_overrides')
      || normalized.includes('create index if not exists idx_client_course_title_overrides_client')
      || normalized.includes('create index if not exists idx_client_course_title_overrides_course')
    ) {
      return { rows: [] };
    }

    if (normalized.includes('select distinct school_id from school_memberships')) {
      return { rows: [{ school_id: 11 }] };
    }

    if (normalized.includes("table_name = 'content_pack_items'") && normalized.includes("column_name in ('item_id', 'content_id')")) {
      return { rows: [{ column_name: 'item_id' }] };
    }

    if (normalized.includes('from content_entitlements ce') && normalized.includes('from courses c')) {
      return { rows: [] };
    }

    if (normalized.includes('from client_course_title_overrides')) {
      return { rows: [] };
    }

    if (normalized.includes('from client_course_title_overrides')) {
      return { rows: [] };
    }

    if (normalized.includes('from courses c') && normalized.includes('where c.id = $1')) {
      return {
        rows: [
          {
            id: Number(params[0]),
            title: 'Shared Algebra',
            description: 'Shared course',
            published: false,
            created_at: '2026-04-01T10:00:00.000Z',
            updated_at: null,
            created_by: 99,
            client_id: 301,
            assigned_school_ids: [11],
            assigned_school_names: ['North School'],
            assigned_school_count: 1,
          },
        ],
      };
    }

    throw new Error(`Unexpected query: ${normalized}`);
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  const result = await ensureCourseActionAccess({
    courseId: 5,
    req: makeReq(),
    action: 'update',
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
  assert.equal(result.error, 'Assigned courses are read-only for school owners.');
});

test('listCoursesForRequest includes entitled platform courses for client admins as read-only courses', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);

    if (
      normalized.includes('create table if not exists course_school_assignments')
      || normalized.includes('create index if not exists idx_course_school_assignments_course')
      || normalized.includes('create index if not exists idx_course_school_assignments_school')
      || normalized.includes('create table if not exists client_course_title_overrides')
      || normalized.includes('create index if not exists idx_client_course_title_overrides_client')
      || normalized.includes('create index if not exists idx_client_course_title_overrides_course')
      || normalized.includes('create table if not exists client_course_title_overrides')
      || normalized.includes('create index if not exists idx_client_course_title_overrides_client')
      || normalized.includes('create index if not exists idx_client_course_title_overrides_course')
      || normalized.includes('create table if not exists client_course_title_overrides')
      || normalized.includes('create index if not exists idx_client_course_title_overrides_client')
      || normalized.includes('create index if not exists idx_client_course_title_overrides_course')
    ) {
      return { rows: [] };
    }

    if (normalized.includes("table_name = 'content_pack_items'") && normalized.includes("column_name in ('item_id', 'content_id')")) {
      return { rows: [{ column_name: 'item_id' }] };
    }

    if (normalized.startsWith('select distinct pack_id from content_entitlements')) {
      return { rows: [] };
    }

    if (normalized.includes('from content_entitlements ce') && normalized.includes('where c.client_id is null or c.client_id = 17')) {
      return { rows: [{ course_id: 77 }] };
    }

    if (normalized.includes('from client_course_title_overrides')) {
      return { rows: [] };
    }

    if (normalized.includes('from courses c')) {
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

    throw new Error(`Unexpected query: ${normalized}`);
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  const courses = await listCoursesForRequest({
    baseUrl: '/api/admin',
    user: {
      id: 15,
      role: 'client_admin',
      client_id: 301,
    },
  });

  assert.equal(courses.length, 1);
  assert.equal(courses[0].id, 77);
  assert.equal(courses[0].is_entitled_platform_course, true);
  assert.equal(courses[0].can_manage_content, false);
  assert.equal(courses[0].can_edit_course, false);
  assert.equal(courses[0].can_rename_assigned_course, true);
  assert.equal(courses[0].can_delete_course, false);
  assert.equal(courses[0].can_enroll, false);
});

test('listCoursesForRequest returns derived client-owned courses for client admins without marking them as entitled platform courses', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);

    if (
      normalized.includes('create table if not exists course_school_assignments')
      || normalized.includes('create index if not exists idx_course_school_assignments_course')
      || normalized.includes('create index if not exists idx_course_school_assignments_school')
      || normalized.includes('create table if not exists client_course_title_overrides')
      || normalized.includes('create index if not exists idx_client_course_title_overrides_client')
      || normalized.includes('create index if not exists idx_client_course_title_overrides_course')
    ) {
      return { rows: [] };
    }

    if (normalized.startsWith('select distinct pack_id from content_entitlements')) {
      return { rows: [] };
    }

    if (normalized.includes('from content_entitlements ce') && normalized.includes('where c.client_id is null or c.client_id = 17')) {
      return { rows: [] };
    }

    if (normalized.includes('from client_course_title_overrides')) {
      return { rows: [] };
    }

    if (normalized.includes('from courses c')) {
      assert.deepEqual(params, [301]);
      return {
        rows: [
          {
            id: 501,
            title: 'VSM_G6_PHY',
            description: 'Derived from pack: techno',
            published: true,
            created_at: '2026-06-12T00:00:00.000Z',
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

    throw new Error(`Unexpected query: ${normalized}`);
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  const courses = await listCoursesForRequest({
    baseUrl: '/api/admin',
    user: {
      id: 15,
      role: 'client_admin',
      client_id: 301,
    },
  });

  assert.equal(courses.length, 1);
  assert.equal(courses[0].id, 501);
  assert.equal(courses[0].title, 'VSM_G6_PHY');
  assert.equal(courses[0].is_entitled_platform_course, false);
  assert.equal(courses[0].is_pack_derived, true);
  assert.equal(courses[0].can_manage_content, false);
  assert.equal(courses[0].can_edit_course, false);
  assert.equal(courses[0].can_rename_assigned_course, true);
  assert.equal(courses[0].can_enroll, false);
});

test('listCoursesForRequest keeps platform and derived courses together for client admins', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);

    if (
      normalized.includes('create table if not exists course_school_assignments')
      || normalized.includes('create index if not exists idx_course_school_assignments_course')
      || normalized.includes('create index if not exists idx_course_school_assignments_school')
      || normalized.includes('create table if not exists client_course_title_overrides')
      || normalized.includes('create index if not exists idx_client_course_title_overrides_client')
      || normalized.includes('create index if not exists idx_client_course_title_overrides_course')
    ) {
      return { rows: [] };
    }

    if (normalized.startsWith('select distinct pack_id from content_entitlements')) {
      return { rows: [] };
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

    if (normalized.includes('from courses c')) {
      assert.deepEqual(params, [301, [77]]);
      return {
        rows: [
          {
            id: 77,
            title: 'Techno_PHY',
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
          {
            id: 501,
            title: 'TECHNO_PHY',
            description: 'Derived from pack: techno',
            published: true,
            created_at: '2026-06-12T00:00:00.000Z',
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

    throw new Error(`Unexpected query: ${normalized}`);
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  const courses = await listCoursesForRequest({
    baseUrl: '/api/admin',
    user: {
      id: 15,
      role: 'client_admin',
      client_id: 301,
    },
  });

  assert.equal(courses.length, 2);
  const platformCourse = courses.find((course) => course.id === 77);
  const derivedCourse = courses.find((course) => course.id === 501);
  assert.ok(platformCourse);
  assert.ok(derivedCourse);
  assert.equal(platformCourse?.is_entitled_platform_course, true);
  assert.equal(platformCourse?.can_rename_assigned_course, true);
  assert.equal(derivedCourse?.is_pack_derived, true);
  assert.equal(derivedCourse?.can_rename_assigned_course, true);
});

test('listCoursesForRequest classifies client-17 derived courses as assigned courses, not platform-manageable courses', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);

    if (
      normalized.includes('create table if not exists course_school_assignments')
      || normalized.includes('create index if not exists idx_course_school_assignments_course')
      || normalized.includes('create index if not exists idx_course_school_assignments_school')
      || normalized.includes('create table if not exists client_course_title_overrides')
      || normalized.includes('create index if not exists idx_client_course_title_overrides_client')
      || normalized.includes('create index if not exists idx_client_course_title_overrides_course')
    ) {
      return { rows: [] };
    }

    if (normalized.startsWith('select distinct pack_id from content_entitlements')) {
      return { rows: [] };
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

    if (normalized.includes('from courses c')) {
      assert.deepEqual(params, [17, [77]]);
      return {
        rows: [
          {
            id: 901,
            title: 'TECHNO_PHY',
            description: 'Derived from pack: techno',
            published: true,
            created_at: '2026-06-12T00:00:00.000Z',
            updated_at: null,
            created_by: 9,
            client_id: 17,
            assigned_school_ids: [],
            assigned_school_names: [],
            assigned_school_count: 0,
          },
        ],
      };
    }

    throw new Error(`Unexpected query: ${normalized}`);
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  const courses = await listCoursesForRequest({
    baseUrl: '/api/admin',
    user: {
      id: 15,
      role: 'client_admin',
      client_id: 17,
    },
  });

  assert.equal(courses.length, 1);
  assert.equal(courses[0].id, 901);
  assert.equal(courses[0].is_pack_derived, true);
  assert.equal(courses[0].course_access_type, 'pack_derived');
  assert.equal(courses[0].can_manage_content, false);
  assert.equal(courses[0].can_edit_course, false);
  assert.equal(courses[0].can_enroll, false);
  assert.equal(courses[0].can_rename_assigned_course, true);
});

test('listCoursesForRequest keeps client-17 platform courses read-only even when they come through the client-owned branch', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);

    if (
      normalized.includes('create table if not exists course_school_assignments')
      || normalized.includes('create index if not exists idx_course_school_assignments_course')
      || normalized.includes('create index if not exists idx_course_school_assignments_school')
      || normalized.includes('create table if not exists client_course_title_overrides')
      || normalized.includes('create index if not exists idx_client_course_title_overrides_client')
      || normalized.includes('create index if not exists idx_client_course_title_overrides_course')
    ) {
      return { rows: [] };
    }

    if (normalized.startsWith('select distinct pack_id from content_entitlements')) {
      return { rows: [] };
    }

    if (normalized.includes("table_name = 'content_pack_items'") && normalized.includes("column_name in ('item_id', 'content_id')")) {
      return { rows: [{ column_name: 'item_id' }] };
    }

    if (normalized.includes('from content_entitlements ce') && normalized.includes('where c.client_id is null or c.client_id = 17')) {
      return { rows: [] };
    }

    if (normalized.includes('from client_course_title_overrides')) {
      return { rows: [] };
    }

    if (normalized.includes('from courses c')) {
      assert.deepEqual(params, [17]);
      return {
        rows: [
          {
            id: 902,
            title: 'TECHNO_BIO',
            description: 'Platform owned course',
            published: true,
            created_at: '2026-06-12T00:00:00.000Z',
            updated_at: null,
            created_by: 9,
            client_id: 17,
            assigned_school_ids: [],
            assigned_school_names: [],
            assigned_school_count: 0,
          },
        ],
      };
    }

    throw new Error(`Unexpected query: ${normalized}`);
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  const courses = await listCoursesForRequest({
    baseUrl: '/api/admin',
    user: {
      id: 15,
      role: 'client_admin',
      client_id: 17,
    },
  });

  assert.equal(courses.length, 1);
  assert.equal(courses[0].id, 902);
  assert.equal(courses[0].course_access_type, 'platform_assigned');
  assert.equal(courses[0].is_pack_derived, false);
  assert.equal(courses[0].can_manage_content, false);
  assert.equal(courses[0].can_edit_course, false);
  assert.equal(courses[0].can_enroll, false);
  assert.equal(courses[0].can_rename_assigned_course, true);
});
