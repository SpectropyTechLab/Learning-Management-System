import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Braces,
  Copy,
  Plus,
  Sigma,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { StudioElement, StudioScreen } from '../types';
import MathLiveEquationEditor from './MathLiveEquationEditor';
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

const groups = [
  {
    name: 'Common',
    items: [
      ['Fraction', String.raw`\frac{a}{b}`, 'a⁄b'],
      ['Root', String.raw`\sqrt{x}`, '√x'],
      ['Power', String.raw`x^{2}`, 'x²'],
      ['Subscript', String.raw`x_{1}`, 'x₁'],
      ['Brackets', String.raw`\left(a+b\right)`, '( )'],
    ],
  },
  {
    name: 'Calculus',
    items: [
      ['Sum', String.raw`\sum_{i=1}^{n} i`, '∑'],
      ['Integral', String.raw`\int_{a}^{b} f(x)\,dx`, '∫'],
      ['Limit', String.raw`\lim_{x \to 0} f(x)`, 'lim'],
      ['Derivative', String.raw`\frac{d}{dx}f(x)`, 'd⁄dx'],
      ['Partial', String.raw`\frac{\partial f}{\partial x}`, '∂'],
    ],
  },
  {
    name: 'Symbols',
    items: [
      ['Greek', String.raw`\alpha + \beta = \gamma`, 'αβ'],
      ['Infinity', String.raw`x \to \infty`, '∞'],
      ['Not equal', String.raw`a \ne b`, '≠'],
      ['Approximate', String.raw`a \approx b`, '≈'],
      ['Therefore', String.raw`\therefore`, '∴'],
    ],
  },
  {
    name: 'Structures',
    items: [
      ['Matrix', String.raw`\begin{bmatrix}a & b \\ c & d\end{bmatrix}`, '▦'],
      ['Cases', String.raw`f(x)=\begin{cases}x&x\ge0\\-x&x<0\end{cases}`, '{…'],
      ['Vector', String.raw`\vec{v}=\langle x,y\rangle`, 'v⃗'],
      ['Set', String.raw`\left\{x\in\mathbb{R}\mid x>0\right\}`, '{x}'],
      ['Chemistry', String.raw`\mathrm{H_2O + CO_2}`, 'H₂O'],
    ],
  },
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
  const [activeGroup, setActiveGroup] = useState(0);
  useEffect(() => {
    if (selected) setLatex(String(selected.content.latex ?? selected.content.text ?? ''));
  }, [selected]);
  const update = (changes: Record<string, unknown>) => {
    if (selected) onUpdate({ ...selected, content: { ...selected.content, ...changes } });
  };
  const changeEquation = (value: string) => {
    setLatex(value);
    update({ latex: value, text: value });
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
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-900">
          <Sigma size={20} />
        </span>
        <div>
          <h2 className="font-semibold text-slate-900">Equation studio</h2>
          <p className="text-xs text-slate-500">Visual MathLive editing with a virtual keyboard.</p>
        </div>
      </div>
      <div
        className="mt-4 flex gap-1 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Equation categories"
      >
        {groups.map((group, index) => (
          <button
            key={group.name}
            type="button"
            role="tab"
            aria-selected={activeGroup === index}
            onClick={() => setActiveGroup(index)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${activeGroup === index ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-blue-50'}`}
          >
            {group.name}
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-5 gap-2">
        {groups[activeGroup].items.map(([label, value, glyph]) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            onClick={() => changeEquation(value)}
            className="grid aspect-square place-items-center rounded-xl border border-slate-200 bg-white text-lg font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-600 hover:bg-blue-50 hover:text-blue-900"
          >
            <span aria-hidden="true">{glyph}</span>
          </button>
        ))}
      </div>
      <div className="mt-4">
        <MathLiveEquationEditor value={latex} onChange={changeEquation} />
      </div>
      <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <summary className="cursor-pointer text-xs font-semibold text-slate-600">
          LaTeX source
        </summary>
        <textarea
          value={latex}
          onChange={(event) => changeEquation(event.target.value)}
          rows={3}
          className="mt-3 w-full rounded-lg border border-slate-300 p-2 font-mono text-sm"
        />
      </details>
      <div className="mt-3 min-h-20 rounded-lg border bg-white">
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
          <div className="mt-4 flex items-end gap-2">
            <label className="flex-1 text-xs font-semibold text-slate-600">
              Color
              <input
                type="color"
                value={color}
                onChange={(event) => update({ color: event.target.value })}
                className="mt-1 h-9 w-full rounded border p-1"
              />
            </label>
            <label className="flex-1 text-xs font-semibold text-slate-600">
              Size
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
          <div className="mt-3 flex gap-2" aria-label="Equation alignment">
            {(
              [
                ['left', AlignLeft],
                ['center', AlignCenter],
                ['right', AlignRight],
              ] as const
            ).map(([value, Icon]) => (
              <button
                key={value}
                type="button"
                title={`Align ${value}`}
                aria-label={`Align ${value}`}
                onClick={() => update({ alignment: value })}
                className={`grid h-9 flex-1 place-items-center rounded-lg border ${alignment === value ? 'border-blue-800 bg-blue-50 text-blue-900' : 'border-slate-200'}`}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
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
          <p className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">
            <Braces size={14} /> Equations on screen
          </p>
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
