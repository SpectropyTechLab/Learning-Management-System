import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, FilePlus2, Plus, Search } from 'lucide-react';

type Props = {
  disabled?: boolean;
  onCreateNew: () => void;
  onSelectExisting: () => void;
};

export default function StudioGapBridgeRibbonAdd({
  disabled = false,
  onCreateNew,
  onSelectExisting,
}: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  const toggle = () => {
    if (disabled) return;
    const bounds = buttonRef.current?.getBoundingClientRect();
    if (bounds) {
      setPosition({
        left: Math.min(bounds.left, window.innerWidth - 224),
        top: bounds.bottom + 6,
      });
    }
    setOpen((current) => !current);
  };

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const closeOnResize = () => setOpen(false);
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', escape);
    window.addEventListener('resize', closeOnResize);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', escape);
      window.removeEventListener('resize', closeOnResize);
    };
  }, [open]);

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={toggle}
        title="Add Gap Bridge"
        aria-label="Add Gap Bridge"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`studio-ribbon-command inline-flex min-h-9 min-w-14 max-w-16 flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-0.5 text-[9px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${open ? 'border-blue-300 bg-blue-50 text-blue-950' : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50'}`}
      >
        <span className="relative" aria-hidden="true">
          <Plus size={17} />
          <ChevronDown size={9} className="absolute -bottom-1 -right-2" />
        </span>
        <span className="max-w-14 truncate">Add</span>
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label="Add Gap Bridge"
              style={{ left: position.left, top: position.top }}
              className="fixed z-[1100] w-56 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-800 shadow-2xl"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => choose(onCreateNew)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-blue-50"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-100 text-blue-900">
                  <FilePlus2 size={16} />
                </span>
                <span>
                  <span className="block text-xs font-bold">Create new</span>
                  <span className="block text-[10px] text-slate-500">
                    Create a local child Screen
                  </span>
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => choose(onSelectExisting)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-blue-50"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-100 text-blue-800">
                  <Search size={16} />
                </span>
                <span>
                  <span className="block text-xs font-bold">Select existing</span>
                  <span className="block text-[10px] text-slate-500">
                    Choose a published Screen
                  </span>
                </span>
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
