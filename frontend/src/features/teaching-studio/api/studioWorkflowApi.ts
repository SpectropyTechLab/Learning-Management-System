import { isAxiosError } from 'axios';
import api from '@/lib/api';

export interface StudioValidationProblem {
  code: string;
  message: string;
  screen_id?: number;
}

export interface StudioWorkflowStatus {
  session_id: number;
  status: string;
  revision_no: number;
  workflow_state: string;
  can_submit: boolean;
  can_review: boolean;
  can_publish: boolean;
  validation: {
    valid: boolean;
    errors: StudioValidationProblem[];
    screen_count: number;
  };
}

interface Envelope<T> { data: T }
interface WorkflowErrorEnvelope {
  error?: string | { message?: string; details?: StudioValidationProblem[] };
  errors?: StudioValidationProblem[];
}

const unwrap = <T>(response: { data: Envelope<T> }) => response.data.data;

export const workflowError = (error: unknown) => {
  if (!isAxiosError<WorkflowErrorEnvelope>(error)) {
    return {
      message: error instanceof Error ? error.message : 'Studio workflow request failed',
      problems: [] as StudioValidationProblem[],
    };
  }
  const payload = error.response?.data;
  const structured = typeof payload?.error === 'object' ? payload.error : undefined;
  return {
    message: structured?.message || (typeof payload?.error === 'string' ? payload.error : 'Studio workflow request failed'),
    problems: structured?.details || payload?.errors || [],
  };
};

export const getStudioWorkflowStatus = async (sessionId: number) =>
  unwrap<StudioWorkflowStatus>(await api.get(`/studio/sessions/${sessionId}/status`));

export const submitStudioSession = async (sessionId: number) =>
  unwrap<unknown>(await api.post(`/studio/sessions/${sessionId}/submit`));

export const approveStudioSession = async (sessionId: number) =>
  unwrap<unknown>(await api.post(`/studio/sessions/${sessionId}/review`, { decision: 'approved' }));

export const publishStudioSession = async (sessionId: number) =>
  unwrap<unknown>(await api.post(`/studio/sessions/${sessionId}/publish`));
