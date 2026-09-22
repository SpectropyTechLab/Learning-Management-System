import { useState } from "react";
import type { ReactNode } from "react";
import type { TeachingActivity } from "./types";
import { matchingChoices } from "./activities";

export function ActivityView({ activity, background }: { activity: TeachingActivity; background?: ReactNode }) {
  const [visible, setVisible] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const reset = () => { setVisible(0); setAnswers({}); setChecked(false); };
  if (activity.version !== 1 || !["steps", "matching", "table", "hotspots", "sorting"].includes(activity.kind))
    return activity.kind === "none" ? null : <p>Activity unavailable in this editor version.</p>;
  return <section className="ds-teaching-activity" aria-label="Teaching activity">
    {activity.prompt && <p>{activity.prompt}</p>}
    {activity.kind === "hotspots" && <>
      <div className="ds-hotspot-map">{background || <svg viewBox="0 0 600 300" role="img" aria-label="Empty hotspot board"><rect width="600" height="300" fill="#16324f"/><path d="M0 150H600M300 0V300" stroke="#ffffff30"/></svg>}
        {activity.items.map((item, i) => <button key={item.id} style={{left:`${item.x ?? 50}%`,top:`${item.y ?? 50}%`}} aria-label={`Explore ${item.label}`} aria-pressed={answers.active === item.id} onClick={() => setAnswers({active:item.id})}>{i+1}</button>)}
      </div>
      {activity.items.filter((item) => item.id === answers.active).map((item) => <p role="status" key={item.id}><strong>{item.label}: </strong>{item.value}</p>)}
      <button onClick={reset}>Reset activity</button>
    </>}
    {activity.kind === "sorting" && <>
      {activity.items.map((item) => <label className="ds-match-row" key={item.id}><span>{item.label}</span><select aria-label={`Sort ${item.label}`} value={answers[item.id] || ""} onChange={(e) => {setAnswers((a) => ({...a,[item.id]:e.target.value}));setChecked(false);}}><option value="">Choose category</option>{activity.headers.map((h) => <option key={h}>{h}</option>)}</select>{checked && <span>{answers[item.id] === item.value ? "Correct" : "Try again"}</span>}</label>)}
      <button disabled={activity.items.some((item) => !answers[item.id])} onClick={() => setChecked(true)}>Check categories</button><button onClick={reset}>Reset activity</button>
      {checked && <p role="status">{activity.items.filter((item) => answers[item.id] === item.value).length} of {activity.items.length} correct</p>}
    </>}
    {activity.kind === "table" && <table>
      <thead><tr><th scope="col">Aspect</th>{activity.headers.map((header, i) => <th scope="col" key={i}>{header}</th>)}</tr></thead>
      <tbody>{activity.items.map((item) => <tr key={item.id}><th scope="row">{item.label}</th><td>{item.value}</td><td>{item.extra}</td></tr>)}</tbody>
    </table>}
    {activity.kind === "steps" && <>
      <p role="status">{visible} of {activity.items.length} steps revealed</p>
      <ol>{activity.items.slice(0, visible).map((item) => <li key={item.id}><strong>{item.label}</strong><p>{item.value}</p></li>)}</ol>
      <button disabled={visible >= activity.items.length} onClick={() => setVisible((v) => v + 1)}>Reveal next step</button>
      <button disabled={!visible} onClick={() => setVisible((v) => v - 1)}>Previous step</button>
      <button onClick={reset}>Reset activity</button>
    </>}
    {activity.kind === "matching" && <>
      {activity.items.map((item) => <label className="ds-match-row" key={item.id}>
        <span>{item.label}</span>
        <select aria-label={`Match ${item.label}`} value={answers[item.id] || ""} onChange={(e) => { setAnswers((current) => ({ ...current, [item.id]: e.target.value })); setChecked(false); }}>
          <option value="">Choose a match</option>
          {matchingChoices(activity).map((choice) => <option key={choice.id} value={choice.id}>{choice.value}</option>)}
        </select>
        {checked && <span>{answers[item.id] === item.id ? "Correct" : "Try again"}</span>}
      </label>)}
      <button disabled={activity.items.some((item) => !answers[item.id])} onClick={() => setChecked(true)}>Check matches</button>
      <button onClick={reset}>Reset activity</button>
      {checked && <p role="status">{activity.items.filter((item) => answers[item.id] === item.id).length} of {activity.items.length} correct</p>}
    </>}
  </section>;
}
