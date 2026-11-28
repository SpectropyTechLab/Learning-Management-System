import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  ClipboardCopy,
  ClipboardPaste,
  Copy,
  Image,
  Paintbrush,
  Palette,
  Scissors,
  Type,
  WandSparkles,
} from 'lucide-react';
import type { StudioPasteMode } from './studioClipboardModel';

type Props = {
  canPaste: boolean;
  canCopy: boolean;
  canCut: boolean;
  canDuplicate: boolean;
  formatPainterActive: boolean;
  formatPainterLocked: boolean;
  availablePasteModes: StudioPasteMode[];
  onPaste: (mode: StudioPasteMode) => void;
  onCopy: () => void;
  onDuplicate: () => void;
  onCut: () => void;
  onFormatPainter: (persistent: boolean) => void;
};

const pasteOptions: Array<{ mode: StudioPasteMode; label: string; icon: typeof Palette }> = [
  { mode: 'destination-theme', label: 'Use Destination Theme', icon: Palette },
  { mode: 'source-formatting', label: 'Keep Source Formatting', icon: ClipboardCopy },
  { mode: 'editable-content', label: 'Paste as Editable Content', icon: WandSparkles },
  { mode: 'picture', label: 'Picture', icon: Image },
  { mode: 'text-only', label: 'Keep Text Only', icon: Type },
];

export default function StudioClipboardGroup({
  canPaste,
  canCopy,
  canCut,
  canDuplicate,
  formatPainterActive,
  formatPainterLocked,
  availablePasteModes,
  onPaste,
  onCopy,
  onDuplicate,
  onCut,
  onFormatPainter,
}: Props) {
  const [open, setOpen] = useState(false);
  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });
  const [copyMenuPosition, setCopyMenuPosition] = useState({ left: 0, top: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const copyButtonRef = useRef<HTMLDivElement>(null);
  const copyMenuRef = useRef<HTMLDivElement>(null);
  const clickTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
      if (!copyButtonRef.current?.contains(target) && !copyMenuRef.current?.contains(target)) setCopyMenuOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, []);

  useEffect(() => () => {
    if (clickTimerRef.current !== null) window.clearTimeout(clickTimerRef.current);
  }, []);

  const choosePaste = (mode: StudioPasteMode) => {
    setOpen(false);
    onPaste(mode);
  };

  const togglePasteOptions = () => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) setMenuPosition({ left: rect.left, top: rect.bottom + 4 });
    setOpen((value) => !value);
  };

  const toggleCopyOptions = () => {
    const rect = copyButtonRef.current?.getBoundingClientRect();
    if (rect) setCopyMenuPosition({ left: rect.left, top: rect.bottom + 4 });
    setCopyMenuOpen((value) => !value);
  };

  return (
    <>
      <div ref={rootRef} className="relative flex h-12 w-[4.15rem] shrink-0 items-center justify-center gap-0.5 px-0.5" aria-label="Clipboard commands">
      <div className="flex h-12 w-10 shrink-0 flex-col overflow-hidden rounded-md border border-transparent hover:border-slate-200 hover:bg-slate-50">
        <button type="button" disabled={!canPaste} onClick={() => choosePaste('source-formatting')} title="Paste (Ctrl+V)" className="flex flex-1 flex-col items-center justify-center text-[9px] font-semibold text-slate-700 disabled:opacity-35">
          <ClipboardPaste size={22} className="text-amber-600" />
          <span>Paste</span>
        </button>
        <button type="button" disabled={!canPaste} onClick={togglePasteOptions} aria-expanded={open} aria-haspopup="menu" title="Paste options" className="flex h-4 items-center justify-center border-t border-slate-100 text-slate-600 disabled:opacity-35">
          <ChevronDown size={11} />
        </button>
      </div>
      <div className="grid h-12 w-5 shrink-0 grid-rows-3 gap-0.5">
        <button type="button" disabled={!canCut} onPointerDown={(event) => event.preventDefault()} onClick={onCut} title="Cut (Ctrl+X)" aria-label="Cut" className="grid min-h-0 w-5 place-items-center overflow-visible rounded text-slate-700 hover:bg-slate-100 disabled:opacity-35"><Scissors size={12} /></button>
        <div ref={copyButtonRef} className="flex min-h-0 w-5 overflow-hidden rounded hover:bg-slate-100">
          <button type="button" disabled={!canCopy} onPointerDown={(event) => event.preventDefault()} onClick={onCopy} title="Copy (Ctrl+C)" aria-label="Copy" className="grid min-h-0 flex-1 place-items-center text-slate-700 disabled:opacity-35"><Copy size={11} /></button>
          <button type="button" disabled={!canCopy && !canDuplicate} onPointerDown={(event) => event.preventDefault()} onClick={toggleCopyOptions} title="Copy and Duplicate options" aria-label="Copy and Duplicate options" aria-haspopup="menu" aria-expanded={copyMenuOpen} className="grid min-h-0 w-2 place-items-center text-slate-600 disabled:opacity-35"><ChevronDown size={8} /></button>
        </div>
        <button
          type="button"
          disabled={!canCopy && !formatPainterActive}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => {
            if (clickTimerRef.current !== null) window.clearTimeout(clickTimerRef.current);
            clickTimerRef.current = window.setTimeout(() => onFormatPainter(false), 220);
          }}
          onDoubleClick={() => {
            if (clickTimerRef.current !== null) window.clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
            onFormatPainter(true);
          }}
          title={formatPainterLocked ? 'Format Painter locked — click to stop' : 'Format Painter (double-click to keep active)'}
          aria-label="Format Painter"
          aria-pressed={formatPainterActive}
          className={`grid min-h-0 w-5 place-items-center rounded hover:bg-slate-100 disabled:opacity-35 ${formatPainterActive ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-400' : 'text-amber-700'}`}
        >
          <Paintbrush size={12} />
        </button>
      </div>
      </div>
      {open && typeof document !== 'undefined' ? createPortal(
        <div ref={menuRef} role="menu" aria-label="Paste Options" className="fixed z-[250] w-56 rounded-lg border border-slate-300 bg-white p-2 shadow-xl" style={menuPosition}>
          <p className="px-1 pb-1 text-[11px] font-bold text-slate-800">Paste Options:</p>
          <div className="grid grid-cols-4 gap-1">
            {pasteOptions.filter(({ mode }) => availablePasteModes.includes(mode)).map(({ mode, label, icon: Icon }) => (
              <button key={mode} type="button" role="menuitem" onClick={() => choosePaste(mode)} title={label} className="grid h-10 place-items-center rounded-md border border-transparent text-blue-900 hover:border-blue-300 hover:bg-blue-50">
                <Icon size={21} />
                <span className="sr-only">{label}</span>
              </button>
            ))}
          </div>
          <div className="mt-1 border-t border-slate-200 px-1 pt-1 text-[10px] text-slate-500">
            Only paste results supported by the copied content are shown.
          </div>
        </div>,
        document.body,
      ) : null}
      {copyMenuOpen && typeof document !== 'undefined' ? createPortal(
        <div ref={copyMenuRef} role="menu" aria-label="Copy and Duplicate" className="fixed z-[250] w-44 overflow-hidden rounded-lg border border-slate-300 bg-white py-1 shadow-xl" style={copyMenuPosition}>
          <button type="button" role="menuitem" disabled={!canCopy} onClick={() => { setCopyMenuOpen(false); onCopy(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 disabled:opacity-35"><Copy size={15} />Copy</button>
          <button type="button" role="menuitem" disabled={!canDuplicate} onClick={() => { setCopyMenuOpen(false); onDuplicate(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 disabled:opacity-35"><ClipboardCopy size={15} />Duplicate</button>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
