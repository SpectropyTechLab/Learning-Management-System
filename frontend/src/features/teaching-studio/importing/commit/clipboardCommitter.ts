import type { StudioElement } from '../../types.ts';
import type { StudioResourceSummary, StudioResourceType } from '../../api/studioResourcesApi.ts';
import { planStudioElements } from './importPlanner.ts';
import { planImportedResources } from '../resources/importedResourcePlanner.ts';
import type { ImportDocument, PersistedImportResource } from '../model/importTypes.ts';

export interface ClipboardResourcePorts {
  create(input: { name: string; resourceType: StudioResourceType; file: File; metadataJson: Record<string, unknown> }): Promise<StudioResourceSummary>;
  remove(resourceId: number): Promise<{ storage_cleanup_complete?: boolean }>;
}

export interface ClipboardCommitResult {
  elements: StudioElement[];
  created_resource_ids: number[];
}

const supportedTypes = new Set<StudioResourceType>(['image', 'video', 'animation', 'simulation', 'external_link', 'html', 'zip', 'scorm', 'presentation', 'model_3d', 'document']);

const resourceTypeOf = (metadata: Record<string, unknown>): StudioResourceType => {
  const requested = String(metadata.resource_type || 'document') as StudioResourceType;
  return supportedTypes.has(requested) ? requested : 'document';
};

export const commitClipboardDocument = async (
  document: ImportDocument,
  ports: ClipboardResourcePorts,
): Promise<ClipboardCommitResult> => {
  const plan = await planImportedResources(document);
  const created: StudioResourceSummary[] = [];
  const persistedByPlan = new Map<string, PersistedImportResource>();
  try {
    for (const entry of plan.entries) {
      const resourceType = resourceTypeOf(entry.metadata);
      const resource = await ports.create({
        name: entry.file_name.replace(/\.[^.]+$/, '') || 'Pasted resource',
        resourceType,
        file: new File([entry.bytes as BlobPart], entry.file_name, { type: entry.media_type }),
        metadataJson: { ...entry.metadata, checksum_sha256: entry.sha256, imported_from: 'clipboard' },
      });
      if (!resource.latest_version?.id) throw new Error(`Resource ${entry.file_name} did not return a usable version.`);
      created.push(resource);
      persistedByPlan.set(entry.plan_id, { resource_id: resource.id, resource_version_id: resource.latest_version.id, resource_type: resource.resource_type });
    }
  } catch (error) {
    const cleanupFailures: number[] = [];
    for (const resource of [...created].reverse()) {
      try {
        const result = await ports.remove(resource.id);
        if (result.storage_cleanup_complete === false) cleanupFailures.push(resource.id);
      } catch { cleanupFailures.push(resource.id); }
    }
    if (cleanupFailures.length) Object.assign(error as object, { cleanup_resource_ids: cleanupFailures });
    throw error;
  }

  const persistedBySource = new Map<string, PersistedImportResource>();
  plan.source_to_plan_id.forEach((planId, sourceId) => {
    const persisted = persistedByPlan.get(planId);
    if (persisted) persistedBySource.set(sourceId, persisted);
  });
  const screen = document.screens[0];
  return { elements: planStudioElements(screen, persistedBySource), created_resource_ids: created.map((resource) => resource.id) };
};
