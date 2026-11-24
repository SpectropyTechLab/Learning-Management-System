export const IMPORT_SCHEMA_VERSION = 'spectropy.import.v1' as const;

export type ImportSourceKind = 'clipboard' | 'pptx' | 'synthetic';
export type ImportIssueSeverity = 'info' | 'warning' | 'error';
export type ImportElementKind =
  | 'title' | 'text' | 'shape' | 'image' | 'vector' | 'media'
  | 'video' | 'audio' | 'simulation' | 'embedded_object';

export interface ImportIssue {
  severity: ImportIssueSeverity;
  code: string;
  message: string;
  source_screen_id: string | null;
  source_element_id: string | null;
  fallback_applied: string | null;
  details?: unknown;
}

export interface ImportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImportResource {
  source_id: string;
  file_name: string;
  media_type: string;
  bytes?: Uint8Array;
  read_bytes?: () => Promise<Uint8Array>;
  sha256?: string;
  metadata?: Record<string, unknown>;
}

export interface ImportElement {
  source_id: string;
  kind: ImportElementKind;
  bounds: ImportBounds;
  rotation?: number;
  flip?: { horizontal?: boolean; vertical?: boolean };
  z_index?: number;
  content?: Record<string, unknown>;
  style?: Record<string, unknown>;
  group?: Record<string, unknown> | null;
  resource_reference?: { source_id: string; fit?: 'contain' | 'cover' } | null;
  metadata?: Record<string, unknown>;
}

export interface ImportScreen {
  source_id: string;
  title: string;
  width: number;
  height: number;
  background?: Record<string, unknown>;
  elements: ImportElement[];
  notes?: Record<string, unknown>;
}

export interface ImportDocument {
  schema_version: typeof IMPORT_SCHEMA_VERSION;
  source: { kind: ImportSourceKind; name?: string; application?: string };
  source_metadata?: Record<string, unknown>;
  screens: ImportScreen[];
  resources: ImportResource[];
  issues: ImportIssue[];
}

export interface PersistedImportResource {
  resource_id: number;
  resource_version_id: number;
  resource_type: string;
}
