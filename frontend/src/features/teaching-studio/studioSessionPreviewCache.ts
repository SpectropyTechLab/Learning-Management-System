import type { PublishedRelease, PublishedResourceMapping } from './api/studioPublishedApi';

type CachedSessionPreview = {
  release: PublishedRelease;
  preferredScreenId: number | null;
  createdAt: number;
};

const CACHE_TTL_MS = 30_000;
const previewCache = new Map<number, CachedSessionPreview>();
const previewRequestCache = new Map<number, Promise<PublishedRelease>>();
const previewPreferenceCache = new Map<number, number | null>();
const resourceUrlCache = new Map<number, { url: string; createdAt: number }>();
const preparationCache = new Map<number, Promise<void>>();
const PREPARATION_CONCURRENCY = 3;

export const cacheSessionPreview = (
  sessionId: number,
  release: PublishedRelease,
  preferredScreenId: number | null,
) => previewCache.set(sessionId, { release, preferredScreenId, createdAt: Date.now() });

export const getCachedSessionPreview = (sessionId: number) => {
  const cached = previewCache.get(sessionId);
  if (!cached) return null;
  if (Date.now() - cached.createdAt <= CACHE_TTL_MS) return cached;
  previewCache.delete(sessionId);
  return null;
};

export const clearCachedSessionPreview = (sessionId: number) => {
  previewCache.delete(sessionId);
  previewPreferenceCache.delete(sessionId);
};

export const getPreferredSessionPreviewScreen = (sessionId: number) => previewPreferenceCache.get(sessionId) ?? null;

export const primeSessionPreview = (
  sessionId: number,
  load: () => Promise<PublishedRelease>,
  preferredScreenId: number | null,
) => {
  previewPreferenceCache.set(sessionId, preferredScreenId);
  const existing = previewRequestCache.get(sessionId);
  if (existing) return existing;
  const request = load()
    .then((release) => {
      cacheSessionPreview(sessionId, release, preferredScreenId);
      return release;
    })
    .finally(() => previewRequestCache.delete(sessionId));
  previewRequestCache.set(sessionId, request);
  return request;
};

export const getPendingSessionPreview = (sessionId: number) => previewRequestCache.get(sessionId) ?? null;

export const getCachedResourcePreviewUrl = (versionId: number) => {
  const cached = resourceUrlCache.get(versionId);
  if (!cached) return '';
  if (Date.now() - cached.createdAt <= CACHE_TTL_MS) return cached.url;
  resourceUrlCache.delete(versionId);
  return '';
};

const warmResource = async (mapping: PublishedResourceMapping, url: string) => {
  if (mapping.resource_type === 'image' || mapping.mime_type?.startsWith('image/')) {
    await new Promise<void>((resolve) => {
      const image = new Image();
      image.onload = () => resolve();
      image.onerror = () => resolve();
      image.src = url;
      if (image.complete) resolve();
    });
    return;
  }
  if (mapping.resource_type === 'video' || mapping.resource_type === 'audio' || mapping.mime_type?.startsWith('video/') || mapping.mime_type?.startsWith('audio/')) {
    await new Promise<void>((resolve) => {
      const media = document.createElement(mapping.resource_type === 'audio' || mapping.mime_type?.startsWith('audio/') ? 'audio' : 'video');
      const finish = () => {
        media.removeAttribute('src');
        media.load();
        resolve();
      };
      media.preload = 'metadata';
      media.onloadedmetadata = finish;
      media.onerror = finish;
      media.src = url;
      media.load();
    });
    return;
  }
  const preload = document.createElement('link');
  preload.rel = 'prefetch';
  preload.href = url;
  document.head.appendChild(preload);
  window.setTimeout(() => preload.remove(), 30_000);
};

const prepareResource = (
  mapping: PublishedResourceMapping,
  resolvePreview: (mapping: PublishedResourceMapping) => Promise<{ url: string }>,
) => {
  const versionId = mapping.resource_version_id;
  const pending = preparationCache.get(versionId);
  if (pending) return pending;
  const preparation = (async () => {
    const cachedUrl = getCachedResourcePreviewUrl(versionId);
    const url = cachedUrl || (await resolvePreview(mapping)).url;
    if (!url) return;
    resourceUrlCache.set(versionId, { url, createdAt: Date.now() });
    await warmResource(mapping, url);
  })().finally(() => preparationCache.delete(versionId));
  preparationCache.set(versionId, preparation);
  return preparation;
};

export const prepareSessionPreviewCriticalScreen = async (
  release: PublishedRelease,
  screenId: number | null,
  resolvePreview: (versionId: number) => Promise<{ url: string }>,
) => {
  const screen = release.manifest.screens.find((candidate) => candidate.screen_id === screenId)
    ?? [...release.manifest.screens].sort((left, right) => left.display_order - right.display_order)[0];
  if (!screen) return;
  const images = new Map<number, PublishedResourceMapping>();
  screen.elements.forEach((element) => {
    const mapping = element.resource_mapping;
    if (!mapping || mapping.external_url || !(mapping.resource_type === 'image' || mapping.mime_type?.startsWith('image/'))) return;
    images.set(mapping.resource_version_id, mapping);
  });
  await Promise.allSettled([...images.values()].map((mapping) => prepareResource(
    mapping,
    (resource) => resolvePreview(resource.resource_version_id),
  )));
};

export const prepareSessionPreviewResources = async (
  release: PublishedRelease,
  resolvePreview: (mapping: PublishedResourceMapping) => Promise<{ url: string }>,
  preferredScreenId: number | null = null,
) => {
  const screens = [...release.manifest.screens].sort((left, right) => left.display_order - right.display_order);
  const screenOrder = new Map(screens.map((screen, index) => [screen.screen_id, index]));
  const preferredIndex = Math.max(0, screens.findIndex((screen) => screen.screen_id === preferredScreenId));
  screens.sort((left, right) => {
    const leftIndex = screenOrder.get(left.screen_id) ?? 0;
    const rightIndex = screenOrder.get(right.screen_id) ?? 0;
    return Math.abs(leftIndex - preferredIndex) - Math.abs(rightIndex - preferredIndex);
  });
  const mappings = new Map<number, PublishedResourceMapping>();
  screens.forEach((screen) => screen.elements.forEach((element) => {
    const mapping = element.resource_mapping;
    if (!mapping || mapping.external_url || mapping.resource_type === 'document' || mapping.resource_type === 'scorm') return;
    if (!mappings.has(mapping.resource_version_id)) mappings.set(mapping.resource_version_id, mapping);
  }));
  const queue = [...mappings.values()];
  let cursor = 0;
  const worker = async () => {
    while (cursor < queue.length) {
      const mapping = queue[cursor++];
      await prepareResource(mapping, resolvePreview).catch(() => undefined);
    }
  };
  await Promise.all(Array.from({ length: Math.min(PREPARATION_CONCURRENCY, queue.length) }, worker));
};

export const prepareSessionPreviewImages = (
  release: PublishedRelease,
  resolvePreview: (versionId: number) => Promise<{ url: string }>,
  preferredScreenId: number | null = null,
) => prepareSessionPreviewResources(release, (mapping) => resolvePreview(mapping.resource_version_id), preferredScreenId);
