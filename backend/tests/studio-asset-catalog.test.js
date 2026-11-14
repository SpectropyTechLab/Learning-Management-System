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
  assert.match(service, /CaptExcellent\/kits-library-assets/);
  assert.match(service, /microsoft\/fluentui-emoji/);
  assert.match(service, /googlefonts\.github\.io\/noto-emoji-files/);
  assert.match(service, /api\.polyhaven\.com/);
  assert.match(service, /www\.openpeeps\.com/);
  assert.match(service, /www\.opendoodles\.com/);
  assert.doesNotMatch(service, /api\.iconify\.design|shorepine\/kenney|3d-api\.si\.edu/);
  assert.match(service, /metadata_json: catalogMetadata/);
  assert.match(panel, /Add to screen/);
  assert.match(panel, /Add to library/);
  assert.match(library, /Discover Assets/);
  assert.doesNotMatch(panel, /iframe/i);
});

test('Kitbitz search returns individual CC0 SVG components and excludes branded kits', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.match(String(url), /CaptExcellent\/kits-library-assets/);
    return new Response(JSON.stringify({ tree: [
      { type: 'blob', path: 'kits/city-kit/Car.svg' },
      { type: 'blob', path: 'kits/city-kit/Car.png' },
      { type: 'blob', path: 'kits/barbieland-kit/Barbie Car.svg' },
    ] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  try {
    const { searchAssetCatalog } = await import('../services/studioAssetCatalog.service.js');
    const result = await searchAssetCatalog({
      query: { q: 'car', kind: 'illustration', provider: 'kitbitz', limit: 12 },
      user: { role: 'content_authorizer' },
    });
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].asset_kind, 'illustration');
    assert.equal(result.results[0].resource_type, 'image');
    assert.equal(result.results[0].license.name, 'CC0-1.0');
    assert.equal(result.results[0].composition, 'component');
    assert.match(result.results[0].preview_url, /Car\.svg/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Fluent Emoji exposes polished color SVG components under the repository MIT licence', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.match(String(url), /microsoft\/fluentui-emoji/);
    return new Response(JSON.stringify({ tree: [
      { type: 'blob', path: 'assets/Automobile/Color/automobile_color.svg' },
      { type: 'blob', path: 'assets/Automobile/3D/automobile_3d.png' },
      { type: 'blob', path: 'assets/Bus/Color/bus_color.svg' },
    ] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const { searchAssetCatalog } = await import('../services/studioAssetCatalog.service.js');
    const result = await searchAssetCatalog({
      query: { q: 'automobile', kind: 'illustration', provider: 'fluent-emoji', limit: 12 },
      user: { role: 'content_authorizer' },
    });
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].title, 'Automobile');
    assert.equal(result.results[0].license.name, 'MIT');
    assert.equal(result.results[0].format, 'SVG');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Noto Emoji search exposes only animated CC-BY components', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.match(String(url), /noto-emoji-files\/data\/emojis_data\.js/);
    return new Response(`window.__NOTO_EMOJIS_DATA__ = ${JSON.stringify([
      { codepoint: '1f697', rgi: '1f697', name: 'Automobile', cldrName: 'Automobile', category: 'Travel & Places', subgroup: 'transport-ground', hasGfontsAnim: true },
      { codepoint: '1f3ce', rgi: '1f3ce-fe0f', name: 'Racing Car', cldrName: 'Racing Car', category: 'Travel & Places', subgroup: 'transport-ground', hasGfontsAnim: false },
    ])};`, { status: 200, headers: { 'content-type': 'text/javascript' } });
  };
  try {
    const { searchAssetCatalog } = await import('../services/studioAssetCatalog.service.js');
    const result = await searchAssetCatalog({
      query: { q: 'automobile', kind: 'animation', provider: 'noto-emoji', limit: 12 },
      user: { role: 'content_authorizer' },
    });
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].resource_type, 'animation');
    assert.equal(result.results[0].license.name, 'CC-BY-4.0');
    assert.equal(result.results[0].attribution_required, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Poly Haven search returns realistic CC0 models as individual 3D components', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.match(String(url), /api\.polyhaven\.com\/assets\?t=models/);
    return new Response(JSON.stringify({
      Classic_Car: {
        name: 'Classic Car', tags: ['vehicle', 'car'], categories: ['vehicles'], category: 'Vehicles & Transport',
        authors: { 'Example Artist': 'All' }, thumbnail_url: 'https://cdn.polyhaven.com/car.webp',
      },
      Chair: { name: 'Chair', tags: ['furniture'], categories: ['furniture'] },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const { searchAssetCatalog } = await import('../services/studioAssetCatalog.service.js');
    const result = await searchAssetCatalog({
      query: { q: 'car', kind: 'model_3d', provider: 'poly-haven', limit: 12 },
      user: { role: 'content_authorizer' },
    });
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].asset_kind, 'model_3d');
    assert.equal(result.results[0].license.name, 'CC0-1.0');
    assert.match(result.results[0].attribution, /Example Artist/);
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
