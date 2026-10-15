import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localPath = path.join(backendRoot, '.env.local');
dotenv.config({ path: path.join(backendRoot, '.env') });
const localValues = existsSync(localPath) ? dotenv.parse(readFileSync(localPath)) : {};
dotenv.config({ path: localPath, override: true, quiet: true });

if (process.env.LOCAL_DEV === 'true') {
  const required = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
  const missing = required.filter((name) => !localValues[name]);
  if (missing.length) throw new Error(`Local development configuration is missing: ${missing.join(', ')}`);
  const databaseHost = new URL(process.env.DATABASE_URL).hostname;
  const apiHost = new URL(process.env.SUPABASE_URL).hostname;
  if (!['localhost', '127.0.0.1'].includes(databaseHost) || !['localhost', '127.0.0.1'].includes(apiHost)) {
    throw new Error('LOCAL_DEV=true requires local database and Supabase URLs');
  }
}
