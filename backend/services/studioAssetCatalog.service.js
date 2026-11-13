import path from 'node:path';
import { load } from 'cheerio';
import { AppError } from '../utils/errors.js';
import { createResource } from './studioResources.service.js';

const AUTHOR_ROLES = new Set(['super_admin', 'content_authorizer']);
const CATALOG_KINDS = new Set(['all', 'icon', 'illustration', 'animation', 'model_3d']);
const CATALOG_PROVIDERS = new Set(['all', 'bioicons', 'scidraw', 'iconify', 'kenney', 'smithsonian']);
const CATALOG_COMPOSITIONS = new Set(['all', 'component', 'block']);
const MAX_IMPORT_BYTES = 250 * 1024 * 1024;
const JSON_CACHE_TTL_MS = 10 * 60 * 1000;
const KENNEY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const BIOICONS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// Share-alike, non-commercial, no-derivatives and unknown licences are intentionally
// excluded. This list is the legal gate for every Bioicons result and import.
const BIOICONS_LICENSES = {
  'cc-0': { name: 'CC0-1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/', attributionRequired: false },
  'cc-by-3.0': { name: 'CC-BY-3.0', url: 'https://creativecommons.org/licenses/by/3.0/', attributionRequired: true },
  'cc-by-4.0': { name: 'CC-BY-4.0', url: 'https://creativecommons.org/licenses/by/4.0/', attributionRequired: true },
  mit: { name: 'MIT', url: 'https://opensource.org/license/mit', attributionRequired: true },
  bsd: { name: 'BSD', url: 'https://opensource.org/licenses/BSD-3-Clause', attributionRequired: true },
};

const ICONIFY_GROUPS = {
  icon: ['mdi', 'tabler', 'lucide', 'ph', 'material-symbols', 'mingcute'],
  illustration: ['noto'],
  animation: ['line-md'],
};

const ICONIFY_COLLECTIONS = {
  mdi: { name: 'Material Design Icons', author: 'Pictogrammers', license: 'Apache-2.0', license_url: 'https://github.com/Templarian/MaterialDesign/blob/master/LICENSE' },
  tabler: { name: 'Tabler Icons', author: 'Paweł Kuna', license: 'MIT', license_url: 'https://github.com/tabler/tabler-icons/blob/master/LICENSE' },
  lucide: { name: 'Lucide', author: 'Lucide Contributors', license: 'ISC', license_url: 'https://github.com/lucide-icons/lucide/blob/main/LICENSE' },
  ph: { name: 'Phosphor Icons', author: 'Phosphor Icons', license: 'MIT', license_url: 'https://github.com/phosphor-icons/core/blob/main/LICENSE' },
  'material-symbols': { name: 'Material Symbols', author: 'Google', license: 'Apache-2.0', license_url: 'https://github.com/google/material-design-icons/blob/master/LICENSE' },
  mingcute: { name: 'MingCute', author: 'MingCute Design', license: 'Apache-2.0', license_url: 'https://github.com/Richard9394/MingCute/blob/main/LICENSE' },
  noto: { name: 'Noto Emoji', author: 'Google', license: 'Apache-2.0', license_url: 'https://github.com/googlefonts/noto-emoji/blob/main/svg/LICENSE' },
  'line-md': { name: 'Material Line Icons', author: 'Vjacheslav Trushkin', license: 'MIT', license_url: 'https://github.com/cyberalien/line-md/blob/main/license.txt' },
};

const jsonCache = new Map();
let kenneyTreeCache = { expiresAt: 0, paths: [] };
let bioiconsCache = { expiresAt: 0, icons: [] };

const assertAuthor = (user) => {
  if (!AUTHOR_ROLES.has(user?.role)) throw new AppError('Only Content Authorizers can use the Asset Catalog', 403);
};

const cleanText = (value, maxLength = 160) => String(value ?? '').trim().slice(0, maxLength);
const displayName = (value) => String(value || 'Asset')
  .replace(/\.[^.]+$/, '')
  .replace(/[-_]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const fetchResponse = async (url, options = {}, timeoutMs = 12000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: '*/*',
        'User-Agent': 'Spectropy-Teaching-Studio/1.0',
        ...(options.headers || {}),
      },
    });
    if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
    return response;
  } finally {
    clearTimeout(timer);
  }
};

const fetchJson = async (url, { cacheTtlMs = JSON_CACHE_TTL_MS } = {}) => {
  const cached = jsonCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const response = await fetchResponse(url, { headers: { Accept: 'application/json' } });
  const value = await response.json();
  jsonCache.set(url, { value, expiresAt: Date.now() + cacheTtlMs });
  return value;
};

const fetchFile = async (url, expectedHosts) => {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !expectedHosts.has(parsed.hostname.toLowerCase())) {
    throw new AppError('The selected catalog asset has an unsupported source', 400);
  }
  const response = await fetchResponse(parsed.toString(), {}, 30000);
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > MAX_IMPORT_BYTES) throw new AppError('The selected asset exceeds the 250 MB import limit', 400);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new AppError('The selected asset is empty', 502);
  if (buffer.length > MAX_IMPORT_BYTES) throw new AppError('The selected asset exceeds the 250 MB import limit', 400);
  return { buffer, contentType: response.headers.get('content-type') || 'application/octet-stream' };
};

const sanitizeSvg = (buffer) => {
  const $ = load(buffer.toString('utf8'), { xmlMode: true });
  $('script, foreignObject, iframe, object, embed').remove();
  $('*').each((_, node) => {
    const attributes = { ...(node.attribs || {}) };
    for (const [name, value] of Object.entries(attributes)) {
      const normalizedName = name.toLowerCase();
      const normalizedValue = String(value || '').trim().toLowerCase();
      if (normalizedName.startsWith('on')) $(node).removeAttr(name);
      if ((normalizedName === 'href' || normalizedName === 'xlink:href')
        && normalizedValue && !normalizedValue.startsWith('#')) $(node).removeAttr(name);
      if ((normalizedName === 'style' || normalizedName === 'fill' || normalizedName === 'stroke')
        && /url\s*\(\s*['\"]?(?!#)/i.test(String(value))) $(node).removeAttr(name);
    }
  });
  const svg = $('svg').first();
  if (!svg.length) throw new AppError('The selected SVG is invalid', 422);
  return Buffer.from($.xml(svg));
};

const iconifyResult = (identifier, kind) => {
  const [prefix, ...nameParts] = identifier.split(':');
  const name = nameParts.join(':');
  const collection = ICONIFY_COLLECTIONS[prefix];
  if (!collection || !name) return null;
  const svgUrl = `https://api.iconify.design/${encodeURIComponent(prefix)}/${encodeURIComponent(name)}.svg`;
  return {
    id: `iconify:${identifier}`,
    provider: 'iconify',
    provider_label: 'Iconify',
    provider_asset_id: identifier,
    title: displayName(name),
    asset_kind: kind,
    format: 'SVG',
    resource_type: kind === 'animation' ? 'animation' : 'image',
    preview_url: svgUrl,
    source_url: `https://icon-sets.iconify.design/${encodeURIComponent(prefix)}/${encodeURIComponent(name)}/`,
    collection: collection.name,
    tags: [kind, prefix, ...name.split('-')],
    license: { name: collection.license, url: collection.license_url },
    attribution: `${collection.author} · ${collection.license}`,
    composition: 'component',
    subject: 'general',
    importable: true,
  };
};

const bioiconsPath = (icon) => {
  const authorDirectory = String(icon.author || '').replace(/\s+/g, '_');
  return `static/icons/${icon.license}/${icon.category}/${authorDirectory}/${icon.name}.svg`;
};

const getBioicons = async () => {
  if (bioiconsCache.expiresAt > Date.now() && bioiconsCache.icons.length) return bioiconsCache.icons;
  const payload = await fetchJson(
    'https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons/icons.json',
    { cacheTtlMs: BIOICONS_CACHE_TTL_MS },
  );
  const icons = (Array.isArray(payload) ? payload : []).filter((icon) => (
    icon?.name && icon?.category && icon?.author && BIOICONS_LICENSES[String(icon.license || '').toLowerCase()]
  ));
  bioiconsCache = { icons, expiresAt: Date.now() + BIOICONS_CACHE_TTL_MS };
  return icons;
};

const SEARCH_SYNONYMS = {
  heart: ['cardiac', 'cardiovascular'],
  brain: ['neuron', 'neural', 'nervous'],
  plant: ['leaf', 'root', 'flower', 'botany'],
  cell: ['cellular', 'membrane', 'organelle'],
  laboratory: ['lab', 'apparatus', 'equipment'],
  microscope: ['microscopy', 'imaging'],
  dna: ['genetics', 'genomics', 'nucleic'],
  chemistry: ['chemical', 'molecule', 'laboratory'],
};

const searchTerms = (query) => {
  const base = query.toLowerCase().split(/\s+/).filter(Boolean);
  return [...new Set(base.flatMap((word) => [word, ...(SEARCH_SYNONYMS[word] || [])]))];
};

const bioiconsResult = (icon) => {
  const license = BIOICONS_LICENSES[String(icon.license).toLowerCase()];
  const assetPath = bioiconsPath(icon);
  const encodedPath = assetPath.split('/').map(encodeURIComponent).join('/');
  const rawUrl = `https://raw.githubusercontent.com/duerrsimon/bioicons/main/${encodedPath}`;
  const sourceLabel = /servier/i.test(icon.author) ? 'Servier Medical Art via Bioicons' : 'Bioicons';
  const assetId = Buffer.from(JSON.stringify({ name: icon.name, category: icon.category, license: icon.license, author: icon.author })).toString('base64url');
  return {
    id: `bioicons:${assetId}`,
    provider: 'bioicons',
    provider_label: sourceLabel,
    provider_asset_id: assetId,
    title: displayName(icon.name),
    asset_kind: 'illustration',
    format: 'SVG',
    resource_type: 'image',
    preview_url: rawUrl,
    source_url: `https://github.com/duerrsimon/bioicons/blob/main/${encodedPath}`,
    collection: displayName(icon.category),
    tags: [icon.category, icon.author, icon.name].join(' ').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean),
    license: { name: license.name, url: license.url },
    attribution: `${displayName(icon.name)} by ${icon.author} · ${license.name}`,
    attribution_required: license.attributionRequired,
    composition: 'component',
    subject: /chem/i.test(icon.category) ? 'chemistry' : 'biology',
    importable: true,
  };
};

const searchBioicons = async (query, limit) => {
  const icons = await getBioicons();
  const terms = searchTerms(query);
  const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return icons
    .map((icon) => {
      const name = String(icon.name).toLowerCase().replace(/[^a-z0-9]+/g, ' ');
      const category = String(icon.category).toLowerCase().replace(/[^a-z0-9]+/g, ' ');
      const haystack = `${name} ${category} ${String(icon.author).toLowerCase()}`;
      const exactScore = name === normalizedQuery ? 40 : name.startsWith(`${normalizedQuery} `) ? 20 : 0;
      const score = exactScore + terms.reduce((total, term) => total + (name.includes(term) ? 8 : category.includes(term) ? 4 : haystack.includes(term) ? 1 : 0), 0);
      return { icon, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.icon.name.localeCompare(right.icon.name))
    .slice(0, limit)
    .map(({ icon }) => bioiconsResult(icon));
};

const scidrawResult = (drawing) => {
  if (!drawing?.slug || !drawing?.image_url || drawing.license !== 'cc-by') return null;
  const imageUrl = String(drawing.image_url).replace(/^http:/i, 'https:');
  const vector = drawing.is_vector === true || drawing.image_type === 'svg';
  const author = cleanText(drawing.primary_author?.full_name || 'SciDraw contributor', 120);
  return {
    id: `scidraw:${drawing.slug}`,
    provider: 'scidraw',
    provider_label: 'SciDraw',
    provider_asset_id: drawing.slug,
    title: cleanText(drawing.name || displayName(drawing.slug), 250),
    asset_kind: 'illustration',
    format: vector ? 'SVG' : String(drawing.image_type || 'PNG').toUpperCase(),
    resource_type: 'image',
    preview_url: imageUrl,
    source_url: `https://scidraw.io/drawing/${encodeURIComponent(drawing.slug)}`,
    collection: displayName(drawing.category_name || 'Scientific illustrations'),
    tags: [drawing.name, drawing.category_name, author].join(' ').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean),
    license: { name: 'CC-BY-4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
    attribution: `${cleanText(drawing.name || 'Scientific illustration', 250)} by ${author}, SciDraw · CC-BY-4.0${drawing.doi ? ` · DOI ${drawing.doi}` : ''}`,
    attribution_required: true,
    composition: vector ? 'component' : 'block',
    subject: 'science',
    importable: true,
  };
};

const searchScidraw = async (query, limit) => {
  const params = new URLSearchParams({ search: query, limit: String(Math.min(Math.max(limit, 8), 48)) });
  const payload = await fetchJson(`https://scidraw.io/api/v1/drawings/?${params.toString()}`);
  return (Array.isArray(payload.results) ? payload.results : [])
    .map(scidrawResult)
    .filter(Boolean)
    .slice(0, limit);
};

const searchIconify = async (query, kind, limit) => {
  const prefixes = ICONIFY_GROUPS[kind];
  if (!prefixes?.length) return [];
  const params = new URLSearchParams({ query, prefixes: prefixes.join(','), limit: String(Math.max(32, limit)) });
  const payload = await fetchJson(`https://api.iconify.design/search?${params.toString()}`);
  return (Array.isArray(payload.icons) ? payload.icons : [])
    .map((identifier) => iconifyResult(identifier, kind))
    .filter(Boolean)
    .slice(0, limit);
};

const getKenneyPaths = async () => {
  if (kenneyTreeCache.expiresAt > Date.now() && kenneyTreeCache.paths.length) return kenneyTreeCache.paths;
  const payload = await fetchJson(
    'https://api.github.com/repos/shorepine/kenney/git/trees/main?recursive=1',
    { cacheTtlMs: KENNEY_CACHE_TTL_MS },
  );
  const paths = (Array.isArray(payload.tree) ? payload.tree : [])
    .filter((entry) => entry?.type === 'blob' && /^(2d|3d)\//i.test(entry.path) && /\.(png|svg|glb)$/i.test(entry.path))
    .map((entry) => entry.path);
  kenneyTreeCache = { paths, expiresAt: Date.now() + KENNEY_CACHE_TTL_MS };
  return paths;
};

const matchesAssetWords = (assetPath, query) => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const normalized = assetPath.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return words.every((word) => normalized.split(' ').some((part) => part === word || part.startsWith(word)));
};

const kenneyResult = (assetPath) => {
  const isModel = assetPath.toLowerCase().endsWith('.glb');
  const encodedPath = assetPath.split('/').map(encodeURIComponent).join('/');
  const rawUrl = `https://raw.githubusercontent.com/shorepine/kenney/main/${encodedPath}`;
  const fileName = path.posix.basename(assetPath);
  const pack = assetPath.split('/').slice(1, -1)[0] || (isModel ? '3D Assets' : '2D Assets');
  return {
    id: `kenney:${Buffer.from(assetPath).toString('base64url')}`,
    provider: 'kenney',
    provider_label: 'Kenney CC0',
    provider_asset_id: Buffer.from(assetPath).toString('base64url'),
    title: displayName(fileName),
    asset_kind: isModel ? 'model_3d' : 'illustration',
    format: isModel ? 'GLB' : path.posix.extname(fileName).slice(1).toUpperCase(),
    resource_type: isModel ? 'model_3d' : 'image',
    preview_url: isModel ? '' : rawUrl,
    source_url: `https://github.com/shorepine/kenney/blob/main/${encodedPath}`,
    collection: displayName(pack),
    tags: assetPath.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean),
    license: { name: 'CC0-1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/' },
    attribution: 'Kenney · CC0 (credit optional)',
    composition: 'component',
    subject: 'general',
    importable: true,
  };
};

const searchKenney = async (query, kind, limit) => {
  if (!['all', 'illustration', 'model_3d'].includes(kind)) return [];
  const paths = await getKenneyPaths();
  const filtered = paths.filter((assetPath) => {
    const isModel = assetPath.toLowerCase().endsWith('.glb');
    if (kind === 'illustration' && isModel) return false;
    if (kind === 'model_3d' && !isModel) return false;
    return matchesAssetWords(assetPath, query);
  });
  const directNameMatches = filtered.filter((assetPath) => matchesAssetWords(path.posix.basename(assetPath), query));
  const candidates = directNameMatches.length ? directNameMatches : filtered;
  return candidates
    .sort((left, right) => path.posix.basename(left).length - path.posix.basename(right).length || left.localeCompare(right))
    .slice(0, limit)
    .map(kenneyResult);
};

const smithsonianResult = (row) => {
  const content = row?.content || {};
  const uri = String(content.uri || '');
  if (!uri || !content.model_url) return null;
  const assetId = Buffer.from(uri).toString('base64url');
  return {
    id: `smithsonian:${assetId}`,
    provider: 'smithsonian',
    provider_label: 'Smithsonian Open Access',
    provider_asset_id: assetId,
    title: cleanText(row.title || 'Smithsonian 3D Model'),
    asset_kind: 'model_3d',
    format: 'GLB',
    resource_type: 'model_3d',
    preview_url: '',
    source_url: `https://3d.si.edu/object/${encodeURIComponent(content.model_url)}`,
    collection: 'Smithsonian Open Access 3D',
    tags: ['scientific', 'museum', '3d', 'education'],
    license: { name: 'CC0-1.0', url: 'https://www.si.edu/openaccess' },
    attribution: 'Smithsonian Institution · CC0',
    composition: 'component',
    subject: 'science',
    importable: true,
  };
};

const searchSmithsonian = async (query, limit) => {
  const params = new URLSearchParams({ q: query, file_type: 'glb', rows: String(Math.max(20, limit * 3)) });
  const payload = await fetchJson(`https://3d-api.si.edu/api/v1.0/content/file/search?${params.toString()}`);
  const preferredByModel = new Map();
  const qualityScore = { Low: 4, Medium: 3, Thumb: 2, High: 1 };
  for (const row of Array.isArray(payload.rows) ? payload.rows : []) {
    const modelId = row?.content?.model_url;
    if (!modelId) continue;
    const existing = preferredByModel.get(modelId);
    if (!existing || (qualityScore[row.content.quality] || 0) > (qualityScore[existing.content.quality] || 0)) {
      preferredByModel.set(modelId, row);
    }
  }
  return [...preferredByModel.values()].map(smithsonianResult).filter(Boolean).slice(0, limit);
};

const settleProvider = async (provider, promise) => {
  try {
    return { provider, results: await promise, error: null };
  } catch (error) {
    return { provider, results: [], error: error?.message || 'Provider unavailable' };
  }
};

export const searchAssetCatalog = async ({ query = {}, user }) => {
  assertAuthor(user);
  const search = cleanText(query.q, 100);
  const kind = cleanText(query.kind || 'all', 30).toLowerCase();
  const provider = cleanText(query.provider || 'all', 30).toLowerCase();
  const composition = cleanText(query.composition || 'component', 30).toLowerCase();
  const requestedLimit = Number(query.limit || 60);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 12), 96) : 60;
  if (search.length < 2) throw new AppError('Search for at least two characters');
  if (!CATALOG_KINDS.has(kind)) throw new AppError('Unsupported asset kind');
  if (!CATALOG_PROVIDERS.has(provider)) throw new AppError('Unsupported asset provider');
  if (!CATALOG_COMPOSITIONS.has(composition)) throw new AppError('Unsupported asset composition');

  const jobs = [];
  const include = (candidate) => provider === 'all' || provider === candidate;
  const perGroup = Math.max(8, Math.ceil(limit / (kind === 'all' ? 4 : 2)));
  if (include('bioicons') && ['all', 'illustration'].includes(kind)) {
    jobs.push(settleProvider('bioicons', searchBioicons(search, perGroup * 3)));
  }
  if (include('scidraw') && ['all', 'illustration'].includes(kind)) {
    jobs.push(settleProvider('scidraw', searchScidraw(search, perGroup * 2)));
  }
  if (include('iconify')) {
    for (const iconKind of Object.keys(ICONIFY_GROUPS)) {
      if (kind === 'all' || kind === iconKind) jobs.push(settleProvider('iconify', searchIconify(search, iconKind, perGroup)));
    }
  }
  if (include('kenney') && ['all', 'illustration', 'model_3d'].includes(kind)) {
    jobs.push(settleProvider('kenney', searchKenney(search, kind, perGroup * 2)));
  }
  if (include('smithsonian') && ['all', 'model_3d'].includes(kind)) {
    jobs.push(settleProvider('smithsonian', searchSmithsonian(search, perGroup)));
  }
  const settled = await Promise.all(jobs);
  const buckets = settled.map((entry) => [...entry.results]);
  const results = [];
  while (results.length < limit && buckets.some((bucket) => bucket.length)) {
    for (const bucket of buckets) {
      const asset = bucket.shift();
      if (asset && (composition === 'all' || asset.composition === composition)) results.push(asset);
      if (results.length >= limit) break;
    }
  }
  const counts = {};
  for (const asset of results) counts[asset.asset_kind] = (counts[asset.asset_kind] || 0) + 1;
  return {
    query: search,
    kind,
    composition,
    results,
    counts,
    unavailable_providers: [...new Map(settled.filter((entry) => entry.error).map((entry) => [entry.provider, entry.error])).entries()]
      .map(([id, reason]) => ({ id, reason })),
    provider_status: [
      { id: 'bioicons', label: 'Bioicons & Servier', enabled: true, kinds: ['illustration'], licence_policy: 'Allowlisted per asset' },
      { id: 'scidraw', label: 'SciDraw', enabled: true, kinds: ['illustration'], licence_policy: 'CC-BY-4.0 items only' },
      { id: 'iconify', label: 'Iconify', enabled: true, kinds: ['icon', 'illustration', 'animation'] },
      { id: 'kenney', label: 'Kenney CC0', enabled: true, kinds: ['illustration', 'model_3d'] },
      { id: 'smithsonian', label: 'Smithsonian Open Access', enabled: true, kinds: ['model_3d'] },
    ],
  };
};

const catalogMetadata = (asset) => JSON.stringify({
  asset_catalog: {
    provider: asset.provider,
    provider_asset_id: asset.provider_asset_id,
    asset_kind: asset.asset_kind,
    source_url: asset.source_url,
    collection: asset.collection,
    license: asset.license,
    attribution: asset.attribution,
    attribution_required: asset.attribution_required !== false,
    composition: asset.composition || 'component',
    subject: asset.subject || 'general',
    imported_at: new Date().toISOString(),
  },
});

const importIconify = async ({ assetId, body, user }) => {
  if (!/^[a-z0-9-]+:[a-z0-9-]+$/i.test(assetId)) throw new AppError('Invalid Iconify asset identifier');
  const [prefix, name] = assetId.split(':');
  const collection = ICONIFY_COLLECTIONS[prefix];
  const kind = Object.entries(ICONIFY_GROUPS).find(([, prefixes]) => prefixes.includes(prefix))?.[0];
  if (!collection || !kind) throw new AppError('This Iconify collection is not approved for import');
  const sourceUrl = `https://icon-sets.iconify.design/${encodeURIComponent(prefix)}/${encodeURIComponent(name)}/`;
  const asset = {
    provider: 'iconify', provider_asset_id: assetId, asset_kind: kind, source_url: sourceUrl,
    collection: collection.name, license: { name: collection.license, url: collection.license_url },
    attribution: `${collection.author} · ${collection.license}`,
  };
  const { buffer: downloadedBuffer } = await fetchFile(
    `https://api.iconify.design/${encodeURIComponent(prefix)}/${encodeURIComponent(name)}.svg`,
    new Set(['api.iconify.design']),
  );
  const buffer = sanitizeSvg(downloadedBuffer);
  return createResource({
    user,
    file: { buffer, originalname: `${prefix}-${name}.svg`, mimetype: 'image/svg+xml' },
    body: {
      name: cleanText(body.title || displayName(name), 250),
      description: `Reusable ${displayName(kind)} from ${collection.name}. ${asset.attribution}.`,
      resource_type: kind === 'animation' ? 'animation' : 'image',
      metadata_json: catalogMetadata(asset),
    },
  });
};

const importBioicons = async ({ assetId, body, user }) => {
  let identity;
  try { identity = JSON.parse(Buffer.from(assetId, 'base64url').toString('utf8')); } catch { throw new AppError('Invalid Bioicons asset identifier'); }
  const icons = await getBioicons();
  const icon = icons.find((candidate) => candidate.name === identity.name
    && candidate.category === identity.category && candidate.license === identity.license && candidate.author === identity.author);
  if (!icon) throw new AppError('Bioicons asset not found or its licence is not approved', 404);
  const result = bioiconsResult(icon);
  const assetPath = bioiconsPath(icon);
  const rawUrl = `https://raw.githubusercontent.com/duerrsimon/bioicons/main/${assetPath.split('/').map(encodeURIComponent).join('/')}`;
  const { buffer: downloadedBuffer } = await fetchFile(rawUrl, new Set(['raw.githubusercontent.com']));
  const buffer = sanitizeSvg(downloadedBuffer);
  return createResource({
    user,
    file: { buffer, originalname: `${String(icon.name).replace(/[^a-z0-9_-]+/gi, '-')}.svg`, mimetype: 'image/svg+xml' },
    body: {
      name: cleanText(body.title || result.title, 250),
      description: `Reusable scientific SVG component from ${result.provider_label}. ${result.attribution}.`,
      resource_type: 'image',
      metadata_json: catalogMetadata(result),
    },
  });
};

const importScidraw = async ({ assetId, body, user }) => {
  if (!/^[a-z0-9-]+$/i.test(assetId)) throw new AppError('Invalid SciDraw asset identifier');
  const drawing = await fetchJson(`https://scidraw.io/api/v1/drawings/${encodeURIComponent(assetId)}/`);
  const normalized = scidrawResult({
    ...drawing,
    category_name: drawing.category?.name,
    primary_author: drawing.authors?.[0],
  });
  if (!normalized) throw new AppError('SciDraw asset not found or its licence is not approved', 404);
  const fileUrl = String(drawing.image_url || drawing.image || '').replace(/^http:/i, 'https:');
  const { buffer: downloadedBuffer, contentType } = await fetchFile(fileUrl, new Set(['scidraw.io', 'www.scidraw.io']));
  const isSvg = normalized.format === 'SVG';
  const buffer = isSvg ? sanitizeSvg(downloadedBuffer) : downloadedBuffer;
  const extension = isSvg ? 'svg' : normalized.format.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  return createResource({
    user,
    file: {
      buffer,
      originalname: `${String(drawing.slug).replace(/[^a-z0-9_-]+/gi, '-')}.${extension}`,
      mimetype: isSvg ? 'image/svg+xml' : contentType.split(';')[0] || `image/${extension}`,
    },
    body: {
      name: cleanText(body.title || normalized.title, 250),
      description: `Reusable scientific ${normalized.composition} from SciDraw. ${normalized.attribution}.`,
      resource_type: 'image',
      metadata_json: catalogMetadata(normalized),
    },
  });
};

const importKenney = async ({ assetId, body, user }) => {
  let assetPath;
  try { assetPath = Buffer.from(assetId, 'base64url').toString('utf8'); } catch { throw new AppError('Invalid Kenney asset identifier'); }
  const paths = await getKenneyPaths();
  if (!paths.includes(assetPath)) throw new AppError('Kenney asset not found', 404);
  const result = kenneyResult(assetPath);
  const rawUrl = `https://raw.githubusercontent.com/shorepine/kenney/main/${assetPath.split('/').map(encodeURIComponent).join('/')}`;
  const { buffer, contentType } = await fetchFile(rawUrl, new Set(['raw.githubusercontent.com']));
  const extension = path.posix.extname(assetPath).toLowerCase();
  const mimeType = extension === '.glb' ? 'model/gltf-binary'
    : extension === '.svg' ? 'image/svg+xml'
      : contentType.split(';')[0] || 'image/png';
  return createResource({
    user,
    file: { buffer, originalname: path.posix.basename(assetPath), mimetype: mimeType },
    body: {
      name: cleanText(body.title || result.title, 250),
      description: `Reusable ${result.asset_kind === 'model_3d' ? '3D model' : '2D asset'} from ${result.collection}. Kenney CC0.`,
      resource_type: result.resource_type,
      metadata_json: catalogMetadata(result),
    },
  });
};

const importSmithsonian = async ({ assetId, body, user }) => {
  let uri;
  try { uri = Buffer.from(assetId, 'base64url').toString('utf8'); } catch { throw new AppError('Invalid Smithsonian asset identifier'); }
  const parsed = new URL(uri);
  if (parsed.hostname.toLowerCase() !== '3d-api.si.edu' || !parsed.pathname.startsWith('/content/document/') || !parsed.pathname.toLowerCase().endsWith('.glb')) {
    throw new AppError('Invalid Smithsonian 3D asset identifier');
  }
  const { buffer } = await fetchFile(uri, new Set(['3d-api.si.edu']));
  const title = cleanText(body.title || displayName(path.posix.basename(parsed.pathname)), 250);
  const asset = {
    provider: 'smithsonian', provider_asset_id: assetId, asset_kind: 'model_3d',
    source_url: uri, collection: 'Smithsonian Open Access 3D',
    license: { name: 'CC0-1.0', url: 'https://www.si.edu/openaccess' },
    attribution: 'Smithsonian Institution · CC0',
    attribution_required: false, composition: 'component', subject: 'science',
  };
  return createResource({
    user,
    file: { buffer, originalname: `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.glb`, mimetype: 'model/gltf-binary' },
    body: {
      name: title,
      description: 'Scientific 3D model imported from Smithsonian Open Access.',
      resource_type: 'model_3d',
      metadata_json: catalogMetadata(asset),
    },
  });
};

export const importAssetCatalogItem = async ({ body = {}, user }) => {
  assertAuthor(user);
  const provider = cleanText(body.provider, 30).toLowerCase();
  const assetId = cleanText(body.provider_asset_id, 4000);
  if (!assetId) throw new AppError('provider_asset_id is required');
  if (provider === 'bioicons') return importBioicons({ assetId, body, user });
  if (provider === 'scidraw') return importScidraw({ assetId, body, user });
  if (provider === 'iconify') return importIconify({ assetId, body, user });
  if (provider === 'kenney') return importKenney({ assetId, body, user });
  if (provider === 'smithsonian') return importSmithsonian({ assetId, body, user });
  throw new AppError('Unsupported asset provider');
};
