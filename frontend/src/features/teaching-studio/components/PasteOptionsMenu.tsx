import { ClipboardCopy, Image, Palette, Type, WandSparkles, X } from 'lucide-react';
import type { StudioPasteMode } from './studioClipboardModel.ts';

const options: Array<{ mode: StudioPasteMode; label: string; icon: typeof Palette }> = [
  { mode: 'destination-theme', label: 'Use Destination Theme', icon: Palette },
  { mode: 'source-formatting', label: 'Keep Source Formatting', icon: ClipboardCopy },
  { mode: 'editable-content', label: 'Paste as Editable Content', icon: WandSparkles },
  { mode: 'picture', label: 'Picture', icon: Image },
  { mode: 'text-only', label: 'Keep Text Only', icon: Type },
];

export default function PasteOptionsMenu({ modes, onChoose, onClose }: { modes: StudioPasteMode[]; onChoose: (mode: StudioPasteMode) => void; onClose: () => void }) {
  if (modes.length < 2) return null;
  return <div className="absolute bottom-12 left-1/2 z-[180] flex -translate-x-1/2 items-center gap-1 rounded-xl border border-slate-300 bg-white p-1.5 shadow-xl" role="menu" aria-label="Paste options">
    <span className="px-1 text-[11px] font-bold text-slate-700">Paste:</span>
    {options.filter(({ mode }) => modes.includes(mode)).map(({ mode, label, icon: Icon }) => <button key={mode} type="button" role="menuitem" title={label} aria-label={label} onClick={() => onChoose(mode)} className="grid h-9 w-9 place-items-center rounded-lg text-blue-900 transition hover:scale-105 hover:bg-blue-50"><Icon size={19}/></button>)}
    <button type="button" onClick={onClose} title="Close paste options" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={16}/></button>
  </div>;
}
