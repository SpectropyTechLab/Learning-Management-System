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
