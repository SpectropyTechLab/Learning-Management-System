import assert from 'node:assert/strict';
import { test } from 'node:test';
import pool from '../config/db.js';
import curriculumRouter, {
  curriculumWriterOnly,
  requireCurriculumCreate,
  requireCurriculumUpdate,
  requireCurriculumDelete,
} from '../routes/curriculum.routes.js';
import * as curriculumService from '../services/curriculum.service.js';

const normalizeSql = (value) => String(value).replace(/\s+/g, ' ').trim().toLowerCase();

const clientAdmin = { id: 31, role: 'client_admin', client_id: 101 };
const platformAdmin = { id: 1, role: 'super_admin', client_id: null };

const routeHandlers = (method, path) => {
  const layer = curriculumRouter.stack.find(
    (candidate) => candidate.route?.path === path && candidate.route.methods[method]
  );
  return layer?.route?.stack.map((handlerLayer) => handlerLayer.handle) ?? [];
};

test('curriculum router registers board and subtopic endpoints', () => {
  const routes = curriculumRouter.stack
    .filter((layer) => layer.route)
    .flatMap((layer) =>
      Object.keys(layer.route.methods).map((method) => `${method.toUpperCase()} ${layer.route.path}`)
    );

  assert.ok(routes.includes('GET /boards'));
  assert.ok(routes.includes('POST /boards'));
  assert.ok(routes.includes('GET /boards/:boardId/programs'));
  assert.ok(routes.includes('POST /boards/:boardId/programs'));
  assert.ok(routes.includes('GET /topics/:topicId/subtopics'));
  assert.ok(routes.includes('POST /topics/:topicId/subtopics'));
  assert.ok(routes.includes('GET /subtopics/:id'));
  assert.ok(routes.includes('PATCH /subtopics/:id'));
  assert.ok(routes.includes('DELETE /subtopics/:id'));
});

test('curriculum mutations enforce writer roles and distinct create/update/delete permissions', () => {
  const permissionByMethod = {
    post: requireCurriculumCreate,
    patch: requireCurriculumUpdate,
    delete: requireCurriculumDelete,
  };
  const mutationLayers = curriculumRouter.stack.filter((layer) =>
    layer.route && Object.keys(layer.route.methods).some((method) => permissionByMethod[method])
  );

  assert.ok(mutationLayers.length > 0);
  for (const layer of mutationLayers) {
    const method = Object.keys(layer.route.methods).find((candidate) => permissionByMethod[candidate]);
    const handlers = routeHandlers(method, layer.route.path);
    assert.ok(
      handlers.includes(curriculumWriterOnly),
      `${method.toUpperCase()} ${layer.route.path} is missing the canonical writer boundary`
    );
    assert.ok(
      handlers.includes(permissionByMethod[method]),
      `${method.toUpperCase()} ${layer.route.path} uses the wrong curriculum permission`
    );
  }

  let statusCode = null;
  let responseBody = null;
  curriculumWriterOnly(
    { user: clientAdmin },
    {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
      },
    },
    () => assert.fail('client_admin must not pass the curriculum writer boundary')
  );
  assert.equal(statusCode, 403);
  assert.deepEqual(responseBody, { error: 'Access denied' });
});

test('child-list endpoints reject an inaccessible parent instead of returning an empty list', async (t) => {
  const originalQuery = pool.query;
  let queryCount = 0;

  pool.query = async () => {
    queryCount += 1;
    return { rows: [] };
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  const cases = [
    [() => curriculumService.listGrades({ user: platformAdmin, params: { programId: '991' } }), 'Program not found'],
    [() => curriculumService.listSubjectsByGrade({ user: platformAdmin, params: { gradeId: '992' } }), 'Grade not found'],
    [() => curriculumService.listChapters({ user: platformAdmin, params: { subjectId: '993' } }), 'Subject not found'],
    [() => curriculumService.listTopics({ user: platformAdmin, params: { chapterId: '994' } }), 'Chapter not found'],
  ];

  for (const [operation, message] of cases) {
    const queriesBefore = queryCount;
    await assert.rejects(
      operation(),
      (error) => error?.status === 404 && error?.message === message
    );
    assert.equal(queryCount, queriesBefore + 1, 'the child query must not run after parent validation fails');
  }
});

test('client admin can create a client-owned board', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);
    assert.match(normalized, /insert into boards/);
    assert.deepEqual(params, [101, 'CBSE', 'CBSE', 'Client board', true]);
    return {
      rows: [{ id: 7, client_id: 101, name: 'CBSE', code: 'CBSE', description: 'Client board', is_active: true }],
    };
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  const result = await curriculumService.createBoard({
    user: clientAdmin,
    body: { name: 'CBSE', code: 'CBSE', description: 'Client board' },
  });

  assert.equal(result.id, 7);
  assert.equal(result.ownership_scope, 'client');
  assert.equal(result.canEdit, true);
});

test('program created through a board route persists the validated board id', async (t) => {
  const originalQuery = pool.query;
  let queryCount = 0;

  pool.query = async (text, params = []) => {
    queryCount += 1;
    const normalized = normalizeSql(text);

    if (normalized.startsWith('select id, client_id, null::integer as school_id from boards')) {
      assert.deepEqual(params, [7]);
      return { rows: [{ id: 7, client_id: 101, school_id: null }] };
    }
    if (normalized.includes('insert into programs')) {
      assert.deepEqual(params, [101, null, 7, 'Secondary', 'SECONDARY', true]);
      return {
        rows: [{ id: 19, client_id: 101, school_id: null, board_id: 7, name: 'Secondary', code: 'SECONDARY' }],
      };
    }

    throw new Error(`Unhandled query: ${normalized}`);
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  const result = await curriculumService.createProgramForBoard({
    user: clientAdmin,
    params: { boardId: '7' },
    body: { name: 'Secondary', code: 'SECONDARY' },
  });

  assert.equal(queryCount, 2);
  assert.equal(result.board_id, 7);
  assert.equal(result.canEdit, true);
});

test('subtopic creation validates its topic ownership and preserves the subtopic id', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);

    if (normalized.includes('select t.id, s.client_id, p.school_id')) {
      assert.deepEqual(params, [44]);
      return { rows: [{ id: 44, client_id: 101, school_id: null }] };
    }
    if (normalized.includes('insert into subtopics')) {
      assert.deepEqual(params, [44, 'Linear Equations', 'Introduction', 2, true]);
      return {
        rows: [{ id: 88, topic_id: 44, name: 'Linear Equations', description: 'Introduction', display_order: 2, is_active: true }],
      };
    }

    throw new Error(`Unhandled query: ${normalized}`);
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  const result = await curriculumService.createSubtopic({
    user: clientAdmin,
    params: { topicId: '44' },
    body: {
      name: 'Linear Equations',
      description: 'Introduction',
      display_order: 2,
    },
  });

  assert.equal(result.id, 88);
  assert.equal(result.topic_id, 44);
  assert.equal(result.canEdit, true);
});

test('program creation rejects a board owned by another client', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);
    assert.match(normalized, /from boards where id = \$1/);
    assert.deepEqual(params, [7]);
    return { rows: [{ id: 7, client_id: 202, school_id: null }] };
  };

  t.after(() => {
    pool.query = originalQuery;
  });

  await assert.rejects(
    curriculumService.createProgramForBoard({
      user: clientAdmin,
      params: { boardId: '7' },
      body: { name: 'Secondary', code: 'SECONDARY' },
    }),
    (error) => error?.status === 403 && error?.message === 'Board does not belong to this client'
  );
});
