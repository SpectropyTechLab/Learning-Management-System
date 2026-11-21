import { ChevronDown, MousePointerClick, PlaySquare } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { StudioElement } from '../types';
import type { StudioAnimationEffectDefinition } from './studioAnimationModel';

const elementLabel = (element: StudioElement, index: number) =>
  String(element.content.layerName || element.content.text || element.content.title || `${element.type} ${index + 1}`).slice(0, 32);

const isMedia = (element: StudioElement) => {
  const resourceType = String((element.content.resource as Record<string, unknown> | undefined)?.usage
    && ((element.content.resource as Record<string, unknown>).usage as Record<string, unknown>).resource_type
    || element.content.mimeType || element.type || '');
  return resourceType.includes('video') || resourceType.includes('audio') || element.type === 'media';
};

export default function StudioAnimationTriggerMenu({ effect, element, elements, disabled, onChange }: {
  effect: StudioAnimationEffectDefinition | null;
  element: StudioElement | null;
  elements: StudioElement[];
  disabled?: boolean;
  onChange: (changes: Partial<StudioAnimationEffectDefinition>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (triggerRef.current?.contains(target) || target.closest('[data-animation-trigger-menu]')) return;
      setOpen(false);
    };
    window.addEventListener('pointerdown', close, true);
    return () => window.removeEventListener('pointerdown', close, true);
  }, [open]);
  const toggle = () => {
    if (disabled || !effect || !element) return;
    const bounds = triggerRef.current?.getBoundingClientRect();
    if (bounds) setPosition({ left: Math.max(8, Math.min(bounds.left, window.innerWidth - 270)), top: bounds.bottom + 4 });
    setOpen((value) => !value);
  };
  const objectTargets = elements.filter((candidate) => candidate.id !== element?.id);
  const mediaTargets = elements.filter(isMedia);
  return <>
    <button ref={triggerRef} type="button" disabled={disabled || !effect || !element} onClick={toggle} aria-expanded={open} className="flex h-10 min-w-14 flex-col items-center justify-center rounded-lg border border-transparent px-1 text-[9px] font-semibold text-slate-700 hover:border-slate-200 hover:bg-slate-50 disabled:opacity-35"><span className="flex items-center"><MousePointerClick size={16}/><ChevronDown size={10}/></span><span>Trigger</span></button>
    {open && typeof document !== 'undefined' ? createPortal(<div data-animation-trigger-menu className="fixed z-[320] w-64 rounded-xl border border-slate-300 bg-white p-2 text-[10px] shadow-2xl" style={position}>
      <p className="px-1 pb-1 font-bold text-slate-800">Trigger</p>
      <button type="button" onClick={() => { onChange({ start: 'on-click', triggerElementId: undefined, triggerMediaElementId: undefined, triggerBookmarkSeconds: undefined }); setOpen(false); }} className="block w-full rounded px-2 py-1.5 text-left hover:bg-blue-50">Animate as part of click sequence</button>
      <div className="mt-1 border-t border-slate-100 pt-1"><p className="px-2 py-1 font-semibold text-slate-500">On click of</p>{objectTargets.length ? objectTargets.map((candidate, index) => <button key={candidate.id} type="button" onClick={() => { onChange({ start: 'trigger', triggerElementId: candidate.id, triggerMediaElementId: undefined, triggerBookmarkSeconds: undefined }); setOpen(false); }} className={`flex w-full items-center gap-1 rounded px-2 py-1.5 text-left hover:bg-blue-50 ${effect?.triggerElementId === candidate.id ? 'bg-blue-50 font-bold text-blue-900' : ''}`}><MousePointerClick size={11}/>{elementLabel(candidate, index)}</button>) : <p className="px-2 py-1 text-slate-400">No other objects</p>}</div>
      <div className="mt-1 border-t border-slate-100 pt-1"><p className="px-2 py-1 font-semibold text-slate-500">On media bookmark</p>{mediaTargets.length ? mediaTargets.map((candidate, index) => <div key={candidate.id} className="grid grid-cols-[1fr_4.5rem] gap-1 px-1 py-0.5"><button type="button" onClick={() => onChange({ start: 'trigger', triggerMediaElementId: candidate.id, triggerElementId: undefined, triggerBookmarkSeconds: Number(effect?.triggerBookmarkSeconds) || 0 })} className={`flex min-w-0 items-center gap-1 rounded px-1 py-1 text-left hover:bg-blue-50 ${effect?.triggerMediaElementId === candidate.id ? 'bg-blue-50 font-bold text-blue-900' : ''}`}><PlaySquare size={11}/><span className="truncate">{elementLabel(candidate, index)}</span></button><input aria-label={`Bookmark time for ${elementLabel(candidate, index)}`} type="number" min="0" step="0.1" value={effect?.triggerMediaElementId === candidate.id ? Number(effect.triggerBookmarkSeconds) || 0 : 0} onChange={(event) => onChange({ start: 'trigger', triggerMediaElementId: candidate.id, triggerElementId: undefined, triggerBookmarkSeconds: Number(event.target.value) })} className="h-6 rounded border px-1"/></div>) : <p className="px-2 py-1 text-slate-400">No audio or video objects</p>}</div>
    </div>, document.body) : null}
  </>;
}
