import { Copy, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { StudioElement, StudioScreen } from '../types';
import StudioMathElement from './StudioMathElement';

interface Props {
  screen: StudioScreen | null;
  selectedElementId: string | null;
  onSelect: (elementId: string) => void;
  onAdd: (latex: string) => void;
  onUpdate: (element: StudioElement) => void;
  onDuplicate: (elementId: string) => void;
  onRemove: (elementId: string) => void;
}

const templates = [
  ['Fraction', String.raw`\frac{a}{b}`],
  ['Root', String.raw`\sqrt{x}`],
  ['Power', String.raw`x^{2}`],
  ['Subscript', String.raw`x_{1}`],
  ['Brackets', String.raw`\left(a+b\right)`],
  ['Sum', String.raw`\sum_{i=1}^{n} i`],
  ['Integral', String.raw`\int_{a}^{b} f(x)\,dx`],
  ['Limit', String.raw`\lim_{x \to 0} f(x)`],
  ['Matrix', String.raw`\begin{bmatrix}a & b \\ c & d\end{bmatrix}`],
  ['Symbols', String.raw`\alpha + \beta = \gamma`],
] as const;

export default function StudioMathPanel({
  screen,
  selectedElementId,
  onSelect,
  onAdd,
  onUpdate,
  onDuplicate,
  onRemove,
}: Props) {
  const selected = useMemo(
    () =>
      screen?.elements.find(
        (element) => element.id === selectedElementId && element.type === 'math',
      ) ?? null,
    [screen, selectedElementId],
  );
  const [latex, setLatex] = useState(String.raw`\frac{a}{b}`);

  useEffect(() => {
    if (selected) setLatex(String(selected.content.latex ?? selected.content.text ?? ''));
  }, [selected]);

  const update = (changes: Record<string, unknown>) => {
    if (!selected) return;
    onUpdate({ ...selected, content: { ...selected.content, ...changes } });
  };

  const chooseTemplate = (value: string) => {
    setLatex(value);
    if (selected) update({ latex: value, text: value });
  };

  const color =
    selected && typeof selected.content.color === 'string' ? selected.content.color : '#0f2747';
  const fontSize = selected ? Number(selected.content.fontSize) || 42 : 42;
  const alignment =
    selected?.content.alignment === 'left' || selected?.content.alignment === 'right'
      ? selected.content.alignment
      : 'center';

  return (
    <div>
      <h2 className="font-semibold text-slate-900">Math equations</h2>
      <p className="mt-1 text-xs text-slate-500">
        Choose a familiar equation type, preview it, and place it anywhere on the Screen.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {templates.map(([label, value]) => (
          <button
            key={label}
            type="button"
            onClick={() => chooseTemplate(value)}
            className="rounded-lg border border-slate-300 px-2 py-2 text-xs font-semibold hover:border-blue-700 hover:bg-blue-50"
          >
            {label}
          </button>
        ))}
      </div>
      <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <summary className="cursor-pointer text-xs font-semibold text-slate-600">Advanced equation code (optional)</summary>
        <label className="mt-3 block text-sm font-semibold text-slate-700">
          Equation code
          <textarea
            value={latex}
            onChange={(event) => {
              const value = event.target.value;
              setLatex(value);
              if (selected) update({ latex: value, text: value });
            }}
            rows={4}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-mono text-sm"
          />
        </label>
      </details>
      <div className="mt-3 min-h-24 rounded-lg border bg-white">
        <StudioMathElement
          latex={latex}
          color={color}
          fontSize={Math.min(fontSize, 36)}
          alignment={alignment}
        />
      </div>
      {!selected ? (
        <button
          type="button"
          onClick={() => onAdd(latex)}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white"
        >
          <Plus size={16} />
          Add equation
        </button>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-600">
              Color
              <input
                type="color"
                value={color}
                onChange={(event) => update({ color: event.target.value })}
                className="mt-1 h-9 w-full rounded border p-1"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Font size
              <input
                type="number"
                min="12"
                max="160"
                value={fontSize}
                onChange={(event) => update({ fontSize: Number(event.target.value) })}
                className="mt-1 h-9 w-full rounded border px-2"
              />
            </label>
          </div>
          <label className="mt-3 block text-xs font-semibold text-slate-600">
            Alignment
            <select
              value={alignment}
              onChange={(event) => update({ alignment: event.target.value })}
              className="mt-1 h-9 w-full rounded border px-2"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
          <label className="mt-3 block text-xs font-semibold text-slate-600">
            Layer
            <input
              type="number"
              value={Number(selected.position.zIndex) || 1}
              onChange={(event) =>
                onUpdate({
                  ...selected,
                  position: { ...selected.position, zIndex: Number(event.target.value) },
                })
              }
              className="mt-1 h-9 w-full rounded border px-2"
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onDuplicate(selected.id)}
              className="inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-sm font-semibold"
            >
              <Copy size={15} />
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => onRemove(selected.id)}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 px-2 py-2 text-sm font-semibold text-red-700"
            >
              <Trash2 size={15} />
              Delete
            </button>
          </div>
        </>
      )}
      {(screen?.elements ?? []).some((element) => element.type === 'math') && (
        <div className="mt-5 border-t pt-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Equations on this Screen</p>
          <div className="mt-2 grid gap-2">
            {screen?.elements
              .filter((element) => element.type === 'math')
              .map((element, index) => (
                <button
                  type="button"
                  key={element.id}
                  onClick={() => onSelect(element.id)}
                  className={`truncate rounded-lg border px-3 py-2 text-left text-sm ${element.id === selectedElementId ? 'border-blue-700 bg-blue-50' : 'border-slate-200'}`}
                >
                  Equation {index + 1}:{' '}
                  {String(element.content.latex ?? element.content.text ?? '')}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
