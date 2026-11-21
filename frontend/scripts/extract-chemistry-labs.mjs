import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Usage: node scripts/extract-chemistry-labs.mjs <chemlab.html>');

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

const chemistryRuntimeId = Object.keys(manifest).find((id) => {
  const entry = manifest[id];
  return String(entry.mime || '').includes('javascript') && decoded.get(id)?.toString('utf8').includes('window.LAB={exps:E,cats,UI}');
});
if (!chemistryRuntimeId) throw new Error('Chemistry Lab experiment runtime was not found.');
const chemistryRuntime = decoded.get(chemistryRuntimeId).toString('utf8');

const sandbox = { window: {}, console, Math, Date, setTimeout, clearTimeout };
sandbox.window.window = sandbox.window;
vm.runInNewContext(chemistryRuntime, sandbox, { filename: chemistryRuntimeId });
const sourceLab = sandbox.window.LAB;
if (!sourceLab?.exps?.length) throw new Error('Chemistry Lab runtime did not expose experiments.');

const slug = (value) => String(value).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const topics = Object.fromEntries(Object.entries(sourceLab.cats).map(([label, colour]) => [slug(label), { label, colour }]));
const labs = sourceLab.exps.map((lab) => {
  const topic = slug(lab.cat);
  const procedure = lab.mode === 'titr'
    ? ['Prepare and rinse the burette.', 'Transfer the measured sample to the flask.', 'Add the specified indicator.', 'Titrate slowly to the end point.', 'Repeat until concordant readings are obtained.']
    : lab.mode === 'heatcurve' || lab.mode === 'heat'
      ? ['Place the thermometer correctly.', 'Heat the sample gently.', 'Record temperature against time.', 'Identify phase-change plateaus.', 'Plot and interpret the heating curve.']
      : lab.mode === 'chroma'
        ? ['Prepare the baseline.', 'Apply small concentrated sample spots.', 'Place the strip in the solvent chamber.', 'Allow the solvent front to rise.', 'Calculate the Rf values.']
        : lab.mode === 'kinetics' || lab.mode === 'kin'
          ? ['Choose concentration and temperature.', 'Prepare the reactants.', 'Start the reaction and stopwatch.', 'Stop when the visual end point is reached.', 'Repeat and compare reaction rates.']
          : (lab.acts || []).map((action) => action.t);
  return {
    id: lab.id,
    subject: 'chemistry',
    title: lab.title,
    topic,
    topicLabel: lab.cat,
    topicColour: sourceLab.cats[lab.cat] || '#0E7C66',
    classes: lab.g || [],
    aim: lab.aim || '',
    theory: lab.th || '',
    apparatus: String(lab.app || '').split(',').map((item) => item.trim()).filter(Boolean),
    safety: lab.safety || '',
    procedure,
    result: lab.res || '',
    mode: lab.mode || 'steps',
    meterCount: (lab.meters || []).length,
    actionCount: (lab.acts || []).length,
    vivaCount: (lab.viva || []).length,
    hasObservations: true,
    hasCalculations: ['titr', 'chroma', 'kinetics', 'kin'].includes(lab.mode) || Boolean(lab.calc),
  };
});

const outputDirectory = path.resolve('public/studio-labs/chemistry');
fs.mkdirSync(outputDirectory, { recursive: true });
for (const [id, bytes] of decoded.entries()) fs.writeFileSync(path.join(outputDirectory, id), bytes);
for (const resource of externalResources) {
  if (!resource?.id || !resource?.uuid || !decoded.has(resource.uuid)) continue;
  if (!String(resource.id).startsWith('./')) continue;
  const relativeName = String(resource.id).slice(2);
  if (!relativeName || relativeName.includes('..') || path.isAbsolute(relativeName)) continue;
  fs.writeFileSync(path.join(outputDirectory, relativeName), decoded.get(resource.uuid));
}
fs.writeFileSync(path.join(outputDirectory, 'chemistry-labs-runtime.js'), chemistryRuntime);

let template = scriptJson('__bundler/template');
template = template.replace(
  "let id=null;try{id=localStorage.getItem('chemlab-v2-last')}catch(e){}",
  "let id=new URLSearchParams(location.search).get('lab')||null;try{if(!id)id=localStorage.getItem('chemlab-v2-last')}catch(e){}",
);
template = template.replace(
  "load(id){\n    const e=window.LAB.exps.find(x=>x.id===id);",
  "load(id){\n    const e=window.LAB.exps.find(x=>x.id===id);if(!e)return;try{window.parent.postMessage({type:'spectropy-chemistry-lab-selected',labId:id},location.origin)}catch(err){}",
);
const theoryButton = '<button sc-camel-on-click="{{toggleInfo}}" style="height:46px;padding:0 16px;border-radius:11px;border:1px solid #C9CFC6;background:{{infoBtnBg}};font-weight:600;font-size:14px;cursor:pointer;color:#1B2420;white-space:nowrap">Theory &amp; results</button>';
template = template.replace(theoryButton, '');
template = template.replace(
  '<button sc-camel-on-click="{{onReset}}" style="height:44px;padding:0 16px;border-radius:10px;border:1px solid #C9CFC6;background:#fff;font-size:14px;font-weight:600;cursor:pointer;color:#1B2420">Reset</button>',
  '<button sc-camel-on-click="{{onReset}}" style="height:44px;padding:0 16px;border-radius:10px;border:1px solid #C9CFC6;background:#fff;font-size:14px;font-weight:600;cursor:pointer;color:#1B2420">Reset</button>' + theoryButton,
);
template = template.replace('</head>', `<style>
body.spectropy-embed header{display:none!important}
body.spectropy-embed aside{display:none!important}
body.spectropy-embed main+aside{display:block!important;position:static!important;flex:0 0 min(380px,36vw);width:min(380px,36vw);min-width:300px;padding:10px 10px 10px 0!important;overflow:auto;filter:none}
body.spectropy-embed main+aside>div{min-height:100%;background:#FAFAF6}
body.spectropy-embed>div,body.spectropy-embed x-dc{min-height:100vh!important}
body.spectropy-embed main{padding-top:0!important}
</style></head>`);
template = template.replace('</body>', `<script>if(new URLSearchParams(location.search).get('embed')==='1')document.body.classList.add('spectropy-embed')</script></body>`);
fs.writeFileSync(path.join(outputDirectory, 'chemistry-lab.html'), template);
fs.writeFileSync(
  path.join(outputDirectory, 'chemistry-lab-catalog.json'),
  `${JSON.stringify({ schema: 'spectropy.chemistry-lab-catalog.v1', topics, labs }, null, 2)}\n`,
);

console.log(`Extracted ${labs.length} Chemistry labs across ${Object.keys(topics).length} topics into ${outputDirectory}`);
