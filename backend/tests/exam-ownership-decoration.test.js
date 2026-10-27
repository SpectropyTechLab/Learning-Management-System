import assert from 'node:assert/strict';
import { test } from 'node:test';
import pool from '../config/db.js';
import { buildExamWhere, decorateExamForUser } from '../services/exams.service.js';

const normalizeSql = (value) => String(value).replace(/\s+/g, ' ').trim().toLowerCase();

test('school-scoped exam under platform client is classified as school owned', () => {
  const decorated = decorateExamForUser(
    {
      id: 114,
      client_id: 17,
      school_id: 24,
      status: 'draft',
      created_by: 44,
    },
    {
      id: 44,
      role: 'school_owner',
      client_id: 17,
    }
  );

  assert.equal(decorated.exam_access_type, 'school_owned');
  assert.equal(decorated.can_edit, true);
  assert.equal(decorated.can_build, true);
  assert.equal(decorated.can_delete, true);
  assert.equal(decorated.can_publish, true);
});

test('content authorizer gets preview-only access for school-owned platform-client exams', () => {
  const decorated = decorateExamForUser(
    {
      id: 114,
      client_id: 17,
      school_id: 24,
      status: 'published',
      created_by: 44,
    },
    {
      id: 7,
      role: 'content_authorizer',
      client_id: 17,
    }
  );

  assert.equal(decorated.exam_access_type, 'school_owned');
  assert.equal(decorated.can_preview, true);
  assert.equal(decorated.can_edit, false);
  assert.equal(decorated.can_build, false);
  assert.equal(decorated.can_delete, false);
  assert.equal(decorated.can_publish, false);
});

test('true platform exam remains platform owned and manageable by content authorizer', () => {
  const decorated = decorateExamForUser(
    {
      id: 115,
      client_id: 17,
      school_id: null,
      program_school_id: null,
      status: 'draft',
      created_by: 7,
    },
    {
      id: 7,
      role: 'content_authorizer',
      client_id: 17,
    }
  );

  assert.equal(decorated.exam_access_type, 'platform_owned');
  assert.equal(decorated.can_edit, true);
  assert.equal(decorated.can_build, true);
  assert.equal(decorated.can_delete, true);
  assert.equal(decorated.can_publish, true);
});

test('normal client admin exam list filter excludes school-scoped platform-client exams', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);

    if (
      normalized.startsWith('create table if not exists exam_entitlements') ||
      normalized.startsWith('create unique index if not exists') ||
      normalized.startsWith('create index if not exists') ||
      normalized.startsWith('do $$')
    ) {
      return { rows: [] };
    }

    if (
      normalized.includes('from exam_entitlements') &&
      normalized.includes("entitlement_type = 'feature'")
    ) {
      assert.deepEqual(params, [33, 'exams']);
      return { rows: [{ id: 1 }] };
    }

    if (
      normalized.includes('select program_id') &&
      normalized.includes('from exam_entitlements')
    ) {
      assert.deepEqual(params, [33]);
      return { rows: [{ program_id: 6 }] };
    }

    throw new Error(`Unexpected query: ${normalized}`);
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  const { conditions, params } = await buildExamWhere({
    user: { id: 501, role: 'client_admin', client_id: 33 },
    query: {},
  });
  const whereSql = normalizeSql(conditions.join(' and '));

  assert.match(whereSql, /e\.client_id = any\(\$1\)/);
  assert.match(whereSql, /e\.school_id is null/);
  assert.match(whereSql, /not exists/);
  assert.match(whereSql, /platform_program_scope\.school_id is not null/);
  assert.match(whereSql, /e\.status = any\(\$2\)/);
  assert.match(whereSql, /e\.program_id = any\(\$3\)/);
  assert.deepEqual(params, [[33, 17], ['published', 'active'], [6]]);
});

test('content authorizer exam list filter is not restricted by client-admin school-scope exclusion', async () => {
  const { conditions, params } = await buildExamWhere({
    user: { id: 7, role: 'content_authorizer', client_id: 17 },
    query: {},
  });

  assert.equal(conditions.length, 0);
  assert.deepEqual(params, []);
});

test('school assignment-only exam list filter excludes school-owned exams and school-owned programs', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);

    if (
      normalized.startsWith('create table if not exists exam_school_assignments') ||
      normalized.startsWith('create index if not exists idx_exam_school_assignments')
    ) {
      return { rows: [] };
    }

    if (normalized.includes('select distinct school_id') && normalized.includes('from school_memberships')) {
      assert.deepEqual(params, [44, ['school_owner', 'admin']]);
      return { rows: [{ school_id: 24 }] };
    }

    throw new Error(`Unexpected query: ${normalized}`);
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  const { conditions, params } = await buildExamWhere({
    user: { id: 44, role: 'school_owner', client_id: 17 },
    query: { assignment_only: '1' },
  });
  const whereSql = normalizeSql(conditions.join(' and '));

  assert.match(whereSql, /from exam_school_assignments esa/);
  assert.doesNotMatch(whereSql, /or e\.school_id = any/);
  assert.doesNotMatch(whereSql, /school_programs\.school_id = any/);
  assert.doesNotMatch(whereSql, /e\.created_by =/);
  assert.deepEqual(params, [[17], [24], ['published', 'active']]);
});

test('school default exam list filter keeps school-owned exams and school-owned programs', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);

    if (
      normalized.startsWith('create table if not exists exam_school_assignments') ||
      normalized.startsWith('create index if not exists idx_exam_school_assignments')
    ) {
      return { rows: [] };
    }

    if (normalized.includes('select distinct school_id') && normalized.includes('from school_memberships')) {
      assert.deepEqual(params, [44, ['school_owner', 'admin']]);
      return { rows: [{ school_id: 24 }] };
    }

    throw new Error(`Unexpected query: ${normalized}`);
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  const { conditions, params } = await buildExamWhere({
    user: { id: 44, role: 'school_owner', client_id: 17 },
    query: {},
  });
  const whereSql = normalizeSql(conditions.join(' and '));

  assert.match(whereSql, /from exam_school_assignments esa/);
  assert.match(whereSql, /or e\.school_id = any/);
  assert.match(whereSql, /school_programs\.school_id = any/);
  assert.match(whereSql, /e\.created_by = \$4/);
  assert.deepEqual(params, [[17], [24], ['published', 'active'], 44]);
});
