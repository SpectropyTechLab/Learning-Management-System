import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const destination = path.join(root, 'backend', '.env.local');
if (existsSync(destination)) {
  console.log('backend/.env.local already exists; leaving it unchanged.');
  process.exit(0);
}
const executable = path.join(root, 'node_modules', '@supabase', 'cli-windows-x64', 'bin', 'supabase.exe');
const result = spawnSync(executable, ['status', '-o', 'env'], { cwd: root, encoding: 'utf8' });
if (result.status !== 0) throw new Error('Start local Supabase before creating backend/.env.local');
const values = Object.fromEntries(result.stdout.split(/\r?\n/).map((line) => {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  return match ? [match[1], match[2].replace(/^"|"$/g, '')] : [];
}).filter((entry) => entry.length === 2));
for (const key of ['DB_URL', 'API_URL', 'SERVICE_ROLE_KEY']) {
  if (!values[key]) throw new Error(`Local Supabase status omitted ${key}`);
}
const credentials = [
  'LOCAL_DEV=true',
  `DATABASE_URL=${values.DB_URL}`,
  `SUPABASE_URL=${values.API_URL}`,
  `SUPABASE_SERVICE_KEY=${values.SERVICE_ROLE_KEY}`,
  `JWT_SECRET=${randomBytes(32).toString('hex')}`,
  'SUPABASE_BUCKET=local-lms',
  'COMMUNITY_MEDIA_BUCKET=local-lms',
  'TEACHING_SESSION_TRACKER_BUCKET=local-teaching-sessions',
  'EXAM_ATTEMPT_SWEEP_ENABLED=false',
  'SUPER_ADMIN_EMAIL=admin@local.test',
  `SUPER_ADMIN_PASSWORD=${randomBytes(12).toString('hex')}`,
  'SUPER_ADMIN_NAME=Local Admin',
  'CONTENT_AUTH_EMAIL=author@local.test',
  `CONTENT_AUTH_PASSWORD=${randomBytes(12).toString('hex')}`,
  'CONTENT_AUTH_NAME=Local Author',
];
writeFileSync(destination, `${credentials.join('\n')}\n`, { flag: 'wx' });
console.log('Created ignored backend/.env.local with local-only settings and random development passwords.');
