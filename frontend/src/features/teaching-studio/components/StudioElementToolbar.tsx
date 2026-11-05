import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Circle, Italic, List, Sigma, Sparkles, Underline } from 'lucide-react';
import type { StudioElement } from '../types';

interface Props {
  element: StudioElement | null;
  onChange: (changes: Record<string, unknown>) => void;
  onOpenMath: () => void;
  onOpenShapes: () => void;
  onOpenAnimations: () => void;
}

export default function StudioElementToolbar({ element, onChange, onOpenMath, onOpenShapes, onOpenAnimations }: Props) {
  const textElement = Boolean(element && ['title', 'text', 'question', 'response', 'steps', 'workspace', 'footer', 'options', 'data'].includes(element.type));
  const content = element?.content ?? {};
  const alignment = String(content.alignment || 'left');
  const button = (active = false) => `rounded p-1.5 ${active ? 'bg-blue-100 text-blue-900' : 'hover:bg-slate-100'} disabled:cursor-not-allowed disabled:opacity-35`;
  return <div data-studio-element-toolbar className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm" aria-label="Selected element formatting toolbar">
    <select disabled={!textElement} value={String(content.fontFamily || 'Arial')} onChange={(event) => onChange({ fontFamily: event.target.value })} aria-label="Font family" className="h-7 w-24 shrink-0 rounded border px-1 text-xs disabled:opacity-35"><option>Arial</option><option>Calibri</option><option>Georgia</option><option>Times New Roman</option><option>Verdana</option><option>Trebuchet MS</option></select>
    <input disabled={!textElement} type="number" min="10" max="160" value={Number(content.fontSize) || 18} onChange={(event) => onChange({ fontSize: Number(event.target.value) })} aria-label="Font size" className="h-7 w-12 shrink-0 rounded border px-1 text-xs disabled:opacity-35" />
    <input disabled={!textElement} type="color" value={typeof content.color === 'string' ? content.color : '#25436b'} onChange={(event) => onChange({ color: event.target.value })} aria-label="Text colour" className="h-7 w-8 shrink-0 rounded border p-0.5 disabled:opacity-35" />
    <button disabled={!textElement} type="button" title="Bold" onClick={() => onChange({ bold: content.bold !== true })} className={button(content.bold === true)}><Bold size={14} /></button>
    <button disabled={!textElement} type="button" title="Italic" onClick={() => onChange({ italic: content.italic !== true })} className={button(content.italic === true)}><Italic size={14} /></button>
    <button disabled={!textElement} type="button" title="Underline" onClick={() => onChange({ underline: content.underline !== true })} className={button(content.underline === true)}><Underline size={14} /></button>
    <button disabled={!textElement} type="button" title="Align left" onClick={() => onChange({ alignment: 'left' })} className={button(alignment === 'left')}><AlignLeft size={14} /></button>
    <button disabled={!textElement} type="button" title="Align centre" onClick={() => onChange({ alignment: 'center' })} className={button(alignment === 'center')}><AlignCenter size={14} /></button>
    <button disabled={!textElement} type="button" title="Align right" onClick={() => onChange({ alignment: 'right' })} className={button(alignment === 'right')}><AlignRight size={14} /></button>
    <button disabled={!textElement} type="button" title="Justify" onClick={() => onChange({ alignment: 'justify' })} className={button(alignment === 'justify')}><AlignJustify size={14} /></button>
    <button disabled={!textElement} type="button" title="Bullet points" onClick={() => onChange({ list: content.list !== true })} className={button(content.list === true)}><List size={14} /></button>
    <span className="mx-0.5 h-5 w-px shrink-0 bg-slate-200" />
    <button type="button" title="Animations" onClick={onOpenAnimations} className={button()}><Sparkles size={14} /></button>
    <button type="button" title="Math" onClick={onOpenMath} className={button()}><Sigma size={14} /></button>
    <button type="button" title="Shapes" onClick={onOpenShapes} className={button()}><Circle size={14} /></button>
  </div>;
}
