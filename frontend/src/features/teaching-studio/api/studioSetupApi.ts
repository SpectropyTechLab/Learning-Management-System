import axios from 'axios';
import api from '@/lib/api';

export interface CurriculumOption {
  id: number;
  name?: string;
  title?: string;
  code?: string;
  grade_number?: number;
}

export interface StudioSession {
  id: number;
  subtopic_id: number;
  session_number: number;
  title: string;
  description: string | null;
  status: string;
  revision_no: number;
  subtopic_name?: string;
  topic_name?: string;
  chapter_name?: string;
}

export type CurriculumLevel = 'board' | 'program' | 'grade' | 'subject' | 'chapter' | 'topic' | 'subtopic';

const rows = (payload: unknown): CurriculumOption[] => {
  if (Array.isArray(payload)) return payload as CurriculumOption[];
  if (payload && typeof payload === 'object') {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) return data as CurriculumOption[];
  }
  return [];
};

const getRows = async (url: string, signal?: AbortSignal) => rows((await api.get(url, { signal })).data);

export const studioSetupApi = {
  session: async (id: number, signal?: AbortSignal): Promise<StudioSession> =>
    (await api.get(`/studio/sessions/${id}`, { signal })).data.data,
  boards: (signal?: AbortSignal) => getRows('/boards', signal),
  programs: (id: number, signal?: AbortSignal) => getRows(`/boards/${id}/programs`, signal),
  grades: (id: number, signal?: AbortSignal) => getRows(`/programs/${id}/grades`, signal),
  subjects: (id: number, signal?: AbortSignal) => getRows(`/grades/${id}/subjects`, signal),
  chapters: (id: number, signal?: AbortSignal) => getRows(`/subjects/${id}/chapters`, signal),
  topics: (id: number, signal?: AbortSignal) => getRows(`/chapters/${id}/topics`, signal),
  subtopics: (id: number, signal?: AbortSignal) => getRows(`/topics/${id}/subtopics`, signal),
  sessions: async (id: number, signal?: AbortSignal): Promise<StudioSession[]> => {
    const payload = (await api.get(`/studio/subtopics/${id}/sessions`, { signal })).data;
    return payload?.data?.sessions ?? [];
  },
  createSession: async (subtopicId: number, body: { title: string; description?: string }) => {
    const response = await api.post(`/studio/subtopics/${subtopicId}/sessions`, body);
    return response.data.data as StudioSession;
  },
  createHierarchyChild: async ({ level, parentId, name, code, order }: {
    level: CurriculumLevel;
    parentId?: number | null;
    name: string;
    code?: string;
    order?: number;
  }) => {
    const safeCode = (code || name).trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30);
    const number = Number(order || 1);
    const contracts: Record<CurriculumLevel, { url: string; body: Record<string, unknown> }> = {
      board: { url: '/boards', body: { name, code: safeCode } },
      program: { url: `/boards/${parentId}/programs`, body: { name, code: safeCode } },
      grade: { url: `/programs/${parentId}/grades`, body: { grade_number: number } },
      subject: { url: '/subjects', body: { name, code: safeCode, grade_id: parentId } },
      chapter: { url: `/subjects/${parentId}/chapters`, body: { name, chapter_number: number } },
      topic: { url: `/chapters/${parentId}/topics`, body: { name, topic_number: number } },
      subtopic: { url: `/topics/${parentId}/subtopics`, body: { name, display_order: number } },
    };
    const contract = contracts[level];
    return (await api.post(contract.url, contract.body)).data;
  },
};

export const setupErrorMessage = (error: unknown) => {
  if (axios.isCancel(error)) return '';
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { error?: string | { message?: string }; message?: string } | undefined;
    if (typeof payload?.error === 'string') return payload.error;
    if (payload?.error && typeof payload.error === 'object' && payload.error.message) return payload.error.message;
    if (payload?.message) return payload.message;
  }
  return error instanceof Error ? error.message : 'Unable to load this selection. Please try again.';
};
