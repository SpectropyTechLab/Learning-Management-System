import { Check, CopyCheck, Eye, LoaderCircle, MousePointerClick, ShieldCheck, Volume2 } from 'lucide-react';
import { useState } from 'react';
import type { StudioScreenSettings } from '../types';
import { playStudioTransitionSound, replayStudioTransition } from './studioTransition';
import { STUDIO_TRANSITION_GROUPS, STUDIO_TRANSITION_SOUNDS } from './studioTransitionCatalog';

type Props = {
  settings: StudioScreenSettings | null;
  disabled?: boolean;
  screenCount?: number;
  onChange: (transition: Record<string, unknown>) => void;
  onApplyToAll?: (transition: Record<string, unknown>) => Promise<void>;
};

const TransitionIcon = ({ effect }: { effect: string }) => {
  const directional = ['push', 'wipe', 'reveal', 'uncover', 'cover', 'pan', 'conveyor', 'fly-through', 'wind'].includes(effect);
  const divided = ['split', 'curtains', 'doors', 'blinds', 'comb', 'random-bars', 'window'].includes(effect);
  const rotating = ['rotate', 'clock', 'orbit', 'ferris-wheel', 'vortex', 'ripple'].includes(effect);
  const dimensional = ['flip', 'cube', 'gallery', 'switch', 'fall-over', 'drape'].includes(effect);
  return (
    <svg viewBox="0 0 28 22" className="h-5 w-7" aria-hidden="true">
      <rect x="1" y="1" width="26" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {effect === 'none' ? <path d="M8 6l12 10M20 6L8 16" stroke="currentColor" strokeWidth="2" />
        : effect === 'fade' || effect === 'dissolve' || effect === 'glitter' ? <><rect x="5" y="5" width="9" height="12" rx="1" fill="currentColor" opacity=".25" /><rect x="14" y="5" width="9" height="12" rx="1" fill="currentColor" opacity=".75" /></>
        : directional ? <><path d="M5 11h15" stroke="currentColor" strokeWidth="2" /><path d="M16 6l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" /></>
        : divided ? <><path d="M14 3v16" stroke="currentColor" strokeWidth="1.5" /><path d="M11 7L6 11l5 4M17 7l5 4-5 4" fill="none" stroke="currentColor" strokeWidth="1.5" /></>
        : rotating ? <><circle cx="14" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M14 5a6 6 0 015 3M19 5v3h-3" fill="none" stroke="currentColor" strokeWidth="1.5" /></>
        : dimensional ? <><path d="M7 5h10l4 4v8H11l-4-4z" fill="currentColor" opacity=".18" stroke="currentColor" /><path d="M17 5v8l4 4M7 5l4 4h10" fill="none" stroke="currentColor" /></>
        : effect === 'zoom' || effect === 'shape' || effect === 'honeycomb' ? <><circle cx="13" cy="10" r="5" fill="currentColor" opacity=".2" stroke="currentColor" /><path d="M17 14l5 4" stroke="currentColor" strokeWidth="2" /></>
        : effect === 'flash' || effect === 'cut' ? <path d="M15 3L8 12h5l-1 7 8-10h-5z" fill="currentColor" />
        : <><rect x="5" y="5" width="11" height="12" rx="1" fill="currentColor" opacity=".18" /><rect x="12" y="5" width="11" height="12" rx="1" fill="none" stroke="currentColor" /></>}
    </svg>
  );
};

const controlClass = 'h-7 rounded-md border border-slate-300 bg-white px-1.5 text-[10px] text-slate-800';

export default function StudioTransitionRibbon({ settings, disabled, screenCount = 1, onChange, onApplyToAll }: Props) {
  const [group, setGroup] = useState(0);
  const [applying, setApplying] = useState(false);
  const saved = settings?.transition && typeof settings.transition === 'object'
    ? settings.transition as Record<string, unknown>
    : {};
  const transitionWith = (changes: Record<string, unknown>) => ({
    effect: 'none', duration: 0.7, direction: 'right', advanceOnClick: true,
    easing: 'ease-in-out', intensity: 'standard', respectReducedMotion: true,
    ...saved, ...changes,
  });
  const update = (changes: Record<string, unknown>) => onChange(transitionWith(changes));
  const preview = (transition = saved) => replayStudioTransition(document.querySelector<HTMLElement>('[data-testid=slide-transition-layer]'), transition);
  const effect = String(saved.effect || 'none');
  const selectedEffect = STUDIO_TRANSITION_GROUPS.flatMap((item) => item.effects).find((item) => item.value === effect);

  return (
    <div className="flex min-w-max items-center gap-2" aria-label="Transition controls">
      <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
        <button type="button" disabled={disabled} onClick={() => preview()} title="Preview transition" className="grid h-10 w-10 place-items-center rounded-lg border border-transparent text-blue-900 hover:border-blue-200 hover:bg-blue-50 disabled:opacity-40"><Eye size={19} /></button>
        <select aria-label="Transition category" value={group} onChange={(event) => setGroup(Number(event.target.value))} className={`${controlClass} w-20`}>
          {STUDIO_TRANSITION_GROUPS.map((item, index) => <option key={item.name} value={index}>{item.name}</option>)}
        </select>
        <div className="flex h-11 w-[31rem] items-center gap-0.5 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-1">
          {STUDIO_TRANSITION_GROUPS[group].effects.map((item) => (
            <button key={item.value} type="button" disabled={disabled} title={item.label} aria-label={`Use ${item.label} transition`} onClick={() => {
              const next = transitionWith({ effect: item.value });
              onChange(next);
              window.requestAnimationFrame(() => preview(next));
            }} className={`flex h-9 min-w-12 flex-col items-center justify-center rounded-md border px-1 text-[8px] font-semibold ${effect === item.value ? 'border-blue-600 bg-blue-100 text-blue-950' : 'border-transparent bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'}`}>
              <TransitionIcon effect={item.value} /><span className="max-w-11 truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 border-r border-slate-200 pr-2">
        <select aria-label="Transition direction" title="Direction" disabled={disabled || selectedEffect?.directions !== true} value={String(saved.direction || 'right')} onChange={(event) => update({ direction: event.target.value })} className={`${controlClass} w-24`}><option value="right">From right</option><option value="left">From left</option><option value="top">From top</option><option value="bottom">From bottom</option><option value="vertical">Vertical</option><option value="horizontal">Horizontal</option></select>
        <label className="flex items-center gap-1 text-[9px] font-semibold">Duration<input aria-label="Transition duration" title="Duration in seconds" type="number" min="0.1" max="20" step="0.1" disabled={disabled} value={Number(saved.duration) || 0.7} onChange={(event) => update({ duration: Number(event.target.value) })} className={`${controlClass} w-14`} /></label>
        <select aria-label="Motion intensity" title="Motion intensity" disabled={disabled} value={String(saved.intensity || 'standard')} onChange={(event) => update({ intensity: event.target.value })} className={`${controlClass} w-24`}><option value="subtle">Subtle</option><option value="standard">Standard</option><option value="dramatic">Dramatic</option></select>
        <select aria-label="Transition easing" title="Easing" disabled={disabled} value={String(saved.easing || 'ease-in-out')} onChange={(event) => update({ easing: event.target.value })} className={`${controlClass} w-28`}><option value="ease-in-out">Smooth</option><option value="ease-out">Decelerate</option><option value="ease-in">Accelerate</option><option value="linear">Linear</option><option value="cubic-bezier(.2,.8,.2,1)">Cinematic</option></select>
      </div>

      <div className="grid grid-cols-[8rem_auto] items-center gap-1 border-r border-slate-200 pr-2">
        <select aria-label="Transition sound" title="Sound" disabled={disabled} value={String(saved.sound || 'none')} onChange={(event) => { const sound = event.target.value; update({ sound }); void playStudioTransitionSound(sound).catch(() => undefined); }} className={`${controlClass} w-32`}>
          {STUDIO_TRANSITION_SOUNDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <Volume2 size={15} className="text-slate-500" />
        <label className="flex items-center gap-1 text-[9px] font-semibold"><input type="checkbox" disabled={disabled || ['none', 'stop'].includes(String(saved.sound || 'none'))} checked={saved.loopSound === true} onChange={(event) => update({ loopSound: event.target.checked })} />Loop sound</label>
      </div>

      <div className="grid grid-cols-2 items-center gap-x-2 gap-y-1 border-r border-slate-200 pr-2 text-[9px] font-semibold">
        <label className="flex items-center gap-1"><MousePointerClick size={13} /><input type="checkbox" disabled={disabled} checked={saved.advanceOnClick !== false} onChange={(event) => update({ advanceOnClick: event.target.checked })} />On click</label>
        <label className="flex items-center gap-1"><input type="checkbox" disabled={disabled} checked={saved.advanceAfterEnabled === true} onChange={(event) => update({ advanceAfterEnabled: event.target.checked })} />After<input aria-label="Advance after seconds" type="number" min="0" max="3600" step="0.5" disabled={disabled || saved.advanceAfterEnabled !== true} value={Number(saved.advanceAfterSeconds) || 0} onChange={(event) => update({ advanceAfterSeconds: Number(event.target.value) })} className={`${controlClass} w-12`} />s</label>
        <label className="col-span-2 flex items-center gap-1"><ShieldCheck size={13} /><input type="checkbox" disabled={disabled} checked={saved.respectReducedMotion !== false} onChange={(event) => update({ respectReducedMotion: event.target.checked })} />Respect reduced motion</label>
      </div>

      {onApplyToAll && screenCount > 1 ? <button type="button" disabled={disabled || applying} onClick={async () => { setApplying(true); try { await onApplyToAll(transitionWith({})); } finally { setApplying(false); } }} className="inline-flex h-10 items-center gap-1 rounded-lg border border-blue-300 px-2 text-[9px] font-semibold text-blue-900 hover:bg-blue-50 disabled:opacity-40">{applying ? <LoaderCircle size={15} className="animate-spin" /> : <CopyCheck size={15} />}{applying ? 'Applying' : 'Apply to all'}{!applying ? <Check size={12} /> : null}</button> : null}
    </div>
  );
}
