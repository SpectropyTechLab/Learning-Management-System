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
const contentAuthorizer = { id: 2, role: 'content_authorizer', client_id: null };

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

test('super admin can update a client-owned program', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);
    if (normalized.includes('from programs where id = $1') && normalized.includes('school_id')) {
      assert.deepEqual(params, [19]);
      return { rows: [{ id: 19, client_id: 101, school_id: null, board_id: 1 }] };
    }
    if (normalized.includes('from boards') && normalized.includes('where id = $1')) {
      assert.deepEqual(params, [1]);
      return { rows: [{ id: 1, client_id: 101, school_id: null }] };
    }
    if (normalized.startsWith('update programs set')) {
      assert.deepEqual(params, ['TECHNO', 1, 19]);
      return {
        rows: [{ id: 19, client_id: 101, school_id: null, board_id: 1, name: 'TECHNO' }],
      };
    }
    throw new Error(`Unhandled query: ${normalized}`);
  };

  t.after(() => { pool.query = originalQuery; });

  const result = await curriculumService.updateProgram({
    user: platformAdmin,
    params: { id: '19' },
    body: { name: 'TECHNO', board_id: 1 },
  });

  assert.equal(result.name, 'TECHNO');
  assert.equal(result.canEdit, true);
  assert.equal(result.canDelete, true);
});

test('content authorizer can manage a curriculum record with missing ownership', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);
    if (normalized.startsWith('select id, client_id, null::integer as school_id from boards')) {
      assert.deepEqual(params, [23]);
      return { rows: [{ id: 23, client_id: null, school_id: null, name: 'IB', code: 'IB' }] };
    }
    if (normalized.startsWith('update boards set')) {
      assert.deepEqual(params, ['International Baccalaureate', 23]);
      return {
        rows: [{ id: 23, client_id: null, name: 'International Baccalaureate', code: 'IB' }],
      };
    }
    throw new Error(`Unhandled query: ${normalized}`);
  };

  t.after(() => { pool.query = originalQuery; });

  const result = await curriculumService.updateBoard({
    user: contentAuthorizer,
    params: { id: '23' },
    body: { name: 'International Baccalaureate' },
  });

  assert.equal(result.canEdit, true);
  assert.equal(result.canDelete, true);
});

test('content authorizer mutations support bulk-imported hierarchy with missing ownership', async (t) => {
  const originalQuery = pool.query;

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);
    if (normalized.startsWith('select id, client_id, school_id, board_id from programs')) {
      return { rows: [{ id: 43, client_id: null, school_id: null, board_id: 23 }] };
    }
    if (normalized.startsWith('update programs set')) {
      assert.deepEqual(params, ['IB Diploma', 43]);
      return { rows: [{ id: 43, client_id: null, school_id: null, board_id: 23, name: 'IB Diploma' }] };
    }
    if (normalized.includes('select g.id, g.program_id, p.client_id, p.school_id')) {
      assert.deepEqual(params, [12]);
      return { rows: [{ id: 12, program_id: 43, client_id: null, school_id: null }] };
    }
    if (normalized.startsWith('insert into subjects')) {
      assert.deepEqual(params, [17, 12, 'Physics', 'PHYSICS', null, 0, true]);
      return { rows: [{ id: 108 }] };
    }
    if (normalized.includes('from subjects s') && normalized.includes('where s.id = $1')) {
      assert.deepEqual(params, [108, 17]);
      return { rows: [{ id: 108, client_id: 17, grade_id: 12, name: 'Physics', code: 'PHYSICS' }] };
    }
    if (normalized.startsWith('delete from subjects')) {
      assert.deepEqual(params, [104]);
      return { rows: [{ id: 104 }] };
    }
    throw new Error(`Unhandled query: ${normalized}`);
  };

  t.after(() => { pool.query = originalQuery; });

  const program = await curriculumService.updateProgram({
    user: contentAuthorizer,
    params: { id: '43' },
    body: { name: 'IB Diploma' },
  });
  const subject = await curriculumService.createSubject({
    user: contentAuthorizer,
    body: { name: 'Physics', code: 'PHYSICS', grade_id: 12 },
  });
  const deletion = await curriculumService.deleteSubject({
    user: contentAuthorizer,
    params: { id: '104' },
  });

  assert.equal(program.name, 'IB Diploma');
  assert.equal(subject.id, 108);
  assert.deepEqual(deletion, { success: true, id: 104 });
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

test('subtopic parent change validates the destination and assigns its next order', async (t) => {
  const originalQuery = pool.query;
  const statements = [];

  pool.query = async (text, params = []) => {
    const normalized = normalizeSql(text);
    statements.push({ normalized, params });
    if (normalized.includes('from subtopics st') && normalized.includes('where st.id = $1')) {
      return { rows: [{ id: 88, topic_id: 44, client_id: 17, school_id: null }] };
    }
    if (normalized.includes('select t.id, s.client_id, p.school_id') && normalized.includes('where t.id = $1')) {
      return { rows: [{ id: 55, client_id: 17, school_id: null }] };
    }
    if (normalized.includes('coalesce(max(display_order)')) return { rows: [{ value: 4 }] };
    if (normalized.startsWith('update subtopics set')) {
      assert.deepEqual(params, [55, 4, 88]);
      return { rows: [{ id: 88, topic_id: 55, name: 'Linear Equations', display_order: 4 }] };
    }
    throw new Error(`Unhandled query: ${normalized}`);
  };

  t.after(() => { pool.query = originalQuery; });

  const result = await curriculumService.updateSubtopic({
    user: platformAdmin,
    params: { id: '88' },
    body: { topic_id: 55 },
  });

  assert.equal(result.topic_id, 55);
  assert.ok(statements.some(({ normalized }) => normalized.includes('coalesce(max(display_order)')));
});

test('subtopic deletion removes its unpublished Sessions and Studio content', async (t) => {
  const originalQuery = pool.query;
  pool.query = async () => ({
    rows: [{ id: 88, topic_id: 44, client_id: 101, school_id: null }],
  });
  t.after(() => { pool.query = originalQuery; });

  const statements = [];
  let released = false;
  const client = {
    async query(text, params = []) {
      const normalized = normalizeSql(text);
      statements.push({ normalized, params });
      if (normalized === 'begin' || normalized === 'commit' || normalized === 'rollback') return { rows: [] };
      if (normalized.startsWith('select id from subtopics')) return { rows: [{ id: 88 }] };
      if (normalized.startsWith('select id, status from sessions')) {
        return { rows: [{ id: 201, status: 'draft' }, { id: 202, status: 'approved' }] };
      }
      if (normalized.startsWith('select 1 from session_releases')) return { rows: [] };
      if (normalized.startsWith('select storage_key from session_documents')) {
        return { rows: [{ storage_key: 'sessions/201/plan.pdf' }] };
      }
      if (normalized.startsWith('delete from subtopics')) return { rows: [{ id: 88 }] };
      if (normalized.startsWith('delete from')) return { rows: [] };
      throw new Error(`Unhandled query: ${normalized}`);
    },
    release() { released = true; },
  };
  let removedKeys = null;

  const result = await curriculumService.deleteSubtopic({
    user: platformAdmin,
    params: { id: '88' },
    getDbClient: async () => client,
    removeFiles: async (keys) => { removedKeys = keys; return true; },
  });

  assert.equal(result.deleted_session_count, 2);
  assert.equal(result.deleted_document_count, 1);
  assert.deepEqual(removedKeys, ['sessions/201/plan.pdf']);
  assert.equal(released, true);
  assert.equal(statements[0].normalized, 'begin');
  assert.equal(statements.at(-1).normalized, 'commit');
  assert.ok(statements.some(({ normalized }) => normalized.startsWith('delete from screen_script_revisions')));
  assert.ok(statements.some(({ normalized }) => normalized.startsWith('delete from sessions')));
});

test('subtopic deletion is blocked when it contains a published Session', async (t) => {
  const originalQuery = pool.query;
  pool.query = async () => ({
    rows: [{ id: 88, topic_id: 44, client_id: 101, school_id: null }],
  });
  t.after(() => { pool.query = originalQuery; });

  const statements = [];
  const client = {
    async query(text) {
      const normalized = normalizeSql(text);
      statements.push(normalized);
      if (normalized.startsWith('select id from subtopics')) return { rows: [{ id: 88 }] };
      if (normalized.startsWith('select id, status from sessions')) {
        return { rows: [{ id: 201, status: 'published' }] };
      }
      return { rows: [] };
    },
    release() {},
  };

  await assert.rejects(
    curriculumService.deleteSubtopic({
      user: platformAdmin,
      params: { id: '88' },
      getDbClient: async () => client,
      removeFiles: async () => assert.fail('Published Session files must not be removed'),
    }),
    (error) => error?.status === 409 && error?.code === 'SUBTOPIC_HAS_PUBLISHED_SESSION',
  );
  assert.ok(statements.includes('rollback'));
  assert.ok(!statements.some((statement) => statement.startsWith('delete from subtopics')));
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
