import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Boxes, ClipboardPaste, Copy, Layers, Scissors, Trash2, Unlink } from 'lucide-react';

type Command = { id: string; label: string; icon: typeof Copy; onExecute: () => void; disabled?: boolean; danger?: boolean };

type Props = {
  position: { x: number; y: number };
  canPaste: boolean;
  canGroup: boolean;
  canUngroup: boolean;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onLayers: () => void;
  onClose: () => void;
};

export default function StudioElementContextMenu(props: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) props.onClose(); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') props.onClose(); };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', escape);
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', escape); };
  }, [props]);
  const commands: Command[] = [
    { id: 'cut', label: 'Cut', icon: Scissors, onExecute: props.onCut },
    { id: 'copy', label: 'Copy', icon: Copy, onExecute: props.onCopy },
    { id: 'paste', label: 'Paste', icon: ClipboardPaste, onExecute: props.onPaste, disabled: !props.canPaste },
    { id: 'duplicate', label: 'Duplicate', icon: Copy, onExecute: props.onDuplicate },
    { id: 'group', label: 'Group', icon: Boxes, onExecute: props.onGroup, disabled: !props.canGroup },
    { id: 'ungroup', label: 'Ungroup', icon: Unlink, onExecute: props.onUngroup, disabled: !props.canUngroup },
    { id: 'layers', label: 'Selection Pane', icon: Layers, onExecute: props.onLayers },
    { id: 'delete', label: 'Delete', icon: Trash2, onExecute: props.onDelete, danger: true },
  ];
  return createPortal(
    <div ref={menuRef} role="menu" aria-label="Element editing commands" className="fixed z-[300] w-48 rounded-lg border border-slate-200 bg-white p-1.5 shadow-2xl" style={{ left: Math.min(props.position.x, window.innerWidth - 208), top: Math.min(props.position.y, window.innerHeight - 330) }}>
      {commands.map(({ id, label, icon: Icon, onExecute, disabled, danger }) => <button key={id} type="button" role="menuitem" disabled={disabled} onClick={() => { onExecute(); props.onClose(); }} className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs font-medium disabled:opacity-35 ${danger ? 'text-red-700 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100'}`}><Icon size={15} />{label}</button>)}
    </div>,
    document.body,
  );
}
