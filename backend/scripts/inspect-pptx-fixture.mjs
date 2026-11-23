import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';

const matches = (value, expression) => (String(value || '').match(expression) || []).length;

const entryData = (entry) => {
  try {
    return entry.getData().toString('utf8');
  } catch {
    return '';
  }
};

const numericSlideOrder = (left, right) => {
  const numberOf = (name) => Number(name.match(/slide(\d+)\.xml$/i)?.[1] || 0);
  return numberOf(left.entryName) - numberOf(right.entryName);
};

export const inspectPptxBuffer = (buffer, sourceName = 'fixture.pptx') => {
  let archive;
  try {
    archive = new AdmZip(buffer);
  } catch {
    const looksLikeZip = buffer?.length >= 8 && buffer.readUInt32LE(0) === 0x04034b50;
    const flags = looksLikeZip ? buffer.readUInt16LE(6) : 0;
    if (looksLikeZip && (flags & 0x0001) !== 0) {
      throw new Error('Fixture uses encrypted ZIP entries and requires a password-free PPTX copy');
    }
    throw new Error('Fixture is not a readable ZIP package');
  }
  const entries = archive.getEntries().filter((entry) => !entry.isDirectory);
  const entryMap = new Map(entries.map((entry) => [entry.entryName.replaceAll('\\', '/'), entry]));
  if (!entryMap.has('[Content_Types].xml') || !entryMap.has('ppt/presentation.xml')) {
    throw new Error('Fixture is not a PowerPoint PPTX package');
  }

  const presentationXml = entryData(entryMap.get('ppt/presentation.xml'));
  const size = presentationXml.match(/<p:sldSz\b[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"/i);
  const slideEntries = entries
    .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/i.test(entry.entryName))
    .sort(numericSlideOrder);
  const slideSummaries = slideEntries.map((entry, index) => {
    const xml = entryData(entry);
    const relationshipName = entry.entryName.replace('/slides/', '/slides/_rels/') + '.rels';
    const relationships = entryData(entryMap.get(relationshipName));
    return {
      number: index + 1,
      path: entry.entryName,
      shapes: matches(xml, /<p:sp\b/g),
      pictures: matches(xml, /<p:pic\b/g),
      connectors: matches(xml, /<p:cxnSp\b/g),
      groups: matches(xml, /<p:grpSp\b/g),
      graphicFrames: matches(xml, /<p:graphicFrame\b/g),
      textRuns: matches(xml, /<a:t(?:\s[^>]*)?>/g),
      hasTiming: /<p:timing\b/.test(xml),
      hasTransition: /<p:transition\b/.test(xml),
      externalRelationships: matches(relationships, /TargetMode="External"/gi),
    };
  });

  const totalUncompressedBytes = entries.reduce((total, entry) => total + Number(entry.header?.size || 0), 0);
  const totalCompressedBytes = entries.reduce((total, entry) => total + Number(entry.header?.compressedSize || 0), 0);
  const categoryCount = (expression) => entries.filter((entry) => expression.test(entry.entryName)).length;
  const mediaEntries = entries.filter((entry) => /^ppt\/media\//i.test(entry.entryName));
  const mediaByExtension = Object.fromEntries([...mediaEntries.reduce((counts, entry) => {
    const extension = path.extname(entry.entryName).toLowerCase() || '(none)';
    counts.set(extension, (counts.get(extension) || 0) + 1);
    return counts;
  }, new Map())].sort(([left], [right]) => left.localeCompare(right)));
  const relationshipEntries = entries.filter((entry) => /\.rels$/i.test(entry.entryName));
  const externalRelationships = relationshipEntries.reduce(
    (total, entry) => total + matches(entryData(entry), /TargetMode="External"/gi),
    0,
  );

  return {
    sourceName,
    package: {
      compressedBytes: buffer.length,
      entryCount: entries.length,
      totalUncompressedBytes,
      compressionRatio: totalCompressedBytes > 0
        ? Number((totalUncompressedBytes / totalCompressedBytes).toFixed(2))
        : null,
      largestEntryBytes: Math.max(0, ...entries.map((entry) => Number(entry.header?.size || 0))),
    },
    presentation: {
      slideCount: slideEntries.length,
      widthEmu: size ? Number(size[1]) : null,
      heightEmu: size ? Number(size[2]) : null,
      slideMasters: categoryCount(/^ppt\/slideMasters\/slideMaster\d+\.xml$/i),
      slideLayouts: categoryCount(/^ppt\/slideLayouts\/slideLayout\d+\.xml$/i),
      themes: categoryCount(/^ppt\/theme\/theme\d+\.xml$/i),
      notesSlides: categoryCount(/^ppt\/notesSlides\/notesSlide\d+\.xml$/i),
      charts: categoryCount(/^ppt\/charts\/chart\d+\.xml$/i),
      diagrams: categoryCount(/^ppt\/diagrams\//i),
      embeddings: categoryCount(/^ppt\/embeddings\//i),
      mediaFiles: mediaEntries.length,
      mediaByExtension,
      hasMacros: entries.some((entry) => /vbaProject\.bin$/i.test(entry.entryName)),
      hasActiveX: entries.some((entry) => /activeX/i.test(entry.entryName)),
      has3DModels: entries.some((entry) => /(?:3dModel|model3d|\.glb$|\.obj$)/i.test(entry.entryName)),
      externalRelationships,
    },
    totals: {
      shapes: slideSummaries.reduce((sum, slide) => sum + slide.shapes, 0),
      pictures: slideSummaries.reduce((sum, slide) => sum + slide.pictures, 0),
      connectors: slideSummaries.reduce((sum, slide) => sum + slide.connectors, 0),
      groups: slideSummaries.reduce((sum, slide) => sum + slide.groups, 0),
      graphicFrames: slideSummaries.reduce((sum, slide) => sum + slide.graphicFrames, 0),
      textRuns: slideSummaries.reduce((sum, slide) => sum + slide.textRuns, 0),
      slidesWithTiming: slideSummaries.filter((slide) => slide.hasTiming).length,
      slidesWithTransitions: slideSummaries.filter((slide) => slide.hasTransition).length,
    },
    slides: slideSummaries,
  };
};

export const inspectPptxFile = (filePath) => inspectPptxBuffer(
  fs.readFileSync(filePath),
  path.basename(filePath),
);

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
  const argumentsList = process.argv.slice(2);
  const summaryOnly = argumentsList.includes('--summary');
  const files = argumentsList.filter((argument) => argument !== '--summary');
  if (!files.length) {
    console.error('Usage: node scripts/inspect-pptx-fixture.mjs <file.pptx> [more files]');
    process.exitCode = 1;
  } else {
    const reports = files.map((file) => {
      try {
        const startedAt = performance.now();
        const report = inspectPptxFile(path.resolve(file));
        const inspectionMilliseconds = Number((performance.now() - startedAt).toFixed(2));
        const measured = { ...report, inspectionMilliseconds };
        return summaryOnly ? { ...measured, slides: undefined } : measured;
      } catch (error) {
        return {
          sourceName: path.basename(file),
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });
    process.stdout.write(`${JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 2)}\n`);
  }
}

