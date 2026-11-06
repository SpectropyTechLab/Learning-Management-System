import {
  Brush,
  Eraser,
  Highlighter,
  PenLine,
  Pencil,
  Redo2,
  Sparkles,
  Trash2,
  Undo2,
  WandSparkles,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { StudioDrawingTool } from '../types';

const tools: Array<{
  id: StudioDrawingTool;
  label: string;
  Icon: ComponentType<{ size?: number }>;
}> = [
  { id: 'pen', label: 'Pen', Icon: PenLine },
  { id: 'pencil', label: 'Pencil', Icon: Pencil },
  { id: 'fountain', label: 'Fountain pen', Icon: Brush },
  { id: 'highlighter', label: 'Highlighter', Icon: Highlighter },
  { id: 'laser', label: 'Laser pointer ink', Icon: Sparkles },
  { id: 'eraser', label: 'Eraser', Icon: Eraser },
];

interface Props {
  tool: StudioDrawingTool;
  color: string;
  width: number;
  opacity: number;
  canUndo: boolean;
  canRedo: boolean;
  hasDrawing: boolean;
  onToolChange: (tool: StudioDrawingTool) => void;
  onColorChange: (color: string) => void;
  onWidthChange: (width: number) => void;
  onOpacityChange: (opacity: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

export default function StudioDrawingPanel({
  tool,
  color,
  width,
  opacity,
  canUndo,
  canRedo,
  hasDrawing,
  onToolChange,
  onColorChange,
  onWidthChange,
  onOpacityChange,
  onUndo,
  onRedo,
  onClear,
}: Props) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-900">
          <PenLine size={19} />
        </span>
        <div>
          <h2 className="font-semibold text-slate-900">Drawing studio</h2>
          <p className="text-xs text-slate-500">Ink is autosaved with this screen.</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-6 gap-2">
        {tools.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={label}
            onClick={() => onToolChange(id)}
            className={`grid aspect-square place-items-center rounded-xl border transition hover:-translate-y-0.5 hover:bg-blue-50 ${tool === id ? 'border-blue-800 bg-blue-50 text-blue-900 ring-2 ring-blue-100' : 'border-slate-200 text-slate-600'}`}
          >
            <Icon size={18} />
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-[52px_1fr] gap-3">
        <label className="text-xs font-semibold text-slate-600">
          Colour
          <input
            type="color"
            value={color}
            onChange={(event) => onColorChange(event.target.value)}
            className="mt-1 h-10 w-full cursor-pointer rounded-lg border p-1"
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Quick colours
          <div className="mt-1 flex h-10 items-center gap-1">
            {['#0f172a', '#2563eb', '#ef4444', '#16a34a', '#f59e0b', '#9333ea'].map((value) => (
              <button
                key={value}
                type="button"
                title={value}
                aria-label={`Use ${value}`}
                onClick={() => onColorChange(value)}
                className={`h-7 w-7 rounded-full border-2 ${color === value ? 'border-slate-800 ring-2 ring-slate-200' : 'border-white shadow'}`}
                style={{ backgroundColor: value }}
              />
            ))}
          </div>
        </label>
      </div>
      <label className="mt-4 block text-xs font-semibold text-slate-600">
        Stroke width <span className="float-right font-normal">{width}px</span>
        <input
          type="range"
          min="1"
          max="28"
          value={width}
          onChange={(event) => onWidthChange(Number(event.target.value))}
          className="mt-2 w-full"
        />
      </label>
      <label className="mt-3 block text-xs font-semibold text-slate-600">
        Opacity <span className="float-right font-normal">{Math.round(opacity * 100)}%</span>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          value={opacity}
          onChange={(event) => onOpacityChange(Number(event.target.value))}
          className="mt-2 w-full"
        />
      </label>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          title="Undo ink"
          aria-label="Undo ink"
          disabled={!canUndo}
          onClick={onUndo}
          className="grid h-10 place-items-center rounded-lg border disabled:opacity-30"
        >
          <Undo2 size={17} />
        </button>
        <button
          type="button"
          title="Redo ink"
          aria-label="Redo ink"
          disabled={!canRedo}
          onClick={onRedo}
          className="grid h-10 place-items-center rounded-lg border disabled:opacity-30"
        >
          <Redo2 size={17} />
        </button>
        <button
          type="button"
          title="Clear drawing"
          aria-label="Clear drawing"
          disabled={!hasDrawing}
          onClick={onClear}
          className="grid h-10 place-items-center rounded-lg border border-red-200 text-red-700 disabled:opacity-30"
        >
          <Trash2 size={17} />
        </button>
      </div>
      <div className="mt-4 rounded-xl bg-slate-50 p-3">
        <p className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <WandSparkles size={15} className="text-blue-700" /> Smart ink roadmap
        </p>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">
          Ink-to-shape, ruler, pressure sensitivity and replay controls now have compatible stroke
          metadata; recognition and timed replay will be connected in a later editor gate.
        </p>
      </div>
    </div>
  );
}
