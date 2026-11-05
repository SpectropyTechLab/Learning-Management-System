import { Copy, ImagePlus, Plus, Trash2 } from 'lucide-react';
import type { Layout, ObjectType, Slot } from '../layouts';
import type { StudioElement, StudioScreen } from '../types';
import { canPlaceResource } from '../resourcePlacement';

interface Props {
  layout: Layout | null;
  screen: StudioScreen | null;
  selectedElementId: string | null;
  onSelect: (elementId: string) => void;
  onAdd: (slot: Slot) => void;
  onAddBlank: (type: ObjectType, region: Slot['region']) => void;
  onUpdate: (element: StudioElement) => void;
  onDuplicate: (elementId: string) => void;
  onRemove: (elementId: string) => void;
}

const textValue = (element: StudioElement) => String(element.content.text || '');
const fieldValue = (element: StudioElement, key: string) => String(element.content[key] || '');
const textLike = new Set<ObjectType>(['title', 'text', 'question', 'response', 'steps', 'workspace', 'footer', 'options', 'data']);
const blankElementTypes: ObjectType[] = ['title', 'text', 'visual', 'media', 'simulation', 'question', 'response', 'steps', 'workspace', 'footer', 'activity', 'graph', 'data', 'options'];

export default function StudioElementPanel({ layout, screen, selectedElementId, onSelect, onAdd, onAddBlank, onUpdate, onDuplicate, onRemove }: Props) {
  if (!screen) return <p className="text-sm text-slate-500">Select a Screen to edit its content.</p>;

  const selected = screen.elements.find((element) => element.id === selectedElementId) || null;
  const selectedSlot = selected
    ? (layout?.slots.find((slot) => slot.id === selected.slotId) ?? {
        id: selected.slotId || selected.id,
        label: 'Screen element',
        region: (selected.type === 'title' ? 'header' : selected.type === 'footer' ? 'footer' : 'content') as Slot['region'],
        allowed: blankElementTypes,
        bounds: selected.position as Slot['bounds'],
      })
    : null;
  const updateContent = (key: string, value: string) =>
    selected &&
    onUpdate({
      ...selected,
      content: { ...selected.content, [key]: value },
    });
  const updatePosition = (key: string, value: number | boolean) =>
    selected &&
    onUpdate({
      ...selected,
      position: { ...selected.position, [key]: value },
    });
  return (
    <div className="grid gap-5">
      <div>
        <h2 className="font-semibold text-slate-900">{layout ? 'Layout slots' : 'Screen elements'}</h2>
        <p className="mt-1 text-sm text-slate-500">{layout ? 'Add permitted content to a slot, then edit it directly on the Screen.' : 'Add an element, then edit it directly on the Screen.'}</p>
        {!layout && (
          <div className="mt-3 grid min-w-0 gap-2 overflow-hidden pr-1">
            {(
              [
                ['title', 'title', 'header'],
                ['text', 'text', 'content'],
                ['footer', 'footer', 'footer'],
              ] as const
            ).map(([label, type, region]) => (
              <button key={region} type="button" onClick={() => onAddBlank(type, region)} className="flex w-full min-w-0 items-center justify-center gap-1 overflow-hidden rounded-lg border border-blue-800 bg-white px-2 py-2 text-center text-xs font-semibold text-blue-900">
                <Plus size={14} className="shrink-0" />
                <span className="min-w-0 whitespace-normal break-words">Add {label}</span>
              </button>
            ))}
            <label className="text-xs font-semibold text-slate-600">
              Add another element type
              <select
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value) {
                    onAddBlank(event.target.value as ObjectType, 'content');
                    event.target.value = '';
                  }
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
              >
                <option value="">Choose element…</option>
                {blankElementTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        <div className="mt-3 min-w-0 space-y-2 overflow-hidden pr-1">
          {(layout?.slots ?? []).map((slot) => {
            const element = screen.elements.find((candidate) => candidate.slotId === slot.id);
            return (
              <div key={slot.id} className={`rounded-lg border p-3 ${element?.id === selectedElementId ? 'border-blue-700 bg-blue-50' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{slot.label}</p>
                    <p className="text-xs text-slate-500">{slot.allowed.join(', ')}</p>
                  </div>
                  {element ? (
                    <button type="button" onClick={() => onSelect(element.id)} className="rounded-lg border border-blue-800 px-3 py-1.5 text-xs font-semibold text-blue-900">
                      Edit
                    </button>
                  ) : (
                    <button type="button" onClick={() => onAdd(slot)} className="inline-flex items-center gap-1 rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white">
                      <Plus size={14} />
                      Add
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {!layout &&
            screen.elements.map((element) => (
              <button key={element.id} type="button" onClick={() => onSelect(element.id)} className={`block w-full min-w-0 overflow-hidden rounded-lg border p-3 text-left ${element.id === selectedElementId ? 'border-blue-700 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                <span className="block truncate text-sm font-semibold capitalize text-slate-900">{element.type}</span>
                <span className="block truncate text-xs text-slate-500">{textValue(element) || element.id}</span>
              </button>
            ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        {!selected || !selectedSlot ? (
          <div className="flex min-h-48 flex-col items-center justify-center text-center text-slate-500">
            <ImagePlus size={28} />
            <p className="mt-2 text-sm">Select an existing object or add content to an empty slot.</p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-800">{selectedSlot.label}</p>
                <h3 className="mt-1 font-semibold text-slate-900">Object inspector</h3>
              </div>
              <div className="flex gap-1">
                {!layout && (
                  <button type="button" onClick={() => onDuplicate(selected.id)} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2 py-1.5 text-xs font-semibold text-blue-800">
                    <Copy size={14} />
                    Duplicate
                  </button>
                )}
                <button type="button" onClick={() => onRemove(selected.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1.5 text-xs font-semibold text-red-700">
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>
            </div>

            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Object type
              <select
                value={selected.type}
                onChange={(event) => {
                  const nextType = event.target.value;
                  const boundType = selected.resource?.usage?.resource_type;
                  const keepResource = typeof boundType === 'string' && canPlaceResource(nextType, boundType as Parameters<typeof canPlaceResource>[1]);
                  onUpdate({
                    ...selected,
                    type: nextType,
                    content: { ...selected.content },
                    ...(keepResource ? {} : { resource: undefined }),
                  });
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
              >
                {selectedSlot.allowed.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            {textLike.has(selected.type as ObjectType) ? (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                Double-click this element on the Screen to edit its text and formatting.
              </div>
            ) : (
              <>
                <label className="mt-4 block text-sm font-semibold text-slate-700">
                  Media or asset URL
                  <input value={fieldValue(selected, 'url')} onChange={(event) => updateContent('url', event.target.value)} placeholder="https://…" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
                </label>
                <label className="mt-4 block text-sm font-semibold text-slate-700">
                  Alternative text
                  <textarea value={fieldValue(selected, 'altText')} onChange={(event) => updateContent('altText', event.target.value)} rows={2} placeholder="Describe the instructional content" className="mt-1 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
                </label>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Caption
                    <input value={fieldValue(selected, 'caption')} onChange={(event) => updateContent('caption', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Credit or source
                    <input value={fieldValue(selected, 'credit')} onChange={(event) => updateContent('credit', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
                  </label>
                </div>
                <label className="mt-4 block text-sm font-semibold text-slate-700">
                  Teaching label
                  <input value={textValue(selected)} onChange={(event) => updateContent('text', event.target.value)} placeholder="Short visible label" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
                </label>
              </>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {(['x', 'y', 'width', 'height'] as const).map((key) => (
                <label key={key} className="block text-xs font-semibold uppercase text-slate-600">
                  {key}
                  <input type="number" min={key === 'width' ? 80 : key === 'height' ? 60 : 0} max={key === 'x' || key === 'width' ? 1920 : 1080} value={Number(selected.position[key]) || 0} onChange={(event) => updatePosition(key, Number(event.target.value))} disabled={selected.position.locked === true} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal disabled:bg-slate-100" />
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Text colour
                <input type="color" value={typeof selected.content.color === 'string' ? selected.content.color : '#173b65'} onChange={(event) => updateContent('color', event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white p-1" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Layer
                <input type="number" min="0" max="100" value={Number(selected.position.zIndex) || 0} onChange={(event) => updatePosition('zIndex', Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
              </label>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={selected.position.locked === true} onChange={(event) => updatePosition('locked', event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              Lock position and size
            </label>
            <p className="mt-4 text-xs text-slate-500">{layout ? `Position and size start from the validated ${selectedSlot.id} slot geometry.` : 'Use the canvas Move and resize controls to position this screen element.'} Save creates the next Screen revision.</p>
          </>
        )}
      </div>
    </div>
  );
}
