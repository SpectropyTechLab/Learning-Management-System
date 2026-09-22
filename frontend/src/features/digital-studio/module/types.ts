export const boards = ["CBSE/NCERT", "TGSCERT", "APSCERT", "KSEAB", "MSBTE"] as const;
export type Board = (typeof boards)[number];
export type Template =
  | "opener"
  | "concept"
  | "comparison"
  | "worked-example"
  | "evidence"
  | "media"
  | "quiz"
  | "simulation"
  | "exit";
export interface Element {
  id: string;
  kind: "text" | "shape" | "image" | "video";
  text: string;
  assetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  locked: boolean;
}
export interface Slide {
  composition?: { version: 1; blocks: import("./composition").StudioBlock[] };
  scene?: MotionScene;
  activity?: TeachingActivity;
  id: string;
  title: string;
  body: string;
  notes: string;
  template: Template;
  background: string;
  transition: "none" | "fade" | "rise";
  elements: Element[];
  interaction: {
    type: "none" | "quiz" | "reveal" | "orbit" | "comparison";
    prompt: string;
    options: string[];
    answer: string;
    feedback: string;
    speed: number;
  };
  visualBrief: string;
  warnings: string[];
}
export interface TeachingActivity {
  version: 1;
  kind: "none" | "steps" | "matching" | "table" | "hotspots" | "sorting";
  imageId?: string;
  prompt: string;
  headers: string[];
  items: { id: string; label: string; value: string; extra: string; x?: number; y?: number }[];
}
export interface MotionScene { version: 1; kind: "motion-path"; firstLeg: number; secondLeg: number; duration: number; yaw: number; elevation: number; cinematic: boolean; color: string; }
export interface Session {
  id: string;
  title: string;
  duration: number;
  objectives: string;
  plan: string;
  script: string;
  slides: Slide[];
}
export interface Workspace {
  schemaVersion: 1;
  curriculum: {
    programId: string;
    gradeId: string;
    subjectId: string;
    chapterId: string;
    topicIds: string[];
  };
  metadata: {
    boards?: Board[];
    title: string;
    program: string;
    grade: string;
    subject: string;
    chapter: string;
    topics: string;
    language: string;
    instructions: string;
  };
  sessions: Session[];
}
export interface Project {
  id: string;
  title: string;
  revision: number;
  document: Workspace;
  updated_at: string;
}
export interface Asset {
  id: string;
  filename: string;
  mime: string;
  size: number;
  extracted_text: string;
}
export interface Model {
  id: string;
  name: string;
  contextLength: number;
  pricing?: { prompt?: string; completion?: string };
}
export interface Job {
  id: string;
  status: string;
  base_revision: number;
  error?: string;
  result?: { workspace: Workspace; warnings: string[]; model: string };
  created_at: string;
}
export interface StudioTransport {
  request<T>(method: string, path: string, data?: unknown): Promise<T>;
  blob(path: string): Promise<Blob>;
  extractPdf(file: File): Promise<string>;
}
export const newId = () => crypto.randomUUID();
export const templates: Template[] = [
  "opener",
  "concept",
  "comparison",
  "worked-example",
  "evidence",
  "media",
  "quiz",
  "simulation",
  "exit",
];
export function newSlide(title = "A new perspective"): Slide {
  return {
    id: newId(),
    title,
    body: "Add your teaching content here.",
    notes: "",
    template: "concept",
    background: "#102d36",
    transition: "fade",
    elements: [],
    interaction: {
      type: "none",
      prompt: "",
      options: [],
      answer: "",
      feedback: "",
      speed: 1,
    },
    visualBrief: "",
    warnings: [],
  };
}
export function newSession(): Session {
  return {
    id: newId(),
    title: "Session 1",
    duration: 40,
    objectives: "",
    plan: "",
    script: "",
    slides: [],
  };
}
export { importScript } from "./script";
