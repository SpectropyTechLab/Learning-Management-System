import { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import StudioRichTextElement, { hasInlineEquation, inlineEquationParts } from './StudioRichTextElement';

interface Props {
  text: string; color?: string; backgroundColor?: string; fontSize?: number; fontFamily?: string; bold?: boolean; italic?: boolean; underline?: boolean;
  alignment?: 'left' | 'center' | 'right' | 'justify'; list?: boolean; editable?: boolean; selected?: boolean;
  onSelect?: () => void; onTextChange?: (text: string) => void; onCaretChange?: (offset: number) => void; onEditingChange?: (editing: boolean) => void;
}

const escapeHtml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const editableHtml = (value: string) => inlineEquationParts(value).map((part) => part.kind === 'text'
  ? escapeHtml(part.value).replaceAll('\n', '<br>')
  : `<span contenteditable="false" data-inline-latex="${encodeURIComponent(part.value)}" class="mx-1 inline-block rounded bg-blue-50 px-1 align-middle">${katex.renderToString(part.value, { displayMode: false, throwOnError: false, strict: 'ignore', trust: false, output: 'htmlAndMathml' })}</span>`).join('');
const serializeNodes = (nodes: NodeListOf<ChildNode> | NodeList) => Array.from(nodes).map((node) => {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof HTMLElement)) return '';
  if (node.dataset.inlineLatex) return `\\(${decodeURIComponent(node.dataset.inlineLatex)}\\)`;
  if (node.tagName === 'BR') return '\n';
  const content = serializeNodes(node.childNodes);
  return node.tagName === 'DIV' || node.tagName === 'P' ? `${content}\n` : content;
}).join('').replace(/\n$/, '');

export default function StudioCanvasTextElement({ text, color = '#25436b', backgroundColor = 'transparent', fontSize = 18, fontFamily = 'Arial', bold = false, italic = false, underline = false, alignment = 'left', list = false, editable = false, selected = false, onSelect, onTextChange, onCaretChange, onEditingChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const reportCaret = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.endContainer)) return;
    const prefix = range.cloneRange();
    prefix.selectNodeContents(editor);
    prefix.setEnd(range.endContainer, range.endOffset);
    onCaretChange?.(serializeNodes(prefix.cloneContents().childNodes).length);
  };
  useEffect(() => { if (!selected) { setEditing(false); onEditingChange?.(false); } }, [onEditingChange, selected]);
  useEffect(() => {
    if (!editing) return;
    const finishWhenOutside = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (containerRef.current?.contains(target) || target.closest('[data-studio-element-toolbar]')) return;
      reportCaret();
      if (editorRef.current) onTextChange?.(serializeNodes(editorRef.current.childNodes));
      setEditing(false);
      onEditingChange?.(false);
    };
    document.addEventListener('pointerdown', finishWhenOutside);
    return () => document.removeEventListener('pointerdown', finishWhenOutside);
  }, [editing, onEditingChange, onTextChange]);
  const beginEditing = () => { setEditing(true); onEditingChange?.(true); requestAnimationFrame(() => editorRef.current?.focus()); };
  return <div ref={containerRef} className="relative flex h-full w-full flex-col" style={{ backgroundColor }} onClick={(event) => { event.stopPropagation(); onSelect?.(); }} onDoubleClick={(event) => { if (!editable) return; event.stopPropagation(); beginEditing(); }}>
    {editing ? <div ref={editorRef} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: editableHtml(text) }} className="min-h-0 w-full flex-1 overflow-auto whitespace-pre-wrap p-3 outline-none" style={{ color, fontSize, fontFamily, fontWeight: bold ? 700 : 400, fontStyle: italic ? 'italic' : 'normal', textDecoration: underline ? 'underline' : 'none', textAlign: alignment }} onInput={reportCaret} onKeyUp={reportCaret} onPointerUp={reportCaret} onBlur={(event) => { reportCaret(); const value = serializeNodes(event.currentTarget.childNodes); onTextChange?.(value); window.setTimeout(() => { if (document.activeElement?.closest('[data-studio-element-toolbar]')) return; setEditing(false); onEditingChange?.(false); }, 0); }} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.currentTarget.blur(); } }} />
      : <div className="min-h-0 flex-1 overflow-hidden" style={{ fontFamily, fontWeight: bold ? 700 : 400, fontStyle: italic ? 'italic' : 'normal', textDecoration: underline ? 'underline' : 'none', textAlign: alignment }}>{list
        ? <ul className="list-disc space-y-1 p-3 pl-8" style={{ color, fontSize }}>{text.split('\n').filter(Boolean).map((line, index) => <li key={index}>{hasInlineEquation(line) ? <StudioRichTextElement text={line} color={color} fontSize={fontSize} /> : line}</li>)}</ul>
        : hasInlineEquation(text) ? <StudioRichTextElement text={text} color={color} fontSize={fontSize} /> : <div className="whitespace-pre-wrap p-3" style={{ color, fontSize }}>{text}</div>}</div>}
  </div>;
}
