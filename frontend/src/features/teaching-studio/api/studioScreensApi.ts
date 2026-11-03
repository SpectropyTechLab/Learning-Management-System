import { isAxiosError } from 'axios';
import api from '@/lib/api';
import type { StudioScreen, StudioScreenList } from '../types';

interface DataEnvelope<T> {
  data: T;
}

interface StudioErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
  } | string;
  message?: string;
}

const unwrap = <T>(response: { data: DataEnvelope<T> }) => response.data.data;

export const getStudioErrorMessage = (error: unknown) => {
  if (!isAxiosError<StudioErrorEnvelope>(error)) {
    return error instanceof Error ? error.message : 'Unable to complete the Studio request';
  }

  const payload = error.response?.data;
  if (payload?.error && typeof payload.error === 'object' && payload.error.message) {
    return payload.error.message;
  }
  if (typeof payload?.error === 'string') return payload.error;
  if (payload?.message) return payload.message;

  if (error.response?.status === 403) return 'You do not have permission to access this Studio Session.';
  if (error.response?.status === 404) return 'The selected Studio Session could not be found.';
  return 'Unable to load Teaching Studio. Please try again.';
};

export const listStudioScreens = async (sessionId: number) =>
  unwrap<StudioScreenList>(await api.get(`/studio/sessions/${sessionId}/screens`));

export const getStudioScreen = async (screenId: number) =>
  unwrap<StudioScreen>(await api.get(`/studio/screens/${screenId}`));

export const createBlankStudioScreen = async (sessionId: number, title = 'Untitled Screen') =>
  unwrap<StudioScreen>(await api.post(`/studio/sessions/${sessionId}/screens`, {
    creation_mode: 'blank',
    title,
  }));

export const updateStudioScreen = async (
  screenId: number,
  payload: {
    revision_no: number;
    title: string;
    layout_id: number | null;
    elements: StudioScreen['elements'];
    tags: string[];
  },
) => unwrap<StudioScreen & { session_revision_no: number }>(
  await api.patch(`/studio/screens/${screenId}`, payload),
);

