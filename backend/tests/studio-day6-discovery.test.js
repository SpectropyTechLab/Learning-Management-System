import test from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET ||= 'studio-day6-discovery-test-secret';
process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_KEY ||= 'test-only-service-key';

const { default: screenRouter } = await import('../routes/studioScreens.routes.js');
const {
  discoverScreens,
  getBranchDestinations,
} = await import('../services/studioDiscovery.service.js');

const normalizedSql = (value) => String(value).replace(/\s+/g, ' ').trim().toLowerCase();
const author = { id: 8, role: 'content_authorizer', client_id: 12 };
const teacher = { id: 19, role: 'teacher', client_id: 12 };

const registeredRoutes = (router) => router.stack
  .filter((layer) => layer.route)
  .flatMap((layer) => Object.keys(layer.route.methods)
    .map((method) => `${method.toUpperCase()} ${layer.route.path}`));

test('Day 6 routes expose discovery before the parameterized Screen route and stable branch lookup', () => {
  const routes = registeredRoutes(screenRouter);
  const discoveryIndex = routes.indexOf('GET /studio/screens/discovery');
  const screenIndex = routes.indexOf('GET /studio/screens/:screenId');
  assert.ok(discoveryIndex >= 0);
  assert.ok(screenIndex > discoveryIndex);
  assert.ok(routes.includes('GET /studio/screens/:screenId/branches'));
});

test('author discovery normalizes duplicate tags and requires every requested tag', async () => {
  const calls = [];
  const db = {
    async query(text, params) {
      calls.push({ sql: normalizedSql(text), params });
      return { rows: [{
        screen_id: 42,
        session_id: 10,
        screen_number: 3,
        display_order: 2,
        revision_no: 5,
        title: 'Fraction repair',
        layout_id: 7,
        tags: ['fractions', 'remediation', 'visual'],
      }] };
    },
  };

  const result = await discoverScreens({
    tags: ' Fractions,remediation,FRACTIONS ',
    sessionId: '10',
    user: author,
    db,
  });

  assert.deepEqual(result.query, { tags: ['fractions', 'remediation'], match: 'all' });
  assert.equal(result.screens[0].source, 'current');
  assert.equal(result.screens[0].screen_id, 42);
  assert.deepEqual(calls[0].params, [['fractions', 'remediation'], 2, 12, 10]);
  assert.match(calls[0].sql, /having count\(distinct matched_tags\.tag\) = \$2/);
});

test('published discovery reads only accessible immutable release manifests', async () => {
  const db = {
    async query(text) {
      const sql = normalizedSql(text);
      if (sql.includes('from session_releases')) {
        return { rows: [
          {
            id: 91,
            client_id: 12,
            session_id: 10,
            release_number: 2,
            manifest_json: {
              session: { program_id: 6, program_school_id: 44 },
              screens: [
                {
                  screen_id: 42,
                  screen_number: 3,
                  display_order: 2,
                  revision_no: 5,
                  title: 'Published fraction repair',
                  layout: { layout_id: 7 },
                  tags: ['fractions', 'remediation', 'visual'],
                },
                {
                  screen_id: 43,
                  screen_number: 4,
                  display_order: 3,
                  revision_no: 1,
                  title: 'Fractions only',
                  layout: null,
                  tags: ['fractions'],
                },
              ],
            },
          },
          {
            id: 92,
            client_id: 12,
            session_id: 11,
            release_number: 1,
            manifest_json: {
              session: { program_id: 8, program_school_id: 99 },
              screens: [{
                screen_id: 50,
                screen_number: 1,
                display_order: 0,
                revision_no: 1,
                title: 'Other school',
                tags: ['fractions', 'remediation'],
              }],
            },
          },
        ] };
      }
      if (sql.includes('from school_memberships')) return { rows: [{ school_id: 44 }] };
      if (sql.includes('from question_bank_school_assignments')) return { rows: [] };
      throw new Error(`Unhandled query: ${sql}`);
    },
  };

  const result = await discoverScreens({
    tags: ['fractions', 'remediation'],
    user: teacher,
    db,
  });

  assert.equal(result.screens.length, 1);
  assert.equal(result.screens[0].source, 'published_release');
  assert.equal(result.screens[0].release_id, 91);
  assert.equal(result.screens[0].screen_id, 42);
  assert.equal(result.screens[0].title, 'Published fraction repair');
});

test('current branch lookup returns stable IDs and enforces the author tenant', async () => {
  const db = {
    async query(text) {
      const sql = normalizedSql(text);
      if (sql.includes('from screens sc join sessions se')) {
        return { rows: [{ id: 42, session_id: 10, client_id: 12, title: 'Origin' }] };
      }
      if (sql.includes('from screen_branches sb')) {
        return { rows: [{
          branch_key: 'incorrect-answer',
          trigger_kind: 'answer',
          trigger_config_json: { answer: 'incorrect' },
          restore_screen_state: true,
          restore_session_state: true,
          destination_screen_id: 47,
          destination_session_id: 10,
          destination_title: 'Remediation',
          return_screen_id: 42,
          return_session_id: 10,
          return_title: 'Origin',
        }] };
      }
      throw new Error(`Unhandled query: ${sql}`);
    },
  };

  const result = await getBranchDestinations({ screenId: 42, user: author, db });
  assert.equal(result.branches[0].branch_id, 'incorrect-answer');
  assert.deepEqual(result.branches[0].destination, {
    session_id: 10,
    screen_id: 47,
    title: 'Remediation',
  });
  assert.equal(result.branches[0].return_to.screen_id, 42);

  await assert.rejects(
    getBranchDestinations({
      screenId: 42,
      user: { ...author, client_id: 77 },
      db,
    }),
    (error) => error?.status === 403,
  );
});

test('teacher branch lookup stays inside the requested immutable release', async () => {
  const release = {
    id: 91,
    client_id: 12,
    session_id: 10,
    release_number: 2,
    manifest_json: {
      session: { program_id: 6, program_school_id: 44 },
      screens: [
        {
          screen_id: 42,
          title: 'Origin',
          branches: [{
            branch_key: 'incorrect-answer',
            destination_screen_id: 47,
            return_screen_id: 42,
            trigger_kind: 'answer',
            trigger_config_json: { answer: 'incorrect' },
            restore_screen_state: true,
            restore_session_state: true,
          }],
        },
        { screen_id: 47, title: 'Published remediation', branches: [] },
      ],
    },
  };
  const db = {
    async query(text) {
      const sql = normalizedSql(text);
      if (sql.includes('from session_releases')) return { rows: [release] };
      if (sql.includes('from school_memberships')) return { rows: [{ school_id: 44 }] };
      if (sql.includes('from question_bank_school_assignments')) return { rows: [] };
      throw new Error(`Unhandled query: ${sql}`);
    },
  };

  const result = await getBranchDestinations({
    screenId: 42,
    releaseId: 91,
    user: teacher,
    db,
  });

  assert.equal(result.release_id, 91);
  assert.equal(result.branches[0].destination.screen_id, 47);
  assert.equal(result.branches[0].destination.title, 'Published remediation');
  assert.equal(result.branches[0].release_id, 91);
});

test('client administrators can preview tenant releases without a school-membership filter', async () => {
  const calls = [];
  const db = {
    async query(text) {
      const sql = normalizedSql(text);
      calls.push(sql);
      if (sql.includes('from session_releases')) {
        return { rows: [{
          id: 95,
          client_id: 12,
          session_id: 15,
          release_number: 1,
          manifest_json: {
            session: { program_id: 20, program_school_id: 99 },
            screens: [{
              screen_id: 60,
              screen_number: 1,
              display_order: 0,
              revision_no: 1,
              title: 'Tenant release',
              tags: ['fractions'],
            }],
          },
        }] };
      }
      throw new Error(`Unhandled query: ${sql}`);
    },
  };

  const result = await discoverScreens({
    tags: 'fractions',
    user: { id: 5, role: 'client_admin', client_id: 12 },
    db,
  });

  assert.equal(result.screens[0].release_id, 95);
  assert.equal(calls.some((sql) => sql.includes('from school_memberships')), false);
});

test('blank tags and published branch lookup without release context are rejected', async () => {
  await assert.rejects(
    discoverScreens({ tags: ' , ', user: author, db: { query: async () => ({ rows: [] }) } }),
    (error) => error?.status === 400,
  );
  await assert.rejects(
    getBranchDestinations({
      screenId: 42,
      user: teacher,
      db: { query: async () => ({ rows: [] }) },
    }),
    (error) => error?.status === 400 && /release_id/.test(error.message),
  );
});

