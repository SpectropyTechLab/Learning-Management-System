import test from 'node:test';
import assert from 'node:assert/strict';
import AdmZip from 'adm-zip';

process.env.JWT_SECRET ||= 'studio-day6-test-secret';
process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_KEY ||= 'test-only-service-key';

const { default: pool } = await import('../config/db.js');
const { default: supabase } = await import('../config/supabaseClient.js');
const { inspectRuntimePackage } = await import('../services/studioPackageInspection.service.js');
const { createResource } = await import('../services/studioResources.service.js');
const { createRuntimeLaunch } = await import('../services/studioResourceRuntime.service.js');
const { serveRuntimeAsset } = await import('../controllers/studioResourceRuntime.controller.js');
const { default: runtimeRouter } = await import('../routes/studioResourceRuntime.routes.js');

const htmlFile = (html, name = 'index.html') => ({
  originalname: name,
  mimetype: 'text/html',
  buffer: Buffer.from(html),
});

const zipFile = (entries) => {
  const zip = new AdmZip();
  for (const [name, content] of entries) zip.addFile(name, Buffer.from(content));
  return {
    originalname: 'lesson.zip',
    mimetype: 'application/zip',
    buffer: zip.toBuffer(),
  };
};

test('browser ZIP inspection finds entry point and verifies local dependencies', () => {
  const inspection = inspectRuntimePackage({
    resourceType: 'zip',
    file: zipFile([
      ['lesson/index.html', '<link rel="stylesheet" href="styles.css"><script src="app.js"></script>'],
      ['lesson/styles.css', 'body { color: blue; }'],
      ['lesson/app.js', 'document.body.dataset.ready = "true";'],
    ]),
  });

  assert.equal(inspection.kind, 'browser_zip');
  assert.equal(inspection.entryPoint, 'lesson/index.html');
  assert.deepEqual(inspection.dependencies, ['lesson/app.js', 'lesson/styles.css']);
  assert.equal(inspection.files.length, 3);
});

test('browser ZIP inspection rejects missing dependencies', () => {
  assert.throws(
    () => inspectRuntimePackage({
      resourceType: 'zip',
      file: zipFile([['index.html', '<script src="missing.js"></script>']]),
    }),
    (error) => error?.status === 400 && error?.message.includes('dependency not found')
  );
});

test('browser ZIP inspection rejects path traversal', () => {
  const zip = new AdmZip();
  zip.addFile('index.html', Buffer.from('<h1>Safe entry</h1>'));
  zip.addFile('evil.js', Buffer.from('alert(1)'));
  zip.getEntries().find((entry) => entry.entryName === 'evil.js').entryName = '../evil.js';

  assert.throws(
    () => inspectRuntimePackage({
      resourceType: 'zip',
      file: {
        originalname: 'unsafe.zip',
        mimetype: 'application/zip',
        buffer: zip.toBuffer(),
      },
    }),
    (error) => error?.status === 400 && error?.message.includes('unsafe')
  );
});

test('single HTML inspection rejects external script dependencies', () => {
  assert.throws(
    () => inspectRuntimePackage({
      resourceType: 'html',
      file: htmlFile('<script src="https://cdn.example.com/app.js"></script>'),
    }),
    (error) => error?.status === 400 && error?.message.includes('External package dependency')
  );
});

test('ZIP Resource creation stores the original and immutable runtime assets', async (t) => {
  const uploaded = [];
  let insertedVersionParams = null;
  const originalFrom = supabase.storage.from;
  supabase.storage.from = () => ({
    upload: async (storageKey, _buffer, options) => {
      uploaded.push({ storageKey, contentType: options.contentType });
      return { error: null };
    },
    remove: async () => ({ error: null }),
  });
  const client = {
    async query(text, params = []) {
      const sql = String(text).replace(/\s+/g, ' ').trim().toLowerCase();
      if (['begin', 'commit', 'rollback'].includes(sql)) return { rows: [] };
      if (sql.startsWith('insert into resources')) {
        return { rows: [{
          id: 9,
          client_id: 12,
          name: 'Interactive lesson',
          resource_type: 'zip',
          is_active: true,
        }] };
      }
      if (sql.startsWith('insert into resource_versions')) {
        insertedVersionParams = params;
        return { rows: [{ id: 15, resource_id: 9, version_number: 1 }] };
      }
      throw new Error(`Unhandled query: ${sql}`);
    },
    release() {},
  };
  const originalConnect = pool.connect;
  pool.connect = async () => client;
  t.after(() => {
    pool.connect = originalConnect;
    supabase.storage.from = originalFrom;
  });

  await createResource({
    user: { id: 8, role: 'content_authorizer', client_id: 12 },
    body: { name: 'Interactive lesson', resource_type: 'zip' },
    file: zipFile([
      ['index.html', '<link rel="stylesheet" href="style.css"><h1>Lesson</h1>'],
      ['style.css', 'h1 { color: green; }'],
    ]),
  });

  assert.equal(uploaded.length, 3);
  assert.ok(uploaded.some(({ storageKey }) => storageKey.startsWith('resources/')));
  assert.equal(uploaded.filter(({ storageKey }) => storageKey.startsWith('runtime-packages/')).length, 2);
  assert.equal(insertedVersionParams[11], 'index.html');
  const metadata = JSON.parse(insertedVersionParams[12]);
  assert.equal(metadata.runtime.kind, 'browser_zip');
  assert.equal(metadata.runtime.file_count, 2);
  assert.equal(metadata.runtime.dependencies[0], 'style.css');
});

test('teachers cannot use the author preview launch endpoint', async () => {
  await assert.rejects(
    createRuntimeLaunch({
      versionId: 15,
      user: { id: 20, role: 'teacher', client_id: 12 },
    }),
    (error) => error?.status === 403
  );
});

test('runtime launch serves a prepared package asset with isolation headers', async (t) => {
  const versionRow = {
    id: 15,
    resource_id: 9,
    client_id: 12,
    resource_type: 'zip',
    is_active: true,
    storage_key: 'resources/original.zip',
    metadata_json: {
      runtime: {
        kind: 'browser_zip',
        package_prefix: 'runtime-packages/package-1',
        entry_point: 'lesson/index.html',
        files: [{ path: 'lesson/index.html', size: 18, mime_type: 'text/html' }],
      },
    },
  };
  const originalQuery = pool.query;
  pool.query = async () => ({ rows: [versionRow] });
  const originalFrom = supabase.storage.from;
  supabase.storage.from = () => ({
    download: async (storageKey) => {
      assert.equal(storageKey, 'runtime-packages/package-1/lesson/index.html');
      return { data: new Blob(['<h1>Runtime</h1>'], { type: 'text/html' }), error: null };
    },
  });
  t.after(() => {
    pool.query = originalQuery;
    supabase.storage.from = originalFrom;
  });

  const launch = await createRuntimeLaunch({
    versionId: 15,
    user: { id: 8, role: 'content_authorizer', client_id: 12 },
  });
  assert.equal(launch.launchable, true);
  assert.deepEqual(launch.sandbox, ['allow-scripts']);
  const match = launch.launch_url.match(/^\/api\/studio\/runtime\/([^/]+)\/(.+)$/);
  assert.ok(match);

  const headers = new Map();
  const response = {
    statusCode: 200,
    body: null,
    removeHeader(name) { headers.delete(name); },
    setHeader(name, value) { headers.set(name, value); },
    status(code) { this.statusCode = code; return this; },
    send(value) { this.body = value; return this; },
    json(value) { this.body = value; return this; },
  };
  await serveRuntimeAsset({
    params: {
      launchToken: decodeURIComponent(match[1]),
      0: decodeURIComponent(match[2]),
    },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.toString(), '<h1>Runtime</h1>');
  assert.match(headers.get('Content-Security-Policy'), /sandbox allow-scripts/);
  assert.match(headers.get('Content-Security-Policy'), /object-src 'none'/);
  assert.equal(headers.get('Referrer-Policy'), 'no-referrer');
});

test('Day 6 runtime routes expose launch, fallback download and tokenized asset delivery', () => {
  const routes = runtimeRouter.stack
    .filter((layer) => layer.route)
    .flatMap((layer) => Object.keys(layer.route.methods)
      .map((method) => `${method.toUpperCase()} ${layer.route.path}`));
  assert.ok(routes.includes('GET /studio/runtime/:launchToken/*'));
  assert.ok(routes.includes('POST /studio/resource-versions/:versionId/launch'));
  assert.ok(routes.includes('GET /studio/resource-versions/:versionId/download'));
});
