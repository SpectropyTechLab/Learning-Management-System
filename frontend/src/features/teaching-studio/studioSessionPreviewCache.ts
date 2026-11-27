import type { PublishedRelease } from './api/studioPublishedApi';

type CachedSessionPreview = {
  release: PublishedRelease;
  preferredScreenId: number | null;
  createdAt: number;
};

const CACHE_TTL_MS = 30_000;
const previewCache = new Map<number, CachedSessionPreview>();
const resourceUrlCache = new Map<number, { url: string; createdAt: number }>();
const preparationCache = new Map<number, Promise<void>>();

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

export const clearCachedSessionPreview = (sessionId: number) => previewCache.delete(sessionId);

export const getCachedResourcePreviewUrl = (versionId: number) => {
  const cached = resourceUrlCache.get(versionId);
  if (!cached) return '';
  if (Date.now() - cached.createdAt <= CACHE_TTL_MS) return cached.url;
  resourceUrlCache.delete(versionId);
  return '';
};

export const prepareSessionPreviewImages = async (
  release: PublishedRelease,
  resolvePreview: (versionId: number) => Promise<{ url: string }>,
) => {
  const versionIds = new Set<number>();
  release.manifest.screens.forEach((screen) => screen.elements.forEach((element) => {
    const mapping = element.resource_mapping;
    if (!mapping || mapping.external_url || !(
      mapping.resource_type === 'image' ||
      mapping.resource_type === 'animation' && mapping.mime_type?.startsWith('image/')
    )) return;
    versionIds.add(mapping.resource_version_id);
  }));
  await Promise.allSettled([...versionIds].map(async (versionId) => {
    const pending = preparationCache.get(versionId);
    if (pending) return pending;
    const preparation = (async () => {
      const cachedUrl = getCachedResourcePreviewUrl(versionId);
      const url = cachedUrl || (await resolvePreview(versionId)).url;
      resourceUrlCache.set(versionId, { url, createdAt: Date.now() });
      await new Promise<void>((resolve) => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () => resolve();
        image.src = url;
        if (image.complete) resolve();
      });
    })().finally(() => preparationCache.delete(versionId));
    preparationCache.set(versionId, preparation);
    return preparation;
  }));
};
