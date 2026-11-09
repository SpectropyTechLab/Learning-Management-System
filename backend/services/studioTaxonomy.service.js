import { query as dbQuery } from '../repositories/db.repository.js';
import { AppError } from '../utils/errors.js';

const TYPES = new Set(['pedagogy', 'bloom', 'target_exam']);
const AUTHORS = new Set(['super_admin', 'content_authorizer']);

const taxonomyType = (value, { optional = false } = {}) => {
  const type = String(value ?? '').trim().toLowerCase();
  if (optional && !type) return null;
  if (!TYPES.has(type)) throw new AppError('Taxonomy type must be pedagogy, bloom, or target_exam', 400);
  return type;
};

const parseId = (value, label) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(`${label} must be a positive integer`, 400);
  return id;
};

export const taxonomyCode = (value) => String(value ?? '')
  .trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);

const label = (value) => {
  const result = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!result || result.length > 160) throw new AppError('Taxonomy label must be 1 to 160 characters', 422);
  return result;
};

const assertAuthor = (user) => {
  if (!AUTHORS.has(user?.role)) throw new AppError('Only Studio authors can create taxonomy values', 403);
};

const scopedClientId = (user) => user?.role === 'super_admin' && !user?.client_id
  ? null
  : (user?.client_id ? Number(user.client_id) : null);

const termView = (row) => ({
  id: Number(row.id), type: row.taxonomy_type, code: row.code, label: row.label,
  client_id: row.client_id === null ? null : Number(row.client_id), is_active: Boolean(row.is_active),
});

export const listTerms = async ({ type: rawType, search, user, db = { query: dbQuery } }) => {
  const type = taxonomyType(rawType, { optional: true });
  const clientId = scopedClientId(user);
  const text = String(search ?? '').trim().slice(0, 160);
  const result = await db.query(
    `SELECT id, client_id, taxonomy_type, code, label, is_active
     FROM studio_taxonomy_terms
     WHERE is_active = TRUE
       AND ($1::text IS NULL OR taxonomy_type = $1)
       AND (client_id IS NULL OR client_id IS NOT DISTINCT FROM $2)
       AND ($3::text = '' OR label ILIKE '%' || $3 || '%' OR code ILIKE '%' || $3 || '%')
     ORDER BY taxonomy_type, LOWER(label), id`,
    [type, clientId, text],
  );
  return result.rows.map(termView);
};

export const createTerm = async ({ type: rawType, value, user, db = { query: dbQuery } }) => {
  assertAuthor(user);
  const type = taxonomyType(rawType);
  const nextLabel = label(value);
  const code = taxonomyCode(nextLabel);
  if (!code) throw new AppError('Taxonomy value must contain letters or numbers', 422);
  const clientId = scopedClientId(user);
  let result = await db.query(
    `INSERT INTO studio_taxonomy_terms (client_id, taxonomy_type, code, label, created_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT DO NOTHING
     RETURNING id, client_id, taxonomy_type, code, label, is_active`,
    [clientId, type, code, nextLabel, user?.id || null],
  );
  if (!result.rows[0]) {
    result = await db.query(
      `SELECT id, client_id, taxonomy_type, code, label, is_active
       FROM studio_taxonomy_terms
       WHERE client_id IS NOT DISTINCT FROM $1 AND taxonomy_type = $2 AND code = $3`,
      [clientId, type, code],
    );
  }
  return termView(result.rows[0]);
};

const topicContext = async (db, topicId) => {
  const result = await db.query(
    `SELECT t.id, b.client_id
     FROM topics t
     JOIN chapters ch ON ch.id = t.chapter_id
     JOIN subjects su ON su.id = ch.subject_id
     JOIN grades g ON g.id = su.grade_id
     JOIN programs p ON p.id = g.program_id
     LEFT JOIN boards b ON b.id = p.board_id
     WHERE t.id = $1`, [topicId],
  );
  if (!result.rows[0]) throw new AppError('Topic not found', 404);
  return result.rows[0];
};

const screenContext = async (db, screenId) => {
  const result = await db.query(
    `SELECT sc.id, sc.client_id, t.id AS topic_id
     FROM screens sc
     JOIN sessions se ON se.id = sc.session_id
     JOIN subtopics st ON st.id = se.subtopic_id
     JOIN topics t ON t.id = st.topic_id
     WHERE sc.id = $1`, [screenId],
  );
  if (!result.rows[0]) throw new AppError('Studio screen not found', 404);
  return result.rows[0];
};

const assertTenant = (clientId, user) => {
  if (user?.role === 'super_admin') return;
  if (user?.role === 'content_authorizer' && !user?.client_id) return;
  if (!user?.client_id || Number(clientId) !== Number(user.client_id)) throw new AppError('Access denied', 403);
};

const loadAssignments = async (db, table, ownerColumn, ownerId) => {
  const result = await db.query(
    `SELECT tt.id, tt.client_id, tt.taxonomy_type, tt.code, tt.label, tt.is_active, a.source
     FROM ${table} a JOIN studio_taxonomy_terms tt ON tt.id = a.term_id
     WHERE a.${ownerColumn} = $1 AND tt.is_active = TRUE
     ORDER BY tt.taxonomy_type, LOWER(tt.label)`, [ownerId],
  );
  return result.rows.map((row) => ({ ...termView(row), source: row.source }));
};

const grouped = (terms) => ({
  pedagogy: terms.filter((term) => term.type === 'pedagogy'),
  bloom: terms.filter((term) => term.type === 'bloom'),
  target_exam: terms.filter((term) => term.type === 'target_exam'),
});

const normalizeTermIds = (value) => [...new Set((Array.isArray(value) ? value : []).map(Number))]
  .filter((id) => Number.isInteger(id) && id > 0);

const validateTerms = async (db, termIds, user, allowedTypes) => {
  if (!termIds.length) return [];
  const clientId = scopedClientId(user);
  const result = await db.query(
    `SELECT id, taxonomy_type FROM studio_taxonomy_terms
     WHERE id = ANY($1::bigint[]) AND is_active = TRUE
       AND (client_id IS NULL OR client_id IS NOT DISTINCT FROM $2)`, [termIds, clientId],
  );
  if (result.rows.length !== termIds.length || result.rows.some((row) => !allowedTypes.has(row.taxonomy_type))) {
    throw new AppError('One or more taxonomy selections are invalid', 422);
  }
  return result.rows;
};

export const getTopicTerms = async ({ topicId: rawId, user, db = { query: dbQuery } }) => {
  const topicId = parseId(rawId, 'Topic ID');
  const context = await topicContext(db, topicId);
  assertTenant(context.client_id, user);
  return grouped(await loadAssignments(db, 'topic_taxonomy_terms', 'topic_id', topicId));
};

export const setTopicTerms = async ({ topicId: rawId, body = {}, user, db = { query: dbQuery } }) => {
  assertAuthor(user);
  const topicId = parseId(rawId, 'Topic ID');
  const context = await topicContext(db, topicId);
  assertTenant(context.client_id, user);
  const termIds = [...normalizeTermIds(body.pedagogy_ids), ...normalizeTermIds(body.bloom_ids), ...normalizeTermIds(body.target_exam_ids)];
  await validateTerms(db, termIds, user, TYPES);
  await db.query('DELETE FROM topic_taxonomy_terms WHERE topic_id = $1', [topicId]);
  for (const termId of termIds) {
    await db.query('INSERT INTO topic_taxonomy_terms (topic_id, term_id, source) VALUES ($1, $2, $3)', [topicId, termId, 'manual']);
  }
  return getTopicTerms({ topicId, user, db });
};

export const getScreenTerms = async ({ screenId: rawId, user, db = { query: dbQuery } }) => {
  const screenId = parseId(rawId, 'Screen ID');
  const context = await screenContext(db, screenId);
  assertTenant(context.client_id, user);
  const explicit = grouped(await loadAssignments(db, 'screen_taxonomy_terms', 'screen_id', screenId));
  const topic = grouped(await loadAssignments(db, 'topic_taxonomy_terms', 'topic_id', Number(context.topic_id)));
  return {
    explicit,
    effective: {
      pedagogy: explicit.pedagogy.length ? explicit.pedagogy : topic.pedagogy,
      bloom: explicit.bloom.length ? explicit.bloom : topic.bloom,
      target_exam: topic.target_exam,
    },
  };
};

export const setScreenTerms = async ({ screenId: rawId, body = {}, user, db = { query: dbQuery } }) => {
  assertAuthor(user);
  const screenId = parseId(rawId, 'Screen ID');
  const context = await screenContext(db, screenId);
  assertTenant(context.client_id, user);
  const pedagogyIds = normalizeTermIds(body.pedagogy_ids);
  const bloomIds = normalizeTermIds(body.bloom_ids);
  if (!pedagogyIds.length) throw new AppError('At least one Pedagogy is required for a Screen', 422);
  const termIds = [...pedagogyIds, ...bloomIds];
  await validateTerms(db, termIds, user, new Set(['pedagogy', 'bloom']));
  await db.query('DELETE FROM screen_taxonomy_terms WHERE screen_id = $1', [screenId]);
  for (const termId of termIds) {
    await db.query('INSERT INTO screen_taxonomy_terms (screen_id, term_id, source) VALUES ($1, $2, $3)', [screenId, termId, 'manual']);
  }
  return getScreenTerms({ screenId, user, db });
};
