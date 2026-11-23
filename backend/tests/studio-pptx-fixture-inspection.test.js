import assert from 'node:assert/strict';
import test from 'node:test';
import AdmZip from 'adm-zip';
import { inspectPptxBuffer } from '../scripts/inspect-pptx-fixture.mjs';

const syntheticPptx = () => {
  const zip = new AdmZip();
  zip.addFile('[Content_Types].xml', Buffer.from('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'));
  zip.addFile('ppt/presentation.xml', Buffer.from('<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldSz cx="12192000" cy="6858000"/></p:presentation>'));
  zip.addFile('ppt/slides/slide1.xml', Buffer.from('<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Editable text</a:t></a:r></a:p></p:txBody></p:sp><p:pic/><p:grpSp/><p:graphicFrame/></p:spTree></p:cSld><p:transition/><p:timing/></p:sld>'));
  zip.addFile('ppt/slides/_rels/slide1.xml.rels', Buffer.from('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" TargetMode="External" Target="https://example.com"/></Relationships>'));
  zip.addFile('ppt/media/image1.png', Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  zip.addFile('ppt/charts/chart1.xml', Buffer.from('<c:chartSpace/>'));
  zip.addFile('ppt/notesSlides/notesSlide1.xml', Buffer.from('<p:notes/>'));
  return zip.toBuffer();
};

test('PPTX fixture inspection records structure without extracting or executing content', () => {
  const report = inspectPptxBuffer(syntheticPptx(), 'synthetic.pptx');
  assert.equal(report.sourceName, 'synthetic.pptx');
  assert.equal(report.presentation.slideCount, 1);
  assert.equal(report.presentation.widthEmu, 12192000);
  assert.equal(report.presentation.heightEmu, 6858000);
  assert.equal(report.presentation.mediaFiles, 1);
  assert.deepEqual(report.presentation.mediaByExtension, { '.png': 1 });
  assert.equal(report.presentation.charts, 1);
  assert.equal(report.presentation.notesSlides, 1);
  assert.equal(report.presentation.externalRelationships, 1);
  assert.deepEqual(report.totals, {
    shapes: 1,
    pictures: 1,
    connectors: 0,
    groups: 1,
    graphicFrames: 1,
    textRuns: 1,
    slidesWithTiming: 1,
    slidesWithTransitions: 1,
  });
});

test('PPTX fixture inspection rejects an ordinary ZIP archive', () => {
  const zip = new AdmZip();
  zip.addFile('index.html', Buffer.from('<h1>Not a presentation</h1>'));
  assert.throws(() => inspectPptxBuffer(zip.toBuffer()), /not a PowerPoint PPTX package/);
});

test('PPTX fixture inspection distinguishes encrypted ZIP entries', () => {
  const encryptedHeader = Buffer.from([
    0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x01, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
  assert.throws(
    () => inspectPptxBuffer(encryptedHeader),
    /requires a password-free PPTX copy/,
  );
});

