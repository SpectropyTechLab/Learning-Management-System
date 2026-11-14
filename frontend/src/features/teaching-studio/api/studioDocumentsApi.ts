import api from '@/lib/api';

export const SESSION_PLAN_FIELDS = [
  ['time_duration', 'Time / duration'],
  ['screen_mapped', 'Screen mapped'],
  ['learning_objective_evidence', 'Learning objective / evidence'],
  ['pedagogy', 'Pedagogy'],
  ['resources_assets', 'Resources / assets'],
  ['teacher_action_todo', 'Teacher action / to-do'],
  ['narration_dialogue_cue', 'Narration / dialogue cue'],
  ['student_action_reflection', 'Student action / reflection'],
  ['bloom_skills', 'Bloom / skills'],
  ['references', 'References'],
  ['remarks_assessment', 'Remarks / assessment'],
] as const;

export const SCREEN_SCRIPT_FIELDS = [
  ['visual_animation_interaction_assets', 'Visual, animation and interaction assets'],
  ['teacher_narration', 'Word-for-word teacher narration'],
  ['adaptive_branch_scripts', 'Adaptive branch scripts'],
  ['student_evidence_return_route', 'Student evidence and return route'],
  ['pyq_examination_extension', 'PYQ / examination extension'],
  ['teacher_presenter_notes_production_checks', 'Teacher presenter notes / production checks'],
] as const;

export type SessionPlanRow = Record<(typeof SESSION_PLAN_FIELDS)[number][0], string>;
export type ScreenScriptBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'image'; src: string; alt: string }
  | { type: 'table'; columns: string[]; rows: string[][] };

export interface ScreenScriptSection {
  key: string;
  label: string;
  blocks: ScreenScriptBlock[];
}

export type ScreenScriptContent = Partial<Record<(typeof SCREEN_SCRIPT_FIELDS)[number][0], string>> & {
  schema_version?: 1 | 2;
  screen_key?: string;
  title?: string;
  time_pedagogy?: string;
  sections?: ScreenScriptSection[];
};

interface Envelope<T> {
  data: T;
}
const unwrap = <T>(response: { data: Envelope<T> }) => response.data.data;

export interface StudioDocumentRecord {
  id: number;
  revision_no: number;
  source_mode: 'upload' | 'manual';
  original_file_name: string | null;
  structured_content: { rows?: SessionPlanRow[] } | null;
  created_at: string;
}

export interface CurriculumDocumentPreview {
  file_name: string;
  revision_no: number;
  text: string;
  warnings: string[];
}

export interface SessionPlanPreview {
  kind: 'session_plan';
  rows: SessionPlanRow[];
  warnings: string[];
  validation: Array<{
    index: number;
    status: 'valid' | 'error';
    errors: string[];
    normalized: { pedagogy: string[]; bloom: string[] };
    screen: { id: number; screen_number: number; title: string } | null;
    will_create_screen: boolean;
  }>;
  unknown_terms: Array<{ type: 'pedagogy' | 'bloom'; value: string; code: string }>;
}

export interface ScreenScriptPreviewItem extends ScreenScriptContent {
  screen_number: number;
  suggested_screen_id: number | null;
  suggested_screen_title: string | null;
  mapping_status: 'matched' | 'unmatched';
  validation?: { status: 'valid' | 'error'; errors: string[] };
}

export interface ScreenScriptPreview {
  kind: 'screen_script';
  scripts: ScreenScriptPreviewItem[];
  warnings: string[];
  available_screens: Array<{ id: number; screen_number: number; title: string }>;
}

export interface ScreenScriptRow {
  screen_id: number;
  screen_number: number;
  title: string;
  script_revision_id: number | null;
  script_revision_no: number | null;
  source_mode: 'manual' | 'import' | null;
  content_json: ScreenScriptContent | null;
}

const fileForm = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return form;
};

const download = async (url: string, fallback: string) => {
  const response = await api.get(url, { responseType: 'blob' });
  const disposition = String(response.headers['content-disposition'] || '');
  const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const basicName = disposition.match(/filename="([^"]+)"/i)?.[1];
  const name = utf8Name ? decodeURIComponent(utf8Name) : basicName || fallback;
  const objectUrl = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = name;
  link.click();
  URL.revokeObjectURL(objectUrl);
};

export const studioDocumentsApi = {
  sessionPlan: async (sessionId: number) =>
    unwrap<StudioDocumentRecord | null>(
      await api.get(`/studio/sessions/${sessionId}/session-plan`),
    ),
  previewSessionPlan: async (sessionId: number, file: File) =>
    unwrap<SessionPlanPreview>(
      await api.post(`/studio/sessions/${sessionId}/session-plan/import-preview`, fileForm(file)),
    ),
  importSessionPlan: async (
    sessionId: number,
    file: File,
    rows: SessionPlanRow[],
    createMissingTaxonomy = false,
  ) => {
    const form = fileForm(file);
    form.append('content', JSON.stringify({ rows }));
    form.append('create_missing_taxonomy', String(createMissingTaxonomy));
    return unwrap<StudioDocumentRecord>(
      await api.post(`/studio/sessions/${sessionId}/session-plan/import`, form),
    );
  },
  saveManualSessionPlan: async (
    sessionId: number,
    rows: SessionPlanRow[],
    createMissingTaxonomy = false,
  ) =>
    unwrap<StudioDocumentRecord>(
      await api.patch(`/studio/sessions/${sessionId}/session-plan/content`, {
        content: { rows },
        create_missing_taxonomy: createMissingTaxonomy,
      }),
    ),
  downloadSessionPlan: (sessionId: number) =>
    download(`/studio/sessions/${sessionId}/session-plan/download`, 'session-plan.docx'),
  previewScreenScripts: async (sessionId: number, file: File) =>
    unwrap<ScreenScriptPreview>(
      await api.post(`/studio/sessions/${sessionId}/screen-scripts/import-preview`, fileForm(file)),
    ),
  importScreenScripts: async (
    sessionId: number,
    file: File,
    scripts: ScreenScriptPreviewItem[],
  ) => {
    const mappings = scripts
      .filter((script) => script.suggested_screen_id && script.validation?.status !== 'error')
      .map((script) => ({
        screen_id: script.suggested_screen_id,
        content: Object.fromEntries([
          ...SCREEN_SCRIPT_FIELDS.map(([key]) => [key, script[key]]),
          ['screen_key', script.screen_key],
          ['title', script.title],
          ['time_pedagogy', script.time_pedagogy],
          ['schema_version', script.schema_version || (script.sections?.length ? 2 : 1)],
          ['sections', script.sections || []],
        ]),
      }));
    const form = fileForm(file);
    form.append('mappings', JSON.stringify(mappings));
    return unwrap<StudioDocumentRecord>(
      await api.post(`/studio/sessions/${sessionId}/screen-scripts/import`, form),
    );
  },
  screenScripts: async (sessionId: number) =>
    unwrap<ScreenScriptRow[]>(await api.get(`/studio/sessions/${sessionId}/screen-scripts`)),
  saveScreenScript: async (sessionId: number, screenId: number, content: ScreenScriptContent) =>
    unwrap(await api.put(`/studio/sessions/${sessionId}/screens/${screenId}/script`, { content })),
  downloadScreenScriptSource: (sessionId: number) =>
    download(`/studio/sessions/${sessionId}/screen-script/download`, 'screen-script.docx'),
  curriculumDocument: async (chapterId: number) =>
    unwrap<StudioDocumentRecord | null>(
      await api.get(`/studio/chapters/${chapterId}/curriculum-document`),
    ),
  previewCurriculumDocument: async (chapterId: number) =>
    unwrap<CurriculumDocumentPreview>(
      await api.get(`/studio/chapters/${chapterId}/curriculum-document/preview`),
    ),
  uploadCurriculumDocument: async (chapterId: number, file: File, replace = false) =>
    unwrap<StudioDocumentRecord>(
      await api.request({
        method: replace ? 'put' : 'post',
        url: `/studio/chapters/${chapterId}/curriculum-document`,
        data: fileForm(file),
      }),
    ),
  downloadCurriculumDocument: (chapterId: number) =>
    download(`/studio/chapters/${chapterId}/curriculum-document/download`, 'curriculum.docx'),
};
