import { Check, ChevronDown, ChevronUp, CopyCheck, Download, Eye, GalleryVertical, LoaderCircle, MousePointerClick, ShieldCheck, SlidersHorizontal, Upload, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { StudioScreenSettings } from '../types';
import { playStudioTransitionSound, replayStudioTransition } from './studioTransition';
import { STUDIO_TRANSITION_GROUPS, STUDIO_TRANSITION_SOUNDS } from './studioTransitionCatalog';
import type { StudioTransitionCustomSound } from './studioTransitionModel';

type Props = {
  settings: StudioScreenSettings | null;
  disabled?: boolean;
  screenCount?: number;
  onChange: (transition: Record<string, unknown>) => void;
  onApplyToAll?: (transition: Record<string, unknown>) => Promise<void>;
  onUploadCustomSound?: (file: File) => Promise<StudioTransitionCustomSound>;
  onPreview?: (transition: Record<string, unknown>) => void | Promise<void>;
  onExportPowerPoint?: () => void | Promise<void>;
};

const TransitionIcon = ({ effect }: { effect: string }) => {
  const directional = ['push', 'wipe', 'reveal', 'uncover', 'cover', 'pan', 'conveyor', 'fly-through', 'wind', 'peel-off', 'page-curl', 'airplane', 'origami'].includes(effect);
  const divided = ['split', 'curtains', 'doors', 'blinds', 'comb', 'random-bars', 'window', 'checkerboard', 'shred', 'fracture'].includes(effect);
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

const EffectOptionIcon = ({ value }: { value: string }) => {
  const left = value.includes('left');
  const right = value.includes('right');
  const top = value.includes('top');
  const bottom = value.includes('bottom');
  const horizontal = value.includes('horizontal');
  const vertical = value.includes('vertical');
  return (
    <svg viewBox="0 0 38 28" className="h-7 w-10" aria-hidden="true">
      <rect x="1" y="1" width="36" height="26" rx="2" fill="#dbeafe" stroke="currentColor" />
      {value.includes('circle') || value === 'center' ? <circle cx="19" cy="14" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        : value.includes('diamond') ? <path d="M19 5l10 9-10 9-10-9z" fill="#60a5fa" stroke="currentColor" />
        : value.includes('hexagon') ? <path d="M11 6h16l7 8-7 8H11l-7-8z" fill="#60a5fa" stroke="currentColor" />
        : value.includes('plus') ? <path d="M16 5h6v6h7v6h-7v6h-6v-6H9v-6h7z" fill="#60a5fa" />
        : horizontal ? <><path d="M4 9h30M4 19h30" stroke="currentColor" strokeWidth="2" /><path d="M14 14h10" stroke="#2563eb" strokeWidth="3" /></>
        : vertical ? <><path d="M12 4v20M26 4v20" stroke="currentColor" strokeWidth="2" /><path d="M19 8v12" stroke="#2563eb" strokeWidth="3" /></>
        : left || right || top || bottom ? <><path d={`M${left ? 31 : right ? 7 : 19} ${top ? 23 : bottom ? 5 : 14}L${left ? 8 : right ? 30 : 19} ${top ? 6 : bottom ? 22 : 14}`} stroke="#2563eb" strokeWidth="3" /><path d={left ? 'M13 8l-6 6 6 6' : right ? 'M25 8l6 6-6 6' : top ? 'M13 11l6-6 6 6' : 'M13 17l6 6 6-6'} fill="none" stroke="#2563eb" strokeWidth="2" /></>
        : value.includes('black') ? <><rect x="3" y="3" width="15" height="22" fill="#0f172a" /><rect x="20" y="3" width="15" height="22" fill="#93c5fd" /></>
        : value.includes('bounce') ? <path d="M5 20c5-17 9 2 14-8s8 8 14-6" fill="none" stroke="#2563eb" strokeWidth="2" />
        : <path d="M6 20L19 7l13 13" fill="none" stroke="#2563eb" strokeWidth="2" />}
    </svg>
  );
};

const controlClass = 'h-7 rounded-md border-0 bg-transparent px-2 text-[10px] font-medium text-slate-800 outline-none hover:bg-white focus:bg-white focus:ring-1 focus:ring-blue-500 disabled:text-slate-400';
const galleryPageSize = 8;
const allTransitionEffects = STUDIO_TRANSITION_GROUPS.flatMap((item) => item.effects);

export default function StudioTransitionRibbon({ settings, disabled, screenCount = 1, onChange, onApplyToAll, onUploadCustomSound, onPreview, onExportPowerPoint }: Props) {
  const [galleryPage, setGalleryPage] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryPosition, setGalleryPosition] = useState({ left: 0, top: 0 });
  const [effectOptionsOpen, setEffectOptionsOpen] = useState(false);
  const [effectOptionsPosition, setEffectOptionsPosition] = useState({ left: 0, top: 0 });
  const [applying, setApplying] = useState(false);
  const [uploadingSound, setUploadingSound] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const effectOptionsRef = useRef<HTMLButtonElement>(null);
  const saved = settings?.transition && typeof settings.transition === 'object'
    ? settings.transition as Record<string, unknown>
    : {};
  const transitionWith = (changes: Record<string, unknown>) => ({
    effect: 'none', duration: 0.7, direction: 'right', advanceOnClick: true,
    easing: 'ease-in-out', intensity: 'standard', respectReducedMotion: true,
    ...saved, ...changes,
  });
  const update = (changes: Record<string, unknown>) => onChange(transitionWith(changes));
  const preview = (transition = saved) => {
    if (onPreview) void onPreview(transition);
    else replayStudioTransition(document.querySelector<HTMLElement>('[data-testid=slide-transition-layer]'), transition);
  };
  const effect = String(saved.effect || 'none');
  const selectedEffect = allTransitionEffects.find((item) => item.value === effect);
  const persistedOption = String(saved.option || saved.direction || '');
  const selectedOptionValue = selectedEffect?.options?.some((option) => option.value === persistedOption)
    ? persistedOption
    : selectedEffect?.defaultOption || '';
  const galleryPageCount = Math.ceil(allTransitionEffects.length / galleryPageSize);
  const visibleEffects = allTransitionEffects.slice(galleryPage * galleryPageSize, (galleryPage + 1) * galleryPageSize);
  const chooseEffect = (nextEffect: string) => {
    const definition = allTransitionEffects.find((item) => item.value === nextEffect);
    const next = transitionWith({
      effect: nextEffect,
      option: definition?.defaultOption || '',
      direction: definition?.defaultOption || 'right',
    });
    onChange(next);
    setGalleryOpen(false);
    setEffectOptionsOpen(false);
    window.requestAnimationFrame(() => preview(next));
  };
  const openEffectOptions = () => {
    if (!selectedEffect?.options?.length) return;
    const rect = effectOptionsRef.current?.getBoundingClientRect();
    if (rect) {
      const width = Math.min(360, window.innerWidth - 24);
      setEffectOptionsPosition({
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        top: rect.bottom + 4,
      });
    }
    setEffectOptionsOpen(true);
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
    if (!galleryOpen && !effectOptionsOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setGalleryOpen(false);
        setEffectOptionsOpen(false);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [effectOptionsOpen, galleryOpen]);

  return (
    <div className="flex w-max items-center gap-2 whitespace-nowrap [&>*]:shrink-0" aria-label="Transition controls">
      <div className="flex items-center gap-2 border-r border-slate-200 pr-3">
        <button type="button" disabled={disabled} onClick={() => preview()} title="Preview transition" className="flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-lg border border-transparent text-blue-900 hover:border-blue-200 hover:bg-blue-50 disabled:opacity-40"><Eye size={21} /><span className="text-[9px] font-semibold">Preview</span></button>
        <div ref={galleryRef} className="flex h-14 w-[clamp(21rem,34vw,36rem)] shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          <div className="grid min-w-0 flex-1 grid-cols-8 items-center gap-0.5 px-1">
            {visibleEffects.map((item) => (
              <button key={item.value} type="button" disabled={disabled} title={item.label} aria-label={`Use ${item.label} transition`} onClick={() => chooseEffect(item.value)} className={`flex h-12 min-w-0 flex-col items-center justify-center rounded-md border px-1 text-[10px] font-semibold ${effect === item.value ? 'border-blue-600 bg-blue-100 text-blue-950' : 'border-transparent bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'}`}>
                <TransitionIcon effect={item.value} /><span className="mt-0.5 w-full truncate text-center">{item.label}</span>
              </button>
            ))}
          </div>
          <div className="grid w-7 shrink-0 grid-rows-3 border-l border-slate-200 bg-white">
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
                <div className="grid grid-cols-[repeat(auto-fit,minmax(3rem,1fr))] gap-1">
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

      {effectOptionsOpen && selectedEffect?.options?.length ? createPortal(
        <div className="fixed inset-0 z-[260]" onMouseDown={() => setEffectOptionsOpen(false)}>
          <div role="menu" aria-label={`${selectedEffect.label} effect options`} onMouseDown={(event) => event.stopPropagation()} className="fixed w-[min(22.5rem,calc(100vw-1.5rem))] rounded-lg border border-slate-300 bg-white p-2 shadow-2xl" style={effectOptionsPosition}>
            <h3 className="mb-2 border-b border-slate-200 px-1 pb-2 text-xs font-bold text-slate-800">{selectedEffect.label} Effect Options</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {selectedEffect.options.map((option) => (
                <button key={option.value} type="button" role="menuitemradio" aria-checked={selectedOptionValue === option.value} onClick={() => { update({ option: option.value, direction: option.value }); setEffectOptionsOpen(false); window.requestAnimationFrame(() => preview({ ...saved, option: option.value, direction: option.value })); }} className={`flex min-h-14 items-center gap-2 rounded-md border p-2 text-left text-[11px] font-semibold ${selectedOptionValue === option.value ? 'border-blue-600 bg-blue-50 text-blue-950' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50'}`}>
                  <EffectOptionIcon value={option.value} /><span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      ) : null}

      <div className="grid grid-cols-[8.5rem_7.5rem] gap-1 border-r border-slate-200 pr-2 [&>button]:h-7 [&>label]:h-7">
        <button ref={effectOptionsRef} type="button" aria-haspopup="menu" aria-expanded={effectOptionsOpen} title="Effect Options" disabled={disabled || !selectedEffect?.options?.length} onClick={openEffectOptions} className="flex h-8 w-[8.5rem] items-center justify-center gap-1 rounded-md bg-slate-100 px-2 text-[10px] font-semibold text-slate-800 hover:bg-blue-50 disabled:text-slate-400"><SlidersHorizontal size={14} /><span>Effect Options</span><ChevronDown size={11} /></button>
        <label className="flex h-8 items-center gap-1 rounded-md bg-slate-100 px-2 text-[10px] font-semibold text-slate-600">Duration<input aria-label="Transition duration" title="Duration in seconds" type="number" min="0.1" max="20" step="0.1" disabled={disabled} value={Number(saved.duration) || 0.7} onChange={(event) => update({ duration: Number(event.target.value) })} className={`${controlClass} min-w-0 flex-1 bg-transparent px-0`} /></label>
        <select aria-label="Motion intensity" title="Motion intensity" disabled={disabled} value={String(saved.intensity || 'standard')} onChange={(event) => update({ intensity: event.target.value })} className={`${controlClass} w-[8.5rem] bg-slate-100`}><option value="subtle">Subtle motion</option><option value="standard">Standard motion</option><option value="dramatic">Dramatic motion</option></select>
        <select aria-label="Transition easing" title="Easing" disabled={disabled} value={String(saved.easing || 'ease-in-out')} onChange={(event) => update({ easing: event.target.value })} className={`${controlClass} w-[7.5rem] bg-slate-100`}><option value="ease-in-out">Smooth</option><option value="ease-out">Decelerate</option><option value="ease-in">Accelerate</option><option value="linear">Linear</option><option value="cubic-bezier(.2,.8,.2,1)">Cinematic</option></select>
      </div>

      <div className="grid grid-cols-[auto_7.5rem] items-center gap-x-1 border-r border-slate-200 pr-2">
        <Volume2 size={15} className="text-slate-500" />
        <select aria-label="Transition sound" title="Sound" disabled={disabled} value={String(saved.sound || 'none')} onChange={(event) => { const sound = event.target.value; update({ sound }); void playStudioTransitionSound(sound).catch(() => undefined); }} className={`${controlClass} w-[7.5rem] bg-slate-100`}>
          {STUDIO_TRANSITION_SOUNDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          {saved.customSound ? <option value="custom">{String((saved.customSound as Record<string, unknown>).name || 'Custom sound')}</option> : null}
        </select>
        {onUploadCustomSound ? <label title="Upload a custom transition sound" className="col-span-2 flex h-6 cursor-pointer items-center justify-center gap-1 rounded border border-slate-200 px-1 text-[9px] font-semibold text-slate-700 hover:bg-blue-50">
          {uploadingSound ? <LoaderCircle size={12} className="animate-spin" /> : <Upload size={12} />}
          <span>{uploadingSound ? 'Uploading…' : saved.customSound ? 'Replace custom sound' : 'Custom sound'}</span>
          <input type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.aac" disabled={disabled || uploadingSound} className="sr-only" onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            setUploadingSound(true);
            try {
              const customSound = await onUploadCustomSound(file);
              update({ sound: 'custom', customSound });
            } catch {
              // The parent reports the actionable upload error.
            } finally {
              setUploadingSound(false);
            }
          }} />
        </label> : null}
        <label className="col-span-2 flex h-6 items-center gap-1 rounded px-1 text-[10px] font-semibold hover:bg-slate-50"><input className="h-3.5 w-3.5" type="checkbox" disabled={disabled || ['none', 'stop'].includes(String(saved.sound || 'none'))} checked={saved.loopSound === true} onChange={(event) => update({ loopSound: event.target.checked })} />Loop sound</label>
      </div>

      <div className="grid grid-cols-2 items-center gap-x-2 border-r border-slate-200 pr-2 text-[10px] font-semibold">
        <label className="flex h-7 items-center gap-1 rounded px-1 hover:bg-slate-50"><MousePointerClick size={13} /><input className="h-3.5 w-3.5" type="checkbox" disabled={disabled} checked={saved.advanceOnClick !== false} onChange={(event) => update({ advanceOnClick: event.target.checked })} />On click</label>
        <label className="flex h-7 items-center gap-1 rounded px-1 hover:bg-slate-50"><input className="h-3.5 w-3.5" type="checkbox" disabled={disabled} checked={saved.advanceAfterEnabled === true} onChange={(event) => update({ advanceAfterEnabled: event.target.checked })} />After<input aria-label="Advance after seconds" type="number" min="0" max="3600" step="0.5" disabled={disabled || saved.advanceAfterEnabled !== true} value={Number(saved.advanceAfterSeconds) || 0} onChange={(event) => update({ advanceAfterSeconds: Number(event.target.value) })} className={`${controlClass} w-11 bg-slate-100 text-center`} />s</label>
        <label className="col-span-2 flex h-7 items-center gap-1 rounded px-1 hover:bg-slate-50"><ShieldCheck size={13} /><input className="h-3.5 w-3.5" type="checkbox" disabled={disabled} checked={saved.respectReducedMotion !== false} onChange={(event) => update({ respectReducedMotion: event.target.checked })} />Respect reduced motion</label>
      </div>

      {onApplyToAll && screenCount > 1 ? <button type="button" disabled={disabled || applying} onClick={async () => { setApplying(true); try { await onApplyToAll(transitionWith({})); } finally { setApplying(false); } }} className="inline-flex h-12 items-center gap-1 rounded-md bg-blue-50 px-3 text-[10px] font-semibold text-blue-900 hover:bg-blue-100 disabled:opacity-40">{applying ? <LoaderCircle size={15} className="animate-spin" /> : <CopyCheck size={15} />}{applying ? 'Applying…' : 'Apply to all'}{!applying ? <Check size={11} /> : null}</button> : null}
      {onExportPowerPoint ? <button type="button" disabled={disabled} onClick={() => void onExportPowerPoint()} title="Export retained PowerPoint with current transition settings" className="inline-flex h-12 items-center gap-1 rounded-md border border-blue-200 bg-white px-3 text-[10px] font-semibold text-blue-900 hover:bg-blue-50 disabled:opacity-40"><Download size={15} />Export PPTX</button> : null}
    </div>
  );
}
