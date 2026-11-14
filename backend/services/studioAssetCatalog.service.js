import path from 'node:path';
import { load } from 'cheerio';
import { AppError } from '../utils/errors.js';
import { createResource } from './studioResources.service.js';

const AUTHOR_ROLES = new Set(['super_admin', 'content_authorizer']);
const CATALOG_KINDS = new Set(['all', 'icon', 'illustration', 'animation', 'model_3d']);
const CATALOG_PROVIDERS = new Set([
  'all', 'bioicons', 'scidraw', 'kitbitz', 'fluent-emoji', 'noto-emoji',
  'poly-haven', 'open-peeps', 'open-doodles',
]);
const CATALOG_COMPOSITIONS = new Set(['all', 'component', 'block']);
const MAX_IMPORT_BYTES = 250 * 1024 * 1024;
const JSON_CACHE_TTL_MS = 10 * 60 * 1000;
const PROVIDER_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
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

const jsonCache = new Map();
let bioiconsCache = { expiresAt: 0, icons: [] };
const providerCache = new Map();

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

const providerCached = async (key, loader) => {
  const cached = providerCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const value = await loader();
  providerCache.set(key, { value, expiresAt: Date.now() + PROVIDER_CACHE_TTL_MS });
  return value;
};

const normalizedWords = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
const GENERAL_SEARCH_SYNONYMS = {
  car: ['automobile', 'vehicle'], automobile: ['car', 'vehicle'], vehicle: ['car', 'automobile'],
  teacher: ['educator', 'person'], student: ['learner', 'person'], people: ['person', 'human'],
  lab: ['laboratory'], laboratory: ['lab'], plant: ['tree', 'leaf'], tree: ['plant'],
  house: ['home', 'building'], home: ['house', 'building'], phone: ['mobile', 'telephone'],
};
const matchesQuery = (value, query) => {
  const haystack = normalizedWords(value);
  return normalizedWords(query).every((word) => haystack.some((part) => part === word || (word.length >= 4 && part.startsWith(word))));
};
const matchesQueryOrSynonym = (value, query) => {
  const haystack = normalizedWords(value);
  return normalizedWords(query).every((word) => [word, ...(GENERAL_SEARCH_SYNONYMS[word] || [])]
    .some((candidate) => haystack.some((part) => part === candidate || (candidate.length >= 4 && part.startsWith(candidate)))));
};
const githubRawUrl = (repo, assetPath) => `https://raw.githubusercontent.com/${repo}/main/${assetPath.split('/').map(encodeURIComponent).join('/')}`;

const getGithubTree = async (repo) => providerCached(`github:${repo}`, async () => {
  const payload = await fetchJson(`https://api.github.com/repos/${repo}/git/trees/main?recursive=1`, { cacheTtlMs: PROVIDER_CACHE_TTL_MS });
  if (payload.truncated) throw new Error(`${repo} asset index is incomplete`);
  return (Array.isArray(payload.tree) ? payload.tree : []).filter((entry) => entry?.type === 'blob').map((entry) => entry.path);
});

const kitbitzResult = (assetPath) => {
  const title = displayName(path.posix.basename(assetPath));
  const kit = assetPath.split('/')[1] || 'general';
  const encoded = Buffer.from(assetPath).toString('base64url');
  const rawUrl = githubRawUrl('CaptExcellent/kits-library-assets', assetPath);
  return {
    id: `kitbitz:${encoded}`, provider: 'kitbitz', provider_label: 'Kitbitz', provider_asset_id: encoded,
    title, asset_kind: 'illustration', format: 'SVG', resource_type: 'image', preview_url: rawUrl,
    source_url: `https://kitbitz.art/kits/${encodeURIComponent(kit)}/`, collection: displayName(kit),
    tags: normalizedWords(`${kit} ${title}`),
    license: { name: 'CC0-1.0', url: 'https://github.com/CaptExcellent/kits-library-assets/blob/main/LICENSE' },
    attribution: 'Kitbitz contributors · CC0 (credit optional)', attribution_required: false,
    composition: 'component', subject: 'general', importable: true,
  };
};

const searchKitbitz = async (query, limit) => {
  const paths = await getGithubTree('CaptExcellent/kits-library-assets');
  return paths
    .filter((assetPath) => /^kits\/(?!barbieland-kit\/).+\.svg$/i.test(assetPath) && matchesQueryOrSynonym(assetPath, query))
    .sort((left, right) => path.posix.basename(left).length - path.posix.basename(right).length || left.localeCompare(right))
    .slice(0, limit)
    .map(kitbitzResult);
};

const fluentResult = (assetPath) => {
  const title = displayName(assetPath.split('/')[1]);
  const encoded = Buffer.from(assetPath).toString('base64url');
  const rawUrl = githubRawUrl('microsoft/fluentui-emoji', assetPath);
  return {
    id: `fluent-emoji:${encoded}`, provider: 'fluent-emoji', provider_label: 'Microsoft Fluent Emoji', provider_asset_id: encoded,
    title, asset_kind: 'illustration', format: 'SVG', resource_type: 'image', preview_url: rawUrl,
    source_url: `https://github.com/microsoft/fluentui-emoji/tree/main/assets/${encodeURIComponent(assetPath.split('/')[1])}`,
    collection: 'Fluent Emoji · Color', tags: normalizedWords(title),
    license: { name: 'MIT', url: 'https://github.com/microsoft/fluentui-emoji/blob/main/LICENSE' },
    attribution: 'Microsoft Fluent Emoji · MIT', attribution_required: true,
    composition: 'component', subject: 'general', importable: true,
  };
};

const searchFluentEmoji = async (query, limit) => {
  const paths = await getGithubTree('microsoft/fluentui-emoji');
  return paths
    .filter((assetPath) => /^assets\/[^/]+\/Color\/[^/]+_color\.svg$/i.test(assetPath) && matchesQueryOrSynonym(assetPath.split('/')[1], query))
    .slice(0, limit)
    .map(fluentResult);
};

const getNotoEmoji = async () => providerCached('noto-emoji', async () => {
  const response = await fetchResponse('https://googlefonts.github.io/noto-emoji-files/data/emojis_data.js?v=20260916_v7');
  const script = await response.text();
  const match = script.match(/window\.__NOTO_EMOJIS_DATA__\s*=\s*(\[[\s\S]*\]);?\s*$/);
  if (!match) throw new Error('Noto Emoji metadata format changed');
  return JSON.parse(match[1]);
});

const notoResult = (emoji) => {
  const codepoint = cleanText(emoji.rgi || emoji.codepoint, 80).toLowerCase();
  const title = cleanText(emoji.cldrName || emoji.name || displayName(codepoint), 250);
  const previewUrl = `https://fonts.gstatic.com/s/e/notoemoji/latest/${encodeURIComponent(codepoint)}/512.webp`;
  return {
    id: `noto-emoji:${codepoint}`, provider: 'noto-emoji', provider_label: 'Google Animated Noto Emoji', provider_asset_id: codepoint,
    title, asset_kind: 'animation', format: 'GIF', resource_type: 'animation', preview_url: previewUrl,
    source_url: `https://googlefonts.github.io/noto-emoji-files/?q=${encodeURIComponent(title)}`,
    collection: cleanText(emoji.category || 'Noto Emoji', 120),
    tags: normalizedWords([title, emoji.name, emoji.shortcode, emoji.category, emoji.subgroup].join(' ')),
    license: { name: 'CC-BY-4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
    attribution: 'Google Noto Emoji · CC-BY-4.0', attribution_required: true,
    composition: 'component', subject: 'general', importable: true,
  };
};

const searchNotoEmoji = async (query, limit) => {
  const emojis = await getNotoEmoji();
  return emojis.filter((emoji) => emoji.hasGfontsAnim && matchesQueryOrSynonym(
    [emoji.cldrName, emoji.name, emoji.shortcode, emoji.category, emoji.subgroup].join(' '), query,
  )).slice(0, limit).map(notoResult);
};

const polyHavenResult = (assetId, asset) => ({
  id: `poly-haven:${assetId}`, provider: 'poly-haven', provider_label: 'Poly Haven', provider_asset_id: assetId,
  title: cleanText(asset.name || displayName(assetId), 250), asset_kind: 'model_3d', format: 'GLTF', resource_type: 'model_3d',
  preview_url: cleanText(asset.thumbnail_url, 2000), source_url: `https://polyhaven.com/a/${encodeURIComponent(assetId)}`,
  collection: cleanText(asset.category || asset.categories?.join(' · ') || 'Poly Haven 3D Models', 180),
  tags: normalizedWords([asset.name, ...(asset.tags || []), ...(asset.categories || [])].join(' ')),
  license: { name: 'CC0-1.0', url: 'https://polyhaven.com/license' },
  attribution: `Poly Haven${Object.keys(asset.authors || {}).length ? ` · ${Object.keys(asset.authors).join(', ')}` : ''} · CC0`,
  attribution_required: false, composition: 'component', subject: 'general', importable: true,
});

const getPolyHavenModels = async () => fetchJson('https://api.polyhaven.com/assets?t=models', { cacheTtlMs: PROVIDER_CACHE_TTL_MS });
const searchPolyHaven = async (query, limit) => {
  const models = await getPolyHavenModels();
  return Object.entries(models).filter(([assetId, asset]) => matchesQueryOrSynonym(
    [assetId, asset.name, ...(asset.tags || []), ...(asset.categories || [])].join(' '), query,
  )).slice(0, limit).map(([assetId, asset]) => polyHavenResult(assetId, asset));
};

const getOpenPeeps = async () => providerCached('open-peeps', async () => {
  const response = await fetchResponse('https://www.openpeeps.com/');
  const $ = load(await response.text());
  const results = new Map();
  $('a[href$=".svg"]').each((_, link) => {
    const url = String($(link).attr('href') || '');
    const file = path.posix.basename(new URL(url).pathname);
    const peepNumber = file.match(/peep-(\d+)\.svg$/i)?.[1];
    if (peepNumber) results.set(peepNumber, { file, url, peepNumber });
  });
  return [...results.values()];
});

const searchOpenPeeps = async (query, limit) => {
  if (!matchesQuery('person people human teacher student presenter character avatar standing sitting classroom', query)) return [];
  const peeps = await getOpenPeeps();
  return peeps.slice(0, limit).map(({ url, peepNumber }) => {
    const encoded = Buffer.from(url).toString('base64url');
    return {
      id: `open-peeps:${encoded}`, provider: 'open-peeps', provider_label: 'Open Peeps', provider_asset_id: encoded,
      title: `Open Peep ${peepNumber}`, asset_kind: 'illustration', format: 'SVG', resource_type: 'image',
      preview_url: url, source_url: 'https://www.openpeeps.com/', collection: 'Open Peeps · Ready-made people',
      tags: ['person', 'people', 'human', 'teacher', 'student', 'character'],
      license: { name: 'CC0-1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/' },
      attribution: 'Open Peeps by Pablo Stanley · CC0 (credit optional)', attribution_required: false,
      composition: 'component', subject: 'general', importable: true,
    };
  });
};

const getOpenDoodles = async () => providerCached('open-doodles', async () => {
  const response = await fetchResponse('https://www.opendoodles.com/');
  const $ = load(await response.text());
  const results = new Map();
  $('a[href*="opendoodles.s3-"]').each((_, link) => {
    const url = String($(link).attr('href') || '');
    if (!/\.(svg|gif)$/i.test(url)) return;
    const slug = path.posix.basename(new URL(url).pathname).replace(/\.[^.]+$/, '');
    const extension = path.posix.extname(new URL(url).pathname).slice(1).toLowerCase();
    const entry = results.get(slug) || { slug, files: {} };
    entry.files[extension] = url;
    results.set(slug, entry);
  });
  $('img[src$=".gif"]').each((_, image) => {
    const url = String($(image).attr('src') || '');
    if (new URL(url).hostname.toLowerCase() !== 'cdn.prod.website-files.com') return;
    const slug = path.posix.basename(new URL(url).pathname).replace(/^[a-f0-9]+_/i, '').replace(/\.[^.]+$/, '');
    const entry = results.get(slug) || { slug, files: {} };
    entry.files.gif = url;
    results.set(slug, entry);
  });
  return [...results.values()];
});

const searchOpenDoodles = async (query, kind, limit) => {
  const doodles = await getOpenDoodles();
  return doodles.filter((item) => matchesQuery(item.slug, query)).slice(0, limit).flatMap((item) => {
    const animated = kind === 'animation' && item.files.gif;
    const url = animated ? item.files.gif : item.files.svg;
    if (!url) return [];
    const encoded = Buffer.from(url).toString('base64url');
    return [{
      id: `open-doodles:${encoded}`, provider: 'open-doodles', provider_label: 'Open Doodles', provider_asset_id: encoded,
      title: displayName(item.slug), asset_kind: animated ? 'animation' : 'illustration', format: animated ? 'GIF' : 'SVG',
      resource_type: animated ? 'animation' : 'image', preview_url: url, source_url: 'https://www.opendoodles.com/',
      collection: 'Open Doodles', tags: normalizedWords(item.slug),
      license: { name: 'CC0-1.0', url: 'https://www.opendoodles.com/about' },
      attribution: 'Open Doodles by Pablo Stanley · CC0 (credit optional)', attribution_required: false,
      composition: 'block', subject: 'general', importable: true,
    }];
  });
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
  const perGroup = Math.max(8, Math.ceil(limit / (kind === 'all' ? 6 : 3)));
  if (include('bioicons') && ['all', 'illustration'].includes(kind)) {
    jobs.push(settleProvider('bioicons', searchBioicons(search, perGroup * 3)));
  }
  if (include('scidraw') && ['all', 'illustration'].includes(kind)) {
    jobs.push(settleProvider('scidraw', searchScidraw(search, perGroup * 2)));
  }
  if (include('kitbitz') && ['all', 'icon', 'illustration'].includes(kind)) {
    jobs.push(settleProvider('kitbitz', searchKitbitz(search, perGroup * 2)));
  }
  if (include('fluent-emoji') && ['all', 'icon', 'illustration'].includes(kind)) {
    jobs.push(settleProvider('fluent-emoji', searchFluentEmoji(search, perGroup * 2)));
  }
  if (include('noto-emoji') && ['all', 'animation'].includes(kind)) {
    jobs.push(settleProvider('noto-emoji', searchNotoEmoji(search, perGroup * 2)));
  }
  if (include('poly-haven') && ['all', 'model_3d'].includes(kind)) {
    jobs.push(settleProvider('poly-haven', searchPolyHaven(search, perGroup * 2)));
  }
  if (include('open-peeps') && ['all', 'illustration'].includes(kind)) {
    jobs.push(settleProvider('open-peeps', searchOpenPeeps(search, perGroup)));
  }
  if (include('open-doodles') && ['all', 'illustration', 'animation'].includes(kind)) {
    const doodleKind = kind === 'animation' ? 'animation' : 'illustration';
    jobs.push(settleProvider('open-doodles', searchOpenDoodles(search, doodleKind, perGroup)));
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
      { id: 'kitbitz', label: 'Kitbitz', enabled: true, kinds: ['icon', 'illustration'], licence_policy: 'CC0-1.0' },
      { id: 'fluent-emoji', label: 'Microsoft Fluent Emoji', enabled: true, kinds: ['icon', 'illustration'], licence_policy: 'MIT' },
      { id: 'noto-emoji', label: 'Google Animated Noto Emoji', enabled: true, kinds: ['animation'], licence_policy: 'CC-BY-4.0' },
      { id: 'poly-haven', label: 'Poly Haven', enabled: true, kinds: ['model_3d'], licence_policy: 'CC0-1.0' },
      { id: 'open-peeps', label: 'Open Peeps', enabled: true, kinds: ['illustration'], licence_policy: 'CC0-1.0' },
      { id: 'open-doodles', label: 'Open Doodles', enabled: true, kinds: ['illustration', 'animation'], licence_policy: 'CC0-1.0' },
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

const importSvgResult = async ({ result, url, fileName, body, user, allowedHosts }) => {
  const { buffer: downloadedBuffer } = await fetchFile(url, allowedHosts);
  const buffer = sanitizeSvg(downloadedBuffer);
  return createResource({
    user,
    file: { buffer, originalname: fileName, mimetype: 'image/svg+xml' },
    body: {
      name: cleanText(body.title || result.title, 250),
      description: `Reusable ${result.composition} from ${result.provider_label}. ${result.attribution}.`,
      resource_type: 'image',
      metadata_json: catalogMetadata(result),
    },
  });
};

const decodeCatalogUrl = (assetId, message) => {
  let url;
  try { url = Buffer.from(assetId, 'base64url').toString('utf8'); } catch { throw new AppError(message); }
  try { return new URL(url); } catch { throw new AppError(message); }
};

const importKitbitz = async ({ assetId, body, user }) => {
  let assetPath;
  try { assetPath = Buffer.from(assetId, 'base64url').toString('utf8'); } catch { throw new AppError('Invalid Kitbitz asset identifier'); }
  const paths = await getGithubTree('CaptExcellent/kits-library-assets');
  if (!/^kits\/(?!barbieland-kit\/).+\.svg$/i.test(assetPath) || !paths.includes(assetPath)) {
    throw new AppError('Kitbitz asset not found', 404);
  }
  const result = kitbitzResult(assetPath);
  return importSvgResult({
    result, url: githubRawUrl('CaptExcellent/kits-library-assets', assetPath),
    fileName: path.posix.basename(assetPath), body, user, allowedHosts: new Set(['raw.githubusercontent.com']),
  });
};

const importFluentEmoji = async ({ assetId, body, user }) => {
  let assetPath;
  try { assetPath = Buffer.from(assetId, 'base64url').toString('utf8'); } catch { throw new AppError('Invalid Fluent Emoji asset identifier'); }
  const paths = await getGithubTree('microsoft/fluentui-emoji');
  if (!/^assets\/[^/]+\/Color\/[^/]+_color\.svg$/i.test(assetPath) || !paths.includes(assetPath)) {
    throw new AppError('Fluent Emoji asset not found', 404);
  }
  const result = fluentResult(assetPath);
  return importSvgResult({
    result, url: githubRawUrl('microsoft/fluentui-emoji', assetPath), fileName: path.posix.basename(assetPath),
    body, user, allowedHosts: new Set(['raw.githubusercontent.com']),
  });
};

const importNotoEmoji = async ({ assetId, body, user }) => {
  if (!/^[a-f0-9-]+$/i.test(assetId)) throw new AppError('Invalid Noto Emoji identifier');
  const emojis = await getNotoEmoji();
  const emoji = emojis.find((candidate) => String(candidate.rgi || candidate.codepoint).toLowerCase() === assetId.toLowerCase() && candidate.hasGfontsAnim);
  if (!emoji) throw new AppError('Noto Emoji animation not found', 404);
  const result = notoResult(emoji);
  const url = `https://fonts.gstatic.com/s/e/notoemoji/latest/${encodeURIComponent(assetId.toLowerCase())}/512.gif`;
  const { buffer } = await fetchFile(url, new Set(['fonts.gstatic.com']));
  return createResource({
    user,
    file: { buffer, originalname: `noto-${assetId.toLowerCase()}.gif`, mimetype: 'image/gif' },
    body: {
      name: cleanText(body.title || result.title, 250),
      description: `Reusable animated component from Google Noto Emoji. ${result.attribution}.`,
      resource_type: 'animation', metadata_json: catalogMetadata(result),
    },
  });
};

const importPolyHaven = async ({ assetId, body, user }) => {
  if (!/^[a-z0-9_-]+$/i.test(assetId)) throw new AppError('Invalid Poly Haven asset identifier');
  const models = await getPolyHavenModels();
  const model = models[assetId];
  if (!model) throw new AppError('Poly Haven model not found', 404);
  const files = await fetchJson(`https://api.polyhaven.com/files/${encodeURIComponent(assetId)}`);
  const gltf = files?.gltf?.['1k']?.gltf || files?.gltf?.['2k']?.gltf || files?.gltf?.['4k']?.gltf;
  const modelUrl = cleanText(gltf?.url, 2000);
  if (!modelUrl || new URL(modelUrl).hostname.toLowerCase() !== 'dl.polyhaven.org') {
    throw new AppError('This Poly Haven model has no compatible web format', 422);
  }
  const result = polyHavenResult(assetId, model);
  return createResource({
    user,
    body: {
      name: cleanText(body.title || result.title, 250),
      description: `Reusable 3D model from Poly Haven. ${result.attribution}.`,
      resource_type: 'model_3d', external_url: modelUrl, metadata_json: catalogMetadata(result),
    },
  });
};

const importOpenPeeps = async ({ assetId, body, user }) => {
  const parsed = decodeCatalogUrl(assetId, 'Invalid Open Peeps asset identifier');
  if (parsed.hostname.toLowerCase() !== 'cdn.prod.website-files.com' || !/peep-\d+\.svg$/i.test(parsed.pathname)) {
    throw new AppError('Invalid Open Peeps asset identifier');
  }
  const peeps = await getOpenPeeps();
  if (!peeps.some((item) => item.url === parsed.toString())) throw new AppError('Open Peeps asset not found', 404);
  const file = path.posix.basename(parsed.pathname);
  const result = (await searchOpenPeeps('person', peeps.length)).find((item) => item.provider_asset_id === assetId);
  if (!result) throw new AppError('Open Peeps asset not found', 404);
  return importSvgResult({ result, url: parsed.toString(), fileName: file, body, user, allowedHosts: new Set(['cdn.prod.website-files.com']) });
};

const importOpenDoodles = async ({ assetId, body, user }) => {
  const parsed = decodeCatalogUrl(assetId, 'Invalid Open Doodles asset identifier');
  const allowedHosts = new Set(['opendoodles.s3-us-west-1.amazonaws.com', 'cdn.prod.website-files.com']);
  if (!allowedHosts.has(parsed.hostname.toLowerCase()) || !/\.(svg|gif)$/i.test(parsed.pathname)) {
    throw new AppError('Invalid Open Doodles asset identifier');
  }
  const doodles = await getOpenDoodles();
  if (!doodles.some((item) => Object.values(item.files).includes(parsed.toString()))) throw new AppError('Open Doodles asset not found', 404);
  const isGif = parsed.pathname.toLowerCase().endsWith('.gif');
  const slug = path.posix.basename(parsed.pathname).replace(/\.[^.]+$/, '');
  const result = (await searchOpenDoodles(slug, isGif ? 'animation' : 'illustration', doodles.length))
    .find((item) => item.provider_asset_id === assetId);
  if (!result) throw new AppError('Open Doodles asset not found', 404);
  if (!isGif) return importSvgResult({
    result, url: parsed.toString(), fileName: path.posix.basename(parsed.pathname), body, user,
    allowedHosts,
  });
  const { buffer } = await fetchFile(parsed.toString(), allowedHosts);
  return createResource({
    user,
    file: { buffer, originalname: path.posix.basename(parsed.pathname), mimetype: 'image/gif' },
    body: {
      name: cleanText(body.title || result.title, 250), description: `Reusable animation from Open Doodles. ${result.attribution}.`,
      resource_type: 'animation', metadata_json: catalogMetadata(result),
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
  if (provider === 'kitbitz') return importKitbitz({ assetId, body, user });
  if (provider === 'fluent-emoji') return importFluentEmoji({ assetId, body, user });
  if (provider === 'noto-emoji') return importNotoEmoji({ assetId, body, user });
  if (provider === 'poly-haven') return importPolyHaven({ assetId, body, user });
  if (provider === 'open-peeps') return importOpenPeeps({ assetId, body, user });
  if (provider === 'open-doodles') return importOpenDoodles({ assetId, body, user });
  throw new AppError('Unsupported asset provider');
};
