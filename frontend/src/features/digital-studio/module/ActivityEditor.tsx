import type { Asset, Slide, TeachingActivity } from "./types";
import { activityCatalog, newActivity } from "./activities";

export function ActivityEditor({ slide, edit, assets = [] }: { assets?: Asset[]; slide: Slide; edit: (change: (slide: Slide) => void) => void }) {
  const activity = slide.activity;
  const update = (change: (value: TeachingActivity) => void) => edit((s) => { if (s.activity) change(s.activity); });
  return <fieldset className="ds-activity-editor">
    <legend>Teaching activities</legend>
    <label>Activity type<select value={activity?.kind || "none"} onChange={(e) => {
      if (slide.scene && e.target.value !== "none" && !window.confirm("Replace the motion scene with this activity? Undo restores it.")) return;
      if (activity && activity.kind !== "none" && !window.confirm("Replace this activity configuration? Undo restores the previous activity.")) return;
      if ((!activity || activity.kind === "none") && slide.interaction.type !== "none" && e.target.value !== "none" && !window.confirm("Replace the current component with this teaching activity? Undo restores it.")) return;
      edit((s) => {
        if (e.target.value === "none") delete s.activity;
        else { s.activity = newActivity(e.target.value as TeachingActivity["kind"]); s.interaction.type = "none"; delete s.scene; }
      });
    }}><option value="none">No teaching activity</option>{activityCatalog.map((entry) => <option key={entry.kind} value={entry.kind}>{entry.name}</option>)}</select></label>
    {activity && activity.kind !== "none" && <>
      <p>{activityCatalog.find((entry) => entry.kind === activity.kind)?.description}</p>
      <label>Activity prompt<textarea maxLength={2000} value={activity.prompt} onChange={(e) => update((a) => { a.prompt = e.target.value; })} /></label>
      {activity.kind === "hotspots" && <label>Hotspot image<select value={activity.imageId || ""} onChange={(e) => update((a) => {a.imageId = e.target.value;})}><option value="">Empty board</option>{assets.filter((asset) => asset.mime.startsWith("image/")).map((asset) => <option key={asset.id} value={asset.id}>{asset.filename}</option>)}</select></label>}
      {(activity.kind === "table" || activity.kind === "sorting") && activity.headers.map((header, i) => <label key={i}>Column {i + 1} heading<input maxLength={200} value={header} onChange={(e) => update((a) => { const previous = a.headers[i]; a.headers[i] = e.target.value; if(a.kind === "sorting") a.items.forEach((item) => {if(item.value === previous) item.value = e.target.value;}); })} /></label>)}
      {activity.items.map((item, i) => <fieldset key={item.id}><legend>Item {i + 1}</legend>
        <label>Label {i + 1}<input maxLength={300} value={item.label} onChange={(e) => update((a) => { a.items[i].label = e.target.value; })} /></label>
        {activity.kind === "hotspots" && (["x", "y"] as const).map((axis) => <label key={axis}>{axis.toUpperCase()} position {i + 1}<input type="number" min={5} max={95} value={item[axis] ?? 50} onChange={(e) => update((a) => {a.items[i][axis] = Math.max(5,Math.min(95,Number(e.target.value)));})} /></label>)}
        {activity.kind === "sorting" ? <label>Correct category {i+1}<select value={item.value} onChange={(e) => update((a) => {a.items[i].value=e.target.value;})}>{activity.headers.map((h) => <option key={h}>{h}</option>)}</select></label> : <label>{activity.kind === "table" ? "Left content" : activity.kind === "matching" ? "Matching answer" : "Step explanation"} {i + 1}<textarea maxLength={1000} value={item.value} onChange={(e) => update((a) => { a.items[i].value = e.target.value; })} /></label>}
        {activity.kind === "table" && <label>Right content {i + 1}<textarea maxLength={1000} value={item.extra} onChange={(e) => update((a) => { a.items[i].extra = e.target.value; })} /></label>}
        <div className="ds-actions"><button disabled={i === 0} onClick={() => update((a) => { [a.items[i - 1], a.items[i]] = [a.items[i], a.items[i - 1]]; })}>Move item {i + 1} up</button>
          <button disabled={activity.items.length <= (activity.kind === "matching" ? 2 : 1)} onClick={() => update((a) => { a.items.splice(i, 1); })}>Remove item {i + 1}</button></div>
      </fieldset>)}
      <button disabled={activity.items.length >= 8} onClick={() => update((a) => { const n = a.items.length + 1; a.items.push({ id: crypto.randomUUID(), label: `Item ${n}`, value: a.kind === "sorting" ? a.headers[0] : `Explanation ${n}`, ...(a.kind === "hotspots" ? {x:50,y:50} : {}), extra: a.kind === "table" ? `Comparison ${n}` : "" }); })}>Add activity item</button>
    </>}
  </fieldset>;
}
