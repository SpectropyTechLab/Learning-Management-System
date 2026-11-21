import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Usage: node scripts/extract-biology-labs.mjs <biolab.html>');

const html = fs.readFileSync(sourcePath, 'utf8');
const scriptJson = (type) => {
  const marker = `<script type="${type}">`;
  const start = html.indexOf(marker);
  if (start < 0) throw new Error(`Missing ${type} data in ${sourcePath}`);
  const contentStart = start + marker.length;
  const end = html.indexOf('</script>', contentStart);
  return JSON.parse(html.slice(contentStart, end));
};

const manifest = scriptJson('__bundler/manifest');
const externalResources = scriptJson('__bundler/ext_resources');
const decoded = new Map();
for (const [id, entry] of Object.entries(manifest)) {
  let bytes = Buffer.from(entry.data || '', 'base64');
  if (entry.compressed) bytes = zlib.gunzipSync(bytes);
  decoded.set(id, bytes);
}

const outputDirectory = path.resolve('public/studio-labs/biology');
fs.mkdirSync(outputDirectory, { recursive: true });
for (const [id, bytes] of decoded.entries()) fs.writeFileSync(path.join(outputDirectory, id), bytes);
for (const resource of externalResources) {
  if (!resource?.id || !resource?.uuid || !decoded.has(resource.uuid) || !String(resource.id).startsWith('./')) continue;
  const relativeName = String(resource.id).slice(2);
  if (!relativeName || relativeName.includes('..') || path.isAbsolute(relativeName)) continue;
  fs.writeFileSync(path.join(outputDirectory, relativeName), decoded.get(resource.uuid));
}
const runtimeAliases = {
  'support.js': 'adb7e60e-db2d-4e72-8755-4fa29a47f42c',
  'sims-core.js': '5c232033-9842-4414-a676-e9b58aaba57b',
  'sims-a.js': '0ff2a072-1165-4896-abfa-8dd20cd107e0',
  'sims-b.js': '3e61658d-b75d-4eba-8dbe-6f575d790377',
  'sims-c.js': 'f9dc7e1d-6898-4872-a8bd-de0d4e941d7d',
  'sims-d.js': '2c3dad3e-63ed-48af-81be-6716e62c57d0',
};
for (const [name, id] of Object.entries(runtimeAliases)) {
  if (!decoded.has(id)) throw new Error(`Biology Lab runtime asset ${id} is missing.`);
  fs.writeFileSync(path.join(outputDirectory, name), decoded.get(id));
}

const makeImportedPanelResponsive = (fileName, className) => {
  const filePath = path.join(outputDirectory, fileName);
  let source = fs.readFileSync(filePath, 'utf8');
  source = source.replace('<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;', `<div class="${className}" style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;`);
  source = source.replace('</head>', `<style>
.${className}{width:100%;max-width:none;box-sizing:border-box;display:grid!important;grid-template-columns:minmax(190px,260px) minmax(420px,1fr) minmax(220px,340px);gap:12px!important;align-items:start!important;padding:0!important}
.${className}>div{max-width:none!important;min-width:0!important;box-sizing:border-box}
.${className}>div:first-child{max-height:calc(100vh - 32px)!important;overflow-y:auto!important;scrollbar-gutter:stable}
@media(max-width:1100px){.${className}{grid-template-columns:minmax(180px,230px) minmax(0,1fr)}.${className}>div:last-child{grid-column:1/-1;display:grid!important;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px!important}}
@media(max-width:760px){.${className}{display:flex!important;flex-direction:column}.${className}>div{width:100%!important}.${className}>div:first-child{max-height:260px!important}}
</style></head>`);
  fs.writeFileSync(filePath, source);
};
makeImportedPanelResponsive('BioExperiments.dc.html', 'spectropy-bio-experiment');
makeImportedPanelResponsive('BioConcepts.dc.html', 'spectropy-bio-concept');

let template = scriptJson('__bundler/template');
for (const [name, id] of Object.entries(runtimeAliases)) template = template.replaceAll(id, name);
const topicByPrefix = {
  scope: ['microscopy', 'Microscopy & Cells', '#2563eb'],
  prep: ['slide-preparation', 'Slide Preparation', '#7c3aed'],
  dissect: ['dissection', 'Dissection', '#db2777'],
  models: ['models-anatomy', 'Models & Anatomy', '#0891b2'],
  exp: ['experiments', 'Experiments', '#16a34a'],
  con: ['concepts', 'Concept Visualisations', '#ca8a04'],
};
const entries = new Map();
const curriculumPattern = /\[\s*(['"])(.*?)\1\s*,\s*(['"])(Class\s+[0-9 ·]+)\3\s*,\s*(['"])(scope(?::[a-z0-9]+)?|prep|dissect|models:[a-z0-9]+|exp:[a-z0-9]+|con:[a-z0-9]+)\5\s*\]/gi;
for (const match of template.matchAll(curriculumPattern)) {
  const title = match[2];
  const classLabel = match[4];
  const launchKey = match[6];
  const prefix = launchKey.split(':')[0];
  const topic = topicByPrefix[prefix];
  if (!topic) continue;
  const classes = [...classLabel.matchAll(/\d+/g)].map((value) => Number(value[0])).filter(Number.isFinite);
  const current = entries.get(launchKey);
  if (current) {
    current.classes = [...new Set([...current.classes, ...classes])].sort((a, b) => a - b);
    continue;
  }
  entries.set(launchKey, {
    id: launchKey.replace(':', '-'), subject: 'biology', launchKey, title,
    topic: topic[0], topicLabel: topic[1], topicColour: topic[2], classes,
    mode: prefix,
  });
}
const labs = [...entries.values()];
const topics = Object.fromEntries(Object.values(topicByPrefix).map(([id, label, colour]) => [id, { label, colour }]));
template = template.replace(
  "componentDidMount() {\n    this.onFs =",
  "componentDidMount() {\n    const requestedLab = new URLSearchParams(location.search).get('lab'); if(requestedLab) setTimeout(() => this.goCurr(requestedLab), 0);\n    this.onFs =",
);
template = template.replace(
  "goCurr(w) {\n    if (!w) return;",
  "goCurr(w) {\n    if (!w) return; try { window.parent.postMessage({type:'spectropy-biology-lab-selected',labId:String(w).replace(':','-'),launchKey:w},location.origin); } catch (err) {}",
);
template = template.replace(
  '<div ref="{{ rootRef }}" style="max-width:{{ fsMax }};',
  '<div class="spectropy-biology-root" ref="{{ rootRef }}" style="max-width:{{ fsMax }};',
);
template = template.replace(
  '<a href="Anatomy%203D%20Lab.html" style="padding:8px 14px;border-radius:8px;background:#2f6b4f;color:#ffffff;font-size:14px;font-weight:600;white-space:nowrap;flex:none;text-decoration:none">Realistic 3D models →</a>',
  '<button sc-camel-on-click="{{ openRealistic3D }}" style="padding:8px 14px;border-radius:8px;border:none;background:#2f6b4f;color:#ffffff;font-size:14px;font-weight:600;white-space:nowrap;flex:none;cursor:pointer">Realistic 3D model library →</button>',
);
template = template.replace(
  "if (k === '3d') { window.location.href = 'Anatomy%203D%20Lab.html?m=' + v; return; }",
  "if (k === '3d') { this.setState({ tab: 'models', mView: 'anat', anatOrgan: ['heart','eye','ear','brain','kidney','skeleton'].includes(v) ? v : 'heart', anatSel: null, quiz: null }); return; }",
);
template = template.replace(
  "modelTabs: [['cell'",
  "openRealistic3D: () => { try { window.parent.postMessage({ type: 'spectropy-open-biology-3d-library' }, location.origin); } catch (err) {} },\n      modelTabs: [['cell'",
);
template = template.replace('</head>', `<style>
html,body{width:100%;min-height:100%;overflow-x:hidden}
body.spectropy-embed header{display:none!important}
:is(body.spectropy-embed,body.spectropy-author)>div,:is(body.spectropy-embed,body.spectropy-author) x-dc{min-height:100vh!important;width:100%!important;max-width:none!important}
:is(body.spectropy-embed,body.spectropy-author) .spectropy-biology-root{width:100%!important;max-width:none!important;min-height:100vh!important;margin:0!important;padding:12px 16px 24px!important;gap:12px!important;overflow:auto!important}
:is(body.spectropy-embed,body.spectropy-author) .spectropy-biology-root [style*="max-width:520px"],:is(body.spectropy-embed,body.spectropy-author) .spectropy-biology-root [style*="max-width:560px"]{max-width:min(72vh,100%)!important}
:is(body.spectropy-embed,body.spectropy-author) dc-import{display:block!important;width:100%!important;min-width:0!important}
@media(max-width:1100px){:is(body.spectropy-embed,body.spectropy-author) .spectropy-biology-root{padding:10px!important}}
</style></head>`);
template = template.replace('</body>', `<script>{const p=new URLSearchParams(location.search);if(p.get('embed')==='1')document.body.classList.add('spectropy-embed');if(p.get('author')==='1')document.body.classList.add('spectropy-author')}</script></body>`);
fs.writeFileSync(path.join(outputDirectory, 'biology-lab.html'), template);
fs.writeFileSync(path.join(outputDirectory, 'biology-lab-catalog.json'), `${JSON.stringify({ schema: 'spectropy.biology-lab-catalog.v1', topics, labs }, null, 2)}\n`);
console.log(`Extracted ${labs.length} Biology Lab activities into ${outputDirectory}`);
