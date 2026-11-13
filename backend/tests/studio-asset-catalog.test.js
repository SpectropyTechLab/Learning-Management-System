import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const readBackend = (relativePath) => fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
const readFrontend = (relativePath) => fs.readFileSync(new URL(`../../frontend/src/features/teaching-studio/${relativePath}`, import.meta.url), 'utf8');

test('Asset Catalog is wired as individual-asset search and import, not embedded websites', () => {
  const routes = readBackend('routes/studioResources.routes.js');
  const service = readBackend('services/studioAssetCatalog.service.js');
  const panel = readFrontend('components/resources/AssetCatalogPanel.tsx');
  const library = readFrontend('components/resources/ResourceLibrary.tsx');
  assert.match(routes, /asset-catalog\/search/);
  assert.match(routes, /asset-catalog\/import/);
  assert.match(service, /api\.iconify\.design/);
  assert.match(service, /shorepine\/kenney/);
  assert.match(service, /3d-api\.si\.edu/);
  assert.match(service, /metadata_json: catalogMetadata/);
  assert.match(panel, /Add to screen/);
  assert.match(panel, /Add to library/);
  assert.match(library, /Discover Assets/);
  assert.doesNotMatch(panel, /iframe/i);
});

test('Iconify search returns normalized, licensed reusable SVG assets', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.match(String(url), /api\.iconify\.design\/search/);
    return new Response(JSON.stringify({ icons: ['mdi:car', 'tabler:car-filled'] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  try {
    const { searchAssetCatalog } = await import('../services/studioAssetCatalog.service.js');
    const result = await searchAssetCatalog({
      query: { q: 'car', kind: 'icon', provider: 'iconify', limit: 12 },
      user: { role: 'content_authorizer' },
    });
    assert.equal(result.results.length, 2);
    assert.equal(result.results[0].asset_kind, 'icon');
    assert.equal(result.results[0].resource_type, 'image');
    assert.equal(result.results[0].license.name, 'Apache-2.0');
    assert.match(result.results[0].preview_url, /mdi\/car\.svg/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Kenney search prefers filenames matching the requested object over sibling files', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.match(String(url), /api\.github\.com\/repos\/shorepine\/kenney/);
    return new Response(JSON.stringify({ tree: [
      { type: 'blob', path: '2d/Racing Pack/Cars/bus.png' },
      { type: 'blob', path: '2d/Racing Pack/Cars/car_blue_1.png' },
      { type: 'blob', path: '3d/nature/plant.glb' },
    ] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const { searchAssetCatalog } = await import('../services/studioAssetCatalog.service.js');
    const result = await searchAssetCatalog({
      query: { q: 'car', kind: 'illustration', provider: 'kenney', limit: 12 },
      user: { role: 'content_authorizer' },
    });
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].title, 'Car Blue 1');
    assert.equal(result.results[0].license.name, 'CC0-1.0');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Bioicons exposes individual SVG components only when their per-asset licence is allowlisted', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.match(String(url), /duerrsimon\/bioicons\/main\/static\/icons\/icons\.json/);
    return new Response(JSON.stringify([
      { name: 'Human_heart', category: 'Tissues', license: 'cc-0', author: 'Mariana RuizVillareal' },
      { name: 'heart-back', category: 'Human_physiology', license: 'cc-by-3.0', author: 'Servier' },
      { name: 'heart-share-alike', category: 'Human_physiology', license: 'cc-by-sa-4.0', author: 'Example' },
      { name: 'heart-unknown', category: 'Human_physiology', license: 'unknown', author: 'Example' },
    ]), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const { searchAssetCatalog } = await import('../services/studioAssetCatalog.service.js');
    const result = await searchAssetCatalog({
      query: { q: 'heart', kind: 'illustration', provider: 'bioicons', composition: 'component', limit: 12 },
      user: { role: 'content_authorizer' },
    });
    assert.equal(result.results.length, 2);
    assert.ok(result.results.every((asset) => asset.format === 'SVG' && asset.composition === 'component'));
    assert.deepEqual(result.results.map((asset) => asset.license.name).sort(), ['CC-BY-3.0', 'CC0-1.0']);
    assert.match(result.results.find((asset) => asset.provider_label.includes('Servier')).attribution, /Servier/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('SciDraw separates vector components from complete raster blocks and retains attribution', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.match(String(url), /scidraw\.io\/api\/v1\/drawings/);
    return new Response(JSON.stringify({ results: [
      { slug: 'heart-vector', name: 'Heart', image_url: 'http://scidraw.io/files/heart.svg', image_type: 'svg', is_vector: true, license: 'cc-by', category_name: 'human', doi: '10.1/example', primary_author: { full_name: 'Example Author' } },
      { slug: 'heart-diagram', name: 'Heart cycle diagram', image_url: 'http://scidraw.io/files/heart.png', image_type: 'png', is_vector: false, license: 'cc-by', category_name: 'human', primary_author: { full_name: 'Example Author' } },
      { slug: 'heart-unknown', name: 'Unlicensed heart', image_url: 'http://scidraw.io/files/unknown.svg', image_type: 'svg', is_vector: true, license: 'unknown', category_name: 'human', primary_author: { full_name: 'Example Author' } },
    ] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const { searchAssetCatalog } = await import('../services/studioAssetCatalog.service.js');
    const components = await searchAssetCatalog({
      query: { q: 'heart', kind: 'illustration', provider: 'scidraw', composition: 'component', limit: 12 },
      user: { role: 'content_authorizer' },
    });
    const blocks = await searchAssetCatalog({
      query: { q: 'heart', kind: 'illustration', provider: 'scidraw', composition: 'block', limit: 12 },
      user: { role: 'content_authorizer' },
    });
    assert.equal(components.results.length, 1);
    assert.equal(blocks.results.length, 1);
    assert.equal(components.results[0].license.name, 'CC-BY-4.0');
    assert.match(components.results[0].attribution, /Example Author.*DOI/);
    assert.equal(blocks.results[0].composition, 'block');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('canvas resources use transparent object rendering for images and 3D models', () => {
  const player = readFrontend('components/resources/StudioResourcePlayer.tsx');
  const model = readFrontend('components/resources/Model3DViewer.tsx');
  const canvas = readFrontend('components/BlankScreenCanvas.tsx');
  assert.match(player, /mode === 'canvas' \? 'bg-transparent'/);
  assert.match(model, /background: 'transparent'/);
  assert.match(model, /canvasMode \? '0' : '1'/);
  assert.match(canvas, /resource\.resource_type === 'image' \|\| resource\.resource_type === 'model_3d'/);
});
