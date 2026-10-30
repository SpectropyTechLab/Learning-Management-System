import { spawnSync } from 'node:child_process';

const tests = [
  'tests/studio-day4-api.test.js',
  'tests/studio-day5-api.test.js',
  'tests/studio-day6-discovery.test.js',
  'tests/studio-day7-branch-runtime.test.js',
  'tests/studio-day8-developer3-acceptance.test.js',
];

const result = spawnSync(process.execPath, [
  '--test',
  '--test-concurrency=1',
  '--experimental-test-isolation=none',
  ...tests,
], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    JWT_SECRET: process.env.JWT_SECRET || 'studio-day8-test-secret-at-least-32-characters',
    SUPABASE_URL: process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || 'test-only-service-key',
  },
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
