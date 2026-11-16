import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ban, Pipette } from 'lucide-react';

const COLOUR_SWATCHES = ['#ffffff', '#0f172a', '#2563eb', '#dc2626', '#16a34a', '#f59e0b', '#9333ea'];

type Props = {
  compact?: boolean;
  disabled?: boolean;
  label: string;
  noColourLabel: string;
  outline?: boolean;
  value: string;
  onChange: (value: string) => void;
};

export default function StudioColourMenu({ compact = false, disabled = false, label, noColourLabel, outline = false, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const validColour = /^#[0-9a-f]{6}$/i.test(value) ? value : '#dbeafe';

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  const openEyedropper = async () => {
    const EyeDropperConstructor = (window as unknown as {
      EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
    }).EyeDropper;
    if (!EyeDropperConstructor) return;
    try {
      const result = await new EyeDropperConstructor().open();
      onChange(result.sRGBHex);
      setOpen(false);
    } catch {
      // Cancelling the system eyedropper is not an error.
    }
  };

  const triggerBounds = triggerRef.current?.getBoundingClientRect();
  const triggerSize = compact ? 'h-7 w-8' : 'h-9 w-9';
  const swatchSize = compact ? 'h-4 w-5' : 'h-5 w-5';

  return <>
    <button ref={triggerRef} type="button" disabled={disabled} onClick={() => setOpen((current) => !current)} title={label} aria-label={label} aria-expanded={open} className={`relative grid ${triggerSize} shrink-0 place-items-center rounded border border-slate-300 bg-white hover:border-blue-500 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40`}>
      <span className={`${swatchSize} rounded ${outline ? 'border-[3px]' : 'border border-slate-200'}`} style={outline ? { borderColor: value === 'transparent' ? '#94a3b8' : value } : { backgroundColor: value }} />
      {value === 'transparent' ? <Ban size={compact ? 15 : 19} className="absolute text-red-600" /> : null}
    </button>
    {open && triggerBounds ? createPortal(
      <div ref={menuRef} role="menu" aria-label={`${label} options`} className="fixed z-[300] w-48 rounded-lg border border-slate-300 bg-white p-2 shadow-xl" style={{ left: Math.min(triggerBounds.left, window.innerWidth - 200), top: triggerBounds.bottom + 6 }}>
        <button type="button" role="menuitem" onClick={() => { onChange('transparent'); setOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"><Ban size={16} className="text-red-600" />{noColourLabel}</button>
        <button type="button" role="menuitem" onClick={() => void openEyedropper()} disabled={!('EyeDropper' in window)} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"><Pipette size={16} />Eyedropper</button>
        <div className="my-1 border-t border-slate-200" />
        <div className="grid grid-cols-7 gap-1" aria-label="Theme colours">
          {COLOUR_SWATCHES.map((colour) => <button key={colour} type="button" title={colour} aria-label={`Use ${colour}`} onClick={() => { onChange(colour); setOpen(false); }} className="h-5 w-5 rounded-full border border-slate-300" style={{ backgroundColor: colour }} />)}
        </div>
        <label className="mt-2 flex cursor-pointer items-center justify-between rounded-md px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">More colours<span className="h-5 w-7 rounded border border-slate-300" style={{ backgroundColor: validColour }} /><input type="color" value={validColour} onChange={(event) => { onChange(event.target.value); setOpen(false); }} className="sr-only" aria-label={`Custom ${label.toLowerCase()}`} /></label>
      </div>,
      document.body,
    ) : null}
  </>;
}
