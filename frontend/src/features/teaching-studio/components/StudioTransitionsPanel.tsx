import { Clock3, GalleryHorizontalEnd, MousePointerClick, Play, Volume2 } from 'lucide-react';
import { useState } from 'react';
import type { StudioScreenSettings } from '../types';

const groups = [
  {
    name: 'Subtle',
    effects: [
      ['none', '○'],
      ['fade', '◐'],
      ['push', '➜'],
      ['wipe', '◩'],
      ['split', '◫'],
      ['reveal', '▣'],
      ['cut', '◧'],
      ['random-bars', '▥'],
    ],
  },
  {
    name: 'Exciting',
    effects: [
      ['morph', '◈'],
      ['cover', '▰'],
      ['uncover', '▱'],
      ['flash', '✷'],
      ['fall-over', '↷'],
      ['drape', '⌄'],
      ['curtains', '║'],
      ['wind', '〰'],
      ['orbit', '◎'],
      ['zoom', '⊕'],
    ],
  },
  {
    name: 'Dynamic',
    effects: [
      ['pan', '↔'],
      ['ferris-wheel', '◉'],
      ['conveyor', '▤'],
      ['rotate', '↻'],
      ['window', '▦'],
      ['gallery', '▥'],
      ['cube', '⬡'],
      ['doors', '▯'],
    ],
  },
] as const;

interface Props {
  settings: StudioScreenSettings | null;
  onChange: (transition: Record<string, unknown>) => void;
}
export default function StudioTransitionsPanel({ settings, onChange }: Props) {
  const saved =
    settings?.transition && typeof settings.transition === 'object'
      ? (settings.transition as Record<string, unknown>)
      : {};
  const [group, setGroup] = useState(0);
  const update = (changes: Record<string, unknown>) =>
    onChange({
      effect: 'none',
      duration: 0.7,
      direction: 'right',
      advanceOnClick: true,
      ...saved,
      ...changes,
    });
  const effect = String(saved.effect || 'none');
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-900">
            <GalleryHorizontalEnd size={19} />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">Transitions</h2>
            <p className="text-xs text-slate-500">Control how this screen enters.</p>
          </div>
        </div>
        <button
          type="button"
          title="Preview transition"
          aria-label="Preview transition"
          onClick={() => {
            const canvas = document.querySelector('[data-testid=slide-viewport]');
            canvas?.classList.remove('studio-transition-preview');
            requestAnimationFrame(() => canvas?.classList.add('studio-transition-preview'));
          }}
          className="grid h-9 w-9 place-items-center rounded-lg border hover:bg-blue-50"
        >
          <Play size={16} />
        </button>
      </div>
      <div className="mt-4 flex gap-1">
        {groups.map((item, index) => (
          <button
            key={item.name}
            type="button"
            onClick={() => setGroup(index)}
            className={`flex-1 rounded-full px-2 py-1.5 text-xs font-semibold ${group === index ? 'bg-blue-900 text-white' : 'bg-slate-100'}`}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {groups[group].effects.map(([value, glyph]) => (
          <button
            key={value}
            type="button"
            title={value.replaceAll('-', ' ')}
            aria-label={`Use ${value.replaceAll('-', ' ')} transition`}
            onClick={() => update({ effect: value })}
            className={`grid aspect-square place-items-center rounded-xl border text-xl font-bold shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50 ${effect === value ? 'border-blue-700 bg-blue-50 text-blue-900 ring-2 ring-blue-100' : 'border-slate-200 text-slate-600'}`}
          >
            <span aria-hidden="true">{glyph}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <label className="text-xs font-semibold text-slate-600">
          Direction
          <select
            value={String(saved.direction || 'right')}
            onChange={(event) => update({ direction: event.target.value })}
            className="mt-1 h-9 w-full rounded-lg border px-2"
          >
            <option value="right">From right</option>
            <option value="left">From left</option>
            <option value="top">From top</option>
            <option value="bottom">From bottom</option>
            <option value="vertical">Vertical</option>
            <option value="horizontal">Horizontal</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1">
            <Clock3 size={13} />
            Duration
          </span>
          <input
            type="number"
            min="0.1"
            max="20"
            step="0.1"
            value={Number(saved.duration) || 0.7}
            onChange={(event) => update({ duration: Number(event.target.value) })}
            className="mt-1 h-9 w-full rounded-lg border px-2"
          />
        </label>
      </div>
      <label className="mt-3 block text-xs font-semibold text-slate-600">
        <span className="flex items-center gap-1">
          <Volume2 size={13} />
          Sound
        </span>
        <select
          value={String(saved.sound || 'none')}
          onChange={(event) => update({ sound: event.target.value })}
          className="mt-1 h-9 w-full rounded-lg border px-2"
        >
          <option value="none">No sound</option>
          <option value="chime">Chime</option>
          <option value="click">Click</option>
          <option value="whoosh">Whoosh</option>
        </select>
      </label>
      <div className="mt-3 rounded-xl bg-slate-50 p-3">
        <label className="flex items-center justify-between gap-2 text-xs font-semibold">
          <span className="flex items-center gap-1">
            <MousePointerClick size={14} />
            Advance on click
          </span>
          <input
            type="checkbox"
            checked={saved.advanceOnClick !== false}
            onChange={(event) => update({ advanceOnClick: event.target.checked })}
          />
        </label>
        <label className="mt-3 flex items-center gap-2 text-xs font-semibold">
          <input
            type="checkbox"
            checked={saved.advanceAfterEnabled === true}
            onChange={(event) => update({ advanceAfterEnabled: event.target.checked })}
          />
          Advance after{' '}
          <input
            type="number"
            min="0"
            max="3600"
            step="0.5"
            value={Number(saved.advanceAfterSeconds) || 0}
            onChange={(event) => update({ advanceAfterSeconds: Number(event.target.value) })}
            className="h-8 w-20 rounded border px-2"
          />{' '}
          sec
        </label>
      </div>
      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        Transition settings are autosaved on this screen. Playback is applied by the presentation
        runtime; this editor preview confirms the selected motion family.
      </p>
    </div>
  );
}
