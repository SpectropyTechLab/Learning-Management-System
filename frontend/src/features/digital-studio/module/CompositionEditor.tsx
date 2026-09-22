import type { Asset, Slide } from "./types";
import { newId } from "./types";
import { composeLegacySlide, applyCompositionCommand } from "./composition";
import type { StudioBlock, BlockContent } from "./composition";
import { newActivity } from "./activities";
import { ActivityEditor } from "./ActivityEditor";
import { MotionEditor } from "./MotionScene";
import { ArrangePanel } from "./ArrangePanel";
import { arrangeBlocks } from "./blockCommands";

export function CompositionEditor({ slide, edit, assets, selected, select }: {
  slide: Slide; edit: (change: (slide: Slide) => void) => void; assets: Asset[]; selected: string; select: (id: string) => void;
}) {
  const blocks = slide.composition?.blocks ?? [], block = blocks.find(b => b.id === selected);
  const update = (fn: (block: StudioBlock) => void) => edit(s => { const b = s.composition?.blocks.find(b => b.id === selected); if (b && !b.locked) fn(b); });
  const add = (content: BlockContent) => {
    const id = newId(); edit(s => { s.composition!.blocks.push({ id, locked: false, box: { x: 8, y: 25, width: 40, height: 50 }, content }); }); select(id);
  };
  if (!slide.composition) return null;
  const proxy = block ? { ...slide, composition: undefined, activity: block.content.kind === "activity" ? block.content.activity : undefined, scene: block.content.kind === "scene" ? block.content.scene : undefined, interaction: { type: "none" as const, prompt: "", options: [], answer: "", feedback: "", speed: 1 } } : slide;
  return <div className="ds-block-inspector">
    <h3>Slide blocks</h3><p>Drag a block’s label to move it. Shift-drag resizes it. Exact positions are available below.</p>
    <ArrangePanel key={slide.id} slide={slide} edit={edit} select={select} />
    <fieldset disabled={blocks.length >= 40}><legend>Add content</legend><div className="ds-actions">
      <button onClick={() => add({ kind: "body", text: "Add an explanation here." })}>Add text block</button>
      <button onClick={() => add({ kind: "activity", activity: newActivity("steps") })}>Add activity block</button>
      <button onClick={() => add({ kind: "interaction", interaction: { type: "quiz", prompt: "Choose the correct answer", options: ["First answer", "Second answer"], answer: "First answer", feedback: "Explain your reasoning.", speed: 1 } })}>Add quiz block</button>
      <button onClick={() => add({ kind: "scene", scene: { version: 1, kind: "motion-path", firstLeg: 40, secondLeg: 30, duration: 8, yaw: 30, elevation: 40, cinematic: true, color: "#60a5fa" } })}>Add motion block</button>
    </div><label>Add saved media<select value="" onChange={event => { const asset = assets.find(a => a.id === event.target.value); if (asset) add({ kind: "element", element: { id: newId(), kind: asset.mime.startsWith("video/") ? "video" : "image", assetId: asset.id, text: "", x: 0, y: 0, width: 100, height: 100, fontSize: 28, color: "#ffffff", locked: false } }); }}><option value="">Choose uploaded media</option>{assets.filter(a => /^(image|video)\//.test(a.mime)).map(a => <option key={a.id} value={a.id}>{a.filename}</option>)}</select></label></fieldset>
    <label>Selected block<select value={block?.id ?? ""} onChange={e => select(e.target.value)}><option value="">Choose a block</option>{blocks.map((b, i) => <option key={b.id} value={b.id}>{i + 1}. {b.content.kind}{b.content.kind === "title" || b.content.kind === "body" ? ` — ${b.content.text.slice(0, 30)}` : ""}</option>)}</select></label>
    {block && <>
      <label><input type="checkbox" checked={block.locked} onChange={e => edit(s => { s.composition!.blocks = applyCompositionCommand(composeLegacySlide(s), { type: "lock", id: block.id, locked: e.target.checked }).blocks; })} />Lock block</label>
      <fieldset disabled={block.locked}><legend>Block properties</legend>
        {block.groupId && <p>Use selection movement controls to move this group. Ungroup to resize individual members.</p>}
        {(["x", "y", "width", "height"] as const).map(key => <label key={key}>{key} (%)<input disabled={!!block.groupId} aria-label={`Block ${key}`} type="number" min={key === "x" || key === "y" ? 0 : 1} max={100} step={1} value={Math.round(block.box[key] * 100) / 100} onChange={e => update(b => {
          const number = Number(e.target.value); if (!Number.isFinite(number)) return;
          const box = { ...b.box }; box[key] = Math.max(key === "x" || key === "y" ? 0 : 1, Math.min(100, number));
          box.x = Math.min(box.x, 100 - box.width); box.y = Math.min(box.y, 100 - box.height); b.box = box;
        })} /></label>)}
        {(block.content.kind === "title" || block.content.kind === "body") && <label>Block text<textarea aria-label="Block text" maxLength={block.content.kind === "title" ? 400 : 12000} value={block.content.text} onChange={e => update(b => { if (b.content.kind === "title" || b.content.kind === "body") b.content.text = e.target.value; })} /></label>}
        {(block.content.kind === "title" || block.content.kind === "body" || (block.content.kind === "element" && block.content.element.kind === "text")) && <fieldset><legend>Text formatting</legend>
          <label>Font size<input aria-label="Block font size" type="number" min={12} max={100} value={block.textStyle?.size ?? (block.content.kind === "title" ? 48 : block.content.kind === "element" ? block.content.element.fontSize : 29)} onChange={e => update(b => { b.textStyle = { color: "#ffffff", bold: false, italic: false, align: "left", ...b.textStyle, size: Math.max(12, Math.min(100, Number(e.target.value))) }; })} /></label>
          <label>Text color<input aria-label="Block text color" type="color" value={block.textStyle?.color ?? "#ffffff"} onChange={e => update(b => { b.textStyle = { size: b.content.kind === "title" ? 48 : 29, bold: false, italic: false, align: "left", ...b.textStyle, color: e.target.value }; })} /></label>
          {(["bold", "italic"] as const).map(key => <label key={key}><input type="checkbox" checked={block.textStyle?.[key] ?? false} onChange={e => update(b => { b.textStyle = { size: b.content.kind === "title" ? 48 : 29, color: "#ffffff", bold: false, italic: false, align: "left", ...b.textStyle, [key]: e.target.checked }; })} />{key === "bold" ? "Bold text" : "Italic text"}</label>)}
          <label>Text alignment<select value={block.textStyle?.align ?? "left"} onChange={e => update(b => { b.textStyle = { size: b.content.kind === "title" ? 48 : 29, color: "#ffffff", bold: false, italic: false, ...b.textStyle, align: e.target.value as "left" | "center" | "right" }; })}>{["left","center","right"].map(a => <option key={a}>{a}</option>)}</select></label>
        </fieldset>}
        {block.content.kind === "element" && block.content.element.kind === "text" && <label>Block text<textarea aria-label="Block text" maxLength={6000} value={block.content.element.text} onChange={e => update(b => { if (b.content.kind === "element") b.content.element.text = e.target.value; })} /></label>}
        {block.content.kind === "element" && <>
          <label>Element color<input type="color" value={block.content.element.color} onChange={e => update(b => { if (b.content.kind === "element") b.content.element.color = e.target.value; })} /></label>
          {block.content.element.kind === "text" && <label>Text size<input type="number" min={12} max={100} value={block.content.element.fontSize} onChange={e => update(b => { if (b.content.kind === "element") b.content.element.fontSize = Math.max(12, Math.min(100, Number(e.target.value))); })} /></label>}
        </>}
        {block.content.kind === "interaction" && <>
          <label>Question or prompt<textarea maxLength={2000} value={block.content.interaction.prompt} onChange={e => update(b => { if (b.content.kind === "interaction") b.content.interaction.prompt = e.target.value; })} /></label>
          {block.content.interaction.options.map((option, index) => <label key={index}>Option {index + 1}<input maxLength={1000} value={option} onChange={e => update(b => { if (b.content.kind === "interaction") { const i = b.content.interaction; if (i.answer === i.options[index]) i.answer = e.target.value; i.options[index] = e.target.value; } })} /></label>)}
          {block.content.interaction.type === "quiz" && <label>Correct answer<select value={block.content.interaction.answer} onChange={e => update(b => { if (b.content.kind === "interaction") b.content.interaction.answer = e.target.value; })}>{block.content.interaction.options.map((option, i) => <option key={i}>{option}</option>)}</select></label>}
          <label>Feedback<textarea maxLength={2000} value={block.content.interaction.feedback} onChange={e => update(b => { if (b.content.kind === "interaction") b.content.interaction.feedback = e.target.value; })} /></label>
        </>}
        {block.content.kind === "activity" && <ActivityEditor slide={proxy} assets={assets} edit={fn => update(b => { const p = structuredClone(proxy); fn(p); b.content = { kind: "activity", activity: p.activity ?? newActivity("none") }; })} />}
        {block.content.kind === "scene" && <MotionEditor slide={proxy} edit={fn => update(b => { const p = structuredClone(proxy); fn(p); if (p.scene) b.content = { kind: "scene", scene: p.scene }; else b.content = { kind: "body", text: "" }; })} />}
        <div className="ds-actions"><button disabled={!!block.groupId} onClick={() => edit(s => { s.composition!.blocks = arrangeBlocks(s.composition!.blocks, [block.id], { type: "layer", direction: "front" }); })}>Bring block to front</button>
          <button disabled={!!block.groupId} onClick={() => { edit(s => { s.composition!.blocks = s.composition!.blocks.filter(b => b.id !== block.id); }); select(""); }}>Remove block</button></div>
      </fieldset>
    </>}
  </div>;
}

