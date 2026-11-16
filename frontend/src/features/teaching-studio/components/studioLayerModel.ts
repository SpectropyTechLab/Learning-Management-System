import type { StudioElement } from '../types';

export const studioLayerName = (element: StudioElement, index = 0) => {
  const customName = String(element.content.layerName || '').trim();
  if (customName) return customName;
  const text = String(element.content.text || '')
    .trim()
    .replace(/\s+/g, ' ');
  if (text) return text.length > 36 ? `${text.slice(0, 33)}…` : text;
  const resourceName = String(element.content.altText || element.content.caption || '').trim();
  if (resourceName)
    return resourceName.length > 36 ? `${resourceName.slice(0, 33)}…` : resourceName;
  return `${element.type.replaceAll('_', ' ')} ${index + 1}`;
};
export const orderedStudioLayers = (elements: StudioElement[]) =>
  elements
    .map((element, index) => ({ element, index }))
    .sort((left, right) => {
      const zDifference =
        (Number(right.element.position.zIndex) || 0) - (Number(left.element.position.zIndex) || 0);
      return zDifference || right.index - left.index;
    })
    .map(({ element }) => element);

export const updateStudioLayer = (
  elements: StudioElement[],
  elementId: string,
  changes: { hidden?: boolean; locked?: boolean; layerName?: string },
) =>
  elements.map((element) =>
    element.id === elementId
      ? {
          ...element,
          content:
            changes.layerName === undefined
              ? element.content
              : { ...element.content, layerName: changes.layerName },
          position: {
            ...element.position,
            ...(changes.hidden === undefined ? {} : { hidden: changes.hidden }),
            ...(changes.locked === undefined ? {} : { locked: changes.locked }),
          },
        }
      : element,
  );

export const moveStudioLayer = (
  elements: StudioElement[],
  elementId: string,
  direction: 'forward' | 'backward',
) => {
  const ordered = orderedStudioLayers(elements);
  const currentIndex = ordered.findIndex((element) => element.id === elementId);
  const targetIndex = direction === 'forward' ? currentIndex - 1 : currentIndex + 1;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length) return elements;
  [ordered[currentIndex], ordered[targetIndex]] = [ordered[targetIndex], ordered[currentIndex]];
  const zIndexById = new Map(ordered.map((element, index) => [element.id, ordered.length - index]));
  return elements.map((element) => ({
    ...element,
    position: { ...element.position, zIndex: zIndexById.get(element.id) ?? 0 },
  }));
};

export const reorderStudioLayers = (elements: StudioElement[], frontToBackIds: string[]) => {
  const knownIds = new Set(elements.map((element) => element.id));
  const normalizedIds = [
    ...frontToBackIds.filter(
      (id, index) => knownIds.has(id) && frontToBackIds.indexOf(id) === index,
    ),
    ...orderedStudioLayers(elements)
      .map((element) => element.id)
      .filter((id) => !frontToBackIds.includes(id)),
  ];
  const zIndexById = new Map(normalizedIds.map((id, index) => [id, normalizedIds.length - index]));
  return elements.map((element) => ({
    ...element,
    position: { ...element.position, zIndex: zIndexById.get(element.id) ?? 0 },
  }));
};
