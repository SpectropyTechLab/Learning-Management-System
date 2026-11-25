import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import StudioAnimationMenu from './StudioAnimationMenu';
import StudioAnimationIcon from './StudioAnimationIcon';
import { STUDIO_ANIMATION_EFFECTS } from './studioAnimationCatalog';
import { studioAnimationCategoryColour } from './studioAnimationModel';

export default function StudioAnimationRibbonGallery({ activeEffect, disabled, isEffectDisabled, onSelect, onRemove }: {
  activeEffect: string;
  disabled: boolean;
  isEffectDisabled?: (effect: string) => boolean;
  onSelect: (effect: string) => void;
  onRemove: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [galleryPageSize, setGalleryPageSize] = useState(7);
  const [galleryPage, setGalleryPage] = useState(0);
  const galleryPageCount = Math.ceil(STUDIO_ANIMATION_EFFECTS.length / galleryPageSize);
  const galleryStart = Math.min(galleryPage * galleryPageSize, Math.max(0, STUDIO_ANIMATION_EFFECTS.length - galleryPageSize));
  const visibleEffects = STUDIO_ANIMATION_EFFECTS.slice(galleryStart, galleryStart + galleryPageSize);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      // Match the Transition gallery: a 68px effect tile and a 28px paging rail.
      // The remaining allowance covers the fixed None tile and inter-item gaps.
      const available = Math.max(0, host.getBoundingClientRect().width - 104);
      setGalleryPageSize(Math.max(1, Math.min(STUDIO_ANIMATION_EFFECTS.length, Math.floor(available / 70))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const selectedIndex = STUDIO_ANIMATION_EFFECTS.findIndex((effect) => effect.id === activeEffect);
    if (selectedIndex >= 0) setGalleryPage(Math.floor(selectedIndex / galleryPageSize));
  }, [activeEffect, galleryPageSize]);

  useEffect(() => {
    setGalleryPage((page) => Math.min(page, Math.max(0, galleryPageCount - 1)));
  }, [galleryPageCount]);

  return <div ref={hostRef} data-studio-animation-gallery className="flex h-14 w-full min-w-0 flex-1 items-center gap-0.5 overflow-hidden px-1">
    <button type="button" disabled={disabled} onClick={onRemove} title="Remove animation" className={`flex h-12 min-w-[4.25rem] flex-1 basis-[4.25rem] flex-col items-center justify-center rounded-md border px-1 text-[10px] font-semibold ${activeEffect === 'none' ? 'border-blue-600 bg-blue-100 text-blue-950' : 'border-transparent bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'} disabled:opacity-40`}><StudioAnimationIcon effect="none" size={20}/><span className="mt-0.5 w-full truncate text-center">None</span></button>
    {visibleEffects.map((item) => {
      const effectDisabled = isEffectDisabled?.(item.id) === true;
      return <button key={item.id} type="button" disabled={disabled || effectDisabled} onClick={() => onSelect(item.id)} title={effectDisabled ? `${item.name} is not available for this object` : item.name} className={`group flex h-12 min-w-[4.25rem] flex-1 basis-[4.25rem] flex-col items-center justify-center rounded-md border px-1 text-[10px] font-semibold transition-all ${activeEffect === item.id ? 'border-blue-600 bg-blue-100 text-blue-950' : 'border-transparent bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'} disabled:opacity-40`}><span className="transition-transform group-hover:scale-110"><StudioAnimationIcon effect={item.id} size={20} styleColour={studioAnimationCategoryColour(item.id)}/></span><span className="mt-0.5 w-full truncate text-center">{item.name}</span></button>;
    })}
    <div className="grid h-14 w-7 shrink-0 grid-rows-3 overflow-hidden rounded border border-slate-200 bg-white">
      <button type="button" disabled={disabled || galleryPage === 0} onClick={() => setGalleryPage((page) => Math.max(0, page - 1))} title="Previous animation row" aria-label="Previous animation row" className="grid place-items-center border-b border-slate-200 hover:bg-blue-50 disabled:text-slate-300"><ChevronUp size={12}/></button>
      <button type="button" disabled={disabled || galleryPage >= galleryPageCount - 1} onClick={() => setGalleryPage((page) => Math.min(galleryPageCount - 1, page + 1))} title="Next animation row" aria-label="Next animation row" className="grid place-items-center border-b border-slate-200 hover:bg-blue-50 disabled:text-slate-300"><ChevronDown size={12}/></button>
      <StudioAnimationMenu compact label="Show all animations" disabled={disabled} isEffectDisabled={isEffectDisabled} onSelect={onSelect} onRemove={onRemove}/>
    </div>
  </div>;
}
