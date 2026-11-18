export const shouldCloseEquationKeyboard = (
  visible: boolean,
  keyboardOwnerId: string | undefined,
  requestedElementId: string,
) => visible && keyboardOwnerId === requestedElementId;

export const equationControlTarget = (
  explicitElementId: string | undefined,
  activeElementId: string | undefined,
  requestControlFirst: boolean,
) => requestControlFirst ? null : explicitElementId ?? activeElementId ?? null;

export const inlineEquationInsertionOffset = (
  text: string,
  targetElementId: string,
  rememberedCaret: { elementId: string; offset: number } | null,
) => rememberedCaret?.elementId === targetElementId
  ? Math.min(Math.max(rememberedCaret.offset, 0), text.length)
  : text.length;
