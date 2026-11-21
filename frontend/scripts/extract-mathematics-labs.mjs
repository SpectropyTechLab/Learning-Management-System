import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Usage: node scripts/extract-mathematics-labs.mjs <mathlab.html>');

const html = fs.readFileSync(sourcePath, 'utf8');
const functionStart = html.indexOf('function buildActs()');
const runtimeStart = html.indexOf('(function(){', functionStart);
if (functionStart < 0 || runtimeStart < 0) throw new Error('The Mathematics Lab activity engine was not found.');
const activityRuntime = html.slice(functionStart, runtimeStart);
const sandbox = { console, Math, Date, setTimeout, clearTimeout };
vm.runInNewContext(`${activityRuntime}\nthis.__MATH_LAB__=buildActs();`, sandbox, { filename: 'mathematics-labs-runtime.js' });
const sourceLab = sandbox.__MATH_LAB__;
if (!sourceLab?.acts?.length) throw new Error('The Mathematics Lab runtime did not expose activities.');

const slug = (value) => String(value).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const topics = Object.fromEntries(sourceLab.TOP.map(([label, colour]) => [slug(label), { label, colour }]));
const labs = sourceLab.acts.map((lab) => ({
  id: lab.id,
  subject: 'mathematics',
  title: lab.title,
  topic: slug(lab.topic),
  topicLabel: lab.topic,
  topicColour: Object.fromEntries(sourceLab.TOP)[lab.topic] || '#4553D1',
  classes: lab.grades || [],
  aim: lab.aim || '',
  apparatus: lab.equip || [],
  procedure: lab.steps || [],
  conclusion: lab.concl || '',
  tips: lab.tips || [],
  controlCount: (lab.controls || []).length,
  actionCount: (lab.actions || []).length,
  hasReadings: typeof lab.read === 'function',
  hasResult: typeof lab.result === 'function',
  hasDragHandles: typeof lab.handles === 'function',
  hasRotation: Boolean(lab.rotate),
  hasAnimation: typeof lab.tick === 'function',
}));

const outputDirectory = path.resolve('public/studio-labs/mathematics');
fs.mkdirSync(outputDirectory, { recursive: true });
let template = html.replace(
  'const MODE = {"start": "cubeid"};',
  `const __LAB_QUERY__=new URLSearchParams(location.search);\nconst MODE={start:__LAB_QUERY__.get('lab')||'cubeid',only:__LAB_QUERY__.get('embed')==='1'?__LAB_QUERY__.get('lab'):null};`,
);
template = template.replace(
  "function pick(id) { const a = acts.find(x => x.id === id);",
  "function pick(id) { const a = acts.find(x => x.id === id); if(!a)return; try{window.parent.postMessage({type:'spectropy-mathematics-lab-selected',labId:id},location.origin)}catch(_){}",
);
fs.writeFileSync(path.join(outputDirectory, 'mathematics-lab.html'), template);
fs.writeFileSync(path.join(outputDirectory, 'mathematics-labs-runtime.js'), activityRuntime);
fs.writeFileSync(
  path.join(outputDirectory, 'mathematics-lab-catalog.json'),
  `${JSON.stringify({ schema: 'spectropy.mathematics-lab-catalog.v1', topics, labs }, null, 2)}\n`,
);

console.log(`Extracted ${labs.length} Mathematics labs across ${Object.keys(topics).length} topics into ${outputDirectory}`);
