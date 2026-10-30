import { query as dbQuery, getClient } from '../repositories/db.repository.js';
import { AppError } from '../utils/errors.js';
import { createRuntimeLaunch } from './studioResourceRuntime.service.js';

const AUTHOR_ROLES = new Set(['super_admin', 'content_authorizer']);
const ACTIVE_STATUSES = ['active', 'suspended'];

const parseId = (value, label) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(`${label} must be a positive integer`, 400);
  return id;
};

const parseDurationSeconds = (value) => {
  if (!value) return 0;
  const text = String(value).trim();
  if (/^PT/i.test(text)) {
    const match = text.match(/^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/i);
    return match ? Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0) : 0;
  }
  const match = text.match(/^(\d+):(\d{2}):(\d{2}(?:\.\d+)?)$/);
  return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : 0;
};

const numberOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeScormData = (edition, rawData = {}) => {
  const data = rawData && typeof rawData === 'object' && !Array.isArray(rawData) ? rawData : {};
  if (edition === '1.2') {
    const lesson = String(data['cmi.core.lesson_status'] || 'not attempted').toLowerCase();
    return {
      completionStatus: lesson === 'completed' || lesson === 'passed' || lesson === 'failed'
        ? 'completed' : lesson === 'incomplete' || lesson === 'browsed' ? 'incomplete' : 'not_attempted',
      successStatus: lesson === 'passed' ? 'passed' : lesson === 'failed' ? 'failed' : 'unknown',
      scoreRaw: numberOrNull(data['cmi.core.score.raw']),
      scoreMin: numberOrNull(data['cmi.core.score.min']),
      scoreMax: numberOrNull(data['cmi.core.score.max']),
      scoreScaled: null,
      location: data['cmi.core.lesson_location'] || null,
      suspendData: data['cmi.suspend_data'] || null,
      sessionTimeSeconds: parseDurationSeconds(data['cmi.core.session_time']),
      data,
    };
  }
  const completion = String(data['cmi.completion_status'] || 'unknown').toLowerCase().replace('not attempted', 'not_attempted');
  const success = String(data['cmi.success_status'] || 'unknown').toLowerCase();
  const scaledScore = numberOrNull(data['cmi.score.scaled']);
  if (scaledScore !== null && (scaledScore < -1 || scaledScore > 1)) {
    throw new AppError('SCORM 2004 scaled score must be between -1 and 1', 400);
  }
  return {
    completionStatus: ['unknown', 'not_attempted', 'incomplete', 'completed'].includes(completion) ? completion : 'unknown',
    successStatus: ['unknown', 'passed', 'failed'].includes(success) ? success : 'unknown',
    scoreRaw: numberOrNull(data['cmi.score.raw']),
    scoreMin: numberOrNull(data['cmi.score.min']),
    scoreMax: numberOrNull(data['cmi.score.max']),
    scoreScaled: scaledScore,
    location: data['cmi.location'] || null,
    suspendData: data['cmi.suspend_data'] || null,
    sessionTimeSeconds: parseDurationSeconds(data['cmi.session_time']),
    data,
  };
};

export const chooseScormDestination = (scos, currentIdentifier, direction, requestedIdentifier) => {
  const current = scos.findIndex((sco) => sco.sco_identifier === currentIdentifier);
  if (requestedIdentifier) return scos.find((sco) => sco.sco_identifier === requestedIdentifier) || null;
  const offset = direction === 'previous' ? -1 : direction === 'next' ? 1 : 0;
  return scos[current + offset] || null;
};

const serializeAttempt = (attempt, states) => ({
  id: Number(attempt.id), resource_id: Number(attempt.resource_id),
  resource_version_id: Number(attempt.resource_version_id), release_id: attempt.release_id && Number(attempt.release_id),
  attempt_number: Number(attempt.attempt_number), edition: attempt.edition, status: attempt.status,
  current_sco_identifier: attempt.current_sco_identifier,
  sequencing_support: 'basic_manifest_order',
  scos: states.map((state) => ({ ...state, id: Number(state.id), display_order: Number(state.display_order) })),
});

const loadAttempt = async (attemptId, user, query = dbQuery) => {
  const result = await query(
    `SELECT * FROM studio_scorm_attempts WHERE id = $1 AND user_id = $2`,
    [attemptId, user.id],
  );
  const attempt = result.rows[0];
  if (!attempt) throw new AppError('SCORM attempt not found', 404);
  const states = (await query(
    `SELECT * FROM studio_scorm_sco_states WHERE attempt_id = $1 ORDER BY display_order, id`, [attemptId],
  )).rows;
  return { attempt, states };
};

const releaseContainsVersion = (manifest, versionId) => (manifest?.screens || []).some((screen) =>
  (screen.elements || []).some((element) => Number(element.resource_mapping?.resource_version_id) === versionId));

const assertTeacherReleaseAccess = async (manifest, user) => {
  if (user.role !== 'teacher') return;
  const programId = Number(manifest?.session?.program_id);
  const programSchoolId = Number(manifest?.session?.program_school_id);
  if (!Number.isInteger(programId)) throw new AppError('Published Session access metadata is incomplete', 409);
  const memberships = await dbQuery(
    `SELECT DISTINCT school_id FROM school_memberships
     WHERE user_id = $1 AND status = 'active' AND role_scope = 'teacher'`, [user.id],
  );
  const schoolIds = memberships.rows.map((row) => Number(row.school_id)).filter(Number.isInteger);
  const ownsProgram = Number.isInteger(programSchoolId) && schoolIds.includes(programSchoolId);
  const assigned = !ownsProgram && schoolIds.length > 0 && (await dbQuery(
    `SELECT 1 FROM question_bank_school_assignments
     WHERE program_id = $1 AND school_id = ANY($2::int[]) LIMIT 1`, [programId, schoolIds],
  )).rows.length > 0;
  if (!ownsProgram && !assigned) throw new AppError('Access denied', 403);
};

export const startScormAttempt = async ({ versionId: rawVersionId, releaseId: rawReleaseId, resume = true, user }) => {
  const versionId = parseId(rawVersionId, 'Resource version ID');
  const releaseId = rawReleaseId ? parseId(rawReleaseId, 'Release ID') : null;
  const versionResult = await dbQuery(
    `SELECT rv.*, r.id AS resource_id, r.client_id, r.resource_type, r.is_active
     FROM resource_versions rv JOIN resources r ON r.id = rv.resource_id WHERE rv.id = $1`, [versionId],
  );
  const version = versionResult.rows[0];
  if (!version || version.resource_type !== 'scorm' || !version.is_active) throw new AppError('SCORM Resource version not found', 404);
  const globalAuthor = user.role === 'content_authorizer' && (user.client_id === null || user.client_id === undefined);
  if (user.role !== 'super_admin' && !globalAuthor && version.client_id !== null && Number(version.client_id) !== Number(user.client_id)) {
    throw new AppError('SCORM Resource version not found', 404);
  }
  if (!AUTHOR_ROLES.has(user.role)) {
    if (!releaseId) throw new AppError('A published release is required for learner SCORM launch', 403);
    const release = (await dbQuery(
      `SELECT id, client_id, manifest_json FROM session_releases WHERE id = $1 AND client_id = $2`,
      [releaseId, user.client_id],
    )).rows[0];
    if (!release || !releaseContainsVersion(release.manifest_json, versionId)) throw new AppError('Published release does not contain this Resource version', 403);
    await assertTeacherReleaseAccess(release.manifest_json, user);
  }
  const runtime = version.metadata_json?.runtime;
  const scorm = runtime?.scorm;
  if (runtime?.kind !== 'scorm' || !['1.2', '2004'].includes(scorm?.edition) || !scorm.scos?.length) {
    throw new AppError('SCORM package metadata is unavailable; upload a new version', 422);
  }
  if (resume) {
    const existing = (await dbQuery(
      `SELECT * FROM studio_scorm_attempts WHERE user_id = $1 AND resource_version_id = $2
       AND release_id IS NOT DISTINCT FROM $3 AND status = ANY($4::text[])
       ORDER BY attempt_number DESC LIMIT 1`,
      [user.id, versionId, releaseId, ACTIVE_STATUSES],
    )).rows[0];
    if (existing) {
      const loaded = await loadAttempt(existing.id, user);
      const current = loaded.states.find((state) => state.sco_identifier === existing.current_sco_identifier);
      return { ...serializeAttempt(loaded.attempt, loaded.states), resumed: true,
        launch: await createRuntimeLaunch({ versionId, user, allowAuthorizedReader: true, entryPointOverride: current.launch_path, attemptId: existing.id }) };
    }
  }
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const inserted = (await client.query(
      `INSERT INTO studio_scorm_attempts
       (client_id, user_id, resource_id, resource_version_id, release_id, attempt_number, edition, current_sco_identifier)
       SELECT $1, $2, $3, $4, $5, COALESCE(MAX(attempt_number), 0) + 1, $6, $7
       FROM studio_scorm_attempts WHERE user_id = $2 AND resource_version_id = $4 RETURNING *`,
      [user.client_id ?? version.client_id ?? null, user.id, version.resource_id, versionId, releaseId, scorm.edition, scorm.scos[0].identifier],
    )).rows[0];
    for (const sco of scorm.scos) {
      await client.query(
        `INSERT INTO studio_scorm_sco_states (attempt_id, sco_identifier, launch_path, display_order)
         VALUES ($1, $2, $3, $4)`, [inserted.id, sco.identifier, sco.launch_path, sco.order],
      );
    }
    await client.query('COMMIT');
    const loaded = await loadAttempt(inserted.id, user);
    return { ...serializeAttempt(loaded.attempt, loaded.states), resumed: false,
      launch: await createRuntimeLaunch({ versionId, user, allowAuthorizedReader: true, entryPointOverride: scorm.scos[0].launch_path, attemptId: inserted.id }) };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
};

export const getScormAttempt = async ({ attemptId: rawAttemptId, user }) => {
  const loaded = await loadAttempt(parseId(rawAttemptId, 'Attempt ID'), user);
  return serializeAttempt(loaded.attempt, loaded.states);
};

export const commitScormAttempt = async ({ attemptId: rawAttemptId, scoIdentifier, data, event = 'commit', user }) => {
  const attemptId = parseId(rawAttemptId, 'Attempt ID');
  const loaded = await loadAttempt(attemptId, user);
  if (!ACTIVE_STATUSES.includes(loaded.attempt.status)) throw new AppError('SCORM attempt is no longer active', 409);
  const state = loaded.states.find((item) => item.sco_identifier === scoIdentifier);
  if (!state) throw new AppError('SCO does not belong to this attempt', 400);
  const normalized = normalizeScormData(loaded.attempt.edition, data);
  const allCompleted = loaded.states.every((item) => item.sco_identifier === scoIdentifier
    ? normalized.completionStatus === 'completed' : item.completion_status === 'completed');
  const status = event === 'suspend' ? 'suspended' : event === 'terminate' ? 'terminated'
    : allCompleted ? 'completed' : 'active';
  await dbQuery(
    `UPDATE studio_scorm_sco_states SET completion_status=$3, success_status=$4, score_raw=$5,
     score_min=$6, score_max=$7, score_scaled=$8, location=$9, suspend_data=$10,
     session_time_seconds=$11, total_time_seconds=total_time_seconds+$11, data_model_json=$12::jsonb,
     initialized_at=COALESCE(initialized_at,NOW()), committed_at=NOW(),
     terminated_at=CASE WHEN $13='terminate' THEN NOW() ELSE terminated_at END, updated_at=NOW()
     WHERE attempt_id=$1 AND sco_identifier=$2`,
    [attemptId, scoIdentifier, normalized.completionStatus, normalized.successStatus, normalized.scoreRaw,
      normalized.scoreMin, normalized.scoreMax, normalized.scoreScaled, normalized.location,
      normalized.suspendData, normalized.sessionTimeSeconds, JSON.stringify(normalized.data), event],
  );
  await dbQuery(
    `UPDATE studio_scorm_attempts SET status=$2, current_sco_identifier=$3, last_activity_at=NOW(),
     completed_at=CASE WHEN $2 IN ('completed','terminated') THEN NOW() ELSE completed_at END, updated_at=NOW()
     WHERE id=$1`, [attemptId, status, scoIdentifier],
  );
  return getScormAttempt({ attemptId, user });
};

export const navigateScormAttempt = async ({ attemptId: rawAttemptId, direction, scoIdentifier, user }) => {
  const attemptId = parseId(rawAttemptId, 'Attempt ID');
  const loaded = await loadAttempt(attemptId, user);
  if (!ACTIVE_STATUSES.includes(loaded.attempt.status)) throw new AppError('SCORM attempt is no longer active', 409);
  const destination = chooseScormDestination(loaded.states, loaded.attempt.current_sco_identifier, direction, scoIdentifier);
  if (!destination) throw new AppError('Requested SCO destination is unavailable', 400);
  await dbQuery(`UPDATE studio_scorm_attempts SET current_sco_identifier=$2, status='active', last_activity_at=NOW(), updated_at=NOW() WHERE id=$1`, [attemptId, destination.sco_identifier]);
  const launch = await createRuntimeLaunch({ versionId: loaded.attempt.resource_version_id, user,
    allowAuthorizedReader: true, entryPointOverride: destination.launch_path, attemptId });
  return { attempt_id: attemptId, current_sco_identifier: destination.sco_identifier,
    sequencing_support: 'basic_manifest_order', launch };
};
