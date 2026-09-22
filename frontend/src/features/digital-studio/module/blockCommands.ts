import type { StudioBlock } from "./composition";
export type ArrangeCommand =
  | { type: "move"; dx: number; dy: number }
  | { type: "align"; edge: "left" | "right" | "top" | "bottom" | "center" | "middle" }
  | { type: "group"; groupId: string }
  | { type: "ungroup" }
  | { type: "layer"; direction: "front" | "back" | "forward" | "backward" };

export function expandGroups(blocks: StudioBlock[], ids: string[]): string[] {
  const groups = new Set(blocks.filter(b => ids.includes(b.id) && b.groupId).map(b => b.groupId));
  return blocks.filter(b => ids.includes(b.id) || (b.groupId && groups.has(b.groupId))).map(b => b.id);
}
/** Atomic group-aware arrangement. Locked members prevent the entire operation. */
export function arrangeBlocks(blocks: StudioBlock[], ids: string[], command: ArrangeCommand): StudioBlock[] {
  if (!ids.length || ids.some(id => !blocks.some(b => b.id === id))) throw Error("Select existing blocks");
  const selected = new Set(expandGroups(blocks, ids));
  const next = structuredClone(blocks), members = next.filter(b => selected.has(b.id));
  if (members.some(b => b.locked)) throw Error("Unlock selected blocks before arranging them");
  const left = Math.min(...members.map(b => b.box.x)), top = Math.min(...members.map(b => b.box.y));
  const right = Math.max(...members.map(b => b.box.x + b.box.width)), bottom = Math.max(...members.map(b => b.box.y + b.box.height));
  switch (command.type) {
    case "move": {
      if (![command.dx, command.dy].every(Number.isFinite)) throw Error("Invalid movement");
      const dx = Math.max(-left, Math.min(100 - right, command.dx)), dy = Math.max(-top, Math.min(100 - bottom, command.dy));
      members.forEach(b => { b.box.x += dx; b.box.y += dy; }); break;
    }
    case "align":
      if (members.some(b => b.groupId)) throw Error("Ungroup before aligning individual blocks");
      if (members.length < 2) throw Error("Select at least two blocks");
      members.forEach(b => {
        if (command.edge === "left") b.box.x = left;
        if (command.edge === "right") b.box.x = right - b.box.width;
        if (command.edge === "center") b.box.x = (left + right - b.box.width) / 2;
        if (command.edge === "top") b.box.y = top;
        if (command.edge === "bottom") b.box.y = bottom - b.box.height;
        if (command.edge === "middle") b.box.y = (top + bottom - b.box.height) / 2;
      }); break;
    case "group":
      if (members.length < 2 || !command.groupId.trim() || command.groupId.length > 100 || blocks.some(b => b.groupId === command.groupId)) throw Error("A new group requires two or more blocks and a unique ID");
      members.forEach(b => b.groupId = command.groupId); break;
    case "ungroup": members.forEach(b => delete b.groupId); break;
    case "layer": {
      if (command.direction === "front") return [...next.filter(b => !selected.has(b.id)), ...members];
      if (command.direction === "back") return [...members, ...next.filter(b => !selected.has(b.id))];
      if (command.direction === "forward") {
        for (let i = next.length - 2; i >= 0; i--) if (selected.has(next[i].id) && !selected.has(next[i + 1].id)) [next[i], next[i + 1]] = [next[i + 1], next[i]];
      } else {
        for (let i = 1; i < next.length; i++) if (selected.has(next[i].id) && !selected.has(next[i - 1].id)) [next[i], next[i - 1]] = [next[i - 1], next[i]];
      }
      break;
    }
  }
  return next;
}
