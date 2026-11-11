import { useEffect, useState } from 'react';
import type { StudioLayoutSlot } from '../api/studioEditorApi';
import type { StudioElement } from '../types';

interface Props {
  slot: StudioLayoutSlot;
  element: StudioElement | null;
  saving: boolean;
  onClose: () => void;
  onSave: (type: string, text: string) => void;
}

const contentText = (element: StudioElement | null) => {
  const value =
    element?.content.text ??
    element?.content.label ??
    element?.content.prompt ??
    element?.content.caption;
  return typeof value === 'string' ? value : '';
};

export default function StudioElementDialog({ slot, element, saving, onClose, onSave }: Props) {
  const [type, setType] = useState(element?.type ?? slot.allowed[0] ?? 'text');
  const [text, setText] = useState(contentText(element));

  useEffect(() => {
    setType(element?.type ?? slot.allowed[0] ?? 'text');
    setText(contentText(element));
  }, [element, slot]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${element ? 'Edit' : 'Add'} ${slot.label}`}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-900">
            {element ? 'Edit content' : 'Add content'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{slot.label}</p>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Element type
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            disabled={saving}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          >
            {slot.allowed.map((allowedType) => (
              <option key={allowedType} value={allowedType}>
                {allowedType}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Content
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={saving}
            rows={6}
            placeholder={`Enter ${slot.label.toLowerCase()} content`}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(type, text)}
            disabled={saving || !text.trim()}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Save content'}
          </button>
        </div>
      </div>
    </div>
  );
}
