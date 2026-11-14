import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import katex from 'katex';
import { renderToStaticMarkup } from 'react-dom/server';
import StudioRichTextElement, { hasInlineEquation, inlineEquationParts } from './StudioRichTextElement';
import StudioShapeElement from './StudioShapeElement';
import type { InlineShapeData } from './studioInlineShape';
import { STUDIO_TEXT_COMMAND_EVENT, type StudioTextCommand } from './studioTextCommands';

interface Props {
  elementId?: string; text: string; richTextHtml?: string; color?: string; backgroundColor?: string; borderColor?: string; borderWidth?: number; fontSize?: number; fontFamily?: string; bold?: boolean; italic?: boolean; underline?: boolean;
  alignment?: 'left' | 'center' | 'right' | 'justify'; list?: boolean; lineHeight?: number; paragraphSpacingBefore?: number; paragraphSpacingAfter?: number; editable?: boolean; selected?: boolean; startEditing?: boolean;
  onSelect?: () => void; onCommit?: (change: { text: string; richTextHtml?: string; formatting: Record<string, unknown>; requiredHeight: number }) => void; onCaretChange?: (offset: number) => void; onEditingChange?: (editing: boolean) => void;
  onSelectionFontSizeChange?: (fontSize: number | 'mixed' | null) => void;
  onSelectionSpacingChange?: (spacing: SelectionSpacing) => void;
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
const supportedRichTextTags = new Set(['A', 'B', 'BR', 'DIV', 'EM', 'I', 'LI', 'OL', 'P', 'S', 'SPAN', 'STRONG', 'SUB', 'SUP', 'U', 'UL']);
const supportedFonts = ['Arial', 'Calibri', 'Georgia', 'Times New Roman', 'Verdana', 'Trebuchet MS'];
const safeCssColor = (value: string) => Boolean(value && globalThis.CSS?.supports?.('color', value));
const compactUrlValue = (value: string) => Array.from(value)
  .filter((character) => character.charCodeAt(0) > 32 && character.charCodeAt(0) !== 127)
  .join('')
  .toLowerCase();
const clampedNumber = (value: string, minimum: number, maximum: number) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : null;
};
const normalizedFont = (value: string) => {
  const candidates = value.split(',').map((font) => font.trim().replace(/^['"]|['"]$/g, ''));
  return supportedFonts.find((font) => candidates.some((candidate) => candidate.toLowerCase() === font.toLowerCase()));
};
const sanitizeStudioRichText = (html: string) => {
  if (typeof document === 'undefined') return html;
  const template = document.createElement('template');
  template.innerHTML = html;
  template.content.querySelectorAll(blockedRichTextTags).forEach((node) => node.remove());
  template.content.querySelectorAll<HTMLElement>('*').forEach((originalNode) => {
    let node = originalNode;
    const atomicParent = node.closest<HTMLElement>('[data-inline-latex],[data-inline-shape]');
    if (atomicParent && atomicParent !== node) return;
    if (/^H[1-6]$/.test(node.tagName) || node.tagName === 'FONT') {
      const replacement = document.createElement(/^H[1-6]$/.test(node.tagName) ? 'p' : 'span');
      if (/^H[1-6]$/.test(node.tagName)) {
        const level = Number(node.tagName.slice(1));
        replacement.style.fontSize = `${Math.max(20, 38 - level * 3)}px`;
        replacement.style.fontWeight = '700';
      } else {
        const size = clampedNumber(node.getAttribute('size') || '', 10, 160);
        const face = normalizedFont(node.getAttribute('face') || '');
        const color = node.getAttribute('color') || '';
        if (size !== null) replacement.style.fontSize = `${size}px`;
        if (face) replacement.style.fontFamily = face;
        if (safeCssColor(color)) replacement.style.color = color;
      }
      replacement.append(...Array.from(node.childNodes));
      node.replaceWith(replacement);
      node = replacement;
    }
    const internalAtomicNode = Boolean(node.dataset.inlineLatex || node.dataset.inlineShape);
    if (node.dataset.inlineLatex) {
      try {
        const latex = decodeURIComponent(node.dataset.inlineLatex);
        node.innerHTML = katex.renderToString(latex, { displayMode: false, throwOnError: false, strict: 'ignore', trust: false, output: 'htmlAndMathml' });
        node.className = 'mx-1 inline-block rounded bg-blue-50 px-1 align-middle';
        node.contentEditable = 'false';
      } catch { node.remove(); return; }
    } else if (node.dataset.inlineShape) {
      try {
        const shape = JSON.parse(decodeURIComponent(node.dataset.inlineShape)) as InlineShapeData;
        node.innerHTML = renderToStaticMarkup(<StudioShapeElement {...shape} />);
        node.className = 'mx-1 inline-block h-[1.5em] w-[2.5em] cursor-pointer align-middle';
        node.contentEditable = 'false';
      } catch { node.remove(); return; }
    }
    if (!supportedRichTextTags.has(node.tagName) && !internalAtomicNode) {
      node.replaceWith(...Array.from(node.childNodes));
      return;
    }
    const originalStyle = {
      fontSize: node.style.fontSize,
      fontFamily: node.style.fontFamily,
      color: node.style.color,
      fontWeight: node.style.fontWeight,
      fontStyle: node.style.fontStyle,
      textDecoration: node.style.textDecorationLine || node.style.textDecoration,
      textAlign: node.style.textAlign,
      lineHeight: node.style.lineHeight,
      marginTop: node.style.marginTop,
      marginBottom: node.style.marginBottom,
      listStyleType: node.style.listStyleType,
    };
    for (const attribute of [...node.attributes]) {
      const name = attribute.name.toLowerCase();
      const allowed =
        (node instanceof HTMLAnchorElement && ['href', 'target', 'rel'].includes(name)) ||
        (internalAtomicNode && ['data-inline-latex', 'data-inline-shape', 'contenteditable', 'class'].includes(name));
      if (!allowed) node.removeAttribute(attribute.name);
    }
    node.removeAttribute('style');
    const size = clampedNumber(originalStyle.fontSize, 10, 160);
    const family = normalizedFont(originalStyle.fontFamily);
    const line = clampedNumber(originalStyle.lineHeight, 0.8, 3);
    const marginTop = clampedNumber(originalStyle.marginTop, 0, 120);
    const marginBottom = clampedNumber(originalStyle.marginBottom, 0, 120);
    if (size !== null) node.style.fontSize = `${size}px`;
    if (family) node.style.fontFamily = family;
    if (safeCssColor(originalStyle.color)) node.style.color = originalStyle.color;
    if (/^(?:bold|[6-9]00)$/.test(originalStyle.fontWeight)) node.style.fontWeight = '700';
    if (originalStyle.fontStyle === 'italic') node.style.fontStyle = 'italic';
    if (/(?:underline|line-through)/.test(originalStyle.textDecoration)) node.style.textDecoration = originalStyle.textDecoration;
    if (/^(?:left|center|right|justify)$/.test(originalStyle.textAlign)) node.style.textAlign = originalStyle.textAlign;
    if (line !== null) node.style.lineHeight = String(line);
    if (marginTop !== null) node.style.marginTop = `${marginTop}px`;
    if (marginBottom !== null) node.style.marginBottom = `${marginBottom}px`;
    if (originalStyle.listStyleType && !/[;{}]/.test(originalStyle.listStyleType)) node.style.listStyleType = originalStyle.listStyleType;
    if (node instanceof HTMLAnchorElement) {
      const href = node.getAttribute('href') || '';
      if (!/^(?:https?:|mailto:|tel:|#)/i.test(href)) node.removeAttribute('href');
      node.setAttribute('rel', 'noopener noreferrer');
      if (node.getAttribute('target') === '_blank') node.setAttribute('target', '_blank');
      else node.removeAttribute('target');
    }
  });
  // Recheck the final tree because rebuilding inline math/shapes can add descendants
  // after the first querySelectorAll snapshot was created.
  template.content.querySelectorAll(blockedRichTextTags).forEach((node) => node.remove());
  template.content.querySelectorAll<HTMLElement>('*').forEach((node) => {
    for (const attribute of [...node.attributes]) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;
      if (name.startsWith('on')) node.removeAttribute(attribute.name);
      if (['href', 'src', 'xlink:href', 'formaction'].includes(name)) {
        const compactValue = compactUrlValue(value);
        if (/^(?:javascript|vbscript|data):/.test(compactValue)) node.removeAttribute(attribute.name);
      }
      if (name === 'style' && /expression\s*\(|url\s*\(|@import|behavior\s*:|-moz-binding\s*:/i.test(value)) {
        node.removeAttribute(attribute.name);
      }
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

const unwrapElement = (element: Element) => element.replaceWith(...Array.from(element.childNodes));
const clearDescendantFormatting = (root: ParentNode, property: string) => {
  root.querySelectorAll<HTMLElement>('*').forEach((node) => {
    const atomicParent = node.closest('[data-inline-latex],[data-inline-shape]');
    if (atomicParent && atomicParent !== node) return;
    node.style.removeProperty(property);
    if (!node.getAttribute('style')) node.removeAttribute('style');
  });
  const unwrapOutsideAtomic = (selector: string) => root.querySelectorAll(selector).forEach((node) => {
    if (!node.closest('[data-inline-latex],[data-inline-shape]')) unwrapElement(node);
  });
  if (property === 'font-weight') unwrapOutsideAtomic('b,strong');
  if (property === 'font-style') unwrapOutsideAtomic('i,em');
  if (property === 'text-decoration') unwrapOutsideAtomic('u,s');
};
const selectedBlocks = (editor: HTMLElement, range: Range) => {
  const blocks = Array.from(editor.querySelectorAll<HTMLElement>('p,div,li')).filter((node) => {
    try { return range.intersectsNode(node); } catch { return false; }
  });
  return blocks.filter((node) => !blocks.some((candidate) => candidate !== node && node.contains(candidate)));
};
const plainTextPasteHtml = (value: string) => escapeHtml(value).replaceAll(/\r?\n/g, '<br>');
const removeTrailingEditorPlaceholder = (root: HTMLElement) => {
  while (root.lastChild?.nodeType === Node.TEXT_NODE && !root.lastChild.textContent?.trim()) {
    root.lastChild.remove();
  }
  const lastElement = root.lastElementChild;
  if (!lastElement || !['DIV', 'P'].includes(lastElement.tagName) || lastElement.textContent?.trim()) return;
  const hasOnlyBreaks = Array.from(lastElement.childNodes).every((node) =>
    node.nodeType === Node.TEXT_NODE ? !node.textContent?.trim() : node instanceof HTMLBRElement,
  );
  if (hasOnlyBreaks) lastElement.remove();
};
const fontSizeForRange = (editor: HTMLElement, range: Range): number | 'mixed' | null => {
  if (range.collapsed) {
    const element = range.startContainer instanceof HTMLElement
      ? range.startContainer
      : range.startContainer.parentElement;
    if (!element || !editor.contains(element)) return null;
    const size = Number.parseFloat(window.getComputedStyle(element).fontSize);
    return Number.isFinite(size) ? size : null;
  }
  const sizes = new Set<number>();
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.textContent && range.intersectsNode(node)) {
      const element = node.parentElement;
      const size = element ? Number.parseFloat(window.getComputedStyle(element).fontSize) : Number.NaN;
      if (Number.isFinite(size)) sizes.add(size);
    }
    node = walker.nextNode();
  }
  if (sizes.size === 0) return null;
  return sizes.size === 1 ? [...sizes][0] : 'mixed';
};
type SelectionSpacing = {
  lineHeight: number | 'mixed';
  paragraphSpacingBefore: number | 'mixed';
  paragraphSpacingAfter: number | 'mixed';
};
const singleOrMixed = (values: number[]) => {
  const unique = [...new Set(values.map((value) => Math.round(value * 100) / 100))];
  return unique.length === 1 ? unique[0] : 'mixed' as const;
};
const spacingForRange = (
  editor: HTMLElement,
  range: Range,
  fallback: { lineHeight: number; paragraphSpacingBefore: number; paragraphSpacingAfter: number },
): SelectionSpacing => {
  const blocks = range.collapsed
    ? [((range.startContainer instanceof HTMLElement ? range.startContainer : range.startContainer.parentElement)?.closest('p,div,li') as HTMLElement | null)].filter((block): block is HTMLElement => Boolean(block && editor.contains(block)))
    : selectedBlocks(editor, range);
  const targets = blocks.length ? blocks : [editor];
  const lineHeights: number[] = [];
  const before: number[] = [];
  const after: number[] = [];
  targets.forEach((target) => {
    const computed = window.getComputedStyle(target);
    const computedFontSize = Number.parseFloat(computed.fontSize);
    const computedLineHeight = Number.parseFloat(computed.lineHeight);
    lineHeights.push(Number.isFinite(computedLineHeight) && computedFontSize > 0 ? computedLineHeight / computedFontSize : fallback.lineHeight);
    if (target === editor) {
      before.push(Number.parseFloat(editor.style.getPropertyValue('--studio-paragraph-before')) || fallback.paragraphSpacingBefore);
      after.push(Number.parseFloat(editor.style.getPropertyValue('--studio-paragraph-after')) || fallback.paragraphSpacingAfter);
    } else {
      before.push(Number.parseFloat(computed.marginTop) || 0);
      after.push(Number.parseFloat(computed.marginBottom) || 0);
    }
  });
  return {
    lineHeight: singleOrMixed(lineHeights),
    paragraphSpacingBefore: singleOrMixed(before),
    paragraphSpacingAfter: singleOrMixed(after),
  };
};

type StudioTextStyle = CSSProperties & {
  '--studio-paragraph-before': string;
  '--studio-paragraph-after': string;
};

export default function StudioCanvasTextElement({ elementId, text, richTextHtml, color = '#25436b', backgroundColor = 'transparent', borderColor = 'transparent', borderWidth = 1, fontSize = 18, fontFamily = 'Arial', bold = false, italic = false, underline = false, alignment = 'left', list = false, lineHeight = 1.35, paragraphSpacingBefore = 0, paragraphSpacingAfter = 0, editable = false, selected = false, startEditing = false, onSelect, onCommit, onCaretChange, onEditingChange, onSelectionFontSizeChange, onSelectionSpacingChange, onInlineShapeEdit }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const initializedEditorRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const pendingCommandRef = useRef<StudioTextCommand | null>(null);
  const commitTimerRef = useRef<number | null>(null);
  const layoutCommitFrameRef = useRef<number | null>(null);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;
  const [editing, setEditing] = useState(false);
  const renderedRichTextHtml = consistentRichTextHtml(richTextHtml, text);
  const textStyle: StudioTextStyle = {
    color,
    fontSize,
    fontFamily,
    fontWeight: bold ? 700 : 400,
    fontStyle: italic ? 'italic' : 'normal',
    textDecoration: underline ? 'underline' : 'none',
    textAlign: alignment,
    lineHeight,
    maxWidth: '100%',
    overflowWrap: 'anywhere',
    '--studio-paragraph-before': `${Math.max(0, paragraphSpacingBefore)}px`,
    '--studio-paragraph-after': `${Math.max(0, paragraphSpacingAfter)}px`,
  };
  useLayoutEffect(() => {
    if (!editing) {
      initializedEditorRef.current = null;
      savedRangeRef.current = null;
      return;
    }
    const editor = editorRef.current;
    if (!editor || initializedEditorRef.current === editor) return;
    editor.innerHTML = renderedRichTextHtml ?? editableHtml(text);
    initializedEditorRef.current = editor;
  }, [editing, renderedRichTextHtml, text]);
  const reportCaret = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.endContainer)) return;
    if (
      range.collapsed &&
      document.activeElement !== editor &&
      savedRangeRef.current &&
      !savedRangeRef.current.collapsed
    ) return;
    savedRangeRef.current = range.cloneRange();
    onSelectionFontSizeChange?.(fontSizeForRange(editor, range));
    onSelectionSpacingChange?.(spacingForRange(editor, range, { lineHeight, paragraphSpacingBefore, paragraphSpacingAfter }));
    const prefix = range.cloneRange();
    prefix.selectNodeContents(editor);
    prefix.setEnd(range.endContainer, range.endOffset);
    onCaretChange?.(serializeNodes(prefix.cloneContents().childNodes).length);
  };
  useEffect(() => {
    if (!editing) return;
    const captureSelectedText = () => {
      const editor = editorRef.current;
      const selection = window.getSelection();
      if (!editor || !selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (
        range.collapsed ||
        !editor.contains(range.startContainer) ||
        !editor.contains(range.endContainer)
      ) return;
      savedRangeRef.current = range.cloneRange();
      onSelectionFontSizeChange?.(fontSizeForRange(editor, range));
      onSelectionSpacingChange?.(spacingForRange(editor, range, { lineHeight, paragraphSpacingBefore, paragraphSpacingAfter }));
    };
    document.addEventListener('selectionchange', captureSelectedText);
    captureSelectedText();
    return () => document.removeEventListener('selectionchange', captureSelectedText);
  }, [editing, lineHeight, onSelectionFontSizeChange, onSelectionSpacingChange, paragraphSpacingAfter, paragraphSpacingBefore]);
  const measureRequiredHeight = (source: HTMLElement | null = editorRef.current ?? contentRef.current) => {
    if (!source || source.clientWidth <= 0) return 0;
    const measurement = source.cloneNode(true) as HTMLElement;
    measurement.contentEditable = 'false';
    if (source === editorRef.current) removeTrailingEditorPlaceholder(measurement);
    Object.assign(measurement.style, {
      position: 'fixed',
      left: '-10000px',
      top: '0',
      width: `${source.clientWidth}px`,
      height: 'auto',
      minHeight: '0',
      maxHeight: 'none',
      flex: 'none',
      overflow: 'visible',
      visibility: 'hidden',
      pointerEvents: 'none',
    });
    document.body.appendChild(measurement);
    const requiredHeight = Math.max(60, Math.ceil(measurement.scrollHeight + (borderColor === 'transparent' ? 0 : borderWidth * 2)));
    measurement.remove();
    return requiredHeight;
  };
  const commitEditor = (formatting: Record<string, unknown> = {}) => {
    const editor = editorRef.current;
    const source = editor ?? contentRef.current;
    if (!source || !onCommitRef.current) return;
    onCommitRef.current({
      text: editor ? serializeNodes(editor.childNodes) : text,
      richTextHtml: editor ? sanitizeStudioRichText(editor.innerHTML) : undefined,
      formatting,
      requiredHeight: measureRequiredHeight(source),
    });
  };
  const scheduleEditorCommit = () => {
    if (commitTimerRef.current !== null) window.clearTimeout(commitTimerRef.current);
    commitTimerRef.current = window.setTimeout(() => {
      commitTimerRef.current = null;
      commitEditor();
    }, 180);
  };
  const commitEditorAfterLayout = (formatting: Record<string, unknown> = {}) => {
    if (layoutCommitFrameRef.current !== null) window.cancelAnimationFrame(layoutCommitFrameRef.current);
    layoutCommitFrameRef.current = window.requestAnimationFrame(() => {
      layoutCommitFrameRef.current = null;
      commitEditor(formatting);
    });
  };
  const rangeForCommand = (editor: HTMLElement, command: StudioTextCommand) => {
    if (command.type === 'insert-equation') return rangeAtSerializedOffset(editor, command.offset);
    if (savedRangeRef.current && editor.contains(savedRangeRef.current.commonAncestorContainer))
      return savedRangeRef.current.cloneRange();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    return range;
  };
  const restoreRange = (range: Range) => {
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    savedRangeRef.current = range.cloneRange();
  };
  const runTextCommand = (command: StudioTextCommand) => {
    const editor = editorRef.current;
    if (!editor) {
      pendingCommandRef.current = command;
      setEditing(true);
      onEditingChange?.(true);
      return;
    }
    if (commitTimerRef.current !== null) window.clearTimeout(commitTimerRef.current);
    const selection = window.getSelection();
    const selectedRange = rangeForCommand(editor, command);
    const preserveToolbarFocus = (command.type === 'style' || command.type === 'block-style') && Boolean(document.activeElement?.closest('[data-studio-element-toolbar]'));
    if (!preserveToolbarFocus) {
      editor.focus();
      selection?.removeAllRanges();
      selection?.addRange(selectedRange);
    }
    const hasSelection = !selectedRange.collapsed;
    const formatting: Record<string, unknown> = {};
    if (command.type === 'insert-equation') {
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
      restoreRange(nextRange);
    } else if (command.type === 'style') {
      const cssProperty = command.property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      if (!hasSelection) {
        clearDescendantFormatting(editor, cssProperty);
        editor.style.setProperty(cssProperty, command.value);
        formatting[command.property] = command.property === 'fontSize' ? Number.parseFloat(command.value) : command.value;
      } else {
        const selectedElement = selectedRange.commonAncestorContainer instanceof HTMLElement
          ? selectedRange.commonAncestorContainer
          : null;
        const reusableSpan = selectedElement?.tagName === 'SPAN' &&
          !selectedElement.closest('[data-inline-latex],[data-inline-shape]') &&
          selectedRange.startContainer === selectedElement && selectedRange.startOffset === 0 &&
          selectedRange.endContainer === selectedElement && selectedRange.endOffset === selectedElement.childNodes.length
          ? selectedElement
          : null;
        const span = reusableSpan ?? document.createElement('span');
        if (reusableSpan) {
          clearDescendantFormatting(span, cssProperty);
        } else {
          const fragment = selectedRange.extractContents();
          clearDescendantFormatting(fragment, cssProperty);
          span.appendChild(fragment);
          selectedRange.insertNode(span);
        }
        span.style.setProperty(cssProperty, command.value);
        if (command.property === 'fontSize') onSelectionFontSizeChange?.(Number.parseFloat(command.value));
        const nextRange = document.createRange();
        nextRange.selectNodeContents(span);
        if (preserveToolbarFocus) savedRangeRef.current = nextRange.cloneRange();
        else restoreRange(nextRange);
      }
    } else if (command.type === 'block-style') {
      const cssProperty = command.property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      const blocks = hasSelection ? selectedBlocks(editor, selectedRange) : [];
      if (hasSelection && blocks.length > 0) {
        blocks.forEach((block) => block.style.setProperty(cssProperty, command.value));
      } else {
        clearDescendantFormatting(editor, cssProperty);
        if (command.property === 'marginTop') {
          editor.style.setProperty('--studio-paragraph-before', command.value);
          formatting.paragraphSpacingBefore = Number.parseFloat(command.value);
        } else if (command.property === 'marginBottom') {
          editor.style.setProperty('--studio-paragraph-after', command.value);
          formatting.paragraphSpacingAfter = Number.parseFloat(command.value);
        } else {
          editor.style.setProperty(cssProperty, command.value);
          formatting[command.property === 'textAlign' ? 'alignment' : 'lineHeight'] = command.property === 'lineHeight' ? Number.parseFloat(command.value) : command.value;
        }
      }
      onSelectionSpacingChange?.(spacingForRange(editor, selectedRange, { lineHeight, paragraphSpacingBefore, paragraphSpacingAfter }));
    } else if (command.type === 'format') {
      if (!hasSelection) {
        const details = {
          bold: { property: 'font-weight', value: !bold, cssValue: !bold ? '700' : '400' },
          italic: { property: 'font-style', value: !italic, cssValue: !italic ? 'italic' : 'normal' },
          underline: { property: 'text-decoration', value: !underline, cssValue: !underline ? 'underline' : 'none' },
        }[command.command];
        clearDescendantFormatting(editor, details.property);
        editor.style.setProperty(details.property, details.cssValue);
        formatting[command.command] = details.value;
      } else {
        document.execCommand(command.command);
      }
    } else if (command.type === 'bullet' || command.type === 'number') {
      const tagName = command.type === 'bullet' ? 'UL' : 'OL';
      const selectedLines = hasSelection
        ? serializeNodes(selectedRange.cloneContents().childNodes).split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
        : [];
      if (selectedLines.length > 1) {
        const listElement = document.createElement(tagName.toLowerCase());
        listElement.style.listStyleType = command.style;
        selectedLines.forEach((line) => {
          const item = document.createElement('li');
          item.textContent = line;
          listElement.appendChild(item);
        });
        selectedRange.deleteContents();
        selectedRange.insertNode(listElement);
        const nextRange = document.createRange();
        nextRange.selectNodeContents(listElement);
        restoreRange(nextRange);
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
    commitEditorAfterLayout(formatting);
  };
  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const html = event.clipboardData.getData('text/html');
    const plain = event.clipboardData.getData('text/plain');
    const safeHtml = html ? sanitizeStudioRichText(html) : plainTextPasteHtml(plain);
    document.execCommand('insertHTML', false, safeHtml);
    reportCaret();
    scheduleEditorCommit();
  };
  useEffect(() => () => {
    if (commitTimerRef.current !== null) window.clearTimeout(commitTimerRef.current);
    if (layoutCommitFrameRef.current !== null) window.cancelAnimationFrame(layoutCommitFrameRef.current);
  }, []);
  useEffect(() => { if (!selected) { if (editing) commitEditor(); setEditing(false); onEditingChange?.(false); } }, [editing, onEditingChange, selected]);
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
  }, [elementId, editing, bold, italic, underline]);
  useEffect(() => {
    const target = containerRef.current;
    if (!target || !onCommitRef.current) return;
    let previousWidth = target.clientWidth;
    const observer = new ResizeObserver(() => {
      const nextWidth = target.clientWidth;
      if (Math.abs(nextWidth - previousWidth) < 1) return;
      previousWidth = nextWidth;
      window.requestAnimationFrame(() => commitEditor());
    });
    observer.observe(target);
    const frame = window.requestAnimationFrame(() => commitEditor());
    return () => { observer.disconnect(); window.cancelAnimationFrame(frame); };
  }, [fontSize, fontFamily, bold, italic, underline, alignment, lineHeight, paragraphSpacingBefore, paragraphSpacingAfter, renderedRichTextHtml, text]);
  useEffect(() => {
    if (!editing) return;
    const finishWhenOutside = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (containerRef.current?.contains(target) || target.closest('[data-studio-element-toolbar]')) return;
      reportCaret();
      commitEditor();
      setEditing(false);
      onEditingChange?.(false);
    };
    document.addEventListener('pointerdown', finishWhenOutside);
    return () => document.removeEventListener('pointerdown', finishWhenOutside);
  }, [editing, onEditingChange, onCommit]);
  const handleEditorBlur = () => {
    // Mouse/keyboard selection was already captured by pointerup/keyup. Do not
    // replace it with the collapsed browser selection created by toolbar focus.
    commitEditor();
    window.setTimeout(() => {
      if (document.activeElement?.closest('[data-studio-element-toolbar]')) return;
      setEditing(false);
      onEditingChange?.(false);
    }, 0);
  };
  const beginEditing = () => { setEditing(true); onEditingChange?.(true); requestAnimationFrame(() => editorRef.current?.focus()); };
  useEffect(() => {
    if (!startEditing || !editable || !selected || editing) return;
    setEditing(true);
    onEditingChange?.(true);
    const frame = requestAnimationFrame(() => editorRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [editable, editing, onEditingChange, selected, startEditing]);
  return <div ref={containerRef} className={`relative h-full w-full overflow-visible ${editing ? 'cursor-text' : ''}`} style={{ backgroundColor, border: borderColor === 'transparent' || borderWidth <= 0 ? 'none' : `${borderWidth}px solid ${borderColor}` }} onClick={(event) => { event.stopPropagation(); onSelect?.(); }} onDoubleClick={(event) => { if (!editable) return; event.stopPropagation(); beginEditing(); }}>
    {editing ? <div ref={(node) => { editorRef.current = node; contentRef.current = node; }} contentEditable suppressContentEditableWarning className="studio-canvas-rich-text min-h-0 w-full cursor-text overflow-visible whitespace-pre-wrap p-3 outline-none" style={textStyle} onPaste={handlePaste} onDoubleClick={(event) => { const target = (event.target as HTMLElement).closest<HTMLElement>('[data-inline-shape]'); if (!target?.dataset.inlineShape || !editorRef.current) return; event.preventDefault(); event.stopPropagation(); const prefix = document.createRange(); prefix.selectNodeContents(editorRef.current); prefix.setEndBefore(target); const start = serializeNodes(prefix.cloneContents().childNodes).length; const token = `[[shape:${target.dataset.inlineShape}]]`; try { onInlineShapeEdit?.(JSON.parse(decodeURIComponent(target.dataset.inlineShape)) as InlineShapeData, start, start + token.length); } catch { /* Ignore malformed legacy tokens. */ } }} onInput={() => { reportCaret(); scheduleEditorCommit(); }} onKeyUp={reportCaret} onPointerUp={reportCaret} onBlur={handleEditorBlur} onKeyDown={(event) => { event.stopPropagation(); if (event.key === 'Escape') { event.preventDefault(); event.currentTarget.blur(); } }} />
      : renderedRichTextHtml ? <div ref={(node) => { contentRef.current = node; }} className="studio-canvas-rich-text min-h-0 w-full overflow-visible whitespace-pre-wrap p-3" style={textStyle} dangerouslySetInnerHTML={{ __html: renderedRichTextHtml }} />
      : <div ref={(node) => { contentRef.current = node; }} className="min-h-0 w-full overflow-visible" style={textStyle}>{list
        ? <ul className="list-disc space-y-1 p-3 pl-8">{text.split('\n').filter(Boolean).map((line, index) => <li key={index}>{hasInlineEquation(line) ? <StudioRichTextElement text={line} color={color} fontSize={fontSize} /> : line}</li>)}</ul>
        : hasInlineEquation(text) ? <StudioRichTextElement text={text} color={color} fontSize={fontSize} /> : <div className="whitespace-pre-wrap p-3">{text}</div>}</div>}
  </div>;
}
