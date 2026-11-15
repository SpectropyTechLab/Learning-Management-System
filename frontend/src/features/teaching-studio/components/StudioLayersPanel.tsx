import { Eye, EyeOff, GripVertical, Lock, Unlock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { StudioElement, StudioScreen } from '../types';
import { orderedStudioLayers, reorderStudioLayers, studioLayerName, updateStudioLayer } from './studioLayerModel';

type Props = {
  screen: StudioScreen | null;
  selectedElementId: string | null;
  readOnly?: boolean;
  onSelect: (elementId: string) => void;
  onCommit: (elements: StudioElement[], selectedElementId?: string | null) => void;
};

export default function StudioLayersPanel({ screen, selectedElementId, readOnly = false, onSelect, onCommit }: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const orderedIdsRef = useRef<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const screenElementSignature = screen?.elements.map((element) => `${element.id}:${Number(element.position.zIndex) || 0}`).join('|') || '';

  useEffect(() => {
    if (draggingId || !screen) return;
    const next = orderedStudioLayers(screen.elements).map((element) => element.id);
    setOrderedIds(next);
    orderedIdsRef.current = next;
  }, [draggingId, screen, screenElementSignature]);

  if (!screen) return <p className="p-4 text-sm text-slate-500">Select a Screen to view its layers.</p>;
  const sourceLayers = orderedStudioLayers(screen.elements);
  const layerById = new Map(sourceLayers.map((element) => [element.id, element]));
  const layers = (orderedIds.length ? orderedIds : sourceLayers.map((element) => element.id))
    .map((id) => layerById.get(id))
    .filter((element): element is StudioElement => Boolean(element));
  const commitLayer = (elementId: string, changes: { hidden?: boolean; locked?: boolean; layerName?: string }) =>
    onCommit(updateStudioLayer(screen.elements, elementId, changes), elementId);

  const moveDraggedLayer = (event: React.PointerEvent) => {
    if (!draggingId) return;
    const list = listRef.current;
    if (list) {
      const bounds = list.getBoundingClientRect();
      const edge = 34;
      if (event.clientY < bounds.top + edge) list.scrollTop -= 12;
      else if (event.clientY > bounds.bottom - edge) list.scrollTop += 12;
    }
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-layer-id]');
    const targetId = target?.dataset.layerId;
    if (!targetId || targetId === draggingId) return;
    setOrderedIds((current) => {
      const fromIndex = current.indexOf(draggingId);
      const targetIndex = current.indexOf(targetId);
      if (fromIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      next.splice(fromIndex, 1);
      next.splice(targetIndex, 0, draggingId);
      orderedIdsRef.current = next;
      return next;
    });
  };

  const finishLayerDrag = (event: React.PointerEvent) => {
    if (!draggingId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const selectedId = draggingId;
    setDraggingId(null);
    onCommit(reorderStudioLayers(screen.elements, orderedIdsRef.current), selectedId);
  };

  return (
    <div className="grid gap-1.5 p-1">
      <div>
        <h3 className="text-xs font-bold text-slate-900">Layers</h3>
        <p className="text-[10px] leading-4 text-slate-500">Front first · drag a row to reorder</p>
      </div>
      {layers.length === 0 ? <p className="rounded-lg border border-dashed p-5 text-center text-xs text-slate-500">This Screen has no elements.</p> : (
        <div ref={listRef} onPointerMove={moveDraggedLayer} onPointerUp={finishLayerDrag} onPointerCancel={finishLayerDrag} className="grid max-h-[min(62vh,560px)] gap-1 overflow-auto pr-0.5">
          {layers.map((element, index) => {
            const hidden = element.position.hidden === true;
            const locked = element.position.locked === true;
            const selected = selectedElementId === element.id;
            return (
              <div key={element.id} data-layer-id={element.id} className={`flex min-w-0 items-center gap-0.5 rounded-md border px-1 py-1 transition ${draggingId === element.id ? 'border-blue-600 bg-blue-100 opacity-70' : selected ? 'border-blue-700 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                {!readOnly && <button type="button" title="Drag to reorder layer" aria-label={`Drag ${studioLayerName(element, index)} to reorder`} onPointerDown={(event) => { event.preventDefault(); setDraggingId(element.id); const current = layers.map((layer) => layer.id); setOrderedIds(current); orderedIdsRef.current = current; event.currentTarget.setPointerCapture(event.pointerId); }} className="grid h-7 w-6 shrink-0 touch-none place-items-center cursor-grab rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"><GripVertical size={14} /></button>}
                <div className="min-w-0 flex-1">
                  {renamingId === element.id && !readOnly ? (
                    <input autoFocus defaultValue={studioLayerName(element, index)} onBlur={(event) => { commitLayer(element.id, { layerName: event.target.value.trim() }); setRenamingId(null); }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') setRenamingId(null); }} className="h-6 w-full rounded border border-blue-300 bg-white px-1.5 text-[11px]" aria-label="Layer name" />
                  ) : (
                    <button type="button" onClick={() => onSelect(element.id)} onDoubleClick={() => !readOnly && setRenamingId(element.id)} className="block w-full min-w-0 text-left" title={`Select ${studioLayerName(element, index)}`}>
                      <span className="block truncate text-[11px] font-semibold leading-4 text-slate-800">{studioLayerName(element, index)}</span>
                      <span className="block truncate text-[9px] capitalize leading-3 text-slate-400">{element.type.replaceAll('_', ' ')}</span>
                    </button>
                  )}
                </div>
                <button type="button" disabled={readOnly} onClick={() => commitLayer(element.id, { hidden: !hidden })} title={hidden ? 'Show layer' : 'Hide layer'} aria-label={hidden ? 'Show layer' : 'Hide layer'} className="grid h-7 w-7 place-items-center rounded hover:bg-slate-100 disabled:opacity-40">{hidden ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                <button type="button" disabled={readOnly} onClick={() => commitLayer(element.id, { locked: !locked })} title={locked ? 'Unlock layer' : 'Lock layer'} aria-label={locked ? 'Unlock layer' : 'Lock layer'} className="grid h-7 w-7 place-items-center rounded hover:bg-slate-100 disabled:opacity-40">{locked ? <Lock size={13} /> : <Unlock size={13} />}</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
