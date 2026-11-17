import StudioAnimationMenu from './StudioAnimationMenu';
import StudioAnimationIcon from './StudioAnimationIcon';
import { STUDIO_ANIMATION_EFFECTS } from './studioAnimationCatalog';

const visibleEffects = ['appear', 'fade', 'fly-in', 'wipe', 'zoom', 'float-in', 'split'];

export default function StudioAnimationRibbonGallery({ activeEffect, disabled, onSelect, onRemove }: {
  activeEffect: string;
  disabled: boolean;
  onSelect: (effect: string) => void;
  onRemove: () => void;
}) {
  return <div className="flex h-full items-center gap-0.5 px-1">
    <button type="button" disabled={disabled} onClick={onRemove} title="Remove animation" className={`grid h-11 w-11 place-items-center rounded-md border text-[8px] ${activeEffect === 'none' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'} disabled:opacity-40`}><span className="grid place-items-center"><StudioAnimationIcon effect="none" size={15}/><span>None</span></span></button>
    {visibleEffects.map((effect) => {
      const item = STUDIO_ANIMATION_EFFECTS.find((candidate) => candidate.id === effect)!;
      return <button key={effect} type="button" disabled={disabled} onClick={() => onSelect(effect)} title={item.name} className={`grid h-11 w-11 place-items-center rounded-md border px-0.5 text-[8px] ${activeEffect === effect ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-300' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50'} disabled:opacity-40`}><span className="grid place-items-center"><StudioAnimationIcon effect={effect} size={15} className="text-emerald-700"/><span className="w-10 truncate">{item.name}</span></span></button>;
    })}
    <StudioAnimationMenu label="More" disabled={disabled} onSelect={onSelect} onRemove={onRemove}/>
  </div>;
}
