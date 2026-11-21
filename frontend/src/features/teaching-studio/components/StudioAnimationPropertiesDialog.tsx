import { createPortal } from 'react-dom';
import type { StudioElement } from '../types';
import {
  STUDIO_BUILT_IN_ANIMATION_SOUNDS,
  supportsStudioAnimationBuild,
  type StudioAnimationBuildSequence,
  type StudioAnimationEffectDefinition,
  type StudioAnimationRepeat,
  type StudioAnimationTextSequence,
} from './studioAnimationModel';

const control = 'h-8 rounded border border-slate-300 bg-white px-2 text-xs';

export default function StudioAnimationPropertiesDialog({ element, effect, onChange, onClose }: {
  element: StudioElement;
  effect: StudioAnimationEffectDefinition;
  onChange: (changes: Partial<StudioAnimationEffectDefinition>) => void;
  onClose: () => void;
}) {
  const buildFamily = supportsStudioAnimationBuild(element.type, element.content.visualType);
  const isText = ['title', 'text', 'question', 'response', 'steps', 'workspace', 'footer', 'options', 'data', 'shape'].includes(element.type);
  const buildChoices: Array<[StudioAnimationBuildSequence, string]> = buildFamily === 'table'
    ? [['as-one-object', 'As one object'], ['by-row', 'By row'], ['by-column', 'By column'], ['one-by-one', 'By cell']]
    : buildFamily === 'chart'
      ? [['as-one-object', 'As one object'], ['by-series', 'By series'], ['by-category', 'By category'], ['one-by-one', 'By element']]
      : buildFamily === 'diagram'
        ? [['as-one-object', 'As one object'], ['all-at-once', 'All at once'], ['one-by-one', 'One by one'], ['by-level-at-once', 'By level at once'], ['by-level-one-by-one', 'By level one by one'], ['by-branch', 'By branch']]
        : buildFamily === 'group'
          ? [['as-one-object', 'As one object'], ['all-at-once', 'All at once'], ['one-by-one', 'One by one']]
          : [];

  return createPortal(<div role="presentation" className="fixed inset-0 z-[280] grid place-items-center bg-slate-950/35 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label={`${effect.effect} animation properties`} className="max-h-[85vh] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-slate-300 bg-white shadow-2xl">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div><h2 className="text-sm font-bold capitalize text-slate-900">{effect.effect.replaceAll('-', ' ')} properties</h2><p className="text-[10px] text-slate-500">Advanced effect and timing properties</p></div>
        <button type="button" onClick={onClose} className="rounded px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Close</button>
      </header>
      <div className="grid gap-5 p-4 md:grid-cols-2">
        {isText ? <fieldset className="grid gap-2"><legend className="text-xs font-bold text-slate-700">Animate text</legend><select className={control} value={String(effect.textSequence || 'object')} onChange={(event) => onChange({ textSequence: event.target.value as StudioAnimationTextSequence })}><option value="object">As one object</option><option value="paragraph">By paragraph</option><option value="word">By word</option><option value="letter">By letter</option></select>{effect.textSequence && effect.textSequence !== 'object' ? <label className="grid gap-1 text-[10px] font-semibold text-slate-600">Delay between parts<input className={control} type="number" min="0" step="0.01" value={Number(effect.textDelay) || 0} onChange={(event) => onChange({ textDelay: Number(event.target.value) })}/></label> : null}<label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={effect.animateAttachedShape === true} onChange={(event) => onChange({ animateAttachedShape: event.target.checked })}/>Animate attached shape</label></fieldset> : null}
        {buildChoices.length ? <fieldset className="grid gap-2"><legend className="text-xs font-bold capitalize text-slate-700">{buildFamily} animation</legend><select className={control} value={String(effect.buildSequence || 'as-one-object')} onChange={(event) => onChange({ buildSequence: event.target.value as StudioAnimationBuildSequence })}>{buildChoices.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={effect.reverseOrder === true} onChange={(event) => onChange({ reverseOrder: event.target.checked })}/>Reverse order</label></fieldset> : null}
        <fieldset className="grid gap-2"><legend className="text-xs font-bold text-slate-700">After animation</legend><select className={control} value={String(effect.afterAnimation || 'none')} onChange={(event) => onChange({ afterAnimation: event.target.value })}><option value="none">Do not dim</option><option value="dim">Choose dim colour</option><option value="hide-after">Hide after animation</option><option value="hide-on-next-click">Hide on next click</option></select>{effect.afterAnimation === 'dim' ? <input aria-label="Dim colour" type="color" className="h-8 w-20" value={String(effect.afterAnimationColor || '#94a3b8')} onChange={(event) => onChange({ afterAnimationColor: event.target.value })}/> : null}</fieldset>
        <fieldset className="grid gap-2"><legend className="text-xs font-bold text-slate-700">Enhancements</legend><select className={control} value={String(effect.sound || 'none')} onChange={(event) => onChange({ sound: event.target.value })}>{STUDIO_BUILT_IN_ANIMATION_SOUNDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={effect.stopPreviousSound === true} onChange={(event) => onChange({ stopPreviousSound: event.target.checked })}/>Stop previous sound</label></fieldset>
        <fieldset className="grid gap-2"><legend className="text-xs font-bold text-slate-700">Repeat</legend><select className={control} value={String(effect.repeat || 1)} onChange={(event) => onChange({ repeat: (/^\d+$/.test(event.target.value) ? Number(event.target.value) : event.target.value) as StudioAnimationRepeat })}><option value="1">None</option><option value="2">2 times</option><option value="3">3 times</option><option value="5">5 times</option><option value="10">10 times</option><option value="until-next-click">Until next click</option><option value="until-end">Until end of Screen</option></select><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={effect.autoReverse === true} onChange={(event) => onChange({ autoReverse: event.target.checked })}/>Auto-reverse</label><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={effect.rewind === true} onChange={(event) => onChange({ rewind: event.target.checked })}/>Rewind when done</label></fieldset>
        <fieldset className="grid grid-cols-3 gap-2"><legend className="col-span-3 text-xs font-bold text-slate-700">Motion</legend>{[['Smooth start', 'smoothStart'], ['Smooth end', 'smoothEnd'], ['Bounce end', 'bounceEnd']].map(([label, key]) => <label key={key} className="grid gap-1 text-[10px] font-semibold text-slate-600">{label}<input className={control} type="number" min="0" max="1" step="0.1" value={Number(effect[key]) || 0} onChange={(event) => onChange({ [key]: Number(event.target.value) })}/></label>)}</fieldset>
      </div>
    </div>
  </div>, document.body);
}
