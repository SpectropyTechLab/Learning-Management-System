import { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import { renderToStaticMarkup } from 'react-dom/server';
import StudioRichTextElement, { hasInlineEquation, inlineEquationParts } from './StudioRichTextElement';
import StudioShapeElement from './StudioShapeElement';
import type { InlineShapeData } from './studioInlineShape';
import { STUDIO_TEXT_COMMAND_EVENT, type StudioTextCommand } from './studioTextCommands';

interface Props {
  elementId?: string; text: string; richTextHtml?: string; color?: string; backgroundColor?: string; borderColor?: string; borderWidth?: number; fontSize?: number; fontFamily?: string; bold?: boolean; italic?: boolean; underline?: boolean;
  alignment?: 'left' | 'center' | 'right' | 'justify'; list?: boolean; editable?: boolean; selected?: boolean; startEditing?: boolean;
  onSelect?: () => void; onTextChange?: (text: string, richTextHtml?: string) => void; onCaretChange?: (offset: number) => void; onEditingChange?: (editing: boolean) => void;
  onRequestHeight?: (requiredRatio: number) => void;
  onInlineShapeEdit?: (shape: InlineShapeData, start: number, end: number) => void;
}

const escapeHtml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const editableHtml = (value: string) => inlineEquationParts(value).map((part) => part.kind === 'text'
  ? escapeHtml(part.value).replaceAll('\n', '<br>')
  : part.kind === 'math'
    ? `<span contenteditable="false" data-inline-latex="${encodeURIComponent(part.value)}" class="mx-1 inline-block rounded bg-blue-50 px-1 align-middle">${katex.renderToString(part.value, { displayMode: false, throwOnError: false, strict: 'ignore', trust: false, output: 'htmlAndMathml' })}</span>`
    : (() => {
        try {
          const shape = JSON.parse(decodeURIComponent(part.value)) as InlineShapeData;
          const svg = renderToStaticMarkup(<StudioShapeElement {...shape} />);
          return `<span contenteditable="false" data-inline-shape="${part.value}" class="mx-1 inline-block h-[1.5em] w-[2.5em] cursor-pointer align-middle">${svg}</span>`;
        } catch {
          return '';
        }
      })()).join('');
const blockedRichTextTags = 'script,style,iframe,object,embed,link,meta,form,input,button,textarea,select';
const sanitizeStudioRichText = (html: string) => {
  if (typeof document === 'undefined') return html;
  const template = document.createElement('template');
  template.innerHTML = html;
  template.content.querySelectorAll(blockedRichTextTags).forEach((node) => node.remove());
  template.content.querySelectorAll<HTMLElement>('*').forEach((node) => {
    for (const attribute of [...node.attributes]) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on')) node.removeAttribute(attribute.name);
      if (name === 'style' && /(?:url\s*\(|expression\s*\(|javascript:)/i.test(attribute.value))
        node.removeAttribute(attribute.name);
    }
    if (node instanceof HTMLAnchorElement) {
      const href = node.getAttribute('href') || '';
      if (!/^(?:https?:|mailto:|tel:|#)/i.test(href)) node.removeAttribute('href');
      node.setAttribute('rel', 'noopener noreferrer');
      if (node.getAttribute('target') === '_blank') node.setAttribute('target', '_blank');
      else node.removeAttribute('target');
    }
  });
  return template.innerHTML;
};

const serializeNodes = (nodes: NodeListOf<ChildNode> | NodeList): string => Array.from(nodes).map((node): string => {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof HTMLElement)) return '';
  if (node.dataset.inlineLatex) return `\\(${decodeURIComponent(node.dataset.inlineLatex)}\\)`;
  if (node.dataset.inlineShape) return `[[shape:${node.dataset.inlineShape}]]`;
  if (node.tagName === 'BR') return '\n';
  const content = serializeNodes(node.childNodes);
  return ['DIV', 'P', 'LI'].includes(node.tagName) ? `${content}\n` : content;
}).join('').replace(/\n$/, '');

const consistentRichTextHtml = (html: string | undefined, text: string) => {
  if (!html || typeof document === 'undefined') return html;
  const sanitized = sanitizeStudioRichText(html);
  const template = document.createElement('template');
  template.innerHTML = sanitized;
  return serializeNodes(template.content.childNodes) === text ? sanitized : undefined;
};

const rangeAtSerializedOffset = (editor: HTMLElement, requestedOffset: number) => {
  let remaining = Math.max(0, requestedOffset);
  const range = document.createRange();
  const locate = (node: Node): boolean => {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length ?? 0;
      if (remaining <= length) {
        range.setStart(node, remaining);
        return true;
      }
      remaining -= length;
      return false;
    }
    if (!(node instanceof HTMLElement)) return false;
    const atomicValue = node.dataset.inlineLatex
      ? `\\(${decodeURIComponent(node.dataset.inlineLatex)}\\)`
      : node.dataset.inlineShape ? `[[shape:${node.dataset.inlineShape}]]` : null;
    if (atomicValue) {
      if (remaining <= atomicValue.length) {
        const parent = node.parentNode;
        if (!parent) return false;
        const index = Array.prototype.indexOf.call(parent.childNodes, node);
        range.setStart(parent, index + (remaining === 0 ? 0 : 1));
        return true;
      }
      remaining -= atomicValue.length;
      return false;
    }
    if (node.tagName === 'BR') {
      if (remaining <= 1) {
        const parent = node.parentNode;
        if (!parent) return false;
        range.setStart(parent, Array.prototype.indexOf.call(parent.childNodes, node) + 1);
        return true;
      }
      remaining -= 1;
      return false;
    }
    for (const child of Array.from(node.childNodes)) if (locate(child)) return true;
    return false;
  };
  for (const child of Array.from(editor.childNodes)) if (locate(child)) return range;
  range.selectNodeContents(editor);
  range.collapse(false);
  return range;
};

export default function StudioCanvasTextElement({ elementId, text, richTextHtml, color = '#25436b', backgroundColor = 'transparent', borderColor = 'transparent', borderWidth = 1, fontSize = 18, fontFamily = 'Arial', bold = false, italic = false, underline = false, alignment = 'left', list = false, editable = false, selected = false, startEditing = false, onSelect, onTextChange, onCaretChange, onEditingChange, onRequestHeight, onInlineShapeEdit }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const pendingCommandRef = useRef<StudioTextCommand | null>(null);
  const [editing, setEditing] = useState(false);
  const renderedRichTextHtml = consistentRichTextHtml(richTextHtml, text);
  const reportCaret = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.endContainer)) return;
    savedRangeRef.current = range.cloneRange();
    const prefix = range.cloneRange();
    prefix.selectNodeContents(editor);
    prefix.setEnd(range.endContainer, range.endOffset);
    onCaretChange?.(serializeNodes(prefix.cloneContents().childNodes).length);
  };
  const persistEditor = () => {
    if (!editorRef.current) return;
    onTextChange?.(
      serializeNodes(editorRef.current.childNodes),
      sanitizeStudioRichText(editorRef.current.innerHTML),
    );
  };
  const runTextCommand = (command: StudioTextCommand) => {
    const editor = editorRef.current;
    if (!editor) {
      pendingCommandRef.current = command;
      setEditing(true);
      onEditingChange?.(true);
      return;
    }
    editor.focus();
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      if (command.type === 'insert-equation')
        selection.addRange(rangeAtSerializedOffset(editor, command.offset));
      else if (savedRangeRef.current && editor.contains(savedRangeRef.current.commonAncestorContainer))
        selection.addRange(savedRangeRef.current);
      else {
        const range = document.createRange();
        range.selectNodeContents(editor);
        selection.addRange(range);
      }
    }
    if (command.type === 'insert-equation') {
      const selectedRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
      if (selectedRange) {
        const equation = document.createElement('span');
        equation.contentEditable = 'false';
        equation.dataset.inlineLatex = encodeURIComponent(command.latex);
        equation.className = 'mx-1 inline-block rounded bg-blue-50 px-1 align-middle';
        equation.innerHTML = katex.renderToString(command.latex, { displayMode: false, throwOnError: false, strict: 'ignore', trust: false, output: 'htmlAndMathml' });
        selectedRange.deleteContents();
        selectedRange.insertNode(equation);
        const nextRange = document.createRange();
        nextRange.setStartAfter(equation);
        nextRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(nextRange);
        savedRangeRef.current = nextRange.cloneRange();
      }
    } else if (command.type === 'style') {
      const selectedRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
      if (selectedRange) {
        const span = document.createElement('span');
        span.style[command.property] = command.value;
        if (selectedRange.collapsed) {
          const marker = document.createTextNode('\u200b');
          span.appendChild(marker);
          selectedRange.insertNode(span);
          const nextRange = document.createRange();
          nextRange.setStart(marker, 1);
          nextRange.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(nextRange);
          savedRangeRef.current = nextRange.cloneRange();
        } else {
          span.appendChild(selectedRange.extractContents());
          selectedRange.insertNode(span);
          const nextRange = document.createRange();
          nextRange.selectNodeContents(span);
          selection?.removeAllRanges();
          selection?.addRange(nextRange);
          savedRangeRef.current = nextRange.cloneRange();
        }
      }
    } else if (command.type === 'format') {
      document.execCommand(command.command);
    } else if (command.type === 'bullet' || command.type === 'number') {
      const tagName = command.type === 'bullet' ? 'UL' : 'OL';
      const selectedRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
      const selectedLines = selectedRange && !selectedRange.collapsed
        ? serializeNodes(selectedRange.cloneContents().childNodes)
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
        : [];
      if (selectedRange && selectedLines.length > 1) {
        const list = document.createElement(tagName.toLowerCase());
        list.style.listStyleType = command.style;
        selectedLines.forEach((line) => {
          const item = document.createElement('li');
          item.textContent = line;
          list.appendChild(item);
        });
        selectedRange.deleteContents();
        selectedRange.insertNode(list);
        const nextRange = document.createRange();
        nextRange.selectNodeContents(list);
        selection?.removeAllRanges();
        selection?.addRange(nextRange);
        savedRangeRef.current = nextRange.cloneRange();
      } else {
      const selectionNode = selection?.anchorNode;
      const currentList = (selectionNode instanceof HTMLElement ? selectionNode : selectionNode?.parentElement)?.closest('ul,ol') as HTMLElement | null;
      if (command.toggle || currentList?.tagName !== tagName)
        document.execCommand(command.type === 'bullet' ? 'insertUnorderedList' : 'insertOrderedList');
      const activeNode = window.getSelection()?.anchorNode;
      const activeList = (activeNode instanceof HTMLElement ? activeNode : activeNode?.parentElement)?.closest('ul,ol') as HTMLElement | null;
      if (activeList) activeList.style.listStyleType = command.style;
      }
    } else {
      document.execCommand(command.type);
    }
    reportCaret();
    persistEditor();
    requestRequiredHeight();
  };
  const requestRequiredHeight = () => {
    window.requestAnimationFrame(() => {
      const editor = editorRef.current;
      if (!editor || editor.clientWidth <= 0 || editor.clientHeight <= 0) return;
      const measurement = editor.cloneNode(true) as HTMLDivElement;
      measurement.contentEditable = 'false';
      Object.assign(measurement.style, {
        position: 'fixed',
        left: '-10000px',
        top: '0',
        width: `${editor.clientWidth}px`,
        height: 'auto',
        minHeight: '0',
        maxHeight: 'none',
        flex: 'none',
        overflow: 'visible',
        visibility: 'hidden',
        pointerEvents: 'none',
      });
      document.body.appendChild(measurement);
      const requiredHeight = measurement.scrollHeight;
      measurement.remove();
      if (requiredHeight > 0) onRequestHeight?.(requiredHeight / editor.clientHeight);
    });
  };
  useEffect(() => { if (!selected) { setEditing(false); onEditingChange?.(false); } }, [onEditingChange, selected]);
  useEffect(() => {
    if (!editing || !pendingCommandRef.current) return;
    const command = pendingCommandRef.current;
    pendingCommandRef.current = null;
    const frame = window.requestAnimationFrame(() => runTextCommand(command));
    return () => window.cancelAnimationFrame(frame);
  }, [editing]);
  useEffect(() => {
    if (!elementId) return;
    const receiveCommand = (event: Event) => {
      const detail = (event as CustomEvent<{ elementId: string; command: StudioTextCommand }>).detail;
      if (detail?.elementId === elementId) runTextCommand(detail.command);
    };
    window.addEventListener(STUDIO_TEXT_COMMAND_EVENT, receiveCommand);
    return () => window.removeEventListener(STUDIO_TEXT_COMMAND_EVENT, receiveCommand);
  }, [elementId, editing]);
  useEffect(() => {
    if (!editing) return;
    const finishWhenOutside = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (containerRef.current?.contains(target) || target.closest('[data-studio-element-toolbar]')) return;
      reportCaret();
      persistEditor();
      setEditing(false);
      onEditingChange?.(false);
    };
    document.addEventListener('pointerdown', finishWhenOutside);
    return () => document.removeEventListener('pointerdown', finishWhenOutside);
  }, [editing, onEditingChange, onTextChange]);
  const beginEditing = () => { setEditing(true); onEditingChange?.(true); requestAnimationFrame(() => { editorRef.current?.focus(); requestRequiredHeight(); }); };
  useEffect(() => {
    if (!startEditing || !editable || !selected || editing) return;
    setEditing(true);
    onEditingChange?.(true);
    const frame = requestAnimationFrame(() => editorRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [editable, editing, onEditingChange, selected, startEditing]);
  return <div ref={containerRef} className="relative flex h-full w-full flex-col" style={{ backgroundColor, border: borderColor === 'transparent' || borderWidth <= 0 ? 'none' : `${borderWidth}px solid ${borderColor}` }} onClick={(event) => { event.stopPropagation(); onSelect?.(); }} onDoubleClick={(event) => { if (!editable) return; event.stopPropagation(); beginEditing(); }}>
    {editing ? <div ref={editorRef} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: renderedRichTextHtml ?? editableHtml(text) }} className="studio-canvas-rich-text min-h-0 w-full flex-1 overflow-hidden whitespace-pre-wrap p-3 outline-none" style={{ color, fontSize, fontFamily, fontWeight: bold ? 700 : 400, fontStyle: italic ? 'italic' : 'normal', textDecoration: underline ? 'underline' : 'none', textAlign: alignment }} onDoubleClick={(event) => { const target = (event.target as HTMLElement).closest<HTMLElement>('[data-inline-shape]'); if (!target?.dataset.inlineShape || !editorRef.current) return; event.preventDefault(); event.stopPropagation(); const prefix = document.createRange(); prefix.selectNodeContents(editorRef.current); prefix.setEndBefore(target); const start = serializeNodes(prefix.cloneContents().childNodes).length; const token = `[[shape:${target.dataset.inlineShape}]]`; try { onInlineShapeEdit?.(JSON.parse(decodeURIComponent(target.dataset.inlineShape)) as InlineShapeData, start, start + token.length); } catch { /* Ignore malformed legacy tokens. */ } }} onInput={() => { reportCaret(); requestRequiredHeight(); }} onKeyUp={reportCaret} onPointerUp={reportCaret} onBlur={() => { reportCaret(); persistEditor(); window.setTimeout(() => { if (document.activeElement?.closest('[data-studio-element-toolbar]')) return; setEditing(false); onEditingChange?.(false); }, 0); }} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.currentTarget.blur(); } }} />
      : renderedRichTextHtml ? <div className="studio-canvas-rich-text min-h-0 flex-1 overflow-hidden p-3" style={{ color, fontSize, fontFamily, fontWeight: bold ? 700 : 400, fontStyle: italic ? 'italic' : 'normal', textDecoration: underline ? 'underline' : 'none', textAlign: alignment }} dangerouslySetInnerHTML={{ __html: renderedRichTextHtml }} />
      : <div className="min-h-0 flex-1 overflow-hidden" style={{ fontFamily, fontWeight: bold ? 700 : 400, fontStyle: italic ? 'italic' : 'normal', textDecoration: underline ? 'underline' : 'none', textAlign: alignment }}>{list
        ? <ul className="list-disc space-y-1 p-3 pl-8" style={{ color, fontSize }}>{text.split('\n').filter(Boolean).map((line, index) => <li key={index}>{hasInlineEquation(line) ? <StudioRichTextElement text={line} color={color} fontSize={fontSize} /> : line}</li>)}</ul>
        : hasInlineEquation(text) ? <StudioRichTextElement text={text} color={color} fontSize={fontSize} /> : <div className="whitespace-pre-wrap p-3" style={{ color, fontSize }}>{text}</div>}</div>}
  </div>;
}
