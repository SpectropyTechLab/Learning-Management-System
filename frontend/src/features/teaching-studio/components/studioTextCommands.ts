export type StudioTextCommand =
  | { type: 'bullet'; style: string; toggle?: boolean }
  | { type: 'number'; style: string; toggle?: boolean }
  | { type: 'indent' }
  | { type: 'outdent' }
  | { type: 'format'; command: 'bold' | 'italic' | 'underline' }
  | { type: 'style'; property: 'fontSize' | 'fontFamily' | 'color'; value: string }
  | {
      type: 'block-style';
      property: 'lineHeight' | 'marginTop' | 'marginBottom' | 'textAlign';
      value: string;
    }
  | { type: 'insert-equation'; latex: string; offset: number };

export const STUDIO_TEXT_COMMAND_EVENT = 'studio:text-command';

export const dispatchStudioTextCommand = (elementId: string, command: StudioTextCommand) => {
  window.dispatchEvent(
    new CustomEvent(STUDIO_TEXT_COMMAND_EVENT, { detail: { elementId, command } }),
  );
};
