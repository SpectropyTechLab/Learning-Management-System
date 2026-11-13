import api from '@/lib/api';

export type ImportLevel =
  | 'board' | 'program' | 'grade' | 'subject' | 'chapter' | 'topic' | 'subtopic' | 'session';

export interface ImportCandidate {
  id: number;
  parent_id?: number;
  name: string;
  code?: string;
}

export interface ImportFieldMatch {
  status: 'matched' | 'new' | 'ambiguous' | 'missing';
  selected_id: number | null;
  candidates: ImportCandidate[];
}

export interface CurriculumImportRow {
  row_number: number;
  board_name: string;
  board_code: string;
  program_name: string;
  program_code: string;
  grade_number: string;
  subject_name: string;
  subject_code: string;
  chapter_name: string;
  topic_name: string;
  topic_pedagogy_names: string;
  topic_bloom_level_names: string;
  topic_target_exam_names: string;
  subtopic_name: string;
  session_name: string;
  session_description: string;
  fields: Record<ImportLevel, ImportFieldMatch>;
  action: 'import' | 'skip';
  status: 'ready' | 'issue' | 'duplicate';
  errors: string[];
}

export interface CurriculumImportPreview {
  rows: CurriculumImportRow[];
  taxonomy_terms: Array<{ id: number; type: string; code: string; label: string }>;
  summary: { total: number; ready: number; issues: number; duplicates: number };
}

const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const studioCurriculumImportApi = {
  downloadTemplate: async () => {
    const response = await api.get('/studio/curriculum/bulk-import/template', { responseType: 'blob' });
    saveBlob(response.data, 'studio-curriculum-import-template.xlsx');
  },
  preview: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const response = await api.post('/studio/curriculum/bulk-import/preview', form);
    return response.data.data as CurriculumImportPreview;
  },
  confirm: async (rows: CurriculumImportRow[]) => {
    const response = await api.post('/studio/curriculum/bulk-import/confirm', { rows });
    return response.data.data as { rows_imported: number; rows_skipped: number; sessions_created: number };
  },
};

