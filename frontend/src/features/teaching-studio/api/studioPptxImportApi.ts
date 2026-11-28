import api, { getApiErrorDetails } from '@/lib/api';

export interface PptxImportIssue {
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  source_screen_id?: string | null;
  source_element_id?: string | null;
  fallback_applied?: string | null;
  details?: unknown;
}

export interface PptxSlideSummary {
  source_id: string;
  number: number;
  title: string;
  hidden: boolean;
  element_count: number;
  editable_text_count: number;
  shape_count: number;
  image_count: number;
  table_count: number;
  equation_count: number;
  chart_count: number;
  diagram_count: number;
  media_count: number;
  warning_count: number;
}

export interface PptxPreflight {
  file_name: string;
  package: { compressedBytes: number; expandedBytes: number; entryCount: number };
  presentation: { slide_count: number; width_emu: number; height_emu: number; aspect_ratio: number };
  slides: PptxSlideSummary[];
  resource_count: number;
  issue_counts: { info: number; warning: number; error: number };
  issues: PptxImportIssue[];
  defaults: { selected_slide_ids: string[]; formatting: 'source'; fit_mode: 'fit'; fallback: 'picture'; animations: boolean };
}

export interface PptxImportOptions {
  selected_slide_ids: string[];
  insertion_mode: 'start' | 'end' | 'after';
  after_screen_id?: number | null;
  formatting: 'source' | 'destination';
  fit_mode: 'fit' | 'preserve';
  fallback: 'picture' | 'placeholder' | 'skip';
  animations: boolean;
}

export interface PptxImportResult {
  status: 'committed';
  screens_created: number[];
  elements_created: number;
  resources_created: number[];
  resources_deduplicated: number;
  issues: PptxImportIssue[];
  report: {
    file_name: string;
    screens: PptxSlideSummary[];
    issues: PptxImportIssue[];
    counts: { screens: number; elements: number; editable_text: number; shapes: number; images: number; tables: number; equations: number; charts: number; diagrams: number; media: number; resources: number; warnings: number };
  };
}

const unwrap = <T>(response: { data: { data: T } }) => response.data.data;
const formFor = (file: File, options?: Partial<PptxImportOptions>) => {
  const form = new FormData();
  form.append('file', file);
  if (options) form.append('options', JSON.stringify(options));
  return form;
};

export const preflightPptx = async (sessionId: number, file: File, signal?: AbortSignal, onProgress?: (percent: number) => void) => unwrap<PptxPreflight>(await api.post(
  `/studio/sessions/${sessionId}/imports/pptx/preflight`, formFor(file),
  { signal, onUploadProgress: (event) => onProgress?.(event.total ? Math.round(event.loaded * 100 / event.total) : 0) },
));

export const importPptx = async (sessionId: number, file: File, options: PptxImportOptions, signal?: AbortSignal, onProgress?: (percent: number) => void) => unwrap<PptxImportResult>(await api.post(
  `/studio/sessions/${sessionId}/imports/pptx/commit`, formFor(file, options),
  { signal, onUploadProgress: (event) => onProgress?.(event.total ? Math.round(event.loaded * 100 / event.total) : 0) },
));

export const exportPptx = async (sessionId: number) => {
  const response = await api.get<Blob>(`/studio/sessions/${sessionId}/exports/pptx`, { responseType: 'blob' });
  const disposition = String(response.headers['content-disposition'] || '');
  const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  return {
    blob: response.data,
    fileName: encodedName ? decodeURIComponent(encodedName) : 'presentation.pptx',
  };
};

export const getPptxImportErrorMessage = (error: unknown) => {
  const details = getApiErrorDetails(error, 'PowerPoint import failed. Please try again.');
  if (details.status === 404 && !details.code) {
    return 'The PowerPoint import service is unavailable. Restart the local backend and try again.';
  }
  return details.message;
};
