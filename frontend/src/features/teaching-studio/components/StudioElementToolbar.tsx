import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Ban, Bold, ChevronDown, Circle, Copy, Crop, GripVertical, IndentDecrease, IndentIncrease, Italic, Link2, List, ListChevronsUpDown, ListOrdered, Sigma, Sparkles, Trash2, Underline, Unlink } from 'lucide-react';
import type { StudioElement } from '../types';
import { normalizeStudioHyperlink } from './studioHyperlinkModel';
import { dispatchStudioTextCommand } from './studioTextCommands';

interface Props {
  element: StudioElement | null;
  selectionFontSize?: number | 'mixed' | null;
  selectionSpacing?: {
    lineHeight: number | 'mixed';
    paragraphSpacingBefore: number | 'mixed';
    paragraphSpacingAfter: number | 'mixed';
  } | null;
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

export default function StudioElementToolbar({ element, selectionFontSize, selectionSpacing, onChange, onOpenMath, onOpenShapes, onOpenAnimations, onDuplicate, onRemove, onDragPointerDown, onDragPointerMove, onDragPointerEnd }: Props) {
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [linkMenuOpen, setLinkMenuOpen] = useState(false);
  const [cropMenuOpen, setCropMenuOpen] = useState(false);
  const [spacingMenuOpen, setSpacingMenuOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTooltip, setLinkTooltip] = useState('');
  const [linkError, setLinkError] = useState('');
  const [fontSizeDraft, setFontSizeDraft] = useState('18');
  const [fontSizeEditing, setFontSizeEditing] = useState(false);
  const [lineSpacingDraft, setLineSpacingDraft] = useState('1.35');
  const [paragraphBeforeDraft, setParagraphBeforeDraft] = useState('0');
  const [paragraphAfterDraft, setParagraphAfterDraft] = useState('0');
  const spacingButtonRef = useRef<HTMLButtonElement>(null);
  const spacingMenuRef = useRef<HTMLDivElement>(null);
  const textElement = Boolean(element && textTypes.includes(element.type));
  const content = element?.content ?? {};
  const resourceType = String(element?.resource?.usage?.resource_type || '');
  const croppable = ['image', 'animation', 'video'].includes(resourceType);
  const mediaTransform = content.mediaTransform && typeof content.mediaTransform === 'object'
    ? content.mediaTransform as Record<string, unknown>
    : {};
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
  const displayedFontSize = selectionFontSize === 'mixed'
    ? ''
    : String(selectionFontSize ?? (Number(content.fontSize) || 18));
  useEffect(() => {
    if (fontSizeEditing) return;
    setFontSizeDraft(displayedFontSize);
  }, [displayedFontSize, element?.id, fontSizeEditing]);
  const previewFontSize = (value: string) => {
    setFontSizeDraft(value);
    const size = Number(value);
    if (!Number.isFinite(size) || size < 10 || size > 160) return;
    sendTextCommand({ type: 'style', property: 'fontSize', value: `${size}px` });
  };
  const displayedLineSpacing = selectionSpacing?.lineHeight === 'mixed'
    ? ''
    : String(selectionSpacing?.lineHeight ?? (Number(content.lineHeight) || 1.35));
  const displayedParagraphBefore = selectionSpacing?.paragraphSpacingBefore === 'mixed'
    ? ''
    : String(selectionSpacing?.paragraphSpacingBefore ?? (Number(content.paragraphSpacingBefore) || 0));
  const displayedParagraphAfter = selectionSpacing?.paragraphSpacingAfter === 'mixed'
    ? ''
    : String(selectionSpacing?.paragraphSpacingAfter ?? (Number(content.paragraphSpacingAfter) || 0));
  useEffect(() => {
    if (spacingMenuOpen) return;
    setLineSpacingDraft(displayedLineSpacing);
    setParagraphBeforeDraft(displayedParagraphBefore);
    setParagraphAfterDraft(displayedParagraphAfter);
  }, [displayedLineSpacing, displayedParagraphAfter, displayedParagraphBefore, element?.id, spacingMenuOpen]);
  useEffect(() => {
    if (!spacingMenuOpen) return;
    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && (spacingButtonRef.current?.contains(target) || spacingMenuRef.current?.contains(target))) return;
      setSpacingMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointerDown);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointerDown);
  }, [spacingMenuOpen]);
  const previewLineSpacing = (value: string) => {
    setLineSpacingDraft(value);
    const spacing = Number(value);
    if (!value.trim() || !Number.isFinite(spacing) || spacing < 0.8 || spacing > 3) return;
    sendTextCommand({ type: 'block-style', property: 'lineHeight', value: String(spacing) });
  };
  const previewParagraphSpacing = (position: 'before' | 'after', value: string) => {
    if (position === 'before') setParagraphBeforeDraft(value);
    else setParagraphAfterDraft(value);
    const spacing = Number(value);
    if (!value.trim() || !Number.isFinite(spacing) || spacing < 0 || spacing > 120) return;
    sendTextCommand({ type: 'block-style', property: position === 'before' ? 'marginTop' : 'marginBottom', value: `${spacing}px` });
  };
  const openLinkMenu = () => {
    setLinkUrl(storedLink?.url ?? '');
    setLinkTooltip(storedLink?.tooltip ?? '');
    setLinkError('');
    setLinkMenuOpen((open) => !open);
    setListMenuOpen(false);
    setCropMenuOpen(false);
    setSpacingMenuOpen(false);
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
      <select disabled={!textElement} value={String(content.fontFamily || 'Arial')} onChange={(event) => sendTextCommand({ type: 'style', property: 'fontFamily', value: event.target.value })} aria-label="Font family" className="h-7 w-24 shrink-0 rounded border px-1 text-xs disabled:opacity-35"><option>Arial</option><option>Calibri</option><option>Georgia</option><option>Times New Roman</option><option>Verdana</option><option>Trebuchet MS</option></select>
      <input disabled={!textElement} type="number" min="10" max="160" value={fontSizeDraft} placeholder={selectionFontSize === 'mixed' ? 'Mixed' : undefined} onFocus={() => setFontSizeEditing(true)} onChange={(event) => previewFontSize(event.target.value)} onBlur={() => { setFontSizeEditing(false); const size = Number(fontSizeDraft); if (!Number.isFinite(size) || size < 10 || size > 160) setFontSizeDraft(displayedFontSize); }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} aria-label="Font size" className="h-7 w-12 shrink-0 rounded border px-1 text-xs disabled:opacity-35" />
      <button ref={spacingButtonRef} disabled={!textElement} type="button" title="Line and paragraph spacing" aria-label="Line and paragraph spacing" onClick={() => { setSpacingMenuOpen((open) => !open); setListMenuOpen(false); setLinkMenuOpen(false); setCropMenuOpen(false); }} className={button(spacingMenuOpen)}><ListChevronsUpDown size={14} /></button>
      <input disabled={!textElement} type="color" value={typeof content.color === 'string' ? content.color : '#25436b'} onChange={(event) => sendTextCommand({ type: 'style', property: 'color', value: event.target.value })} aria-label="Text colour" className="h-7 w-8 shrink-0 rounded border p-0.5 disabled:opacity-35" />
      <input type="color" value={typeof fillValue === 'string' && fillValue !== 'transparent' ? fillValue : '#ffffff'} onChange={(event) => onChange(shapeElement ? { fill: event.target.value } : { backgroundColor: event.target.value })} aria-label="Fill colour" title="Fill colour" className="h-7 w-8 shrink-0 rounded border p-0.5" />
      <button type="button" title="No fill" aria-label="No fill" onClick={() => onChange(shapeElement ? { fill: 'transparent' } : { backgroundColor: 'transparent' })} className={button(fillValue === 'transparent')}><Ban size={14} /></button>
      <input type="color" value={typeof borderValue === 'string' && borderValue !== 'transparent' ? borderValue : '#64748b'} onChange={(event) => onChange(shapeElement ? { stroke: event.target.value, strokeWidth: borderWidth || 1 } : { borderColor: event.target.value, borderWidth: borderWidth || 1 })} aria-label="Border colour" title="Border colour" className="h-7 w-8 shrink-0 rounded border p-0.5" />
      <select value={borderWidth} onChange={(event) => { const width = Number(event.target.value); onChange(shapeElement ? { strokeWidth: width } : { borderWidth: width }); }} aria-label="Border size" title="Border size" className="h-7 w-14 shrink-0 rounded border px-1 text-xs">
        {[0, 1, 2, 3, 4, 5, 6, 8].map((width) => <option key={width} value={width}>{width}px</option>)}
      </select>
      <button type="button" title="No border" aria-label="No border" onClick={() => onChange(shapeElement ? { stroke: 'transparent', strokeWidth: 0 } : { borderColor: 'transparent', borderWidth: 0 })} className={button(borderValue === 'transparent' || borderWidth === 0)}><Ban size={14} /></button>
      <button disabled={!textElement} type="button" title="Bold selected text" onClick={() => sendTextCommand({ type: 'format', command: 'bold' })} className={button(content.bold === true)}><Bold size={14} /></button>
      <button disabled={!textElement} type="button" title="Italicise selected text" onClick={() => sendTextCommand({ type: 'format', command: 'italic' })} className={button(content.italic === true)}><Italic size={14} /></button>
      <button disabled={!textElement} type="button" title="Underline selected text" onClick={() => sendTextCommand({ type: 'format', command: 'underline' })} className={button(content.underline === true)}><Underline size={14} /></button>
      <button disabled={!textElement} type="button" title="Align left" onClick={() => sendTextCommand({ type: 'block-style', property: 'textAlign', value: 'left' })} className={button(alignment === 'left')}><AlignLeft size={14} /></button>
      <button disabled={!textElement} type="button" title="Align centre" onClick={() => sendTextCommand({ type: 'block-style', property: 'textAlign', value: 'center' })} className={button(alignment === 'center')}><AlignCenter size={14} /></button>
      <button disabled={!textElement} type="button" title="Align right" onClick={() => sendTextCommand({ type: 'block-style', property: 'textAlign', value: 'right' })} className={button(alignment === 'right')}><AlignRight size={14} /></button>
      <button disabled={!textElement} type="button" title="Justify" onClick={() => sendTextCommand({ type: 'block-style', property: 'textAlign', value: 'justify' })} className={button(alignment === 'justify')}><AlignJustify size={14} /></button>
      <div className="flex shrink-0 overflow-hidden rounded border border-transparent">
        <button disabled={!textElement} type="button" title="Toggle bullet list at cursor" onClick={() => sendTextCommand({ type: 'bullet', style: 'disc', toggle: true })} className={button(content.list === true || hasRichList)}><List size={14} /></button>
        <button disabled={!textElement} type="button" title="Bullet and numbering styles" onClick={() => { setListMenuOpen((open) => !open); setLinkMenuOpen(false); setSpacingMenuOpen(false); }} className={button()}><ChevronDown size={12} /></button>
      </div>
      <button disabled={!textElement} type="button" title="Increase list level" onClick={() => sendTextCommand({ type: 'indent' })} className={button()}><IndentIncrease size={14} /></button>
      <button disabled={!textElement} type="button" title="Decrease list level" onClick={() => sendTextCommand({ type: 'outdent' })} className={button()}><IndentDecrease size={14} /></button>
      <span className="mx-0.5 h-5 w-px shrink-0 bg-slate-200" />
      <button type="button" title={storedLink ? 'Edit hyperlink' : 'Add hyperlink'} onClick={openLinkMenu} className={button(Boolean(storedLink))}><Link2 size={14} /></button>
      {storedLink ? <button type="button" title="Remove hyperlink" onClick={() => onChange({ hyperlink: null })} className={button()}><Unlink size={14} /></button> : null}
      <button type="button" title="Animations" onClick={onOpenAnimations} className={button()}><Sparkles size={14} /></button>
      {croppable ? <button type="button" title="Crop and fit media" aria-label="Crop and fit media" onClick={() => { setCropMenuOpen((open) => !open); setListMenuOpen(false); setLinkMenuOpen(false); setSpacingMenuOpen(false); }} className={button(cropMenuOpen)}><Crop size={14} /></button> : null}
      <button type="button" title="Math" onClick={onOpenMath} className={button()}><Sigma size={14} /></button>
      <button type="button" title="Shapes" onClick={onOpenShapes} className={button()}><Circle size={14} /></button>
      {onDuplicate ? <button type="button" title="Duplicate element" onClick={onDuplicate} className={button()}><Copy size={14} /></button> : null}
      {onRemove ? <button type="button" title="Remove element" onClick={onRemove} className="rounded p-1.5 text-red-700 hover:bg-red-50"><Trash2 size={14} /></button> : null}
    </div>

    {spacingMenuOpen && textElement ? <div ref={spacingMenuRef} className="absolute left-20 top-full z-[80] mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"><div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-slate-500"><ListChevronsUpDown size={14} />Spacing</div><p className="mb-2 text-[10px] leading-4 text-slate-500">Applies to the selected paragraph, or the complete text box when no text is selected.</p><div className="grid grid-cols-4 gap-1">{[1, 1.15, 1.5, 2].map((value) => <button key={value} type="button" onPointerDown={(event) => event.preventDefault()} onClick={() => previewLineSpacing(String(value))} className={`rounded-lg border px-2 py-1.5 text-xs font-semibold ${lineSpacingDraft === String(value) ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 hover:bg-slate-50'}`}>{value}</button>)}</div><label className="mt-3 block text-[11px] font-semibold text-slate-600">Line spacing<input type="number" min="0.8" max="3" step="0.05" value={lineSpacingDraft} placeholder={selectionSpacing?.lineHeight === 'mixed' ? 'Mixed' : undefined} onChange={(event) => previewLineSpacing(event.target.value)} className="mt-1 h-8 w-full rounded-lg border border-slate-300 px-2 font-normal" /></label><div className="mt-3 grid grid-cols-2 gap-2"><label className="text-[11px] font-semibold text-slate-600">Before paragraph<input type="number" min="0" max="120" step="1" value={paragraphBeforeDraft} placeholder={selectionSpacing?.paragraphSpacingBefore === 'mixed' ? 'Mixed' : undefined} onChange={(event) => previewParagraphSpacing('before', event.target.value)} className="mt-1 h-8 w-full rounded-lg border border-slate-300 px-2 font-normal" /></label><label className="text-[11px] font-semibold text-slate-600">After paragraph<input type="number" min="0" max="120" step="1" value={paragraphAfterDraft} placeholder={selectionSpacing?.paragraphSpacingAfter === 'mixed' ? 'Mixed' : undefined} onChange={(event) => previewParagraphSpacing('after', event.target.value)} className="mt-1 h-8 w-full rounded-lg border border-slate-300 px-2 font-normal" /></label></div></div> : null}

    {listMenuOpen ? <div className="absolute right-0 top-full z-[80] mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-500"><List size={14} />Bullets</div><div className="grid grid-cols-4 gap-2">{([{ style: 'disc', glyph: '●' }, { style: 'circle', glyph: '○' }, { style: 'square', glyph: '■' }, { style: '"◆  "', glyph: '◆' }, { style: '"➤  "', glyph: '➤' }, { style: '"✓  "', glyph: '✓' }, { style: '"❖  "', glyph: '❖' }] as const).map((item) => <button key={item.style} type="button" onPointerDown={(event) => event.preventDefault()} onClick={() => { sendTextCommand({ type: 'bullet', style: item.style }); setListMenuOpen(false); }} className="rounded-lg border border-slate-200 p-2 text-lg hover:bg-blue-50">{item.glyph}</button>)}</div><div className="mb-2 mt-3 flex items-center gap-2 text-xs font-bold uppercase text-slate-500"><ListOrdered size={14} />Numbering</div><div className="grid grid-cols-3 gap-2">{([{ style: 'decimal', glyph: '1.' }, { style: 'decimal-leading-zero', glyph: '01.' }, { style: 'lower-alpha', glyph: 'a.' }, { style: 'upper-alpha', glyph: 'A.' }, { style: 'lower-roman', glyph: 'i.' }, { style: 'upper-roman', glyph: 'I.' }] as const).map((item) => <button key={item.style} type="button" onPointerDown={(event) => event.preventDefault()} onClick={() => { sendTextCommand({ type: 'number', style: item.style }); setListMenuOpen(false); }} className="rounded-lg border border-slate-200 p-2 text-sm font-semibold hover:bg-blue-50">{item.glyph}</button>)}</div><p className="mt-3 text-[10px] leading-4 text-slate-500">Double-click text, select every required line, then choose one style. The complete selection becomes one list.</p></div> : null}

    {cropMenuOpen && croppable ? <div className="absolute right-0 top-full z-[80] mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl"><div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900"><Crop size={16} />Crop and fit</div><label className="block text-xs font-semibold text-slate-600">Fit mode<select value={String(mediaTransform.fit || 'contain')} onChange={(event) => onChange({ mediaTransform: { ...mediaTransform, fit: event.target.value } })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"><option value="contain">Fit — show complete resource</option><option value="cover">Fill — crop to component</option></select></label><label className="mt-3 block text-xs font-semibold text-slate-600">Zoom · {Math.round((Number(mediaTransform.scale) || 1) * 100)}%<input type="range" min="1" max="3" step="0.05" value={Number(mediaTransform.scale) || 1} onChange={(event) => onChange({ mediaTransform: { ...mediaTransform, scale: Number(event.target.value) } })} className="mt-1 w-full accent-blue-900" /></label><label className="mt-2 block text-xs font-semibold text-slate-600">Horizontal position<input type="range" min="-100" max="100" value={Number(mediaTransform.x) || 0} onChange={(event) => onChange({ mediaTransform: { ...mediaTransform, x: Number(event.target.value) } })} className="mt-1 w-full accent-blue-900" /></label><label className="mt-2 block text-xs font-semibold text-slate-600">Vertical position<input type="range" min="-100" max="100" value={Number(mediaTransform.y) || 0} onChange={(event) => onChange({ mediaTransform: { ...mediaTransform, y: Number(event.target.value) } })} className="mt-1 w-full accent-blue-900" /></label><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => onChange({ mediaTransform: { fit: 'contain', scale: 1, x: 0, y: 0 } })} className="rounded-lg border px-3 py-2 text-xs font-semibold">Reset</button><button type="button" onClick={() => setCropMenuOpen(false)} className="rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white">Done</button></div></div> : null}

    {linkMenuOpen ? <div className="absolute right-0 top-full z-[80] mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"><h3 className="text-sm font-semibold text-slate-900">Element hyperlink</h3><p className="mt-1 text-xs text-slate-500">The complete text, shape, image, button or block becomes clickable in Preview and Teacher Player.</p><label className="mt-3 block text-xs font-semibold text-slate-600">Destination URL<input autoFocus value={linkUrl} onChange={(event) => { setLinkUrl(event.target.value); setLinkError(''); }} placeholder="https://example.com" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label><label className="mt-2 block text-xs font-semibold text-slate-600">Hover description<input value={linkTooltip} onChange={(event) => setLinkTooltip(event.target.value)} placeholder="Open supporting resource" maxLength={240} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>{linkError ? <p className="mt-2 text-xs text-red-700">{linkError}</p> : null}<div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setLinkMenuOpen(false)} className="rounded-lg border px-3 py-2 text-xs font-semibold">Cancel</button><button type="button" onClick={applyLink} className="rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white">Apply link</button></div></div> : null}
  </div>;
}
