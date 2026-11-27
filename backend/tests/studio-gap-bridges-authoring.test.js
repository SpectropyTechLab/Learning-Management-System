import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  createChildGapBridge,
  createExternalGapBridge,
  deleteGapBridge,
  moveChildGapBridge,
  reorderGapBridges,
  searchGapBridgeTargets,
  updateGapBridge,
} from '../services/studioGapBridges.service.js';

const author = { id: 19, role: 'content_authorizer', client_id: 7 };
const normalized = (sql) => sql.replace(/\s+/g, ' ').trim();

const transactionDb = (handler) => {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      const text = normalized(sql);
      calls.push({ sql: text, params });
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(text)) return { rows: [] };
      return handler(text, params, calls);
    },
    release() { calls.push({ sql: 'RELEASE', params: [] }); },
  };
  return { calls, getDbClient: async () => client };
};

const sourceRow = {
  id: 40,
  session_id: 25,
  client_id: 7,
  title: 'Reflection',
  screen_kind: 'main',
  session_status: 'published',
  session_revision_no: 6,
};

test('Gap Bridge routes expose authoring endpoints separately from existing Branching', () => {
  const routes = fs.readFileSync(new URL('../routes/studioGapBridges.routes.js', import.meta.url), 'utf8');
  assert.match(routes, /get\('\/studio\/gap-bridge-targets'/);
  assert.match(routes, /get\('\/studio\/screens\/:screenId\/gap-bridges'/);
  assert.match(routes, /post\('\/studio\/screens\/:screenId\/gap-bridges\/external'/);
  assert.match(routes, /post\('\/studio\/screens\/:screenId\/gap-bridges\/child'/);
  assert.match(routes, /patch\('\/studio\/gap-bridges\/:gapBridgeId\/move-child'/);
  assert.match(routes, /patch\('\/studio\/screens\/:screenId\/gap-bridges\/reorder'/);
  assert.match(routes, /patch\('\/studio\/gap-bridges\/:gapBridgeId'/);
  assert.match(routes, /delete\('\/studio\/gap-bridges\/:gapBridgeId'/);
  assert.match(routes, /super_admin.*content_authorizer/);
});

test('local child creation writes the child and mapping atomically then returns the source Session to draft', async () => {
  const boundary = transactionDb((sql) => {
    if (sql.includes('FROM screens sc') && sql.includes('FOR UPDATE OF sc, se')) return { rows: [sourceRow] };
    if (sql.includes('MAX(display_order)')) return { rows: [{ display_order: 2 }] };
    if (sql.startsWith('INSERT INTO screens')) return { rows: [{ id: 91, title: 'Extra example' }] };
    if (sql.startsWith('INSERT INTO gap_bridges')) {
      return { rows: [{
        id: 12, source_session_id: 25, source_screen_id: 40, name: 'Extra example',
        target_kind: 'child', child_screen_id: 91, display_order: 2, created_by: 19,
      }] };
    }
    if (sql.startsWith('UPDATE sessions')) return { rows: [{ id: 25, status: 'draft', revision_no: 7 }] };
    throw new Error(`Unexpected SQL: ${sql}`);
  });

  const result = await createChildGapBridge({
    screenId: 40,
    body: { name: ' Extra example ', title: 'Extra example', source_session_revision_no: 6 },
    user: author,
    getDbClient: boundary.getDbClient,
  });

  assert.equal(result.gap_bridge.target_kind, 'child');
  assert.equal(result.gap_bridge.target.screen_id, 91);
  assert.equal(result.source_session_revision_no, 7);
  assert.deepEqual(boundary.calls.map((call) => call.sql).filter((sql) => ['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)), ['BEGIN', 'COMMIT']);
  const childInsert = boundary.calls.find((call) => call.sql.startsWith('INSERT INTO screens'));
  assert.match(childInsert.sql, /'gap_bridge_child'/);
  assert.match(childInsert.sql, /NULL/);
});

test('external creation resolves only the requested Screen in the latest published release', async () => {
  const boundary = transactionDb((sql, params) => {
    if (sql.includes('FROM screens sc') && sql.includes('FOR UPDATE OF sc, se')) return { rows: [sourceRow] };
    if (sql.includes('FROM sessions se') && sql.includes('JOIN LATERAL')) {
      assert.deepEqual(params, [70]);
      return { rows: [{
        release_id: 101, release_number: 4, published_at: '2026-11-20T00:00:00Z',
        session_id: 70, client_id: 7, session_title: 'Forces', status: 'published',
        manifest_json: { screens: [{ screen_id: 301, screen_number: 2, title: 'Worked example' }] },
      }] };
    }
    if (sql.includes('MAX(display_order)')) return { rows: [{ display_order: 0 }] };
    if (sql.startsWith('INSERT INTO gap_bridges')) {
      return { rows: [{
        id: 15, source_session_id: 25, source_screen_id: 40, name: 'Force refresher',
        target_kind: 'external', external_session_id: 70, external_screen_id: 301,
        display_order: 0, created_by: 19,
      }] };
    }
    if (sql.startsWith('UPDATE sessions')) return { rows: [{ id: 25, status: 'draft', revision_no: 7 }] };
    throw new Error(`Unexpected SQL: ${sql}`);
  });

  const result = await createExternalGapBridge({
    screenId: 40,
    body: {
      name: 'Force refresher', external_session_id: 70, external_screen_id: 301,
      source_session_revision_no: 6,
    },
    user: author,
    getDbClient: boundary.getDbClient,
  });

  assert.equal(result.gap_bridge.target.release_number, 4);
  assert.equal(result.gap_bridge.target.screen_id, 301);
  assert.equal(result.gap_bridge.target.available, true);
});

test('external creation also accepts a Gap Bridge child from another Session latest release', async () => {
  const boundary = transactionDb((sql) => {
    if (sql.includes('FROM screens sc') && sql.includes('FOR UPDATE OF sc, se')) return { rows: [sourceRow] };
    if (sql.includes('FROM sessions se') && sql.includes('JOIN LATERAL')) return { rows: [{
      release_id: 102, release_number: 5, published_at: '2026-11-26T00:00:00Z',
      session_id: 70, client_id: 7, session_title: 'Forces', status: 'published',
      manifest_json: {
        screens: [{ screen_id: 301, screen_number: 2, title: 'Worked example' }],
        gap_bridge_screens: [{ screen_id: 399, screen_number: null, parent_screen_id: 301, title: 'Force recap' }],
      },
    }] };
    if (sql.includes('MAX(display_order)')) return { rows: [{ display_order: 0 }] };
    if (sql.startsWith('INSERT INTO gap_bridges')) return { rows: [{
      id: 16, source_session_id: 25, source_screen_id: 40, name: 'Force recap',
      target_kind: 'external', external_session_id: 70, external_screen_id: 399,
      display_order: 0, created_by: 19,
    }] };
    if (sql.startsWith('UPDATE sessions')) return { rows: [{ id: 25, status: 'draft', revision_no: 7 }] };
    throw new Error(`Unexpected SQL: ${sql}`);
  });

  const result = await createExternalGapBridge({
    screenId: 40,
    body: { name: 'Force recap', external_session_id: 70, external_screen_id: 399, source_session_revision_no: 6 },
    user: author,
    getDbClient: boundary.getDbClient,
  });

  assert.equal(result.gap_bridge.target.screen_id, 399);
  assert.equal(result.gap_bridge.target.screen_kind, 'gap_bridge_child');
  assert.equal(result.gap_bridge.target.screen_number, null);
});

test('external creation rejects a target from the same Session before looking up a release', async () => {
  const boundary = transactionDb((sql) => {
    if (sql.includes('FROM screens sc') && sql.includes('FOR UPDATE OF sc, se')) return { rows: [sourceRow] };
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  await assert.rejects(
    createExternalGapBridge({
      screenId: 40,
      body: { name: 'Invalid', external_session_id: 25, external_screen_id: 40, source_session_revision_no: 6 },
      user: author,
      getDbClient: boundary.getDbClient,
    }),
    (error) => error.code === 'SAME_SESSION_TARGET' && error.status === 422,
  );
  assert.ok(boundary.calls.some((call) => call.sql === 'ROLLBACK'));
});

test('stale source revisions reject a mutation and roll back without inserting content', async () => {
  const boundary = transactionDb((sql) => {
    if (sql.includes('FROM screens sc') && sql.includes('FOR UPDATE OF sc, se')) return { rows: [sourceRow] };
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  await assert.rejects(
    createChildGapBridge({
      screenId: 40,
      body: { name: 'Stale child', creation_mode: 'blank', source_session_revision_no: 5 },
      user: author,
      getDbClient: boundary.getDbClient,
    }),
    (error) => error.code === 'SESSION_REVISION_CONFLICT' && error.details.current_revision_no === 6,
  );
  assert.equal(boundary.calls.some((call) => call.sql.startsWith('INSERT INTO screens')), false);
  assert.ok(boundary.calls.some((call) => call.sql === 'ROLLBACK'));
});

test('renaming a mapping preserves its target and increments the source Session revision', async () => {
  const bridge = {
    id: 12, source_session_id: 25, source_screen_id: 40, name: 'Old name',
    target_kind: 'external', child_screen_id: null, external_session_id: 70,
    external_screen_id: 301, display_order: 0, client_id: 7,
    screen_kind: 'main', session_revision_no: 6,
  };
  const boundary = transactionDb((sql, params) => {
    if (sql.includes('FROM gap_bridges gb') && sql.includes('FOR UPDATE OF gb, sc, se')) return { rows: [bridge] };
    if (sql.includes('FROM screens sc') && sql.includes('FOR UPDATE OF sc, se')) return { rows: [sourceRow] };
    if (sql.startsWith('UPDATE gap_bridges SET name')) {
      assert.deepEqual(params.slice(0, 5), ['New name', 'external', null, 70, 301]);
      return { rows: [{ ...bridge, name: 'New name' }] };
    }
    if (sql.startsWith('UPDATE sessions')) return { rows: [{ id: 25, status: 'draft', revision_no: 7 }] };
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  const result = await updateGapBridge({
    gapBridgeId: 12,
    body: { name: 'New name', source_session_revision_no: 6 },
    user: author,
    getDbClient: boundary.getDbClient,
  });
  assert.equal(result.gap_bridge.name, 'New name');
  assert.equal(result.gap_bridge.target_kind, 'external');
  assert.equal(result.source_session_revision_no, 7);
});

test('replacing a local child creates the new child before deleting the old owned Screen', async () => {
  const bridge = {
    id: 12, source_session_id: 25, source_screen_id: 40, name: 'Local help',
    target_kind: 'child', child_screen_id: 91, child_title: 'Old child',
    external_session_id: null, external_screen_id: null, display_order: 0,
    client_id: 7, screen_kind: 'main', session_revision_no: 6,
  };
  const boundary = transactionDb((sql, params) => {
    if (sql.includes('FROM gap_bridges gb') && sql.includes('FOR UPDATE OF gb, sc, se')) return { rows: [bridge] };
    if (sql.includes('FROM screens sc') && sql.includes('FOR UPDATE OF sc, se')) return { rows: [sourceRow] };
    if (sql.startsWith('INSERT INTO screens')) return { rows: [{ id: 92, title: 'New child' }] };
    if (sql.startsWith('UPDATE gap_bridges SET name')) {
      assert.deepEqual(params.slice(0, 5), ['Local help', 'child', 92, null, null]);
      return { rows: [{ ...bridge, child_screen_id: 92 }] };
    }
    if (sql.startsWith('DELETE FROM screen_script_revisions')) return { rows: [] };
    if (sql.startsWith('DELETE FROM screens')) {
      assert.deepEqual(params, [91]);
      return { rows: [] };
    }
    if (sql.startsWith('UPDATE sessions')) return { rows: [{ id: 25, status: 'draft', revision_no: 7 }] };
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  const result = await updateGapBridge({
    gapBridgeId: 12,
    body: {
      target_kind: 'child', title: 'New child', replace_child: true,
      source_session_revision_no: 6,
    },
    user: author,
    getDbClient: boundary.getDbClient,
  });
  assert.equal(result.gap_bridge.target.screen_id, 92);
  const statements = boundary.calls.map((call) => call.sql);
  assert.ok(statements.findIndex((sql) => sql.startsWith('INSERT INTO screens'))
    < statements.indexOf('DELETE FROM screens WHERE id = $1'));
});

test('deleting a local mapping also deletes its exclusively owned child in one transaction', async () => {
  const bridge = {
    id: 12, source_session_id: 25, source_screen_id: 40, name: 'Local help',
    target_kind: 'child', child_screen_id: 91, external_session_id: null,
    external_screen_id: null, display_order: 0, client_id: 7,
    screen_kind: 'main', session_revision_no: 6,
  };
  const boundary = transactionDb((sql) => {
    if (sql.includes('FROM gap_bridges gb') && sql.includes('FOR UPDATE OF gb, sc, se')) return { rows: [bridge] };
    if (sql.startsWith('DELETE FROM gap_bridges')) return { rows: [] };
    if (sql.startsWith('DELETE FROM screen_script_revisions')) return { rows: [] };
    if (sql.startsWith('DELETE FROM screens')) return { rows: [] };
    if (sql.startsWith('UPDATE sessions')) return { rows: [{ id: 25, status: 'draft', revision_no: 7 }] };
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  const result = await deleteGapBridge({
    gapBridgeId: 12,
    body: { source_session_revision_no: 6 },
    user: author,
    getDbClient: boundary.getDbClient,
  });
  assert.equal(result.deleted_gap_bridge_id, 12);
  const statements = boundary.calls.map((call) => call.sql);
  assert.ok(statements.indexOf('DELETE FROM gap_bridges WHERE id = $1') < statements.indexOf('DELETE FROM screens WHERE id = $1'));
  assert.deepEqual(statements.filter((sql) => ['BEGIN', 'COMMIT'].includes(sql)), ['BEGIN', 'COMMIT']);
});

test('reorder requires the complete mapping set and avoids unique-order collisions with an offset pass', async () => {
  const boundary = transactionDb((sql) => {
    if (sql.includes('FROM screens sc') && sql.includes('FOR UPDATE OF sc, se')) return { rows: [sourceRow] };
    if (sql.startsWith('SELECT id FROM gap_bridges')) return { rows: [{ id: 11 }, { id: 12 }] };
    if (sql.startsWith('UPDATE gap_bridges SET display_order = display_order +')) return { rows: [] };
    if (sql.startsWith('UPDATE gap_bridges SET display_order = $1')) return { rows: [] };
    if (sql.startsWith('UPDATE sessions')) return { rows: [{ id: 25, status: 'draft', revision_no: 7 }] };
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  const result = await reorderGapBridges({
    screenId: 40,
    body: { gap_bridge_ids: [12, 11], source_session_revision_no: 6 },
    user: author,
    getDbClient: boundary.getDbClient,
  });
  assert.deepEqual(result.gap_bridge_ids, [12, 11]);
  assert.ok(boundary.calls.some((call) => call.sql.includes('display_order + 1000000')));
});

test('moving a local child changes both ownership records and compacts the previous parent order', async () => {
  const bridge = {
    id: 12, source_session_id: 25, source_screen_id: 40, name: 'Local help',
    target_kind: 'child', child_screen_id: 91, child_title: 'Hint',
    external_session_id: null, external_screen_id: null, display_order: 1,
    client_id: 7, screen_kind: 'main', session_revision_no: 6,
  };
  const boundary = transactionDb((sql, params) => {
    if (sql.includes('FROM gap_bridges gb') && sql.includes('FOR UPDATE OF gb, sc, se')) return { rows: [bridge] };
    if (sql.includes('FROM screens sc') && sql.includes('FOR UPDATE OF sc, se')) {
      return { rows: [{ ...sourceRow, id: 41 }] };
    }
    if (sql.startsWith('SELECT COALESCE(MAX(display_order)')) return { rows: [{ display_order: 2 }] };
    if (sql.startsWith('UPDATE screens SET parent_screen_id')) return { rows: [] };
    if (sql.startsWith('UPDATE gap_bridges SET source_screen_id')) {
      return { rows: [{ ...bridge, source_screen_id: 41, display_order: 2 }] };
    }
    if (sql.startsWith('SELECT id FROM gap_bridges')) return { rows: [{ id: 11 }] };
    if (sql.startsWith('UPDATE gap_bridges SET display_order = display_order +')) return { rows: [] };
    if (sql.startsWith('UPDATE gap_bridges SET display_order = $1')) return { rows: [] };
    if (sql.startsWith('UPDATE sessions')) return { rows: [{ id: 25, status: 'draft', revision_no: 7 }] };
    throw new Error(`Unexpected SQL: ${sql} ${JSON.stringify(params)}`);
  });
  const result = await moveChildGapBridge({
    gapBridgeId: 12,
    body: { target_source_screen_id: 41, source_session_revision_no: 6 },
    user: author,
    getDbClient: boundary.getDbClient,
  });
  assert.equal(result.previous_source_screen_id, 40);
  assert.equal(result.gap_bridge.source_screen_id, 41);
  const statements = boundary.calls.map((call) => call.sql);
  assert.ok(statements.indexOf('UPDATE screens SET parent_screen_id = $1, updated_at = NOW() WHERE id = $2')
    < statements.findIndex((sql) => sql.startsWith('UPDATE gap_bridges SET source_screen_id')));
  assert.ok(statements.some((sql) => sql.includes('display_order + 1000000')));
});

test('target search excludes the source Session and exposes Screens from each latest published release', async () => {
  const calls = [];
  const db = { async query(sql, params) {
    const text = normalized(sql); calls.push({ sql: text, params });
    if (text.includes('FROM sessions se') && text.includes('ch.id AS chapter_id') && !text.includes('JOIN LATERAL')) {
      return { rows: [{ id: 25, client_id: 7, chapter_id: 8, chapter_name: 'Mechanics', chapter_number: 2 }] };
    }
    if (text.includes('JOIN LATERAL')) return { rows: [{
      session_id: 70, session_title: 'Forces', release_id: 101, release_number: 4,
      published_at: '2026-11-20T00:00:00Z',
      chapter_id: 8, chapter_name: 'Mechanics', chapter_number: 2,
      topic_id: 9, topic_name: 'Forces', subtopic_id: 10, subtopic_name: 'Practice',
      manifest_json: { screens: [
        { screen_id: 301, screen_number: 1, title: 'Introduction' },
        { screen_id: 302, screen_number: 2, title: 'Worked Example' },
      ] },
    }] };
    throw new Error(`Unexpected SQL: ${text}`);
  } };
  const result = await searchGapBridgeTargets({
    query: { source_session_id: 25, search: 'worked' }, user: author, db,
  });
  assert.equal(result.targets.length, 1);
  assert.equal(result.targets[0].screen_id, 302);
  assert.deepEqual(result.targets[0].preview_screen, {
    screen_settings_json: {},
    layout: null,
    elements: [],
  });
  assert.equal(result.context.chapter_id, 8);
  assert.match(calls[1].sql, /se\.id <> \$1/);
  assert.match(calls[1].sql, /ch\.id = \$3/);
  assert.match(calls[1].sql, /ORDER BY release_number DESC LIMIT 1/);
  assert.doesNotMatch(calls[1].sql, /se\.status = 'published'/);
});
