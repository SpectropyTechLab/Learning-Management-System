import { query as dbQuery } from '../repositories/db.repository.js';
import { AppError } from '../utils/errors.js';

const AUTHOR_ROLES = new Set(['super_admin', 'content_authorizer']);
const PUBLISHED_READER_ROLES = new Set(['client_admin', 'school_owner', 'teacher']);
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 80;

const parseId = (value, label, { optional = false } = {}) => {
  if (optional && (value === undefined || value === null || value === '')) return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(`${label} must be a positive integer`, 400);
  }
  return id;
};

const normalizeTags = (value) => {
  const values = Array.isArray(value) ? value : String(value ?? '').split(',');
  const tags = [...new Set(values.map((tag) => String(tag).trim().toLowerCase()))];
  if (tags.length === 0 || tags.some((tag) => !tag)) {
    throw new AppError('At least one non-blank tag is required', 400);
  }
  if (tags.length > MAX_TAGS) {
    throw new AppError(`A maximum of ${MAX_TAGS} tags may be requested`, 400);
  }
  if (tags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
    throw new AppError(`Each tag must be ${MAX_TAG_LENGTH} characters or fewer`, 400);
  }
  return tags;
};

const assertDiscoveryRole = (user) => {
  if (!AUTHOR_ROLES.has(user?.role) && !PUBLISHED_READER_ROLES.has(user?.role)) {
    throw new AppError('Studio discovery access denied', 403);
  }
};

const assertAuthorTenant = (clientId, user) => {
  if (user?.role === 'super_admin') return;
  if (user?.role === 'content_authorizer' && !user?.client_id) return;
  if (!user?.client_id || Number(clientId) !== Number(user.client_id)) {
    throw new AppError('Access denied', 403);
  }
};

const authorTenantId = (user) => {
  if (user?.role === 'super_admin') return null;
  if (user?.role === 'content_authorizer' && !user?.client_id) return null;
  return parseId(user?.client_id, 'Client ID');
};

const getReaderSchools = async (user, db) => {
  if (!PUBLISHED_READER_ROLES.has(user?.role) || !user?.client_id) {
    throw new AppError('Published Studio access denied', 403);
  }
  const roleScopes = user.role === 'teacher' ? ['teacher'] : ['school_owner', 'admin'];
  const result = await db.query(
    `SELECT DISTINCT school_id
     FROM school_memberships
     WHERE user_id = $1 AND status = 'active' AND role_scope = ANY($2::text[])`,
    [user.id, roleScopes],
  );
  return result.rows.map((row) => Number(row.school_id)).filter(Number.isInteger);
};

const getAssignedProgramIds = async (schoolIds, db) => {
  if (schoolIds.length === 0) return new Set();
  const result = await db.query(
    `SELECT DISTINCT program_id
     FROM question_bank_school_assignments
     WHERE school_id = ANY($1::int[])`,
    [schoolIds],
  );
  return new Set(result.rows.map((row) => Number(row.program_id)).filter(Number.isInteger));
};

const canReadRelease = (release, schoolIds, assignedProgramIds) => {
  const session = release.manifest_json?.session || {};
  const schoolId = Number(session.program_school_id);
  const programId = Number(session.program_id);
  return (Number.isInteger(schoolId) && schoolIds.includes(schoolId)) ||
    (Number.isInteger(programId) && assignedProgramIds.has(programId));
};

const currentPreview = (row) => ({
  source: 'current',
  release_id: null,
  release_number: null,
  session_id: Number(row.session_id),
  screen_id: Number(row.screen_id),
  screen_number: Number(row.screen_number),
  display_order: Number(row.display_order),
  revision_no: Number(row.revision_no),
  title: row.title,
  layout_id: row.layout_id === null ? null : Number(row.layout_id),
  tags: row.tags || [],
});

const releasePreview = (release, screen) => ({
  source: 'published_release',
  release_id: Number(release.id),
  release_number: Number(release.release_number),
  session_id: Number(release.session_id),
  screen_id: Number(screen.screen_id),
  screen_number: Number(screen.screen_number),
  display_order: Number(screen.display_order),
  revision_no: Number(screen.revision_no),
  title: screen.title,
  layout_id: screen.layout?.layout_id === undefined || screen.layout?.layout_id === null
    ? null
    : Number(screen.layout.layout_id),
  tags: Array.isArray(screen.tags) ? screen.tags : [],
});

const discoverCurrentScreens = async ({ tags, sessionId, user, db }) => {
  const result = await db.query(
    `SELECT sc.id AS screen_id, sc.session_id, sc.screen_number, sc.display_order,
            sc.revision_no, sc.title, sc.layout_id,
            ARRAY_AGG(DISTINCT all_tags.tag ORDER BY all_tags.tag) AS tags
     FROM screens sc
     JOIN sessions se ON se.id = sc.session_id
     JOIN screen_tags matched_tags
       ON matched_tags.screen_id = sc.id AND matched_tags.tag = ANY($1::text[])
     JOIN screen_tags all_tags ON all_tags.screen_id = sc.id
     WHERE ($3::int IS NULL OR se.client_id = $3)
       AND ($4::int IS NULL OR se.id = $4)
     GROUP BY sc.id, sc.session_id, sc.screen_number, sc.display_order,
              sc.revision_no, sc.title, sc.layout_id
     HAVING COUNT(DISTINCT matched_tags.tag) = $2
     ORDER BY sc.session_id, sc.display_order, sc.screen_number, sc.id`,
    [tags, tags.length, authorTenantId(user), sessionId],
  );
  return result.rows.map(currentPreview);
};

const loadLatestPublishedReleases = async ({ sessionId, user, db }) => {
  const result = await db.query(
    `SELECT DISTINCT ON (session_id)
            id, client_id, session_id, release_number, manifest_json, published_at
     FROM session_releases
     WHERE client_id = $1 AND ($2::int IS NULL OR session_id = $2)
     ORDER BY session_id, release_number DESC`,
    [parseId(user.client_id, 'Client ID'), sessionId],
  );
  if (user.role === 'client_admin') return result.rows;
  const schoolIds = await getReaderSchools(user, db);
  const assignedProgramIds = await getAssignedProgramIds(schoolIds, db);
  return result.rows.filter((release) => canReadRelease(release, schoolIds, assignedProgramIds));
};

const discoverPublishedScreens = async ({ tags, sessionId, user, db }) => {
  const requested = new Set(tags);
  const releases = await loadLatestPublishedReleases({ sessionId, user, db });
  const previews = [];
  for (const release of releases) {
    for (const screen of release.manifest_json?.screens || []) {
      const screenTags = new Set(
        (Array.isArray(screen.tags) ? screen.tags : []).map((tag) => String(tag).trim().toLowerCase()),
      );
      if ([...requested].every((tag) => screenTags.has(tag))) {
        previews.push(releasePreview(release, screen));
      }
    }
  }
  return previews.sort((left, right) =>
    left.session_id - right.session_id || left.display_order - right.display_order ||
    left.screen_number - right.screen_number || left.screen_id - right.screen_id,
  );
};

export const discoverScreens = async ({ tags: rawTags, sessionId: rawSessionId, user, db = { query: dbQuery } }) => {
  assertDiscoveryRole(user);
  const tags = normalizeTags(rawTags);
  const sessionId = parseId(rawSessionId, 'Session ID', { optional: true });
  const screens = AUTHOR_ROLES.has(user.role)
    ? await discoverCurrentScreens({ tags, sessionId, user, db })
    : await discoverPublishedScreens({ tags, sessionId, user, db });
  return { query: { tags, match: 'all' }, screens };
};

const branchView = (branch, source, destination, returnScreen, releaseId = null) => ({
  branch_id: branch.branch_key ?? branch.id,
  source: {
    session_id: Number(source.session_id),
    screen_id: Number(source.screen_id ?? source.id),
  },
  destination: {
    session_id: Number(destination.session_id),
    screen_id: Number(destination.screen_id ?? destination.id),
    title: destination.title,
  },
  trigger: {
    kind: branch.trigger_kind,
    config: branch.trigger_config_json ?? branch.trigger ?? {},
  },
  return_to: {
    session_id: Number(returnScreen.session_id),
    screen_id: Number(returnScreen.screen_id ?? returnScreen.id),
    title: returnScreen.title,
    restore_screen_state: Boolean(branch.restore_screen_state),
    restore_session_state: Boolean(branch.restore_session_state),
  },
  release_id: releaseId === null ? null : Number(releaseId),
});

const getCurrentBranchDestinations = async ({ screenId, user, db }) => {
  const sourceResult = await db.query(
    `SELECT sc.id, sc.session_id, sc.client_id, sc.title
     FROM screens sc JOIN sessions se ON se.id = sc.session_id
     WHERE sc.id = $1`,
    [screenId],
  );
  const source = sourceResult.rows[0];
  if (!source) throw new AppError('Studio screen not found', 404);
  assertAuthorTenant(source.client_id, user);
  const result = await db.query(
    `SELECT sb.branch_key, sb.trigger_kind, sb.trigger_config_json,
            sb.restore_screen_state, sb.restore_session_state,
            destination.id AS destination_screen_id,
            destination.session_id AS destination_session_id,
            destination.title AS destination_title,
            return_screen.id AS return_screen_id,
            return_screen.session_id AS return_session_id,
            return_screen.title AS return_title
     FROM screen_branches sb
     JOIN screens destination ON destination.id = sb.destination_screen_id
     JOIN screens return_screen ON return_screen.id = sb.return_screen_id
     WHERE sb.source_screen_id = $1
     ORDER BY sb.display_order, sb.id`,
    [screenId],
  );
  return {
    screen_id: screenId,
    release_id: null,
    branches: result.rows.map((branch) => branchView(
      branch,
      { id: source.id, session_id: source.session_id },
      {
        id: branch.destination_screen_id,
        session_id: branch.destination_session_id,
        title: branch.destination_title,
      },
      {
        id: branch.return_screen_id,
        session_id: branch.return_session_id,
        title: branch.return_title,
      },
    )),
  };
};

const getPublishedBranchDestinations = async ({ screenId, releaseId, user, db }) => {
  if (!releaseId) throw new AppError('release_id is required for published branch lookup', 400);
  const result = await db.query(
    `SELECT id, client_id, session_id, release_number, manifest_json
     FROM session_releases WHERE id = $1 AND client_id = $2 LIMIT 1`,
    [releaseId, parseId(user.client_id, 'Client ID')],
  );
  const release = result.rows[0];
  if (!release) throw new AppError('Published Session release not found', 404);
  if (user.role !== 'client_admin') {
    const schoolIds = await getReaderSchools(user, db);
    const assignedProgramIds = await getAssignedProgramIds(schoolIds, db);
    if (!canReadRelease(release, schoolIds, assignedProgramIds)) {
      throw new AppError('Access denied', 403);
    }
  }
  const screens = Array.isArray(release.manifest_json?.screens) ? release.manifest_json.screens : [];
  const byId = new Map(screens.map((screen) => [Number(screen.screen_id), screen]));
  const source = byId.get(screenId);
  if (!source) throw new AppError('Screen is not part of the requested release', 404);
  const branches = (Array.isArray(source.branches) ? source.branches : []).map((branch) => {
    const destination = byId.get(Number(branch.destination_screen_id));
    const returnScreen = byId.get(Number(branch.return_screen_id));
    if (!destination || !returnScreen) {
      throw new AppError('Published branch destination metadata is incomplete', 409);
    }
    return branchView(
      branch,
      { screen_id: source.screen_id, session_id: release.session_id },
      { ...destination, session_id: release.session_id },
      { ...returnScreen, session_id: release.session_id },
      release.id,
    );
  });
  return { screen_id: screenId, release_id: Number(release.id), branches };
};

export const getBranchDestinations = async ({ screenId: rawScreenId, releaseId: rawReleaseId, user, db = { query: dbQuery } }) => {
  assertDiscoveryRole(user);
  const screenId = parseId(rawScreenId, 'Screen ID');
  const releaseId = parseId(rawReleaseId, 'Release ID', { optional: true });
  return AUTHOR_ROLES.has(user.role)
    ? getCurrentBranchDestinations({ screenId, user, db })
    : getPublishedBranchDestinations({ screenId, releaseId, user, db });
};

