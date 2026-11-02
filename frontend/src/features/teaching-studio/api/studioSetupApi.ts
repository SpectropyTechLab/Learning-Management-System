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
}

export interface StudioScript {
  id: number;
  session_id: number;
  revision_no: number;
  source_mode: 'upload' | 'manual';
  name: string;
  is_current: boolean;
  created_at: string;
}

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
  scripts: async (sessionId: number, signal?: AbortSignal): Promise<StudioScript[]> => {
    const payload = (await api.get(`/studio/sessions/${sessionId}/screen-scripts`, { signal })).data;
    return payload?.data ?? [];
  },
  createSession: async (subtopicId: number, body: { session_number: number; title: string; description?: string }) => {
    const response = await api.post(`/studio/subtopics/${subtopicId}/sessions`, body);
    return response.data.data as StudioSession;
  },
  createHierarchy: async (input: {
    boardName: string; boardCode: string;
    programName: string; programCode: string;
    gradeNumber: number;
    subjectName: string; subjectCode: string;
    chapterName: string; chapterNumber: number;
    topicName: string; topicNumber: number;
    subtopicName: string;
  }) => {
    const board = (await api.post('/boards', { name: input.boardName, code: input.boardCode })).data as CurriculumOption;
    const program = (await api.post(`/boards/${board.id}/programs`, { name: input.programName, code: input.programCode })).data as CurriculumOption;
    const grade = (await api.post(`/programs/${program.id}/grades`, { grade_number: input.gradeNumber })).data as CurriculumOption;
    const subject = (await api.post('/subjects', { grade_id: grade.id, name: input.subjectName, code: input.subjectCode, display_order: 1 })).data as CurriculumOption;
    const chapter = (await api.post(`/subjects/${subject.id}/chapters`, { name: input.chapterName, chapter_number: input.chapterNumber })).data as CurriculumOption;
    const topic = (await api.post(`/chapters/${chapter.id}/topics`, { name: input.topicName, topic_number: input.topicNumber })).data as CurriculumOption;
    const subtopic = (await api.post(`/topics/${topic.id}/subtopics`, { name: input.subtopicName, display_order: 1 })).data as CurriculumOption;
    return { board, program, grade, subject, chapter, topic, subtopic };
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
