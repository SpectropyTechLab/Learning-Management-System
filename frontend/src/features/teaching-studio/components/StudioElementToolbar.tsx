import { useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Ban, Bold, ChevronDown, Circle, Copy, GripVertical, IndentDecrease, IndentIncrease, Italic, Link2, List, ListOrdered, Sigma, Sparkles, Trash2, Underline, Unlink } from 'lucide-react';
import type { StudioElement } from '../types';
import { normalizeStudioHyperlink } from './studioHyperlinkModel';
import { dispatchStudioTextCommand } from './studioTextCommands';

interface Props {
  element: StudioElement | null;
  onChange: (changes: Record<string, unknown>) => void;
  onOpenMath: () => void;
  onOpenShapes: () => void;
  onOpenAnimations: () => void;
  onDuplicate?: () => void;
  onRemove?: () => void;
  onDragPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onDragPointerMove?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onDragPointerEnd?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}

const textTypes = ['title', 'text', 'question', 'response', 'steps', 'workspace', 'footer', 'options', 'data'];

export default function StudioElementToolbar({ element, onChange, onOpenMath, onOpenShapes, onOpenAnimations, onDuplicate, onRemove, onDragPointerDown, onDragPointerMove, onDragPointerEnd }: Props) {
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [linkMenuOpen, setLinkMenuOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTooltip, setLinkTooltip] = useState('');
  const [linkError, setLinkError] = useState('');
  const textElement = Boolean(element && textTypes.includes(element.type));
  const content = element?.content ?? {};
  const shapeElement = element?.type === 'shape';
  const fillValue = shapeElement ? content.fill : content.backgroundColor;
  const borderValue = shapeElement ? content.stroke : content.borderColor;
  const borderWidthValue = Number(shapeElement ? content.strokeWidth : content.borderWidth);
  const borderWidth = Number.isFinite(borderWidthValue) ? Math.max(0, Math.min(8, borderWidthValue)) : 1;
  const alignment = String(content.alignment || 'left');
  const hasRichList = typeof content.richTextHtml === 'string' && /<(?:ul|ol)\b/i.test(content.richTextHtml);
  const storedLink = normalizeStudioHyperlink(content.hyperlink);
  const button = (active = false) => `rounded p-1.5 ${active ? 'bg-blue-100 text-blue-900' : 'hover:bg-slate-100'} disabled:cursor-not-allowed disabled:opacity-35`;
  const sendTextCommand = (command: Parameters<typeof dispatchStudioTextCommand>[1]) => {
    if (!element || !textElement) return;
    dispatchStudioTextCommand(element.id, command);
  };
  const openLinkMenu = () => {
    setLinkUrl(storedLink?.url ?? '');
    setLinkTooltip(storedLink?.tooltip ?? '');
    setLinkError('');
    setLinkMenuOpen((open) => !open);
    setListMenuOpen(false);
  };
  const applyLink = () => {
    const normalized = normalizeStudioHyperlink({ url: linkUrl, tooltip: linkTooltip, target: '_blank' });
    if (!normalized) {
      setLinkError('Enter a valid web, email or telephone URL.');
      return;
    }
    onChange({ hyperlink: normalized });
    setLinkMenuOpen(false);
  };

  return <div data-studio-element-toolbar className="relative flex min-w-0 flex-1 items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm" aria-label="Selected element formatting toolbar">
    {onDragPointerDown ? <button type="button" data-studio-toolbar-drag-handle onPointerDown={onDragPointerDown} onPointerMove={onDragPointerMove} onPointerUp={onDragPointerEnd} onPointerCancel={onDragPointerEnd} className="flex h-7 w-6 shrink-0 touch-none select-none cursor-grab items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing" title="Drag formatting toolbar" aria-label="Drag formatting toolbar"><GripVertical className="pointer-events-none" size={15} /></button> : null}
    <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
      <select disabled={!textElement} value={String(content.fontFamily || 'Arial')} onChange={(event) => onChange({ fontFamily: event.target.value })} aria-label="Font family" className="h-7 w-24 shrink-0 rounded border px-1 text-xs disabled:opacity-35"><option>Arial</option><option>Calibri</option><option>Georgia</option><option>Times New Roman</option><option>Verdana</option><option>Trebuchet MS</option></select>
      <input disabled={!textElement} type="number" min="10" max="160" value={Number(content.fontSize) || 18} onChange={(event) => onChange({ fontSize: Number(event.target.value) })} aria-label="Font size" className="h-7 w-12 shrink-0 rounded border px-1 text-xs disabled:opacity-35" />
      <input disabled={!textElement} type="color" value={typeof content.color === 'string' ? content.color : '#25436b'} onChange={(event) => onChange({ color: event.target.value })} aria-label="Text colour" className="h-7 w-8 shrink-0 rounded border p-0.5 disabled:opacity-35" />
      <input type="color" value={typeof fillValue === 'string' && fillValue !== 'transparent' ? fillValue : '#ffffff'} onChange={(event) => onChange(shapeElement ? { fill: event.target.value } : { backgroundColor: event.target.value })} aria-label="Fill colour" title="Fill colour" className="h-7 w-8 shrink-0 rounded border p-0.5" />
      <button type="button" title="No fill" aria-label="No fill" onClick={() => onChange(shapeElement ? { fill: 'transparent' } : { backgroundColor: 'transparent' })} className={button(fillValue === 'transparent')}><Ban size={14} /></button>
      <input type="color" value={typeof borderValue === 'string' && borderValue !== 'transparent' ? borderValue : '#64748b'} onChange={(event) => onChange(shapeElement ? { stroke: event.target.value, strokeWidth: borderWidth || 1 } : { borderColor: event.target.value, borderWidth: borderWidth || 1 })} aria-label="Border colour" title="Border colour" className="h-7 w-8 shrink-0 rounded border p-0.5" />
      <select value={borderWidth} onChange={(event) => { const width = Number(event.target.value); onChange(shapeElement ? { strokeWidth: width } : { borderWidth: width }); }} aria-label="Border size" title="Border size" className="h-7 w-14 shrink-0 rounded border px-1 text-xs">
        {[0, 1, 2, 3, 4, 5, 6, 8].map((width) => <option key={width} value={width}>{width}px</option>)}
      </select>
      <button type="button" title="No border" aria-label="No border" onClick={() => onChange(shapeElement ? { stroke: 'transparent', strokeWidth: 0 } : { borderColor: 'transparent', borderWidth: 0 })} className={button(borderValue === 'transparent' || borderWidth === 0)}><Ban size={14} /></button>
      <button disabled={!textElement} type="button" title="Bold" onClick={() => onChange({ bold: content.bold !== true })} className={button(content.bold === true)}><Bold size={14} /></button>
      <button disabled={!textElement} type="button" title="Italic" onClick={() => onChange({ italic: content.italic !== true })} className={button(content.italic === true)}><Italic size={14} /></button>
      <button disabled={!textElement} type="button" title="Underline" onClick={() => onChange({ underline: content.underline !== true })} className={button(content.underline === true)}><Underline size={14} /></button>
      <button disabled={!textElement} type="button" title="Align left" onClick={() => onChange({ alignment: 'left' })} className={button(alignment === 'left')}><AlignLeft size={14} /></button>
      <button disabled={!textElement} type="button" title="Align centre" onClick={() => onChange({ alignment: 'center' })} className={button(alignment === 'center')}><AlignCenter size={14} /></button>
      <button disabled={!textElement} type="button" title="Align right" onClick={() => onChange({ alignment: 'right' })} className={button(alignment === 'right')}><AlignRight size={14} /></button>
      <button disabled={!textElement} type="button" title="Justify" onClick={() => onChange({ alignment: 'justify' })} className={button(alignment === 'justify')}><AlignJustify size={14} /></button>
      <div className="flex shrink-0 overflow-hidden rounded border border-transparent">
        <button disabled={!textElement} type="button" title="Toggle bullet list at cursor" onClick={() => sendTextCommand({ type: 'bullet', style: 'disc', toggle: true })} className={button(content.list === true || hasRichList)}><List size={14} /></button>
        <button disabled={!textElement} type="button" title="Bullet and numbering styles" onClick={() => { setListMenuOpen((open) => !open); setLinkMenuOpen(false); }} className={button()}><ChevronDown size={12} /></button>
      </div>
      <button disabled={!textElement} type="button" title="Increase list level" onClick={() => sendTextCommand({ type: 'indent' })} className={button()}><IndentIncrease size={14} /></button>
      <button disabled={!textElement} type="button" title="Decrease list level" onClick={() => sendTextCommand({ type: 'outdent' })} className={button()}><IndentDecrease size={14} /></button>
      <span className="mx-0.5 h-5 w-px shrink-0 bg-slate-200" />
      <button type="button" title={storedLink ? 'Edit hyperlink' : 'Add hyperlink'} onClick={openLinkMenu} className={button(Boolean(storedLink))}><Link2 size={14} /></button>
      {storedLink ? <button type="button" title="Remove hyperlink" onClick={() => onChange({ hyperlink: null })} className={button()}><Unlink size={14} /></button> : null}
      <button type="button" title="Animations" onClick={onOpenAnimations} className={button()}><Sparkles size={14} /></button>
      <button type="button" title="Math" onClick={onOpenMath} className={button()}><Sigma size={14} /></button>
      <button type="button" title="Shapes" onClick={onOpenShapes} className={button()}><Circle size={14} /></button>
      {onDuplicate ? <button type="button" title="Duplicate element" onClick={onDuplicate} className={button()}><Copy size={14} /></button> : null}
      {onRemove ? <button type="button" title="Remove element" onClick={onRemove} className="rounded p-1.5 text-red-700 hover:bg-red-50"><Trash2 size={14} /></button> : null}
    </div>

    {listMenuOpen ? <div className="absolute right-0 top-full z-[80] mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-500"><List size={14} />Bullets</div><div className="grid grid-cols-4 gap-2">{([{ style: 'disc', glyph: '●' }, { style: 'circle', glyph: '○' }, { style: 'square', glyph: '■' }, { style: '"◆  "', glyph: '◆' }, { style: '"➤  "', glyph: '➤' }, { style: '"✓  "', glyph: '✓' }, { style: '"❖  "', glyph: '❖' }] as const).map((item) => <button key={item.style} type="button" onPointerDown={(event) => event.preventDefault()} onClick={() => { sendTextCommand({ type: 'bullet', style: item.style }); setListMenuOpen(false); }} className="rounded-lg border border-slate-200 p-2 text-lg hover:bg-blue-50">{item.glyph}</button>)}</div><div className="mb-2 mt-3 flex items-center gap-2 text-xs font-bold uppercase text-slate-500"><ListOrdered size={14} />Numbering</div><div className="grid grid-cols-3 gap-2">{([{ style: 'decimal', glyph: '1.' }, { style: 'decimal-leading-zero', glyph: '01.' }, { style: 'lower-alpha', glyph: 'a.' }, { style: 'upper-alpha', glyph: 'A.' }, { style: 'lower-roman', glyph: 'i.' }, { style: 'upper-roman', glyph: 'I.' }] as const).map((item) => <button key={item.style} type="button" onPointerDown={(event) => event.preventDefault()} onClick={() => { sendTextCommand({ type: 'number', style: item.style }); setListMenuOpen(false); }} className="rounded-lg border border-slate-200 p-2 text-sm font-semibold hover:bg-blue-50">{item.glyph}</button>)}</div><p className="mt-3 text-[10px] leading-4 text-slate-500">Double-click text, select every required line, then choose one style. The complete selection becomes one list.</p></div> : null}

    {linkMenuOpen ? <div className="absolute right-0 top-full z-[80] mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"><h3 className="text-sm font-semibold text-slate-900">Element hyperlink</h3><p className="mt-1 text-xs text-slate-500">The complete text, shape, image, button or block becomes clickable in Preview and Teacher Player.</p><label className="mt-3 block text-xs font-semibold text-slate-600">Destination URL<input autoFocus value={linkUrl} onChange={(event) => { setLinkUrl(event.target.value); setLinkError(''); }} placeholder="https://example.com" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label><label className="mt-2 block text-xs font-semibold text-slate-600">Hover description<input value={linkTooltip} onChange={(event) => setLinkTooltip(event.target.value)} placeholder="Open supporting resource" maxLength={240} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>{linkError ? <p className="mt-2 text-xs text-red-700">{linkError}</p> : null}<div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setLinkMenuOpen(false)} className="rounded-lg border px-3 py-2 text-xs font-semibold">Cancel</button><button type="button" onClick={applyLink} className="rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white">Apply link</button></div></div> : null}
  </div>;
}
