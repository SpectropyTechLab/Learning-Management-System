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

test('board program visibility keeps the board filter with assignment-only access', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);

    assert.match(normalized, /select \* from programs where board_id = \$1/);
    assert.match(normalized, /id = any\(\$2::int\[\]\)/);
    assert.doesNotMatch(normalized, /school_id = any/);
    assert.deepEqual(params, [8, [27]]);

    return { rows: [] };
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  await curriculumRepo.fetchProgramsByBoard({
    boardId: 8,
    assignedProgramIds: [27],
    schoolIds: [24],
    assignedOnly: true,
    assignmentOnly: true,
  });
});

test('program insert persists board ownership', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);

    assert.match(normalized, /insert into programs \(client_id, school_id, board_id, name, code, is_active\)/);
    assert.deepEqual(params, [17, null, 8, 'Secondary', 'SECONDARY', true]);

    return { rows: [{ id: 90, board_id: 8 }] };
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  const result = await curriculumRepo.insertProgram({
    clientId: 17,
    boardId: 8,
    name: 'Secondary',
    code: 'SECONDARY',
    is_active: true,
  });

  assert.equal(result.rows[0].board_id, 8);
});

test('subtopics are scoped through their complete curriculum parent chain', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);

    assert.match(normalized, /from subtopics st join topics t/);
    assert.match(normalized, /join chapters c/);
    assert.match(normalized, /join subjects s/);
    assert.match(normalized, /left join grades g/);
    assert.match(normalized, /left join programs p/);
    assert.match(normalized, /where st.topic_id = \$1/);
    assert.match(normalized, /s.client_id = \$2/);
    assert.match(normalized, /order by st.display_order, st.name/);
    assert.deepEqual(params, [41, 17]);

    return { rows: [] };
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  await curriculumRepo.fetchSubtopicsByTopic({ topicId: 41, clientId: 17 });
});
