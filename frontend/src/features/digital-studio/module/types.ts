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
export function importScript(text: string): Slide[] {
  const headings = [
    ...text.matchAll(
      /^#{1,4}\s+(?:Slide|Screen)\s+(\d+)\s*[:.\-—–]?\s*(.*)$/gim,
    ),
  ];
  if (!headings.length)
    return [
      {
        ...newSlide("Imported script"),
        body: "Review your source in teacher notes. Use AI interpretation or split this into slides manually.",
        notes: text.slice(0, 12000),
        visualBrief: text.slice(12000, 24000),
        warnings: [
          "No numbered slide headings detected. The full source remains in the session script.",
        ],
      },
    ];
  if (headings.length > 80)
    throw Error("Split this script into sessions of 80 slides or fewer.");
  return headings.map((h, i) => ({
    ...newSlide(h[2].slice(0, 400) || `Slide ${h[1]}`),
    body: "Choose a template and add the student-facing explanation, or use AI to interpret the full script.",
    notes: text
      .slice(h.index! + h[0].length, headings[i + 1]?.index ?? text.length)
      .trim()
      .slice(0, 12000),
    warnings: [
      "Imported source needs review: separate visible content, teacher notes and visual requirements.",
    ],
  }));
}
