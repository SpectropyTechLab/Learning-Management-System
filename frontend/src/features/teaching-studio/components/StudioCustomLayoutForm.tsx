import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiErrorDetails } from '@/lib/api';
import {
  createStudioLayout,
  reviseStudioLayout,
  type StudioLayoutSummary,
  type StudioLayoutWriteInput,
} from '../api/studioEditorApi';
import type { ObjectType, Slot } from '../layouts';

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const ELEMENT_TYPES: ObjectType[] = [
  'title', 'text', 'visual', 'question', 'response', 'steps', 'workspace',
  'footer', 'simulation', 'activity', 'media', 'graph', 'data', 'options',
];

type DraftSlot = Omit<Slot, 'allowed'> & { allowed: ObjectType[] };

const emptySlot = (index: number): DraftSlot => ({
  id: `slot-${index}`,
  label: `Content slot ${index}`,
  region: 'content',
  allowed: ['text'],
  bounds: {
    x: index % 2 === 1 ? 90 : 1010,
    y: 250 + (Math.floor((index - 1) / 2) % 2) * 340,
    width: 820,
    height: 300,
  },
});

const overlaps = (left: DraftSlot, right: DraftSlot) => (
  left.bounds.x < right.bounds.x + right.bounds.width &&
  left.bounds.x + left.bounds.width > right.bounds.x &&
  left.bounds.y < right.bounds.y + right.bounds.height &&
  left.bounds.y + left.bounds.height > right.bounds.y
);

const validate = (layoutKey: string, name: string, safeMargin: number, slots: DraftSlot[]) => {
  const errors: string[] = [];
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(layoutKey.trim())) errors.push('Layout key may contain only letters, numbers, hyphens and underscores.');
  if (!name.trim()) errors.push('Layout name is required.');
  if (!Number.isInteger(safeMargin) || safeMargin < 0 || safeMargin * 2 >= CANVAS_HEIGHT) errors.push('Safe margin must be a usable non-negative whole number.');
  if (slots.length === 0) errors.push('Add at least one slot.');
  const ids = new Set<string>();
  slots.forEach((slot, index) => {
    const label = `Slot ${index + 1}`;
    if (!slot.id.trim()) errors.push(`${label} ID is required.`);
    else if (ids.has(slot.id.trim())) errors.push(`Duplicate slot ID: ${slot.id.trim()}.`);
    ids.add(slot.id.trim());
    if (!slot.label.trim()) errors.push(`${label} label is required.`);
    if (slot.allowed.length === 0) errors.push(`${label} must support at least one element type.`);
    const { x, y, width, height } = slot.bounds;
    if (![x, y, width, height].every(Number.isInteger) || x < 0 || y < 0 || width <= 0 || height <= 0) errors.push(`${label} geometry must use valid whole numbers.`);
    else if (x + width > CANVAS_WIDTH || y + height > CANVAS_HEIGHT) errors.push(`${label} exceeds the 1920 × 1080 canvas.`);
  });
  for (let left = 0; left < slots.length; left += 1) {
    for (let right = left + 1; right < slots.length; right += 1) {
      if (overlaps(slots[left], slots[right])) errors.push(`Slots ${slots[left].id || left + 1} and ${slots[right].id || right + 1} overlap.`);
    }
  }
  return errors;
};

export default function StudioCustomLayoutForm({ layout, onSaved, onCancel }: {
  layout?: StudioLayoutSummary | null;
  onSaved: (saved: StudioLayoutSummary) => Promise<void> | void;
  onCancel: () => void;
}) {
  const editing = Boolean(layout);
  const [layoutKey, setLayoutKey] = useState(layout?.layout_key || 'CUSTOM-001');
  const [name, setName] = useState(layout?.name || 'Custom teaching layout');
  const [description, setDescription] = useState(layout?.description || '');
  const [safeMargin, setSafeMargin] = useState(layout?.safe_margin ?? 90);
  const [slots, setSlots] = useState<DraftSlot[]>(layout?.layout_data_json?.slots?.map((slot) => ({
    ...slot,
    allowed: [...slot.allowed],
    bounds: { ...slot.bounds },
  })) || [emptySlot(1)]);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const errors = useMemo(() => validate(layoutKey, name, safeMargin, slots), [layoutKey, name, safeMargin, slots]);

  const updateSlot = (index: number, update: (slot: DraftSlot) => DraftSlot) => {
    setSlots((current) => current.map((slot, slotIndex) => slotIndex === index ? update(slot) : slot));
  };
  const numberField = (index: number, key: keyof DraftSlot['bounds'], raw: string) => {
    const value = Number(raw);
    updateSlot(index, (slot) => ({ ...slot, bounds: { ...slot.bounds, [key]: Number.isFinite(value) ? value : 0 } }));
  };

  const submit = async () => {
    setServerError('');
    if (errors.length > 0) {
      toast.error('Fix the highlighted layout definition before saving.');
      return;
    }
    const input: StudioLayoutWriteInput = {
      layout_key: layoutKey.trim(),
      name: name.trim(),
      description: description.trim(),
      layout_data_json: { slots },
      canvas_width: CANVAS_WIDTH,
      canvas_height: CANVAS_HEIGHT,
      safe_margin: safeMargin,
    };
    setSaving(true);
    try {
      const saved = layout
        ? await reviseStudioLayout(layout.id, input)
        : await createStudioLayout(input);
      await onSaved(saved);
      toast.success(layout ? `${saved.layout_key} revision ${saved.version_no} created.` : `${saved.layout_key} created successfully.`);
    } catch (requestError) {
      const message = getApiErrorDetails(requestError, 'Unable to save the custom layout.').message;
      setServerError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-blue-200 bg-blue-50/40 p-3">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="font-semibold text-slate-900">{editing ? `Create revision ${Number(layout?.version_no || 0) + 1}` : 'Create custom layout'}</h3><p className="mt-1 text-sm text-slate-600">The canvas is fixed at 1920 × 1080. Saving an edit creates a new immutable layout revision; existing Screens and published releases stay pinned to their current revision.</p></div>
      <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Cancel</button>
    </div>
    <div className="mt-4 grid min-w-0 grid-cols-1 gap-3">
      <label className="text-sm font-semibold text-slate-700">Layout key<input value={layoutKey} disabled={editing} onChange={(event) => setLayoutKey(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal disabled:bg-slate-100" /></label>
      <label className="text-sm font-semibold text-slate-700">Name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" /></label>
      <label className="text-sm font-semibold text-slate-700 md:col-span-2">Description<input value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" /></label>
      <label className="text-sm font-semibold text-slate-700">Safe margin<input type="number" min="0" value={safeMargin} onChange={(event) => setSafeMargin(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" /></label>
    </div>
    <div className="mt-5 grid min-w-0 grid-cols-1 gap-5">
      <div className="min-w-0 space-y-3">
        {slots.map((slot, index) => <fieldset key={index} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between"><legend className="font-semibold text-slate-800">Slot {index + 1}</legend><button type="button" onClick={() => setSlots((current) => current.filter((_, slotIndex) => slotIndex !== index))} className="rounded-lg p-2 text-red-700 hover:bg-red-50" aria-label={`Remove slot ${index + 1}`}><Trash2 size={17} /></button></div>
          <div className="mt-2 grid min-w-0 grid-cols-1 gap-2">
            <label className="text-xs font-semibold text-slate-600">ID<input value={slot.id} onChange={(event) => updateSlot(index, (current) => ({ ...current, id: event.target.value }))} className="mt-1 w-full rounded-md border px-2 py-1.5 font-normal" /></label>
            <label className="text-xs font-semibold text-slate-600">Label<input value={slot.label} onChange={(event) => updateSlot(index, (current) => ({ ...current, label: event.target.value }))} className="mt-1 w-full rounded-md border px-2 py-1.5 font-normal" /></label>
            <label className="text-xs font-semibold text-slate-600">Region<select value={slot.region} onChange={(event) => updateSlot(index, (current) => ({ ...current, region: event.target.value as Slot['region'] }))} className="mt-1 w-full rounded-md border px-2 py-1.5 font-normal"><option value="header">Header</option><option value="content">Content</option><option value="footer">Footer</option></select></label>
            <label className="text-xs font-semibold text-slate-600">Element types<select multiple value={slot.allowed} onChange={(event) => updateSlot(index, (current) => ({ ...current, allowed: Array.from(event.target.selectedOptions, (option) => option.value as ObjectType) }))} className="mt-1 h-20 w-full rounded-md border px-2 py-1 font-normal">{ELEMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
            {(['x', 'y', 'width', 'height'] as const).map((key) => <label key={key} className="text-xs font-semibold uppercase text-slate-600">{key}<input type="number" min={key === 'width' || key === 'height' ? 1 : 0} value={slot.bounds[key]} onChange={(event) => numberField(index, key, event.target.value)} className="mt-1 w-full rounded-md border px-2 py-1.5 font-normal" /></label>)}
          </div>
        </fieldset>)}
        <button type="button" onClick={() => setSlots((current) => [...current, emptySlot(current.length + 1)])} className="inline-flex items-center gap-2 rounded-lg border border-blue-800 bg-white px-3 py-2 text-sm font-semibold text-blue-900"><Plus size={16} />Add slot</button>
      </div>
      <div className="min-w-0 max-w-full overflow-hidden">
        <p className="mb-2 text-sm font-semibold text-slate-700">Live geometry preview</p>
        <div className="relative aspect-video w-full max-w-full overflow-hidden rounded-lg border-2 border-slate-300 bg-white">
          {slots.map((slot, index) => <div key={`${slot.id}-${index}`} className="absolute overflow-hidden rounded border border-blue-500 bg-blue-100/80 p-1 text-[9px] font-semibold text-blue-950" style={{ left: `${slot.bounds.x / 19.2}%`, top: `${slot.bounds.y / 10.8}%`, width: `${slot.bounds.width / 19.2}%`, height: `${slot.bounds.height / 10.8}%` }}>{slot.label || slot.id}</div>)}
        </div>
        {errors.length > 0 && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><p className="font-bold">Fix before saving</p><ul className="mt-1 list-disc space-y-1 pl-4">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
        {serverError && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{serverError}</p>}
        <button type="button" disabled={saving || errors.length > 0} onClick={() => void submit()} className="mt-4 w-full rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{saving ? 'Saving...' : editing ? 'Save as new revision' : 'Create custom layout'}</button>
      </div>
    </div>
  </div>;
}
