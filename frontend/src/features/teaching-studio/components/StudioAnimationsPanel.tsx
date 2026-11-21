import { ChevronDown, ChevronUp, GripVertical, Play, PlayCircle, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { StudioElement, StudioScreen } from '../types';
import StudioAnimationIcon from './StudioAnimationIcon';
import StudioAnimationPropertiesDialog from './StudioAnimationPropertiesDialog';
import {
  buildStudioAnimationGroups,
  buildStudioAnimationSequence,
  persistStudioAnimationSequence,
  type StudioAnimationSequenceEntry,
} from './studioAnimationSequence';
import { studioAnimationCategory, studioAnimationCategoryColour } from './studioAnimationModel';

interface Props {
  screen: StudioScreen | null;
  selectedElementId: string | null;
  onCommit: (elements: StudioElement[], selectElementId?: string | null) => void;
  onSelectElement?: (elementId: string) => void;
  onSelectAnimation?: (effectId: string) => void;
  onPreviewAll?: () => void;
  onPreviewFrom?: (entry: StudioAnimationSequenceEntry) => void;
  onUpdateEffect?: (elementId: string, effectId: string, changes: Record<string, unknown>) => void;
  onRemoveEffect?: (elementId: string, effectId: string) => void;
}

const elementName = (element: StudioElement, index: number) =>
  String(element.content.layerName || element.content.text || element.content.title || `${element.type} ${index + 1}`).slice(0, 42);

const startLabel = (value: unknown) => ({
  'on-click': 'On Click', 'with-previous': 'With Previous', 'after-previous': 'After Previous', trigger: 'Trigger',
}[String(value || 'on-click')] || 'On Click');

export default function StudioAnimationsPanel({
  screen,
  selectedElementId,
  onCommit,
  onSelectElement,
  onSelectAnimation,
  onPreviewAll,
  onPreviewFrom,
  onUpdateEffect,
  onRemoveEffect,
}: Props) {
  const sequence = useMemo(() => buildStudioAnimationSequence(screen?.elements ?? []), [screen?.elements]);
  const groups = useMemo(() => buildStudioAnimationGroups(screen?.elements ?? []), [screen?.elements]);
  const [activeKey, setActiveKey] = useState('');
  const [menuKey, setMenuKey] = useState('');
  const [propertiesKey, setPropertiesKey] = useState('');
  const [dragKeys, setDragKeys] = useState<string[] | null>(null);
  const draggingKeyRef = useRef<string | null>(null);
  const shownSequence = dragKeys
    ? dragKeys.map((key) => sequence.find((entry) => entry.key === key)).filter((entry): entry is StudioAnimationSequenceEntry => Boolean(entry))
    : sequence;
  const active = sequence.find((entry) => entry.key === activeKey)
    ?? sequence.find((entry) => entry.elementId === selectedElementId)
    ?? sequence[0]
    ?? null;

  useEffect(() => {
    if (active && active.key !== activeKey) setActiveKey(active.key);
  }, [active, activeKey]);

  const selectEntry = (entry: StudioAnimationSequenceEntry) => {
    setActiveKey(entry.key);
    onSelectAnimation?.(String(entry.effect.id));
    onSelectElement?.(entry.elementId);
  };

  const moveDrag = (event: React.PointerEvent) => {
    const draggingKey = draggingKeyRef.current;
    if (!draggingKey) return;
    const targetKey = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-animation-sequence-key]')?.dataset.animationSequenceKey;
    if (!targetKey || targetKey === draggingKey) return;
    setDragKeys((current) => {
      const keys = current ?? sequence.map((entry) => entry.key);
      const from = keys.indexOf(draggingKey);
      const to = keys.indexOf(targetKey);
      if (from < 0 || to < 0) return keys;
      const next = [...keys];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  };

  const finishDrag = () => {
    if (dragKeys && screen) onCommit(persistStudioAnimationSequence(screen.elements, dragKeys), active?.elementId ?? null);
    draggingKeyRef.current = null;
    setDragKeys(null);
  };

  const moveActive = (delta: number) => {
    if (!active || !screen) return;
    const keys = sequence.map((entry) => entry.key);
    const from = keys.indexOf(active.key);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= keys.length) return;
    [keys[from], keys[to]] = [keys[to], keys[from]];
    onCommit(persistStudioAnimationSequence(screen.elements, keys), active.elementId);
  };

  const activeIndex = active ? sequence.findIndex((entry) => entry.key === active.key) : -1;
  const orderByKey = new Map(shownSequence.map((entry, index) => [entry.key, index + 1]));

  return <div onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} className="flex h-full min-h-0 flex-col bg-white">
    <div className="shrink-0 border-b border-slate-200 pb-2 pr-8">
      <div className="flex items-center justify-between gap-2">
        <h2 className="truncate font-semibold text-slate-900">Animation Pane</h2>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" title="Move animation earlier" aria-label="Move animation earlier" onClick={() => moveActive(-1)} disabled={activeIndex <= 0} className="grid h-7 w-7 place-items-center rounded border disabled:opacity-30"><ChevronUp size={14}/></button>
          <button type="button" title="Move animation later" aria-label="Move animation later" onClick={() => moveActive(1)} disabled={activeIndex < 0 || activeIndex >= sequence.length - 1} className="grid h-7 w-7 place-items-center rounded border disabled:opacity-30"><ChevronDown size={14}/></button>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1">
        <button type="button" disabled={!active} onClick={() => active && onPreviewFrom?.(active)} className="inline-flex h-8 items-center justify-center gap-1 rounded border border-slate-300 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-35"><Play size={13}/>Play From</button>
        <button type="button" disabled={!sequence.length} onClick={onPreviewAll} className="inline-flex h-8 items-center justify-center gap-1 rounded border border-blue-200 bg-blue-50 text-[10px] font-semibold text-blue-900 hover:bg-blue-100 disabled:opacity-35"><PlayCircle size={13}/>Play All</button>
      </div>
      <div className="mt-2 flex items-center justify-between text-[8px] font-semibold uppercase tracking-wide text-slate-400"><span>Sequence</span><span>Seconds →</span></div>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-1 pr-0.5">
      {!shownSequence.length ? <p className="p-4 text-center text-xs text-slate-500">Select an element and add its first animation from the ribbon.</p> : groups.map((group) => (
        <section key={group.id} className="border-b border-slate-100 py-1.5 last:border-0">
          <div className="mb-1 flex items-center gap-2 px-1 text-[9px] font-bold text-slate-500">
            <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 ${group.trigger ? 'bg-violet-100 text-violet-800' : 'bg-slate-800 text-white'}`}>{group.trigger ? 'T' : group.clickIndex}</span>
            <span>{group.trigger ? 'Triggered animation' : `Click group ${group.clickIndex}`}</span>
            <span className="ml-auto font-normal text-slate-400">{group.duration.toFixed(2)}s</span>
          </div>
          <div className="space-y-0.5">{group.entries.map((entry) => {
            const selected = active?.key === entry.key;
            const category = studioAnimationCategory(String(entry.effect.effect));
            const colour = studioAnimationCategoryColour(String(entry.effect.effect));
            const width = Math.max(8, ((entry.endsAt - entry.startsAt) / Math.max(group.duration, 0.1)) * 100);
            const left = (entry.startsAt / Math.max(group.duration, 0.1)) * 100;
            return <div key={entry.key} data-animation-sequence-key={entry.key} className={`relative flex min-w-0 items-center gap-1 rounded border-l-[3px] px-0.5 py-1 ${selected ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : 'hover:bg-slate-50'}`} style={{ borderLeftColor: colour }}>
              <button type="button" title="Drag to reorder" aria-label={`Drag ${entry.effect.effect} animation to reorder`} onPointerDown={(event) => { event.preventDefault(); draggingKeyRef.current = entry.key; setDragKeys(sequence.map((item) => item.key)); event.currentTarget.setPointerCapture(event.pointerId); }} className="grid h-8 w-5 touch-none place-items-center text-slate-400"><GripVertical size={13}/></button>
              <button type="button" onClick={() => selectEntry(entry)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
                <span className="relative grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white shadow-sm ring-1 ring-slate-200"><StudioAnimationIcon effect={String(entry.effect.effect)} size={14} styleColour={colour}/><span className="absolute -left-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-slate-900 px-0.5 text-[7px] font-bold text-white">{orderByKey.get(entry.key)}</span></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-semibold text-slate-800">{elementName(entry.element, (screen?.elements ?? []).indexOf(entry.element))}</span><span className="block truncate text-[8px] capitalize text-slate-500">{category} · {String(entry.effect.effect).replaceAll('-', ' ')} · {startLabel(entry.effect.start)}</span><span className="relative mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-200"><span className="absolute h-full rounded-full" style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%`, backgroundColor: colour }}/></span></span>
              </button>
              <button type="button" title="Animation options" aria-label="Animation options" onClick={() => { selectEntry(entry); setMenuKey((current) => current === entry.key ? '' : entry.key); }} className="grid h-7 w-6 place-items-center rounded hover:bg-white"><ChevronDown size={13}/></button>
              {menuKey === entry.key ? <div className="absolute right-1 top-9 z-30 w-44 rounded-lg border border-slate-200 bg-white p-1 text-[10px] shadow-xl">
                {(['on-click', 'with-previous', 'after-previous'] as const).map((start) => <button key={start} type="button" onClick={() => { onUpdateEffect?.(entry.elementId, String(entry.effect.id), { start, triggerElementId: undefined, triggerMediaElementId: undefined }); setMenuKey(''); }} className={`block w-full rounded px-2 py-1.5 text-left hover:bg-blue-50 ${String(entry.effect.start || 'on-click') === start ? 'bg-blue-50 font-bold text-blue-900' : ''}`}>Start {startLabel(start)}</button>)}
                <button type="button" onClick={() => { onPreviewFrom?.(entry); setMenuKey(''); }} className="block w-full rounded px-2 py-1.5 text-left hover:bg-blue-50">Play From Here</button>
                <button type="button" onClick={() => { setPropertiesKey(entry.key); setMenuKey(''); }} className="block w-full rounded px-2 py-1.5 text-left hover:bg-blue-50">Effect Properties…</button>
                <button type="button" onClick={() => { onRemoveEffect?.(entry.elementId, String(entry.effect.id)); setMenuKey(''); }} className="flex w-full items-center gap-1 rounded px-2 py-1.5 text-left text-red-700 hover:bg-red-50"><Trash2 size={11}/>Remove</button>
              </div> : null}
            </div>;
          })}</div>
        </section>
      ))}
    </div>
    {propertiesKey ? (() => {
      const propertiesEntry = sequence.find((entry) => entry.key === propertiesKey);
      return propertiesEntry ? <StudioAnimationPropertiesDialog element={propertiesEntry.element} effect={propertiesEntry.effect} onChange={(changes) => onUpdateEffect?.(propertiesEntry.elementId, String(propertiesEntry.effect.id), changes)} onClose={() => setPropertiesKey('')}/> : null;
    })() : null}
  </div>;
}
