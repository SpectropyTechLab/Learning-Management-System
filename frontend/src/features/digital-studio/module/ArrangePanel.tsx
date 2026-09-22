import { useState } from "react";
import type { Slide } from "./types";
import { arrangeBlocks, expandGroups } from "./blockCommands";
import type { ArrangeCommand } from "./blockCommands";

export function ArrangePanel({ slide, edit, select }: { slide: Slide; edit: (fn: (s: Slide) => void) => void; select: (id: string) => void }) {
  const [checked, setChecked] = useState<string[]>([]), [error, setError] = useState("");
  const blocks = slide.composition!.blocks, ids = checked.filter(id => blocks.some(b => b.id === id));
  const expanded = expandGroups(blocks, ids), locked = blocks.some(b => expanded.includes(b.id) && b.locked);
  const run = (command: ArrangeCommand) => {
    try {
      const next = arrangeBlocks(blocks, ids, command);
      edit(s => { s.composition!.blocks = next; }); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to arrange blocks"); }
  };
  return <fieldset className="ds-arrange"><legend>Layers & selection</legend>
    <small>Frontmost first. Check several layers to arrange them. Groups move together.</small>
    <div className="ds-layer-list">{[...blocks].reverse().map(b => <div className="ds-layer-row" key={b.id}>
      <input type="checkbox" aria-label={`Include ${b.id}`} checked={ids.includes(b.id)} onChange={e => { setChecked(v => e.target.checked ? [...v, b.id] : v.filter(id => id !== b.id)); setError(""); }} />
      <button onClick={() => select(b.id)}>{b.content.kind === "body" || b.content.kind === "title" ? b.content.text.slice(0, 26) || "Empty text" : b.content.kind}{b.groupId ? " · group" : ""}{b.locked ? " · locked" : ""}</button>
    </div>)}</div>
    <div className="ds-actions"><button onClick={() => setChecked(blocks.map(b => b.id))}>Select all layers</button><button onClick={() => setChecked([])}>Clear selection</button></div>
    <p>{expanded.length} blocks selected{locked ? " — unlock before arranging" : ""}</p>
    <fieldset disabled={!ids.length || locked}><legend>Arrange selection</legend>
      <div className="ds-actions">{(["left", "center", "right", "top", "middle", "bottom"] as const).map(edge => <button key={edge} disabled={expanded.length < 2 || blocks.some(b => expanded.includes(b.id) && b.groupId)} onClick={() => run({ type: "align", edge })}>Align {edge}</button>)}</div>
      <div className="ds-actions"><button disabled={expanded.length < 2} onClick={() => run({ type: "group", groupId: crypto.randomUUID() })}>Group selection</button><button onClick={() => run({ type: "ungroup" })}>Ungroup selection</button></div>
      <small>Move by 1% of the slide:</small><div className="ds-actions">{([[-1,0,"left"],[1,0,"right"],[0,-1,"up"],[0,1,"down"]] as const).map(([dx,dy,label]) => <button key={label} onClick={() => run({ type: "move", dx, dy })}>Move selection {label}</button>)}</div>
      <div className="ds-actions">{(["front", "forward", "backward", "back"] as const).map(direction => <button key={direction} onClick={() => run({ type: "layer", direction })}>Send selection {direction}</button>)}</div>
    </fieldset>{error && <p role="alert">{error}</p>}
  </fieldset>;
}
