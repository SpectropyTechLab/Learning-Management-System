import api from '@/lib/api';

export interface PublishedStudioSession {
  release_id: number; release_number: number; published_at: string;
  session_id: number; session_title: string; program_id: number; program_name: string;
  grade_number: number; subject_id: number; subject_name: string;
  chapter_id: number; chapter_name: string; chapter_number: number; screen_count: number;
  topic_id: number; topic_name: string; subtopic_id: number; subtopic_name: string;
}

export const listPublishedStudioSessions = async () => {
  const response = await api.get<{ data: PublishedStudioSession[] }>('/studio/published-sessions');
  return response.data.data;
};
