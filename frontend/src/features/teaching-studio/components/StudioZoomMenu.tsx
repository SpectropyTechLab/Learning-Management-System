import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Focus, Layers3, ListTree } from 'lucide-react';
import type { StudioZoomMode } from './StudioZoomPanel';

type Props = {
  active?: boolean;
  disabled?: boolean;
  onSelect: (mode: StudioZoomMode) => void;
};

const options: Array<{ mode: StudioZoomMode; label: string; icon: typeof Focus }> = [
  { mode: 'summary', label: 'Summary Zoom', icon: Layers3 },
  { mode: 'section', label: 'Section Zoom', icon: ListTree },
  { mode: 'screen', label: 'Screen (Slide) Zoom', icon: Focus },
];

export default function StudioZoomMenu({ active = false, disabled = false, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const bounds = buttonRef.current?.getBoundingClientRect();
  return <>
    <button ref={buttonRef} type="button" disabled={disabled} onClick={() => setOpen((current) => !current)} aria-haspopup="menu" aria-expanded={open} title="Insert Zoom" className={`studio-ribbon-command inline-flex min-h-9 min-w-12 flex-col items-center justify-center gap-0.5 rounded-lg border px-1.5 py-0.5 text-[9px] font-semibold disabled:opacity-35 ${active || open ? 'border-blue-300 bg-blue-50 text-blue-950' : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50'}`}>
      <span className="flex items-center gap-0.5"><Focus size={17} /><ChevronDown size={10} /></span>
      <span>Zoom</span>
    </button>
    {open && bounds ? createPortal(
      <div ref={menuRef} role="menu" aria-label="Zoom type" className="fixed z-[300] w-48 rounded-lg border border-slate-300 bg-white p-1 shadow-lg" style={{ left: Math.min(bounds.left, window.innerWidth - 204), top: bounds.bottom + 4 }}>
        {options.map(({ mode, label, icon: Icon }) => <button key={mode} type="button" role="menuitem" onClick={() => { setOpen(false); onSelect(mode); }} className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-950"><Icon size={14} className="shrink-0 text-blue-700" />{label}</button>)}
      </div>,
      document.body,
    ) : null}
  </>;
}
