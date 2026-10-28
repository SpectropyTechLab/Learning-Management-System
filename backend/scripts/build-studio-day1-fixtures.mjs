import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(scriptDir, '..');
const sourceDir = path.join(backendDir, 'tests', 'fixtures', 'studio-packages-src');
const outputDir = path.join(backendDir, 'tests', 'fixtures', 'studio-packages');

const packages = [
  ['browser-zip', 'browser-ready.zip'],
  ['scorm-1.2-single', 'scorm-1.2-single-sco.zip'],
  ['scorm-1.2-multi', 'scorm-1.2-multi-sco.zip'],
  ['scorm-2004-single', 'scorm-2004-4th-single-sco.zip'],
  ['scorm-2004-multi', 'scorm-2004-4th-multi-sco.zip'],
];

await mkdir(outputDir, { recursive: true });

const outputs = [];
for (const [sourceName, outputName] of packages) {
  const outputPath = path.join(outputDir, outputName);
  await rm(outputPath, { force: true });
  const zip = new AdmZip();
  zip.addLocalFolder(path.join(sourceDir, sourceName));
  zip.writeZip(outputPath);
  const bytes = await readFile(outputPath);
  outputs.push({
    file: outputName,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    source: sourceName,
  });
}

for (const file of ['external-link.json']) {
  const sourcePath = path.join(sourceDir, file);
  const destinationPath = path.join(outputDir, file);
  const bytes = await readFile(sourcePath);
  await writeFile(destinationPath, bytes);
  outputs.push({
    file,
    bytes: (await stat(destinationPath)).size,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    source: file,
  });
}

const singleHtmlSource = path.join(sourceDir, 'single-html', 'index.html');
const singleHtmlDestination = path.join(outputDir, 'single-file.html');
const singleHtml = await readFile(singleHtmlSource);
await writeFile(singleHtmlDestination, singleHtml);
outputs.push({
  file: 'single-file.html',
  bytes: (await stat(singleHtmlDestination)).size,
  sha256: createHash('sha256').update(singleHtml).digest('hex'),
  source: 'single-html/index.html',
});

outputs.sort((a, b) => a.file.localeCompare(b.file));
await writeFile(
  path.join(outputDir, 'fixture-manifest.json'),
  `${JSON.stringify({ generated_by: 'backend/scripts/build-studio-day1-fixtures.mjs', fixtures: outputs }, null, 2)}\n`,
);

console.log(`Built ${outputs.length} Day 1 fixtures in ${path.relative(backendDir, outputDir)}`);
for (const output of outputs) console.log(`${output.file} ${output.bytes} ${output.sha256}`);
