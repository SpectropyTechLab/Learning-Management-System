import type { ImportDocument } from '../model/importTypes.ts';
import { validateImportDocument } from '../model/importValidation.ts';

export interface PlannedImportResource {
  plan_id: string;
  source_ids: string[];
  file_name: string;
  media_type: string;
  bytes: Uint8Array;
  sha256: string;
  metadata: Record<string, unknown>;
}

const digest = async (bytes: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource)))
  .map((value) => value.toString(16).padStart(2, '0')).join('');

export const planImportedResources = async (document: ImportDocument) => {
  validateImportDocument(document);
  const entries: PlannedImportResource[] = [];
  const sourceToPlanId = new Map<string, string>();
  const byHash = new Map<string, PlannedImportResource>();
  for (const resource of document.resources) {
    const bytes = resource.bytes || await resource.read_bytes?.();
    if (!bytes?.byteLength) throw Object.assign(new Error(`Resource ${resource.source_id} is empty`), { code: 'IMPORT_RESOURCE_EMPTY' });
    const sha256 = await digest(bytes);
    if (resource.sha256 && resource.sha256.toLowerCase() !== sha256) throw Object.assign(new Error(`Resource ${resource.source_id} hash mismatch`), { code: 'IMPORT_RESOURCE_HASH_MISMATCH' });
    const key = `${sha256}:${resource.media_type.toLowerCase()}`;
    let entry = byHash.get(key);
    if (!entry) {
      entry = { plan_id: `resource-${entries.length + 1}`, source_ids: [], file_name: resource.file_name, media_type: resource.media_type.toLowerCase(), bytes, sha256, metadata: resource.metadata || {} };
      byHash.set(key, entry);
      entries.push(entry);
    }
    entry.source_ids.push(resource.source_id);
    sourceToPlanId.set(resource.source_id, entry.plan_id);
  }
  return { entries, source_to_plan_id: sourceToPlanId };
};
