import test from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET ||= 'studio-day8-resource-test-secret';
process.env.STUDIO_RUNTIME_SECRET ||= 'studio-day8-runtime-test-secret';
process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_KEY ||= 'test-only-service-key';

const { default: pool } = await import('../config/db.js');
const { default: supabase } = await import('../config/supabaseClient.js');
const {
  createResourceVersion,
  getResourceUsages,
} = await import('../services/studioResources.service.js');
const {
  createRuntimeLaunch,
  loadRuntimeAsset,
} = await import('../services/studioResourceRuntime.service.js');

const normalizeSql = (value) => String(value).replace(/\s+/g, ' ').trim().toLowerCase();
const author = { id: 8, role: 'content_authorizer', client_id: 12 };
const resource = {
  id: 201,
  client_id: 12,
  name: 'Kinematics interaction',
  description: null,
  resource_type: 'html',
  is_active: true,
};

test('Resource usage acceptance separates placements, Screens and pinned versions', async (t) => {
  const originalQuery = pool.query;
  pool.query = async (text) => {
    const sql = normalizeSql(text);
    if (sql.includes('from resources where id')) return { rows: [resource] };
    if (sql.includes('from resource_mappings rm')) return { rows: [
      {
        placement_id: 501,
        resource_version_id: 301,
        version_number: 1,
        screen_id: 71,
        session_id: 41,
        element_id: 'visual-a',
      },
      {
        placement_id: 502,
        resource_version_id: 301,
        version_number: 1,
        screen_id: 71,
        session_id: 41,
        element_id: 'visual-b',
      },
      {
        placement_id: 503,
        resource_version_id: 302,
        version_number: 2,
        screen_id: 72,
        session_id: 41,
        element_id: 'visual-c',
      },
    ] };
    throw new Error(`Unhandled query: ${sql}`);
  };
  t.after(() => { pool.query = originalQuery; });

  const result = await getResourceUsages({ resourceId: 201, user: author });

  assert.equal(result.resource_id, 201);
  assert.equal(result.placement_count, 3);
  assert.equal(result.distinct_screen_count, 2);
  assert.deepEqual(
    result.placements.map((placement) => placement.version_number),
    [1, 1, 2]
  );
  assert.equal(new Set(result.placements.map((placement) => placement.placement_id)).size, 3);
});

test('Resource usage acceptance hides cross-tenant Resource records', async (t) => {
  const originalQuery = pool.query;
  let mappingQueryRan = false;
  pool.query = async (text) => {
    const sql = normalizeSql(text);
    if (sql.includes('from resources where id')) {
      return { rows: [{ ...resource, client_id: 99 }] };
    }
    if (sql.includes('from resource_mappings rm')) {
      mappingQueryRan = true;
      return { rows: [] };
    }
    throw new Error(`Unhandled query: ${sql}`);
  };
  t.after(() => { pool.query = originalQuery; });

  await assert.rejects(
    getResourceUsages({ resourceId: 201, user: author }),
    (error) => error?.status === 404
  );
  assert.equal(mappingQueryRan, false);
});

test('creating a replacement Resource version preserves earlier versions and mappings', async (t) => {
  const originalQuery = pool.query;
  const originalConnect = pool.connect;
  const originalFrom = supabase.storage.from;
  const databaseCalls = [];
  const uploadedKeys = [];
  let insertParams = null;

  pool.query = async (text) => {
    const sql = normalizeSql(text);
    if (sql.includes('from resources where id')) return { rows: [resource] };
    throw new Error(`Unhandled pre-transaction query: ${sql}`);
  };
  pool.connect = async () => ({
    async query(text, params = []) {
      const sql = normalizeSql(text);
      databaseCalls.push(sql);
      if (['begin', 'commit', 'rollback'].includes(sql)) return { rows: [] };
      if (sql.includes('from resources where id') && sql.includes('for update')) {
        return { rows: [resource] };
      }
      if (sql.startsWith('select coalesce(max(version_number)')) {
        return { rows: [{ version_number: 3 }] };
      }
      if (sql.startsWith('insert into resource_versions')) {
        insertParams = params;
        return { rows: [{
          id: 303,
          resource_id: 201,
          version_number: params[1],
          storage_key: params[2],
          original_file_name: params[3],
          checksum_sha256: params[6],
        }] };
      }
      throw new Error(`Unhandled transaction query: ${sql}`);
    },
    release() {},
  });
  supabase.storage.from = (bucket) => {
    assert.equal(bucket, 'studio-resources');
    return {
      upload: async (storageKey) => {
        uploadedKeys.push(storageKey);
        return { error: null };
      },
      remove: async () => ({ error: null }),
    };
  };
  t.after(() => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
    supabase.storage.from = originalFrom;
  });

  const result = await createResourceVersion({
    resourceId: 201,
    body: {},
    file: {
      originalname: 'kinematics-v3.html',
      mimetype: 'text/html',
      buffer: Buffer.from('<h1>Kinematics version 3</h1>'),
    },
    user: author,
  });

  assert.equal(result.resource_id, 201);
  assert.equal(result.version.version_number, 3);
  assert.equal(insertParams[0], 201);
  assert.equal(insertParams[1], 3);
  assert.equal(insertParams[3], 'kinematics-v3.html');
  assert.equal(uploadedKeys.length, 1);
  assert.ok(databaseCalls.includes('commit'));
  assert.ok(!databaseCalls.some((sql) =>
    sql.startsWith('update resource_versions') ||
    sql.startsWith('delete from resource_versions') ||
    sql.includes('resource_mappings')
  ));
});

test('HTML and browser ZIP launches serve only immutable manifest files', async (t) => {
  const versions = new Map([
    [301, {
      id: 301,
      resource_id: 201,
      client_id: 12,
      resource_type: 'html',
      is_active: true,
      storage_key: 'resources/lesson.html',
      entry_point: 'index.html',
      mime_type: 'text/html',
      file_size: 24,
      metadata_json: {
        runtime: {
          kind: 'single_html',
          entry_point: 'index.html',
          package_prefix: null,
          files: [{ path: 'index.html', mime_type: 'text/html', size: 24 }],
        },
      },
    }],
    [302, {
      id: 302,
      resource_id: 202,
      client_id: 12,
      resource_type: 'zip',
      is_active: true,
      storage_key: 'resources/lesson.zip',
      entry_point: 'lesson/index.html',
      metadata_json: {
        runtime: {
          kind: 'browser_zip',
          entry_point: 'lesson/index.html',
          package_prefix: 'runtime-packages/package-302',
          files: [
            { path: 'lesson/index.html', mime_type: 'text/html', size: 28 },
            { path: 'lesson/app.js', mime_type: 'application/javascript', size: 18 },
          ],
        },
      },
    }],
  ]);
  const storedBytes = new Map([
    ['resources/lesson.html', Buffer.from('<h1>Standalone HTML</h1>')],
    ['runtime-packages/package-302/lesson/index.html', Buffer.from('<script src="app.js"></script>')],
    ['runtime-packages/package-302/lesson/app.js', Buffer.from('window.ready=true;')],
  ]);
  const downloadedKeys = [];
  const originalQuery = pool.query;
  const originalFrom = supabase.storage.from;

  pool.query = async (_text, params) => ({ rows: [versions.get(Number(params[0]))] });
  supabase.storage.from = () => ({
    download: async (storageKey) => {
      downloadedKeys.push(storageKey);
      const bytes = storedBytes.get(storageKey);
      return bytes
        ? { data: new Blob([bytes]), error: null }
        : { data: null, error: new Error('Not found') };
    },
  });
  t.after(() => {
    pool.query = originalQuery;
    supabase.storage.from = originalFrom;
  });

  for (const [versionId, entryPoint] of [[301, 'index.html'], [302, 'lesson/index.html']]) {
    const launch = await createRuntimeLaunch({ versionId, user: author });
    assert.equal(launch.launchable, true);
    assert.deepEqual(launch.sandbox, ['allow-scripts']);
    assert.match(launch.launch_url, new RegExp(`${entryPoint.replace('/', '\\/')}$`));

    const match = launch.launch_url.match(/^\/api\/studio\/runtime\/([^/]+)\/(.+)$/);
    const asset = await loadRuntimeAsset({
      launchToken: decodeURIComponent(match[1]),
      requestedPath: decodeURIComponent(match[2]),
    });
    assert.equal(asset.mimeType, 'text/html');
    assert.ok(asset.buffer.length > 0);
  }

  const zipLaunch = await createRuntimeLaunch({ versionId: 302, user: author });
  const zipToken = decodeURIComponent(zipLaunch.launch_url.match(/^\/api\/studio\/runtime\/([^/]+)\//)[1]);
  await assert.rejects(
    loadRuntimeAsset({ launchToken: zipToken, requestedPath: 'lesson/private.txt' }),
    (error) => error?.status === 404
  );
  assert.deepEqual(downloadedKeys, [
    'resources/lesson.html',
    'runtime-packages/package-302/lesson/index.html',
  ]);
});
