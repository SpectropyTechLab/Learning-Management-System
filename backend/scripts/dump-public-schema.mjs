// Read-only schema export from the configured hosted database. No table data is copied.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = dotenv.config({ path: path.join(backendRoot, '.env') }).parsed?.DATABASE_URL;
const destination = process.argv[2];
if (!source || !destination) throw new Error('Usage: node scripts/dump-public-schema.mjs <output.sql>');
const url = new URL(source);
if (['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Expected a hosted source database');
const executable = path.resolve(backendRoot, '..', 'node_modules', '@supabase', 'cli-windows-x64', 'bin', 'supabase.exe');
const result = spawnSync(executable, [
  'db', 'dump',
  '--db-url', url.toString(),
  '--schema', 'public',
  '--file', path.resolve(destination),
], {
  env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
  encoding: 'utf8',
});
if (result.status !== 0) {
  // Never include connection strings or process arguments in diagnostic output.
  const message = (result.stderr || '').replaceAll(source, '[redacted]');
  throw new Error(`Schema export failed: ${(result.error?.message || message).slice(0, 1000)}`);
}
console.log(`Public schema exported to ${path.resolve(destination)}; no table rows copied.`);
