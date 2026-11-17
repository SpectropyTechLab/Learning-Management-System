import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { StudioElement, StudioScreen } from '../types';
import { buildStudioAnimationSequence, persistStudioAnimationSequence } from './studioAnimationSequence';

interface Props {
  screen: StudioScreen | null;
  selectedElementId: string | null;
  onCommit: (elements: StudioElement[], selectElementId?: string | null) => void;
  onSelectElement?: (elementId: string) => void;
  onSelectAnimation?: (effectId: string) => void;
}

const elementName = (element: StudioElement, index: number) =>
  String(element.content.layerName || element.content.text || element.content.title || `${element.type} ${index + 1}`).slice(0, 42);

export default function StudioAnimationsPanel({ screen, selectedElementId, onCommit, onSelectElement, onSelectAnimation }: Props) {
  const sequence = useMemo(() => buildStudioAnimationSequence(screen?.elements ?? []), [screen?.elements]);
  const [activeKey, setActiveKey] = useState('');
  const [dragKeys, setDragKeys] = useState<string[] | null>(null);
  const draggingKeyRef = useRef<string | null>(null);
  const shownSequence = dragKeys
    ? dragKeys.map((key) => sequence.find((entry) => entry.key === key)).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    : sequence;
  const active = sequence.find((entry) => entry.key === activeKey)
    ?? sequence.find((entry) => entry.elementId === selectedElementId)
    ?? sequence[0]
    ?? null;

  useEffect(() => {
    if (active && active.key !== activeKey) setActiveKey(active.key);
  }, [active, activeKey]);

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

  return <div onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} className="flex h-full min-h-0 flex-col">
    <div className="flex shrink-0 items-center justify-between gap-2 pr-8">
      <h2 className="truncate font-semibold text-slate-900">Animation Pane</h2>
      <div className="flex shrink-0 items-center gap-1"><button type="button" title="Move animation up" aria-label="Move animation up" onClick={() => moveActive(-1)} disabled={activeIndex <= 0} className="grid h-8 w-8 place-items-center rounded-lg border disabled:opacity-30"><ChevronUp size={15}/></button><button type="button" title="Move animation down" aria-label="Move animation down" onClick={() => moveActive(1)} disabled={activeIndex < 0 || activeIndex >= sequence.length - 1} className="grid h-8 w-8 place-items-center rounded-lg border disabled:opacity-30"><ChevronDown size={15}/></button></div>
    </div>
    <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden border-t border-slate-200 pt-1.5">
      {!shownSequence.length ? <p className="p-3 text-center text-xs text-slate-500">Select an element and add its first animation from the ribbon.</p> : <div className="grid min-h-0 gap-0.5 overflow-y-auto overflow-x-hidden pr-0.5">{shownSequence.map((entry, index) =>
        <div key={entry.key} data-animation-sequence-key={entry.key} className={`flex min-w-0 items-center gap-1 border-l-2 px-0.5 py-1 ${active?.key === entry.key ? 'border-blue-700 bg-blue-50' : 'border-transparent hover:bg-slate-50'}`}>
          <button type="button" title="Drag animation to reorder the Screen sequence" aria-label={`Drag ${entry.effect.effect} animation to reorder`} onPointerDown={(event) => { event.preventDefault(); draggingKeyRef.current = entry.key; setDragKeys(sequence.map((item) => item.key)); event.currentTarget.setPointerCapture(event.pointerId); }} className="grid h-7 w-6 touch-none place-items-center text-slate-400"><GripVertical size={14}/></button>
          <button type="button" onClick={() => { setActiveKey(entry.key); onSelectAnimation?.(String(entry.effect.id)); onSelectElement?.(entry.elementId); }} className="flex min-w-0 flex-1 items-center gap-2 text-left"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-900">{index + 1}</span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold text-slate-800">{elementName(entry.element, (screen?.elements ?? []).indexOf(entry.element))}</span><span className="block truncate text-[9px] capitalize text-slate-500">{entry.effect.effect.replaceAll('-', ' ')} · {String(entry.effect.start || 'on-click').replaceAll('-', ' ')}</span></span></button>
        </div>)}</div>}
    </div>
  </div>;
}
