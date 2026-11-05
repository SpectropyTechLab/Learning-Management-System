import api from '@/lib/api';

export interface PublishedResourceMapping {
  resource_id: number;
  resource_version_id: number;
  version_number: number;
  name: string;
  resource_type: string;
  external_url: string | null;
  mime_type: string | null;
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
  published_at: string;
  manifest: {
    session: null | {
      session_id: number;
      title: string;
      description?: string | null;
    };
    screens: PublishedScreen[];
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

export interface BranchOriginState {
  session_id: number;
  screen_id: number;
  release_id: number;
  reveal_state: Record<string, unknown>;
  annotations: unknown[];
  interaction_state: Record<string, unknown>;
  focus: Record<string, unknown>;
}

export const createBranchRun = async (releaseId: number, sessionId: number, screenId: number) =>
  dataOf<{ id: number; current_depth: number }>((await api.post('/studio/branch-runs', {
    release_id: releaseId, session_id: sessionId, screen_id: screenId,
  })).data);

export const enterBranch = async (runId: number, branchKey: string, origin: BranchOriginState) =>
  dataOf<{ run: { current_depth: number }; destination: PublishedScreen }>((await api.post(
    `/studio/branch-runs/${runId}/enter`,
    { branch_key: branchKey, origin },
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
