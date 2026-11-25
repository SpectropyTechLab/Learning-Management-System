import type { StudioElement } from './types.ts';
import type { Rect } from './layouts.ts';

/** Keep client geometry aligned with the Studio screen API's canvas rules. */
export const preserveStudioElementBounds = (_element: StudioElement, bounds: Rect): Rect => {
  return bounds;
};

export const prepareStudioElementForSave = (element: StudioElement): StudioElement => {
  return element;
};
