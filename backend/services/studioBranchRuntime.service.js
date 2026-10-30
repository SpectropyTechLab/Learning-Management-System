import { getClient, query as dbQuery } from '../repositories/db.repository.js';
import { AppError } from '../utils/errors.js';

const DEFAULT_MAX_DEPTH = 3;
const DATABASE_MAX_DEPTH = 32;
const MAX_STATE_BYTES = 256 * 1024;

const fail = (message, status, code) => {
  const error = new AppError(message, status);
  error.code = code;
  throw error;
};

const parseId = (value, label) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) fail(`${label} must be a positive integer`, 400, 'INVALID_ID');
  return id;
};

const maxDepth = () => {
  const configured = Number.parseInt(String(process.env.STUDIO_BRANCH_MAX_DEPTH || ''), 10);
  return Number.isInteger(configured) && configured > 0 && configured <= DATABASE_MAX_DEPTH
    ? configured
    : DEFAULT_MAX_DEPTH;
};

const assertTeacher = (user) => {
  if (user?.role !== 'teacher') fail('Teacher access required', 403, 'TEACHER_ACCESS_REQUIRED');
  if (!Number.isInteger(Number(user?.id)) || !Number.isInteger(Number(user?.client_id))) {
    fail('Access denied', 403, 'ACCESS_DENIED');
  }
};

const parseState = (value, label, expected) => {
  const fallback = expected === 'array' ? [] : {};
  const candidate = value === undefined ? fallback : value;
  const valid = expected === 'array'
    ? Array.isArray(candidate)
    : candidate !== null && typeof candidate === 'object' && !Array.isArray(candidate);
  if (!valid) fail(`${label} must be a JSON ${expected}`, 422, 'INVALID_BRANCH_STATE');
  if (Buffer.byteLength(JSON.stringify(candidate), 'utf8') > MAX_STATE_BYTES) {
    fail(`${label} exceeds the ${MAX_STATE_BYTES}-byte limit`, 413, 'BRANCH_STATE_TOO_LARGE');
  }
  return candidate;
};

const normalizeState = (value = {}) => ({
  reveal_state: parseState(value.reveal_state, 'reveal_state', 'object'),
  annotations: parseState(value.annotations, 'annotations', 'array'),
  interaction_state: parseState(value.interaction_state, 'interaction_state', 'object'),
  focus: parseState(value.focus, 'focus', 'object'),
});

const screensFrom = (release) => Array.isArray(release?.manifest_json?.screens)
  ? release.manifest_json.screens
  : [];

const findScreen = (release, screenId) => screensFrom(release)
  .find((screen) => Number(screen.screen_id) === Number(screenId));

const loadRelease = async (db, releaseId, clientId, { lock = false } = {}) => {
  const result = await db.query(
    `SELECT id, client_id, session_id, release_number, manifest_json, published_at
     FROM session_releases WHERE id = $1 AND client_id = $2${lock ? ' FOR SHARE' : ''}`,
    [releaseId, clientId],
  );
  const release = result.rows[0];
  if (!release) fail('Published Session release not found', 404, 'RELEASE_NOT_FOUND');
  return release;
};

const assertTeacherReleaseAccess = async (db, release, user) => {
  const session = release.manifest_json?.session || {};
  const programId = Number(session.program_id);
  const programSchoolId = Number(session.program_school_id);
  if (!Number.isInteger(programId)) {
    fail('Published Session access metadata is incomplete', 409, 'RELEASE_ACCESS_METADATA_INCOMPLETE');
  }
  const membership = await db.query(
    `SELECT DISTINCT school_id FROM school_memberships
     WHERE user_id = $1 AND status = 'active' AND role_scope = 'teacher'`,
    [user.id],
  );
  const schoolIds = membership.rows.map((row) => Number(row.school_id)).filter(Number.isInteger);
  if (Number.isInteger(programSchoolId) && schoolIds.includes(programSchoolId)) return;
  if (schoolIds.length > 0) {
    const assignment = await db.query(
      `SELECT 1 FROM question_bank_school_assignments
       WHERE program_id = $1 AND school_id = ANY($2::int[]) LIMIT 1`,
      [programId, schoolIds],
    );
    if (assignment.rows.length > 0) return;
  }
  fail('Access denied', 403, 'ACCESS_DENIED');
};

const loadOwnedRun = async (db, runId, user, { lock = false } = {}) => {
  const result = await db.query(
    `SELECT id, client_id, teacher_id, release_id, root_session_id, root_screen_id,
            current_session_id, current_screen_id, current_depth, status,
            started_at, last_activity_at, completed_at, abandoned_at, created_at, updated_at
     FROM studio_branch_runs WHERE id = $1${lock ? ' FOR UPDATE' : ''}`,
    [runId],
  );
  const run = result.rows[0];
  if (!run) fail('Studio branch run not found', 404, 'BRANCH_RUN_NOT_FOUND');
  if (Number(run.teacher_id) !== Number(user.id) || Number(run.client_id) !== Number(user.client_id)) {
    fail('Access denied', 403, 'ACCESS_DENIED');
  }
  return run;
};

const assertActiveRun = (run) => {
  if (run.status !== 'active') {
    fail(`Studio branch run is ${run.status}`, 409, 'BRANCH_RUN_NOT_ACTIVE');
  }
};

const assertRunReleaseAccess = async (db, run, user) => {
  const release = await loadRelease(db, Number(run.release_id), Number(user.client_id));
  await assertTeacherReleaseAccess(db, release, user);
  return release;
};

const validateFocus = (screen, focus) => {
  const elementId = focus.element_id ?? focus.elementId;
  if (elementId === undefined || elementId === null || elementId === '') return;
  const elements = Array.isArray(screen?.elements) ? screen.elements : [];
  const exists = elements.some((element) =>
    String(element.element_key ?? element.screen_element_id) === String(elementId));
  if (!exists) fail('Focused element is not part of the origin Screen release', 422, 'INVALID_FOCUS_ELEMENT');
};

const runView = (run) => ({
  id: Number(run.id),
  client_id: Number(run.client_id),
  teacher_id: Number(run.teacher_id),
  release_id: Number(run.release_id),
  root: { session_id: Number(run.root_session_id), screen_id: Number(run.root_screen_id) },
  current: { session_id: Number(run.current_session_id), screen_id: Number(run.current_screen_id) },
  current_depth: Number(run.current_depth),
  status: run.status,
  started_at: run.started_at,
  last_activity_at: run.last_activity_at,
  completed_at: run.completed_at,
  abandoned_at: run.abandoned_at,
});

const checkpointState = (row, prefix) => ({
  reveal_state: row[`${prefix}_reveal_state_json`],
  annotations: row[`${prefix}_annotations_json`],
  interaction_state: row[`${prefix}_interaction_state_json`],
  focus: row[`${prefix}_focus_json`],
});

const checkpointView = (row) => row ? ({
  id: Number(row.id),
  run_id: Number(row.run_id),
  parent_checkpoint_id: row.parent_checkpoint_id === null ? null : Number(row.parent_checkpoint_id),
  branch_definition_id: row.branch_definition_id === null ? null : Number(row.branch_definition_id),
  branch_key: row.branch_key,
  depth: Number(row.depth),
  origin: {
    session_id: Number(row.origin_session_id),
    screen_id: Number(row.origin_screen_id),
    release_id: Number(row.origin_release_id),
    ...checkpointState(row, 'origin'),
  },
  destination: {
    session_id: Number(row.destination_session_id),
    screen_id: Number(row.destination_screen_id),
  },
  branch_state: checkpointState(row, 'branch'),
  status: row.status,
  entered_at: row.entered_at,
  returned_at: row.returned_at,
}) : null;

const checkpointColumns = `id, run_id, parent_checkpoint_id, branch_definition_id, branch_key, depth,
  origin_session_id, origin_screen_id, origin_release_id,
  origin_reveal_state_json, origin_annotations_json, origin_interaction_state_json, origin_focus_json,
  destination_session_id, destination_screen_id,
  branch_reveal_state_json, branch_annotations_json, branch_interaction_state_json, branch_focus_json,
  status, entered_at, returned_at, created_at, updated_at`;

const inTransaction = async (getDbClient, action) => {
  const client = await getDbClient();
  try {
    await client.query('BEGIN');
    const result = await action(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release?.();
  }
};

export const createBranchRun = async ({ releaseId: rawReleaseId, sessionId: rawSessionId,
  screenId: rawScreenId, user, db = { query: dbQuery } }) => {
  assertTeacher(user);
  const releaseId = parseId(rawReleaseId, 'Release ID');
  const sessionId = parseId(rawSessionId, 'Session ID');
  const screenId = parseId(rawScreenId, 'Screen ID');
  const release = await loadRelease(db, releaseId, Number(user.client_id));
  await assertTeacherReleaseAccess(db, release, user);
  if (Number(release.session_id) !== sessionId) {
    fail('Session is not part of the requested release', 409, 'RELEASE_SESSION_MISMATCH');
  }
  if (!findScreen(release, screenId)) {
    fail('Screen is not part of the requested release', 404, 'RELEASE_SCREEN_NOT_FOUND');
  }
  const inserted = await db.query(
    `INSERT INTO studio_branch_runs
       (client_id, teacher_id, release_id, root_session_id, root_screen_id,
        current_session_id, current_screen_id)
     VALUES ($1, $2, $3, $4, $5, $4, $5)
     RETURNING *`,
    [user.client_id, user.id, releaseId, sessionId, screenId],
  );
  return runView(inserted.rows[0]);
};

export const enterBranch = async ({ runId: rawRunId, branchId, branchKey, origin = {}, user,
  getDbClient = getClient }) => {
  assertTeacher(user);
  const runId = parseId(rawRunId, 'Run ID');
  return inTransaction(getDbClient, async (db) => {
    const run = await loadOwnedRun(db, runId, user, { lock: true });
    assertActiveRun(run);
    const depth = Number(run.current_depth) + 1;
    if (depth > maxDepth()) {
      fail(`Maximum branch navigation depth is ${maxDepth()}`, 409, 'BRANCH_DEPTH_LIMIT_REACHED');
    }
    const release = await loadRelease(db, Number(run.release_id), Number(user.client_id), { lock: true });
    await assertTeacherReleaseAccess(db, release, user);
    const source = findScreen(release, Number(run.current_screen_id));
    if (!source) fail('Current Screen is not part of the run release', 409, 'RUN_SCREEN_NOT_IN_RELEASE');
    const branches = Array.isArray(source.branches) ? source.branches : [];
    const requestedKey = branchKey === undefined ? null : String(branchKey).trim();
    const requestedId = branchId === undefined || branchId === null ? null : String(branchId);
    if (!requestedKey && !requestedId) {
      fail('branch_id or branch_key is required', 400, 'BRANCH_IDENTITY_REQUIRED');
    }
    const branch = branches.find((candidate) =>
      (!requestedKey || String(candidate.branch_key) === requestedKey) &&
      (!requestedId || String(candidate.id) === requestedId));
    if (!branch) fail('Branch is not part of the current published Screen', 404, 'PUBLISHED_BRANCH_NOT_FOUND');
    const destination = findScreen(release, Number(branch.destination_screen_id));
    if (!destination) fail('Branch destination is not part of the run release', 409, 'BRANCH_DESTINATION_NOT_IN_RELEASE');
    if (Number(branch.return_screen_id) !== Number(run.current_screen_id)) {
      fail('Published branch return Screen does not match its source Screen', 409, 'BRANCH_RETURN_METADATA_INVALID');
    }

    const originSessionId = parseId(origin.session_id, 'Origin Session ID');
    const originScreenId = parseId(origin.screen_id, 'Origin Screen ID');
    const originReleaseId = parseId(origin.release_id, 'Origin Release ID');
    if (originSessionId !== Number(run.current_session_id) || originScreenId !== Number(run.current_screen_id) ||
        originReleaseId !== Number(run.release_id)) {
      fail('Origin must match the run current location and release', 409, 'BRANCH_ORIGIN_MISMATCH');
    }
    const originState = normalizeState(origin);
    validateFocus(source, originState.focus);
    const parent = depth === 1 ? null : (await db.query(
      `SELECT id FROM studio_branch_checkpoints
       WHERE run_id = $1 AND depth = $2 AND status = 'active' FOR UPDATE`,
      [runId, depth - 1],
    )).rows[0];
    if (depth > 1 && !parent) fail('Active parent checkpoint is missing', 409, 'BRANCH_STACK_INVALID');
    const branchDefinitionId = Number.isInteger(Number(branch.id)) ? Number(branch.id) : null;
    const inserted = await db.query(
      `INSERT INTO studio_branch_checkpoints
        (run_id, parent_checkpoint_id, branch_definition_id, branch_key, depth,
         origin_session_id, origin_screen_id, origin_release_id,
         origin_reveal_state_json, origin_annotations_json, origin_interaction_state_json, origin_focus_json,
         destination_session_id, destination_screen_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
               $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13, $14)
       RETURNING ${checkpointColumns}`,
      [runId, parent?.id || null, branchDefinitionId, branch.branch_key, depth,
        originSessionId, originScreenId, originReleaseId,
        JSON.stringify(originState.reveal_state), JSON.stringify(originState.annotations),
        JSON.stringify(originState.interaction_state), JSON.stringify(originState.focus),
        Number(release.session_id), Number(destination.screen_id)],
    );
    const updated = await db.query(
      `UPDATE studio_branch_runs
       SET current_session_id = $2, current_screen_id = $3, current_depth = $4,
           last_activity_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [runId, Number(release.session_id), Number(destination.screen_id), depth],
    );
    return { run: runView(updated.rows[0]), checkpoint: checkpointView(inserted.rows[0]), destination };
  });
};

export const updateBranchState = async ({ runId: rawRunId, checkpointId: rawCheckpointId,
  state, user, getDbClient = getClient }) => {
  assertTeacher(user);
  const runId = parseId(rawRunId, 'Run ID');
  const checkpointId = parseId(rawCheckpointId, 'Checkpoint ID');
  if (state === null || typeof state !== 'object' || Array.isArray(state)) {
    fail('Branch state must be a JSON object', 422, 'INVALID_BRANCH_STATE');
  }
  return inTransaction(getDbClient, async (db) => {
    const run = await loadOwnedRun(db, runId, user, { lock: true });
    assertActiveRun(run);
    const release = await assertRunReleaseAccess(db, run, user);
    const existing = (await db.query(
      `SELECT ${checkpointColumns} FROM studio_branch_checkpoints
       WHERE id = $1 AND run_id = $2 FOR UPDATE`,
      [checkpointId, runId],
    )).rows[0];
    if (!existing) fail('Studio branch checkpoint not found', 404, 'BRANCH_CHECKPOINT_NOT_FOUND');
    if (existing.status !== 'active' || Number(existing.depth) !== Number(run.current_depth)) {
      fail('Only the current active checkpoint can be updated', 409, 'BRANCH_CHECKPOINT_NOT_ACTIVE');
    }
    const normalized = {
      reveal_state: state.reveal_state === undefined
        ? existing.branch_reveal_state_json
        : parseState(state.reveal_state, 'reveal_state', 'object'),
      annotations: state.annotations === undefined
        ? existing.branch_annotations_json
        : parseState(state.annotations, 'annotations', 'array'),
      interaction_state: state.interaction_state === undefined
        ? existing.branch_interaction_state_json
        : parseState(state.interaction_state, 'interaction_state', 'object'),
      focus: state.focus === undefined
        ? existing.branch_focus_json
        : parseState(state.focus, 'focus', 'object'),
    };
    validateFocus(findScreen(release, existing.destination_screen_id), normalized.focus);
    const updated = await db.query(
      `UPDATE studio_branch_checkpoints
       SET branch_reveal_state_json = $3::jsonb, branch_annotations_json = $4::jsonb,
           branch_interaction_state_json = $5::jsonb, branch_focus_json = $6::jsonb,
           updated_at = NOW()
       WHERE id = $1 AND run_id = $2 AND status = 'active'
       RETURNING ${checkpointColumns}`,
      [checkpointId, runId, JSON.stringify(normalized.reveal_state), JSON.stringify(normalized.annotations),
        JSON.stringify(normalized.interaction_state), JSON.stringify(normalized.focus)],
    );
    await db.query(
      'UPDATE studio_branch_runs SET last_activity_at = NOW(), updated_at = NOW() WHERE id = $1',
      [runId],
    );
    return checkpointView(updated.rows[0]);
  });
};

export const returnFromBranch = async ({ runId: rawRunId, user, getDbClient = getClient }) => {
  assertTeacher(user);
  const runId = parseId(rawRunId, 'Run ID');
  return inTransaction(getDbClient, async (db) => {
    const run = await loadOwnedRun(db, runId, user, { lock: true });
    assertActiveRun(run);
    await assertRunReleaseAccess(db, run, user);
    if (Number(run.current_depth) === 0) fail('No active branch to return from', 409, 'NO_ACTIVE_BRANCH');
    const checkpoint = (await db.query(
      `SELECT ${checkpointColumns} FROM studio_branch_checkpoints
       WHERE run_id = $1 AND depth = $2 AND status = 'active' FOR UPDATE`,
      [runId, run.current_depth],
    )).rows[0];
    if (!checkpoint) fail('Active branch checkpoint is missing', 409, 'BRANCH_STACK_INVALID');
    await db.query(
      `UPDATE studio_branch_checkpoints
       SET status = 'returned', returned_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'active'`,
      [checkpoint.id],
    );
    const updated = await db.query(
      `UPDATE studio_branch_runs
       SET current_session_id = $2, current_screen_id = $3, current_depth = $4,
           last_activity_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [runId, checkpoint.origin_session_id, checkpoint.origin_screen_id, Number(run.current_depth) - 1],
    );
    return { run: runView(updated.rows[0]), restored_origin: checkpointView(checkpoint).origin };
  });
};

export const getBranchRun = async ({ runId: rawRunId, user, db = { query: dbQuery } }) => {
  assertTeacher(user);
  const runId = parseId(rawRunId, 'Run ID');
  const run = await loadOwnedRun(db, runId, user);
  await assertRunReleaseAccess(db, run, user);
  const active = Number(run.current_depth) === 0 ? null : (await db.query(
    `SELECT ${checkpointColumns} FROM studio_branch_checkpoints
     WHERE run_id = $1 AND depth = $2 AND status = 'active'`,
    [runId, run.current_depth],
  )).rows[0];
  return { run: runView(run), active_checkpoint: checkpointView(active) };
};

export const completeBranchRun = async ({ runId: rawRunId, user, db = { query: dbQuery } }) => {
  assertTeacher(user);
  const runId = parseId(rawRunId, 'Run ID');
  const run = await loadOwnedRun(db, runId, user);
  assertActiveRun(run);
  await assertRunReleaseAccess(db, run, user);
  if (Number(run.current_depth) !== 0) {
    fail('Return from all active branches before completing the run', 409, 'ACTIVE_BRANCHES_REMAIN');
  }
  const updated = await db.query(
    `UPDATE studio_branch_runs SET status = 'completed', completed_at = NOW(),
       last_activity_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'active' RETURNING *`,
    [runId],
  );
  if (!updated.rows[0]) fail('Studio branch run changed concurrently', 409, 'BRANCH_RUN_CONFLICT');
  return runView(updated.rows[0]);
};

export const abandonBranchRun = async ({ runId: rawRunId, user, getDbClient = getClient }) => {
  assertTeacher(user);
  const runId = parseId(rawRunId, 'Run ID');
  return inTransaction(getDbClient, async (db) => {
    const run = await loadOwnedRun(db, runId, user, { lock: true });
    assertActiveRun(run);
    await assertRunReleaseAccess(db, run, user);
    await db.query(
      `UPDATE studio_branch_checkpoints SET status = 'abandoned', updated_at = NOW()
       WHERE run_id = $1 AND status = 'active'`,
      [runId],
    );
    const updated = await db.query(
      `UPDATE studio_branch_runs SET status = 'abandoned', abandoned_at = NOW(),
         last_activity_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'active' RETURNING *`,
      [runId],
    );
    return runView(updated.rows[0]);
  });
};

export const getBranchRunHistory = async ({ runId: rawRunId, user, db = { query: dbQuery } }) => {
  assertTeacher(user);
  const runId = parseId(rawRunId, 'Run ID');
  const run = await loadOwnedRun(db, runId, user);
  await assertRunReleaseAccess(db, run, user);
  const history = await db.query(
    `SELECT ${checkpointColumns} FROM studio_branch_checkpoints
     WHERE run_id = $1 ORDER BY entered_at, id`,
    [runId],
  );
  return { run: runView(run), checkpoints: history.rows.map(checkpointView) };
};

export const branchRuntimeConfig = Object.freeze({
  defaultMaxDepth: DEFAULT_MAX_DEPTH,
  databaseMaxDepth: DATABASE_MAX_DEPTH,
  maxStateBytes: MAX_STATE_BYTES,
});
