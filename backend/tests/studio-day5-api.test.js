import test from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET ||= 'studio-day5-test-secret';
process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_KEY ||= 'test-only-service-key';

const { default: pool } = await import('../config/db.js');
const { default: resourceRouter } = await import('../routes/studioResources.routes.js');
const { default: screenRouter } = await import('../routes/studioScreens.routes.js');
const { getResourceUsages } = await import('../services/studioResources.service.js');
const { saveScreen } = await import('../services/studioScreens.service.js');
const { submitSession } = await import('../services/studioSessionWorkflow.service.js');

const normalizedSql = (value) => String(value).replace(/\s+/g, ' ').trim().toLowerCase();
const author = { id: 8, role: 'content_authorizer', client_id: 12 };

const registeredRoutes = (router) => router.stack
  .filter((layer) => layer.route)
  .flatMap((layer) => Object.keys(layer.route.methods)
    .map((method) => `${method.toUpperCase()} ${layer.route.path}`));

test('Day 5 routers expose resource versions, reverse usages and screen persistence', () => {
  const resources = registeredRoutes(resourceRouter);
  const screens = registeredRoutes(screenRouter);
  assert.ok(resources.includes('POST /studio/resources'));
  assert.ok(resources.includes('POST /studio/resources/:resourceId/versions'));
  assert.ok(resources.includes('GET /studio/resources/:resourceId/usages'));
  assert.ok(screens.includes('GET /studio/sessions/:sessionId/screens'));
  assert.ok(screens.includes('GET /studio/screens/:screenId'));
  assert.ok(screens.includes('PATCH /studio/screens/:screenId'));
  assert.ok(screens.includes('PATCH /studio/sessions/:sessionId/screens/reorder'));
});

test('reverse usage reports placement count separately from distinct Screen count', async (t) => {
  const originalQuery = pool.query;
  pool.query = async (text) => {
    const sql = normalizedSql(text);
    if (sql.includes('from resources where id')) {
      return { rows: [{ id: 7, client_id: 12, name: 'Diagram', resource_type: 'image' }] };
    }
    if (sql.includes('from resource_mappings rm')) {
      return { rows: [
        { placement_id: 1, screen_id: 10, element_id: 'visual-a' },
        { placement_id: 2, screen_id: 10, element_id: 'visual-b' },
        { placement_id: 3, screen_id: 11, element_id: 'visual-c' },
      ] };
    }
    throw new Error(`Unhandled query: ${sql}`);
  };
  t.after(() => { pool.query = originalQuery; });

  const usages = await getResourceUsages({ resourceId: 7, user: author });
  assert.equal(usages.placement_count, 3);
  assert.equal(usages.distinct_screen_count, 2);
});

test('screen save persists editable drawing data and Resource bindings in one transaction', async (t) => {
  const calls = [];
  const client = {
    async query(text, params = []) {
      const sql = normalizedSql(text);
      calls.push({ sql, params });
      if (['begin', 'commit', 'rollback'].includes(sql)) return { rows: [] };
      if (sql.includes('from screens s join sessions se') && sql.includes('for update')) {
        return { rows: [{
          id: 31, session_id: 21, client_id: 12, title: 'Old', layout_id: null,
          revision_no: 4, screen_settings_json: {}, session_status: 'draft', session_revision_no: 6,
        }] };
      }
      if (sql.includes('from resources r join resource_versions rv')) return { rows: [{ id: 9, resource_type: 'image' }] };
      if (sql.startsWith('update screens set title')) {
        return { rows: [{
          id: 31, session_id: 21, client_id: 12, title: 'Edited', layout_id: null,
          revision_no: 5, screen_settings_json: { grid: true },
        }] };
      }
      if (sql.startsWith('delete from screen_elements')) return { rows: [] };
      if (sql.startsWith('insert into screen_elements')) return { rows: [] };
      if (sql.startsWith('insert into resource_mappings')) return { rows: [] };
      if (sql.startsWith('delete from screen_tags')) return { rows: [] };
      if (sql.startsWith('insert into screen_tags')) return { rows: [] };
      if (sql.startsWith('update sessions set status')) return { rows: [{ id: 21, status: 'draft', revision_no: 7 }] };
      if (sql.includes('from screen_elements se')) {
        return { rows: [{
          id: 'drawing-1', slot_id: null, type: 'visual',
          content: { drawing: { strokes: [{ points: [[1, 2], [3, 4]] }] } },
          position: { x: 10, y: 20 }, resource_id: 9, resource_version_id: 15,
          usage: { placement: 'canvas' },
        }] };
      }
      if (sql.startsWith('select tag from screen_tags')) return { rows: [{ tag: 'fractions' }] };
      if (sql.includes('from screen_branches')) return { rows: [] };
      throw new Error(`Unhandled query: ${sql}`);
    },
    release() {},
  };
  const originalConnect = pool.connect;
  pool.connect = async () => client;
  t.after(() => { pool.connect = originalConnect; });

  const result = await saveScreen({
    screenId: 31,
    user: author,
    body: {
      revision_no: 4,
      title: 'Edited',
      screen_settings: { grid: true },
      tags: ['Fractions', 'fractions'],
      elements: [{
        id: 'drawing-1', type: 'visual',
        content: { drawing: { strokes: [{ points: [[1, 2], [3, 4]] }] } },
        position: { x: 10, y: 20 },
        resource: { resource_id: 9, resource_version_id: 15, usage: { placement: 'canvas' } },
      }],
    },
  });

  assert.equal(result.revision_no, 5);
  assert.equal(result.session_revision_no, 7);
  assert.deepEqual(result.elements[0].content.drawing.strokes[0].points[1], [3, 4]);
  assert.ok(calls.some(({ sql }) => sql.startsWith('insert into resource_mappings')));
  assert.ok(calls.some(({ sql }) => sql === 'commit'));
});

test('missing required documents prevent the validated state', async (t) => {
  const client = {
    async query(text) {
      const sql = normalizedSql(text);
      if (['begin', 'rollback'].includes(sql)) return { rows: [] };
      if (sql.includes('from sessions') && sql.includes('for update')) {
        return { rows: [{ id: 41, client_id: 12, status: 'draft', revision_no: 2 }] };
      }
      if (sql.includes('from session_documents')) return { rows: [] };
      if (sql.includes('from screens')) return { rows: [{ id: 71, screen_number: 1, revision_no: 1 }] };
      if (sql.startsWith('insert into session_validations')) return { rows: [{ id: 1, is_valid: false }] };
      throw new Error(`Unhandled query: ${sql}`);
    },
    release() {},
  };
  const originalConnect = pool.connect;
  pool.connect = async () => client;
  t.after(() => { pool.connect = originalConnect; });

  await assert.rejects(
    submitSession({ sessionId: 41, user: author }),
    (error) => error?.status === 422 && error?.details?.length === 2
  );
});
