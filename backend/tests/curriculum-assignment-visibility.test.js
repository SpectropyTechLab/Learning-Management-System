import assert from 'node:assert/strict';
import { test } from 'node:test';
import pool from '../config/db.js';
import * as curriculumRepo from '../repositories/curriculum.repository.js';

const normalizeSql = (value) => String(value).replace(/\s+/g, ' ').trim().toLowerCase();

test('assignment-only program visibility excludes school-owned programs', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);

    assert.match(normalized, /select \* from programs where/);
    assert.match(normalized, /id = any\(\$1::int\[\]\)/);
    assert.doesNotMatch(normalized, /school_id = any/);
    assert.deepEqual(params, [[27]]);

    return { rows: [] };
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  await curriculumRepo.fetchPrograms({
    assignedProgramIds: [27],
    schoolIds: [24],
    assignedOnly: true,
    assignmentOnly: true,
  });
});

test('assigned-only program visibility still includes school-owned programs for full lists', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);

    assert.match(normalized, /select \* from programs where/);
    assert.match(normalized, /id = any\(\$1::int\[\]\)/);
    assert.match(normalized, /school_id = any\(\$2::int\[\]\)/);
    assert.deepEqual(params, [[27], [24]]);

    return { rows: [] };
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  await curriculumRepo.fetchPrograms({
    assignedProgramIds: [27],
    schoolIds: [24],
    assignedOnly: true,
    assignmentOnly: false,
  });
});
