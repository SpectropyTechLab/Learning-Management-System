import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Usage: node scripts/extract-physics-labs.mjs <physicslab.html>');

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
const runtimeParts = [];
for (const [id, entry] of Object.entries(manifest)) {
  if (!String(entry.mime || '').includes('javascript')) continue;
  let bytes = Buffer.from(entry.data || '', 'base64');
  if (entry.compressed) bytes = zlib.gunzipSync(bytes);
  const source = bytes.toString('utf8');
  if (source.includes('window.LabKit') || source.includes('window.LabSims')) {
    runtimeParts.push({ id, source });
  }
}

const sandbox = { window: {}, console, Math, Date, setTimeout, clearTimeout };
sandbox.window.window = sandbox.window;
for (const part of runtimeParts) vm.runInNewContext(part.source, sandbox, { filename: part.id });
const labs = sandbox.window.LabSims || {};

const topics = {
  mech: { label: 'Mechanics', colour: '#ffb547' },
  light: { label: 'Light & Optics', colour: '#4fd6ff' },
  elec: { label: 'Electricity', colour: '#b6f35c' },
  mag: { label: 'Magnetism', colour: '#ff6b9a' },
  sound: { label: 'Sound & Waves', colour: '#b18cff' },
  heat: { label: 'Heat & Matter', colour: '#ff8a5c' },
  meas: { label: 'Measurement', colour: '#3ee0c0' },
  modern: { label: 'Modern Physics', colour: '#a78bfa' },
  math: { label: 'Mathematical Tools', colour: '#38bdf8' },
};

const catalog = Object.entries(labs).map(([id, lab]) => ({
  id,
  subject: 'physics',
  title: lab.title,
  topic: lab.topic,
  topicLabel: topics[lab.topic]?.label || lab.topic,
  topicColour: topics[lab.topic]?.colour || '#4fd6ff',
  classes: lab.grades || [],
  aim: lab.aim || '',
  apparatus: lab.apparatus || [],
  formula: lab.formula || '',
  procedure: lab.procedure || [],
  controlCount: (lab.controls || []).length,
  actionCount: (lab.actions || []).length,
  hasReadings: typeof lab.readings === 'function',
  hasObservationTable: (lab.columns || []).length > 0,
  hasGraph: Boolean(lab.plot),
}));

if (catalog.length !== 129) throw new Error(`Expected 129 Physics labs, extracted ${catalog.length}`);

const outputDirectory = path.resolve('public/studio-labs/physics');
fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(
  path.join(outputDirectory, 'physics-labs-runtime.js'),
  `/* Generated from the approved Physics Lab reference. Do not hand edit. */\n${runtimeParts.map((part) => `\n/* ${part.id} */\n${part.source}`).join('\n')}\n`,
);
fs.writeFileSync(
  path.join(outputDirectory, 'physics-lab-catalog.json'),
  `${JSON.stringify({ schema: 'spectropy.physics-lab-catalog.v1', topics, labs: catalog }, null, 2)}\n`,
);
console.log(`Extracted ${catalog.length} Physics labs into ${outputDirectory}`);
