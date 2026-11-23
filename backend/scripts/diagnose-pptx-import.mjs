import fs from 'node:fs';
import path from 'node:path';
import { buildPptxImportDocument } from '../services/studioPptxImport.service.js';
import { fitImportBounds } from '../services/studioImportFoundation.service.js';

const [filePath, slideArgument = '1'] = process.argv.slice(2);
if (!filePath) {
  console.error('Usage: node scripts/diagnose-pptx-import.mjs <file.pptx> [slide-number]');
  process.exit(1);
}

const slideNumber = Math.max(1, Number.parseInt(slideArgument, 10) || 1);
const resolved = path.resolve(filePath);
const document = await buildPptxImportDocument({
  file: { originalname: path.basename(resolved), buffer: fs.readFileSync(resolved) },
});
const screen = document.screens[slideNumber - 1];
if (!screen) {
  console.error(`Slide ${slideNumber} does not exist; the presentation has ${document.screens.length} slides.`);
  process.exit(1);
}

const summary = {
  source: document.source.name,
  slide: slideNumber,
  title: screen.title,
  background: screen.background,
  counts: screen.elements.reduce((counts, element) => {
    counts[element.kind] = (counts[element.kind] || 0) + 1;
    return counts;
  }, {}),
  transparentTextBoxes: screen.elements.filter((element) => (
    element.kind === 'text' && element.content?.fill === 'transparent'
  )).length,
  gradients: screen.elements.filter((element) => Array.isArray(element.content?.gradient?.stops)).length,
  effects: screen.elements.reduce((counts, element) => {
    const effect = element.content?.shapeEffect;
    if (effect && effect !== 'none') counts[effect] = (counts[effect] || 0) + 1;
    return counts;
  }, {}),
  smallElements: screen.elements.filter((element) => {
    const fitted = fitImportBounds(screen, { ...element.bounds, z_index: element.z_index });
    return fitted.width < 80 || fitted.height < 60;
  }).length,
  zIndexRange: [
    Math.min(...screen.elements.map((element) => element.z_index)),
    Math.max(...screen.elements.map((element) => element.z_index)),
  ],
  sample: screen.elements.slice(0, 20).map((element) => ({
    name: element.content?.sourceName,
    kind: element.kind,
    text: element.content?.text,
    bounds: fitImportBounds(screen, { ...element.bounds, z_index: element.z_index }),
    fill: element.content?.fill,
    stroke: element.content?.stroke,
      geometry: element.metadata?.geometry,
      shapeKind: element.content?.kind,
      fontFamily: element.content?.fontFamily,
      color: element.content?.color,
    fontSize: element.content?.fontSize,
      textStrokeColor: element.content?.textStrokeColor,
      textStrokeWidth: element.content?.textStrokeWidth,
      margins: element.content?.margins,
    zIndex: element.z_index,
  })),
};

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
