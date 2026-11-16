import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, ChevronDown, IndentDecrease, IndentIncrease, Italic, List, ListChevronsUpDown, ListOrdered, Underline } from 'lucide-react';
import type { StudioElement } from '../types';
import { dispatchStudioTextCommand } from './studioTextCommands';

interface Props {
  element: StudioElement | null;
  selectionFontSize?: number | 'mixed' | null;
  selectionSpacing?: { lineHeight: number | 'mixed'; paragraphSpacingBefore: number | 'mixed'; paragraphSpacingAfter: number | 'mixed' } | null;
}

const textTypes = new Set(['title', 'text', 'question', 'response', 'steps', 'workspace', 'footer', 'options', 'data']);

export default function StudioElementToolbar({ element, selectionFontSize, selectionSpacing }: Props) {
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [spacingMenuOpen, setSpacingMenuOpen] = useState(false);
  const [fontSizeDraft, setFontSizeDraft] = useState('18');
  const [fontSizeEditing, setFontSizeEditing] = useState(false);
  const [lineSpacingDraft, setLineSpacingDraft] = useState('1.35');
  const [paragraphBeforeDraft, setParagraphBeforeDraft] = useState('0');
  const [paragraphAfterDraft, setParagraphAfterDraft] = useState('0');
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });
  const listButtonRef = useRef<HTMLButtonElement>(null);
  const spacingButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const textElement = Boolean(element && textTypes.has(element.type));
  const content = element?.content ?? {};
  const alignment = String(content.alignment || 'left');
  const hasRichList = typeof content.richTextHtml === 'string' && /<(?:ul|ol)\b/i.test(content.richTextHtml);
  const button = (active = false) => `grid h-7 w-7 shrink-0 place-items-center rounded ${active ? 'bg-blue-100 text-blue-900' : 'text-slate-700 hover:bg-slate-100'} disabled:cursor-not-allowed disabled:opacity-30`;
  const sendTextCommand = (command: Parameters<typeof dispatchStudioTextCommand>[1]) => {
    if (element && textElement) dispatchStudioTextCommand(element.id, command);
  };
  const displayedFontSize = selectionFontSize === 'mixed' ? '' : String(selectionFontSize ?? (Number(content.fontSize) || 18));
  const displayedLineSpacing = selectionSpacing?.lineHeight === 'mixed' ? '' : String(selectionSpacing?.lineHeight ?? (Number(content.lineHeight) || 1.35));
  const displayedParagraphBefore = selectionSpacing?.paragraphSpacingBefore === 'mixed' ? '' : String(selectionSpacing?.paragraphSpacingBefore ?? (Number(content.paragraphSpacingBefore) || 0));
  const displayedParagraphAfter = selectionSpacing?.paragraphSpacingAfter === 'mixed' ? '' : String(selectionSpacing?.paragraphSpacingAfter ?? (Number(content.paragraphSpacingAfter) || 0));

  useEffect(() => { if (!fontSizeEditing) setFontSizeDraft(displayedFontSize); }, [displayedFontSize, element?.id, fontSizeEditing]);
  useEffect(() => {
    if (spacingMenuOpen) return;
    setLineSpacingDraft(displayedLineSpacing);
    setParagraphBeforeDraft(displayedParagraphBefore);
    setParagraphAfterDraft(displayedParagraphAfter);
  }, [displayedLineSpacing, displayedParagraphAfter, displayedParagraphBefore, element?.id, spacingMenuOpen]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (listButtonRef.current?.contains(target) || spacingButtonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setListMenuOpen(false);
      setSpacingMenuOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const positionMenu = (target: HTMLButtonElement | null) => {
    const rect = target?.getBoundingClientRect();
    if (rect) setMenuPosition({ left: Math.min(rect.left, window.innerWidth - 300), top: rect.bottom + 8 });
  };
  const previewFontSize = (value: string) => {
    setFontSizeDraft(value);
    const size = Number(value);
    if (Number.isFinite(size) && size >= 10 && size <= 160) sendTextCommand({ type: 'style', property: 'fontSize', value: `${size}px` });
  };
  const previewLineSpacing = (value: string) => {
    setLineSpacingDraft(value);
    const spacing = Number(value);
    if (value.trim() && Number.isFinite(spacing) && spacing >= 0.8 && spacing <= 3) sendTextCommand({ type: 'block-style', property: 'lineHeight', value: String(spacing) });
  };
  const previewParagraphSpacing = (position: 'before' | 'after', value: string) => {
    if (position === 'before') setParagraphBeforeDraft(value); else setParagraphAfterDraft(value);
    const spacing = Number(value);
    if (value.trim() && Number.isFinite(spacing) && spacing >= 0 && spacing <= 120) sendTextCommand({ type: 'block-style', property: position === 'before' ? 'marginTop' : 'marginBottom', value: `${spacing}px` });
  };
  const ribbonGroup = (label: string, controls: ReactNode) => <section className="flex shrink-0 flex-col justify-between border-r border-slate-200 px-1.5 last:border-r-0" aria-label={`${label} controls`}><div className="flex min-h-8 items-center gap-0.5">{controls}</div><span className="mt-0.5 text-center text-[9px] font-semibold text-slate-500">{label}</span></section>;

  return <div data-studio-element-toolbar className="relative flex shrink-0 items-stretch" aria-label="Home text controls">
    {ribbonGroup('Font', <>
      <select disabled={!textElement} value={String(content.fontFamily || 'Arial')} onChange={(event) => sendTextCommand({ type: 'style', property: 'fontFamily', value: event.target.value })} aria-label="Font family" className="h-7 w-20 shrink-0 rounded border px-1 text-[10px] disabled:opacity-30"><option>Arial</option><option>Calibri</option><option>Georgia</option><option>Times New Roman</option><option>Verdana</option><option>Trebuchet MS</option></select>
      <input disabled={!textElement} type="number" min="10" max="160" value={fontSizeDraft} placeholder={selectionFontSize === 'mixed' ? 'Mixed' : undefined} onFocus={() => setFontSizeEditing(true)} onChange={(event) => previewFontSize(event.target.value)} onBlur={() => { setFontSizeEditing(false); const size = Number(fontSizeDraft); if (!Number.isFinite(size) || size < 10 || size > 160) setFontSizeDraft(displayedFontSize); }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} aria-label="Font size" className="h-7 w-11 shrink-0 rounded border px-1 text-[10px] disabled:opacity-30" />
      <label className="relative grid h-7 w-7 shrink-0 place-items-center rounded border" title="Text colour"><span className="h-4 w-4 rounded-sm" style={{ backgroundColor: typeof content.color === 'string' ? content.color : '#25436b' }} /><input disabled={!textElement} type="color" value={typeof content.color === 'string' ? content.color : '#25436b'} onChange={(event) => sendTextCommand({ type: 'style', property: 'color', value: event.target.value })} aria-label="Text colour" className="absolute inset-0 opacity-0 disabled:cursor-not-allowed" /></label>
      <button disabled={!textElement} type="button" title="Bold selected text" onClick={() => sendTextCommand({ type: 'format', command: 'bold' })} className={button(content.bold === true)}><Bold size={14} /></button>
      <button disabled={!textElement} type="button" title="Italicise selected text" onClick={() => sendTextCommand({ type: 'format', command: 'italic' })} className={button(content.italic === true)}><Italic size={14} /></button>
      <button disabled={!textElement} type="button" title="Underline selected text" onClick={() => sendTextCommand({ type: 'format', command: 'underline' })} className={button(content.underline === true)}><Underline size={14} /></button>
    </>)}
    {ribbonGroup('Paragraph', <>
      <button ref={spacingButtonRef} disabled={!textElement} type="button" title="Line and paragraph spacing" onClick={() => { positionMenu(spacingButtonRef.current); setSpacingMenuOpen((open) => !open); setListMenuOpen(false); }} className={button(spacingMenuOpen)}><ListChevronsUpDown size={14} /></button>
      <button disabled={!textElement} type="button" title="Align left" onClick={() => sendTextCommand({ type: 'block-style', property: 'textAlign', value: 'left' })} className={button(alignment === 'left')}><AlignLeft size={14} /></button>
      <button disabled={!textElement} type="button" title="Align centre" onClick={() => sendTextCommand({ type: 'block-style', property: 'textAlign', value: 'center' })} className={button(alignment === 'center')}><AlignCenter size={14} /></button>
      <button disabled={!textElement} type="button" title="Align right" onClick={() => sendTextCommand({ type: 'block-style', property: 'textAlign', value: 'right' })} className={button(alignment === 'right')}><AlignRight size={14} /></button>
      <button disabled={!textElement} type="button" title="Justify" onClick={() => sendTextCommand({ type: 'block-style', property: 'textAlign', value: 'justify' })} className={button(alignment === 'justify')}><AlignJustify size={14} /></button>
      <button disabled={!textElement} type="button" title="Toggle bullet list" onClick={() => sendTextCommand({ type: 'bullet', style: 'disc', toggle: true })} className={button(content.list === true || hasRichList)}><List size={14} /></button>
      <button ref={listButtonRef} disabled={!textElement} type="button" title="Bullet and numbering styles" onClick={() => { positionMenu(listButtonRef.current); setListMenuOpen((open) => !open); setSpacingMenuOpen(false); }} className={button(listMenuOpen)}><ChevronDown size={12} /></button>
      <button disabled={!textElement} type="button" title="Increase list level" onClick={() => sendTextCommand({ type: 'indent' })} className={button()}><IndentIncrease size={14} /></button>
      <button disabled={!textElement} type="button" title="Decrease list level" onClick={() => sendTextCommand({ type: 'outdent' })} className={button()}><IndentDecrease size={14} /></button>
    </>)}
    {spacingMenuOpen && typeof document !== 'undefined' ? createPortal(<div ref={menuRef} className="fixed z-[260] w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl" style={menuPosition}><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-500"><ListChevronsUpDown size={14} />Spacing</div><p className="mb-2 text-[10px] text-slate-500">Applies to the selected paragraph, or the complete text box when no text is selected.</p><div className="grid grid-cols-4 gap-1">{[1, 1.15, 1.5, 2].map((value) => <button key={value} type="button" onPointerDown={(event) => event.preventDefault()} onClick={() => previewLineSpacing(String(value))} className={`rounded-lg border px-2 py-1.5 text-xs font-semibold ${lineSpacingDraft === String(value) ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 hover:bg-slate-50'}`}>{value}</button>)}</div><label className="mt-3 block text-[11px] font-semibold text-slate-600">Line spacing<input type="number" min="0.8" max="3" step="0.05" value={lineSpacingDraft} onChange={(event) => previewLineSpacing(event.target.value)} className="mt-1 h-8 w-full rounded-lg border px-2 font-normal" /></label><div className="mt-3 grid grid-cols-2 gap-2"><label className="text-[11px] font-semibold text-slate-600">Before paragraph<input type="number" min="0" max="120" value={paragraphBeforeDraft} onChange={(event) => previewParagraphSpacing('before', event.target.value)} className="mt-1 h-8 w-full rounded-lg border px-2 font-normal" /></label><label className="text-[11px] font-semibold text-slate-600">After paragraph<input type="number" min="0" max="120" value={paragraphAfterDraft} onChange={(event) => previewParagraphSpacing('after', event.target.value)} className="mt-1 h-8 w-full rounded-lg border px-2 font-normal" /></label></div></div>, document.body) : null}
    {listMenuOpen && typeof document !== 'undefined' ? createPortal(<div ref={menuRef} className="fixed z-[260] w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl" style={menuPosition}><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-500"><List size={14} />Bullets</div><div className="grid grid-cols-4 gap-2">{([{ style: 'disc', glyph: '●' }, { style: 'circle', glyph: '○' }, { style: 'square', glyph: '■' }, { style: '"◆  "', glyph: '◆' }] as const).map((item) => <button key={item.style} type="button" onPointerDown={(event) => event.preventDefault()} onClick={() => { sendTextCommand({ type: 'bullet', style: item.style }); setListMenuOpen(false); }} className="rounded-lg border p-2 text-lg hover:bg-blue-50">{item.glyph}</button>)}</div><div className="mb-2 mt-3 flex items-center gap-2 text-xs font-bold uppercase text-slate-500"><ListOrdered size={14} />Numbering</div><div className="grid grid-cols-3 gap-2">{([{ style: 'decimal', glyph: '1.' }, { style: 'lower-alpha', glyph: 'a.' }, { style: 'upper-alpha', glyph: 'A.' }, { style: 'lower-roman', glyph: 'i.' }, { style: 'upper-roman', glyph: 'I.' }] as const).map((item) => <button key={item.style} type="button" onPointerDown={(event) => event.preventDefault()} onClick={() => { sendTextCommand({ type: 'number', style: item.style }); setListMenuOpen(false); }} className="rounded-lg border p-2 text-sm font-semibold hover:bg-blue-50">{item.glyph}</button>)}</div></div>, document.body) : null}
  </div>;
}
