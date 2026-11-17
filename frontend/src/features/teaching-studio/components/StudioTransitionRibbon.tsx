import { Check, ChevronDown, ChevronUp, CopyCheck, Eye, GalleryVertical, LoaderCircle, MousePointerClick, ShieldCheck, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

const controlClass = 'h-6 rounded border-0 bg-transparent px-1 text-[9px] text-slate-800 outline-none hover:bg-white focus:bg-white focus:ring-1 focus:ring-blue-500 disabled:text-slate-400';
const galleryPageSize = 8;
const allTransitionEffects = STUDIO_TRANSITION_GROUPS.flatMap((item) => item.effects);

export default function StudioTransitionRibbon({ settings, disabled, screenCount = 1, onChange, onApplyToAll }: Props) {
  const [galleryPage, setGalleryPage] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryPosition, setGalleryPosition] = useState({ left: 0, top: 0 });
  const [applying, setApplying] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
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
  const selectedEffect = allTransitionEffects.find((item) => item.value === effect);
  const galleryPageCount = Math.ceil(allTransitionEffects.length / galleryPageSize);
  const visibleEffects = allTransitionEffects.slice(galleryPage * galleryPageSize, (galleryPage + 1) * galleryPageSize);
  const chooseEffect = (nextEffect: string) => {
    const next = transitionWith({ effect: nextEffect });
    onChange(next);
    setGalleryOpen(false);
    window.requestAnimationFrame(() => preview(next));
  };
  const openGallery = () => {
    const rect = galleryRef.current?.getBoundingClientRect();
    if (rect) {
      const width = Math.min(620, window.innerWidth - 24);
      setGalleryPosition({
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        top: rect.bottom + 4,
      });
    }
    setGalleryOpen(true);
  };

  useEffect(() => {
    const selectedIndex = allTransitionEffects.findIndex((item) => item.value === effect);
    if (selectedIndex >= 0) setGalleryPage(Math.floor(selectedIndex / galleryPageSize));
  }, [effect]);

  useEffect(() => {
    if (!galleryOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setGalleryOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [galleryOpen]);

  return (
    <div className="flex min-w-max items-center gap-1" aria-label="Transition controls">
      <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
        <button type="button" disabled={disabled} onClick={() => preview()} title="Preview transition" className="grid h-10 w-10 place-items-center rounded-lg border border-transparent text-blue-900 hover:border-blue-200 hover:bg-blue-50 disabled:opacity-40"><Eye size={19} /></button>
        <div ref={galleryRef} className="flex h-11 w-[31rem] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          <div className="grid min-w-0 flex-1 grid-cols-8 items-center gap-0.5 px-1">
            {visibleEffects.map((item) => (
              <button key={item.value} type="button" disabled={disabled} title={item.label} aria-label={`Use ${item.label} transition`} onClick={() => chooseEffect(item.value)} className={`flex h-9 min-w-0 flex-col items-center justify-center rounded-md border px-1 text-[8px] font-semibold ${effect === item.value ? 'border-blue-600 bg-blue-100 text-blue-950' : 'border-transparent bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'}`}>
                <TransitionIcon effect={item.value} /><span className="w-full truncate text-center">{item.label}</span>
              </button>
            ))}
          </div>
          <div className="grid w-6 shrink-0 grid-rows-3 border-l border-slate-200 bg-white">
            <button type="button" disabled={disabled || galleryPage === 0} onClick={() => setGalleryPage((page) => Math.max(0, page - 1))} title="Previous transition row" aria-label="Previous transition row" className="grid place-items-center border-b border-slate-200 hover:bg-blue-50 disabled:text-slate-300"><ChevronUp size={13} /></button>
            <button type="button" disabled={disabled || galleryPage >= galleryPageCount - 1} onClick={() => setGalleryPage((page) => Math.min(galleryPageCount - 1, page + 1))} title="Next transition row" aria-label="Next transition row" className="grid place-items-center border-b border-slate-200 hover:bg-blue-50 disabled:text-slate-300"><ChevronDown size={13} /></button>
            <button type="button" disabled={disabled} onClick={openGallery} title="Show all transitions" aria-label="Show all transitions" aria-expanded={galleryOpen} className="grid place-items-center hover:bg-blue-50 disabled:text-slate-300"><GalleryVertical size={12} /></button>
          </div>
        </div>
      </div>

      {galleryOpen ? createPortal(
        <div className="fixed inset-0 z-[250]" onMouseDown={() => setGalleryOpen(false)}>
          <div role="dialog" aria-label="All transitions" onMouseDown={(event) => event.stopPropagation()} className="fixed max-h-[28rem] w-[min(38.75rem,calc(100vw-1.5rem))] overflow-y-auto rounded-lg border border-slate-300 bg-white p-3 shadow-2xl" style={galleryPosition}>
            {STUDIO_TRANSITION_GROUPS.map((transitionGroup) => (
              <section key={transitionGroup.name} className="mb-3 last:mb-0">
                <h3 className="mb-1 border-b border-slate-200 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{transitionGroup.name}</h3>
                <div className="grid grid-cols-8 gap-1">
                  {transitionGroup.effects.map((item) => (
                    <button key={item.value} type="button" title={item.label} aria-label={`Use ${item.label} transition`} onClick={() => chooseEffect(item.value)} className={`flex h-12 min-w-0 flex-col items-center justify-center rounded-md border px-1 text-[9px] font-semibold ${effect === item.value ? 'border-blue-600 bg-blue-100 text-blue-950' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'}`}>
                      <TransitionIcon effect={item.value} /><span className="w-full truncate text-center">{item.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>,
        document.body,
      ) : null}

      <div className="grid grid-cols-[5.5rem_6.5rem] gap-0.5 border-r border-slate-200 pr-1">
        <select aria-label="Transition direction" title="Direction" disabled={disabled || selectedEffect?.directions !== true} value={String(saved.direction || 'right')} onChange={(event) => update({ direction: event.target.value })} className={`${controlClass} w-[5.5rem] bg-slate-100`}><option value="right">From right</option><option value="left">From left</option><option value="top">From top</option><option value="bottom">From bottom</option><option value="vertical">Vertical</option><option value="horizontal">Horizontal</option></select>
        <label className="flex h-6 items-center gap-0.5 rounded bg-slate-100 px-1 text-[8px] font-semibold text-slate-600">Duration<input aria-label="Transition duration" title="Duration in seconds" type="number" min="0.1" max="20" step="0.1" disabled={disabled} value={Number(saved.duration) || 0.7} onChange={(event) => update({ duration: Number(event.target.value) })} className={`${controlClass} min-w-0 flex-1 bg-transparent px-0`} /></label>
        <select aria-label="Motion intensity" title="Motion intensity" disabled={disabled} value={String(saved.intensity || 'standard')} onChange={(event) => update({ intensity: event.target.value })} className={`${controlClass} w-[5.5rem] bg-slate-100`}><option value="subtle">Subtle</option><option value="standard">Standard</option><option value="dramatic">Dramatic</option></select>
        <select aria-label="Transition easing" title="Easing" disabled={disabled} value={String(saved.easing || 'ease-in-out')} onChange={(event) => update({ easing: event.target.value })} className={`${controlClass} w-[6.5rem] bg-slate-100`}><option value="ease-in-out">Smooth</option><option value="ease-out">Decelerate</option><option value="ease-in">Accelerate</option><option value="linear">Linear</option><option value="cubic-bezier(.2,.8,.2,1)">Cinematic</option></select>
      </div>

      <div className="grid grid-cols-[auto_6.25rem] items-center gap-x-0.5 border-r border-slate-200 pr-1">
        <Volume2 size={13} className="text-slate-500" />
        <select aria-label="Transition sound" title="Sound" disabled={disabled} value={String(saved.sound || 'none')} onChange={(event) => { const sound = event.target.value; update({ sound }); void playStudioTransitionSound(sound).catch(() => undefined); }} className={`${controlClass} w-[6.25rem] bg-slate-100`}>
          {STUDIO_TRANSITION_SOUNDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <label className="col-span-2 flex h-5 items-center gap-1 rounded px-1 text-[8px] font-semibold hover:bg-slate-50"><input className="h-3 w-3" type="checkbox" disabled={disabled || ['none', 'stop'].includes(String(saved.sound || 'none'))} checked={saved.loopSound === true} onChange={(event) => update({ loopSound: event.target.checked })} />Loop sound</label>
      </div>

      <div className="grid grid-cols-2 items-center gap-x-1 border-r border-slate-200 pr-1 text-[8px] font-semibold">
        <label className="flex h-5 items-center gap-0.5 rounded px-0.5 hover:bg-slate-50"><MousePointerClick size={11} /><input className="h-3 w-3" type="checkbox" disabled={disabled} checked={saved.advanceOnClick !== false} onChange={(event) => update({ advanceOnClick: event.target.checked })} />On click</label>
        <label className="flex h-5 items-center gap-0.5 rounded px-0.5 hover:bg-slate-50"><input className="h-3 w-3" type="checkbox" disabled={disabled} checked={saved.advanceAfterEnabled === true} onChange={(event) => update({ advanceAfterEnabled: event.target.checked })} />After<input aria-label="Advance after seconds" type="number" min="0" max="3600" step="0.5" disabled={disabled || saved.advanceAfterEnabled !== true} value={Number(saved.advanceAfterSeconds) || 0} onChange={(event) => update({ advanceAfterSeconds: Number(event.target.value) })} className={`${controlClass} w-9 bg-slate-100 text-center`} />s</label>
        <label className="col-span-2 flex h-5 items-center gap-0.5 rounded px-0.5 hover:bg-slate-50"><ShieldCheck size={11} /><input className="h-3 w-3" type="checkbox" disabled={disabled} checked={saved.respectReducedMotion !== false} onChange={(event) => update({ respectReducedMotion: event.target.checked })} />Reduced motion</label>
      </div>

      {onApplyToAll && screenCount > 1 ? <button type="button" disabled={disabled || applying} onClick={async () => { setApplying(true); try { await onApplyToAll(transitionWith({})); } finally { setApplying(false); } }} className="inline-flex h-9 items-center gap-0.5 rounded-md bg-blue-50 px-1.5 text-[8px] font-semibold text-blue-900 hover:bg-blue-100 disabled:opacity-40">{applying ? <LoaderCircle size={13} className="animate-spin" /> : <CopyCheck size={13} />}{applying ? 'Applying' : 'Apply all'}{!applying ? <Check size={10} /> : null}</button> : null}
    </div>
  );
}
