export interface StudioElement {
  id: string;
  slotId: string | null;
  type: string;
  content: Record<string, unknown>;
  position: Record<string, unknown>;
  resource?: {
    resource_id: number;
    resource_version_id: number;
    usage: Record<string, unknown>;
  };
}

export interface AuthorDrawingStroke {
  id: string;
  color: string;
  width: number;
  tool?: Exclude<StudioDrawingTool, 'eraser'>;
  opacity?: number;
  points: Array<{ x: number; y: number }>;
}

export type StudioDrawingTool = 'pen' | 'pencil' | 'fountain' | 'highlighter' | 'laser' | 'eraser';

export interface StudioScreenSettings extends Record<string, unknown> {
  author_drawings?: {
    strokes: AuthorDrawingStroke[];
  };
  transition?: Record<string, unknown>;
}

export interface StudioScreen {
  id: number;
  session_id: number;
  title: string;
  screen_number: number;
  display_order: number;
  creation_mode: 'blank' | 'layout';
  layout_id: number | null;
  revision_no: number;
  screen_settings_json: StudioScreenSettings | null;
  elements: StudioElement[];
  tags: string[];
  branches: unknown[];
}

export interface StudioScreenList {
  session_revision_no: number;
  screens: StudioScreen[];
}
