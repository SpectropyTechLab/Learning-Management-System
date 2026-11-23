export const studioElementSlotId = (
  id: string,
  slotId: string | null | undefined,
  content: Record<string, unknown> | null | undefined,
): string => content?.importSource ? `free-${id}` : slotId || `free-${id}`;
