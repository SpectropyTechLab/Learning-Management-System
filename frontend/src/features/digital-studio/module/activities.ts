import type { TeachingActivity } from "./types";

export const activityCatalog = [
  { kind: "hotspots", name: "Hotspot explorer", description: "Position markers over an uploaded visual and reveal explanations." },
  { kind: "sorting", name: "Category sorting", description: "Classify items into two editable categories and check answers." },
  { kind: "steps", name: "Step-by-step explanation", description: "Reveal a process, worked example or timeline one step at a time." },
  { kind: "matching", name: "Matching pairs", description: "Match terms, examples or symbols to their meanings, then check answers." },
  { kind: "table", name: "Comparison table", description: "Compare two ideas in aligned rows with independently editable headings." },
] as const;

export function newActivity(kind: TeachingActivity["kind"]): TeachingActivity {
  return { version: 1, kind, prompt: "", headers: kind === "table" || kind === "sorting" ? ["First idea", "Second idea"] : [],
    items: kind === "none" ? [] : [1, 2].map((n) => ({ id: crypto.randomUUID(), label: `Item ${n}`, value: kind === "sorting" ? (n === 1 ? "First idea" : "Second idea") : `Explanation ${n}`, ...(kind === "hotspots" ? {x:n*30,y:50} : {}), extra: kind === "table" ? `Comparison ${n}` : "" })) };
}

// Deterministic non-answer order, stable for the duration of an activity attempt.
export function matchingChoices(activity: TeachingActivity) {
  return [...activity.items].sort((a, b) => a.value.localeCompare(b.value) || a.id.localeCompare(b.id));
}
