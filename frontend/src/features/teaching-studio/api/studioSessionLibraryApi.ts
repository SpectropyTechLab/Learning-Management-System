import api from '@/lib/api';

export type StudioSessionStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'published';

export interface StudioLibrarySession {
  id: number;
  client_id: number | null;
  subtopic_id: number;
  session_number: number;
  title: string;
  description: string | null;
  status: StudioSessionStatus;
  revision_no: number;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  approval_comment: string | null;
  published_at: string | null;
  board_id: number;
  board_name: string;
  program_id: number;
  program_name: string;
  grade_id: number;
  grade_number: number;
  subject_id: number;
  subject_name: string;
  chapter_id: number;
  chapter_number: number;
  chapter_name: string;
  topic_id: number;
  topic_name: string;
  subtopic_name: string;
  screen_count: number;
  has_session_plan: boolean;
  latest_release_number: number | null;
}

interface Envelope<T> { data: T }
const unwrap = <T>(response: { data: Envelope<T> }) => response.data.data;

export const listStudioLibrarySessions = async (status?: StudioSessionStatus) => {
  const response = await api.get('/studio/sessions', { params: status ? { status } : undefined });
  return unwrap<{ sessions: StudioLibrarySession[] }>(response).sessions;
};
