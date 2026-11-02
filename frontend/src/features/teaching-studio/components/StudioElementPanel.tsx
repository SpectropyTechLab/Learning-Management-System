import { ImagePlus, Plus, Trash2 } from 'lucide-react';
import type { Layout, ObjectType, Slot } from '../layouts';
import type { StudioElement, StudioScreen } from '../types';

interface Props {
  layout: Layout | null;
  screen: StudioScreen | null;
  selectedElementId: string | null;
  onSelect: (elementId: string) => void;
  onAdd: (slot: Slot) => void;
  onUpdate: (element: StudioElement) => void;
  onRemove: (elementId: string) => void;
}

const textValue = (element: StudioElement) => String(element.content.text || '');
const fieldValue = (element: StudioElement, key: string) => String(element.content[key] || '');
const textLike = new Set<ObjectType>(['title', 'text', 'question', 'response', 'steps', 'workspace', 'footer', 'options', 'data']);

export default function StudioElementPanel({
  layout, screen, selectedElementId, onSelect, onAdd, onUpdate, onRemove,
}: Props) {
  if (!screen) return <p className="text-sm text-slate-500">Select a Screen to edit its content.</p>;
  if (!layout) return <p className="text-sm text-slate-500">Apply a layout first. Its named slots will become available for Author content.</p>;

  const selected = screen.elements.find((element) => element.id === selectedElementId) || null;
  const selectedSlot = selected ? layout.slots.find((slot) => slot.id === selected.slotId) : null;
  const updateContent = (key: string, value: string) => selected && onUpdate({
    ...selected,
    content: { ...selected.content, [key]: value },
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(260px,0.85fr)_minmax(320px,1.15fr)]">
      <div>
        <h2 className="font-semibold text-slate-900">Layout slots</h2>
        <p className="mt-1 text-sm text-slate-500">Add one permitted object to a slot, then edit it in the inspector.</p>
        <div className="mt-3 space-y-2">
          {layout.slots.map((slot) => {
            const element = screen.elements.find((candidate) => candidate.slotId === slot.id);
            return (
              <div key={slot.id} className={`rounded-lg border p-3 ${element?.id === selectedElementId ? 'border-blue-700 bg-blue-50' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{slot.label}</p>
                    <p className="text-xs text-slate-500">{slot.allowed.join(', ')}</p>
                  </div>
                  {element ? (
                    <button type="button" onClick={() => onSelect(element.id)} className="rounded-lg border border-blue-800 px-3 py-1.5 text-xs font-semibold text-blue-900">Edit</button>
                  ) : (
                    <button type="button" onClick={() => onAdd(slot)} className="inline-flex items-center gap-1 rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white"><Plus size={14} />Add</button>
                  )}
                </div>
              </div>
            );
          })}
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
              <button type="button" onClick={() => onRemove(selected.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700"><Trash2 size={14} />Remove</button>
            </div>

            <label className="mt-4 block text-sm font-semibold text-slate-700">Object type
              <select
                value={selected.type}
                onChange={(event) => onUpdate({ ...selected, type: event.target.value, content: { ...selected.content } })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
              >
                {selectedSlot.allowed.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>

            {textLike.has(selected.type as ObjectType) ? (
              <label className="mt-4 block text-sm font-semibold text-slate-700">On-screen text
                <textarea value={textValue(selected)} onChange={(event) => updateContent('text', event.target.value)} rows={5} placeholder={`Enter ${selectedSlot.label.toLowerCase()}`} className="mt-1 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
              </label>
            ) : (
              <>
                <label className="mt-4 block text-sm font-semibold text-slate-700">Media or asset URL
                  <input value={fieldValue(selected, 'url')} onChange={(event) => updateContent('url', event.target.value)} placeholder="https://…" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
                </label>
                <label className="mt-4 block text-sm font-semibold text-slate-700">Alternative text
                  <textarea value={fieldValue(selected, 'altText')} onChange={(event) => updateContent('altText', event.target.value)} rows={2} placeholder="Describe the instructional content" className="mt-1 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
                </label>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-700">Caption
                    <input value={fieldValue(selected, 'caption')} onChange={(event) => updateContent('caption', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">Credit or source
                    <input value={fieldValue(selected, 'credit')} onChange={(event) => updateContent('credit', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
                  </label>
                </div>
                <label className="mt-4 block text-sm font-semibold text-slate-700">Teaching label
                  <input value={textValue(selected)} onChange={(event) => updateContent('text', event.target.value)} placeholder="Short visible label" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
                </label>
              </>
            )}
            <p className="mt-4 text-xs text-slate-500">Position and size use the validated {selectedSlot.id} slot geometry. Save creates the next Screen revision.</p>
          </>
        )}
      </div>
    </div>
  );
}
