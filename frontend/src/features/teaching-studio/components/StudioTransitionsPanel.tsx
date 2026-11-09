import { Clock3, CopyCheck, GalleryHorizontalEnd, Gauge, MousePointerClick, Play, ShieldCheck, Volume2 } from 'lucide-react';
import { useState } from 'react';
import type { StudioScreenSettings } from '../types';
import { playStudioTransitionSound, replayStudioTransition } from './studioTransition';
import { STUDIO_TRANSITION_GROUPS, STUDIO_TRANSITION_SOUNDS } from './studioTransitionCatalog';

interface Props {
  settings: StudioScreenSettings | null;
  onChange: (transition: Record<string, unknown>) => void;
  onApplyToAll?: (transition: Record<string, unknown>) => Promise<void>;
  screenCount?: number;
}
export default function StudioTransitionsPanel({ settings, onChange, onApplyToAll, screenCount = 1 }: Props) {
  const saved =
    settings?.transition && typeof settings.transition === 'object'
      ? (settings.transition as Record<string, unknown>)
      : {};
  const [group, setGroup] = useState(0);
  const [applying, setApplying] = useState(false);
  const transitionWith = (changes: Record<string, unknown>) => ({
      effect: 'none',
      duration: 0.7,
      direction: 'right',
      advanceOnClick: true,
      easing: 'ease-in-out',
      intensity: 'standard',
      respectReducedMotion: true,
      ...saved,
      ...changes,
    });
  const update = (changes: Record<string, unknown>) => onChange(transitionWith(changes));
  const preview = (transition = saved) => {
    const canvas = document.querySelector<HTMLElement>('[data-testid=slide-surface]');
    replayStudioTransition(canvas, transition);
  };
  const effect = String(saved.effect || 'none');
  const selectedEffect = STUDIO_TRANSITION_GROUPS.flatMap((item) => item.effects).find((item) => item.value === effect);
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
          onClick={() => preview()}
          className="grid h-9 w-9 place-items-center rounded-lg border hover:bg-blue-50"
        >
          <Play size={16} />
        </button>
      </div>
      <div className="mt-4 flex gap-1">
        {STUDIO_TRANSITION_GROUPS.map((item, index) => (
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
        {STUDIO_TRANSITION_GROUPS[group].effects.map(({ value, label, glyph }) => (
          <button
            key={value}
            type="button"
            title={label}
            aria-label={`Use ${label} transition`}
            onClick={() => {
              const next = transitionWith({ effect: value });
              onChange(next);
              window.requestAnimationFrame(() => preview(next));
            }}
            className={`grid aspect-square place-items-center rounded-xl border text-xl font-bold shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50 ${effect === value ? 'border-blue-700 bg-blue-50 text-blue-900 ring-2 ring-blue-100' : 'border-slate-200 text-slate-600'}`}
          >
            <span aria-hidden="true">{glyph}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs font-medium text-slate-600">Selected: {selectedEffect?.label ?? 'None'}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <label className="text-xs font-semibold text-slate-600">
          Direction
          <select
            value={String(saved.direction || 'right')}
            onChange={(event) => update({ direction: event.target.value })}
            disabled={selectedEffect?.directions !== true}
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
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1"><Gauge size={13} />Motion intensity</span>
          <select value={String(saved.intensity || 'standard')} onChange={(event) => update({ intensity: event.target.value })} className="mt-1 h-9 w-full rounded-lg border px-2">
            <option value="subtle">Subtle</option>
            <option value="standard">Standard</option>
            <option value="dramatic">Dramatic</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Easing
          <select value={String(saved.easing || 'ease-in-out')} onChange={(event) => update({ easing: event.target.value })} className="mt-1 h-9 w-full rounded-lg border px-2">
            <option value="ease-in-out">Smooth</option>
            <option value="ease-out">Decelerate</option>
            <option value="ease-in">Accelerate</option>
            <option value="linear">Linear</option>
            <option value="cubic-bezier(.2,.8,.2,1)">Cinematic</option>
          </select>
        </label>
      </div>
      <label className="mt-3 block text-xs font-semibold text-slate-600">
        <span className="flex items-center gap-1">
          <Volume2 size={13} />
          Sound
        </span>
        <select
          value={String(saved.sound || 'none')}
          onChange={(event) => {
            const sound = event.target.value;
            update({ sound });
            void playStudioTransitionSound(sound).catch(() => undefined);
          }}
          className="mt-1 h-9 w-full rounded-lg border px-2"
        >
          {STUDIO_TRANSITION_SOUNDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
        <input type="checkbox" checked={saved.loopSound === true} disabled={['none', 'stop'].includes(String(saved.sound || 'none'))} onChange={(event) => update({ loopSound: event.target.checked })} />
        Loop sound until another transition sound starts
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
      <label className="mt-3 flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-xs font-semibold text-slate-700">
        <input type="checkbox" className="mt-0.5" checked={saved.respectReducedMotion !== false} onChange={(event) => update({ respectReducedMotion: event.target.checked })} />
        <span><span className="flex items-center gap-1"><ShieldCheck size={14} />Respect reduced-motion preference</span><span className="mt-1 block font-normal text-slate-500">Uses a short fade for viewers who request less motion.</span></span>
      </label>
      {onApplyToAll && screenCount > 1 ? <button type="button" disabled={applying} onClick={async () => {
        setApplying(true);
        try { await onApplyToAll(transitionWith({})); } catch { /* parent reports the actionable API error */ } finally { setApplying(false); }
      }} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-700 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50 disabled:opacity-50"><CopyCheck size={16} />{applying ? 'Applying…' : `Apply to all ${screenCount} Screens`}</button> : null}
      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        One transition is stored per Screen. Auto-advance starts after the Screen's final animation build.
      </p>
    </div>
  );
}
