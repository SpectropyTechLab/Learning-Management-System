import '../config/loadEnv.js';
import supabase from '../config/supabaseClient.js';

if (process.env.LOCAL_DEV !== 'true') throw new Error('Local storage setup requires LOCAL_DEV=true');
const url = new URL(process.env.SUPABASE_URL);
if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Storage API is not local');

const buckets = [process.env.SUPABASE_BUCKET, process.env.TEACHING_SESSION_TRACKER_BUCKET].filter(Boolean);
if (buckets.length !== 2 || new Set(buckets).size !== 2 ||
    !buckets.every((name) => ['local-lms', 'local-teaching-sessions'].includes(name))) {
  throw new Error('Only local-lms and local-teaching-sessions may be configured by this script');
}
if (buckets.length !== 2 || new Set(buckets).size !== 2 ||
    !buckets.every((name) => ['local-lms', 'local-teaching-sessions'].includes(name))) {
  throw new Error('Only local-lms and local-teaching-sessions may be configured by this script');
}
const { data: existing, error: listError } = await supabase.storage.listBuckets();
if (listError) throw listError;
for (const name of new Set(buckets)) {
  const bucket = existing.find((item) => item.name === name);
  const { error } = bucket
    ? bucket.public ? { error: null } : await supabase.storage.updateBucket(name, { public: true })
    : await supabase.storage.createBucket(name, { public: true });
  if (error) throw error;
}
console.log(`${new Set(buckets).size} local storage buckets ready.`);
