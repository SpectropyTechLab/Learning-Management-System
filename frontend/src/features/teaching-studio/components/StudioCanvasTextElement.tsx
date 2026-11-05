import { useEffect, useRef, useState } from 'react';
import StudioRichTextElement, { hasInlineEquation } from './StudioRichTextElement';

interface Props {
  text: string; color?: string; fontSize?: number; fontFamily?: string; bold?: boolean; italic?: boolean; underline?: boolean;
  alignment?: 'left' | 'center' | 'right' | 'justify'; list?: boolean; editable?: boolean; selected?: boolean;
  onSelect?: () => void; onTextChange?: (text: string) => void; onEditingChange?: (editing: boolean) => void;
}

export default function StudioCanvasTextElement({ text, color = '#25436b', fontSize = 18, fontFamily = 'Arial', bold = false, italic = false, underline = false, alignment = 'left', list = false, editable = false, selected = false, onSelect, onTextChange, onEditingChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!selected) { setEditing(false); onEditingChange?.(false); } }, [onEditingChange, selected]);
  useEffect(() => {
    if (!editing) return;
    const finishWhenOutside = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (containerRef.current?.contains(target) || target.closest('[data-studio-element-toolbar]')) return;
      if (editorRef.current) onTextChange?.(editorRef.current.innerText);
      setEditing(false);
      onEditingChange?.(false);
    };
    document.addEventListener('pointerdown', finishWhenOutside);
    return () => document.removeEventListener('pointerdown', finishWhenOutside);
  }, [editing, onEditingChange, onTextChange]);
  const beginEditing = () => { setEditing(true); onEditingChange?.(true); requestAnimationFrame(() => editorRef.current?.focus()); };
  return <div ref={containerRef} className="relative flex h-full w-full flex-col" onClick={(event) => { event.stopPropagation(); onSelect?.(); }} onDoubleClick={(event) => { if (!editable) return; event.stopPropagation(); beginEditing(); }}>
    {editing ? <div ref={editorRef} contentEditable suppressContentEditableWarning className="min-h-0 w-full flex-1 overflow-auto p-3 outline-none" style={{ color, fontSize, fontFamily, fontWeight: bold ? 700 : 400, fontStyle: italic ? 'italic' : 'normal', textDecoration: underline ? 'underline' : 'none', textAlign: alignment }} onBlur={(event) => { const value = event.currentTarget.innerText; onTextChange?.(value); window.setTimeout(() => { if (document.activeElement?.closest('[data-studio-element-toolbar]')) return; setEditing(false); onEditingChange?.(false); }, 0); }} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.currentTarget.blur(); } }}>{text}</div>
      : <div className="min-h-0 flex-1 overflow-hidden" style={{ fontFamily, fontWeight: bold ? 700 : 400, fontStyle: italic ? 'italic' : 'normal', textDecoration: underline ? 'underline' : 'none', textAlign: alignment }}>{list
        ? <ul className="list-disc space-y-1 p-3 pl-8" style={{ color, fontSize }}>{text.split('\n').filter(Boolean).map((line, index) => <li key={index}>{hasInlineEquation(line) ? <StudioRichTextElement text={line} color={color} fontSize={fontSize} /> : line}</li>)}</ul>
        : hasInlineEquation(text) ? <StudioRichTextElement text={text} color={color} fontSize={fontSize} /> : <div className="whitespace-pre-wrap p-3" style={{ color, fontSize }}>{text}</div>}</div>}
  </div>;
}
