import { isAxiosError } from 'axios';
import api from '@/lib/api';
import type { StudioScreen, StudioScreenList, StudioScreenSection } from '../types';

interface DataEnvelope<T> {
  data: T;
}

interface StudioErrorEnvelope {
  error?:
    | {
        code?: string;
        message?: string;
      }
    | string;
  message?: string;
}

export interface StudioRequestErrorDetails {
  message: string;
  status?: number;
  code?: string;
}

const unwrap = <T>(response: { data: DataEnvelope<T> }) => response.data.data;

export const getStudioErrorDetails = (error: unknown): StudioRequestErrorDetails => {
  if (!isAxiosError<StudioErrorEnvelope>(error)) {
    return {
      message: error instanceof Error ? error.message : 'Unable to complete the Studio request',
    };
  }

  const payload = error.response?.data;
  if (payload?.error && typeof payload.error === 'object' && payload.error.message) {
    return {
      message: payload.error.message,
      status: error.response?.status,
      code: payload.error.code,
    };
  }
  if (typeof payload?.error === 'string') return { message: payload.error, status: error.response?.status };
  if (payload?.message) return { message: payload.message, status: error.response?.status };

  if (error.response?.status === 403) return { message: 'You do not have permission to access this Studio Session.', status: 403 };
  if (error.response?.status === 404) return { message: 'The selected Studio Session could not be found.', status: 404 };
  return {
    message: 'Unable to load Teaching Studio. Please try again.',
    status: error.response?.status,
  };
};

export const getStudioErrorMessage = (error: unknown) => getStudioErrorDetails(error).message;

export const listStudioScreens = async (sessionId: number) => unwrap<StudioScreenList>(await api.get(`/studio/sessions/${sessionId}/screens`));

export const getStudioScreen = async (screenId: number) => unwrap<StudioScreen>(await api.get(`/studio/screens/${screenId}`));

export const createBlankStudioScreen = async (sessionId: number, title = 'Untitled Screen') =>
  unwrap<StudioScreen>(
    await api.post(`/studio/sessions/${sessionId}/screens`, {
      creation_mode: 'blank',
      title,
    }),
  );

export const updateStudioScreen = async (
  screenId: number,
  payload: {
    revision_no: number;
    title: string;
    layout_id: number | null;
    elements: StudioScreen['elements'];
    tags: string[];
    screen_settings?: StudioScreen['screen_settings_json'];
  },
) => unwrap<StudioScreen & { session_revision_no: number }>(
  await api.patch(`/studio/screens/${screenId}`, payload),
);

export const deleteStudioScreen = async (screenId: number) =>
  unwrap<{ id: number; session_revision_no: number }>(await api.delete(`/studio/screens/${screenId}`));

export const reorderStudioScreens = async (sessionId: number, sessionRevisionNo: number, screenIds: number[]) =>
  unwrap<{ session_id: number; session_revision_no: number; screen_ids: number[] }>(await api.patch(
    `/studio/sessions/${sessionId}/screens/reorder`,
    { session_revision_no: sessionRevisionNo, screen_ids: screenIds },
  ));

export const listStudioScreenSections = async (sessionId: number) =>
  unwrap<StudioScreenSection[]>(await api.get(`/studio/sessions/${sessionId}/sections`));

export const createStudioScreenSection = async (
  sessionId: number,
  payload: { name: string; screen_ids: number[]; display_order?: number },
) => unwrap<{ section: StudioScreenSection; session_revision_no: number }>(
  await api.post(`/studio/sessions/${sessionId}/sections`, payload),
);

export const updateStudioScreenSection = async (
  sectionId: number,
  sessionId: number,
  payload: { name: string; screen_ids: number[]; display_order?: number },
) => unwrap<{ section: StudioScreenSection; session_revision_no: number }>(
  await api.patch(`/studio/sections/${sectionId}`, { ...payload, session_id: sessionId }),
);

export const deleteStudioScreenSection = async (sectionId: number) =>
  unwrap<{ id: number; session_revision_no: number }>(await api.delete(`/studio/sections/${sectionId}`));
