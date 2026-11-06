import { Copy, Shapes, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { StudioElement, StudioScreen } from '../types';
import StudioShapeElement from './StudioShapeElement';

const shapeGroups = [
  { label: 'Lines', shapes: ['line', 'arrow', 'double-arrow', 'elbow-arrow', 'curved-arrow'] },
  {
    label: 'Basic',
    shapes: [
      'rectangle',
      'rounded-rectangle',
      'circle',
      'triangle',
      'inverted-triangle',
      'diamond',
      'pentagon',
      'hexagon',
      'star',
      'heart',
      'cloud',
    ],
  },
  {
    label: 'Flowchart',
    shapes: [
      'flow-process',
      'flow-decision',
      'flow-data',
      'flow-document',
      'flow-terminator',
      'flow-delay',
    ],
  },
  { label: 'Callouts', shapes: ['callout', 'speech', 'thought', 'banner', 'ribbon'] },
  { label: 'Equation', shapes: ['plus', 'minus', 'multiply', 'divide', 'equal', 'not-equal'] },
] as const;
interface Props {
  screen: StudioScreen | null;
  selectedElementId: string | null;
  onAdd: (kind: string) => void;
  onUpdate: (element: StudioElement) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}

export default function StudioShapesPanel({
  screen,
  selectedElementId,
  onAdd,
  onUpdate,
  onDuplicate,
  onRemove,
}: Props) {
  const [activeGroup, setActiveGroup] = useState(1);
  const selected =
    screen?.elements.find(
      (element) => element.id === selectedElementId && element.type === 'shape',
    ) ?? null;
  const update = (changes: Record<string, unknown>) => {
    if (selected) onUpdate({ ...selected, content: { ...selected.content, ...changes } });
  };
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-900">
          <Shapes size={19} />
        </span>
        <div>
          <h2 className="font-semibold text-slate-900">Shape library</h2>
          <p className="text-xs text-slate-500">Visual symbols, diagrams and teaching callouts.</p>
        </div>
      </div>
      <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
        {shapeGroups.map((group, index) => (
          <button
            key={group.label}
            type="button"
            onClick={() => setActiveGroup(index)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${activeGroup === index ? 'bg-blue-900 text-white' : 'bg-slate-100 hover:bg-blue-50'}`}
          >
            {group.label}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {shapeGroups[activeGroup].shapes.map((shape) => (
          <button
            key={shape}
            type="button"
            onClick={() => onAdd(shape)}
            title={shape.replaceAll('-', ' ')}
            aria-label={`Add ${shape.replaceAll('-', ' ')}`}
            className="aspect-square min-w-0 rounded-xl border border-slate-200 bg-white p-2 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-700 hover:bg-blue-50"
          >
            <StudioShapeElement kind={shape} fill="#ffffff" stroke="#1e3a5f" strokeWidth={5} />
          </button>
        ))}
      </div>
      {selected && (
        <div className="mt-4 space-y-3 border-t pt-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold">
              Fill
              <input
                type="color"
                value={String(selected.content.fill || '#dbeafe')}
                onChange={(event) => update({ fill: event.target.value })}
                className="mt-1 h-9 w-full rounded border p-1"
              />
            </label>
            <label className="block text-xs font-semibold">
              Outline
              <input
                type="color"
                value={String(selected.content.stroke || '#1d4ed8')}
                onChange={(event) => update({ stroke: event.target.value })}
                className="mt-1 h-9 w-full rounded border p-1"
              />
            </label>
          </div>
          <label className="block text-xs font-semibold">
            Outline width{' '}
            <span className="float-right font-normal">
              {Number(selected.content.strokeWidth) || 4}px
            </span>
            <input
              type="range"
              min="0"
              max="20"
              value={Number(selected.content.strokeWidth) || 4}
              onChange={(event) => update({ strokeWidth: Number(event.target.value) })}
              className="mt-1 w-full"
            />
          </label>
          <label className="block text-xs font-semibold">
            Outline style
            <select
              value={String(selected.content.strokeDash || 'solid')}
              onChange={(event) => update({ strokeDash: event.target.value })}
              className="mt-1 h-9 w-full rounded-lg border px-2"
            >
              <option value="solid">Solid</option>
              <option value="dash">Dashed</option>
              <option value="dot">Dotted</option>
            </select>
          </label>
          <label className="block text-xs font-semibold">
            Opacity{' '}
            <span className="float-right font-normal">
              {Math.round((Number(selected.content.opacity) || 1) * 100)}%
            </span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={Number(selected.content.opacity) || 1}
              onChange={(event) => update({ opacity: Number(event.target.value) })}
              className="mt-1 w-full"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              title="Duplicate shape"
              onClick={() => onDuplicate(selected.id)}
              className="inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-semibold"
            >
              <Copy size={14} />
              Duplicate
            </button>
            <button
              type="button"
              title="Delete shape"
              onClick={() => onRemove(selected.id)}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 px-2 py-2 text-xs font-semibold text-red-700"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
          <p className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-500">
            Group, merge and custom editable points require multi-select and path editing. The
            library data is ready for those future controls without changing existing shapes.
          </p>
        </div>
      )}
    </div>
  );
}
