import {
  Activity,
  ArrowDown,
  ArrowUp,
  CircleDot,
  LogIn,
  LogOut,
  Play,
  Plus,
  Route,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { StudioElement, StudioScreen } from '../types';

type Effect = {
  id: string;
  effect: string;
  duration: number;
  delay: number;
  start: string;
  direction?: string;
  repeat?: number;
  textSequence?: string;
};
const categories = [
  {
    name: 'Entrance',
    Icon: LogIn,
    color: 'text-emerald-700',
    effects: [
      ['appear', '●'],
      ['fade', '◐'],
      ['fly-in', '➜'],
      ['wipe', '◩'],
      ['zoom', '⊕'],
      ['float-in', '⇧'],
      ['split', '◫'],
      ['wheel', '✺'],
      ['random-bars', '▥'],
      ['grow-turn', '⟳'],
    ],
  },
  {
    name: 'Emphasis',
    Icon: Activity,
    color: 'text-amber-700',
    effects: [
      ['pulse', '♥'],
      ['spin', '↻'],
      ['grow', '✦'],
      ['bounce', '↕'],
      ['teeter', '⌁'],
      ['flash', '✷'],
      ['wave', '〰'],
      ['color-pulse', '◉'],
      ['bold-flash', 'B'],
      ['underline', 'U̲'],
    ],
  },
  {
    name: 'Exit',
    Icon: LogOut,
    color: 'text-rose-700',
    effects: [
      ['fade-out', '◑'],
      ['fly-out', '➜'],
      ['zoom-out', '⊖'],
      ['wipe-out', '◨'],
      ['float-out', '⇩'],
      ['split-out', '◧'],
      ['disappear', '○'],
      ['sink', '⇣'],
    ],
  },
  {
    name: 'Motion',
    Icon: Route,
    color: 'text-blue-700',
    effects: [
      ['path-line', '╱'],
      ['path-arc', '⌒'],
      ['path-turn', '↳'],
      ['path-circle', '○'],
      ['path-loop', '∞'],
      ['path-zigzag', '〽'],
      ['path-custom', '✎'],
    ],
  },
] as const;

interface Props {
  screen: StudioScreen | null;
  selectedElementId: string | null;
  onUpdate: (element: StudioElement) => void;
  onPreview?: (elementId: string) => void;
}

export default function StudioAnimationsPanel({
  screen,
  selectedElementId,
  onUpdate,
  onPreview,
}: Props) {
  const selected = screen?.elements.find((element) => element.id === selectedElementId) ?? null;
  const animation =
    selected?.content.animation && typeof selected.content.animation === 'object'
      ? (selected.content.animation as Record<string, unknown>)
      : {};
  const initial = useMemo<Effect[]>(() => {
    if (Array.isArray(animation.effects) && animation.effects.length)
      return animation.effects as Effect[];
    const legacy = String(animation.effect || 'none');
    return legacy === 'none'
      ? []
      : [
          {
            id: 'legacy',
            effect: legacy,
            duration: Number(animation.duration) || 0.8,
            delay: Number(animation.delay) || 0,
            start: 'on-click',
          },
        ];
  }, [animation.delay, animation.duration, animation.effect, animation.effects]);
  const [category, setCategory] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const save = (effects: Effect[]) => {
    if (!selected) return;
    const first = effects[0];
    onUpdate({
      ...selected,
      content: {
        ...selected.content,
        animation: {
          ...animation,
          effects,
          effect: first?.effect ?? 'none',
          duration: first?.duration ?? 0.8,
          delay: first?.delay ?? 0,
        },
      },
    });
  };
  const addEffect = (effect: string) => {
    const next = [
      ...initial,
      {
        id: `animation-${Date.now()}`,
        effect,
        duration: 0.8,
        delay: 0,
        start: initial.length ? 'after-previous' : 'on-click',
      },
    ];
    save(next);
    setActiveIndex(next.length - 1);
  };
  const editActive = (changes: Partial<Effect>) =>
    save(initial.map((item, index) => (index === activeIndex ? { ...item, ...changes } : item)));
  const move = (delta: number) => {
    const target = activeIndex + delta;
    if (target < 0 || target >= initial.length) return;
    const next = [...initial];
    [next[activeIndex], next[target]] = [next[target], next[activeIndex]];
    save(next);
    setActiveIndex(target);
  };
  const remove = () => {
    const next = initial.filter((_, index) => index !== activeIndex);
    save(next);
    setActiveIndex(Math.max(0, activeIndex - 1));
  };
  if (!selected)
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-slate-300 p-8 text-center">
        <Sparkles className="mb-2 text-blue-700" />
        <p className="text-sm font-semibold text-slate-700">Select an element</p>
        <p className="mt-1 text-xs text-slate-500">
          Animations are applied to the selected text, image, shape, or equation.
        </p>
      </div>
    );
  const active = initial[activeIndex];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-900">
            <Sparkles size={19} />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">Animations</h2>
            <p className="text-xs text-slate-500">Build a timed animation sequence.</p>
          </div>
        </div>
        <button
          type="button"
          title="Preview animations"
          aria-label="Preview animations"
          onClick={() => onPreview?.(selected.id)}
          disabled={initial.length === 0}
          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 hover:bg-blue-50"
        >
          <Play size={16} />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-1">
        {categories.map(({ name, Icon, color }, index) => (
          <button
            key={name}
            type="button"
            title={name}
            aria-label={name}
            onClick={() => setCategory(index)}
            className={`grid place-items-center gap-1 rounded-lg border py-2 text-[10px] font-semibold ${category === index ? 'border-blue-700 bg-blue-50' : 'border-slate-200'}`}
          >
            <Icon size={17} className={color} />
            <span>{name}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-5 gap-2">
        {categories[category].effects.map(([effect, glyph]) => (
          <button
            key={effect}
            type="button"
            title={effect.replaceAll('-', ' ')}
            aria-label={`Add ${effect.replaceAll('-', ' ')} animation`}
            onClick={() => addEffect(effect)}
            className={`studio-effect-tile studio-effect-${effect} grid aspect-square place-items-center rounded-xl border border-slate-200 bg-white text-xl font-bold ${categories[category].color} shadow-sm transition hover:-translate-y-0.5 hover:border-blue-600 hover:bg-blue-50`}
          >
            <span aria-hidden="true">{glyph}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-2">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Sequence</p>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">
            {initial.length}
          </span>
        </div>
        {initial.length === 0 ? (
          <button
            type="button"
            onClick={() => addEffect('fade')}
            className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed p-3 text-xs font-semibold text-slate-500"
          >
            <Plus size={14} /> Add first effect
          </button>
        ) : (
          <div className="grid gap-1">
            {initial.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-left text-xs ${activeIndex === index ? 'border-blue-700 bg-white text-blue-900' : 'border-transparent hover:bg-white'}`}
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-100 font-bold">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold capitalize">
                  {item.effect.replaceAll('-', ' ')}
                </span>
                <span className="text-slate-400">{item.start.replaceAll('-', ' ')}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {active && (
        <div className="mt-3 rounded-xl border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold capitalize">{active.effect.replaceAll('-', ' ')}</p>
            <div className="flex gap-1">
              <button
                type="button"
                title="Move earlier"
                aria-label="Move animation earlier"
                onClick={() => move(-1)}
                disabled={activeIndex === 0}
                className="grid h-8 w-8 place-items-center rounded border disabled:opacity-30"
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                title="Move later"
                aria-label="Move animation later"
                onClick={() => move(1)}
                disabled={activeIndex === initial.length - 1}
                className="grid h-8 w-8 place-items-center rounded border disabled:opacity-30"
              >
                <ArrowDown size={14} />
              </button>
              <button
                type="button"
                title="Remove animation"
                aria-label="Remove animation"
                onClick={remove}
                className="grid h-8 w-8 place-items-center rounded border border-red-200 text-red-700"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <label className="mt-3 block text-xs font-semibold text-slate-600">
            Start
            <select
              value={active.start}
              onChange={(event) => editActive({ start: event.target.value })}
              className="mt-1 h-9 w-full rounded-lg border px-2"
            >
              <option value="on-click">On click</option>
              <option value="with-previous">With previous</option>
              <option value="after-previous">After previous</option>
            </select>
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-slate-600">
              Duration (s)
              <input
                type="number"
                min="0.1"
                max="60"
                step="0.1"
                value={active.duration}
                onChange={(event) => editActive({ duration: Number(event.target.value) })}
                className="mt-1 h-9 w-full rounded-lg border px-2"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Delay (s)
              <input
                type="number"
                min="0"
                max="60"
                step="0.1"
                value={active.delay}
                onChange={(event) => editActive({ delay: Number(event.target.value) })}
                className="mt-1 h-9 w-full rounded-lg border px-2"
              />
            </label>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-slate-600">
              Direction
              <select
                value={active.direction ?? 'default'}
                onChange={(event) => editActive({ direction: event.target.value })}
                className="mt-1 h-9 w-full rounded-lg border px-2"
              >
                <option value="default">Default</option>
                <option value="left">From left</option>
                <option value="right">From right</option>
                <option value="top">From top</option>
                <option value="bottom">From bottom</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Repeat
              <select
                value={active.repeat ?? 1}
                onChange={(event) => editActive({ repeat: Number(event.target.value) })}
                className="mt-1 h-9 w-full rounded-lg border px-2"
              >
                <option value="1">Once</option>
                <option value="2">2 times</option>
                <option value="3">3 times</option>
                <option value="999">Until next click</option>
              </select>
            </label>
          </div>
          <label className="mt-3 block text-xs font-semibold text-slate-600">
            Animate text
            <select
              value={active.textSequence ?? 'object'}
              onChange={(event) => editActive({ textSequence: event.target.value })}
              className="mt-1 h-9 w-full rounded-lg border px-2"
            >
              <option value="object">As one object</option>
              <option value="paragraph">By paragraph</option>
              <option value="word">By word</option>
              <option value="letter">By letter</option>
            </select>
          </label>
        </div>
      )}
      <p className="mt-3 flex items-start gap-1 text-[11px] text-slate-500">
        <CircleDot size={13} className="mt-0.5 shrink-0" /> Effects save with the element. Existing
        single-effect screens remain compatible.
      </p>
    </div>
  );
}
