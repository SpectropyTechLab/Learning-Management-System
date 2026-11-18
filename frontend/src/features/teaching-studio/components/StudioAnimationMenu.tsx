import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ban, ChevronDown, GalleryVertical, Plus, Sparkles } from 'lucide-react';
import { STUDIO_ANIMATION_CATEGORIES } from './studioAnimationCatalog';
import StudioAnimationIcon from './StudioAnimationIcon';

export default function StudioAnimationMenu({ label, addMode = false, compact = false, disabled = false, onSelect, onRemove }: {
  label: string;
  addMode?: boolean;
  compact?: boolean;
  disabled?: boolean;
  onSelect: (effect: string) => void;
  onRemove?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 8, top: 100, width: 610 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (triggerRef.current?.contains(event.target as Node)) return;
      if ((event.target as HTMLElement)?.closest('[data-studio-animation-menu]')) return;
      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('pointerdown', close, true);
    window.addEventListener('keydown', closeOnEscape);
    return () => { window.removeEventListener('pointerdown', close, true); window.removeEventListener('keydown', closeOnEscape); };
  }, [open]);
  const toggle = () => {
    if (disabled) return;
    const triggerBounds = triggerRef.current?.getBoundingClientRect();
    const galleryBounds = compact
      ? triggerRef.current?.closest<HTMLElement>('[data-studio-animation-gallery]')?.getBoundingClientRect()
      : undefined;
    const effectOptionsBounds = compact
      ? document.querySelector<HTMLElement>('[data-studio-animation-effect-options]')?.getBoundingClientRect()
      : undefined;
    const bounds = galleryBounds || triggerBounds;
    if (bounds) {
      const requestedWidth = compact && effectOptionsBounds
        ? effectOptionsBounds.right - bounds.left
        : bounds.width;
      const width = compact ? Math.min(requestedWidth, window.innerWidth - 16) : Math.min(610, window.innerWidth - 16);
      setPosition({
        left: Math.max(8, Math.min(bounds.left, window.innerWidth - width - 8)),
        top: bounds.bottom + 4,
        width,
      });
    }
    setOpen((current) => !current);
  };
  const choose = (effect: string) => { onSelect(effect); setOpen(false); };
  return <>
    <button ref={triggerRef} type="button" disabled={disabled} onClick={toggle} title={compact ? label : undefined} aria-label={compact ? label : undefined} aria-expanded={open} className={compact ? 'grid place-items-center hover:bg-blue-50 disabled:text-slate-300' : 'flex h-10 min-w-14 flex-col items-center justify-center rounded-lg border border-transparent px-1 text-[9px] font-semibold text-slate-700 hover:border-slate-200 hover:bg-slate-50 disabled:opacity-35'}>
      {compact ? <GalleryVertical size={12}/> : <><span className="flex items-center gap-0.5">{addMode ? <Plus size={16}/> : <Sparkles size={16}/>}<ChevronDown size={10}/></span><span>{label}</span></>}
    </button>
    {open && typeof document !== 'undefined' ? createPortal(<div data-studio-animation-menu role="menu" className="fixed z-[260] max-h-[min(70vh,570px)] overflow-y-auto rounded-lg border border-slate-300 bg-white p-2 shadow-2xl" style={position}>
      {!addMode && onRemove ? <section className="border-b border-slate-200 pb-2"><h3 className="px-1 text-[10px] font-bold text-slate-700">None</h3><button type="button" onClick={() => { onRemove(); setOpen(false); }} className="mt-1 grid h-14 w-16 place-items-center rounded border border-transparent text-[10px] hover:border-slate-300 hover:bg-slate-50"><Ban size={20} className="text-slate-500"/><span>None</span></button></section> : null}
      {STUDIO_ANIMATION_CATEGORIES.map((category) => <section key={category.id} className="border-b border-slate-200 py-2 last:border-0"><h3 className="px-1 text-[10px] font-bold text-slate-700">{category.name}</h3><div className="mt-1 grid grid-cols-[repeat(auto-fit,minmax(58px,1fr))] gap-1">{category.effects.map(([effect, name]) => <button key={effect} type="button" role="menuitem" onClick={() => choose(effect)} title={name} className="grid h-14 min-w-0 place-items-center rounded border border-transparent px-1 text-[9px] text-slate-700 hover:border-slate-300 hover:bg-slate-50"><StudioAnimationIcon effect={effect} size={20} className={category.colour}/><span className="w-full truncate text-center">{name}</span></button>)}</div></section>)}
    </div>, document.body) : null}
  </>;
}
