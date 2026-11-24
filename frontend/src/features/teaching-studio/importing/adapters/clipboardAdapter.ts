import { IMPORT_SCHEMA_VERSION, type ImportDocument, type ImportElement, type ImportIssue, type ImportResource } from '../model/importTypes.ts';
import type { StudioElement } from '../../types.ts';

export const SPECTROPY_CLIPBOARD_MIME = 'application/x-spectropy-studio-elements';

export type ClipboardRepresentation = 'native' | 'files' | 'svg' | 'html' | 'image' | 'text' | 'unsupported';

export interface ClipboardSnapshot {
  native_payload?: string;
  files: File[];
  svg?: string;
  html?: string;
  plain?: string;
  types: string[];
  source_application?: string;
}

export interface ClipboardAdaptation {
  representation: ClipboardRepresentation;
  document: ImportDocument;
  available_modes: Array<'destination-theme' | 'source-formatting' | 'editable-content' | 'picture' | 'text-only'>;
  warnings: string[];
}

const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const parseNativeClipboardPayload = (payload?: string): StudioElement[] | null => {
  if (!payload) return null;
  try {
    const parsed: unknown = JSON.parse(payload);
    if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 2000) return null;
    if (!parsed.every((element) => record(element)
      && typeof element.id === 'string' && element.id.length > 0 && element.id.length <= 240
      && typeof element.type === 'string' && element.type.length > 0 && element.type.length <= 100
      && record(element.content) && record(element.position))) return null;
    return parsed as StudioElement[];
  } catch { return null; }
};

const safeUrl = (value: string) => {
  try {
    const url = new URL(value, 'https://spectropy.invalid');
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) || value.startsWith('#');
  } catch { return false; }
};

const stripUnsafeCss = (style: string) => style.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
  const colon = part.indexOf(':');
  if (colon < 1) return '';
  const property = part.slice(0, colon).trim().toLowerCase();
  const value = part.slice(colon + 1).trim();
  const allowed = new Set(['font-family', 'font-size', 'font-weight', 'font-style', 'text-decoration', 'text-decoration-line', 'color', 'background-color', 'text-align', 'vertical-align', 'list-style-type']);
  if (!allowed.has(property) || /url\s*\(|expression\s*\(|javascript\s*:|@import|behavior\s*:/i.test(value)) return '';
  return `${property}: ${value}`;
}).filter(Boolean).join('; ');

const allowedHtmlTags = new Set(['P', 'DIV', 'SPAN', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'BR', 'UL', 'OL', 'LI', 'A', 'SUB', 'SUP', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

export const sanitizeClipboardHtml = (html: string) => {
  if (typeof DOMParser === 'undefined') {
    return html
      .replace(/<(script|style|iframe|object|embed|form|button)[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
      .replace(/<\/?(?:script|style|iframe|object|embed|form|input|button|meta|link)[^>]*>/gi, '')
      .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/\s(?:src|href)\s*=\s*(["'])\s*(?:javascript|data:text\/html)[\s\S]*?\1/gi, '')
      .replace(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/gi, (_match, quote: string, style: string) => {
        const safe = stripUnsafeCss(style);
        return safe ? ` style=${quote}${safe}${quote}` : '';
      });
  }
  const parsed = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const removeEntirely = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'BUTTON', 'META', 'LINK']);
  const clean = (node: Element) => {
    Array.from(node.children).forEach((child) => {
      if (!allowedHtmlTags.has(child.tagName)) {
        if (removeEntirely.has(child.tagName)) child.remove();
        else child.replaceWith(...Array.from(child.childNodes));
        return;
      }
      Array.from(child.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        if (name === 'style') {
          const safe = stripUnsafeCss(attribute.value);
          if (safe) child.setAttribute('style', safe); else child.removeAttribute('style');
        } else if (name === 'href') {
          if (!safeUrl(attribute.value)) child.removeAttribute(attribute.name);
          else child.setAttribute('rel', 'noopener noreferrer');
        } else if (!['title'].includes(name)) child.removeAttribute(attribute.name);
      });
      clean(child);
    });
  };
  clean(parsed.body);
  return parsed.body.innerHTML;
};

export const sanitizeClipboardSvg = (svg: string) => svg
  .replace(/<(script|foreignObject|iframe|object|embed)[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
  .replace(/<\/?(?:script|foreignObject|iframe|object|embed)[^>]*>/gi, '')
  .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  .replace(/\s(?:href|xlink:href)\s*=\s*(["'])(?!#)([\s\S]*?)\1/gi, '')
  .replace(/url\s*\(\s*["']?(?!#)[^)]+\)/gi, 'none');

const textFromHtml = (html: string) => {
  if (typeof DOMParser !== 'undefined') return new DOMParser().parseFromString(html, 'text/html').body.textContent?.trim() || '';
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>|<\/div>|<\/li>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').trim();
};

const issue = (severity: ImportIssue['severity'], code: string, message: string, fallback: string | null = null): ImportIssue => ({
  severity, code, message, fallback_applied: fallback, source_screen_id: 'clipboard-screen', source_element_id: null,
});

const extension = (name: string) => name.toLowerCase().split('.').pop() || '';
const resourceTypeFor = (file: File) => {
  const ext = extension(file.name);
  if (file.type === 'image/gif') return 'animation';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (['pptx', 'ppsx'].includes(ext)) return 'presentation';
  if (ext === 'glb' || file.type === 'model/gltf-binary') return 'model_3d';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'].includes(ext)) return 'document';
  return null;
};

const elementForFile = (file: File, index: number, sourceId: string): ImportElement => {
  const resourceType = resourceTypeFor(file);
  const kind: ImportElement['kind'] = resourceType === 'image' || resourceType === 'animation' ? 'image'
    : resourceType === 'video' ? 'video' : resourceType === 'model_3d' || resourceType === 'document' || resourceType === 'presentation' ? 'embedded_object' : 'media';
  return {
    source_id: `clipboard-element-${index + 1}`, kind,
    bounds: { x: 300 + index * 36, y: 230 + index * 36, width: kind === 'image' ? 640 : 720, height: kind === 'image' ? 420 : 440 },
    z_index: index + 1,
    content: { text: file.name, altText: file.name, mimeType: file.type || 'application/octet-stream', source: 'clipboard', resourceType },
    resource_reference: { source_id: sourceId, fit: 'contain' },
  };
};

const baseDocument = (elements: ImportElement[], resources: ImportResource[], issues: ImportIssue[], application?: string): ImportDocument => ({
  schema_version: IMPORT_SCHEMA_VERSION,
  source: { kind: 'clipboard', name: 'System clipboard', ...(application ? { application } : {}) },
  screens: [{ source_id: 'clipboard-screen', title: 'Clipboard', width: 1920, height: 1080, elements }],
  resources, issues,
});

export const selectClipboardRepresentation = (snapshot: ClipboardSnapshot): ClipboardRepresentation => {
  if (parseNativeClipboardPayload(snapshot.native_payload)) return 'native';
  if (snapshot.files.length) return 'files';
  if (snapshot.svg?.trim()) return 'svg';
  if (snapshot.html?.trim()) return 'html';
  if (snapshot.types.some((type) => type.startsWith('image/'))) return 'image';
  if (snapshot.plain?.trim()) return 'text';
  return 'unsupported';
};

export const clipboardSnapshotFromDataTransfer = (data: DataTransfer): ClipboardSnapshot => ({
  native_payload: data.getData(SPECTROPY_CLIPBOARD_MIME) || undefined,
  files: Array.from(data.files || []),
  svg: data.getData('image/svg+xml') || undefined,
  html: data.getData('text/html') || undefined,
  plain: data.getData('text/plain') || undefined,
  types: Array.from(data.types || []),
});

export const clipboardSnapshotFromItems = async (items: ClipboardItem[]): Promise<ClipboardSnapshot> => {
  const snapshot: ClipboardSnapshot = { files: [], types: [] };
  for (const item of items) {
    item.types.forEach((type) => { if (!snapshot.types.includes(type)) snapshot.types.push(type); });
    for (const type of item.types) {
      const blob = await item.getType(type);
      if (type === SPECTROPY_CLIPBOARD_MIME) snapshot.native_payload = await blob.text();
      else if (type === 'text/html') snapshot.html = await blob.text();
      else if (type === 'text/plain') snapshot.plain = await blob.text();
      else if (type === 'image/svg+xml') snapshot.svg = await blob.text();
      else if (type.startsWith('image/') || type.startsWith('video/') || type.startsWith('audio/') || type === 'application/pdf') {
        snapshot.files.push(new File([blob], `Pasted ${snapshot.files.length + 1}.${type.split('/')[1] || 'bin'}`, { type }));
      }
    }
  }
  return snapshot;
};

export const adaptClipboardSnapshot = (snapshot: ClipboardSnapshot): ClipboardAdaptation => {
  const representation = selectClipboardRepresentation(snapshot);
  const issues: ImportIssue[] = [];
  const warnings: string[] = [];
  if (snapshot.native_payload && representation !== 'native') issues.push(issue('warning', 'CLIPBOARD_NATIVE_INVALID', 'The Spectropy clipboard payload was invalid; a safe standard format was used.', representation));

  if (representation === 'files' || representation === 'image') {
    const supported = snapshot.files.filter(resourceTypeFor).slice(0, 20);
    snapshot.files.filter((file) => !resourceTypeFor(file)).forEach((file) => issues.push(issue('warning', 'CLIPBOARD_FILE_UNSUPPORTED', `${file.name} is not a supported Studio resource.`, null)));
    const resources = supported.map((file, index): ImportResource => ({
      source_id: `clipboard-resource-${index + 1}`, file_name: file.name, media_type: file.type || 'application/octet-stream', read_bytes: async () => new Uint8Array(await file.arrayBuffer()), metadata: { resource_type: resourceTypeFor(file), source: 'clipboard' },
    }));
    const elements = supported.map((file, index) => elementForFile(file, index, resources[index].source_id));
    if ((snapshot.types.some((type) => /powerpoint|presentation|office/i.test(type)) || /mso-|urn:schemas-microsoft-com:office/i.test(snapshot.html || '')) && supported.every((file) => file.type.startsWith('image/'))) {
      warnings.push('PowerPoint content was provided only as an image. Import the original PPTX to reconstruct editable objects.');
    }
    return { representation, document: baseDocument(elements, resources, issues, snapshot.source_application), available_modes: ['source-formatting', 'picture'], warnings };
  }

  if (representation === 'svg') {
    const svg = sanitizeClipboardSvg(snapshot.svg || '');
    const bytes = new TextEncoder().encode(svg);
    const resource: ImportResource = { source_id: 'clipboard-svg', file_name: 'Pasted vector.svg', media_type: 'image/svg+xml', bytes, metadata: { resource_type: 'image', source: 'clipboard' } };
    const element: ImportElement = { source_id: 'clipboard-svg-element', kind: 'vector', bounds: { x: 420, y: 260, width: 640, height: 420 }, content: { text: 'Pasted vector', altText: 'Pasted vector', mimeType: 'image/svg+xml', source: 'clipboard', vectorEditing: 'preserved-svg' }, resource_reference: { source_id: resource.source_id, fit: 'contain' } };
    issues.push(issue('info', 'CLIPBOARD_SVG_PRESERVED', 'SVG was preserved as a scalable vector visual; path-level editing is not available yet.', 'preserved scalable SVG'));
    return { representation, document: baseDocument([element], [resource], issues, snapshot.source_application), available_modes: ['source-formatting', 'picture'], warnings };
  }

  if (representation === 'html') {
    const richTextHtml = sanitizeClipboardHtml(snapshot.html || '');
    const text = (snapshot.plain || textFromHtml(richTextHtml)).trim();
    const element: ImportElement = { source_id: 'clipboard-rich-text', kind: 'text', bounds: { x: 360, y: 280, width: 760, height: 300 }, content: { text, richTextHtml, source: 'clipboard' }, style: { fontFamily: 'Arial', fontSize: 32, color: '#0f172a' } };
    return { representation, document: baseDocument([element], [], issues, snapshot.source_application), available_modes: ['source-formatting', 'editable-content', 'destination-theme', 'text-only'], warnings };
  }

  if (representation === 'text') {
    const text = (snapshot.plain || '').trim();
    const isLink = /^https?:\/\/\S+$/i.test(text) && safeUrl(text);
    const element: ImportElement = { source_id: 'clipboard-text', kind: 'text', bounds: { x: 360, y: 300, width: 760, height: 220 }, content: { text, ...(isLink ? { hyperlink: text } : {}), source: 'clipboard' }, style: { fontFamily: 'Arial', fontSize: 32, color: '#0f172a' } };
    return { representation, document: baseDocument([element], [], issues, snapshot.source_application), available_modes: ['source-formatting', 'editable-content', 'destination-theme', 'text-only'], warnings };
  }

  return { representation, document: baseDocument([], [], [issue('error', 'CLIPBOARD_UNSUPPORTED', 'This clipboard content is not supported. Try copying text, an image, SVG, or a supported file.')], snapshot.source_application), available_modes: [], warnings };
};
