import api from '@/lib/api';

export const STUDIO_RESOURCE_TYPES = [
  'image',
  'video',
  'audio',
  'animation',
  'simulation',
  'external_link',
  'html',
  'zip',
  'scorm',
  'presentation',
  'model_3d',
  'document',
] as const;

export type StudioResourceType = (typeof STUDIO_RESOURCE_TYPES)[number];

export const studioResourceTypeLabel = (type: StudioResourceType) => ({
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  animation: 'Animation',
  simulation: 'Simulation',
  external_link: 'External link',
  html: 'HTML',
  zip: 'ZIP package',
  scorm: 'SCORM package',
  presentation: 'PowerPoint Show',
  model_3d: '3D Model',
  document: 'Document object',
}[type] || 'Resource');

export interface StudioResourceVersion {
  id: number;
  resource_id: number;
  version_number: number;
  storage_key: string | null;
  original_file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  checksum_sha256?: string | null;
  external_url: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  entry_point: string | null;
  metadata_json?: Record<string, unknown>;
  uploaded_at?: string;
  created_at?: string;
}

export interface StudioResourceSummary {
  id: number;
  client_id: number | null;
  name: string;
  description: string | null;
  resource_type: StudioResourceType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  latest_version: StudioResourceVersion;
}

export interface StudioResourceDetails extends Omit<StudioResourceSummary, 'latest_version'> {
  versions: StudioResourceVersion[];
}

export interface StudioResourcePlacement {
  placement_id: number;
  resource_version_id: number;
  version_number: number;
  screen_id: number;
  screen_title: string;
  session_id: number;
  session_title: string;
  screen_number: number;
  display_order: number;
  element_id: string;
  element_type: string;
  usage_details_json: Record<string, unknown>;
}

export interface StudioResourceUsageReport {
  resource_id: number;
  placement_count: number;
  distinct_screen_count: number;
  placements: StudioResourcePlacement[];
}

export interface StudioResourceDeleteBlockers {
  placement_count: number;
  scorm_attempt_count: number;
  published_release_count: number;
}

export interface StudioResourceLaunch {
  launchable: boolean;
  launch_url?: string;
  message?: string;
  fallback?: { endpoint: string };
}

export interface StudioScormAttempt {
  id: number;
  edition: '1.2' | '2004';
  current_sco_identifier: string;
  status: string;
  launch: StudioResourceLaunch;
}

export interface StudioResourceDownload {
  url: string;
  expires_in_seconds: number;
  file_name: string;
}

export interface StudioResourcePreview {
  url: string;
  expires_in_seconds: number;
  mime_type: string | null;
}

export interface StudioResourceFilters {
  search?: string;
  resourceType?: StudioResourceType | '';
}

export interface StudioResourcePageResult {
  items: StudioResourceSummary[];
  total: number;
  page: number;
  page_size: number;
}

const resourcePageCache = new Map<string, { expiresAt: number; promise: Promise<StudioResourcePageResult> }>();
const resourcePreviewCache = new Map<number, { expiresAt: number; promise: Promise<StudioResourcePreview> }>();
const resourceThumbnailCache = new Map<number, { expiresAt: number; promise: Promise<{ available: boolean; url: string | null }> }>();
const invalidateResourceLibraryCache = () => resourcePageCache.clear();


export interface StudioResourceUploadInput {
  name?: string;
  description?: string;
  resourceType?: StudioResourceType;
  file?: File | null;
  externalUrl?: string;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  entryPoint?: string;
  metadataJson?: Record<string, unknown>;
}

export type StudioAssetCatalogKind = 'all' | 'icon' | 'illustration' | 'animation' | 'model_3d';
export type StudioAssetCatalogComposition = 'all' | 'component' | 'block';

export interface StudioAssetCatalogItem {
  id: string;
  provider: 'bioicons' | 'scidraw' | 'kitbitz' | 'fluent-emoji' | 'noto-emoji' | 'poly-haven' | 'open-peeps' | 'open-doodles';
  provider_label: string;
  provider_asset_id: string;
  title: string;
  asset_kind: Exclude<StudioAssetCatalogKind, 'all'>;
  format: string;
  resource_type: StudioResourceType;
  preview_url: string;
  source_url: string;
  collection: string;
  tags: string[];
  license: { name: string; url: string };
  attribution: string;
  attribution_required?: boolean;
  composition: Exclude<StudioAssetCatalogComposition, 'all'>;
  subject: string;
  importable: boolean;
}

export interface StudioAssetCatalogSearchResult {
  query: string;
  kind: StudioAssetCatalogKind;
  composition: StudioAssetCatalogComposition;
  results: StudioAssetCatalogItem[];
  counts: Partial<Record<Exclude<StudioAssetCatalogKind, 'all'>, number>>;
  unavailable_providers: Array<{ id: string; reason: string }>;
  provider_status: Array<{ id: string; label: string; enabled: boolean; kinds: string[] }>;
}

const dataOf = <T>(payload: { data: T } | T) => (
  payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
) as T;

export const listStudioResources = async (filters: StudioResourceFilters = {}) => {
  const response = await api.get('/studio/resources', {
    params: {
      search: filters.search?.trim() || undefined,
      resource_type: filters.resourceType || undefined,
    },
  });
  const resources = dataOf<unknown>(response.data);
  if (!Array.isArray(resources)) {
    throw new Error('The Resource Library returned an invalid response.');
  }
  return resources as StudioResourceSummary[];
};

export const listStudioResourcesPage = async (filters: StudioResourceFilters & {
  page: number;
  pageSize?: number;
  sort?: 'recently_updated' | 'name_asc' | 'name_desc' | 'newest' | 'type';
}) => {
  const key = JSON.stringify([filters.search?.trim() || '', filters.resourceType || '', filters.page, filters.pageSize || 30, filters.sort || 'recently_updated']);
  const cached = resourcePageCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;
  const promise = api.get('/studio/resources', { params: {
    search: filters.search?.trim() || undefined,
    resource_type: filters.resourceType || undefined,
    page: filters.page,
    page_size: filters.pageSize || 30,
    sort: filters.sort || 'recently_updated',
  } }).then((response) => {
    const result = dataOf<StudioResourcePageResult>(response.data);
    if (!result || !Array.isArray(result.items)) throw new Error('The Resource Library returned an invalid response.');
    return result;
  }).catch((error) => { resourcePageCache.delete(key); throw error; });
  resourcePageCache.set(key, { expiresAt: Date.now() + 30_000, promise });
  return promise;
};

export const searchStudioAssetCatalog = async (filters: {
  search: string;
  kind?: StudioAssetCatalogKind;
  composition?: StudioAssetCatalogComposition;
  provider?: string;
  limit?: number;
}) => dataOf<StudioAssetCatalogSearchResult>((await api.get('/studio/asset-catalog/search', {
  params: {
    q: filters.search.trim(),
    kind: filters.kind || 'all',
    composition: filters.composition || 'component',
    provider: filters.provider || 'all',
    limit: filters.limit || 72,
  },
})).data);

export const importStudioAssetCatalogItem = async (asset: StudioAssetCatalogItem) =>
  dataOf<StudioResourceSummary>((await api.post('/studio/asset-catalog/import', {
    provider: asset.provider,
    provider_asset_id: asset.provider_asset_id,
    title: asset.title,
  })).data);

export const getStudioAssetCatalogPreview = async (asset: StudioAssetCatalogItem) =>
  dataOf<{ url: string; format: string; title: string }>((await api.get('/studio/asset-catalog/preview', {
    params: { provider: asset.provider, asset_id: asset.provider_asset_id },
  })).data);

export const getStudioResource = async (resourceId: number) =>
  dataOf<StudioResourceDetails>((await api.get(`/studio/resources/${resourceId}`)).data);

export const getStudioResourceUsages = async (resourceId: number) =>
  dataOf<StudioResourceUsageReport>((await api.get(`/studio/resources/${resourceId}/usages`)).data);

export const renameStudioResource = async (resourceId: number, name: string) => {
  const result = dataOf<Pick<StudioResourceSummary, 'id' | 'name' | 'updated_at'>>((await api.patch(
    `/studio/resources/${resourceId}`,
    { name: name.trim() },
  )).data);
  invalidateResourceLibraryCache();
  return result;
};

const appendNumber = (formData: FormData, key: string, value?: number | null) => {
  if (value !== undefined && value !== null && Number.isFinite(value)) {
    formData.append(key, String(value));
  }
};

const resourceFormData = (input: StudioResourceUploadInput, includeIdentity: boolean) => {
  const formData = new FormData();
  if (includeIdentity) {
    formData.append('name', input.name?.trim() || '');
    formData.append('resource_type', input.resourceType || '');
    formData.append('description', input.description?.trim() || '');
  }
  if (input.file) formData.append('file', input.file);
  if (input.externalUrl?.trim()) formData.append('external_url', input.externalUrl.trim());
  appendNumber(formData, 'width', input.width);
  appendNumber(formData, 'height', input.height);
  appendNumber(formData, 'duration_seconds', input.durationSeconds);
  if (input.entryPoint?.trim()) formData.append('entry_point', input.entryPoint.trim());
  if (input.metadataJson) formData.append('metadata_json', JSON.stringify(input.metadataJson));
  return formData;
};

export const createStudioResource = async (input: StudioResourceUploadInput) => {
  const result = dataOf<StudioResourceSummary>((await api.post('/studio/resources', resourceFormData(input, true))).data);
  invalidateResourceLibraryCache();
  return result;
};

export const createStudioResourceVersion = async (
  resourceId: number,
  input: StudioResourceUploadInput,
) => {
  const result = dataOf<{ resource_id: number; version: StudioResourceVersion }>((await api.post(
    `/studio/resources/${resourceId}/versions`,
    resourceFormData(input, false),
  )).data);
  invalidateResourceLibraryCache();
  return result;
};

export const launchStudioResourceVersion = async (versionId: number) =>
  dataOf<StudioResourceLaunch>((await api.post(`/studio/resource-versions/${versionId}/launch`)).data);

export const startStudioScormAttempt = async (versionId: number, releaseId?: number) =>
  dataOf<StudioScormAttempt>((await api.post('/studio/scorm/attempts', {
    resource_version_id: versionId,
    release_id: releaseId,
    resume: true,
  })).data);

export const commitStudioScormAttempt = async (
  attemptId: number,
  scoIdentifier: string,
  data: Record<string, string>,
  event: 'commit' | 'suspend' | 'terminate',
) => dataOf<unknown>((await api.post(`/studio/scorm/attempts/${attemptId}/commit`, {
  sco_identifier: scoIdentifier,
  data,
  event,
})).data);

export const getStudioResourceDownload = async (versionId: number) =>
  dataOf<StudioResourceDownload>((await api.get(`/studio/resource-versions/${versionId}/download`)).data);

export const getStudioResourcePreview = async (versionId: number) => {
  const cached = resourcePreviewCache.get(versionId);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;
  const promise = api.get(`/studio/resource-versions/${versionId}/preview`)
    .then((response) => dataOf<StudioResourcePreview>(response.data))
    .catch((error) => { resourcePreviewCache.delete(versionId); throw error; });
  resourcePreviewCache.set(versionId, { expiresAt: Date.now() + 240_000, promise });
  return promise;
};

export const getStudioResourceThumbnail = async (versionId: number) => {
  const cached = resourceThumbnailCache.get(versionId);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;
  const promise = api.get(`/studio/resource-versions/${versionId}/thumbnail`)
    .then((response) => dataOf<{ available: boolean; url: string | null }>(response.data))
    .catch((error) => { resourceThumbnailCache.delete(versionId); throw error; });
  resourceThumbnailCache.set(versionId, { expiresAt: Date.now() + 240_000, promise });
  return promise;
};

export const prefetchStudioResourceLibrary = async () => {
  const page = await listStudioResourcesPage({ page: 1, pageSize: 30, sort: 'recently_updated' });
  await Promise.allSettled(page.items.slice(0, 12).filter((resource) => {
    const mime = resource.latest_version?.mime_type || '';
    return mime.startsWith('image/') || mime.startsWith('video/');
  }).map((resource) => getStudioResourceThumbnail(resource.latest_version.id)));
  return page;
};

export interface StudioObjectPreviewDescriptor {
  resource_id: number;
  resource_version_id: number;
  resource_type: string;
  kind: string;
  name: string;
  original_file_name: string | null;
  mime_type: string | null;
  capabilities: string[];
  mode: 'pdf' | 'text' | 'workbook' | 'interactive' | 'download';
  url?: string;
  text?: string;
  truncated?: boolean;
  sheets?: Array<{ name: string; rows: Array<Array<string | number | boolean | null>> }>;
  fallback_mode?: string;
}

export const getStudioObjectPreview = async (versionId: number) =>
  dataOf<StudioObjectPreviewDescriptor>((await api.get(
    `/studio/resource-versions/${versionId}/object-preview`,
    { params: { fresh: Date.now() }, headers: { 'Cache-Control': 'no-cache' } },
  )).data);

export const deleteStudioResource = async (resourceId: number) => {
  const result = dataOf<{ id: number; deleted: true; storage_cleanup_complete?: boolean }>((await api.delete(`/studio/resources/${resourceId}`)).data);
  invalidateResourceLibraryCache();
  return result;
};
