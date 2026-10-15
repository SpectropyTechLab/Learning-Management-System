import { targetLayouts } from './targetLayouts';

export const MASTER = {
  width: 1920,
  height: 1080,
  safeMargin: 90,
  header: { x: 90, y: 60, width: 1740, height: 150 },
  content: { x: 90, y: 250, width: 1740, height: 680 },
  footerY: 980,
} as const;

export type ObjectType = 'title' | 'text' | 'visual' | 'question' | 'response' | 'steps' | 'workspace' | 'footer' | 'simulation' | 'activity' | 'media' | 'graph' | 'data' | 'options';
export type Rect = { x: number; y: number; width: number; height: number };
export type Slot = { id: string; label: string; bounds: Rect; allowed: ObjectType[]; region: 'header' | 'content' | 'footer' };
export type Layout = {
  id: string;
  name: string;
  purpose: string;
  slots: Slot[];
  catalog: 'target' | 'pilot';
  thumbnail?: string;
  compatibility?: string;
  interaction?: string;
  evidence?: string;
  productionChecks?: string;
};

const slot = (id: string, label: string, bounds: Rect, allowed: ObjectType[], region: Slot['region'] = 'content'): Slot =>
  ({ id, label, bounds, allowed, region });
const rect = (x: number, y: number, width: number, height: number): Rect => ({ x, y, width, height });
const title = slot('title', 'Lesson title', MASTER.header, ['title'], 'header');
const footer = slot('footer', 'Teaching cue', rect(90, 980, 1740, 50), ['footer'], 'footer');

// Provisional pilot geometry: the supplied SVGs are conceptual previews, not approved coordinates.
export const pilotLayouts: Layout[] = [
  { id: 'source', name: 'Source arrangement', purpose: 'Original teaching content', catalog: 'pilot', thumbnail: 'Source arrangement.svg', slots: [title, slot('source', 'Source content', rect(90, 250, 1740, 680), ['text', 'visual']), footer] },
  { id: 'visual-left', name: 'Visual-left', purpose: 'Diagram left, explanation right', catalog: 'pilot', thumbnail: 'Visual-left.svg', slots: [title, slot('visual', 'Diagram', rect(90, 250, 820, 680), ['visual']), slot('explanation', 'Explanation', rect(950, 250, 880, 680), ['text']), footer] },
  { id: 'visual-right', name: 'Visual-right', purpose: 'Explanation left, diagram right', catalog: 'pilot', thumbnail: 'Visual-right.svg', slots: [title, slot('explanation', 'Explanation', rect(90, 250, 880, 680), ['text']), slot('visual', 'Diagram', rect(1010, 250, 820, 680), ['visual']), footer] },
  { id: 'worked-steps', name: 'Worked-steps', purpose: 'Step-by-step solution', catalog: 'pilot', thumbnail: 'Worked-steps.svg', slots: [title, slot('step-1', 'Step 1', rect(90, 250, 550, 680), ['steps']), slot('step-2', 'Step 2', rect(685, 250, 550, 680), ['steps']), slot('step-3', 'Step 3', rect(1280, 250, 550, 680), ['steps']), footer] },
  { id: 'visual-focus', name: 'Visual-focus', purpose: 'Large central visual', catalog: 'pilot', thumbnail: 'Visual-focus.svg', slots: [title, slot('visual', 'Central visual', rect(240, 250, 1440, 680), ['visual']), footer] },
  { id: 'question', name: 'Question', purpose: 'Question and response area', catalog: 'pilot', thumbnail: 'Question.svg', slots: [title, slot('prompt', 'Question prompt', rect(90, 250, 1740, 245), ['question']), slot('response', 'Response area', rect(90, 535, 1740, 395), ['response']), footer] },
  { id: 'evidence', name: 'Evidence', purpose: 'Student reasoning and evidence', catalog: 'pilot', thumbnail: 'Evidence.svg', slots: [title, slot('reasoning', 'Reasoning', rect(90, 250, 835, 680), ['text', 'response']), slot('evidence', 'Evidence', rect(965, 250, 865, 680), ['visual', 'response']), footer] },
  { id: 'practice', name: 'Practice', purpose: 'Independent practice workspace', catalog: 'pilot', thumbnail: 'Practice.svg', slots: [title, slot('task', 'Practice task', rect(90, 250, 1740, 180), ['question']), slot('workspace', 'Workspace', rect(90, 470, 1740, 460), ['workspace', 'response']), footer] },
];

export { targetLayouts };
export const layouts = targetLayouts;

export type SlideObject = { id: string; slotId: string; type: ObjectType; text: string };
export type Slide = { title: string; objects: SlideObject[] };

export function fitScale(availableWidth: number, availableHeight: number): number {
  return Math.max(0, Math.min(availableWidth / MASTER.width, availableHeight / MASTER.height));
}

export function validateSlide(layout: Layout, slide: Slide): string[] {
  const errors: string[] = [];
  for (const field of layout.slots) {
    const { x, y, width, height } = field.bounds;
    const region = field.region === 'header' ? MASTER.header : field.region === 'content' ? MASTER.content : rect(90, 980, 1740, 50);
    if (x < region.x || y < region.y || x + width > region.x + region.width || y + height > region.y + region.height || width <= 0 || height <= 0) errors.push(`${field.id} is outside its ${field.region} region`);
  }
  for (const object of slide.objects) {
    const field = layout.slots.find((item) => item.id === object.slotId);
    if (!field) errors.push(`${object.id} uses an unknown slot`);
    else if (!field.allowed.includes(object.type)) errors.push(`${object.id} has an unsupported type for ${field.id}`);
  }
  return errors;
}

export const sampleSlides: Record<string, Slide> = Object.fromEntries([...targetLayouts, ...pilotLayouts].map((layout) => [layout.id, {
  title: layout.catalog === 'target' ? layout.name : 'Equivalent fractions',
  objects: [
    { id: 'title', slotId: 'title', type: 'title', text: layout.catalog === 'target' ? layout.name : 'Equivalent fractions' },
    ...layout.slots.filter((field) => field.region === 'content').map((field, index) => ({
      id: field.id,
      slotId: field.id,
      type: field.allowed[0],
      text: layout.catalog === 'target' ? field.label : (({ source: 'One half and two quarters cover the same amount. Explain why.', visual: '1/2  =  2/4', explanation: 'Multiply the numerator and denominator by the same number to keep the value.', 'step-1': '1. Start with 1/2', 'step-2': '2. Multiply top and bottom by 2', 'step-3': '3. Compare: 1/2 = 2/4', prompt: 'Why are 1/2 and 2/4 equivalent?', response: 'Explain your reasoning here.', reasoning: 'Describe what stays the same when both parts are doubled.', evidence: 'Use the fraction model to support your claim.', task: 'Write two fractions equivalent to 1/2.', workspace: 'Show each step and explain your method.' } as Record<string, string>)[field.id] ?? `Content ${index + 1}`),
    })),
    { id: 'footer', slotId: 'footer', type: 'footer', text: layout.catalog === 'target' ? 'Target wireframe preview · sample labels only' : 'Ask students to justify the relationship, not only name the answer.' },
  ],
}]));

