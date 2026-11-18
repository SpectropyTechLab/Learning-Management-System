import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import StudioAnimationMenu from './StudioAnimationMenu';
import StudioAnimationIcon from './StudioAnimationIcon';
import { STUDIO_ANIMATION_EFFECTS } from './studioAnimationCatalog';

const galleryPageSize = 7;

export default function StudioAnimationRibbonGallery({ activeEffect, disabled, onSelect, onRemove }: {
  activeEffect: string;
  disabled: boolean;
  onSelect: (effect: string) => void;
  onRemove: () => void;
}) {
  const [galleryPage, setGalleryPage] = useState(0);
  const galleryPageCount = Math.ceil(STUDIO_ANIMATION_EFFECTS.length / galleryPageSize);
  const visibleEffects = STUDIO_ANIMATION_EFFECTS.slice(galleryPage * galleryPageSize, (galleryPage + 1) * galleryPageSize);

  useEffect(() => {
    const selectedIndex = STUDIO_ANIMATION_EFFECTS.findIndex((effect) => effect.id === activeEffect);
    if (selectedIndex >= 0) setGalleryPage(Math.floor(selectedIndex / galleryPageSize));
  }, [activeEffect]);

  return <div data-studio-animation-gallery className="flex h-full items-center gap-0.5 px-1">
    <button type="button" disabled={disabled} onClick={onRemove} title="Remove animation" className={`grid h-11 w-11 place-items-center rounded-md border text-[8px] ${activeEffect === 'none' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'} disabled:opacity-40`}><span className="grid place-items-center"><StudioAnimationIcon effect="none" size={15}/><span>None</span></span></button>
    {visibleEffects.map((item) => {
      return <button key={item.id} type="button" disabled={disabled} onClick={() => onSelect(item.id)} title={item.name} className={`grid h-11 w-11 place-items-center rounded-md border px-0.5 text-[8px] ${activeEffect === item.id ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-300' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50'} disabled:opacity-40`}><span className="grid place-items-center"><StudioAnimationIcon effect={item.id} size={15} className="text-emerald-700"/><span className="w-10 truncate">{item.name}</span></span></button>;
    })}
    <div className="grid h-11 w-6 shrink-0 grid-rows-3 overflow-hidden rounded border border-slate-200 bg-white">
      <button type="button" disabled={disabled || galleryPage === 0} onClick={() => setGalleryPage((page) => Math.max(0, page - 1))} title="Previous animation row" aria-label="Previous animation row" className="grid place-items-center border-b border-slate-200 hover:bg-blue-50 disabled:text-slate-300"><ChevronUp size={12}/></button>
      <button type="button" disabled={disabled || galleryPage >= galleryPageCount - 1} onClick={() => setGalleryPage((page) => Math.min(galleryPageCount - 1, page + 1))} title="Next animation row" aria-label="Next animation row" className="grid place-items-center border-b border-slate-200 hover:bg-blue-50 disabled:text-slate-300"><ChevronDown size={12}/></button>
      <StudioAnimationMenu compact label="Show all animations" disabled={disabled} onSelect={onSelect} onRemove={onRemove}/>
    </div>
  </div>;
}
