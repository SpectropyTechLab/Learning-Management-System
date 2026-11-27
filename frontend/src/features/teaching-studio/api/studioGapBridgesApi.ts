import api from '@/lib/api';

interface DataEnvelope<T> {
  data: T;
}

const unwrap = <T>(response: { data: DataEnvelope<T> }) => response.data.data;

export interface StudioGapBridgeChildTarget {
  screen_id: number;
  title: string | null;
  screen_kind: 'gap_bridge_child';
}

export interface StudioGapBridgeExternalTarget {
  session_id: number;
  session_title: string | null;
  screen_id: number;
  screen_title?: string | null;
  screen_number?: number | null;
  screen_kind?: 'main' | 'gap_bridge_child';
  parent_screen_id?: number | null;
  release_id?: number;
  release_number?: number;
  published_at?: string;
  available: boolean;
}

export interface StudioGapBridge {
  id: number;
  source_session_id: number;
  source_screen_id: number;
  name: string;
  target_kind: 'child' | 'external';
  display_order: number;
  target: StudioGapBridgeChildTarget | StudioGapBridgeExternalTarget;
  created_by: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface StudioGapBridgeTarget {
  session_id: number;
  session_title: string;
  screen_id: number;
  screen_title: string;
  screen_number: number | null;
  screen_kind: 'main' | 'gap_bridge_child';
  parent_screen_id: number | null;
  parent_screen_title: string | null;
  parent_screen_number: number | null;
  release_id: number;
  release_number: number;
  published_at?: string;
  topic_id: number;
  topic_name: string;
  subtopic_id: number;
  subtopic_name: string;
  chapter_id: number;
  chapter_name: string;
  chapter_number: number;
  preview_screen: {
    screen_settings_json: Record<string, unknown>;
    layout: {
      canvas_width?: number;
      canvas_height?: number;
      layout_data_json?: Record<string, unknown>;
    } | null;
    elements: Array<{
      element_key?: string;
      element_type?: string;
      content_json?: Record<string, unknown>;
      position_json?: Record<string, unknown>;
      display_order?: number;
      resource_mapping?: {
        resource_type?: string;
        external_url?: string | null;
      } | null;
    }>;
  };
}

export interface StudioGapBridgeTargetFilters {
  search?: string;
  topicId?: number | null;
  subtopicId?: number | null;
  tags?: string;
  pedagogy?: string;
  bloom?: string;
  targetExam?: string;
}

export interface StudioGapBridgeTargetFacets {
  topics: Array<{ id: number; name: string }>;
  subtopics: Array<{ id: number; topic_id: number; name: string }>;
  pedagogy: Array<{ code: string; label: string }>;
  bloom: Array<{ code: string; label: string }>;
  target_exam: Array<{ code: string; label: string }>;
}

export const listStudioGapBridges = async (screenId: number) =>
  unwrap<{ source_session_revision_no: number; bridges: StudioGapBridge[] }>(
    await api.get(`/studio/screens/${screenId}/gap-bridges`),
  );

export const searchStudioGapBridgeTargets = async (
  sourceSessionId: number,
  options: StudioGapBridgeTargetFilters & { cursor?: string | null; limit?: number } = {},
) =>
  unwrap<{
    targets: StudioGapBridgeTarget[];
    next_cursor: string | null;
    facets: StudioGapBridgeTargetFacets;
    context: { chapter_id: number; chapter_name: string; chapter_number: number };
  }>(
    await api.get('/studio/gap-bridge-targets', {
      params: {
        source_session_id: sourceSessionId,
        search: options.search || undefined,
        topic_id: options.topicId || undefined,
        subtopic_id: options.subtopicId || undefined,
        tags: options.tags?.trim() || undefined,
        pedagogy: options.pedagogy?.trim() || undefined,
        bloom: options.bloom?.trim() || undefined,
        target_exam: options.targetExam?.trim() || undefined,
        cursor: options.cursor || undefined,
        limit: options.limit ?? 50,
      },
    }),
  );

export const createStudioExternalGapBridge = async (
  screenId: number,
  payload: {
    name: string;
    external_session_id: number;
    external_screen_id: number;
    source_session_revision_no: number;
  },
) =>
  unwrap<{ gap_bridge: StudioGapBridge; source_session_revision_no: number }>(
    await api.post(`/studio/screens/${screenId}/gap-bridges/external`, payload),
  );

export const createStudioChildGapBridge = async (
  screenId: number,
  payload: {
    name: string;
    title: string;
    source_session_revision_no: number;
  },
) =>
  unwrap<{ gap_bridge: StudioGapBridge; source_session_revision_no: number }>(
    await api.post(`/studio/screens/${screenId}/gap-bridges/child`, {
      ...payload,
      creation_mode: 'blank',
    }),
  );

export const updateStudioGapBridge = async (
  gapBridgeId: number,
  payload: {
    source_session_revision_no: number;
    name?: string;
    target_kind?: 'child' | 'external';
    title?: string;
    replace_child?: boolean;
    external_session_id?: number;
    external_screen_id?: number;
  },
) =>
  unwrap<{ gap_bridge: StudioGapBridge; source_session_revision_no: number }>(
    await api.patch(`/studio/gap-bridges/${gapBridgeId}`, payload),
  );

export const deleteStudioGapBridge = async (gapBridgeId: number, sourceSessionRevisionNo: number) =>
  unwrap<{ deleted_gap_bridge_id: number; source_session_revision_no: number }>(
    await api.delete(`/studio/gap-bridges/${gapBridgeId}`, {
      data: { source_session_revision_no: sourceSessionRevisionNo },
    }),
  );

export const reorderStudioGapBridges = async (
  screenId: number,
  gapBridgeIds: number[],
  sourceSessionRevisionNo: number,
) =>
  unwrap<{ gap_bridge_ids: number[]; source_session_revision_no: number }>(
    await api.patch(`/studio/screens/${screenId}/gap-bridges/reorder`, {
      gap_bridge_ids: gapBridgeIds,
      source_session_revision_no: sourceSessionRevisionNo,
    }),
  );

export const moveStudioGapBridgeChild = async (
  gapBridgeId: number,
  targetSourceScreenId: number,
  sourceSessionRevisionNo: number,
) =>
  unwrap<{
    gap_bridge: StudioGapBridge;
    previous_source_screen_id: number;
    source_session_revision_no: number;
  }>(
    await api.patch(`/studio/gap-bridges/${gapBridgeId}/move-child`, {
      target_source_screen_id: targetSourceScreenId,
      source_session_revision_no: sourceSessionRevisionNo,
    }),
  );
