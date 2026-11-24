import test from 'node:test';
import assert from 'node:assert/strict';
import AdmZip from 'adm-zip';
import { buildPptxImportDocument, commitPptxImport, preflightPptxImport } from '../services/studioPptxImport.service.js';

const rels = (rows) => `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rows.map(([id, type, target]) => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`).join('')}</Relationships>`;

const fixture = () => {
  const zip = new AdmZip();
  zip.addFile('[Content_Types].xml', Buffer.from('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/></Types>'));
  zip.addFile('ppt/presentation.xml', Buffer.from('<?xml version="1.0"?><p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId1"/></p:sldIdLst><p:sldSz cx="9144000" cy="5143500"/></p:presentation>'));
  zip.addFile('ppt/_rels/presentation.xml.rels', Buffer.from(rels([
    ['rId1', 'slide', 'slides/slide1.xml'], ['rId2', 'slide', 'slides/slide2.xml'],
  ])));
  const slide = (title, image = false) => `<?xml version="1.0"?><p:sld xmlns:p="p" xmlns:a="a" xmlns:r="r"><p:cSld>${image ? '<p:bg><p:bgPr><a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill></p:bgPr></p:bg>' : ''}<p:spTree><p:nvGrpSpPr/><p:grpSpPr/>
    <p:sp><p:nvSpPr><p:cNvPr id="2" name="Title" descr="Editable title"/><p:cNvSpPr/><p:nvPr><p:ph type="title" idx="1"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="914400" y="457200"/><a:ext cx="7315200" cy="914400"/></a:xfrm><a:prstGeom prst="rect"/><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></p:spPr><p:style><a:fontRef idx="minor"><a:srgbClr val="AABBCC"/></a:fontRef></p:style><p:txBody><a:bodyPr anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="ctr"/><a:r><a:rPr sz="3200" b="1"><a:solidFill><a:srgbClr val="112244"/></a:solidFill><a:latin typeface="Aptos Display"/></a:rPr><a:t>${title}</a:t></a:r><a:r><a:rPr sz="1800" i="1"><a:latin typeface="Calibri"/></a:rPr><a:t> subtitle</a:t></a:r></a:p></p:txBody></p:sp>
    <p:sp><p:nvSpPr><p:cNvPr id="3" name="Diamond"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm rot="600000"><a:off x="1828800" y="1828800"/><a:ext cx="914400" cy="914400"/></a:xfrm><a:prstGeom prst="diamond"/><a:solidFill><a:srgbClr val="22C55E"/></a:solidFill><a:ln w="25400"><a:solidFill><a:srgbClr val="166534"/></a:solidFill></a:ln></p:spPr></p:sp>
    <p:sp><p:nvSpPr><p:cNvPr id="9" name="Transparent text"/></p:nvSpPr><p:spPr><a:xfrm><a:off x="457200" y="2743200"/><a:ext cx="457200" cy="91440"/></a:xfrm><a:prstGeom prst="rect"/></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr sz="1800"><a:solidFill><a:schemeClr val="lt1"/></a:solidFill></a:rPr><a:t>Transparent</a:t></a:r></a:p></p:txBody></p:sp>
    <p:grpSp><p:nvGrpSpPr><p:cNvPr id="4" name="Group"/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="3657600" y="1828800"/><a:ext cx="1828800" cy="914400"/><a:chOff x="0" y="0"/><a:chExt cx="1828800" cy="914400"/></a:xfrm></p:grpSpPr><p:sp><p:nvSpPr><p:cNvPr id="5" name="Grouped rectangle"/></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm><a:prstGeom prst="rect"/></p:spPr></p:sp><p:sp><p:nvSpPr><p:cNvPr id="6" name="Grouped ellipse"/></p:nvSpPr><p:spPr><a:xfrm><a:off x="914400" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm><a:prstGeom prst="ellipse"/></p:spPr></p:sp></p:grpSp>
    ${image ? '<p:pic><p:nvPicPr><p:cNvPr id="7" name="Picture" descr="Pixel"/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/><a:srcRect l="1000"/></p:blipFill><p:spPr><a:xfrm><a:off x="6400800" y="1828800"/><a:ext cx="914400" cy="914400"/></a:xfrm></p:spPr></p:pic>' : ''}
    <p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="8" name="Chart"/></p:nvGraphicFramePr><p:xfrm><a:off x="914400" y="3657600"/><a:ext cx="1828800" cy="914400"/></p:xfrm><a:graphic><a:graphicData uri="chart"/></a:graphic></p:graphicFrame>
  </p:spTree></p:cSld><p:timing/></p:sld>`;
  for (const [number, title, image] of [[1, 'First', true], [2, 'Second', false]]) {
    zip.addFile(`ppt/slides/slide${number}.xml`, Buffer.from(slide(title, image)));
    zip.addFile(`ppt/slides/_rels/slide${number}.xml.rels`, Buffer.from(rels([
      ['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'], ...(image ? [['rId2', 'image', '../media/image1.png']] : []),
    ])));
  }
  zip.addFile('ppt/slideLayouts/slideLayout1.xml', Buffer.from('<?xml version="1.0"?><p:sldLayout xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree><p:nvGrpSpPr/><p:grpSpPr/></p:spTree></p:cSld></p:sldLayout>'));
  zip.addFile('ppt/slideLayouts/_rels/slideLayout1.xml.rels', Buffer.from(rels([['rId1', 'slideMaster', '../slideMasters/slideMaster1.xml']])));
  zip.addFile('ppt/slideMasters/slideMaster1.xml', Buffer.from('<?xml version="1.0"?><p:sldMaster xmlns:p="p" xmlns:a="a"><p:cSld><p:bg><p:bgPr><a:solidFill><a:schemeClr val="tx1"><a:lumMod val="85000"/><a:lumOff val="15000"/><a:alpha val="84000"/></a:schemeClr></a:solidFill></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr/><p:grpSpPr/></p:spTree></p:cSld><p:clrMap tx1="dk1" bg1="lt1" tx2="dk2" bg2="lt2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/></p:sldMaster>'));
  zip.addFile('ppt/slideMasters/_rels/slideMaster1.xml.rels', Buffer.from(rels([['rId1', 'theme', '../theme/theme1.xml']])));
  zip.addFile('ppt/theme/theme1.xml', Buffer.from('<?xml version="1.0"?><a:theme xmlns:a="a"><a:themeElements><a:clrScheme name="T"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1></a:clrScheme><a:fontScheme name="F"><a:majorFont><a:latin typeface="Aptos Display"/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/></a:minorFont></a:fontScheme></a:themeElements></a:theme>'));
  zip.addFile('ppt/media/image1.png', Buffer.from('89504e470d0a1a0a00000000', 'hex'));
  return { originalname: 'fixture.pptx', buffer: zip.toBuffer() };
};

test('PPTX preflight follows presentation slide order and reports editable content', async () => {
  const result = await preflightPptxImport({ file: fixture() });
  assert.equal(result.presentation.slide_count, 2);
  assert.equal(result.slides[0].title, 'Second subtitle');
  assert.equal(result.slides[1].title, 'First subtitle');
  assert.equal(result.slides[1].image_count, 1);
  assert.ok(result.slides[1].editable_text_count >= 1);
  assert.ok(result.issue_counts.warning >= 2);
});

test('PPTX adapter creates rich editable text, shapes, groups, image resources and explicit fallbacks', async () => {
  const document = await buildPptxImportDocument({ file: fixture(), options: { fallback: 'placeholder' } });
  assert.equal(document.schema_version, 'spectropy.import.v1');
  const firstSourceSlide = document.screens[1];
  const text = firstSourceSlide.elements.find((element) => element.kind === 'text');
  assert.match(text.content.richTextHtml, /font-weight:700/);
  assert.match(text.content.richTextHtml, /font-style:italic/);
  assert.match(text.content.richTextHtml, /color:#aabbcc/i);
  assert.equal(text.content.fontFamily, 'Arial');
  assert.equal(text.content.marginsUnit, 'canvas-px');
  assert.equal(text.content.margins.left, 19.2);
  assert.ok(firstSourceSlide.elements.some((element) => element.content.kind === 'diamond'));
  const grouped = firstSourceSlide.elements.filter((element) => element.group?.source_id);
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].group.source_id, grouped[1].group.source_id);
  assert.equal(document.resources.length, 1);
  assert.ok(firstSourceSlide.elements.some((element) => element.resource_reference?.source_id === document.resources[0].source_id));
  assert.ok(document.issues.some((issue) => issue.code === 'PPTX_GRAPHIC_FRAME_DEFERRED'));
  const transparentText = firstSourceSlide.elements.find((element) => element.content.text === 'Transparent');
  assert.equal(transparentText.content.fill, 'transparent');
  assert.equal(transparentText.content.stroke, 'transparent');
  assert.equal(transparentText.content.fontSize, 48);
  assert.equal(document.screens[0].background.color, '#494949');
});

test('PPTX commit selects slides, persists resources/screens, reorders, and returns a report', async () => {
  const source = fixture();
  const preflight = await preflightPptxImport({ file: source });
  const calls = { resources: [], screens: [], reorder: null };
  let screenId = 20;
  const ports = {
    async createResource(entry) { calls.resources.push(entry); return { resource_id: 9, resource_version_id: 10, resource_type: 'image' }; },
    async createScreen(_sessionId, title) { const row = { id: screenId++, revision_no: 1, title }; calls.screens.push(row); return row; },
    async saveScreen(id, body) { return { id, revision_no: 2, elements: body.elements, title: body.title }; },
    async getScreen(id) { const saved = calls.screens.find((row) => row.id === id); return { ...saved, id, revision_no: 2, elements: saved.savedElements || [] }; },
    async listScreens() { return { session_revision_no: 5, screens: [{ id: 1 }, ...calls.screens] }; },
    async reorderScreens(_sessionId, body) { calls.reorder = body; return body; },
    async deleteScreen() {}, async deleteResource() {},
  };
  ports.saveScreen = async (id, body) => { calls.screens.find((row) => row.id === id).savedElements = body.elements; return { id, revision_no: 2, elements: body.elements }; };
  const result = await commitPptxImport({
    sessionId: 3, file: source, user: { id: 1 }, ports,
    options: { selected_slide_ids: [preflight.slides[1].source_id], insertion_mode: 'start', fallback: 'placeholder' },
  });
  assert.equal(result.screens_created.length, 1);
  assert.equal(result.report.counts.screens, 1);
  assert.equal(calls.reorder.screen_ids[0], result.screens_created[0]);
  assert.equal(calls.resources.length, 1);
  assert.ok(calls.screens[0].savedElements.some((element) => element.position.groupId));
});

test('PPTX validation rejects legacy extension and XML entities', async () => {
  await assert.rejects(() => preflightPptxImport({ file: { ...fixture(), originalname: 'legacy.ppt' } }), /Only password-free \.pptx/);
  const unsafe = fixture();
  const zip = new AdmZip(unsafe.buffer);
  zip.updateFile('ppt/slides/slide1.xml', Buffer.from('<?xml version="1.0"?><!DOCTYPE x [<!ENTITY y "z">]><p:sld xmlns:p="p"/>'));
  await assert.rejects(() => preflightPptxImport({ file: { originalname: 'unsafe.pptx', buffer: zip.toBuffer() } }), /forbidden XML/);
});
