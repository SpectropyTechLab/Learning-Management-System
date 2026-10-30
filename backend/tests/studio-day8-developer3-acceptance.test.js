import test from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET ||= 'studio-day8-test-secret-at-least-32-characters';
process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_KEY ||= 'test-only-service-key';

const { default: pool } = await import('../config/db.js');
const { AppError, handleStudioServiceError } = await import('../utils/errors.js');
const { createScreen } = await import('../services/studioLayouts.service.js');
const { default: layoutRouter } = await import('../routes/studioLayouts.routes.js');
const { default: screenRouter } = await import('../routes/studioScreens.routes.js');
const { default: branchRouter } = await import('../routes/studioBranchRuntime.routes.js');

const normalizeSql = (value) => String(value).replace(/\s+/g, ' ').trim().toLowerCase();
const routes = (router) => router.stack.filter((layer) => layer.route).flatMap((layer) =>
  Object.keys(layer.route.methods).map((method) => `${method.toUpperCase()} ${layer.route.path}`));

test('Day 8 frontend integration route surface is stable', () => {
  assert.deepEqual(routes(layoutRouter), [
    'GET /studio/layouts',
    'GET /studio/layouts/:layoutId',
    'POST /studio/layouts',
    'PATCH /studio/layouts/:layoutId',
    'POST /studio/sessions/:sessionId/screens',
  ]);
  assert.deepEqual(routes(screenRouter), [
    'GET /studio/screens/discovery',
    'GET /studio/screens/:screenId/branches',
    'GET /studio/sessions/:sessionId/screens',
    'GET /studio/screens/:screenId',
    'PATCH /studio/screens/:screenId',
    'PATCH /studio/sessions/:sessionId/screens/reorder',
  ]);
  assert.ok(routes(branchRouter).includes('POST /studio/branch-runs/:runId/return'));
});

test('Studio errors use the stable code and message envelope', () => {
  let statusCode;
  let payload;
  const response = {
    status(value) { statusCode = value; return this; },
    json(value) { payload = value; return this; },
  };
  handleStudioServiceError(response, new AppError('Screen revision is stale', 409));
  assert.equal(statusCode, 409);
  assert.deepEqual(payload, {
    error: { code: 'CONFLICT', message: 'Screen revision is stale' },
  });

  const detailed = new AppError('Maximum branch navigation depth is 3', 409);
  detailed.code = 'BRANCH_DEPTH_LIMIT_REACHED';
  handleStudioServiceError(response, detailed);
  assert.equal(payload.error.code, 'BRANCH_DEPTH_LIMIT_REACHED');
});

test('layout-created Screen returns the same public element fields as Screen reads and saves', async (t) => {
  const originalConnect = pool.connect;
  pool.connect = async () => ({
    async query(text) {
      const sql = normalizeSql(text);
      if (['begin', 'commit', 'rollback'].includes(sql)) return { rows: [] };
      if (sql.includes('select id, client_id from sessions')) {
        return { rows: [{ id: 21, client_id: 12 }] };
      }
      if (sql.startsWith('select * from layouts')) {
        return { rows: [{
          id: 5, client_id: 12, layout_key: 'lesson', version_no: 2,
          name: 'Lesson', canvas_width: 1920, canvas_height: 1080, safe_margin: 90,
          layout_data_json: { slots: [{ id: 'title', allowed: ['title'] }] },
        }] };
      }
      if (sql.startsWith('select coalesce(max(screen_number)')) {
        return { rows: [{ screen_number: 1, display_order: 0 }] };
      }
      if (sql.startsWith('insert into screens')) {
        return { rows: [{
          id: 31, client_id: 12, session_id: 21, title: 'Opening', screen_number: 1,
          layout_id: 5, screen_settings_json: {}, display_order: 0,
          creation_mode: 'layout', revision_no: 1,
        }] };
      }
      if (sql.startsWith('insert into screen_elements')) return { rows: [] };
      if (sql.startsWith("update sessions set status = 'draft'")) {
        return { rows: [{ id: 21, status: 'draft', revision_no: 4 }] };
      }
      throw new Error(`Unhandled query: ${sql}`);
    },
    release() {},
  });
  t.after(() => { pool.connect = originalConnect; });

  const result = await createScreen({
    sessionId: 21,
    user: { id: 8, role: 'content_authorizer', client_id: 12 },
    body: {
      creation_mode: 'layout', layout_id: 5, title: 'Opening',
      elements: [{ id: 'heading', slotId: 'title', type: 'title', content: { text: 'Welcome' } }],
    },
  });
  assert.deepEqual(result.elements, [{
    id: 'heading', slotId: 'title', type: 'title', content: { text: 'Welcome' }, position: {},
  }]);
  assert.equal(Object.hasOwn(result.elements[0], 'key'), false);
  assert.deepEqual(result.tags, []);
  assert.deepEqual(result.branches, []);
});
