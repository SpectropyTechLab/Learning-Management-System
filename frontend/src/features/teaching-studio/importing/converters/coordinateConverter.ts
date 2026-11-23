import type { ImportBounds, ImportScreen } from '../model/importTypes.ts';

export const STUDIO_IMPORT_CANVAS = Object.freeze({ width: 1920, height: 1080 });

export const fitImportBounds = (screen: Pick<ImportScreen, 'width' | 'height'>, bounds: ImportBounds) => {
  const scale = Math.min(STUDIO_IMPORT_CANVAS.width / screen.width, STUDIO_IMPORT_CANVAS.height / screen.height);
  const offsetX = (STUDIO_IMPORT_CANVAS.width - screen.width * scale) / 2;
  const offsetY = (STUDIO_IMPORT_CANVAS.height - screen.height * scale) / 2;
  const x = Math.max(0, Math.min(STUDIO_IMPORT_CANVAS.width - 1, offsetX + bounds.x * scale));
  const y = Math.max(0, Math.min(STUDIO_IMPORT_CANVAS.height - 1, offsetY + bounds.y * scale));
  return {
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
    width: Number(Math.max(1, Math.min(STUDIO_IMPORT_CANVAS.width - x, bounds.width * scale)).toFixed(3)),
    height: Number(Math.max(1, Math.min(STUDIO_IMPORT_CANVAS.height - y, bounds.height * scale)).toFixed(3)),
  };
};
