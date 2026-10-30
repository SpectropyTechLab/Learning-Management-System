import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.JWT_SECRET ||= 'studio-day7-test-secret';
process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_KEY ||= 'test-only-service-key';

const { default: router } = await import('../routes/studioBranchRuntime.routes.js');
const runtime = await import('../services/studioBranchRuntime.service.js');

const teacher = { id: 19, role: 'teacher', client_id: 12 };
const now = () => new Date().toISOString();
const normalizedSql = (value) => String(value).replace(/\s+/g, ' ').trim().toLowerCase();

const release = {
  id: 91,
  client_id: 12,
  session_id: 10,
  release_number: 2,
  published_at: now(),
  manifest_json: {
    session: { session_id: 10, program_id: 6, program_school_id: 44 },
    screens: [
      {
        screen_id: 10,
        title: 'Origin',
        elements: [{ element_key: 'question-1' }, { element_key: 'hint-1' }],
        branches: [
          { id: 501, branch_key: 'repair', destination_screen_id: 20, return_screen_id: 10 },
          { id: 503, branch_key: 'example', destination_screen_id: 40, return_screen_id: 10 },
        ],
      },
      {
        screen_id: 20,
        title: 'Repair',
        elements: [{ element_key: 'question-2' }],
        branches: [{ id: 502, branch_key: 'deeper', destination_screen_id: 30, return_screen_id: 20 }],
      },
      { screen_id: 30, title: 'Deep repair', elements: [{ element_key: 'question-3' }], branches: [] },
      { screen_id: 40, title: 'Example', elements: [{ element_key: 'example-1' }], branches: [] },
    ],
  },
};

class MemoryDb {
  constructor({ authorized = true } = {}) {
    this.authorized = authorized;
    this.runs = [];
    this.checkpoints = [];
    this.nextRunId = 1;
    this.nextCheckpointId = 1;
  }

  clientFactory = async () => ({ query: this.query.bind(this), release() {} });

  async query(text, params = []) {
    const sql = normalizedSql(text);
    if (['begin', 'commit', 'rollback'].includes(sql)) return { rows: [] };
    if (sql.includes('from session_releases')) {
      return { rows: Number(params[0]) === release.id && Number(params[1]) === release.client_id ? [structuredClone(release)] : [] };
    }
    if (sql.includes('from school_memberships')) {
      return { rows: this.authorized ? [{ school_id: 44 }] : [] };
    }
    if (sql.includes('from question_bank_school_assignments')) return { rows: [] };

    if (sql.startsWith('insert into studio_branch_runs')) {
      const row = {
        id: this.nextRunId++, client_id: params[0], teacher_id: params[1], release_id: params[2],
        root_session_id: params[3], root_screen_id: params[4], current_session_id: params[3],
        current_screen_id: params[4], current_depth: 0, status: 'active', started_at: now(),
        last_activity_at: now(), completed_at: null, abandoned_at: null, created_at: now(), updated_at: now(),
      };
      this.runs.push(row);
      return { rows: [structuredClone(row)] };
    }
    if (sql.includes('from studio_branch_runs where id = $1')) {
      const row = this.runs.find((candidate) => candidate.id === Number(params[0]));
      return { rows: row ? [structuredClone(row)] : [] };
    }
    if (sql.startsWith('insert into studio_branch_checkpoints')) {
      const row = {
        id: this.nextCheckpointId++, run_id: params[0], parent_checkpoint_id: params[1],
        branch_definition_id: params[2], branch_key: params[3], depth: params[4],
        origin_session_id: params[5], origin_screen_id: params[6], origin_release_id: params[7],
        origin_reveal_state_json: JSON.parse(params[8]), origin_annotations_json: JSON.parse(params[9]),
        origin_interaction_state_json: JSON.parse(params[10]), origin_focus_json: JSON.parse(params[11]),
        destination_session_id: params[12], destination_screen_id: params[13],
        branch_reveal_state_json: {}, branch_annotations_json: [], branch_interaction_state_json: {},
        branch_focus_json: {}, status: 'active', entered_at: now(), returned_at: null,
        created_at: now(), updated_at: now(),
      };
      this.checkpoints.push(row);
      return { rows: [structuredClone(row)] };
    }
    if (sql.includes('select id from studio_branch_checkpoints')) {
      const row = this.checkpoints.find((candidate) => candidate.run_id === Number(params[0]) &&
        candidate.depth === Number(params[1]) && candidate.status === 'active');
      return { rows: row ? [{ id: row.id }] : [] };
    }
    if (sql.startsWith('select id, run_id') && sql.includes('from studio_branch_checkpoints')) {
      let rows = this.checkpoints.filter((candidate) => candidate.run_id === Number(params[0]));
      if (sql.includes('where id = $1 and run_id = $2')) {
        rows = this.checkpoints.filter((candidate) => candidate.id === Number(params[0]) && candidate.run_id === Number(params[1]));
      } else if (sql.includes('depth = $2') && sql.includes("status = 'active'")) {
        rows = rows.filter((candidate) => candidate.depth === Number(params[1]) && candidate.status === 'active');
      }
      if (sql.includes('order by entered_at')) rows.sort((a, b) => a.id - b.id);
      return { rows: structuredClone(rows) };
    }
    if (sql.startsWith('update studio_branch_checkpoints') && sql.includes('branch_reveal_state_json')) {
      const row = this.checkpoints.find((candidate) => candidate.id === Number(params[0]) && candidate.run_id === Number(params[1]));
      if (!row || row.status !== 'active') return { rows: [] };
      row.branch_reveal_state_json = JSON.parse(params[2]);
      row.branch_annotations_json = JSON.parse(params[3]);
      row.branch_interaction_state_json = JSON.parse(params[4]);
      row.branch_focus_json = JSON.parse(params[5]);
      row.updated_at = now();
      return { rows: [structuredClone(row)] };
    }
    if (sql.startsWith('update studio_branch_checkpoints') && sql.includes("status = 'returned'")) {
      const row = this.checkpoints.find((candidate) => candidate.id === Number(params[0]) && candidate.status === 'active');
      if (row) { row.status = 'returned'; row.returned_at = now(); row.updated_at = now(); }
      return { rows: [] };
    }
    if (sql.startsWith('update studio_branch_checkpoints') && sql.includes("status = 'abandoned'")) {
      for (const row of this.checkpoints.filter((candidate) => candidate.run_id === Number(params[0]) && candidate.status === 'active')) {
        row.status = 'abandoned'; row.updated_at = now();
      }
      return { rows: [] };
    }
    if (sql.startsWith('update studio_branch_runs') && sql.includes('current_session_id')) {
      const row = this.runs.find((candidate) => candidate.id === Number(params[0]));
      row.current_session_id = Number(params[1]); row.current_screen_id = Number(params[2]);
      row.current_depth = Number(params[3]); row.last_activity_at = now(); row.updated_at = now();
      return { rows: [structuredClone(row)] };
    }
    if (sql.startsWith('update studio_branch_runs') && sql.includes("status = 'completed'")) {
      const row = this.runs.find((candidate) => candidate.id === Number(params[0]) && candidate.status === 'active');
      if (!row) return { rows: [] };
      row.status = 'completed'; row.completed_at = now(); row.last_activity_at = now(); row.updated_at = now();
      return { rows: [structuredClone(row)] };
    }
    if (sql.startsWith('update studio_branch_runs') && sql.includes("status = 'abandoned'")) {
      const row = this.runs.find((candidate) => candidate.id === Number(params[0]) && candidate.status === 'active');
      if (!row) return { rows: [] };
      row.status = 'abandoned'; row.abandoned_at = now(); row.last_activity_at = now(); row.updated_at = now();
      return { rows: [structuredClone(row)] };
    }
    if (sql.startsWith('update studio_branch_runs set last_activity_at')) return { rows: [] };
    throw new Error(`Unhandled test query: ${sql}`);
  }
}

const origin = (screenId, elementId, marker) => ({
  session_id: 10,
  screen_id: screenId,
  release_id: 91,
  reveal_state: { revealed_elements: [`hint-${marker}`] },
  annotations: [{ id: `annotation-${marker}` }],
  interaction_state: { answer: marker },
  focus: { element_id: elementId },
});

test('Day 7 router exposes the complete teacher branch-run lifecycle', () => {
  const routes = router.stack.filter((layer) => layer.route).flatMap((layer) =>
    Object.keys(layer.route.methods).map((method) => `${method.toUpperCase()} ${layer.route.path}`));
  assert.deepEqual(routes, [
    'POST /studio/branch-runs',
    'POST /studio/branch-runs/:runId/enter',
    'PATCH /studio/branch-runs/:runId/checkpoints/:checkpointId/state',
    'POST /studio/branch-runs/:runId/return',
    'GET /studio/branch-runs/:runId/history',
    'GET /studio/branch-runs/:runId',
    'POST /studio/branch-runs/:runId/complete',
    'POST /studio/branch-runs/:runId/abandon',
  ]);
});

test('nested branches resume and return exact protected origins without branch-state overwrite', async () => {
  const db = new MemoryDb();
  const run = await runtime.createBranchRun({ releaseId: 91, sessionId: 10, screenId: 10, user: teacher, db });
  const rootOrigin = origin(10, 'question-1', 'root');
  const first = await runtime.enterBranch({
    runId: run.id, branchKey: 'repair', origin: rootOrigin, user: teacher, getDbClient: db.clientFactory,
  });
  assert.equal(first.run.current.screen_id, 20);
  assert.equal(first.checkpoint.depth, 1);

  const changed = await runtime.updateBranchState({
    runId: run.id,
    checkpointId: first.checkpoint.id,
    state: {
      reveal_state: { revealed_elements: ['answer-20'] },
      annotations: [{ id: 'branch-only' }],
      interaction_state: { answer: 'branch-only' },
      focus: { element_id: 'question-2' },
    },
    user: teacher,
    getDbClient: db.clientFactory,
  });
  assert.deepEqual(changed.origin.annotations, rootOrigin.annotations);
  assert.deepEqual(changed.branch_state.annotations, [{ id: 'branch-only' }]);

  const branchOrigin = origin(20, 'question-2', 'nested');
  const second = await runtime.enterBranch({
    runId: run.id, branchKey: 'deeper', origin: branchOrigin, user: teacher, getDbClient: db.clientFactory,
  });
  assert.equal(second.checkpoint.parent_checkpoint_id, first.checkpoint.id);
  assert.equal(second.run.current_depth, 2);

  const resumed = await runtime.getBranchRun({ runId: run.id, user: teacher, db });
  assert.equal(resumed.run.current.screen_id, 30);
  assert.equal(resumed.active_checkpoint.id, second.checkpoint.id);

  const nestedReturn = await runtime.returnFromBranch({ runId: run.id, user: teacher, getDbClient: db.clientFactory });
  assert.equal(nestedReturn.run.current.screen_id, 20);
  assert.deepEqual(nestedReturn.restored_origin.annotations, branchOrigin.annotations);

  const rootReturn = await runtime.returnFromBranch({ runId: run.id, user: teacher, getDbClient: db.clientFactory });
  assert.equal(rootReturn.run.current.screen_id, 10);
  assert.deepEqual(rootReturn.restored_origin.reveal_state, rootOrigin.reveal_state);
  assert.deepEqual(rootReturn.restored_origin.annotations, rootOrigin.annotations);
  assert.deepEqual(rootReturn.restored_origin.interaction_state, rootOrigin.interaction_state);
  assert.deepEqual(rootReturn.restored_origin.focus, rootOrigin.focus);

  const later = await runtime.enterBranch({
    runId: run.id, branchKey: 'example', origin: rootOrigin, user: teacher, getDbClient: db.clientFactory,
  });
  assert.equal(later.run.current.screen_id, 40);
  await runtime.returnFromBranch({ runId: run.id, user: teacher, getDbClient: db.clientFactory });
  const completed = await runtime.completeBranchRun({ runId: run.id, user: teacher, db });
  assert.equal(completed.status, 'completed');
  const history = await runtime.getBranchRunHistory({ runId: run.id, user: teacher, db });
  assert.deepEqual(history.checkpoints.map((item) => item.branch_key), ['repair', 'deeper', 'example']);
  assert.ok(history.checkpoints.every((item) => item.status === 'returned'));
});

test('teacher release authorization, depth limit, terminal state and ownership are enforced', async () => {
  const deniedDb = new MemoryDb({ authorized: false });
  await assert.rejects(
    runtime.createBranchRun({ releaseId: 91, sessionId: 10, screenId: 10, user: teacher, db: deniedDb }),
    (error) => error.code === 'ACCESS_DENIED' && error.status === 403,
  );

  const db = new MemoryDb();
  const run = await runtime.createBranchRun({ releaseId: 91, sessionId: 10, screenId: 10, user: teacher, db });
  const previousDepth = process.env.STUDIO_BRANCH_MAX_DEPTH;
  process.env.STUDIO_BRANCH_MAX_DEPTH = '1';
  try {
    await runtime.enterBranch({
      runId: run.id, branchKey: 'repair', origin: origin(10, 'question-1', 'root'),
      user: teacher, getDbClient: db.clientFactory,
    });
    await assert.rejects(
      runtime.enterBranch({
        runId: run.id, branchKey: 'deeper', origin: origin(20, 'question-2', 'nested'),
        user: teacher, getDbClient: db.clientFactory,
      }),
      (error) => error.code === 'BRANCH_DEPTH_LIMIT_REACHED',
    );
  } finally {
    if (previousDepth === undefined) delete process.env.STUDIO_BRANCH_MAX_DEPTH;
    else process.env.STUDIO_BRANCH_MAX_DEPTH = previousDepth;
  }
  await runtime.returnFromBranch({ runId: run.id, user: teacher, getDbClient: db.clientFactory });
  const abandoned = await runtime.abandonBranchRun({ runId: run.id, user: teacher, getDbClient: db.clientFactory });
  assert.equal(abandoned.status, 'abandoned');
  await assert.rejects(
    runtime.getBranchRun({ runId: run.id, user: { ...teacher, id: 99 }, db }),
    (error) => error.code === 'ACCESS_DENIED',
  );
  await assert.rejects(
    runtime.enterBranch({
      runId: run.id, branchKey: 'example', origin: origin(10, 'question-1', 'later'),
      user: teacher, getDbClient: db.clientFactory,
    }),
    (error) => error.code === 'BRANCH_RUN_NOT_ACTIVE',
  );
});

test('Day 7 migration normalizes runtime state and protects checkpoint origins', () => {
  const current = path.dirname(fileURLToPath(import.meta.url));
  const migration = fs.readFileSync(
    path.resolve(current, '../../supabase/migrations/20261030120000_studio_day7_branch_runtime.sql'),
    'utf8',
  );
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.studio_branch_runs/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.studio_branch_checkpoints/);
  assert.match(migration, /studio_protect_branch_checkpoint_origin/);
  assert.doesNotMatch(migration, /ALTER TABLE public\.(screens|screen_elements|screen_tags|screen_branches|session_releases)/);
});
