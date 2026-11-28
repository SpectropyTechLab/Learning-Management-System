import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, ChevronDown, Crop, IndentDecrease, IndentIncrease, Italic, List, ListChevronsUpDown, ListOrdered, Underline } from 'lucide-react';
import type { StudioElement } from '../types';
import { normalizeStudioHyperlink } from './studioHyperlinkModel';
import { dispatchStudioTextCommand, type StudioTextCommand } from './studioTextCommands';
import { filterStudioFonts, STUDIO_FONT_CATEGORIES, studioFontCssFamily } from './studioFonts';

interface Props {
  element: StudioElement | null;
  selectionFontSize?: number | 'mixed' | null;
  selectionFontFamily?: string | 'mixed' | null;
  selectionSpacing?: {
    lineHeight: number | 'mixed';
    paragraphSpacingBefore: number | 'mixed';
    paragraphSpacingAfter: number | 'mixed';
  } | null;
  selectionCount?: number;
  onBatchTextCommand?: (command: StudioTextCommand) => void;
  onChange: (changes: Record<string, unknown>) => void;
}

const textTypes = ['title', 'text', 'question', 'response', 'steps', 'workspace', 'footer', 'options', 'data', 'shape'];

export default function StudioElementToolbar({ element, selectionFontSize, selectionFontFamily, selectionSpacing, selectionCount = 1, onBatchTextCommand, onChange }: Props) {
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [spacingMenuOpen, setSpacingMenuOpen] = useState(false);
  const [linkMenuOpen, setLinkMenuOpen] = useState(false);
  const [cropMenuOpen, setCropMenuOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTooltip, setLinkTooltip] = useState('');
  const [linkError, setLinkError] = useState('');
  const [fontSizeDraft, setFontSizeDraft] = useState('18');
  const [fontSizeEditing, setFontSizeEditing] = useState(false);
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [fontQuery, setFontQuery] = useState('Arial');
  const [activeFontIndex, setActiveFontIndex] = useState(0);
  const [lineSpacingDraft, setLineSpacingDraft] = useState('1.35');
  const [paragraphBeforeDraft, setParagraphBeforeDraft] = useState('0');
  const [paragraphAfterDraft, setParagraphAfterDraft] = useState('0');
  const [menuPosition, setMenuPosition] = useState({ left: 12, top: 48 });
  const spacingButtonRef = useRef<HTMLButtonElement>(null);
  const spacingMenuRef = useRef<HTMLDivElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const fontMenuRef = useRef<HTMLDivElement>(null);
  const textElement = Boolean(element && textTypes.includes(element.type));
  const content = element?.content ?? {};
  const resourceType = String(element?.resource?.usage?.resource_type || '');
  const croppable = ['image', 'animation', 'video'].includes(resourceType);
  const mediaTransform = content.mediaTransform && typeof content.mediaTransform === 'object'
    ? content.mediaTransform as Record<string, unknown>
    : {};
  const alignment = String(content.alignment || 'left');
  const hasRichList = typeof content.richTextHtml === 'string' && /<(?:ul|ol)\b/i.test(content.richTextHtml);
  const storedLink = normalizeStudioHyperlink(content.hyperlink);
  const button = (active = false) => `grid h-6 w-6 shrink-0 place-items-center rounded p-1 ${active ? 'bg-blue-100 text-blue-900' : 'hover:bg-slate-100'} disabled:cursor-not-allowed disabled:opacity-35`;
  const compactFontButton = (active = false) => `grid h-5 w-5 shrink-0 place-items-center rounded p-0.5 ${active ? 'bg-blue-100 text-blue-900' : 'hover:bg-slate-100'} disabled:cursor-not-allowed disabled:opacity-35`;
  const sendTextCommand = (command: Parameters<typeof dispatchStudioTextCommand>[1]) => {
    if (!element || !textElement) return;
    if (selectionCount > 1) {
      onBatchTextCommand?.(command);
      return;
    }
    dispatchStudioTextCommand(element.id, command);
  };
  const displayedFontSize = selectionFontSize === 'mixed'
    ? ''
    : String(selectionFontSize ?? (Number(content.fontSize) || 18));
  const displayedFontFamily = selectionFontFamily === 'mixed'
    ? ''
    : String(selectionFontFamily || content.fontFamily || 'Arial');
  const filteredFonts = filterStudioFonts(fontQuery);
  useEffect(() => {
    if (fontMenuOpen) return;
    setFontQuery(displayedFontFamily);
    setActiveFontIndex(0);
  }, [displayedFontFamily, element?.id, fontMenuOpen]);
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
  useEffect(() => {
    if (!fontMenuOpen) return;
    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && (fontInputRef.current?.contains(target) || fontMenuRef.current?.contains(target))) return;
      setFontMenuOpen(false);
      setFontQuery(displayedFontFamily);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointerDown);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointerDown);
  }, [displayedFontFamily, fontMenuOpen]);
  const openFontMenu = (input: HTMLInputElement) => {
    positionMenu(input, 288);
    setFontMenuOpen(true);
    setActiveFontIndex(0);
  };
  const applyFont = (fontName: string) => {
    setFontQuery(fontName);
    setFontMenuOpen(false);
    sendTextCommand({ type: 'style', property: 'fontFamily', value: fontName, restoreEditorFocus: true });
  };
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
  const positionMenu = (target: HTMLElement, width: number) => {
    const rect = target.getBoundingClientRect();
    setMenuPosition({
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      top: rect.bottom + 8,
    });
  };
  useEffect(() => {
    const openLinkMenu = () => {
      setLinkUrl(storedLink?.url ?? '');
      setLinkTooltip(storedLink?.tooltip ?? '');
      setLinkError('');
      setMenuPosition({ left: Math.max(12, Math.min(window.innerWidth / 2 - 160, window.innerWidth - 332)), top: 116 });
      setLinkMenuOpen(true);
      setListMenuOpen(false);
      setSpacingMenuOpen(false);
    };
    window.addEventListener('studio-open-hyperlink', openLinkMenu);
    return () => window.removeEventListener('studio-open-hyperlink', openLinkMenu);
  }, [storedLink?.tooltip, storedLink?.url]);
  useEffect(() => {
    const openCropMenu = () => {
      if (!croppable) return;
      setMenuPosition({ left: Math.max(12, Math.min(window.innerWidth / 2 - 160, window.innerWidth - 332)), top: 116 });
      setCropMenuOpen(true);
      setLinkMenuOpen(false);
      setListMenuOpen(false);
      setSpacingMenuOpen(false);
    };
    window.addEventListener('studio-open-crop-fit', openCropMenu);
    return () => window.removeEventListener('studio-open-crop-fit', openCropMenu);
  }, [croppable]);
  const applyLink = () => {
    const normalized = normalizeStudioHyperlink({ url: linkUrl, tooltip: linkTooltip, target: '_blank' });
    if (!normalized) {
      setLinkError('Enter a valid web, email or telephone URL.');
      return;
    }
    onChange({ hyperlink: normalized });
    setLinkMenuOpen(false);
  };
  const ribbonGroup = (label: string, controls: ReactNode) => (
    <section className="flex shrink-0 flex-col justify-between border-r border-slate-200 px-1 last:border-r-0" aria-label={`${label} controls`}>
      <div className="flex min-h-0 flex-1 items-center">{controls}</div>
      <span className="mt-0.5 text-center text-[9px] font-semibold text-slate-500">{label}</span>
    </section>
  );

  return <div data-studio-element-toolbar className="relative flex min-w-0 flex-1 items-stretch overflow-hidden" aria-label="Home text controls">
    {ribbonGroup('Font', <div className="grid gap-0.5">
      <div className="flex items-center gap-0.5">
        <input ref={fontInputRef} disabled={!textElement} role="combobox" aria-label="Font family" aria-autocomplete="list" aria-expanded={fontMenuOpen} aria-controls="studio-font-family-options" value={fontQuery} placeholder={selectionFontFamily === 'mixed' ? 'Mixed' : undefined} onFocus={(event) => { openFontMenu(event.currentTarget); event.currentTarget.select(); }} onClick={(event) => openFontMenu(event.currentTarget)} onChange={(event) => { setFontQuery(event.target.value); setActiveFontIndex(0); setFontMenuOpen(true); }} onKeyDown={(event) => {
          if (event.key === 'ArrowDown') { event.preventDefault(); setFontMenuOpen(true); setActiveFontIndex((index) => Math.min(index + 1, Math.max(0, filteredFonts.length - 1))); }
          else if (event.key === 'ArrowUp') { event.preventDefault(); setActiveFontIndex((index) => Math.max(0, index - 1)); }
          else if (event.key === 'Enter' && filteredFonts.length) { event.preventDefault(); applyFont(filteredFonts[activeFontIndex]?.name ?? filteredFonts[0].name); }
          else if (event.key === 'Escape') { event.preventDefault(); setFontMenuOpen(false); setFontQuery(displayedFontFamily); event.currentTarget.blur(); }
        }} className="h-6 w-28 shrink-0 rounded border px-1 text-[10px] disabled:opacity-35" style={{ fontFamily: studioFontCssFamily(displayedFontFamily || String(content.fontFamily || 'Arial')) }} />
        <input disabled={!textElement} type="number" min="10" max="160" value={fontSizeDraft} placeholder={selectionFontSize === 'mixed' ? 'Mixed' : undefined} onFocus={() => setFontSizeEditing(true)} onChange={(event) => previewFontSize(event.target.value)} onBlur={() => { setFontSizeEditing(false); const size = Number(fontSizeDraft); if (!Number.isFinite(size) || size < 10 || size > 160) setFontSizeDraft(displayedFontSize); }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} aria-label="Font size" className="h-6 w-10 shrink-0 rounded border px-1 text-[10px] disabled:opacity-35" />
        <input disabled={!textElement} type="color" value={typeof content.color === 'string' ? content.color : '#25436b'} onChange={(event) => sendTextCommand({ type: 'style', property: 'color', value: event.target.value })} aria-label="Text colour" className="h-6 w-6 shrink-0 rounded border p-0.5 disabled:opacity-35" />
      </div>
      <div className="flex items-center gap-0.5 pl-0.5">
        <button disabled={!textElement} type="button" title="Bold selected text" onClick={() => sendTextCommand({ type: 'format', command: 'bold' })} className={compactFontButton(content.bold === true)}><Bold size={12} /></button>
        <button disabled={!textElement} type="button" title="Italicise selected text" onClick={() => sendTextCommand({ type: 'format', command: 'italic' })} className={compactFontButton(content.italic === true)}><Italic size={12} /></button>
        <button disabled={!textElement} type="button" title="Underline selected text" onClick={() => sendTextCommand({ type: 'format', command: 'underline' })} className={compactFontButton(content.underline === true)}><Underline size={12} /></button>
      </div>
    </div>)}
    {fontMenuOpen && textElement && typeof document !== 'undefined' ? createPortal(<div ref={fontMenuRef} data-studio-element-toolbar id="studio-font-family-options" role="listbox" aria-label="Font families" className="fixed z-[270] max-h-80 w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl" style={menuPosition}>
      {filteredFonts.length ? STUDIO_FONT_CATEGORIES.map((category) => {
        const fonts = filteredFonts.filter((font) => font.category === category);
        if (!fonts.length) return null;
        return <section key={category} aria-label={category}><div className="sticky top-0 bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">{category}</div>{fonts.map((font) => {
          const optionIndex = filteredFonts.indexOf(font);
          const active = optionIndex === activeFontIndex;
          return <button key={font.name} type="button" role="option" aria-selected={font.name === displayedFontFamily} onPointerDown={(event) => event.preventDefault()} onMouseEnter={() => setActiveFontIndex(optionIndex)} onClick={() => applyFont(font.name)} className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${active ? 'bg-blue-50 text-blue-950' : 'hover:bg-slate-50'}`} style={{ fontFamily: studioFontCssFamily(font.name) }}>{font.name}</button>;
        })}</section>;
      }) : <p className="px-3 py-5 text-center text-xs text-slate-500">No matching font</p>}
    </div>, document.body) : null}
    {ribbonGroup('Paragraph', <div className="grid gap-0.5">
      <div className="flex items-center gap-0.5">
        <button disabled={!textElement} type="button" title="Align left" onClick={() => sendTextCommand({ type: 'block-style', property: 'textAlign', value: 'left' })} className={button(alignment === 'left')}><AlignLeft size={14} /></button>
        <button disabled={!textElement} type="button" title="Align centre" onClick={() => sendTextCommand({ type: 'block-style', property: 'textAlign', value: 'center' })} className={button(alignment === 'center')}><AlignCenter size={14} /></button>
        <button disabled={!textElement} type="button" title="Align right" onClick={() => sendTextCommand({ type: 'block-style', property: 'textAlign', value: 'right' })} className={button(alignment === 'right')}><AlignRight size={14} /></button>
        <button disabled={!textElement} type="button" title="Justify" onClick={() => sendTextCommand({ type: 'block-style', property: 'textAlign', value: 'justify' })} className={button(alignment === 'justify')}><AlignJustify size={14} /></button>
      </div>
      <div className="flex items-center gap-0.5">
        <button ref={spacingButtonRef} disabled={!textElement} type="button" title="Line and paragraph spacing" aria-label="Line and paragraph spacing" onClick={(event) => { positionMenu(event.currentTarget, 288); setSpacingMenuOpen((open) => !open); setListMenuOpen(false); }} className={button(spacingMenuOpen)}><ListChevronsUpDown size={14} /></button>
        <div className="flex shrink-0 overflow-hidden rounded border border-transparent">
          <button disabled={!textElement} type="button" title="Toggle bullet list at cursor" onClick={() => sendTextCommand({ type: 'bullet', style: 'disc', toggle: true })} className={button(content.list === true || hasRichList)}><List size={14} /></button>
          <button disabled={!textElement} type="button" title="Bullet and numbering styles" onClick={(event) => { positionMenu(event.currentTarget, 288); setListMenuOpen((open) => !open); setSpacingMenuOpen(false); }} className={button()}><ChevronDown size={12} /></button>
        </div>
        <button disabled={!textElement} type="button" title="Increase list level" onClick={() => sendTextCommand({ type: 'indent' })} className={button()}><IndentIncrease size={14} /></button>
        <button disabled={!textElement} type="button" title="Decrease list level" onClick={() => sendTextCommand({ type: 'outdent' })} className={button()}><IndentDecrease size={14} /></button>
      </div>
    </div>)}
    {spacingMenuOpen && textElement && typeof document !== 'undefined' ? createPortal(<div ref={spacingMenuRef} className="fixed z-[260] max-h-[calc(100dvh-4rem)] w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-xl" style={menuPosition}><div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-slate-500"><ListChevronsUpDown size={14} />Spacing</div><p className="mb-2 text-[10px] leading-4 text-slate-500">Applies to the selected paragraph, or the complete text box when no text is selected.</p><div className="grid grid-cols-4 gap-1">{[1, 1.15, 1.5, 2].map((value) => <button key={value} type="button" onPointerDown={(event) => event.preventDefault()} onClick={() => previewLineSpacing(String(value))} className={`rounded-lg border px-2 py-1.5 text-xs font-semibold ${lineSpacingDraft === String(value) ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 hover:bg-slate-50'}`}>{value}</button>)}</div><label className="mt-3 block text-[11px] font-semibold text-slate-600">Line spacing<input type="number" min="0.8" max="3" step="0.05" value={lineSpacingDraft} placeholder={selectionSpacing?.lineHeight === 'mixed' ? 'Mixed' : undefined} onChange={(event) => previewLineSpacing(event.target.value)} className="mt-1 h-8 w-full rounded-lg border border-slate-300 px-2 font-normal" /></label><div className="mt-3 grid grid-cols-2 gap-2"><label className="text-[11px] font-semibold text-slate-600">Before paragraph<input type="number" min="0" max="120" step="1" value={paragraphBeforeDraft} placeholder={selectionSpacing?.paragraphSpacingBefore === 'mixed' ? 'Mixed' : undefined} onChange={(event) => previewParagraphSpacing('before', event.target.value)} className="mt-1 h-8 w-full rounded-lg border border-slate-300 px-2 font-normal" /></label><label className="text-[11px] font-semibold text-slate-600">After paragraph<input type="number" min="0" max="120" step="1" value={paragraphAfterDraft} placeholder={selectionSpacing?.paragraphSpacingAfter === 'mixed' ? 'Mixed' : undefined} onChange={(event) => previewParagraphSpacing('after', event.target.value)} className="mt-1 h-8 w-full rounded-lg border border-slate-300 px-2 font-normal" /></label></div></div>, document.body) : null}

    {listMenuOpen && typeof document !== 'undefined' ? createPortal(<div className="fixed z-[260] max-h-[calc(100dvh-4rem)] w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-xl" style={menuPosition}><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-500"><List size={14} />Bullets</div><div className="grid grid-cols-4 gap-2"><button type="button" aria-label="No bullets or numbering" onPointerDown={(event) => event.preventDefault()} onClick={() => { sendTextCommand({ type: 'clear-list' }); setListMenuOpen(false); }} className="rounded-lg border border-slate-200 p-2 text-xs font-semibold hover:bg-blue-50">None</button>{([{ style: 'disc', glyph: '●' }, { style: 'circle', glyph: '○' }, { style: 'square', glyph: '■' }, { style: '"◆  "', glyph: '◆' }, { style: '"➤  "', glyph: '➤' }, { style: '"✓  "', glyph: '✓' }, { style: '"❖  "', glyph: '❖' }] as const).map((item) => <button key={item.style} type="button" onPointerDown={(event) => event.preventDefault()} onClick={() => { sendTextCommand({ type: 'bullet', style: item.style }); setListMenuOpen(false); }} className="rounded-lg border border-slate-200 p-2 text-lg hover:bg-blue-50">{item.glyph}</button>)}</div><div className="mb-2 mt-3 flex items-center gap-2 text-xs font-bold uppercase text-slate-500"><ListOrdered size={14} />Numbering</div><div className="grid grid-cols-3 gap-2">{([{ style: 'decimal', glyph: '1.' }, { style: 'decimal-leading-zero', glyph: '01.' }, { style: 'lower-alpha', glyph: 'a.' }, { style: 'upper-alpha', glyph: 'A.' }, { style: 'lower-roman', glyph: 'i.' }, { style: 'upper-roman', glyph: 'I.' }] as const).map((item) => <button key={item.style} type="button" onPointerDown={(event) => event.preventDefault()} onClick={() => { sendTextCommand({ type: 'number', style: item.style }); setListMenuOpen(false); }} className="rounded-lg border border-slate-200 p-2 text-sm font-semibold hover:bg-blue-50">{item.glyph}</button>)}</div><p className="mt-3 text-[10px] leading-4 text-slate-500">Double-click text, select every required line, then choose one style. The complete selection becomes one list.</p></div>, document.body) : null}

    {linkMenuOpen && typeof document !== 'undefined' ? createPortal(<div className="fixed z-[260] max-h-[calc(100dvh-4rem)] w-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-xl" style={menuPosition}><h3 className="text-sm font-semibold text-slate-900">Element hyperlink</h3><p className="mt-1 text-xs text-slate-500">The selected text, shape, image, button or block becomes clickable in Preview and Teacher Player.</p><label className="mt-3 block text-xs font-semibold text-slate-600">Destination URL<input autoFocus value={linkUrl} onChange={(event) => { setLinkUrl(event.target.value); setLinkError(''); }} placeholder="https://example.com" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label><label className="mt-2 block text-xs font-semibold text-slate-600">Hover description<input value={linkTooltip} onChange={(event) => setLinkTooltip(event.target.value)} placeholder="Open supporting resource" maxLength={240} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>{linkError ? <p className="mt-2 text-xs text-red-700">{linkError}</p> : null}<div className="mt-3 flex justify-between gap-2">{storedLink ? <button type="button" onClick={() => { onChange({ hyperlink: null }); setLinkMenuOpen(false); }} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Remove link</button> : <span />}<div className="flex gap-2"><button type="button" onClick={() => setLinkMenuOpen(false)} className="rounded-lg border px-3 py-2 text-xs font-semibold">Cancel</button><button type="button" onClick={applyLink} className="rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white">Apply link</button></div></div></div>, document.body) : null}

    {cropMenuOpen && croppable && typeof document !== 'undefined' ? createPortal(<div className="fixed z-[260] max-h-[calc(100dvh-4rem)] w-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl" style={menuPosition}><div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900"><Crop size={16} />Crop and fit</div><label className="block text-xs font-semibold text-slate-600">Fit mode<select value={String(mediaTransform.fit || 'contain')} onChange={(event) => onChange({ mediaTransform: { ...mediaTransform, fit: event.target.value, cropped: event.target.value === 'cover' } })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"><option value="contain">Fit — resize complete resource</option><option value="cover">Fill — crop to component</option></select></label><label className="mt-3 block text-xs font-semibold text-slate-600">Zoom · {Math.round((Number(mediaTransform.scale) || 1) * 100)}%<input type="range" min="1" max="3" step="0.05" value={Number(mediaTransform.scale) || 1} onChange={(event) => onChange({ mediaTransform: { ...mediaTransform, scale: Number(event.target.value) } })} className="mt-1 w-full accent-blue-900" /></label><label className="mt-2 block text-xs font-semibold text-slate-600">Horizontal position<input type="range" min="-100" max="100" value={Number(mediaTransform.x) || 0} onChange={(event) => onChange({ mediaTransform: { ...mediaTransform, x: Number(event.target.value) } })} className="mt-1 w-full accent-blue-900" /></label><label className="mt-2 block text-xs font-semibold text-slate-600">Vertical position<input type="range" min="-100" max="100" value={Number(mediaTransform.y) || 0} onChange={(event) => onChange({ mediaTransform: { ...mediaTransform, y: Number(event.target.value) } })} className="mt-1 w-full accent-blue-900" /></label><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => onChange({ mediaTransform: { fit: 'contain', scale: 1, x: 0, y: 0, cropped: false } })} className="rounded-lg border px-3 py-2 text-xs font-semibold">Reset</button><button type="button" onClick={() => setCropMenuOpen(false)} className="rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white">Done</button></div></div>, document.body) : null}

  </div>;
}

