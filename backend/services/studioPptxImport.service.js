import path from 'node:path';
import { createHash } from 'node:crypto';
import AdmZip from 'adm-zip';
import { parseStringPromise } from 'xml2js';
import { AppError } from '../utils/errors.js';
import { IMPORT_SCHEMA_VERSION, commitImportDocument, importIssue } from './studioImportFoundation.service.js';

const LIMITS = Object.freeze({
  compressedBytes: 100 * 1024 * 1024,
  slides: 100,
  entries: 5000,
  expandedBytes: 500 * 1024 * 1024,
  entryBytes: 50 * 1024 * 1024,
  compressionRatio: 200,
});
const EMU_PER_POINT = 12700;
const MIME_BY_EXTENSION = Object.freeze({
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.bmp': 'image/bmp', '.tif': 'image/tiff', '.tiff': 'image/tiff',
});
const SHAPE_KIND = Object.freeze({
  rect: 'rectangle', roundRect: 'rounded-rectangle', ellipse: 'ellipse', triangle: 'triangle', rtTriangle: 'right-triangle',
  diamond: 'diamond', pentagon: 'pentagon', hexagon: 'hexagon', heptagon: 'heptagon', octagon: 'octagon',
  parallelogram: 'parallelogram', trapezoid: 'trapezoid', plus: 'plus', heart: 'heart', cloud: 'cloud', arc: 'arc',
  star4: 'star-4', star5: 'star-5', star6: 'star-6', star8: 'star-8', star10: 'star-10', star12: 'star-12',
  line: 'line', straightConnector1: 'line', bentConnector2: 'elbow-connector', bentConnector3: 'elbow-connector',
  curvedConnector2: 'curved-connector', curvedConnector3: 'curved-connector',
  rightArrow: 'right-arrow', leftArrow: 'left-arrow', upArrow: 'up-arrow', downArrow: 'down-arrow',
  leftRightArrow: 'left-right-arrow', upDownArrow: 'up-down-arrow', quadArrow: 'quad-arrow',
  bentArrow: 'bent-arrow', uturnArrow: 'u-turn-arrow', circularArrow: 'circular-arrow',
  curvedRightArrow: 'curved-arrow', notchedRightArrow: 'notched-arrow',
  homePlate: 'notched-arrow', leftRightUpArrow: 'quad-arrow',
  flowChartProcess: 'flowchart-process', flowChartDecision: 'flowchart-decision', flowChartTerminator: 'flowchart-terminator',
  wedgeRectCallout: 'rectangular-callout', wedgeRoundRectCallout: 'rounded-callout', wedgeEllipseCallout: 'oval-callout',
});
const PRESET_COLORS = Object.freeze({
  black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff',
  yellow: '#ffff00', cyan: '#00ffff', magenta: '#ff00ff', gray: '#808080', grey: '#808080',
  dkGray: '#404040', ltGray: '#c0c0c0', orange: '#ffa500', purple: '#800080', brown: '#a52a2a',
  transparent: 'transparent',
});
const FONT_SUBSTITUTIONS = Object.freeze({
  aptos: 'Arial', 'aptos display': 'Arial', calibri: 'Arial', 'calibri light': 'Arial', cambria: 'Georgia',
  'times new roman': 'Times New Roman', arial: 'Arial', georgia: 'Georgia', verdana: 'Verdana', tahoma: 'Tahoma',
});
const UNSAFE_XML = /<!DOCTYPE|<!ENTITY/i;

const localName = (name = '') => String(name).split(':').pop();
const children = (node) => Array.isArray(node?.$$) ? node.$$ : [];
const child = (node, name) => children(node).find((entry) => localName(entry?.['#name']) === name)
  || (node && typeof node === 'object' ? node[`a:${name}`] || node[`p:${name}`] || node[name] : undefined);
const childList = (node, name) => children(node).filter((entry) => localName(entry?.['#name']) === name);
const descendants = (node, name, output = []) => {
  for (const entry of children(node)) {
    if (localName(entry?.['#name']) === name) output.push(entry);
    descendants(entry, name, output);
  }
  return output;
};
const attr = (node, name, fallback = undefined) => {
  const attributes = node?.$ || {};
  const key = Object.keys(attributes).find((candidate) => candidate === name || localName(candidate) === name);
  return key === undefined ? fallback : attributes[key];
};
const numberAttr = (node, name, fallback = 0) => {
  const value = Number(attr(node, name));
  return Number.isFinite(value) ? value : fallback;
};
const textValue = (node) => typeof node === 'string' ? node : String(node?._ ?? '');
const normalizeOfficeSymbols = (value) => String(value ?? '').replace(/[\uf000-\uf0ff]/g, (character) => ({
  '\uf0d0': '∠',
  '\uf0d8': '➢',
  '\uf0e0': '→',
}[character] || character));
const normalizedBulletCharacter = (paragraphProperties) => {
  const bullet = child(paragraphProperties, 'buChar');
  if (!bullet) return '';
  const raw = String(attr(bullet, 'char', '') || '');
  const typeface = String(attr(child(paragraphProperties, 'buFont'), 'typeface', '') || '').toLowerCase();
  if (typeface.includes('wingdings') && raw === 'Ø') return '➢';
  return normalizeOfficeSymbols(raw);
};
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));
const cleanFileName = (value) => path.basename(String(value || 'presentation.pptx')).replace(/[^a-zA-Z0-9_. -]/g, '_').slice(0, 180);
const positive = (value, fallback = 1) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;

const parseXml = async (xml, label) => {
  if (UNSAFE_XML.test(xml)) throw new AppError(`${label} contains forbidden XML declarations`, 422, 'PPTX_UNSAFE_XML');
  try {
    return await parseStringPromise(xml, {
      explicitArray: false,
      explicitChildren: true,
      preserveChildrenOrder: true,
      childkey: '$$',
      charsAsChildren: false,
      trim: false,
    });
  } catch {
    throw new AppError(`${label} is not valid XML`, 422, 'PPTX_INVALID_XML');
  }
};

const relationshipPartFor = (partName) => {
  const directory = path.posix.dirname(partName);
  return path.posix.join(directory, '_rels', `${path.posix.basename(partName)}.rels`);
};
const safePartTarget = (sourcePart, target) => {
  const raw = String(target || '').replaceAll('\\', '/');
  const resolved = raw.startsWith('/')
    ? path.posix.normalize(raw.slice(1))
    : path.posix.normalize(path.posix.join(path.posix.dirname(sourcePart), raw));
  if (!resolved || resolved.startsWith('../') || resolved.includes('/../') || path.posix.isAbsolute(resolved)) return null;
  return resolved;
};

const relationshipsFor = async (packageView, partName) => {
  const relationshipPart = relationshipPartFor(partName);
  if (!packageView.entries.has(relationshipPart)) return new Map();
  const xml = packageView.text(relationshipPart);
  if (UNSAFE_XML.test(xml)) throw new AppError(`${relationshipPart} contains forbidden XML declarations`, 422, 'PPTX_UNSAFE_XML');
  const attributeValue = (source, name) => source.match(new RegExp(`\\b${name}="([^"]*)"`, 'i'))?.[1] || '';
  const rows = [...xml.matchAll(/<Relationship\b([^>]*)\/?\s*>/gi)].map((match) => match[1]);
  return new Map(rows.map((attributes) => {
    const id = attributeValue(attributes, 'Id');
    const external = attributeValue(attributes, 'TargetMode').toLowerCase() === 'external';
    const target = attributeValue(attributes, 'Target');
    return [id, {
      id,
      type: attributeValue(attributes, 'Type'),
      external,
      target: external ? target : safePartTarget(partName, target),
    }];
  }).filter(([id]) => Boolean(id)));
};

const openPackage = (buffer, fileName) => {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw new AppError('Choose a PowerPoint .pptx file', 400, 'PPTX_FILE_REQUIRED');
  if (buffer.length > LIMITS.compressedBytes) throw new AppError('PowerPoint file exceeds the 100 MB limit', 413, 'PPTX_FILE_TOO_LARGE');
  const extension = path.extname(String(fileName || '')).toLowerCase();
  if (extension !== '.pptx') throw new AppError('Only password-free .pptx files are supported', 422, 'PPTX_EXTENSION_UNSUPPORTED');
  let zip;
  try { zip = new AdmZip(buffer); } catch { throw new AppError('The PowerPoint package is unreadable or encrypted', 422, 'PPTX_PACKAGE_INVALID'); }
  const rawEntries = zip.getEntries().filter((entry) => !entry.isDirectory);
  if (rawEntries.length > LIMITS.entries) throw new AppError('PowerPoint package has too many files', 422, 'PPTX_ENTRY_LIMIT');
  const entries = new Map();
  let expandedBytes = 0;
  let compressedBytes = 0;
  for (const entry of rawEntries) {
    const name = entry.entryName.replaceAll('\\', '/');
    const normalized = path.posix.normalize(name);
    if (!name || name.startsWith('/') || normalized.startsWith('../') || normalized.includes('/../') || normalized !== name) {
      throw new AppError('PowerPoint package contains an unsafe file path', 422, 'PPTX_UNSAFE_PATH');
    }
    const unixMode = (Number(entry.attr || 0) >>> 16) & 0o170000;
    if (unixMode === 0o120000) throw new AppError('PowerPoint package contains an unsupported symbolic link', 422, 'PPTX_UNSAFE_SYMLINK');
    if ((Number(entry.header?.flags || 0) & 1) !== 0) throw new AppError('Encrypted PowerPoint files are not supported', 422, 'PPTX_ENCRYPTED');
    const size = Number(entry.header?.size || 0);
    const compressed = Number(entry.header?.compressedSize || 0);
    if (size > LIMITS.entryBytes) throw new AppError(`PowerPoint entry ${name} exceeds the 50 MB limit`, 422, 'PPTX_ENTRY_TOO_LARGE');
    expandedBytes += size;
    compressedBytes += compressed;
    entries.set(name, entry);
  }
  if (expandedBytes > LIMITS.expandedBytes) throw new AppError('Expanded PowerPoint package exceeds the 500 MB limit', 422, 'PPTX_EXPANDED_TOO_LARGE');
  if (compressedBytes > 0 && expandedBytes / compressedBytes > LIMITS.compressionRatio) {
    throw new AppError('PowerPoint package compression ratio is unsafe', 422, 'PPTX_COMPRESSION_RATIO');
  }
  if (!entries.has('[Content_Types].xml') || !entries.has('ppt/presentation.xml')) {
    throw new AppError('The selected file is not a valid PowerPoint presentation', 422, 'PPTX_STRUCTURE_INVALID');
  }
  if ([...entries.keys()].some((name) => /vbaProject\.bin$|activeX/i.test(name))) {
    throw new AppError('Macro-enabled or ActiveX PowerPoint packages are not supported', 422, 'PPTX_ACTIVE_CONTENT');
  }
  return {
    entries,
    bytes(name) { return entries.get(name)?.getData(); },
    text(name) { return entries.get(name)?.getData().toString('utf8') || ''; },
    metrics: { compressedBytes: buffer.length, expandedBytes, entryCount: entries.size },
  };
};

const rootOf = (document) => document[Object.keys(document)[0]];
const firstDescendant = (node, name) => descendants(node, name, [])[0];
const colorMapFromTheme = (themeRoot) => {
  const scheme = firstDescendant(themeRoot, 'clrScheme');
  const map = {};
  for (const entry of children(scheme)) {
    const token = localName(entry['#name']);
    const rgb = firstDescendant(entry, 'srgbClr');
    const system = firstDescendant(entry, 'sysClr');
    const value = attr(rgb, 'val') || attr(system, 'lastClr');
    if (value) map[token] = `#${String(value).replace(/^#/, '')}`;
  }
  return map;
};
const applyThemeAliases = (themeColors, ...roots) => {
  const aliases = {};
  for (const root of roots) {
    const map = firstDescendant(root, 'clrMap');
    if (map?.$) Object.assign(aliases, map.$);
    const override = firstDescendant(root, 'overrideClrMapping');
    if (override?.$) Object.assign(aliases, override.$);
  }
  for (const [alias, target] of Object.entries(aliases)) {
    if (themeColors[target]) themeColors[alias] = themeColors[target];
  }
  themeColors.tx1 ||= themeColors.dk1;
  themeColors.tx2 ||= themeColors.dk2;
  themeColors.bg1 ||= themeColors.lt1;
  themeColors.bg2 ||= themeColors.lt2;
  return themeColors;
};
const themeFontMap = (themeRoot) => {
  const major = firstDescendant(themeRoot, 'majorFont');
  const minor = firstDescendant(themeRoot, 'minorFont');
  return {
    '+mj-lt': attr(child(major, 'latin'), 'typeface', 'Arial'),
    '+mn-lt': attr(child(minor, 'latin'), 'typeface', 'Arial'),
  };
};
const transformedColor = (hex, colorNode, compositeAlpha = false) => {
  if (!/^#[0-9a-f]{6}$/i.test(String(hex || ''))) return hex;
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  const lumMod = numberAttr(child(colorNode, 'lumMod'), 'val', 100000) / 100000;
  const lumOff = numberAttr(child(colorNode, 'lumOff'), 'val', 0) / 100000;
  const tint = numberAttr(child(colorNode, 'tint'), 'val', 0) / 100000;
  const shadeNode = child(colorNode, 'shade');
  const shade = shadeNode ? numberAttr(shadeNode, 'val', 100000) / 100000 : 1;
  let adjusted = channels.map((channel) => Math.max(0, Math.min(255, (channel * lumMod + 255 * lumOff) * shade)));
  if (tint > 0) adjusted = adjusted.map((channel) => channel + (255 - channel) * tint);
  if (compositeAlpha) {
    const alpha = numberAttr(child(colorNode, 'alpha'), 'val', 100000) / 100000;
    adjusted = adjusted.map((channel) => channel * alpha + 255 * (1 - alpha));
  }
  return `#${adjusted.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
};
const colorFrom = (node, themeColors, fallback = undefined, options = {}) => {
  const solid = localName(node?.['#name']) === 'solidFill' ? node : firstDescendant(node, 'solidFill');
  const gradient = localName(node?.['#name']) === 'gradFill' ? node : firstDescendant(node, 'gradFill');
  const directColor = child(node, 'srgbClr') || child(node, 'schemeClr') || child(node, 'sysClr') || child(node, 'prstClr');
  const colorOwner = solid || firstDescendant(gradient, 'gs') || (directColor ? node : null);
  if (!colorOwner) return fallback;
  const rgb = child(colorOwner, 'srgbClr');
  if (rgb) return transformedColor(`#${String(attr(rgb, 'val', '000000')).replace(/^#/, '')}`, rgb, options.compositeAlpha);
  const scheme = child(colorOwner, 'schemeClr');
  if (scheme) return transformedColor(themeColors[attr(scheme, 'val')] || fallback, scheme, options.compositeAlpha);
  const system = child(colorOwner, 'sysClr');
  if (system) return transformedColor(`#${String(attr(system, 'lastClr', '000000')).replace(/^#/, '')}`, system, options.compositeAlpha);
  const preset = child(colorOwner, 'prstClr');
  if (preset) return transformedColor(PRESET_COLORS[attr(preset, 'val')] || fallback, preset, options.compositeAlpha);
  return fallback;
};

const transformFrom = (owner) => {
  const properties = child(owner, 'spPr') || owner;
  const xfrm = child(properties, 'xfrm') || firstDescendant(properties, 'xfrm');
  if (!xfrm) return null;
  const off = child(xfrm, 'off');
  const ext = child(xfrm, 'ext');
  return {
    x: numberAttr(off, 'x'), y: numberAttr(off, 'y'),
    width: positive(numberAttr(ext, 'cx'), EMU_PER_POINT * 10),
    height: positive(numberAttr(ext, 'cy'), EMU_PER_POINT * 10),
    rotation: numberAttr(xfrm, 'rot') / 60000,
    flipH: String(attr(xfrm, 'flipH', '0')) === '1',
    flipV: String(attr(xfrm, 'flipV', '0')) === '1',
    xfrm,
  };
};
const groupContextFrom = (group, parent) => {
  const xfrm = firstDescendant(child(group, 'grpSpPr') || group, 'xfrm');
  if (!xfrm) return parent;
  const off = child(xfrm, 'off');
  const ext = child(xfrm, 'ext');
  const chOff = child(xfrm, 'chOff');
  const chExt = child(xfrm, 'chExt');
  const local = {
    x: numberAttr(off, 'x'), y: numberAttr(off, 'y'), width: positive(numberAttr(ext, 'cx')), height: positive(numberAttr(ext, 'cy')),
    childX: numberAttr(chOff, 'x'), childY: numberAttr(chOff, 'y'),
    childWidth: positive(numberAttr(chExt, 'cx')), childHeight: positive(numberAttr(chExt, 'cy')),
  };
  if (!parent) return local;
  const projectedX = parent.x + ((local.x - parent.childX) * parent.width / parent.childWidth);
  const projectedY = parent.y + ((local.y - parent.childY) * parent.height / parent.childHeight);
  return {
    x: projectedX, y: projectedY,
    width: local.width * parent.width / parent.childWidth,
    height: local.height * parent.height / parent.childHeight,
    childX: local.childX, childY: local.childY, childWidth: local.childWidth, childHeight: local.childHeight,
  };
};
const applyGroupTransform = (transform, group) => !group ? transform : ({
  ...transform,
  x: group.x + ((transform.x - group.childX) * group.width / group.childWidth),
  y: group.y + ((transform.y - group.childY) * group.height / group.childHeight),
  width: transform.width * group.width / group.childWidth,
  height: transform.height * group.height / group.childHeight,
});

const placeholderIdentity = (shape) => {
  const placeholder = firstDescendant(child(shape, 'nvSpPr') || shape, 'ph');
  return placeholder ? { type: attr(placeholder, 'type', 'body'), index: String(attr(placeholder, 'idx', '0')) } : null;
};
const placeholderKey = (identity) => identity ? `${identity.type}:${identity.index}` : '';
const placeholderShapes = (tree) => new Map(children(tree).filter((entry) => localName(entry['#name']) === 'sp').map((shape) => [placeholderKey(placeholderIdentity(shape)), shape]).filter(([key]) => key));
const inheritedTransform = (shape, layoutPlaceholders, masterPlaceholders) => {
  const direct = transformFrom(shape);
  if (direct) return direct;
  const key = placeholderKey(placeholderIdentity(shape));
  return transformFrom(layoutPlaceholders.get(key)) || transformFrom(masterPlaceholders.get(key));
};

const normalizeFont = (raw, issues, context) => {
  const requested = String(raw || 'Arial').trim() || 'Arial';
  const replacement = FONT_SUBSTITUTIONS[requested.toLowerCase()] || requested;
  if (replacement !== requested) issues.push(importIssue({
    severity: 'info', code: 'PPTX_FONT_SUBSTITUTED', message: `${requested} was substituted with ${replacement}`,
    sourceScreenId: context.screenId, sourceElementId: context.elementId,
    fallbackApplied: 'font-substitution', details: { requested, replacement },
  }));
  return replacement;
};
const runFormatting = (run, themeColors, themeFonts, issues, context, defaultTextColor) => {
  const properties = child(run, 'rPr') || child(run, 'defRPr');
  const typefaceNode = child(properties, 'latin');
  let typeface = attr(typefaceNode, 'typeface', 'Arial');
  typeface = themeFonts[typeface] || typeface;
  const size = numberAttr(properties, 'sz', 1800) / 100;
  const baseline = numberAttr(properties, 'baseline', 0);
  const outline = child(properties, 'ln');
  return {
    fontFamily: normalizeFont(typeface, issues, context), fontSize: positive(size, 18),
    bold: String(attr(properties, 'b', '0')) === '1', italic: String(attr(properties, 'i', '0')) === '1',
    underline: !['', 'none'].includes(String(attr(properties, 'u', 'none'))),
    // A run outline may itself contain a solidFill; it is not the glyph fill.
    // Only direct run fills override the shape's fontRef colour.
    color: colorFrom(child(properties, 'solidFill') || child(properties, 'gradFill'), themeColors, defaultTextColor),
    textStrokeColor: outline && !child(outline, 'noFill') ? colorFrom(outline, themeColors, 'transparent') : 'transparent',
    textStrokeWidth: outline && !child(outline, 'noFill') ? Math.max(0.75, numberAttr(outline, 'w', EMU_PER_POINT) / EMU_PER_POINT) : 0,
    verticalAlign: baseline > 0 ? 'super' : baseline < 0 ? 'sub' : null,
  };
};
const styleString = (format, fontScale) => [
  `font-family:${String(format.fontFamily).replace(/[;{}]/g, '')}`,
  `font-size:${Number((format.fontSize * fontScale).toFixed(3))}px`, `color:${format.color}`,
  format.bold ? 'font-weight:700' : '', format.italic ? 'font-style:italic' : '',
  format.underline ? 'text-decoration:underline' : '', format.verticalAlign ? `vertical-align:${format.verticalAlign}` : '',
  format.textStrokeWidth > 0 && format.textStrokeColor !== 'transparent'
    ? `-webkit-text-stroke:${Number((format.textStrokeWidth * fontScale).toFixed(3))}px ${format.textStrokeColor}` : '',
].filter(Boolean).join(';');
const textContentFrom = (shape, relationships, themeColors, themeFonts, issues, context, fontScale, canvasScale) => {
  const body = child(shape, 'txBody');
  if (!body) return null;
  const bodyProperties = child(body, 'bodyPr');
  const paragraphs = childList(body, 'p');
  const fontReference = child(child(shape, 'style'), 'fontRef');
  const defaultTextColor = colorFrom(fontReference, themeColors, '#0f2747');
  const plainParagraphs = [];
  const htmlParagraphs = [];
  let firstFormat = null;
  let firstAlignment = 'left';
  let firstParagraphProperties = null;
  for (const paragraph of paragraphs) {
    const paragraphProperties = child(paragraph, 'pPr');
    if (!firstParagraphProperties) firstParagraphProperties = paragraphProperties;
    const alignment = ({ ctr: 'center', r: 'right', just: 'justify' }[attr(paragraphProperties, 'algn')] || 'left');
    if (!plainParagraphs.length) firstAlignment = alignment;
    const bulletCharacter = normalizedBulletCharacter(paragraphProperties);
    const automaticBullet = Boolean(child(paragraphProperties, 'buAutoNum'));
    const fragments = [];
    const plain = [];
    for (const run of children(paragraph).filter((entry) => ['r', 'fld', 'br'].includes(localName(entry['#name'])))) {
      if (localName(run['#name']) === 'br') { plain.push('\n'); fragments.push('<br>'); continue; }
      const value = normalizeOfficeSymbols(textValue(child(run, 't')));
      const format = runFormatting(run, themeColors, themeFonts, issues, context, defaultTextColor);
      if (!firstFormat) firstFormat = format;
      const linkNode = firstDescendant(child(run, 'rPr') || run, 'hlinkClick');
      const relationship = relationships.get(attr(linkNode, 'id'));
      const escaped = escapeHtml(value).replace(/\n/g, '<br>');
      const span = `<span style="${styleString(format, fontScale)}">${escaped}</span>`;
      const safeLink = relationship?.external && /^(?:https?:|mailto:)/i.test(relationship.target) ? relationship.target : null;
      fragments.push(safeLink ? `<a href="${escapeHtml(safeLink)}">${span}</a>` : span);
      plain.push(value);
    }
    if (bulletCharacter) {
      const markerFormat = firstFormat || { fontFamily: 'Arial', fontSize: 18, color: defaultTextColor, bold: false, italic: false, underline: false, textStrokeWidth: 0, textStrokeColor: 'transparent' };
      const marker = `<span style="${styleString(markerFormat, fontScale)}">${escapeHtml(`${bulletCharacter} `)}</span>`;
      htmlParagraphs.push(`<p style="text-align:${alignment}">${marker}${fragments.join('')}</p>`);
      plainParagraphs.push(`${bulletCharacter} ${plain.join('')}`);
    } else {
      const tag = automaticBullet ? 'li' : 'p';
      htmlParagraphs.push(`<${tag} style="text-align:${alignment}">${fragments.join('')}</${tag}>`);
      plainParagraphs.push(plain.join(''));
    }
  }
  const text = plainParagraphs.join('\n');
  if (!text.trim()) return null;
  const format = firstFormat || { fontFamily: 'Arial', fontSize: 18, color: '#0f2747', bold: false, italic: false, underline: false };
  const hasList = htmlParagraphs.some((value) => value.startsWith('<li'));
  const lineSpacing = firstDescendant(firstParagraphProperties, 'lnSpc');
  const linePercent = firstDescendant(lineSpacing, 'spcPct');
  const linePoints = firstDescendant(lineSpacing, 'spcPts');
  const lineHeight = linePercent
    ? Math.max(0.5, numberAttr(linePercent, 'val', 100000) / 100000)
    : linePoints ? Math.max(0.5, (numberAttr(linePoints, 'val', format.fontSize * 100) / 100) / Math.max(1, format.fontSize)) : 1;
  const spacingInCanvasPixels = (name) => {
    const owner = firstDescendant(firstParagraphProperties, name);
    const points = firstDescendant(owner, 'spcPts');
    return points ? Number(((numberAttr(points, 'val', 0) / 100) * fontScale).toFixed(3)) : 0;
  };
  return {
    text,
    richTextHtml: hasList ? `<ul>${htmlParagraphs.join('')}</ul>` : htmlParagraphs.join(''),
    fontFamily: format.fontFamily, fontSize: Number((format.fontSize * fontScale).toFixed(3)), color: format.color,
    bold: format.bold, italic: format.italic, underline: format.underline,
    textStrokeColor: format.textStrokeColor, textStrokeWidth: Number((format.textStrokeWidth * fontScale).toFixed(3)),
    alignment: firstAlignment,
    lineHeight,
    paragraphSpacingBefore: spacingInCanvasPixels('spcBef'),
    paragraphSpacingAfter: spacingInCanvasPixels('spcAft'),
    verticalAlignment: ({ ctr: 'middle', b: 'bottom' }[attr(bodyProperties, 'anchor')] || 'top'),
    margins: {
      left: Number((numberAttr(bodyProperties, 'lIns', 91440) * canvasScale).toFixed(3)),
      right: Number((numberAttr(bodyProperties, 'rIns', 91440) * canvasScale).toFixed(3)),
      top: Number((numberAttr(bodyProperties, 'tIns', 45720) * canvasScale).toFixed(3)),
      bottom: Number((numberAttr(bodyProperties, 'bIns', 45720) * canvasScale).toFixed(3)),
    },
    marginsUnit: 'canvas-px',
  };
};

const gradientFrom = (properties, themeColors) => {
  const gradient = child(properties, 'gradFill');
  if (!gradient) return null;
  const stops = childList(firstDescendant(gradient, 'gsLst'), 'gs').map((stop) => ({
    position: Math.max(0, Math.min(1, numberAttr(stop, 'pos', 0) / 100000)),
    color: colorFrom(stop, themeColors, '#ffffff'),
  }));
  if (stops.length < 2) return null;
  const linear = firstDescendant(gradient, 'lin');
  return {
    angle: linear ? numberAttr(linear, 'ang', 0) / 60000 : 0,
    stops,
  };
};

const shapeStyle = (shape, themeColors, hasText = false) => {
  const properties = child(shape, 'spPr') || {};
  const line = child(properties, 'ln');
  const preset = child(child(properties, 'prstGeom') || {}, 'avLst');
  void preset;
  const opacityNode = firstDescendant(firstDescendant(properties, 'solidFill') || {}, 'alpha');
  const effects = firstDescendant(properties, 'effectLst');
  const glow = effects && firstDescendant(effects, 'glow');
  const shadow = effects && firstDescendant(effects, 'outerShdw');
  const shapeEffect = glow ? 'glow'
    : shadow ? 'shadow'
      : 'none';
  return {
    fill: child(properties, 'noFill') ? 'transparent' : colorFrom(child(properties, 'solidFill') || child(properties, 'gradFill'), themeColors, hasText ? 'transparent' : '#ffffff'),
    gradient: gradientFrom(properties, themeColors),
    stroke: !line || child(line, 'noFill') ? 'transparent' : colorFrom(child(line, 'solidFill') || child(line, 'gradFill'), themeColors, '#1e3a5f'),
    strokeWidth: Math.max(0, numberAttr(line, 'w', 12700) / EMU_PER_POINT),
    opacity: opacityNode ? Math.max(0, Math.min(1, numberAttr(opacityNode, 'val', 100000) / 100000)) : 1,
    strokeDash: attr(child(line, 'prstDash'), 'val', 'solid'),
    shapeEffect,
    shapeEffectColor: colorFrom(glow || shadow, themeColors, shapeEffect === 'shadow' ? '#0f172a' : '#2563eb'),
  };
};
const nonVisual = (shape) => firstDescendant(shape, 'cNvPr');
const sourceElementId = (shape, fallback) => String(attr(nonVisual(shape), 'id', fallback));
const metadataFor = (shape) => ({
  name: String(attr(nonVisual(shape), 'name', '') || ''),
  alt_text: String(attr(nonVisual(shape), 'descr', '') || attr(nonVisual(shape), 'title', '') || ''),
});
const shapeKindFromName = (name) => {
  const normalized = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (normalized.includes('curved right arrow') || normalized.includes('curved arrow')) return 'curved-arrow';
  if (normalized.includes('right arrow')) return 'right-arrow';
  if (normalized.includes('left arrow')) return 'left-arrow';
  if (normalized.includes('right triangle')) return 'right-triangle';
  if (normalized.includes('rounded rectangle')) return 'rounded-rectangle';
  return null;
};

const mediaTypeFor = (partName) => MIME_BY_EXTENSION[path.extname(partName).toLowerCase()] || null;
const validateImage = (bytes, mediaType, partName) => {
  if (!mediaType) throw new AppError(`Unsupported PowerPoint image type: ${path.extname(partName) || 'unknown'}`, 422, 'PPTX_IMAGE_UNSUPPORTED');
  const signatures = {
    'image/png': () => bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')),
    'image/jpeg': () => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
    'image/gif': () => bytes.length >= 6 && /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString('ascii')),
    'image/webp': () => bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP',
  };
  if (signatures[mediaType] && !signatures[mediaType]()) {
    throw new AppError(`PowerPoint image ${path.posix.basename(partName)} does not match its declared type`, 422, 'PPTX_IMAGE_SIGNATURE_INVALID');
  }
  if (mediaType === 'image/svg+xml') {
    const source = bytes.toString('utf8');
    if (/<script\b|<foreignObject\b|(?:href|src)\s*=\s*["'](?:https?:|javascript:|data:text\/html)/i.test(source)) {
      throw new AppError('An SVG in the presentation contains unsafe active content', 422, 'PPTX_UNSAFE_SVG');
    }
  }
};

const placeholderElement = ({ id, bounds, zIndex, message, metadata, groupId }) => ({
  source_id: id, kind: 'shape', bounds, z_index: zIndex,
  content: { kind: 'rectangle', fill: '#fff7ed', stroke: '#f97316', strokeWidth: 2, text: message, color: '#9a3412', fontSize: 18, alignment: 'center', verticalAlignment: 'middle' },
  metadata: { ...metadata, unsupported: true }, ...(groupId ? { group: { source_id: groupId } } : {}),
});
const effectiveFallback = (fallback) => fallback === 'skip' ? 'skip' : 'placeholder';

const collectSlideElements = ({
  packageView, slidePart, slideRoot, slideRelationships, layoutPlaceholders, masterPlaceholders,
  themeColors, themeFonts, issues, resources, fallback,
  fontScale, canvasScale,
}) => {
  const tree = firstDescendant(slideRoot, 'spTree');
  const output = [];
  const seenResources = new Set(resources.map((resource) => resource.source_id));
  const screenId = slidePart;
  let zIndex = 0;
  const visit = (entry, groupContext = null, groupId = null) => {
    const kind = localName(entry?.['#name']);
    if (['nvGrpSpPr', 'grpSpPr'].includes(kind)) return;
    if (kind === 'grpSp') {
      const groupSourceId = `${sourceElementId(entry, `group-${zIndex}`)}-${zIndex}`;
      const nextContext = groupContextFrom(entry, groupContext);
      for (const nested of children(entry)) visit(nested, nextContext, groupSourceId);
      return;
    }
    const baseTransform = kind === 'sp' ? inheritedTransform(entry, layoutPlaceholders, masterPlaceholders) : transformFrom(entry);
    if (!baseTransform) return;
    const transform = applyGroupTransform(baseTransform, groupContext);
    const bounds = { x: transform.x, y: transform.y, width: transform.width, height: transform.height };
    const id = `${kind}-${sourceElementId(entry, zIndex + 1)}-${zIndex + 1}`;
    const metadata = metadataFor(entry);
    const group = groupId ? { source_id: groupId } : undefined;
    if (kind === 'pic') {
      const blip = firstDescendant(entry, 'blip');
      const relationship = slideRelationships.get(attr(blip, 'embed'));
      const mediaPart = relationship?.target;
      const mediaType = mediaPart ? mediaTypeFor(mediaPart) : null;
      if (!mediaPart || !packageView.entries.has(mediaPart) || !mediaType) {
        issues.push(importIssue({ severity: 'warning', code: 'PPTX_IMAGE_UNSUPPORTED', message: `Image ${metadata.name || id} could not be converted`, sourceScreenId: screenId, sourceElementId: id, fallbackApplied: effectiveFallback(fallback) }));
        if (fallback !== 'skip') output.push(placeholderElement({ id, bounds, zIndex, message: 'Unsupported PowerPoint image', metadata, groupId }));
        zIndex += 1;
        return;
      }
      const bytes = packageView.bytes(mediaPart);
      validateImage(bytes, mediaType, mediaPart);
      const resourceId = `pptx:${mediaPart}`;
      if (!seenResources.has(resourceId)) {
        resources.push({
          source_id: resourceId, file_name: path.posix.basename(mediaPart), media_type: mediaType, bytes,
          sha256: createHash('sha256').update(bytes).digest('hex'), metadata: { name: metadata.name || path.posix.basename(mediaPart), alt_text: metadata.alt_text, package_part: mediaPart },
        });
        seenResources.add(resourceId);
      }
      const sourceRect = firstDescendant(entry, 'srcRect');
      const crop = sourceRect ? {
        cropped: true, edgeCrop: true,
        cropLeft: numberAttr(sourceRect, 'l') / 1000, cropRight: numberAttr(sourceRect, 'r') / 1000,
        cropTop: numberAttr(sourceRect, 't') / 1000, cropBottom: numberAttr(sourceRect, 'b') / 1000,
      } : undefined;
      output.push({
        source_id: id, kind: 'image', bounds, rotation: transform.rotation, flip: { horizontal: transform.flipH, vertical: transform.flipV }, z_index: zIndex,
        content: { ...(crop ? { mediaTransform: crop } : {}), altText: metadata.alt_text },
        resource_reference: { source_id: resourceId, fit: crop ? 'cover' : 'contain' }, metadata, ...(group ? { group } : {}),
      });
      zIndex += 1;
      return;
    }
    if (kind === 'sp' || kind === 'cxnSp') {
      const shapeProperties = child(entry, 'spPr') || entry;
      const presetGeometry = firstDescendant(shapeProperties, 'prstGeom');
      const customGeometry = firstDescendant(shapeProperties, 'custGeom');
      const geometry = presetGeometry
        ? attr(presetGeometry, 'prst', kind === 'cxnSp' ? 'line' : 'rect')
        : kind === 'cxnSp' ? 'line' : customGeometry ? 'custom' : 'rect';
      const shapeKind = SHAPE_KIND[geometry] || shapeKindFromName(metadata.name);
      const textContent = textContentFrom(entry, slideRelationships, themeColors, themeFonts, issues, { screenId, elementId: id }, fontScale, canvasScale);
      const style = shapeStyle(entry, themeColors, Boolean(textContent));
      if (!shapeKind && !textContent) {
        issues.push(importIssue({ severity: 'warning', code: 'PPTX_SHAPE_UNSUPPORTED', message: `Shape ${geometry || metadata.name || id} is not editable`, sourceScreenId: screenId, sourceElementId: id, fallbackApplied: effectiveFallback(fallback) }));
        if (fallback !== 'skip') output.push(placeholderElement({ id, bounds, zIndex, message: `Unsupported shape: ${geometry || 'custom'}`, metadata, groupId }));
      } else {
        const elementKind = textContent ? 'text' : 'shape';
        output.push({
          source_id: id, kind: elementKind, bounds, rotation: transform.rotation,
          flip: { horizontal: transform.flipH, vertical: transform.flipV }, z_index: zIndex,
          content: textContent ? { ...textContent, ...(shapeKind ? { kind: shapeKind, ...style } : {}) } : { kind: shapeKind || 'rectangle', ...style },
          style: { fill: { color: style.fill, opacity: style.opacity }, line: { color: style.stroke, width: style.strokeWidth } },
          metadata: { ...metadata, geometry }, ...(group ? { group } : {}),
        });
      }
      zIndex += 1;
      return;
    }
    if (kind === 'graphicFrame') {
      const graphicUri = attr(firstDescendant(entry, 'graphicData'), 'uri', 'graphic-frame');
      issues.push(importIssue({ severity: 'warning', code: 'PPTX_GRAPHIC_FRAME_DEFERRED', message: `${metadata.name || 'PowerPoint object'} is outside the editable MVP`, sourceScreenId: screenId, sourceElementId: id, fallbackApplied: effectiveFallback(fallback), details: { graphic_uri: graphicUri } }));
      if (fallback !== 'skip') output.push(placeholderElement({ id, bounds, zIndex, message: 'Unsupported PowerPoint object', metadata, groupId }));
      zIndex += 1;
    }
  };
  for (const entry of children(tree)) visit(entry);
  return output;
};

const backgroundFrom = (slideRoot, layoutRoot, masterRoot, themeColors) => {
  for (const root of [slideRoot, layoutRoot, masterRoot]) {
    const background = firstDescendant(root, 'bg');
    const color = colorFrom(background, themeColors, undefined, { compositeAlpha: true });
    if (color) return { color };
  }
  return { color: '#ffffff' };
};
const titleFromElements = (elements, number) => String(elements.find((element) => element.kind === 'text' && String(element.content?.text || '').trim())?.content?.text || `Imported Slide ${number}`).split('\n')[0].slice(0, 120);

const packageModel = async (buffer, fileName, options = {}) => {
  const packageView = openPackage(buffer, fileName);
  const presentationXml = packageView.text('ppt/presentation.xml');
  const presentationDocument = await parseXml(presentationXml, 'ppt/presentation.xml');
  const presentationRoot = rootOf(presentationDocument);
  const presentationRelationships = await relationshipsFor(packageView, 'ppt/presentation.xml');
  const slideSize = firstDescendant(presentationRoot, 'sldSz');
  const width = positive(numberAttr(slideSize, 'cx'), 9144000);
  const height = positive(numberAttr(slideSize, 'cy'), 5143500);
  const slideRelationshipIds = [...presentationXml.matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"[^>]*\/?\s*>/gi)].map((match) => match[1]);
  if (slideRelationshipIds.length < 1 || slideRelationshipIds.length > LIMITS.slides) throw new AppError(`PowerPoint must contain 1 to ${LIMITS.slides} slides`, 422, 'PPTX_SLIDE_COUNT');
  const slideParts = slideRelationshipIds.map((id) => presentationRelationships.get(id)?.target).filter(Boolean);
  if (slideParts.length !== slideRelationshipIds.length) throw new AppError('PowerPoint slide relationships are incomplete', 422, 'PPTX_RELATIONSHIPS_INVALID');
  const resources = [];
  const issues = [];
  const slides = [];
  const fallback = ['picture', 'placeholder', 'skip'].includes(options.fallback) ? options.fallback : 'picture';
  for (let index = 0; index < slideParts.length; index += 1) {
    const slidePart = slideParts[index];
    const slideDocument = await parseXml(packageView.text(slidePart), slidePart);
    const slideRoot = rootOf(slideDocument);
    const slideRelationships = await relationshipsFor(packageView, slidePart);
    const layoutPart = [...slideRelationships.values()].find((relationship) => /slideLayout$/i.test(relationship.type))?.target;
    const layoutDocument = layoutPart && packageView.entries.has(layoutPart) ? await parseXml(packageView.text(layoutPart), layoutPart) : null;
    const layoutRoot = layoutDocument ? rootOf(layoutDocument) : {};
    const layoutRelationships = layoutPart ? await relationshipsFor(packageView, layoutPart) : new Map();
    const masterPart = [...layoutRelationships.values()].find((relationship) => /slideMaster$/i.test(relationship.type))?.target;
    const masterDocument = masterPart && packageView.entries.has(masterPart) ? await parseXml(packageView.text(masterPart), masterPart) : null;
    const masterRoot = masterDocument ? rootOf(masterDocument) : {};
    const masterRelationships = masterPart ? await relationshipsFor(packageView, masterPart) : new Map();
    const themePart = [...masterRelationships.values()].find((relationship) => /theme$/i.test(relationship.type))?.target;
    const themeDocument = themePart && packageView.entries.has(themePart) ? await parseXml(packageView.text(themePart), themePart) : null;
    const themeRoot = themeDocument ? rootOf(themeDocument) : {};
    const themeColors = applyThemeAliases(colorMapFromTheme(themeRoot), masterRoot, layoutRoot, slideRoot);
    const themeFonts = themeFontMap(themeRoot);
    const layoutTree = firstDescendant(layoutRoot, 'spTree');
    const masterTree = firstDescendant(masterRoot, 'spTree');
    const canvasScale = Math.min(1920 / width, 1080 / height);
    const elements = collectSlideElements({
      packageView, slidePart, slideRoot, slideRelationships,
      layoutPlaceholders: placeholderShapes(layoutTree), masterPlaceholders: placeholderShapes(masterTree),
      themeColors, themeFonts, issues, resources, fallback,
      fontScale: EMU_PER_POINT * canvasScale,
      canvasScale,
    });
    const notesRelationship = [...slideRelationships.values()].find((relationship) => /notesSlide$/i.test(relationship.type));
    let speakerNotes = '';
    if (notesRelationship?.target && packageView.entries.has(notesRelationship.target)) {
      const notesDocument = await parseXml(packageView.text(notesRelationship.target), notesRelationship.target);
      speakerNotes = descendants(rootOf(notesDocument), 't').map(textValue).join('\n').trim();
    }
    if (firstDescendant(slideRoot, 'timing')) issues.push(importIssue({ severity: 'warning', code: 'PPTX_ANIMATIONS_DEFERRED', message: `Animations on slide ${index + 1} were recorded but not imported`, sourceScreenId: slidePart, fallbackApplied: 'deferred' }));
    if (firstDescendant(slideRoot, 'transition')) issues.push(importIssue({ severity: 'warning', code: 'PPTX_TRANSITION_DEFERRED', message: `Transition on slide ${index + 1} was recorded but not imported`, sourceScreenId: slidePart, fallbackApplied: 'deferred' }));
    slides.push({
      source_id: slidePart,
      title: titleFromElements(elements, index + 1), width, height,
      background: backgroundFrom(slideRoot, layoutRoot, masterRoot, themeColors),
      elements, notes: { speaker_notes: speakerNotes },
      metadata: {
        slide_number: index + 1, hidden: String(attr(slideRoot, 'show', '1')) === '0',
        package_part: slidePart, layout_part: layoutPart || null, master_part: masterPart || null, theme_part: themePart || null,
      },
    });
  }
  return { packageView, width, height, resources, issues, slides };
};

const slideSummary = (slide) => ({
  source_id: slide.source_id, number: slide.metadata.slide_number, title: slide.title,
  hidden: slide.metadata.hidden, element_count: slide.elements.length,
  editable_text_count: slide.elements.filter((element) => element.kind === 'text').length,
  shape_count: slide.elements.filter((element) => element.kind === 'shape').length,
  image_count: slide.elements.filter((element) => element.kind === 'image').length,
  warning_count: 0,
});

export const preflightPptxImport = async ({ file, options = {} }) => {
  const model = await packageModel(file?.buffer, file?.originalname, options);
  const summaries = model.slides.map((slide) => ({
    ...slideSummary(slide),
    warning_count: model.issues.filter((issue) => issue.source_screen_id === slide.source_id && issue.severity === 'warning').length,
  }));
  return {
    file_name: cleanFileName(file.originalname),
    package: model.packageView.metrics,
    presentation: { slide_count: model.slides.length, width_emu: model.width, height_emu: model.height, aspect_ratio: Number((model.width / model.height).toFixed(4)) },
    slides: summaries,
    resource_count: model.resources.length,
    issue_counts: model.issues.reduce((counts, issue) => ({ ...counts, [issue.severity]: (counts[issue.severity] || 0) + 1 }), { info: 0, warning: 0, error: 0 }),
    issues: model.issues,
    defaults: { selected_slide_ids: summaries.map((slide) => slide.source_id), formatting: 'source', fit_mode: 'fit', fallback: 'picture', animations: false },
  };
};

export const buildPptxImportDocument = async ({ file, options = {} }) => {
  const model = await packageModel(file?.buffer, file?.originalname, options);
  const requested = Array.isArray(options.selected_slide_ids) ? new Set(options.selected_slide_ids.map(String)) : null;
  const selectedScreens = requested ? model.slides.filter((slide) => requested.has(slide.source_id)) : model.slides;
  const screens = options.formatting === 'destination' ? selectedScreens.map((screen) => ({
    ...screen,
    elements: screen.elements.map((element) => {
      if (element.kind === 'text') return {
        ...element,
        content: {
          ...element.content,
          richTextHtml: `<p>${escapeHtml(element.content.text || '')}</p>`,
          fontFamily: 'Arial', fontSize: 18, color: '#0f2747', bold: false, italic: false, underline: false,
        },
      };
      if (element.kind === 'shape') return { ...element, content: { ...element.content, fill: '#ffffff', stroke: '#1e3a5f', strokeWidth: 2 } };
      return element;
    }),
  })) : selectedScreens;
  if (!screens.length) throw new AppError('Select at least one slide to import', 422, 'PPTX_SLIDE_SELECTION_REQUIRED');
  const referenced = new Set(screens.flatMap((screen) => screen.elements.map((element) => element.resource_reference?.source_id).filter(Boolean)));
  return {
    schema_version: IMPORT_SCHEMA_VERSION,
    source: {
      kind: 'pptx', name: cleanFileName(file.originalname),
      sha256: createHash('sha256').update(file.buffer).digest('hex'),
      options: { formatting: options.formatting || 'source', fit_mode: options.fit_mode || 'fit', fallback: options.fallback || 'picture', animations: false },
    },
    screens,
    resources: model.resources.filter((resource) => referenced.has(resource.source_id)),
    issues: model.issues.filter((issue) => !issue.source_screen_id || screens.some((screen) => screen.source_id === issue.source_screen_id)),
  };
};

export const commitPptxImport = async ({ sessionId, file, options = {}, user, signal, ports }) => {
  const document = await buildPptxImportDocument({ file, options });
  const result = await commitImportDocument({
    sessionId, document, user, signal, ports,
    insertion: { mode: options.insertion_mode || 'end', after_screen_id: options.after_screen_id || null },
  });
  return {
    ...result,
    report: {
      file_name: document.source.name,
      screens: document.screens.map(slideSummary),
      issues: document.issues,
      counts: {
        screens: document.screens.length,
        elements: document.screens.reduce((total, screen) => total + screen.elements.length, 0),
        editable_text: document.screens.reduce((total, screen) => total + screen.elements.filter((element) => element.kind === 'text').length, 0),
        shapes: document.screens.reduce((total, screen) => total + screen.elements.filter((element) => element.kind === 'shape').length, 0),
        images: document.screens.reduce((total, screen) => total + screen.elements.filter((element) => element.kind === 'image').length, 0),
        resources: document.resources.length,
        warnings: document.issues.filter((issue) => issue.severity === 'warning').length,
      },
    },
  };
};

export { LIMITS as PPTX_IMPORT_LIMITS };
