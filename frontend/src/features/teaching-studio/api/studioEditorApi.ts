import api from '@/lib/api';
import { targetLayouts } from '../targetLayouts';
import type { Layout } from '../layouts';

export interface StudioLayoutSummary {
  id: number;
  client_id?: number | null;
  name: string;
  description?: string | null;
  layout_key: string;
  version_no: number;
  is_default: boolean;
  layout_data_json: { slots: Layout['slots'] };
  canvas_width?: number;
  canvas_height?: number;
  safe_margin?: number;
}
export interface StudioResourceSummary {
  id: number;
  name: string;
  description?: string | null;
  resource_type?: string;
  latest_version?: {
    id: number;
    version_number: number;
    external_url?: string | null;
    original_file_name?: string | null;
  };
}

const dataOf = <T>(payload: { data: T } | T) => (payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload) as T;

export interface StudioLayoutWriteInput {
  layout_key: string;
  name: string;
  description?: string;
  layout_data_json: { slots: Layout['slots'] };
  canvas_width: number;
  canvas_height: number;
  safe_margin: number;
}

export const listStudioLayouts = async (includeHistory = false) => dataOf<StudioLayoutSummary[]>((await api.get('/studio/layouts', {
  params: includeHistory ? { include_history: true } : undefined,
})).data);
export const createStudioLayout = async (input: StudioLayoutWriteInput) =>
  dataOf<StudioLayoutSummary>((await api.post('/studio/layouts', input)).data);
export const reviseStudioLayout = async (layoutId: number, input: Omit<StudioLayoutWriteInput, 'layout_key'>) =>
  dataOf<StudioLayoutSummary>((await api.patch(`/studio/layouts/${layoutId}`, input)).data);
export const listStudioResources = async () => dataOf<StudioResourceSummary[]>((await api.get('/studio/resources')).data);

const createTargetLayout = async (layout: Layout) => api.post('/studio/layouts', {
  layout_key: layout.id,
  name: layout.name,
  description: layout.purpose,
  layout_data_json: { slots: layout.slots },
  canvas_width: 1920,
  canvas_height: 1080,
  safe_margin: 90,
  is_default: true,
});

export const ensureTargetStudioLayouts = async () => {
  let rows = await listStudioLayouts();
  const existingKeys = new Set(rows.map((row) => row.layout_key.toUpperCase()));
  for (const layout of targetLayouts) {
    if (!existingKeys.has(layout.id)) {
      try {
        await createTargetLayout(layout);
      } catch {
        // A concurrent author may have provisioned the same stable key.
        // The final read below is the source of truth.
      }
    }
  }
  rows = await listStudioLayouts();
  return rows;
};
