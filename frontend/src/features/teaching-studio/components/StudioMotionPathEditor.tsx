import { Lock, LockOpen, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { StudioAnimationEffectDefinition, StudioMotionPathPoint } from './studioAnimationModel';

const defaultPath: StudioMotionPathPoint[] = [{ x: 0, y: 0 }, { x: 180, y: 0 }];

export default function StudioMotionPathEditor({ effect, onChange }: {
  effect: StudioAnimationEffectDefinition;
  onChange: (changes: Partial<StudioAnimationEffectDefinition>) => void;
}) {
  const [open, setOpen] = useState(false);
  const points = Array.isArray(effect.motionPath) && effect.motionPath.length >= 2 ? effect.motionPath : defaultPath;
  const updatePoint = (index: number, changes: Partial<StudioMotionPathPoint>) => onChange({
    effect: 'path-custom',
    motionPath: points.map((point, pointIndex) => pointIndex === index ? { ...point, ...changes } : point),
  });
  const pathData = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x + 140} ${point.y + 90}`).join(' ');
  const editor = <div role="dialog" aria-modal="true" aria-label="Custom motion path editor" className="w-[min(34rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 text-[11px] shadow-2xl">
    <div className="flex items-center justify-between gap-2">
      <div><strong className="text-sm">Custom motion path</strong><p className="mt-0.5 text-[10px] text-slate-500">Edit the exact route followed by the selected component.</p></div>
      <div className="flex gap-1">
        <button type="button" title="Reverse path" onClick={() => onChange({ effect: 'path-custom', motionPath: [...points].reverse() })} className="rounded border p-1 hover:bg-slate-50"><RotateCcw size={13}/></button>
        <button type="button" title={effect.lockPathOrigin === false ? 'Lock origin to object' : 'Unlock path origin'} onClick={() => onChange({ lockPathOrigin: effect.lockPathOrigin === false })} className="rounded border p-1 hover:bg-slate-50">{effect.lockPathOrigin === false ? <LockOpen size={13}/> : <Lock size={13}/>}</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded border px-2 py-1 font-semibold hover:bg-slate-50">Done</button>
      </div>
    </div>
    <svg viewBox="0 0 280 180" className="h-32 w-full rounded border bg-slate-50" onDoubleClick={(event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 280 - 140;
      const y = ((event.clientY - rect.top) / rect.height) * 180 - 90;
      onChange({ effect: 'path-custom', motionPath: [...points, { x: Math.round(x), y: Math.round(y) }] });
    }}>
      <path d={pathData} fill="none" stroke="#2563eb" strokeWidth="3" strokeDasharray="7 4"/>
      {points.map((point, index) => <circle key={index} cx={point.x + 140} cy={point.y + 90} r="6" fill={index === 0 ? '#22c55e' : index === points.length - 1 ? '#ef4444' : '#2563eb'}/>) }
    </svg>
    <p className="text-slate-500">Double-click the path canvas to add a point. Green is the start; red is the end.</p>
    <div className="max-h-28 space-y-1 overflow-y-auto">
      {points.map((point, index) => <div key={index} className="flex items-center gap-1"><span className="w-10 font-semibold">{index === 0 ? 'Start' : index === points.length - 1 ? 'End' : `P${index}`}</span><input aria-label={`Path point ${index + 1} X`} type="number" value={point.x} onChange={(event) => updatePoint(index, { x: Number(event.target.value) })} className="h-6 w-16 rounded border px-1"/><input aria-label={`Path point ${index + 1} Y`} type="number" value={point.y} onChange={(event) => updatePoint(index, { y: Number(event.target.value) })} className="h-6 w-16 rounded border px-1"/><button type="button" aria-label={`Remove path point ${index + 1}`} disabled={points.length <= 2} onClick={() => onChange({ effect: 'path-custom', motionPath: points.filter((_, pointIndex) => pointIndex !== index) })} className="rounded p-1 text-red-600 disabled:opacity-30"><Trash2 size={12}/></button></div>)}
    </div>
    <button type="button" onClick={() => onChange({ effect: 'path-custom', motionPath: [...points, { ...points[points.length - 1], x: points[points.length - 1].x + 60 }] })} className="inline-flex items-center justify-center gap-1 rounded border px-2 py-1 font-semibold hover:bg-blue-50"><Plus size={12}/>Add point</button>
  </div>;
  return <>
    <button type="button" onClick={() => setOpen(true)} className="h-7 min-w-28 rounded border border-blue-200 bg-blue-50 px-2 text-[9px] font-semibold text-blue-900 hover:bg-blue-100">Edit motion path…</button>
    {open && typeof document !== 'undefined' ? createPortal(<div className="fixed inset-0 z-[400] grid place-items-center bg-slate-950/35 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>{editor}</div>, document.body) : null}
  </>;
}
