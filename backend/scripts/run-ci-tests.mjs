import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testsRoot = path.join(backendRoot, 'tests');

const testFiles = readdirSync(testsRoot)
  .filter((name) => name.endsWith('.test.js'))
  .sort()
  .map((name) => path.join('tests', name));

if (testFiles.length === 0) {
  console.error('No CI backend tests were discovered.');
  process.exit(1);
}

console.log(`Running ${testFiles.length} backend test files.`);

const result = spawnSync(
  process.execPath,
  ['--test', '--test-concurrency=1', ...testFiles],
  {
    cwd: backendRoot,
    stdio: 'inherit',
  },
);

process.exit(result.status ?? 1);
