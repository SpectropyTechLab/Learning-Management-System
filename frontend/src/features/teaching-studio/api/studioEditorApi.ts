import api from '@/lib/api';
import type { StudioScreen } from '../types';

export interface StudioLayoutSlot {
  id: string;
  label: string;
  bounds: { x: number; y: number; width: number; height: number };
  allowed: string[];
  region: 'header' | 'content' | 'footer';
}

export interface StudioLayoutSummary {
  id: number;
  name: string;
  description: string | null;
  layout_key: string;
  version_no: number;
  is_default: boolean;
  is_active: boolean;
  canvas_width: number;
  canvas_height: number;
  safe_margin: number;
  thumbnail_url: string | null;
  layout_data_json: { slots: StudioLayoutSlot[] };
}
export interface StudioResourceSummary {
  id: number;
  name: string;
  resource_type?: string;
  latest_version?: { id: number; external_url?: string | null; mime_type?: string | null };
}

const dataOf = <T>(payload: { data: T } | T) =>
  (payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload) as T;

export const listStudioLayouts = async () =>
  dataOf<StudioLayoutSummary[]>((await api.get('/studio/layouts')).data);
export const listStudioResources = async () =>
  dataOf<StudioResourceSummary[]>((await api.get('/studio/resources')).data);

export const saveStudioScreen = async (screenId: number, body: Record<string, unknown>) =>
  dataOf<StudioScreen & { session_revision_no: number }>(
    (await api.patch(`/studio/screens/${screenId}`, body)).data,
  );

export const deleteStudioScreen = async (screenId: number) =>
  dataOf<{ id: number; session_revision_no: number }>(
    (await api.delete(`/studio/screens/${screenId}`)).data,
  );

export const getStudioResourceUrl = async (versionId: number) =>
  dataOf<{ url: string }>((await api.get(`/studio/resource-versions/${versionId}/download`)).data);
