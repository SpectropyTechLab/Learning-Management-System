import assert from 'node:assert/strict';
import test from 'node:test';
import pool from '../config/db.js';
import { resolveModuleVisibility } from '../services/moduleVisibility.service.js';

const normalizeSql = (value) => String(value).replace(/\s+/g, ' ').trim().toLowerCase();

test('school user module visibility hides course, question bank, and exams when no assignments exist', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);

    if (normalized.includes('from school_memberships')) {
      assert.deepEqual(params, [254, ['school_owner', 'admin']]);
      return { rows: [{ school_id: 24 }] };
    }

    if (
      normalized.includes('from course_school_assignments') ||
      normalized.includes('from question_bank_school_assignments') ||
      normalized.includes('from exam_school_assignments')
    ) {
      assert.deepEqual(params[0], [24]);
      return { rows: [] };
    }

    throw new Error(`Unexpected query: ${normalized}`);
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  const visibility = await resolveModuleVisibility({
    user: { id: 254, role: 'school_owner', client_id: 17 },
    permissions: new Map([
      ['courses.read', true],
      ['questions.read', true],
      ['exams.read', true],
      ['teaching_sessions.read_school', true],
    ]),
  });

  assert.deepEqual(visibility, {
    courses: false,
    question_bank: false,
    exams: false,
    teaching_sessions: true,
  });
});

test('school user module visibility shows assigned modules', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);

    if (normalized.includes('from school_memberships')) {
      assert.deepEqual(params, [255, ['teacher']]);
      return { rows: [{ school_id: 24 }] };
    }

    if (normalized.includes('from course_school_assignments')) {
      assert.deepEqual(params, [[24]]);
      return { rows: [{ '?column?': 1 }] };
    }

    if (normalized.includes('from question_bank_school_assignments')) {
      assert.deepEqual(params, [[24]]);
      return { rows: [{ '?column?': 1 }] };
    }

    if (normalized.includes('from exam_school_assignments')) {
      assert.deepEqual(params, [[24], ['published', 'active']]);
      return { rows: [{ '?column?': 1 }] };
    }

    throw new Error(`Unexpected query: ${normalized}`);
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  const visibility = await resolveModuleVisibility({
    user: { id: 255, role: 'teacher', client_id: 17 },
    permissions: new Map([
      ['courses.read', true],
      ['questions.read', true],
      ['exams.read', true],
      ['teaching_sessions.read_own', true],
    ]),
  });

  assert.deepEqual(visibility, {
    courses: true,
    question_bank: true,
    exams: true,
    teaching_sessions: true,
  });
});
