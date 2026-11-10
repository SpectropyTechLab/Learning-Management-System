import api from '@/lib/api';
import { createClientUuid } from '@/utils/createClientUuid';

export interface SessionPlanRow {
  id: string;
  duration: string;
  screen_mapped: string;
  learning_objective_evidence: string;
  pedagogy: string;
  resources_assets: string;
  teacher_action_todo: string;
  narration_dialogue_cue: string;
  student_action_reflection: string;
  bloom_skills: string;
  references: string;
  remarks_assessment: string;
}

export const blankSessionPlanRow = (): SessionPlanRow => ({
  id: createClientUuid(),
  duration: '',
  screen_mapped: '',
  learning_objective_evidence: '',
  pedagogy: '',
  resources_assets: '',
  teacher_action_todo: '',
  narration_dialogue_cue: '',
  student_action_reflection: '',
  bloom_skills: '',
  references: '',
  remarks_assessment: '',
});

export const uploadSessionPlan = async (sessionId: number, file: File) => {
  const form = new FormData();
  form.append('file', file);
  return (await api.post(`/studio/sessions/${sessionId}/session-plan`, form)).data.data;
};

export const saveManualSessionPlan = async (sessionId: number, rows: SessionPlanRow[]) => {
  const content = {
    version: 1,
    rows: rows.map((row) => ({
      duration: row.duration,
      screen_mapped: row.screen_mapped,
      learning_objective_evidence: row.learning_objective_evidence,
      pedagogy: row.pedagogy,
      resources_assets: row.resources_assets,
      teacher_action_todo: row.teacher_action_todo,
      narration_dialogue_cue: row.narration_dialogue_cue,
      student_action_reflection: row.student_action_reflection,
      bloom_skills: row.bloom_skills,
      references: row.references,
      remarks_assessment: row.remarks_assessment,
    })),
  };
  return (await api.patch(`/studio/sessions/${sessionId}/session-plan/content`, { content })).data.data;
};
