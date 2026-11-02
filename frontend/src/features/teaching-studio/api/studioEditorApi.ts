import api from '@/lib/api';

export interface StudioLayoutSummary { id: number; name: string; layout_key: string; version_no: number; is_default: boolean }
export interface StudioResourceSummary { id: number; name: string; resource_type?: string }

const dataOf = <T>(payload: { data: T } | T) => (payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload) as T;

export const listStudioLayouts = async () => dataOf<StudioLayoutSummary[]>((await api.get('/studio/layouts')).data);
export const listStudioResources = async () => dataOf<StudioResourceSummary[]>((await api.get('/studio/resources')).data);
