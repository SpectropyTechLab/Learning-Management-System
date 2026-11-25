import type { StudioScreen } from './types';

export const studioScreensAround = (screens: StudioScreen[], selectedScreenId: number) => {
  const selectedIndex = screens.findIndex((screen) => screen.id === selectedScreenId);
  if (selectedIndex < 0) return { next: null, previous: null };
  return {
    next: screens[selectedIndex + 1] ?? null,
    previous: screens[selectedIndex - 1] ?? null,
  };
};

export const studioScreenCacheKey = (screen: Pick<StudioScreen, 'id' | 'revision_no'>) =>
  `${screen.id}:${screen.revision_no}`;

export const studioScreenPreloadResources = (screen: StudioScreen) => {
  const byVersion = new Map<number, { resourceId: number; resourceType: string }>();
  for (const element of screen.elements) {
    if (element.position.hidden === true || !element.resource) continue;
    const versionId = Number(element.resource.resource_version_id);
    const resourceId = Number(element.resource.resource_id);
    const type = String(element.resource.usage.resource_type || '').toLowerCase();
    if (!Number.isInteger(resourceId) || resourceId <= 0 || !Number.isInteger(versionId) || versionId <= 0) continue;
    byVersion.set(versionId, { resourceId, resourceType: type });
  }
  return Array.from(byVersion, ([versionId, resource]) => ({ versionId, ...resource }));
};
