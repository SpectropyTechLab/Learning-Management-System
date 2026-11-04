import type { Layout, ObjectType } from './layouts';
import type { StudioElement } from './types';

export interface LayoutRemapResult {
  elements: StudioElement[];
  removed: StudioElement[];
}

export const remapElementsToLayout = (elements: StudioElement[], layout: Layout): LayoutRemapResult => {
  const usedSlots = new Set<string>();
  const kept: StudioElement[] = [];
  const removed: StudioElement[] = [];

  for (const element of elements) {
    const type = element.type as ObjectType;
    const currentSlot = layout.slots.find((slot) => slot.id === element.slotId && slot.allowed.includes(type) && !usedSlots.has(slot.id));
    const destination = currentSlot || layout.slots.find((slot) => slot.allowed.includes(type) && !usedSlots.has(slot.id));
    if (!destination) {
      removed.push(element);
      continue;
    }
    usedSlots.add(destination.id);
    kept.push({
      ...element,
      slotId: destination.id,
      position: {
        ...destination.bounds,
        ...(element.position.zIndex !== undefined ? { zIndex: element.position.zIndex } : {}),
        ...(element.position.locked !== undefined ? { locked: element.position.locked } : {}),
      },
      ...(element.resource
        ? {
            resource: {
              ...element.resource,
              usage: { ...element.resource.usage, slot_id: destination.id },
            },
          }
        : {}),
    });
  }

  return { elements: kept, removed };
};
