import {
  getStudioResource,
  getStudioObjectPreview,
  getStudioResourcePreview,
} from './api/studioResourcesApi';
import type {
  StudioObjectPreviewDescriptor,
  StudioResourceDetails,
  StudioResourcePreview,
} from './api/studioResourcesApi';
import type { StudioScreen } from './types';
import {
  studioScreenCacheKey,
  studioScreenPreloadResources,
} from './studioScreenPreloadModel';

const PREVIEW_EXPIRY_SAFETY_MS = 15_000;
const DETAILS_CACHE_TTL_MS = 30_000;
const OBJECT_PREVIEW_CACHE_TTL_MS = 20_000;
const MAX_PARALLEL_PREFETCHES = 2;
const MAX_WARMED_MEDIA = 48;
const MAX_PREVIEW_ENTRIES = 96;
const MAX_DETAILS_ENTRIES = 96;
const MAX_OBJECT_PREVIEW_ENTRIES = 24;
const MAX_COMPLETED_SCREENS = 64;

interface CachedValue<T> {
  value?: T;
  expiresAt: number;
  pending?: Promise<T>;
}

type CachedPreview = CachedValue<StudioResourcePreview>;
type CachedDetails = CachedValue<StudioResourceDetails>;

export interface StudioScreenResourceCache {
  getResourceDetails: (resourceId: number, versionId: number) => Promise<StudioResourceDetails>;
  getPreview: (versionId: number) => Promise<StudioResourcePreview>;
  getObjectPreview: (versionId: number) => Promise<StudioObjectPreviewDescriptor>;
  isMediaWarmed: (versionId: number) => boolean;
  preloadScreen: (screen: StudioScreen) => Promise<void>;
}

type WarmMedia = HTMLImageElement | HTMLVideoElement;

const trimOldestEntries = <K, V>(cache: Map<K, V>, maximum: number) => {
  while (cache.size > maximum) {
    const oldestKey = cache.keys().next().value as K | undefined;
    if (oldestKey === undefined) return;
    cache.delete(oldestKey);
  }
};

const waitForImage = async (image: HTMLImageElement) => {
  if (image.complete) return image.naturalWidth > 0;
  return new Promise<boolean>((resolve) => {
    const finish = (ready: boolean) => {
      window.clearTimeout(timeout);
      image.removeEventListener('load', onLoad);
      image.removeEventListener('error', onError);
      resolve(ready);
    };
    const onLoad = () => finish(image.naturalWidth > 0);
    const onError = () => finish(false);
    const timeout = window.setTimeout(() => finish(false), 8_000);
    image.addEventListener('load', onLoad, { once: true });
    image.addEventListener('error', onError, { once: true });
  });
};

const warmImage = async (url: string) => {
  const image = new Image();
  image.decoding = 'async';
  image.fetchPriority = 'low';
  image.src = url;
  try {
    await image.decode();
    return image.naturalWidth > 0 ? image : null;
  } catch {
    if (image.complete) return image.naturalWidth > 0 ? image : null;
    return await waitForImage(image) ? image : null;
  }
};

const warmVideo = async (url: string) => {
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.src = url;
  video.load();
  const ready = await new Promise<boolean>((resolve) => {
    const finish = (loaded: boolean) => {
      window.clearTimeout(timeout);
      video.removeEventListener('loadedmetadata', onReady);
      video.removeEventListener('error', onError);
      resolve(loaded);
    };
    const onReady = () => finish(video.readyState >= HTMLMediaElement.HAVE_METADATA);
    const onError = () => finish(false);
    const timeout = window.setTimeout(() => finish(false), 8_000);
    video.addEventListener('loadedmetadata', onReady, { once: true });
    video.addEventListener('error', onError, { once: true });
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) finish(true);
  });
  return ready ? video : null;
};

export const createStudioScreenResourceCache = (): StudioScreenResourceCache => {
  const previews = new Map<number, CachedPreview>();
  const objectPreviews = new Map<number, CachedValue<StudioObjectPreviewDescriptor>>();
  const details = new Map<string, CachedDetails>();
  const warmedMedia = new Map<number, WarmMedia>();
  const screenJobs = new Map<string, Promise<void>>();
  const completedScreens = new Set<string>();

  const rememberMedia = (versionId: number, media: WarmMedia) => {
    const previous = warmedMedia.get(versionId);
    if (previous instanceof HTMLVideoElement && previous !== media) {
      previous.removeAttribute('src');
      previous.load();
    }
    warmedMedia.delete(versionId);
    warmedMedia.set(versionId, media);
    while (warmedMedia.size > MAX_WARMED_MEDIA) {
      const oldest = warmedMedia.entries().next().value as [number, WarmMedia] | undefined;
      if (!oldest) break;
      warmedMedia.delete(oldest[0]);
      if (oldest[1] instanceof HTMLVideoElement) {
        oldest[1].removeAttribute('src');
        oldest[1].load();
      }
    }
  };

  const getPreview = async (versionId: number) => {
    const now = Date.now();
    const existing = previews.get(versionId);
    if (existing?.value && existing.expiresAt > now) {
      return existing.value;
    }
    if (existing?.pending) return existing.pending;

    const entry: CachedPreview = { expiresAt: 0 };
    const pending = getStudioResourcePreview(versionId)
      .then((value) => {
        const ttl = Math.max(0, Number(value.expires_in_seconds) * 1_000 - PREVIEW_EXPIRY_SAFETY_MS);
        if (value.url && ttl > 0) {
          entry.value = value;
          entry.expiresAt = Date.now() + ttl;
        }
        return value;
      })
      .finally(() => {
        entry.pending = undefined;
        if (!entry.value) previews.delete(versionId);
      });
    entry.pending = pending;
    previews.set(versionId, entry);
    trimOldestEntries(previews, MAX_PREVIEW_ENTRIES);
    return pending;
  };

  const getResourceDetails = async (resourceId: number, versionId: number) => {
    const key = `${resourceId}:${versionId}`;
    const now = Date.now();
    const existing = details.get(key);
    if (existing?.value && existing.expiresAt > now) return existing.value;
    if (existing?.pending) return existing.pending;

    const entry: CachedDetails = { expiresAt: 0 };
    const pending = getStudioResource(resourceId)
      .then((value) => {
        entry.value = value;
        entry.expiresAt = Date.now() + DETAILS_CACHE_TTL_MS;
        return value;
      })
      .finally(() => { entry.pending = undefined; });
    entry.pending = pending;
    details.set(key, entry);
    trimOldestEntries(details, MAX_DETAILS_ENTRIES);
    return pending;
  };

  const getObjectPreview = async (versionId: number) => {
    const now = Date.now();
    const existing = objectPreviews.get(versionId);
    if (existing?.value && existing.expiresAt > now) return existing.value;
    if (existing?.pending) return existing.pending;

    const entry: CachedValue<StudioObjectPreviewDescriptor> = { expiresAt: 0 };
    const pending = getStudioObjectPreview(versionId)
      .then((value) => {
        entry.value = value;
        entry.expiresAt = Date.now() + OBJECT_PREVIEW_CACHE_TTL_MS;
        return value;
      })
      .finally(() => { entry.pending = undefined; });
    entry.pending = pending;
    objectPreviews.set(versionId, entry);
    trimOldestEntries(objectPreviews, MAX_OBJECT_PREVIEW_ENTRIES);
    return pending;
  };

  const warmResource = async (versionId: number, resourceType: string) => {
    if (resourceType === 'document') {
      await getObjectPreview(versionId);
      return true;
    }
    if (resourceType === 'model_3d') {
      await getPreview(versionId);
      return true;
    }
    if (!['image', 'video', 'animation'].includes(resourceType)) return true;
    if (warmedMedia.has(versionId)) return true;
    const preview = await getPreview(versionId);
    if (!preview.url) return false;
    const isVideo = preview.mime_type?.startsWith('video/') || resourceType === 'video';
    const isImage = preview.mime_type?.startsWith('image/') || resourceType === 'image' || resourceType === 'animation';
    if (isVideo) {
      const video = await warmVideo(preview.url);
      if (!video) return false;
      rememberMedia(versionId, video);
      return true;
    }
    if (isImage) {
      const image = await warmImage(preview.url);
      if (!image) return false;
      rememberMedia(versionId, image);
      return true;
    }
    return false;
  };

  const preloadScreen = (screen: StudioScreen) => {
    const key = studioScreenCacheKey(screen);
    if (completedScreens.has(key)) return Promise.resolve();
    const existing = screenJobs.get(key);
    if (existing) return existing;

    const resources = studioScreenPreloadResources(screen);
    const job = (async () => {
      let nextIndex = 0;
      let successful = true;
      const workers = Array.from(
        { length: Math.min(MAX_PARALLEL_PREFETCHES, resources.length) },
        async () => {
          while (nextIndex < resources.length) {
            const resource = resources[nextIndex];
            nextIndex += 1;
            try {
              await getResourceDetails(resource.resourceId, resource.versionId);
              if (!(await warmResource(resource.versionId, resource.resourceType))) successful = false;
            } catch {
              successful = false;
            }
          }
        },
      );
      await Promise.all(workers);
      if (successful) {
        completedScreens.add(key);
        while (completedScreens.size > MAX_COMPLETED_SCREENS) {
          const oldestKey = completedScreens.values().next().value as string | undefined;
          if (!oldestKey) break;
          completedScreens.delete(oldestKey);
        }
      }
    })().finally(() => {
      screenJobs.delete(key);
    });
    screenJobs.set(key, job);
    return job;
  };

  return {
    getResourceDetails,
    getPreview,
    getObjectPreview,
    isMediaWarmed: (versionId) => warmedMedia.has(versionId),
    preloadScreen,
  };
};
