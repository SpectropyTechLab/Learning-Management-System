import api from '@/lib/api';
import type { AuthorDrawingStroke, StudioScreenSettings } from '../types';

export interface PublishedResourceMapping {
  resource_id: number;
  resource_version_id: number;
  version_number: number;
  name: string;
  resource_type: string;
  external_url: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
}

export interface PublishedScreenElement {
  screen_element_id: number;
  element_key: string;
  slot_id: string | null;
  element_type: string;
  content_json: Record<string, unknown>;
  position_json: Record<string, unknown>;
  display_order: number;
  resource_mapping: PublishedResourceMapping | null;
}

export interface PublishedBranch {
  id?: number;
  branch_key: string;
  destination_screen_id: number;
  return_screen_id: number;
}

export interface PublishedScreen {
  screen_id: number;
  revision_no: number;
  title: string;
  screen_number: number;
  display_order: number;
  creation_mode: 'blank' | 'layout';
  screen_settings_json?: StudioScreenSettings | null;
  layout: null | {
    layout_id: number;
    layout_key: string;
    name: string;
    description: string;
    layout_data_json?: { slots?: unknown[] };
  };
  elements: PublishedScreenElement[];
  tags: string[];
  branches: PublishedBranch[];
}

export interface PublishedRelease {
  id: number;
  client_id: number | null;
  session_id: number;
  release_number: number;
  published_at: string | null;
  manifest: {
    session: null | {
      session_id: number;
      title: string;
      description?: string | null;
    };
    screens: PublishedScreen[];
    screen_scripts?: Array<{
      script_revision_id: number;
      screen_id: number;
      revision_no: number;
      content: Record<string, unknown> | null;
    }>;
  };
}

export interface PublishedReleaseHistoryItem {
  id: number;
  session_id: number;
  release_number: number;
  published_at: string;
  published_by: number | null;
  screen_count: number;
}

const dataOf = <T>(payload: { data: T } | T) => (
  payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
) as T;

export const getPublishedRelease = async (sessionId: number, releaseNumber?: number) => {
  const suffix = releaseNumber ? `/releases/${releaseNumber}` : '/releases/current';
  const response = await api.get<{ release: PublishedRelease }>(`/studio/published-sessions/${sessionId}${suffix}`);
  return response.data.release;
};

export const getSessionPlayerPreview = async (sessionId: number) => {
  const response = await api.get<{ release: PublishedRelease }>(`/studio/sessions/${sessionId}/player-preview`);
  return response.data.release;
};

export const listPublishedReleaseHistory = async (sessionId: number) => {
  const response = await api.get<{ releases: PublishedReleaseHistoryItem[] }>(`/studio/published-sessions/${sessionId}/releases`);
  return response.data.releases;
};

export const previewPublishedResource = async (releaseId: number, versionId: number) =>
  dataOf<{ url: string }>((await api.get(
    `/studio/published-releases/${releaseId}/resource-versions/${versionId}/preview`,
    { params: { fresh: Date.now() }, headers: { 'Cache-Control': 'no-cache' } },
  )).data);

export const launchPublishedResource = async (releaseId: number, versionId: number) =>
  dataOf<{ launchable: boolean; launch_url?: string; message?: string }>((await api.post(
    `/studio/published-releases/${releaseId}/resource-versions/${versionId}/launch`,
  )).data);

export interface PublishedTeachingMaterials {
  release_id: number;
  release_number: number;
  curriculum: null | {
    chapter_id: number;
    document_id: number | null;
    revision_no: number | null;
    original_file_name: string | null;
    content_type: string | null;
    size_bytes: number | null;
  };
  session_plan: null | {
    revision_no: number;
    source_mode: 'upload' | 'manual';
    original_file_name: string | null;
    content: Record<string, unknown> | null;
  };
}

export const getPublishedTeachingMaterials = async (releaseId: number) =>
  dataOf<PublishedTeachingMaterials>((await api.get(
    `/studio/published-releases/${releaseId}/teaching-materials`,
  )).data);

const downloadFile = async (url: string, fallback: string) => {
  const response = await api.get(url, { responseType: 'blob' });
  const disposition = String(response.headers['content-disposition'] || '');
  const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const basicName = disposition.match(/filename="([^"]+)"/i)?.[1];
  const fileName = utf8Name ? decodeURIComponent(utf8Name) : basicName || fallback;
  const objectUrl = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(objectUrl);
};

export const downloadPublishedSessionPlan = (releaseId: number) =>
  downloadFile(`/studio/published-releases/${releaseId}/session-plan/download`, 'session-plan.docx');

export interface BranchOriginState {
  session_id: number;
  screen_id: number;
  release_id: number;
  reveal_state: Record<string, unknown>;
  annotations: AuthorDrawingStroke[];
  interaction_state: Record<string, unknown>;
  focus: Record<string, unknown>;
}

export const createBranchRun = async (releaseId: number, sessionId: number, screenId: number) =>
  dataOf<{ id: number; current_depth: number }>((await api.post('/studio/branch-runs', {
    release_id: releaseId, session_id: sessionId, screen_id: screenId,
  })).data);

export const enterBranch = async (runId: number, branchKey: string, origin: BranchOriginState) =>
  dataOf<{ run: { current_depth: number }; checkpoint: { id: number }; destination: PublishedScreen }>((await api.post(
    `/studio/branch-runs/${runId}/enter`,
    { branch_key: branchKey, origin },
  )).data);

export const updateBranchState = async (
  runId: number,
  checkpointId: number,
  state: Pick<BranchOriginState, 'annotations'>,
) => dataOf<{ id: number }>((await api.patch(
  `/studio/branch-runs/${runId}/checkpoints/${checkpointId}/state`,
  state,
)).data);

export const returnFromBranch = async (runId: number) =>
  dataOf<{
    run: { current_depth: number };
    restored_origin: BranchOriginState;
  }>((await api.post(`/studio/branch-runs/${runId}/return`)).data);

export const completeBranchRun = async (runId: number) =>
  dataOf<{ status: string }>((await api.post(`/studio/branch-runs/${runId}/complete`)).data);

export const abandonBranchRun = async (runId: number) =>
  dataOf<{ status: string }>((await api.post(`/studio/branch-runs/${runId}/abandon`)).data);
