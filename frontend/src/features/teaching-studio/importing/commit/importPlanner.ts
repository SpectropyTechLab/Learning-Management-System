import type { StudioElement } from '../../types.ts';
import { fitImportBounds } from '../converters/coordinateConverter.ts';
import { normalizeImportStyle } from '../converters/styleConverter.ts';
import type { ImportElement, ImportScreen, PersistedImportResource } from '../model/importTypes.ts';

const typeByKind: Record<ImportElement['kind'], string> = {
  title: 'title', text: 'text', shape: 'shape', equation: 'math', table: 'table', chart: 'graph', diagram: 'visual', image: 'visual', vector: 'visual',
  media: 'media', video: 'media', audio: 'media', simulation: 'simulation', embedded_object: 'embedded_object',
};

const safeId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 150);

export const planStudioElements = (
  screen: ImportScreen,
  resources: ReadonlyMap<string, PersistedImportResource>,
): StudioElement[] => [...screen.elements]
  .sort((left, right) => Number(left.z_index || 0) - Number(right.z_index || 0))
  .map((element, elementIndex) => {
    const type = typeByKind[element.kind];
    const resourceSourceId = element.resource_reference?.source_id;
    const resource = resourceSourceId ? resources.get(resourceSourceId) : undefined;
    const id = safeId(`import-${elementIndex + 1}-${screen.source_id}-${element.source_id}`);
    const slotId = `free-${id}`;
    return {
      id,
      slotId,
      type,
      content: {
        ...(element.content || {}),
        ...(element.style && Object.keys(element.style).length ? { importStyle: normalizeImportStyle(element.style) } : {}),
        importSource: { screen_id: screen.source_id, element_id: element.source_id, kind: element.kind, ...(element.metadata ? { metadata: element.metadata } : {}) },
      },
      position: {
        ...fitImportBounds(screen, element.bounds),
        zIndex: Math.min(5000, Math.max(0, Number(element.z_index || 0))),
        rotation: Number(element.rotation || 0),
        flipX: Boolean(element.flip?.horizontal),
        flipY: Boolean(element.flip?.vertical),
      },
      ...(resource ? {
        resource: {
          resource_id: resource.resource_id,
          resource_version_id: resource.resource_version_id,
          usage: { slot_id: slotId, resource_type: resource.resource_type, fit: element.resource_reference?.fit || 'contain' },
        },
      } : {}),
    };
  });
