import assert from 'node:assert/strict';
import { test } from 'node:test';
import pool from '../config/db.js';
import { validateCoursesForExamAccess } from '../services/examCourseAccess.service.js';

const normalizeSql = (value) => String(value).replace(/\s+/g, ' ').trim().toLowerCase();

const schoolOwner = {
  id: 44,
  role: 'school_owner',
  client_id: 17,
};

test('validateCoursesForExamAccess allows course assigned to the same school as the exam', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);

    if (normalized.includes('select c.id, c.client_id, c.school_id')) {
      assert.deepEqual(params, [[321]]);
      return {
        rows: [
          {
            id: 321,
            client_id: 17,
            school_id: null,
            assigned_school_ids: [24],
          },
        ],
      };
    }

    if (normalized.includes('select distinct school_id from school_memberships')) {
      return { rows: [{ school_id: 24 }] };
    }

    throw new Error(`Unexpected query: ${normalized}`);
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  await validateCoursesForExamAccess({
    courseIds: [321],
    exam: { id: 114, client_id: 17, school_id: 24 },
    user: schoolOwner,
  });
});

test('validateCoursesForExamAccess rejects course not assigned to the exam school', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text) => {
    const normalized = normalizeSql(text);

    if (normalized.includes('select c.id, c.client_id, c.school_id')) {
      return {
        rows: [
          {
            id: 321,
            client_id: 17,
            school_id: null,
            assigned_school_ids: [25],
          },
        ],
      };
    }

    if (normalized.includes('select distinct school_id from school_memberships')) {
      return { rows: [{ school_id: 25 }] };
    }

    throw new Error(`Unexpected query: ${normalized}`);
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  await assert.rejects(
    () =>
      validateCoursesForExamAccess({
        courseIds: [321],
        exam: { id: 114, client_id: 17, school_id: 24 },
        user: schoolOwner,
    }),
    /Course does not belong to the same school as the exam/
  );
});
