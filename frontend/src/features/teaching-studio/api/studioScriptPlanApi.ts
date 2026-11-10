import api from '@/lib/api';
import { createClientUuid } from '@/utils/createClientUuid';

export interface StudioLayoutOption {
  id: number;
  layout_key: string;
  name: string;
  version_no: number;
}

export interface ScriptPlanScreen {
  id: string;
  screen_key: string;
  screen_name: string;
  duration_minutes: string;
  layout_id: number | null;
  pedagogy: string;
  visual_animation_interaction_assets: string;
  teacher_narration: string;
  adaptive_branch_scripts: string;
  student_evidence_return_route: string;
  pyq_examination_extension: string;
  teacher_presenter_notes_production_checks: string;
}

export const blankScriptScreen = (position: number): ScriptPlanScreen => ({
  id: createClientUuid(),
  screen_key: `S${String(position).padStart(2, '0')}`,
  screen_name: '',
  duration_minutes: '',
  layout_id: null,
  pedagogy: '',
  visual_animation_interaction_assets: '',
  teacher_narration: '',
  adaptive_branch_scripts: '',
  student_evidence_return_route: '',
  pyq_examination_extension: '',
  teacher_presenter_notes_production_checks: '',
});

export const listStudioLayouts = async (): Promise<StudioLayoutOption[]> => {
  const response = await api.get('/studio/layouts');
  return response.data.data ?? [];
};

const uploadName = (planName: string, file: File) => {
  const extension = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '';
  const safeName = planName.trim().replace(/[^a-zA-Z0-9_-]+/g, '_') || 'script-plan';
  return new File([file], `${safeName}${extension}`, { type: file.type, lastModified: file.lastModified });
};

export const uploadScriptPlan = async (sessionId: number, planName: string, file: File) => {
  const form = new FormData();
  form.append('file', uploadName(planName, file));
  return (await api.post(`/studio/sessions/${sessionId}/screen-script`, form)).data.data;
};

export const saveManualScriptPlan = async (
  sessionId: number,
  planName: string,
  screens: ScriptPlanScreen[],
  layouts: StudioLayoutOption[],
) => {
  const content = {
    schema_version: 1,
    script_plan_name: planName.trim(),
    session_id: sessionId,
    screens: screens.map((screen, index) => {
      const layout = layouts.find((item) => item.id === screen.layout_id);
      return {
        screen_key: screen.screen_key.trim() || `S${String(index + 1).padStart(2, '0')}`,
        screen_name: screen.screen_name.trim(),
        screen_duration: {
          value: Number(screen.duration_minutes),
          unit: 'minutes',
          duration_seconds: Number(screen.duration_minutes) * 60,
        },
        layout: layout ? { layout_id: layout.id, layout_key: layout.layout_key, layout_name: layout.name, version_no: layout.version_no } : null,
        pedagogy: { instructions: screen.pedagogy.trim() },
        visual_animation_interaction_assets: screen.visual_animation_interaction_assets.trim(),
        teacher_narration: { word_for_word: screen.teacher_narration.trim() },
        adaptive_branch_scripts: screen.adaptive_branch_scripts.trim(),
        student_evidence_return_route: screen.student_evidence_return_route.trim(),
        pyq_examination_extension: screen.pyq_examination_extension.trim(),
        teacher_presenter_notes_production_checks: screen.teacher_presenter_notes_production_checks.trim(),
      };
    }),
  };
  return (await api.patch(`/studio/sessions/${sessionId}/screen-script/content`, { content })).data.data;
};
