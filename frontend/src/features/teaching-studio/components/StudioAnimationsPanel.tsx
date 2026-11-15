import { Activity, CircleDot, GripVertical, LogIn, LogOut, Play, Route, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { StudioElement, StudioScreen } from '../types';
import { buildStudioAnimationSequence, persistStudioAnimationSequence, studioElementAnimationEffects, type StudioAnimationEffect } from './studioAnimationSequence';

const categories = [
  { name: 'Entrance', Icon: LogIn, color: 'text-emerald-700', effects: [['appear', '●'], ['fade', '◐'], ['fly-in', '➜'], ['wipe', '◩'], ['zoom', '⊕'], ['float-in', '⇧'], ['split', '◫'], ['wheel', '✺'], ['random-bars', '▥'], ['grow-turn', '⟳']] },
  { name: 'Emphasis', Icon: Activity, color: 'text-amber-700', effects: [['pulse', '♥'], ['spin', '↻'], ['grow', '✦'], ['bounce', '↕'], ['teeter', '⌁'], ['flash', '✷'], ['wave', '〰'], ['color-pulse', '◉'], ['bold-flash', 'B'], ['underline', 'U̲']] },
  { name: 'Exit', Icon: LogOut, color: 'text-rose-700', effects: [['fade-out', '◑'], ['fly-out', '➜'], ['zoom-out', '⊖'], ['wipe-out', '◨'], ['float-out', '⇩'], ['split-out', '◧'], ['disappear', '○'], ['sink', '⇣']] },
  { name: 'Motion', Icon: Route, color: 'text-blue-700', effects: [['path-line', '╱'], ['path-arc', '⌒'], ['path-turn', '↳'], ['path-circle', '○'], ['path-loop', '∞'], ['path-zigzag', '〽']] },
] as const;

interface Props {
  screen: StudioScreen | null;
  selectedElementId: string | null;
  onUpdate: (element: StudioElement) => void;
  onCommit: (elements: StudioElement[], selectElementId?: string | null) => void;
  onPreview?: (elementId: string) => void;
  onSelectElement?: (elementId: string) => void;
}

const elementName = (element: StudioElement, index: number) =>
  String(element.content.layerName || element.content.text || element.content.title || `${element.type} ${index + 1}`).slice(0, 42);

export default function StudioAnimationsPanel({ screen, selectedElementId, onUpdate, onCommit, onPreview, onSelectElement }: Props) {
  const selected = screen?.elements.find((element) => element.id === selectedElementId) ?? null;
  const sequence = useMemo(() => buildStudioAnimationSequence(screen?.elements ?? []), [screen?.elements]);
  const [category, setCategory] = useState(0);
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

  const replaceElementEffects = (elementId: string, effects: StudioAnimationEffect[]) => {
    const owner = screen?.elements.find((element) => element.id === elementId);
    if (!owner) return;
    const first = effects[0];
    onUpdate({ ...owner, content: { ...owner.content, animation: { ...(owner.content.animation as Record<string, unknown> | undefined), effects, effect: first?.effect || 'none', duration: Number(first?.duration) || 0.8, delay: Number(first?.delay) || 0 } } });
  };

  const addEffect = (effectName: string) => {
    if (!selected || !screen) return;
    const normalized = persistStudioAnimationSequence(screen.elements, sequence.map((entry) => entry.key));
    const owner = normalized.find((element) => element.id === selected.id)!;
    const effects = studioElementAnimationEffects(owner);
    const effect: StudioAnimationEffect = { id: `animation-${Date.now()}`, effect: effectName, duration: 0.8, delay: 0, start: effects.length ? 'after-previous' : 'on-click', sequenceOrder: sequence.length };
    const next = normalized.map((element) => element.id === owner.id
      ? { ...element, content: { ...element.content, animation: { ...(element.content.animation as Record<string, unknown> | undefined), effects: [...effects, effect], effect: effects[0]?.effect || effect.effect, duration: Number(effects[0]?.duration) || 0.8, delay: Number(effects[0]?.delay) || 0 } } }
      : element);
    onCommit(next, owner.id);
    setActiveKey(`${owner.id}:${effect.id}`);
  };

  const editActive = (changes: Partial<StudioAnimationEffect>) => {
    if (!active) return;
    replaceElementEffects(active.elementId, studioElementAnimationEffects(active.element).map((effect) => effect.id === active.effect.id ? { ...effect, ...changes } : effect));
  };

  const removeActive = () => {
    if (!active || !screen) return;
    const remaining = studioElementAnimationEffects(active.element).filter((effect) => effect.id !== active.effect.id);
    const next = screen.elements.map((element) => element.id === active.elementId
      ? { ...element, content: { ...element.content, animation: { ...(element.content.animation as Record<string, unknown> | undefined), effects: remaining, effect: remaining[0]?.effect || 'none', duration: Number(remaining[0]?.duration) || 0.8, delay: Number(remaining[0]?.delay) || 0 } } }
      : element);
    onCommit(persistStudioAnimationSequence(next, sequence.filter((entry) => entry.key !== active.key).map((entry) => entry.key)), active.elementId);
    setActiveKey('');
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

  return <div onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-900"><Sparkles size={17}/></span><div><h2 className="font-semibold text-slate-900">Animation Pane</h2><p className="text-xs text-slate-500">One sequence for the complete Screen.</p></div></div>
      <button type="button" title="Preview selected animation" onClick={() => active && onPreview?.(active.elementId)} disabled={!active} className="grid h-8 w-8 place-items-center rounded-lg border disabled:opacity-30"><Play size={15}/></button>
    </div>

    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
      <div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Screen sequence</p><span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-500">{sequence.length}</span></div>
      {!shownSequence.length ? <p className="p-3 text-center text-xs text-slate-500">Select an element and add its first animation.</p> : <div className="grid max-h-64 gap-1 overflow-auto">{shownSequence.map((entry, index) =>
        <div key={entry.key} data-animation-sequence-key={entry.key} className={`flex items-center gap-1 rounded-lg border px-1 py-1 ${active?.key === entry.key ? 'border-blue-700 bg-white' : 'border-transparent hover:bg-white'}`}>
          <button type="button" title="Drag animation to reorder the Screen sequence" aria-label={`Drag ${entry.effect.effect} animation to reorder`} onPointerDown={(event) => { event.preventDefault(); draggingKeyRef.current = entry.key; setDragKeys(sequence.map((item) => item.key)); event.currentTarget.setPointerCapture(event.pointerId); }} className="grid h-7 w-6 touch-none place-items-center text-slate-400"><GripVertical size={14}/></button>
          <button type="button" onClick={() => { setActiveKey(entry.key); onSelectElement?.(entry.elementId); }} className="flex min-w-0 flex-1 items-center gap-2 text-left"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-900">{index + 1}</span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold text-slate-800">{elementName(entry.element, (screen?.elements ?? []).indexOf(entry.element))}</span><span className="block truncate text-[9px] capitalize text-slate-500">{entry.effect.effect.replaceAll('-', ' ')} · {String(entry.effect.start || 'on-click').replaceAll('-', ' ')}</span></span></button>
        </div>)}</div>}
    </div>

    <div className="mt-3 grid grid-cols-4 gap-1">{categories.map(({ name, Icon, color }, index) => <button key={name} type="button" onClick={() => setCategory(index)} className={`grid place-items-center gap-1 rounded-lg border py-1.5 text-[9px] font-semibold ${category === index ? 'border-blue-700 bg-blue-50' : 'border-slate-200'}`}><Icon size={15} className={color}/>{name}</button>)}</div>
    <div className="mt-2 grid grid-cols-5 gap-1.5">{categories[category].effects.map(([effect, glyph]) => <button key={effect} type="button" disabled={!selected} title={selected ? `Add ${effect.replaceAll('-', ' ')} to ${elementName(selected, 0)}` : 'Select an element first'} onClick={() => addEffect(effect)} className={`studio-effect-tile grid aspect-square place-items-center rounded-lg border border-slate-200 bg-white text-lg font-bold ${categories[category].color} disabled:opacity-30`}><span>{glyph}</span></button>)}</div>

    {active ? <div className="mt-3 rounded-xl border border-slate-200 p-2.5">
      <div className="flex items-center justify-between"><div className="min-w-0"><p className="truncate text-xs font-semibold">{elementName(active.element, 0)}</p><p className="text-[10px] capitalize text-slate-500">{active.effect.effect.replaceAll('-', ' ')}</p></div><button type="button" title="Remove animation" onClick={removeActive} className="grid h-7 w-7 place-items-center rounded border border-red-200 text-red-700"><Trash2 size={13}/></button></div>
      <label className="mt-2 block text-xs font-semibold text-slate-600">Start<select value={String(active.effect.start || 'on-click')} onChange={(event) => editActive({ start: event.target.value })} className="mt-1 h-8 w-full rounded-lg border px-2"><option value="on-click">On click</option><option value="with-previous">With previous</option><option value="after-previous">After previous</option><option value="trigger">On object click</option></select></label>
      {active.effect.start === 'trigger' ? <label className="mt-2 block text-xs font-semibold text-slate-600">Trigger object<select value={String(active.effect.triggerElementId || '')} onChange={(event) => editActive({ triggerElementId: event.target.value })} className="mt-1 h-8 w-full rounded-lg border px-2"><option value="">Select object</option>{(screen?.elements ?? []).filter((element) => element.id !== active.elementId).map((element, index) => <option key={element.id} value={element.id}>{elementName(element, index)}</option>)}</select></label> : null}
      <div className="mt-2 grid grid-cols-2 gap-2"><label className="text-xs font-semibold text-slate-600">Duration<input type="number" min="0.1" max="60" step="0.1" value={Number(active.effect.duration) || 0.8} onChange={(event) => editActive({ duration: Number(event.target.value) })} className="mt-1 h-8 w-full rounded-lg border px-2"/></label><label className="text-xs font-semibold text-slate-600">Delay<input type="number" min="0" max="60" step="0.1" value={Number(active.effect.delay) || 0} onChange={(event) => editActive({ delay: Number(event.target.value) })} className="mt-1 h-8 w-full rounded-lg border px-2"/></label></div>
      <div className="mt-2 grid grid-cols-2 gap-2"><label className="text-xs font-semibold text-slate-600">Direction<select value={String(active.effect.direction || 'default')} onChange={(event) => editActive({ direction: event.target.value })} className="mt-1 h-8 w-full rounded-lg border px-2"><option value="default">Default</option><option value="left">From left</option><option value="right">From right</option><option value="top">From top</option><option value="bottom">From bottom</option><option value="vertical">Vertical</option><option value="horizontal">Horizontal</option></select></label><label className="text-xs font-semibold text-slate-600">Repeat<select value={Number(active.effect.repeat) || 1} onChange={(event) => editActive({ repeat: Number(event.target.value) })} className="mt-1 h-8 w-full rounded-lg border px-2"><option value="1">Once</option><option value="2">2 times</option><option value="3">3 times</option><option value="999">Until next click</option></select></label></div>
      {active.effect.effect === 'color-pulse' ? <label className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-600">Pulse colour<input type="color" value={String(active.effect.color || '#2563eb')} onChange={(event) => editActive({ color: event.target.value })} aria-label="Colour Pulse colour" className="h-8 w-10 rounded border p-0.5"/></label> : null}
      <label className="mt-2 block text-xs font-semibold text-slate-600">Animate text<select value={String(active.effect.textSequence || 'object')} onChange={(event) => editActive({ textSequence: event.target.value })} className="mt-1 h-8 w-full rounded-lg border px-2"><option value="object">As one object</option><option value="paragraph">By paragraph</option><option value="word">By word</option><option value="letter">By letter</option></select></label>
    </div> : null}
    <p className="mt-3 flex items-start gap-1 text-[10px] text-slate-500"><CircleDot size={12} className="mt-0.5 shrink-0"/>Drag any effect across elements to define the Screen’s global playback order.</p>
  </div>;
}
