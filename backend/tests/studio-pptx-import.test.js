import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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

const phase4CompatibilityFixture = () => {
  const zip = new AdmZip();
  zip.addFile('[Content_Types].xml', Buffer.from('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="m4a" ContentType="audio/mp4"/><Default Extension="mp4" ContentType="video/mp4"/></Types>'));
  zip.addFile('ppt/presentation.xml', Buffer.from('<?xml version="1.0"?><p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst><p:sldSz cx="9144000" cy="5143500"/></p:presentation>'));
  zip.addFile('ppt/_rels/presentation.xml.rels', Buffer.from(rels([['rId1', 'slide', 'slides/slide1.xml']])));
  zip.addFile('ppt/slides/slide1.xml', Buffer.from(`<?xml version="1.0"?><p:sld xmlns:p="p" xmlns:a="a" xmlns:r="r" xmlns:c="c" xmlns:m="m" xmlns:mc="mc"><p:cSld><p:spTree><p:nvGrpSpPr/><p:grpSpPr/>
    <p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="2" name="Editable table"/></p:nvGraphicFramePr><p:xfrm><a:off x="457200" y="457200"/><a:ext cx="2743200" cy="1371600"/></p:xfrm><a:graphic><a:graphicData uri="table"><a:tbl><a:tblPr firstRow="1" bandRow="1"/><a:tblGrid><a:gridCol w="1371600"/><a:gridCol w="1371600"/></a:tblGrid><a:tr h="685800"><a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Concept</a:t></a:r></a:p></a:txBody><a:tcPr/></a:tc><a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Value</a:t></a:r></a:p></a:txBody><a:tcPr/></a:tc></a:tr><a:tr h="685800"><a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Angle</a:t></a:r></a:p></a:txBody><a:tcPr/></a:tc><a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>45</a:t></a:r></a:p></a:txBody><a:tcPr/></a:tc></a:tr></a:tbl></a:graphicData></a:graphic></p:graphicFrame>
    <p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="3" name="Editable chart"/></p:nvGraphicFramePr><p:xfrm><a:off x="3657600" y="457200"/><a:ext cx="2743200" cy="1828800"/></p:xfrm><a:graphic><a:graphicData uri="chart"><c:chart r:id="rId2"/></a:graphicData></a:graphic></p:graphicFrame>
    <p:grpSp><p:nvGrpSpPr><p:cNvPr id="13" name="Teaching media group"/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="457200" y="2743200"/><a:ext cx="7315200" cy="1828800"/><a:chOff x="0" y="0"/><a:chExt cx="7315200" cy="1828800"/></a:xfrm></p:grpSpPr>
      <mc:AlternateContent><mc:Choice Requires="a14"><p:sp><p:nvSpPr><p:cNvPr id="4" name="Equation"/></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1371600" cy="914400"/></a:xfrm></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><m:oMathPara><m:oMath><m:r><m:t>x</m:t></m:r><m:sSup><m:e><m:r><m:t>2</m:t></m:r></m:e><m:sup><m:r><m:t>2</m:t></m:r></m:sup></m:sSup></m:oMath></m:oMathPara></a:p></p:txBody></p:sp></mc:Choice></mc:AlternateContent>
      <p:pic><p:nvPicPr><p:cNvPr id="5" name="Image"/></p:nvPicPr><p:blipFill><a:blip r:embed="rId3"/></p:blipFill><p:spPr><a:xfrm><a:off x="1828800" y="0"/><a:ext cx="1371600" cy="914400"/></a:xfrm></p:spPr></p:pic>
      <p:pic><p:nvPicPr><p:cNvPr id="6" name="Audio"/><p:nvPr><a:audioFile r:link="rId4"/></p:nvPr></p:nvPicPr><p:spPr><a:xfrm><a:off x="3657600" y="0"/><a:ext cx="1371600" cy="914400"/></a:xfrm></p:spPr></p:pic>
      <p:pic><p:nvPicPr><p:cNvPr id="7" name="Video"/><p:nvPr><a:videoFile r:link="rId5"/></p:nvPr></p:nvPicPr><p:spPr><a:xfrm><a:off x="5486400" y="0"/><a:ext cx="1371600" cy="914400"/></a:xfrm></p:spPr></p:pic>
    </p:grpSp>
  </p:spTree></p:cSld><p:transition spd="med"><p:split orient="vert" dir="out"/></p:transition></p:sld>`));
  zip.addFile('ppt/slides/_rels/slide1.xml.rels', Buffer.from(rels([
    ['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'],
    ['rId2', 'chart', '../charts/chart1.xml'],
    ['rId3', 'image', '../media/image1.png'],
    ['rId4', 'audio', '../media/audio1.m4a'],
    ['rId5', 'video', '../media/video1.mp4'],
  ])));
  zip.addFile('ppt/charts/chart1.xml', Buffer.from('<?xml version="1.0"?><c:chartSpace xmlns:c="c" xmlns:a="a"><c:chart><c:title><c:tx><c:rich><a:p><a:r><a:t>Learning progress</a:t></a:r></a:p></c:rich></c:tx></c:title><c:plotArea><c:bar3DChart><c:ser><c:tx><c:v>Score</c:v></c:tx><c:cat><c:strRef><c:strCache><c:pt idx="0"><c:v>Before</c:v></c:pt><c:pt idx="1"><c:v>After</c:v></c:pt></c:strCache></c:strRef></c:cat><c:val><c:numRef><c:numCache><c:pt idx="0"><c:v>4</c:v></c:pt><c:pt idx="1"><c:v>9</c:v></c:pt></c:numCache></c:numRef></c:val></c:ser></c:bar3DChart></c:plotArea></c:chart></c:chartSpace>'));
  zip.addFile('ppt/slideLayouts/slideLayout1.xml', Buffer.from('<?xml version="1.0"?><p:sldLayout xmlns:p="p"><p:cSld><p:spTree><p:nvGrpSpPr/><p:grpSpPr/></p:spTree></p:cSld></p:sldLayout>'));
  zip.addFile('ppt/slideLayouts/_rels/slideLayout1.xml.rels', Buffer.from(rels([['rId1', 'slideMaster', '../slideMasters/slideMaster1.xml']])));
  zip.addFile('ppt/slideMasters/slideMaster1.xml', Buffer.from('<?xml version="1.0"?><p:sldMaster xmlns:p="p"><p:cSld><p:spTree><p:nvGrpSpPr/><p:grpSpPr/></p:spTree></p:cSld></p:sldMaster>'));
  zip.addFile('ppt/media/image1.png', Buffer.from('89504e470d0a1a0a00000000', 'hex'));
  zip.addFile('ppt/media/audio1.m4a', Buffer.from('phase-5-audio'));
  zip.addFile('ppt/media/video1.mp4', Buffer.from('phase-5-video'));
  return { originalname: 'phase-4-compatibility.pptx', buffer: zip.toBuffer() };
};

const phase5ComplexStructureFixture = () => {
  const source = fixture();
  const zip = new AdmZip(source.buffer);
  const slide = zip.readAsText('ppt/slides/slide1.xml').replace('</p:spTree>', `
    <p:grpSp><p:nvGrpSpPr><p:cNvPr id="20" name="Outer Group"/></p:nvGrpSpPr><p:grpSpPr><a:xfrm rot="5400000"><a:off x="1000000" y="1000000"/><a:ext cx="4000000" cy="2000000"/><a:chOff x="0" y="0"/><a:chExt cx="4000000" cy="2000000"/></a:xfrm></p:grpSpPr>
      <p:sp><p:nvSpPr><p:cNvPr id="21" name="Outer child"/></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="1200000"/><a:ext cx="500000" cy="500000"/></a:xfrm><a:prstGeom prst="rect"/></p:spPr></p:sp>
      <p:grpSp><p:nvGrpSpPr><p:cNvPr id="22" name="Inner Group"/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="1000000" y="0"/><a:ext cx="2000000" cy="1000000"/><a:chOff x="0" y="0"/><a:chExt cx="2000000" cy="1000000"/></a:xfrm></p:grpSpPr>
        <p:sp><p:nvSpPr><p:cNvPr id="23" name="Nested child"/></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1000000" cy="500000"/></a:xfrm><a:prstGeom prst="ellipse"/></p:spPr></p:sp>
      </p:grpSp>
    </p:grpSp>
    <p:sp><p:nvSpPr><p:cNvPr id="24" name="Custom teaching shape"/></p:nvSpPr><p:spPr><a:xfrm><a:off x="6000000" y="2800000"/><a:ext cx="1200000" cy="900000"/></a:xfrm><a:custGeom><a:avLst/><a:gdLst/><a:pathLst><a:path w="100" h="100"><a:moveTo><a:pt x="0" y="0"/></a:moveTo><a:lnTo><a:pt x="100" y="0"/></a:lnTo><a:lnTo><a:pt x="50" y="100"/></a:lnTo><a:close/></a:path></a:pathLst></a:custGeom><a:solidFill><a:srgbClr val="F59E0B"/></a:solidFill></p:spPr></p:sp>
    <p:cxnSp><p:nvCxnSpPr><p:cNvPr id="25" name="Arrow connector"/><p:cNvCxnSpPr><a:stCxn id="21" idx="0"/><a:endCxn id="23" idx="0"/></p:cNvCxnSpPr></p:nvCxnSpPr><p:spPr><a:xfrm><a:off x="5000000" y="4000000"/><a:ext cx="1500000" cy="100000"/></a:xfrm><a:prstGeom prst="straightConnector1"/><a:ln w="25400"><a:solidFill><a:srgbClr val="2563EB"/></a:solidFill><a:headEnd type="triangle"/><a:tailEnd type="triangle"/></a:ln></p:spPr></p:cxnSp>
    <p:sp><p:nvSpPr><p:cNvPr id="26" name="Inherited placeholder"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="7"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="600000" y="4200000"/><a:ext cx="3000000" cy="600000"/></a:xfrm><a:prstGeom prst="rect"/></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Inherited style</a:t></a:r></a:p></p:txBody></p:sp>
  </p:spTree>`);
  zip.updateFile('ppt/slides/slide1.xml', Buffer.from(slide));
  zip.updateFile('ppt/slideLayouts/slideLayout1.xml', Buffer.from(`<?xml version="1.0"?><p:sldLayout xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree><p:nvGrpSpPr/><p:grpSpPr/><p:sp><p:nvSpPr><p:cNvPr id="7" name="Inherited body"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="7"/></p:nvPr></p:nvSpPr><p:spPr><a:solidFill><a:srgbClr val="DCFCE7"/></a:solidFill><a:ln w="25400"><a:solidFill><a:srgbClr val="15803D"/></a:solidFill></a:ln></p:spPr><p:style><a:fontRef idx="minor"><a:srgbClr val="14532D"/></a:fontRef></p:style><p:txBody><a:bodyPr anchor="ctr"/><a:lstStyle><a:lvl1pPr><a:defRPr sz="2800" b="1"><a:latin typeface="Calibri"/></a:defRPr></a:lvl1pPr></a:lstStyle></p:txBody></p:sp></p:spTree></p:cSld></p:sldLayout>`));
  return { originalname: 'phase-5-complex-structures.pptx', buffer: zip.toBuffer() };
};

const phase5AdvancedCompatibilityFixture = () => {
  const source = fixture();
  const zip = new AdmZip(source.buffer);
  const advancedFrames = `
    <p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="40" name="Teaching process SmartArt"/></p:nvGraphicFramePr><p:xfrm><a:off x="500000" y="3200000"/><a:ext cx="2500000" cy="1200000"/></p:xfrm><a:graphic><a:graphicData uri="diagram"><dgm:relIds xmlns:dgm="dgm" r:dm="rId10" r:lo="rId11"/></a:graphicData></a:graphic></p:graphicFrame>
    <p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="41" name="Interactive molecule"/></p:nvGraphicFramePr><p:xfrm><a:off x="3300000" y="3200000"/><a:ext cx="1800000" cy="1200000"/></p:xfrm><a:graphic><a:graphicData uri="model3d"><am3d:model3D xmlns:am3d="am3d" r:embed="rId12"><am3d:camera prst="perspectiveFront"/><am3d:lightRig rig="soft"/></am3d:model3D></a:graphicData></a:graphic></p:graphicFrame>
    <p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="42" name="Workbook chart"/></p:nvGraphicFramePr><p:xfrm><a:off x="5400000" y="3200000"/><a:ext cx="2500000" cy="1200000"/></p:xfrm><a:graphic><a:graphicData uri="chart"><c:chart xmlns:c="c" r:id="rId13"/></a:graphicData></a:graphic></p:graphicFrame>`;
  let slide = zip.readAsText('ppt/slides/slide1.xml').replace('</p:spTree>', `${advancedFrames}</p:spTree>`);
  slide = slide.replace('<p:timing/>', `<p:timing><p:tnLst><p:par><p:cTn id="1"><p:childTnLst><p:animMotion path="M 0 0 L 0.25 0.1 E"><p:cBhvr><p:cTn id="2" dur="1200" repeatCount="2"/><p:tgtEl><p:spTgt spid="2"/></p:tgtEl></p:cBhvr></p:animMotion><p:animRot by="10800000"><p:cBhvr><p:cTn id="3" dur="900"/><p:tgtEl><p:spTgt spid="3"/></p:tgtEl></p:cBhvr></p:animRot></p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>`);
  zip.updateFile('ppt/slides/slide1.xml', Buffer.from(slide));
  zip.updateFile('ppt/slides/_rels/slide1.xml.rels', Buffer.from(rels([
    ['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'], ['rId2', 'image', '../media/image1.png'],
    ['rId10', 'diagramData', '../diagrams/data1.xml'], ['rId11', 'diagramLayout', '../diagrams/layout1.xml'],
    ['rId12', 'model3d', '../media/model1.glb'], ['rId13', 'chart', '../charts/chart2.xml'],
  ])));
  zip.addFile('ppt/diagrams/data1.xml', Buffer.from('<?xml version="1.0"?><dgm:dataModel xmlns:dgm="dgm" xmlns:a="a"><dgm:ptLst><dgm:pt modelId="root"><dgm:t><a:p><a:r><a:t>Investigate</a:t></a:r></a:p></dgm:t></dgm:pt><dgm:pt modelId="child"><dgm:t><a:p><a:r><a:t>Explain</a:t></a:r></a:p></dgm:t></dgm:pt></dgm:ptLst><dgm:cxnLst><dgm:cxn srcId="root" destId="child" type="parOf"/></dgm:cxnLst></dgm:dataModel>'));
  zip.addFile('ppt/diagrams/layout1.xml', Buffer.from('<?xml version="1.0"?><dgm:layoutDef xmlns:dgm="dgm" uniqueId="basic-process"><dgm:title val="Basic Process"/></dgm:layoutDef>'));
  zip.addFile('ppt/media/model1.glb', Buffer.from('glTF-phase-5-model'));
  zip.addFile('ppt/charts/chart2.xml', Buffer.from('<?xml version="1.0"?><c:chartSpace xmlns:c="c" xmlns:r="r"><c:externalData r:id="rIdWorkbook"/><c:chart><c:title><c:tx><c:v>Workbook progress</c:v></c:tx></c:title><c:plotArea><c:lineChart><c:ser><c:tx><c:strRef><c:f>Sheet1!$B$1</c:f></c:strRef></c:tx><c:cat><c:strRef><c:f>Sheet1!$A$2:$A$3</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>Sheet1!$B$2:$B$3</c:f></c:numRef></c:val></c:ser></c:lineChart></c:plotArea></c:chart></c:chartSpace>'));
  zip.addFile('ppt/charts/_rels/chart2.xml.rels', Buffer.from(rels([['rIdWorkbook', 'package', '../embeddings/chartData.xlsx']])));
  const workbook = new AdmZip();
  workbook.addFile('[Content_Types].xml', Buffer.from('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'));
  workbook.addFile('xl/workbook.xml', Buffer.from('<?xml version="1.0"?><workbook xmlns:r="r"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>'));
  workbook.addFile('xl/_rels/workbook.xml.rels', Buffer.from(rels([['rId1', 'worksheet', 'worksheets/sheet1.xml']])));
  workbook.addFile('xl/worksheets/sheet1.xml', Buffer.from('<?xml version="1.0"?><worksheet><sheetData><row r="1"><c r="B1" t="inlineStr"><is><t>Score</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>Before</t></is></c><c r="B2"><v>4</v></c></row><row r="3"><c r="A3" t="inlineStr"><is><t>After</t></is></c><c r="B3"><v>9</v></c></row></sheetData></worksheet>'));
  zip.addFile('ppt/embeddings/chartData.xlsx', workbook.toBuffer());
  return { originalname: 'phase-5-advanced-compatibility.pptx', buffer: zip.toBuffer() };
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
  assert.equal(document.resources.length, 2);
  const importedImage = document.resources.find((resource) => resource.media_type === 'image/png');
  assert.ok(importedImage);
  assert.ok(firstSourceSlide.elements.some((element) => element.resource_reference?.source_id === importedImage.source_id));
  assert.ok(document.resources.some((resource) => resource.metadata?.usage === 'pptx_round_trip_source'));
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
  assert.equal(calls.resources.length, 2);
  assert.ok(calls.screens[0].savedElements.some((element) => element.position.groupId));
  assert.ok(calls.screens[0].savedElements.some((element) => Array.isArray(element.content.importSource.group?.hierarchy)));
});

test('PPTX validation rejects legacy extension and XML entities', async () => {
  await assert.rejects(() => preflightPptxImport({ file: { ...fixture(), originalname: 'legacy.ppt' } }), /Only password-free \.pptx/);
  const unsafe = fixture();
  const zip = new AdmZip(unsafe.buffer);
  zip.updateFile('ppt/slides/slide1.xml', Buffer.from('<?xml version="1.0"?><!DOCTYPE x [<!ENTITY y "z">]><p:sld xmlns:p="p"/>'));
  await assert.rejects(() => preflightPptxImport({ file: { originalname: 'unsafe.pptx', buffer: zip.toBuffer() } }), /forbidden XML/);
});

test('Phase 5 baseline protects editable teaching objects, grouped media, and supported transitions', async () => {
  const document = await buildPptxImportDocument({ file: phase4CompatibilityFixture(), options: { animations: true } });
  const screen = document.screens[0];
  const kinds = screen.elements.reduce((counts, element) => ({
    ...counts,
    [element.kind]: (counts[element.kind] || 0) + 1,
  }), {});

  assert.deepEqual(kinds, { table: 1, chart: 1, equation: 1, image: 1, audio: 1, video: 1 });
  assert.deepEqual(screen.elements.find((element) => element.kind === 'table').content.rows, [['Concept', 'Value'], ['Angle', '45']]);
  assert.equal(screen.elements.find((element) => element.kind === 'chart').content.sourceChartType, 'bar3DChart');
  assert.match(screen.elements.find((element) => element.kind === 'equation').content.latex, /x/);
  const grouped = screen.elements.filter((element) => ['equation', 'image', 'audio', 'video'].includes(element.kind));
  assert.equal(new Set(grouped.map((element) => element.group?.source_id)).size, 1);
  assert.ok(grouped.every((element) => element.group?.source_id));
  assert.deepEqual(document.resources.map((resource) => resource.media_type).sort(), ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'audio/mp4', 'image/png', 'video/mp4']);
  assert.equal(screen.transition.effect, 'split');
  assert.equal(screen.transition.option, 'vertical-out');
  assert.ok(document.issues.some((issue) => issue.code === 'PPTX_CHART_APPROXIMATED'));
});

test('Phase 5 baseline keeps database contracts compatible with imported tables and audio', () => {
  const migration = fs.readFileSync(new URL('../scripts/intelligence_classroom_studio/004_add_audio_and_document_resource_types.sql', import.meta.url), 'utf8');
  const canonicalSchema = fs.readFileSync(new URL('../scripts/intelligence_classroom_studio/001_spectropy_studio_curriculum_schema.sql', import.meta.url), 'utf8');

  for (const sql of [migration, canonicalSchema]) {
    assert.match(sql, /resource_type[\s\S]*'audio'/i);
    assert.match(sql, /element_type[\s\S]*'table'/i);
  }
});

test('Phase 5B preserves nested transforms, custom paths, connector arrows, and inherited placeholder styling', async () => {
  const document = await buildPptxImportDocument({ file: phase5ComplexStructureFixture() });
  const screen = document.screens.find((entry) => entry.source_id.endsWith('slide1.xml'));
  const byName = (name) => screen.elements.find((element) => element.metadata?.name === name);
  const outer = byName('Outer child');
  const nested = byName('Nested child');
  const custom = byName('Custom teaching shape');
  const connector = byName('Arrow connector');
  const inherited = byName('Inherited placeholder');

  assert.equal(outer.group.source_id, nested.group.source_id);
  assert.equal(outer.group.hierarchy.length, 1);
  assert.equal(nested.group.hierarchy.length, 2);
  assert.equal(Math.round(nested.rotation), 90);
  assert.equal(Math.round(nested.bounds.x), 3250000);
  assert.equal(Math.round(nested.bounds.y), 1250000);
  assert.equal(custom.content.kind, 'custom-geometry');
  assert.equal(custom.content.customPath, 'M0 0 L200 0 L100 120 Z');
  assert.equal(connector.content.arrowStart, true);
  assert.equal(connector.content.arrowEnd, true);
  assert.equal(connector.metadata.connector.startConnectionId, '21');
  assert.equal(connector.metadata.connector.endConnectionId, '23');
  assert.equal(inherited.content.fill.toLowerCase(), '#dcfce7');
  assert.equal(inherited.content.stroke.toLowerCase(), '#15803d');
  assert.equal(inherited.content.bold, true);
  assert.equal(inherited.content.verticalAlignment, 'middle');
});

test('Phase 5C-F reconstructs SmartArt, embedded 3D, advanced animations, and workbook charts', async () => {
  const document = await buildPptxImportDocument({ file: phase5AdvancedCompatibilityFixture(), options: { animations: true } });
  const screen = document.screens.find((entry) => entry.source_id.endsWith('slide1.xml'));
  const diagram = screen.elements.find((element) => element.kind === 'diagram');
  const model = screen.elements.find((element) => element.metadata?.name === 'Interactive molecule');
  const chart = screen.elements.find((element) => element.metadata?.name === 'Workbook chart');
  const title = screen.elements.find((element) => element.metadata?.pptx_shape_id === '2');
  const diamond = screen.elements.find((element) => element.metadata?.pptx_shape_id === '3');

  assert.equal(diagram.content.visualType, 'smart_diagram');
  assert.equal(diagram.content.category, 'process');
  assert.equal(diagram.content.nodes[1].parentId, diagram.content.nodes[0].id);
  assert.equal(model.kind, 'embedded_object');
  assert.equal(model.content.model3d.environment, 'soft');
  assert.equal(document.resources.find((resource) => resource.metadata?.resource_type === 'model_3d').media_type, 'model/gltf-binary');
  assert.deepEqual(chart.content.data.labels, ['Before', 'After']);
  assert.deepEqual(chart.content.data.datasets[0].data, [4, 9]);
  assert.equal(title.content.animation.effects[0].effect, 'path-custom');
  assert.equal(title.content.animation.effects[0].repeat, 2);
  assert.equal(diamond.content.animation.effects[0].effect, 'spin');
  assert.ok(document.issues.some((issue) => issue.code === 'PPTX_SMARTART_STYLE_APPROXIMATED'));
  assert.ok(document.issues.some((issue) => issue.code === 'PPTX_3D_VIEW_APPROXIMATED'));
  assert.ok(document.issues.some((issue) => issue.code === 'PPTX_CHART_WORKBOOK_IMPORTED'));
});
