import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  AlignCenterHorizontal,
  Boxes,
  BringToFront,
  ChevronDown,
  PaintBucket,
  PanelRightOpen,
  PenLine,
  RotateCcw,
  RotateCw,
  SendToBack,
  Shapes,
} from 'lucide-react';
import StudioShapeElement from './StudioShapeElement';

type ShapeGroup = { label: string; shapes: readonly string[] };
type MenuPosition = { left: number; top: number };

const palette = ['#0f172a', '#1d4ed8', '#0f766e', '#7e22ce', '#dc2626', '#ea580c', '#facc15', '#ffffff'];

function PopupButton({ icon, label, colour, open, disabled, onClick }: { icon: ReactNode; label: string; colour?: string; open?: boolean; disabled?: boolean; onClick: (target: HTMLButtonElement) => void }) {
  return <button type="button" disabled={disabled} aria-expanded={open} onClick={(event) => onClick(event.currentTarget)} className={`relative flex h-11 w-full flex-col items-center justify-center gap-0.5 rounded px-1 text-center text-[9px] font-semibold hover:bg-blue-50 disabled:opacity-40 ${open ? 'bg-blue-50 text-blue-900' : 'text-slate-700'}`}>
    <span className="relative grid h-5 w-6 shrink-0 place-items-center">{icon}{colour ? <span className="absolute -bottom-0.5 left-0.5 h-1 w-5 rounded-sm border border-slate-400" style={{ background: colour === 'transparent' ? 'linear-gradient(135deg, #fff 42%, #dc2626 44%, #dc2626 56%, #fff 58%)' : colour }} /> : null}</span><span>{label}</span><ChevronDown size={10} className="absolute right-1 top-1" />
  </button>;
}

const popupPosition = (target: HTMLElement, width: number): MenuPosition => {
  const bounds = target.getBoundingClientRect();
  return { left: Math.max(8, Math.min(bounds.left, window.innerWidth - width - 8)), top: bounds.bottom + 6 };
};

export function ShapeGalleryDropdown({ groups, selectedKind, disabled, onChange }: { groups: readonly ShapeGroup[]; selectedKind: string; disabled?: boolean; onChange: (kind: string) => void }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ left: 8, top: 80 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popupRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  return <>
    <button ref={triggerRef} type="button" disabled={disabled} aria-label="Open Shapes and Text gallery" aria-expanded={open} onClick={() => { if (triggerRef.current) setPosition(popupPosition(triggerRef.current, 430)); setOpen((value) => !value); }} className="flex h-11 min-w-36 items-center gap-2 rounded-md px-2 text-left hover:bg-blue-50 disabled:opacity-40">
      <span className="grid h-8 w-10 place-items-center rounded border border-slate-200 bg-white p-1">{selectedKind ? <StudioShapeElement kind={selectedKind} fill="#ffffff" stroke="#1e3a5f" strokeWidth={2} /> : <Shapes size={18} />}</span>
      <span className="leading-3"><span className="block text-[10px] font-semibold text-slate-800">Shapes &amp; Text</span><span className="text-[9px] text-slate-500">Change shape</span></span><ChevronDown size={13} className="ml-auto" />
    </button>
    {open && typeof document !== 'undefined' ? createPortal(<div ref={popupRef} role="dialog" aria-label="Shapes and Text gallery" className="fixed z-[300] max-h-[70vh] w-[430px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 shadow-2xl" style={position}>
      <div className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-2"><Shapes size={16} className="text-blue-800"/><div><h3 className="text-xs font-bold text-slate-900">Shapes &amp; Text</h3><p className="text-[10px] text-slate-500">Select a shape while keeping its text and formatting.</p></div></div>
      {groups.map((group) => <section key={group.label} className="mb-3 last:mb-0"><h4 className="mb-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">{group.label}</h4><div className="grid grid-cols-8 gap-1">{group.shapes.map((kind) => <button key={kind} type="button" title={kind.replaceAll('-', ' ')} onClick={() => { onChange(kind); setOpen(false); }} className={`h-10 rounded border p-1 hover:border-blue-500 hover:bg-blue-50 ${selectedKind === kind ? 'border-blue-700 bg-blue-50 ring-1 ring-blue-300' : 'border-slate-200 bg-white'}`}><StudioShapeElement kind={kind} fill="#ffffff" stroke="#1e3a5f" strokeWidth={2} /></button>)}</div></section>)}
    </div>, document.body) : null}
  </>;
}

export function ShapeAppearanceControls({ elementId, fill, stroke, strokeWidth, strokeDash, effect, disabled, onChange }: { elementId: string; fill: string; stroke: string; strokeWidth: number; strokeDash: string; effect: string; disabled?: boolean; onChange: (changes: Record<string, unknown>) => void }) {
  const [menu, setMenu] = useState<'fill' | 'outline' | null>(null);
  const [position, setPosition] = useState<MenuPosition>({ left: 8, top: 80 });
  const popupRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const outlineRef = useRef<HTMLSpanElement>(null);
  const pendingColourRef = useRef<{ property: 'fill' | 'stroke'; value: string } | null>(null);
  const clearPreview = () => window.dispatchEvent(new CustomEvent('studio-preview-shape-style', { detail: { elementId, clear: true } }));
  const commitPendingColour = () => {
    const pending = pendingColourRef.current;
    if (!pending) return;
    pendingColourRef.current = null;
    clearPreview();
    onChange({ [pending.property]: pending.value, ...(pending.property === 'stroke' && strokeWidth <= 0 ? { strokeWidth: 2 } : {}) });
  };
  const previewColour = (property: 'fill' | 'stroke', value: string) => {
    pendingColourRef.current = { property, value };
    window.dispatchEvent(new CustomEvent('studio-preview-shape-style', { detail: { elementId, changes: { [property]: value, ...(property === 'stroke' && strokeWidth <= 0 ? { strokeWidth: 2 } : {}) } } }));
  };
  useEffect(() => {
    if (!menu) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (popupRef.current?.contains(target) || fillRef.current?.contains(target) || outlineRef.current?.contains(target)) return;
      commitPendingColour();
      setMenu(null);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menu]);
  const openMenu = (next: 'fill' | 'outline', target: HTMLButtonElement) => { commitPendingColour(); setPosition(popupPosition(target, 260)); setMenu((current) => current === next ? null : next); };
  const applyColour = (property: 'fill' | 'stroke', value: string) => { pendingColourRef.current = null; clearPreview(); onChange({ [property]: value, ...(property === 'stroke' && strokeWidth <= 0 ? { strokeWidth: 2 } : {}) }); };
  const swatches = (property: 'fill' | 'stroke') => <div className="grid grid-cols-8 gap-1">{palette.map((color) => <button key={color} type="button" title={color} onClick={() => applyColour(property, color)} className="h-6 w-6 rounded border border-slate-300" style={{ backgroundColor: color }} />)}</div>;
  return <>
    <div className="grid w-40 grid-cols-2 gap-0.5 px-1">
      <span ref={fillRef}><PopupButton icon={<PaintBucket size={15} />} label="Shape Fill" colour={fill} open={menu === 'fill'} disabled={disabled} onClick={(target) => openMenu('fill', target)} /></span>
      <span ref={outlineRef}><PopupButton icon={<PenLine size={15} />} label="Shape Outline" colour={stroke} open={menu === 'outline'} disabled={disabled} onClick={(target) => openMenu('outline', target)} /></span>
    </div>
    {menu && typeof document !== 'undefined' ? createPortal(<div ref={popupRef} className="fixed z-[300] w-[260px] rounded-lg border border-slate-200 bg-white p-3 shadow-2xl" style={position}>
      <h3 className="mb-2 text-xs font-bold text-slate-900">{menu === 'fill' ? 'Shape Fill' : 'Shape Outline'}</h3>
      {swatches(menu === 'fill' ? 'fill' : 'stroke')}
      <label className="mt-3 flex items-center justify-between text-[10px] font-semibold text-slate-600">Custom colour<input key={`${menu}-${menu === 'fill' ? fill : stroke}`} type="color" defaultValue={(menu === 'fill' ? fill : stroke) === 'transparent' ? '#000000' : menu === 'fill' ? fill : stroke} onInput={(event) => previewColour(menu === 'fill' ? 'fill' : 'stroke', event.currentTarget.value)} onChange={(event) => { pendingColourRef.current = { property: menu === 'fill' ? 'fill' : 'stroke', value: event.currentTarget.value }; }} onBlur={commitPendingColour} className="h-7 w-12 rounded border p-0.5" /></label>
      <button type="button" onClick={() => applyColour(menu === 'fill' ? 'fill' : 'stroke', 'transparent')} className="mt-2 w-full rounded px-2 py-1.5 text-left text-[10px] font-semibold hover:bg-slate-100">{menu === 'fill' ? 'No Fill' : 'No Outline'}</button>
      {menu === 'outline' ? <div className="mt-2 border-t border-slate-100 pt-2">
        <label className="flex items-center justify-between text-[10px] font-semibold text-slate-600">Width <span className="flex items-center rounded border border-slate-300 px-1"><input type="number" min="0" max="40" step="0.25" value={strokeWidth} onChange={(event) => onChange({ strokeWidth: Math.max(0, Number(event.target.value) || 0) })} className="h-7 w-16 border-0 px-1 text-right text-xs outline-none"/><span className="text-[9px] text-slate-400">px</span></span></label>
        <div className="mt-2 grid grid-cols-3 gap-1">{[['solid', 'Solid'], ['dash', 'Dashed'], ['dot', 'Dotted']].map(([value, label]) => <button key={value} type="button" onClick={() => onChange({ strokeDash: value })} className={`rounded px-2 py-1.5 text-[10px] ${strokeDash === value ? 'bg-blue-100 font-bold text-blue-900' : 'hover:bg-slate-100'}`}>{label}</button>)}</div>
        <label className="mt-2 flex items-center justify-between text-[10px] font-semibold text-slate-600">Shape effect<select aria-label="Shape effect" value={effect} onChange={(event) => onChange({ shapeEffect: event.target.value })} className="h-7 w-28 rounded border border-slate-300 px-1 text-[10px] font-normal"><option value="none">No effect</option><option value="shadow">Shadow</option><option value="glow">Glow</option><option value="soft-edges">Soft edges</option></select></label>
      </div> : null}
    </div>, document.body) : null}
  </>;
}

export function ShapeArrangeControls({ disabled, groupDisabled, rotation, selectionPaneActive, onForward, onBackward, onSelectionPane, onGroup, onAlign, onRotate }: { disabled?: boolean; groupDisabled?: boolean; rotation: number; selectionPaneActive?: boolean; onForward: () => void; onBackward: () => void; onSelectionPane: () => void; onGroup: () => void; onAlign: (value: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void; onRotate: (value: number) => void }) {
  return <div className="flex items-center gap-1 px-1">
    <div className="grid grid-cols-2 gap-1">
      <div className="grid content-center gap-0.5">
        <button type="button" disabled={disabled} onClick={onForward} className="flex h-6 items-center gap-1 rounded px-1.5 text-[9px] font-semibold hover:bg-blue-50 disabled:opacity-35"><BringToFront size={14}/><span>Forward</span></button>
        <button type="button" disabled={disabled} onClick={onBackward} className="flex h-6 items-center gap-1 rounded px-1.5 text-[9px] font-semibold hover:bg-blue-50 disabled:opacity-35"><SendToBack size={14}/><span>Backward</span></button>
      </div>
      <div className="grid content-center gap-0.5 border-l border-slate-200 pl-1">
        <button type="button" onClick={onSelectionPane} className={`flex h-6 items-center gap-1 rounded px-1.5 text-[9px] font-semibold hover:bg-blue-50 ${selectionPaneActive ? 'bg-blue-100 text-blue-900' : ''}`}><PanelRightOpen size={14}/><span>Selection</span></button>
        <button type="button" disabled={groupDisabled} onClick={onGroup} className="flex h-6 items-center gap-1 rounded px-1.5 text-[9px] font-semibold hover:bg-blue-50 disabled:opacity-35"><Boxes size={14}/><span>Group</span></button>
      </div>
    </div>
    <div className="flex items-center gap-1 border-l border-slate-200 pl-1">
      <div className="flex items-center gap-0.5"><button type="button" disabled={disabled} onClick={() => onRotate(rotation - 90)} className="flex h-6 items-center gap-1 rounded px-1.5 text-[9px] font-semibold hover:bg-blue-50 disabled:opacity-35"><RotateCcw size={14}/><span>Left</span></button><button type="button" disabled={disabled} onClick={() => onRotate(rotation + 90)} className="flex h-6 items-center gap-1 rounded px-1.5 text-[9px] font-semibold hover:bg-blue-50 disabled:opacity-35"><RotateCw size={14}/><span>Right</span></button></div>
      <div className="grid gap-0.5 border-l border-slate-200 pl-1"><label className="flex items-center gap-1 text-[9px] text-slate-500"><AlignCenterHorizontal size={13}/><select aria-label="Align shape" defaultValue="" disabled={disabled} onChange={(event) => { if (event.target.value) onAlign(event.target.value as Parameters<typeof onAlign>[0]); event.currentTarget.value = ''; }} className="h-6 w-20 rounded border-0 bg-slate-50 px-1 text-[10px] text-slate-700"><option value="">Align</option><option value="left">Left</option><option value="center">Centre</option><option value="right">Right</option><option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option></select></label><label className="flex h-7 items-center gap-1 rounded bg-slate-50 px-1.5 text-[9px] font-medium text-slate-600"><span>Rotation</span><span className="ml-auto flex h-5 items-center rounded border border-slate-300 bg-white px-1 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-200"><input aria-label="Rotation degrees" type="number" min="-360" max="360" step="1" value={Math.round(rotation)} disabled={disabled} onChange={(event) => onRotate(Number(event.target.value) || 0)} className="w-8 appearance-none border-0 bg-transparent p-0 text-right text-[10px] font-semibold text-slate-800 outline-none"/><span className="ml-0.5 text-[10px] text-slate-400">°</span></span></label></div>
    </div>
  </div>;
}

export function ShapeSizeControls({ width, height, disabled, onChange }: { width: number; height: number; disabled?: boolean; onChange: (size: { width?: number; height?: number }) => void }) {
  return <div className="grid gap-0.5 px-1 text-[9px] text-slate-500">
    <label className="flex h-6 items-center gap-1 rounded bg-slate-50 px-1.5">W <input aria-label="Shape width" type="number" min="0" value={Math.round(width)} disabled={disabled} onChange={(event) => onChange({ width: Number(event.target.value) })} className="w-14 border-0 bg-transparent text-right text-[10px] text-slate-800 outline-none"/></label>
    <label className="flex h-6 items-center gap-1 rounded bg-slate-50 px-1.5">H <input aria-label="Shape height" type="number" min="0" value={Math.round(height)} disabled={disabled} onChange={(event) => onChange({ height: Number(event.target.value) })} className="w-14 border-0 bg-transparent text-right text-[10px] text-slate-800 outline-none"/></label>
  </div>;
}
