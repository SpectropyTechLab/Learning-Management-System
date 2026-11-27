import type { PublishedRelease } from './api/studioPublishedApi';

type CachedSessionPreview = {
  release: PublishedRelease;
  preferredScreenId: number | null;
  createdAt: number;
};

const previewCache = new Map<number, CachedSessionPreview>();
const resourcePreviewCache = new Map<number, { url: string; createdAt: number }>();
const resourcePreparationCache = new Map<number, Promise<void>>();
const PREVIEW_CACHE_TTL_MS = 30_000;

export const cacheSessionPreview = (
  sessionId: number,
  release: PublishedRelease,
  preferredScreenId: number | null,
) => {
  previewCache.set(sessionId, { release, preferredScreenId, createdAt: Date.now() });
};

export const getCachedSessionPreview = (sessionId: number) => {
  const cached = previewCache.get(sessionId);
  if (!cached) return null;
  if (Date.now() - cached.createdAt > PREVIEW_CACHE_TTL_MS) {
    previewCache.delete(sessionId);
    return null;
  }
  return cached;
};

export const clearCachedSessionPreview = (sessionId: number) => {
  previewCache.delete(sessionId);
};

export const cacheResourcePreviewUrl = (versionId: number, url: string) => {
  resourcePreviewCache.set(versionId, { url, createdAt: Date.now() });
};

export const getCachedResourcePreviewUrl = (versionId: number) => {
  const cached = resourcePreviewCache.get(versionId);
  if (!cached) return '';
  if (Date.now() - cached.createdAt > PREVIEW_CACHE_TTL_MS) {
    resourcePreviewCache.delete(versionId);
    return '';
  }
  return cached.url;
};

export const prepareSessionPreviewImages = async (
  release: PublishedRelease,
  resolvePreview: (versionId: number) => Promise<{ url: string }>,
) => {
  const versions = new Map<number, string>();
  release.manifest.screens.forEach((screen) => screen.elements.forEach((element) => {
    const mapping = element.resource_mapping;
    if (!mapping || mapping.external_url || !(
      mapping.resource_type === 'image' ||
      mapping.resource_type === 'animation' && mapping.mime_type?.startsWith('image/')
    )) return;
    versions.set(mapping.resource_version_id, getCachedResourcePreviewUrl(mapping.resource_version_id));
  }));
  await Promise.allSettled([...versions].map(async ([versionId, cachedUrl]) => {
    const existing = resourcePreparationCache.get(versionId);
    if (existing) return existing;
    const preparation = (async () => {
      const url = cachedUrl || (await resolvePreview(versionId)).url;
      cacheResourcePreviewUrl(versionId, url);
      await new Promise<void>((resolve) => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () => resolve();
        image.src = url;
        if (image.complete) resolve();
      });
    })().finally(() => resourcePreparationCache.delete(versionId));
    resourcePreparationCache.set(versionId, preparation);
    return preparation;
  }));
};
