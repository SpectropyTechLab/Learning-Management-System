import api from '@/lib/api';

export const STUDIO_RESOURCE_TYPES = [
  'image',
  'video',
  'animation',
  'simulation',
  'external_link',
  'html',
  'zip',
  'scorm',
  'presentation',
  'model_3d',
] as const;

export type StudioResourceType = (typeof STUDIO_RESOURCE_TYPES)[number];

export const studioResourceTypeLabel = (type: StudioResourceType) => ({
  image: 'Image',
  video: 'Video',
  animation: 'Animation',
  simulation: 'Simulation',
  external_link: 'External link',
  html: 'HTML',
  zip: 'ZIP package',
  scorm: 'SCORM package',
  presentation: 'PowerPoint Show',
  model_3d: '3D Model',
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

export const getStudioResource = async (resourceId: number) =>
  dataOf<StudioResourceDetails>((await api.get(`/studio/resources/${resourceId}`)).data);

export const getStudioResourceUsages = async (resourceId: number) =>
  dataOf<StudioResourceUsageReport>((await api.get(`/studio/resources/${resourceId}/usages`)).data);

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
  return formData;
};

export const createStudioResource = async (input: StudioResourceUploadInput) =>
  dataOf<StudioResourceSummary>((await api.post('/studio/resources', resourceFormData(input, true))).data);

export const createStudioResourceVersion = async (
  resourceId: number,
  input: StudioResourceUploadInput,
) => dataOf<{ resource_id: number; version: StudioResourceVersion }>((await api.post(
  `/studio/resources/${resourceId}/versions`,
  resourceFormData(input, false),
)).data);

export const launchStudioResourceVersion = async (versionId: number) =>
  dataOf<StudioResourceLaunch>((await api.post(`/studio/resource-versions/${versionId}/launch`)).data);

export const getStudioResourceDownload = async (versionId: number) =>
  dataOf<StudioResourceDownload>((await api.get(`/studio/resource-versions/${versionId}/download`)).data);

export const getStudioResourcePreview = async (versionId: number) =>
  dataOf<StudioResourcePreview>((await api.get(`/studio/resource-versions/${versionId}/preview`, {
    params: { fresh: Date.now() },
    headers: { 'Cache-Control': 'no-cache' },
  })).data);

export const deleteStudioResource = async (resourceId: number) =>
  dataOf<{ id: number; deleted: true }>((await api.delete(`/studio/resources/${resourceId}`)).data);
