import test from 'node:test';
import assert from 'node:assert/strict';
import AdmZip from 'adm-zip';
import { pptxTransitionXml, replacePptxSlideTransitionXml } from '../services/studioPptxTransitionCodec.service.js';
import { exportImportedSessionPptx } from '../services/studioPptxExport.service.js';

test('writes exact duration, click and automatic advance timing', () => {
  const xml = pptxTransitionXml({ effect: 'wipe', option: 'top-left', duration: 1.35, advanceOnClick: false, advanceAfterEnabled: true, advanceAfterSeconds: 4.5 });
  assert.match(xml, /p14:dur="1350"/);
  assert.match(xml, /advClick="0"/);
  assert.match(xml, /advTm="4500"/);
  assert.match(xml, /<p:wipe dir="lu"\/>/);
});

test('Switch and Flip serialize only their supported left/right directions', () => {
  assert.match(pptxTransitionXml({ effect: 'switch', option: 'left' }), /<p14:switch dir="l"\/>/);
  assert.match(pptxTransitionXml({ effect: 'flip', option: 'right' }), /<p14:flip dir="r"\/>/);
});

test('Morph uses the PowerPoint 2015 namespace and word matching option', () => {
  const xml = pptxTransitionXml({ effect: 'morph', option: 'words', duration: 2 });
  assert.match(xml, /Requires="p159"/);
  assert.match(xml, /<p159:morph option="byWord"\/>/);
});

test('advanced transitions use Office preset transition markup with a safe fallback', () => {
  const xml = pptxTransitionXml({ effect: 'airplane', option: 'left', duration: 1 });
  assert.match(xml, /Requires="p15"/);
  assert.match(xml, /<p15:prstTrans prst="airplane" invX="1"\/>/);
  assert.match(xml, /<mc:Fallback><p:transition[^>]*><p:fade\/>/);
});

test('replacement preserves slide content and imported custom sound while changing hidden state', () => {
  const source = '<?xml version="1.0"?><p:sld xmlns:p="p" xmlns:r="r"><p:cSld><p:spTree/></p:cSld><p:transition><p:fade/><p:sndAc><p:stSnd loop="1"><p:snd r:embed="rId9" name="Bell"/></p:stSnd></p:sndAc></p:transition><p:timing/></p:sld>';
  const xml = replacePptxSlideTransitionXml(source, { effect: 'push', option: 'right', sound: 'custom' }, true);
  assert.match(xml, /<p:sld[^>]* show="0">/);
  assert.match(xml, /<p:cSld><p:spTree\/><\/p:cSld>/);
  assert.match(xml, /<p:push dir="r"\/>/);
  assert.match(xml, /r:embed="rId9"/);
  assert.equal((xml.match(/<p:sndAc\b/g) || []).length, 2, 'choice and fallback each retain the existing sound action');
});

test('None removes transition XML and restores a hidden slide when requested', () => {
  const source = '<p:sld xmlns:p="p" show="0"><p:cSld/><p:transition><p:fade/></p:transition></p:sld>';
  const xml = replacePptxSlideTransitionXml(source, { effect: 'none' }, false);
  assert.doesNotMatch(xml, /<p:transition/);
  assert.doesNotMatch(xml, / show="0"/);
});

test('session round-trip export updates source slides atomically and embeds custom audio', async () => {
  const source = new AdmZip();
  source.addFile('[Content_Types].xml', Buffer.from('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>'));
  source.addFile('ppt/slides/slide1.xml', Buffer.from('<p:sld xmlns:p="p" xmlns:r="r"><p:cSld><p:spTree/></p:cSld><p:timing/></p:sld>'));
  source.addFile('ppt/slides/_rels/slide1.xml.rels', Buffer.from('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="layout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>'));
  const sourceBuffer = source.toBuffer();
  const queries = [];
  const db = { query: async (sql) => {
    queries.push(sql);
    if (sql.includes('FROM sessions')) return { rows: [{ id: 5, client_id: 9, title: 'Round trip' }] };
    if (sql.includes('FROM screens')) return { rows: [{ id: 7, title: 'Slide', screen_settings_json: {
      hidden: true,
      import: { source_screen_id: 'ppt/slides/slide1.xml', source_resource: { resource_id: 10, resource_version_id: 11 } },
      transition: { effect: 'morph', option: 'characters', duration: 1.4, sound: 'custom', loopSound: true, customSound: { resourceVersionId: 42, name: 'Bell' } },
    } }] };
    if (sql.includes("r.resource_type = 'audio'")) return { rows: [{ id: 42, storage_key: 'sound.wav', original_file_name: 'sound.wav', mime_type: 'audio/wav', client_id: 9 }] };
    if (sql.includes('JOIN resource_versions rv')) return { rows: [{ client_id: 9, resource_type: 'presentation', storage_key: 'source.pptx', original_file_name: 'lesson.pptx', mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }] };
    throw new Error(`Unexpected query: ${sql}`);
  } };
  const storage = { download: async (key) => ({ data: new Blob([key === 'source.pptx' ? sourceBuffer : Buffer.from('wave')]), error: null }) };
  const result = await exportImportedSessionPptx({ sessionId: 5, user: { role: 'super_admin' }, db, storage });
  const exported = new AdmZip(result.buffer);
  const slide = exported.readAsText('ppt/slides/slide1.xml');
  assert.equal(result.fileName, 'lesson.pptx');
  assert.match(slide, /show="0"/);
  assert.match(slide, /<p159:morph option="byChar"\/>/);
  assert.match(slide, /<p:stSnd loop="1">/);
  assert.match(slide, /r:embed="rId2"/);
  assert.ok(exported.getEntry('ppt/media/spectropy-transition-42.wav'));
  assert.match(exported.readAsText('ppt/slides/_rels/slide1.xml.rels'), /relationships\/audio/);
  assert.match(exported.readAsText('[Content_Types].xml'), /Extension="wav" ContentType="audio\/wav"/);
  assert.equal(queries.length, 4);
});
