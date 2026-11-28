import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ImagePlus, Images, LoaderCircle, SlidersHorizontal, Trash2, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { createStudioResource, getStudioResourcePreview, type StudioResourceSummary, type StudioResourceVersion } from '../api/studioResourcesApi';
import type { StudioScreenResourceCache } from '../studioScreenResourceCache';
import type { StudioBackgroundImageFill } from '../types';
import ResourceLibrary from './resources/ResourceLibrary';

const MAX_BACKGROUND_IMAGE_BYTES = 50 * 1024 * 1024;
const SUPPORTED_BACKGROUND_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const validateStudioBackgroundImage = async (file: File) => {
  if (!SUPPORTED_BACKGROUND_IMAGE_TYPES.has(file.type)) throw new Error('Choose a JPEG, PNG, or WebP image.');
  if (file.size <= 0 || file.size > MAX_BACKGROUND_IMAGE_BYTES) throw new Error('Background images must be smaller than 50 MB.');
  const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve({ width: image.naturalWidth, height: image.naturalHeight }); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('The image is damaged or cannot be decoded.')); };
    image.src = url;
  });
  if (!dimensions.width || !dimensions.height || dimensions.width * dimensions.height > 100_000_000)
    throw new Error('The image dimensions are too large. Use an image below 100 megapixels.');
  return dimensions;
};

export const useStudioBackgroundImageUrl = (
  fill?: StudioBackgroundImageFill | null,
  resourceCache?: StudioScreenResourceCache,
  resolvePreview?: (versionId: number) => Promise<{ url: string }>,
) => {
  const [preview, setPreview] = useState<{ versionId: number; url: string } | null>(null);
  const versionId = Number(fill?.resourceVersionId);
  useEffect(() => {
    if (!Number.isInteger(versionId) || versionId <= 0) return;
    let active = true;
    void (resolvePreview?.(versionId) ?? resourceCache?.getPreview(versionId) ?? getStudioResourcePreview(versionId))
      .then((response) => { if (active) setPreview({ versionId, url: response.url }); })
      .catch(() => { if (active) setPreview(null); });
    return () => { active = false; };
  }, [versionId, resourceCache, resolvePreview]);
  return preview?.versionId === versionId ? preview.url : '';
};

type Props = {
  disabled?: boolean;
  label: string;
  targetKey: string;
  value?: StudioBackgroundImageFill | null;
  onChange: (value: StudioBackgroundImageFill | null) => void;
};

export default function StudioBackgroundImageMenu({ disabled = false, label, targetKey, value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const sourceButtonRef = useRef<HTMLButtonElement>(null);
  const sourceMenuRef = useRef<HTMLDivElement>(null);
  const adjustRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [resourcePickerOpen, setResourcePickerOpen] = useState(false);
  const currentTarget = useRef<{ key: string; disabled: boolean; onChange: Props['onChange'] } | null>(null);
  useEffect(() => {
    currentTarget.current = { key: targetKey, disabled, onChange };
    return () => { currentTarget.current = null; };
  }, [targetKey, disabled, onChange]);
  useEffect(() => {
    setSourceMenuOpen(false);
    setAdjustOpen(false);
    setResourcePickerOpen(false);
  }, [targetKey]);
  useEffect(() => {
    if (!sourceMenuOpen) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!sourceButtonRef.current?.contains(target) && !sourceMenuRef.current?.contains(target)) setSourceMenuOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [sourceMenuOpen]);
  useEffect(() => {
    if (!adjustOpen) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!adjustRef.current?.contains(target) && !panelRef.current?.contains(target)) setAdjustOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [adjustOpen]);
  const upload = async (file?: File) => {
    if (!file || busy) return;
    setBusy(true);
    try {
      const dimensions = await validateStudioBackgroundImage(file);
      const resource = await createStudioResource({
        name: file.name.replace(/\.[^.]+$/, '') || 'Background image',
        description: 'Teaching Studio background image',
        resourceType: 'image',
        file,
        width: dimensions.width,
        height: dimensions.height,
        metadataJson: { usage: 'background-image' },
      });
      if (!resource.latest_version) throw new Error('The uploaded image has no usable Resource version.');
      const target = currentTarget.current;
      if (!target || target.key !== targetKey || target.disabled) {
        toast('Image uploaded to the Resource Library. The original target is no longer selected.');
        return;
      }
      target.onChange({
        resourceId: resource.id,
        resourceVersionId: resource.latest_version.id,
        name: resource.name,
        fit: value?.fit ?? 'cover',
        scale: 1,
        x: 0,
        y: 0,
        opacity: value?.opacity ?? 1,
      });
      toast.success('Background image uploaded and applied.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to upload the background image.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };
  const chooseResource = (resource: StudioResourceSummary, version: StudioResourceVersion) => {
    if (resource.resource_type !== 'image') {
      toast.error('Choose an image Resource for the background.');
      return;
    }
    const target = currentTarget.current;
    if (!target || target.key !== targetKey || target.disabled) {
      toast('The original background target is no longer selected.');
      setResourcePickerOpen(false);
      return;
    }
    target.onChange({
      resourceId: resource.id,
      resourceVersionId: version.id,
      name: resource.name,
      fit: value?.fit ?? 'cover',
      scale: 1,
      x: 0,
      y: 0,
      opacity: value?.opacity ?? 1,
    });
    setResourcePickerOpen(false);
    toast.success('Resource applied as the background image.');
  };
  return <div className="flex items-center gap-1 px-1" aria-label={label}>
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || busy} onChange={(event) => void upload(event.target.files?.[0])} className="sr-only" />
    <button ref={sourceButtonRef} type="button" disabled={disabled || busy} aria-haspopup="menu" aria-expanded={sourceMenuOpen} onClick={() => setSourceMenuOpen((open) => !open)} title={value ? 'Replace background image' : 'Add background image'} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 text-[10px] font-semibold text-slate-700 hover:border-blue-500 hover:bg-blue-50 disabled:opacity-40">
      {busy ? <LoaderCircle size={15} className="animate-spin" /> : <ImagePlus size={15} />}
      <span>Background image</span>
      <ChevronDown size={12} />
    </button>
    {sourceMenuOpen && sourceButtonRef.current ? createPortal(<div ref={sourceMenuRef} role="menu" aria-label="Background image source" className="fixed z-[315] w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-2xl" style={{ left: Math.max(8, Math.min(sourceButtonRef.current.getBoundingClientRect().left, window.innerWidth - 216)), top: sourceButtonRef.current.getBoundingClientRect().bottom + 6 }}>
      <button type="button" role="menuitem" onClick={() => { setSourceMenuOpen(false); inputRef.current?.click(); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50"><Upload size={15} />Upload from device</button>
      <button type="button" role="menuitem" onClick={() => { setSourceMenuOpen(false); setResourcePickerOpen(true); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50"><Images size={15} />Choose from Resources</button>
    </div>, document.body) : null}
    {value ? <>
      <button ref={adjustRef} type="button" aria-expanded={adjustOpen} disabled={disabled} onClick={() => setAdjustOpen((open) => !open)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 px-2 text-[10px] font-semibold text-slate-700 hover:bg-blue-50 disabled:opacity-40"><SlidersHorizontal size={14}/>Adjust</button>
      <button type="button" title="Remove background image" aria-label="Remove background image" disabled={disabled} onClick={() => onChange(null)} className="grid h-9 w-9 place-items-center rounded-lg text-red-700 hover:bg-red-50 disabled:opacity-40"><Trash2 size={15} /></button>
      {adjustOpen && adjustRef.current ? createPortal(<div ref={panelRef} role="dialog" aria-label="Adjust background image" className="fixed z-[310] w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl" style={{ left: Math.max(8, Math.min(adjustRef.current.getBoundingClientRect().left, window.innerWidth - 296)), top: adjustRef.current.getBoundingClientRect().bottom + 6 }}>
        <h3 className="text-xs font-bold text-slate-900">Adjust background image</h3>
        <label className="mt-3 block text-[10px] font-semibold text-slate-600">Fit mode<select value={value.fit} onChange={(event) => onChange({ ...value, fit: event.target.value as 'cover' | 'contain' })} className="mt-1 h-8 w-full rounded-lg border border-slate-300 px-2 text-xs font-normal"><option value="cover">Fill — crop to target</option><option value="contain">Fit — show complete image</option></select></label>
        <label className="mt-3 block text-[10px] font-semibold text-slate-600">Zoom · {Math.round(value.scale * 100)}%<input type="range" min="1" max="3" step="0.05" value={value.scale} onChange={(event) => onChange({ ...value, scale: Number(event.target.value) })} className="mt-1 w-full" /></label>
        <label className="mt-2 block text-[10px] font-semibold text-slate-600">Horizontal position<input type="range" min="-100" max="100" value={value.x} onChange={(event) => onChange({ ...value, x: Number(event.target.value) })} className="mt-1 w-full" /></label>
        <label className="mt-2 block text-[10px] font-semibold text-slate-600">Vertical position<input type="range" min="-100" max="100" value={value.y} onChange={(event) => onChange({ ...value, y: Number(event.target.value) })} className="mt-1 w-full" /></label>
        <label className="mt-2 block text-[10px] font-semibold text-slate-600">Opacity · {Math.round(value.opacity * 100)}%<input type="range" min="0" max="1" step="0.05" value={value.opacity} onChange={(event) => onChange({ ...value, opacity: Number(event.target.value) })} className="mt-1 w-full" /></label>
        <div className="mt-3 flex justify-between"><button type="button" onClick={() => onChange({ ...value, fit: 'cover', scale: 1, x: 0, y: 0, opacity: 1 })} className="rounded-lg border px-3 py-1.5 text-[10px] font-semibold">Reset</button><button type="button" onClick={() => setAdjustOpen(false)} className="rounded-lg bg-blue-900 px-3 py-1.5 text-[10px] font-semibold text-white">Done</button></div>
      </div>, document.body) : null}
    </> : null}
    {resourcePickerOpen ? createPortal(<div className="fixed inset-0 z-[320] grid place-items-center bg-slate-950/60 p-5 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setResourcePickerOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="background-resource-picker-title" className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-3">
          <div><h2 id="background-resource-picker-title" className="font-bold text-slate-950">Choose a background Resource</h2><p className="text-xs text-slate-500">Select an image or a specific image version from the Resource Library.</p></div>
          <button type="button" onClick={() => setResourcePickerOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close background Resource picker"><X size={20} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto"><ResourceLibrary mode="picker" allowedTypes={['image']} initialType="image" onPick={chooseResource} /></div>
      </section>
    </div>, document.body) : null}
  </div>;
}
