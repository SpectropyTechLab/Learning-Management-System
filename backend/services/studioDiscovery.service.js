import { query as dbQuery } from '../repositories/db.repository.js';
import { AppError } from '../utils/errors.js';

const AUTHOR_ROLES = new Set(['super_admin', 'content_authorizer']);
const PUBLISHED_READER_ROLES = new Set(['client_admin', 'school_owner', 'teacher']);
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 80;
const DISCOVERY_TYPES = new Set(['session', 'screen', 'resource']);
const DEFAULT_DISCOVERY_LIMIT = 20;
const MAX_DISCOVERY_LIMIT = 50;
const MAX_DISCOVERY_RELEASES = 500;

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

const optionalText = (value, label, maxLength = 120) => {
  const text = String(value ?? '').trim().toLowerCase();
  if (text.length > maxLength) throw new AppError(`${label} must be ${maxLength} characters or fewer`, 400);
  return text;
};

const discoveryLimit = (value) => {
  if (value === undefined || value === null || value === '') return DEFAULT_DISCOVERY_LIMIT;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_DISCOVERY_LIMIT) {
    throw new AppError(`limit must be between 1 and ${MAX_DISCOVERY_LIMIT}`, 400);
  }
  return limit;
};

const decodeCursor = (value) => {
  if (!value) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(String(value), 'base64url').toString('utf8'));
    if (!Number.isInteger(parsed.offset) || parsed.offset < 0) throw new Error('Invalid offset');
    return parsed.offset;
  } catch {
    throw new AppError('cursor is invalid', 400);
  }
};

const encodeCursor = (offset) => Buffer.from(JSON.stringify({ offset }), 'utf8').toString('base64url');

const normalizeOptionalTags = (value) => {
  if (value === undefined || value === null || value === '') return [];
  return normalizeTags(value);
};

const normalizedArray = (value) => Array.isArray(value)
  ? value.map((item) => String(item).trim().toLowerCase()).filter(Boolean)
  : [];

const stringifyContent = (value) => {
  try { return JSON.stringify(value ?? {}).toLowerCase(); }
  catch { return ''; }
};

const scriptContentByScreen = (manifest) => new Map(
  (Array.isArray(manifest?.screen_scripts) ? manifest.screen_scripts : [])
    .map((script) => [Number(script.screen_id), stringifyContent(script.content)]),
);

const metadataMatches = ({ text, tags, requestedTags, pedagogy, bloom, search }) => {
  const normalizedTags = new Set(normalizedArray(tags));
  if (requestedTags.some((tag) => !normalizedTags.has(tag))) return false;
  if (pedagogy && !text.includes(pedagogy)) return false;
  if (bloom && !text.includes(bloom)) return false;
  if (search && !text.includes(search)) return false;
  return true;
};

const discoveryScore = ({ context, row, tags, requestedTags, text, pedagogy, bloom }) => {
  let score = 10;
  if (Number(row.topic_id) === Number(context.topic_id)) score += 20;
  if (Number(row.subtopic_id) === Number(context.subtopic_id)) score += 30;
  const normalizedTags = new Set(normalizedArray(tags));
  score += requestedTags.filter((tag) => normalizedTags.has(tag)).length * 5;
  if (pedagogy && text.includes(pedagogy)) score += 8;
  if (bloom && text.includes(bloom)) score += 8;
  return score;
};

const assertPublishedDiscoveryAccess = async (release, user, db) => {
  if (AUTHOR_ROLES.has(user?.role)) {
    assertAuthorTenant(release.client_id, user);
    return null;
  }
  if (user?.role === 'client_admin') {
    if (!user?.client_id || Number(release.client_id) !== Number(user.client_id)) {
      throw new AppError('Access denied', 403);
    }
    return null;
  }
  const schoolIds = await getReaderSchools(user, db);
  const assignedProgramIds = await getAssignedProgramIds(schoolIds, db);
  if (!canReadRelease(release, schoolIds, assignedProgramIds)) {
    throw new AppError('Access denied', 403);
  }
  return { schoolIds, assignedProgramIds };
};

const loadDiscoveryContext = async ({ releaseId, screenId, user, db }) => {
  const result = await db.query(
    `SELECT sr.id, sr.client_id, sr.session_id, sr.release_number, sr.manifest_json, sr.published_at,
            b.id AS board_id, b.name AS board_name,
            p.id AS program_id, p.name AS program_name,
            g.id AS grade_id, g.grade_number,
            su.id AS subject_id, su.name AS subject_name,
            ch.id AS chapter_id, ch.chapter_number, ch.name AS chapter_name,
            t.id AS topic_id, t.name AS topic_name,
            st.id AS subtopic_id, st.name AS subtopic_name
     FROM session_releases sr
     JOIN sessions se ON se.id = sr.session_id
     JOIN subtopics st ON st.id = se.subtopic_id
     JOIN topics t ON t.id = st.topic_id
     JOIN chapters ch ON ch.id = t.chapter_id
     JOIN subjects su ON su.id = ch.subject_id
     JOIN grades g ON g.id = su.grade_id
     JOIN programs p ON p.id = g.program_id
     JOIN boards b ON b.id = p.board_id
     WHERE sr.id = $1`,
    [releaseId],
  );
  const context = result.rows[0];
  if (!context) throw new AppError('Published Session release not found', 404);
  const access = await assertPublishedDiscoveryAccess(context, user, db);
  const screens = Array.isArray(context.manifest_json?.screens) ? context.manifest_json.screens : [];
  if (!screens.some((screen) => Number(screen.screen_id) === screenId)) {
    throw new AppError('Screen is not part of the requested release', 404);
  }
  return { context, access };
};

const loadChapterReleases = async ({ context, topicId, subtopicId, user, access, db }) => {
  const result = await db.query(
    `SELECT * FROM (
       SELECT DISTINCT ON (sr.session_id)
              sr.id, sr.client_id, sr.session_id, sr.release_number, sr.manifest_json, sr.published_at,
              se.title AS session_title, se.description AS session_description,
              b.id AS board_id, b.name AS board_name,
              p.id AS program_id, p.name AS program_name,
              g.id AS grade_id, g.grade_number,
              su.id AS subject_id, su.name AS subject_name,
              ch.id AS chapter_id, ch.chapter_number, ch.name AS chapter_name,
              t.id AS topic_id, t.name AS topic_name,
              st.id AS subtopic_id, st.name AS subtopic_name
       FROM session_releases sr
       JOIN sessions se ON se.id = sr.session_id
       JOIN subtopics st ON st.id = se.subtopic_id
       JOIN topics t ON t.id = st.topic_id
       JOIN chapters ch ON ch.id = t.chapter_id
       JOIN subjects su ON su.id = ch.subject_id
       JOIN grades g ON g.id = su.grade_id
       JOIN programs p ON p.id = g.program_id
       JOIN boards b ON b.id = p.board_id
       WHERE sr.client_id IS NOT DISTINCT FROM $1
         AND ch.id = $2
         AND ($3::int IS NULL OR t.id = $3)
         AND ($4::int IS NULL OR st.id = $4)
       ORDER BY sr.session_id, sr.release_number DESC
     ) latest
     ORDER BY published_at DESC, id DESC
     LIMIT $5`,
    [context.client_id, context.chapter_id, topicId, subtopicId, MAX_DISCOVERY_RELEASES],
  );
  if (AUTHOR_ROLES.has(user?.role) || user?.role === 'client_admin') return result.rows;
  const { schoolIds, assignedProgramIds } = access || {};
  return result.rows.filter((release) => canReadRelease(release, schoolIds, assignedProgramIds));
};

const curriculumView = (row) => ({
  board_id: Number(row.board_id), board_name: row.board_name,
  program_id: Number(row.program_id), program_name: row.program_name,
  grade_id: Number(row.grade_id), grade_number: Number(row.grade_number),
  subject_id: Number(row.subject_id), subject_name: row.subject_name,
  chapter_id: Number(row.chapter_id), chapter_number: Number(row.chapter_number), chapter_name: row.chapter_name,
  topic_id: Number(row.topic_id), topic_name: row.topic_name,
  subtopic_id: Number(row.subtopic_id), subtopic_name: row.subtopic_name,
});

const sessionDiscoveryItems = ({ releases, context, filters }) => releases.flatMap((row) => {
  const manifest = row.manifest_json || {};
  const screens = Array.isArray(manifest.screens) ? manifest.screens : [];
  const tags = [...new Set(screens.flatMap((screen) => normalizedArray(screen.tags)))];
  const text = [row.session_title, row.session_description, row.topic_name, row.subtopic_name, stringifyContent(manifest.documents), stringifyContent(manifest.screen_scripts), ...tags].join(' ').toLowerCase();
  if (!metadataMatches({ text, tags, ...filters })) return [];
  return [{
    key: `session:${row.id}`,
    type: 'session',
    title: row.session_title,
    description: row.session_description,
    release_id: Number(row.id), release_number: Number(row.release_number),
    session_id: Number(row.session_id), screen_count: screens.length,
    tags, curriculum: curriculumView(row),
    score: discoveryScore({ context, row, tags, text, ...filters }),
    published_at: row.published_at,
  }];
});

const screenDiscoveryItems = ({ releases, context, filters }) => releases.flatMap((row) => {
  const manifest = row.manifest_json || {};
  const scripts = scriptContentByScreen(manifest);
  return (Array.isArray(manifest.screens) ? manifest.screens : []).flatMap((screen) => {
    const tags = normalizedArray(screen.tags);
    const text = [screen.title, row.session_title, row.topic_name, row.subtopic_name, scripts.get(Number(screen.screen_id)) || '', ...tags].join(' ').toLowerCase();
    if (!metadataMatches({ text, tags, ...filters })) return [];
    return [{
      key: `screen:${row.id}:${screen.screen_id}`,
      type: 'screen', title: screen.title, description: row.session_title,
      release_id: Number(row.id), release_number: Number(row.release_number),
      session_id: Number(row.session_id), screen_id: Number(screen.screen_id),
      screen_number: Number(screen.screen_number), tags, curriculum: curriculumView(row),
      score: discoveryScore({ context, row, tags, text, ...filters }),
      published_at: row.published_at,
    }];
  });
});

const publishedResourceMappingView = (mapping) => ({
  resource_id: Number(mapping.resource_id),
  resource_version_id: Number(mapping.resource_version_id),
  version_number: Number(mapping.version_number),
  name: mapping.name,
  resource_type: mapping.resource_type,
  external_url: mapping.external_url || null,
  mime_type: mapping.mime_type || null,
  width: mapping.width === null || mapping.width === undefined ? null : Number(mapping.width),
  height: mapping.height === null || mapping.height === undefined ? null : Number(mapping.height),
});

const resourceDiscoveryItems = ({ releases, context, filters }) => {
  const items = new Map();
  for (const row of releases) {
    const manifest = row.manifest_json || {};
    const scripts = scriptContentByScreen(manifest);
    for (const screen of Array.isArray(manifest.screens) ? manifest.screens : []) {
      const tags = normalizedArray(screen.tags);
      for (const element of Array.isArray(screen.elements) ? screen.elements : []) {
        const mapping = element.resource_mapping;
        if (!mapping?.resource_version_id) continue;
        const text = [mapping.name, mapping.description, mapping.resource_type, screen.title, row.session_title, scripts.get(Number(screen.screen_id)) || '', ...tags].join(' ').toLowerCase();
        if (!metadataMatches({ text, tags, ...filters })) continue;
        const key = `resource:${row.id}:${mapping.resource_version_id}`;
        const candidate = {
          key, type: 'resource', title: mapping.name, description: `${row.session_title} · ${screen.title}`,
          release_id: Number(row.id), release_number: Number(row.release_number),
          session_id: Number(row.session_id), screen_id: Number(screen.screen_id),
          resource_id: Number(mapping.resource_id), resource_version_id: Number(mapping.resource_version_id),
          resource_type: mapping.resource_type, resource_mapping: publishedResourceMappingView(mapping),
          tags, curriculum: curriculumView(row),
          score: discoveryScore({ context, row, tags, text, ...filters }),
          published_at: row.published_at,
        };
        const existing = items.get(key);
        if (!existing || candidate.score > existing.score) items.set(key, candidate);
      }
    }
  }
  return [...items.values()];
};

export const discoverPublishedContent = async ({
  releaseId: rawReleaseId, screenId: rawScreenId, type: rawType,
  topicId: rawTopicId, subtopicId: rawSubtopicId, tags: rawTags,
  pedagogy: rawPedagogy, bloom: rawBloom, search: rawSearch,
  limit: rawLimit, cursor: rawCursor, user, db = { query: dbQuery },
}) => {
  assertDiscoveryRole(user);
  const releaseId = parseId(rawReleaseId, 'Release ID');
  const screenId = parseId(rawScreenId, 'Screen ID');
  const type = String(rawType || 'session').trim().toLowerCase();
  if (!DISCOVERY_TYPES.has(type)) throw new AppError('type must be session, screen, or resource', 400);
  const topicId = parseId(rawTopicId, 'Topic ID', { optional: true });
  const subtopicId = parseId(rawSubtopicId, 'Subtopic ID', { optional: true });
  const requestedTags = normalizeOptionalTags(rawTags);
  const pedagogy = optionalText(rawPedagogy, 'pedagogy');
  const bloom = optionalText(rawBloom, 'bloom');
  const search = optionalText(rawSearch, 'search', 200);
  const limit = discoveryLimit(rawLimit);
  const offset = decodeCursor(rawCursor);
  const { context, access } = await loadDiscoveryContext({ releaseId, screenId, user, db });
  const releases = await loadChapterReleases({ context, topicId, subtopicId, user, access, db });
  const filters = { requestedTags, pedagogy, bloom, search };
  const builders = { session: sessionDiscoveryItems, screen: screenDiscoveryItems, resource: resourceDiscoveryItems };
  const allItems = builders[type]({ releases, context, filters })
    .sort((left, right) => right.score - left.score || String(right.published_at).localeCompare(String(left.published_at)) || left.key.localeCompare(right.key));
  const items = allItems.slice(offset, offset + limit);
  const nextOffset = offset + items.length;
  const topics = [...new Map(releases.map((row) => [Number(row.topic_id), { id: Number(row.topic_id), name: row.topic_name }])).values()]
    .sort((left, right) => left.name.localeCompare(right.name));
  const subtopics = [...new Map(releases
    .filter((row) => !topicId || Number(row.topic_id) === topicId)
    .map((row) => [Number(row.subtopic_id), { id: Number(row.subtopic_id), topic_id: Number(row.topic_id), name: row.subtopic_name }])).values()]
    .sort((left, right) => left.name.localeCompare(right.name));
  return {
    type,
    items,
    next_cursor: nextOffset < allItems.length ? encodeCursor(nextOffset) : null,
    applied_context: curriculumView(context),
    facets: { topics, subtopics },
  };
};

