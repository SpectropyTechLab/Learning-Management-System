import type { Slide, Element, TeachingActivity, MotionScene } from "./types";

/** Editor-only model. Never send this representation to the v1 save API. */
export type BlockContent =
  | { kind: "title" | "body"; text: string }
  | { kind: "element"; element: Element }
  | { kind: "activity"; activity: TeachingActivity }
  | { kind: "scene"; scene: MotionScene }
  | { kind: "interaction"; interaction: Slide["interaction"] };
export interface BlockBox { x: number; y: number; width: number; height: number }
export interface StudioBlock {
  groupId?: string;
  textStyle?: { size: number; color: string; bold: boolean; italic: boolean; align: "left" | "center" | "right" };
  id: string;
  box: BlockBox;
  locked: boolean;
  content: BlockContent;
}
export interface Composition {
  version: 1;
  source: Slide;
  blocks: StudioBlock[];
}
const copy = <T,>(value: T): T => structuredClone(value);

/** Explicit per-slide conversion; creating/importing slides never calls this. */
export function enableBlockEditing(slide: Slide): Slide {
  if (slide.composition) return copy(slide);
  const composition = composeLegacySlide(slide);
  const blocks = composition.blocks.filter(b => !(b.content.kind === "interaction" && b.content.interaction.type === "none") && !(b.content.kind === "activity" && b.content.activity.kind === "none"));
  if (blocks.length > 40) throw new Error("This slide has more than 40 blocks. Reduce its elements before enabling multi-block editing.");
  return { ...copy(slide), composition: { version: 1, blocks } };
}

/** Stable IDs and detached values: opening an old draft cannot mutate it. */
export function composeLegacySlide(slide: Slide): Composition {
  if (slide.composition) {
    const source = copy(slide);
    delete source.composition;
    return { version: 1, source, blocks: copy(slide.composition.blocks) };
  }
  const blocks: StudioBlock[] = [];
  const add = (role: string, content: BlockContent, box: BlockBox, locked = false) =>
    blocks.push({ id: JSON.stringify([slide.id, role]), content: copy(content), box, locked });
  add("title", { kind: "title", text: slide.title }, { x: 5, y: 5, width: 90, height: 15 });
  add("body", { kind: "body", text: slide.body }, { x: 5, y: 22, width: 90, height: 25 });
  const stage = { x: 5, y: 48, width: 90, height: 47 };
  if (slide.activity) add("activity", { kind: "activity", activity: slide.activity }, { ...stage });
  if (slide.scene) add("scene", { kind: "scene", scene: slide.scene }, { ...stage });
  add("interaction", { kind: "interaction", interaction: slide.interaction }, { ...stage });
  for (const element of slide.elements) {
    add(`element:${element.id}`, { kind: "element", element }, {
      x: element.x, y: element.y, width: element.width, height: element.height,
    }, element.locked);
  }
  return { version: 1, source: copy(slide), blocks };
}

export type CompositionCommand =
  | { type: "transform"; id: string; box: BlockBox }
  | { type: "lock"; id: string; locked: boolean }
  | { type: "text"; id: string; text: string }
  | { type: "reorder"; id: string; index: number };

/** Commands are atomic and immutable; the caller can keep snapshots for undo. */
export function applyCompositionCommand(document: Composition, command: CompositionCommand): Composition {
  const index = document.blocks.findIndex(block => block.id === command.id);
  if (index < 0) throw new Error("Block not found");
  const current = document.blocks[index];
  if (current.locked && command.type !== "lock") throw new Error("Block is locked");
  const next = copy(document);
  const block = next.blocks[index];
  switch (command.type) {
    case "transform": {
      const { x, y, width, height } = command.box;
      if (![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 ||
          width <= 0 || height <= 0 || x + width > 100 || y + height > 100)
        throw new Error("Block must fit inside the slide");
      block.box = { x, y, width, height };
      break;
    }
    case "text":
      if (command.text.length > 20000) throw new Error("Text exceeds editor limit");
      if (block.content.kind === "title" || block.content.kind === "body") block.content.text = command.text;
      else if (block.content.kind === "element" && block.content.element.kind === "text") block.content.element.text = command.text;
      else throw new Error("Block does not support text editing");
      break;
    case "lock": block.locked = command.locked; break;
    case "reorder":
      if (!Number.isInteger(command.index) || command.index < 0 || command.index >= next.blocks.length)
        throw new Error("Invalid layer position");
      next.blocks.splice(index, 1);
      next.blocks.splice(command.index, 0, block);
      break;
  }
  return next;
}

/** Lossless compatibility boundary. Reject changes the legacy format cannot store. */
export function restoreLegacySlide(document: Composition): Slide {
  if (document.blocks.some(b => b.groupId || b.textStyle)) throw new Error("Styling or grouping requires the new save format");
  const original = composeLegacySlide(document.source);
  if (document.version !== 1 || document.blocks.length !== original.blocks.length ||
      new Set(document.blocks.map(b => b.id)).size !== document.blocks.length)
    throw new Error("Composition requires the new save format");
  const slide = copy(document.source);
  slide.elements = [];
  for (const block of document.blocks) {
    const prior = original.blocks.find(b => b.id === block.id);
    if (!prior || prior.content.kind !== block.content.kind) throw new Error("Invalid legacy block mapping");
    const content = block.content;
    if (content.kind !== "element" && (JSON.stringify(block.box) !== JSON.stringify(prior.box) || block.locked !== prior.locked ||
        document.blocks.indexOf(block) !== original.blocks.indexOf(prior)))
      throw new Error("This layout requires the new save format");
    switch (content.kind) {
      case "title": slide.title = content.text; break;
      case "body": slide.body = content.text; break;
      case "activity": slide.activity = copy(content.activity); break;
      case "scene": slide.scene = copy(content.scene); break;
      case "interaction": slide.interaction = copy(content.interaction); break;
      case "element": slide.elements.push({ ...copy(content.element), ...block.box, locked: block.locked }); break;
    }
  }
  return slide;
}

export function compositionAssetIds(document: Composition): string[] {
  return [...new Set(document.blocks.flatMap(({ content }) =>
    content.kind === "element" ? [content.element.assetId] :
    content.kind === "activity" ? [content.activity.imageId ?? ""] : []).filter(Boolean))];
}
