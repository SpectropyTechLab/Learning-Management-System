import type { StudioElement } from '../types';

export type StudioPasteMode =
  | 'destination-theme'
  | 'source-formatting'
  | 'editable-content'
  | 'picture'
  | 'text-only';

export type StudioFormatFamily = 'text' | 'shape' | 'picture' | 'other';
export type StudioCopiedFormat = { family: StudioFormatFamily; values: Record<string, unknown> };

const TEXT_TYPES = new Set([
  'title', 'text', 'question', 'response', 'steps', 'workspace', 'footer', 'options', 'data',
]);

const FORMAT_KEYS = new Set([
  'alignment', 'backgroundColor', 'bold', 'borderColor', 'borderRadius', 'borderWidth',
  'color', 'fill', 'fontFamily', 'fontSize', 'grayscale', 'italic', 'lineHeight', 'opacity',
  'paragraphSpacingAfter', 'paragraphSpacingBefore', 'saturate', 'shapeEffect', 'stroke',
  'strokeDash', 'strokeWidth', 'underline', 'verticalAlignment',
]);

const TEXT_FORMAT_KEYS = new Set(['alignment', 'backgroundColor', 'bold', 'color', 'fill', 'fontFamily', 'fontSize', 'italic', 'lineHeight', 'opacity', 'paragraphSpacingAfter', 'paragraphSpacingBefore', 'shapeEffect', 'stroke', 'strokeDash', 'strokeWidth', 'underline', 'verticalAlignment']);
// Shapes can also act as text boxes. Keep their shape appearance and copy the
// supported text presentation properties without ever copying the text itself.
const SHAPE_FORMAT_KEYS = new Set([
  ...TEXT_FORMAT_KEYS,
  'borderRadius',
]);
const PICTURE_FORMAT_KEYS = new Set(['borderColor', 'borderRadius', 'borderWidth', 'grayscale', 'opacity', 'saturate', 'shapeEffect']);
const resourceTypeOf = (element: StudioElement) => String(element.resource?.usage.resource_type || '');

export const studioElementFormatFamily = (element: StudioElement): StudioFormatFamily => {
  if (TEXT_TYPES.has(element.type)) return 'text';
  if (element.type === 'shape') return 'shape';
  if (element.type === 'visual' || ['image', 'animation', 'video'].includes(resourceTypeOf(element))) return 'picture';
  return 'other';
};

export const studioPasteModesForElements = (elements: StudioElement[]): StudioPasteMode[] => {
  if (!elements.length) return [];
  const allText = elements.every((element) => TEXT_TYPES.has(element.type));
  const supportsPicture = elements.every((element) => {
    const resourceType = resourceTypeOf(element);
    return !['model_3d', 'simulation', 'html', 'zip', 'scorm'].includes(resourceType)
      && !['simulation', 'embedded_object'].includes(element.type);
  });
  const modes: StudioPasteMode[] = ['destination-theme', 'source-formatting'];
  if (allText) modes.push('editable-content');
  if (supportsPicture) modes.push('picture');
  if (allText) modes.push('text-only');
  return modes;
};

const escapeXml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

export const studioElementText = (element: StudioElement) => {
  const candidates = [
    element.content.text,
    element.content.latex,
    element.content.altText,
    element.content.layerName,
  ];
  const value = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim());
  return typeof value === 'string' ? value : element.type.replaceAll('-', ' ');
};

export const collectStudioClipboardElements = (
  elements: StudioElement[],
  selectedElementIds: string[],
  selectedElementId: string | null,
) => {
  const ids = new Set(selectedElementIds.length
    ? selectedElementIds
    : selectedElementId ? [selectedElementId] : []);
  for (const element of elements) {
    if (!ids.has(element.id) || typeof element.position.groupId !== 'string') continue;
    const groupId = element.position.groupId;
    elements.forEach((candidate) => {
      if (candidate.position.groupId === groupId) ids.add(candidate.id);
    });
  }
  return elements.filter((element) => ids.has(element.id)).map((element) => structuredClone(element));
};

export const copyStudioElementFormat = (element: StudioElement): StudioCopiedFormat => {
  const family = studioElementFormatFamily(element);
  const allowed = family === 'text' ? TEXT_FORMAT_KEYS : family === 'shape' ? SHAPE_FORMAT_KEYS : family === 'picture' ? PICTURE_FORMAT_KEYS : FORMAT_KEYS;
  return { family, values: Object.fromEntries(Object.entries(element.content).filter(([key]) => allowed.has(key)).map(([key, value]) => [key, structuredClone(value)])) };
};

export const applyStudioElementFormat = (
  element: StudioElement,
  format: StudioCopiedFormat,
): StudioElement => studioElementFormatFamily(element) === format.family
  ? { ...element, content: { ...element.content, ...structuredClone(format.values) } }
  : element;

const destinationThemeContent = (element: StudioElement) => {
  const content = { ...structuredClone(element.content) };
  FORMAT_KEYS.forEach((key) => delete content[key]);
  delete content.richTextHtml;
  if (TEXT_TYPES.has(element.type)) {
    return { ...content, color: '#0f172a', fontFamily: 'Arial', fontSize: 32, alignment: 'left' };
  }
  if (element.type === 'shape') {
    return { ...content, fill: '#dbeafe', stroke: '#1d4ed8', strokeWidth: 2, opacity: 1 };
  }
  return content;
};

const pictureDataUrl = (element: StudioElement) => {
  const width = Math.max(80, Number(element.position.width) || 400);
  const height = Math.max(60, Number(element.position.height) || 240);
  const background = String(element.content.backgroundColor || element.content.fill || '#ffffff');
  const foreground = String(element.content.color || element.content.stroke || '#0f172a');
  const borderWidth = Math.max(0, Number(element.content.borderWidth ?? element.content.strokeWidth) || 0);
  const fontSize = Math.max(12, Math.min(96, Number(element.content.fontSize) || 32));
  const lines = studioElementText(element).split(/\r?\n/).slice(0, 12);
  const text = lines.map((line, index) =>
    `<text x="${width / 2}" y="${Math.min(height - 12, height / 2 + (index - (lines.length - 1) / 2) * fontSize * 1.25)}" text-anchor="middle" dominant-baseline="middle" fill="${escapeXml(foreground)}" font-family="${escapeXml(element.content.fontFamily || 'Arial')}" font-size="${fontSize}" font-weight="${element.content.bold === true ? '700' : '400'}">${escapeXml(line)}</text>`,
  ).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" rx="${Math.max(0, Number(element.content.borderRadius) || 0)}" fill="${escapeXml(background)}" stroke="${escapeXml(foreground)}" stroke-width="${borderWidth}"/>${text}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const transformForPasteMode = (element: StudioElement, mode: StudioPasteMode): StudioElement => {
  if (mode === 'destination-theme') {
    return { ...element, content: destinationThemeContent(element) };
  }
  if (mode === 'text-only') {
    return {
      ...element,
      type: 'text',
      resource: undefined,
      zoom: undefined,
      content: {
        text: studioElementText(element),
        color: '#0f172a',
        fontFamily: 'Arial',
        fontSize: 32,
        alignment: 'left',
      },
    };
  }
  if (mode === 'picture') {
    const existingImageUrl = typeof element.content.url === 'string' && element.content.url ? element.content.url : undefined;
    const imageResource = ['image', 'animation'].includes(resourceTypeOf(element)) ? element.resource : undefined;
    return {
      ...element,
      type: 'visual',
      resource: imageResource,
      zoom: undefined,
      content: {
        text: `${studioElementText(element)} picture`,
        altText: studioElementText(element),
        url: existingImageUrl || pictureDataUrl(element),
        mimeType: existingImageUrl ? String(element.content.mimeType || 'image/*') : 'image/svg+xml',
        source: 'drag-drop',
        pasteMode: 'picture',
      },
    };
  }
  return element;
};

export const applyStudioPasteMode = (elements: StudioElement[], mode: StudioPasteMode) =>
  elements.map((element) => transformForPasteMode(structuredClone(element), mode));

export const pasteStudioClipboardElements = (
  sources: StudioElement[],
  mode: StudioPasteMode,
  createToken: () => string = () => (
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  ),
) => {
  const groupIds = new Map<string, string>();
  return sources.map((source) => {
    const transformed = transformForPasteMode(structuredClone(source), mode);
    const token = createToken();
    const id = `element-${token}`;
    const width = Number(transformed.position.width) || 400;
    const height = Number(transformed.position.height) || 240;
    const previousGroupId = typeof transformed.position.groupId === 'string'
      ? transformed.position.groupId
      : null;
    let groupId: string | undefined;
    if (previousGroupId) {
      if (!groupIds.has(previousGroupId)) groupIds.set(previousGroupId, `group-${createToken()}`);
      groupId = groupIds.get(previousGroupId);
    }
    const position = {
      ...transformed.position,
      x: Math.min((Number(transformed.position.x) || 0) + 40, 1920 - width),
      y: Math.min((Number(transformed.position.y) || 0) + 40, 1080 - height),
    };
    if (groupId) position.groupId = groupId;
    else delete position.groupId;
    return {
      ...transformed,
      id,
      slotId: `free-${id}`,
      position,
      resource: transformed.resource
        ? {
          ...transformed.resource,
          usage: { ...transformed.resource.usage, slot_id: `free-${id}` },
        }
        : undefined,
    };
  });
};
