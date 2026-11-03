import type { StudioResourceType } from './api/studioResourcesApi';
import type { ObjectType } from './layouts';

const RESOURCE_TYPES_BY_OBJECT: Partial<Record<ObjectType, readonly StudioResourceType[]>> = {
  visual: ['image', 'animation'],
  media: ['image', 'video', 'animation', 'external_link'],
  simulation: ['simulation', 'html', 'zip', 'scorm', 'external_link'],
};

export const resourceTypesForObject = (objectType?: string | null): readonly StudioResourceType[] =>
  RESOURCE_TYPES_BY_OBJECT[objectType as ObjectType] ?? [];

export const canPlaceResource = (objectType: string, resourceType: StudioResourceType) =>
  resourceTypesForObject(objectType).includes(resourceType);

export const supportsResourcePlacement = (objectType?: string | null) =>
  resourceTypesForObject(objectType).length > 0;
