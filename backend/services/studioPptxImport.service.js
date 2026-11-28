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
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.oga': 'audio/ogg',
  '.glb': 'model/gltf-binary',
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
  leftBracket: 'left-bracket', rightBracket: 'right-bracket', leftBrace: 'left-brace', rightBrace: 'right-brace',
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
const allDescendants = (node, output = []) => {
  for (const entry of children(node)) {
    output.push(entry);
    allDescendants(entry, output);
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
const mathText = (node) => descendants(node, 't').map(textValue).join('');
const latexSafeText = (value) => String(value ?? '').replace(/([#$%&_{}])/g, '\\$1');
const officeMathValue = (node, format = 'latex') => {
  if (!node) return '';
  const kind = localName(node?.['#name']);
  const render = (value) => officeMathValue(value, format);
  const slot = (owner, name) => render(child(owner, name));
  if (kind === 't') return format === 'latex' ? latexSafeText(textValue(node)) : textValue(node);
  if (kind === 'r') return mathText(node).split('').map((character) => format === 'latex' ? latexSafeText(character) : character).join('');
  if (kind === 'f') {
    const numerator = slot(child(node, 'num'), 'e') || render(child(node, 'num'));
    const denominator = slot(child(node, 'den'), 'e') || render(child(node, 'den'));
    return format === 'latex' ? '\\frac{' + numerator + '}{' + denominator + '}' : numerator + '/' + denominator;
  }
  if (kind === 'rad') {
    const degree = slot(child(node, 'deg'), 'e') || render(child(node, 'deg'));
    const expression = slot(child(node, 'e'), 'e') || render(child(node, 'e'));
    if (format === 'latex') return degree ? '\\sqrt[' + degree + ']{' + expression + '}' : '\\sqrt{' + expression + '}';
    return degree ? degree + '√(' + expression + ')' : '√(' + expression + ')';
  }
  if (kind === 'sSup' || kind === 'sSub' || kind === 'sSubSup') {
    const base = slot(node, 'e') || render(child(node, 'e'));
    const sub = slot(node, 'sub') || render(child(node, 'sub'));
    const sup = slot(node, 'sup') || render(child(node, 'sup'));
    if (format === 'latex') return kind === 'sSup' ? '{' + base + '}^{' + sup + '}' : kind === 'sSub' ? '{' + base + '}_{' + sub + '}' : '{' + base + '}_{' + sub + '}^{' + sup + '}';
    return kind === 'sSup' ? base + '^(' + sup + ')' : kind === 'sSub' ? base + '_(' + sub + ')' : base + '_(' + sub + ')^(' + sup + ')';
  }
  if (kind === 'nary') {
    const naryProperties = child(node, 'naryPr');
    const chr = String(attr(child(naryProperties, 'chr'), 'val', '∑'));
    const command = ({ '∑': '\\sum', '∏': '\\prod', '∐': '\\coprod', '∫': '\\int', '∮': '\\oint', '⋃': '\\bigcup', '⋂': '\\bigcap' })[chr] || latexSafeText(chr);
    const lower = slot(child(node, 'sub'), 'e') || render(child(node, 'sub'));
    const upper = slot(child(node, 'sup'), 'e') || render(child(node, 'sup'));
    const expression = slot(child(node, 'e'), 'e') || render(child(node, 'e'));
    return format === 'latex' ? command + (lower ? '_{' + lower + '}' : '') + (upper ? '^{' + upper + '}' : '') + (expression ? '\\,' + expression : '') : chr + (lower ? '_{' + lower + '}' : '') + (upper ? '^(' + upper + ')' : '') + expression;
  }
  if (kind === 'd') {
    const properties = child(node, 'dPr');
    const begin = String(attr(child(properties, 'begChr'), 'val', '('));
    const end = String(attr(child(properties, 'endChr'), 'val', ')'));
    const expression = child(node, 'e');
    return format === 'latex' ? '\\left' + latexSafeText(begin) + render(expression) + '\\right' + latexSafeText(end) : begin + render(expression) + end;
  }
  if (kind === 'bar') {
    const expression = slot(node, 'e') || render(child(node, 'e'));
    return format === 'latex' ? '\\overline{' + expression + '}' : '¯(' + expression + ')';
  }
  if (kind === 'acc') {
    const expression = slot(node, 'e') || render(child(node, 'e'));
    const accent = String(attr(child(child(node, 'accPr'), 'chr'), 'val', 'ˆ'));
    return format === 'latex' ? '\\hat{' + expression + '}' : accent + expression;
  }
  if (kind === 'limLow' || kind === 'limUpp') {
    const base = slot(node, 'e') || render(child(node, 'e'));
    const limit = slot(node, 'lim') || render(child(node, 'lim'));
    return format === 'latex' ? (kind === 'limLow' ? '{' + base + '}_{' + limit + '}' : '{' + base + '}^{' + limit + '}') : (kind === 'limLow' ? base + '_(' + limit + ')' : base + '^(' + limit + ')');
  }
  if (kind === 'func') {
    const name = render(child(node, 'fName'));
    const expression = render(child(node, 'e'));
    return name + (format === 'latex' ? '\\left(' : '(') + expression + (format === 'latex' ? '\\right)' : ')');
  }
  if (['oMath', 'oMathPara', 'e', 'num', 'den', 'sub', 'sup', 'fName'].includes(kind)) {
    return children(node).filter((entry) => !/Pr$/.test(localName(entry?.['#name']))).map(render).join('');
  }
  if (kind === 'm' || kind === 'mr' || kind === 'eqArr') return children(node).filter((entry) => !/Pr$/.test(localName(entry?.['#name']))).map(render).join(format === 'latex' ? ' \\\\ ' : ' ; ');
  return children(node).filter((entry) => !/Pr$/.test(localName(entry?.['#name']))).map(render).join('');
};
const textOutsideMath = (node, output = []) => {
  for (const entry of children(node)) {
    const kind = localName(entry?.['#name']);
    if (kind === 'oMath' || kind === 'oMathPara') continue;
    if (kind === 't') output.push(textValue(entry));
    else textOutsideMath(entry, output);
  }
  return output.join('');
};
const plainTextWithMath = (node) => {
  const visit = (entry) => {
    const kind = localName(entry?.['#name']);
    if (kind === 'oMath' || kind === 'oMathPara') return officeMathValue(entry, 'linear');
    if (kind === 't') return textValue(entry);
    return children(entry).map(visit).join('');
  };
  return visit(node);
};
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
const identityMatrix = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
const multiplyMatrix = (left, right) => ({
  a: left.a * right.a + left.c * right.b,
  b: left.b * right.a + left.d * right.b,
  c: left.a * right.c + left.c * right.d,
  d: left.b * right.c + left.d * right.d,
  e: left.a * right.e + left.c * right.f + left.e,
  f: left.b * right.e + left.d * right.f + left.f,
});
const translateMatrix = (x, y) => ({ a: 1, b: 0, c: 0, d: 1, e: x, f: y });
const scaleMatrix = (x, y) => ({ a: x, b: 0, c: 0, d: y, e: 0, f: 0 });
const rotateMatrix = (degrees) => {
  const radians = degrees * Math.PI / 180;
  return { a: Math.cos(radians), b: Math.sin(radians), c: -Math.sin(radians), d: Math.cos(radians), e: 0, f: 0 };
};
const applyMatrix = (matrix, x, y) => ({
  x: matrix.a * x + matrix.c * y + matrix.e,
  y: matrix.b * x + matrix.d * y + matrix.f,
});
const matrixAround = (operation, x, y) => multiplyMatrix(
  multiplyMatrix(translateMatrix(x, y), operation),
  translateMatrix(-x, -y),
);
const groupContextFrom = (group, parent) => {
  const xfrm = firstDescendant(child(group, 'grpSpPr') || group, 'xfrm');
  if (!xfrm) return parent;
  const off = child(xfrm, 'off');
  const ext = child(xfrm, 'ext');
  const chOff = child(xfrm, 'chOff');
  const chExt = child(xfrm, 'chExt');
  const x = numberAttr(off, 'x');
  const y = numberAttr(off, 'y');
  const width = positive(numberAttr(ext, 'cx'));
  const height = positive(numberAttr(ext, 'cy'));
  const childX = numberAttr(chOff, 'x');
  const childY = numberAttr(chOff, 'y');
  const childWidth = positive(numberAttr(chExt, 'cx'));
  const childHeight = positive(numberAttr(chExt, 'cy'));
  const rotation = numberAttr(xfrm, 'rot') / 60000;
  const flipH = String(attr(xfrm, 'flipH', '0')) === '1';
  const flipV = String(attr(xfrm, 'flipV', '0')) === '1';
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  let localMatrix = multiplyMatrix(
    translateMatrix(x, y),
    multiplyMatrix(scaleMatrix(width / childWidth, height / childHeight), translateMatrix(-childX, -childY)),
  );
  if (flipH || flipV) localMatrix = multiplyMatrix(matrixAround(scaleMatrix(flipH ? -1 : 1, flipV ? -1 : 1), centerX, centerY), localMatrix);
  if (rotation) localMatrix = multiplyMatrix(matrixAround(rotateMatrix(rotation), centerX, centerY), localMatrix);
  return {
    matrix: multiplyMatrix(parent?.matrix || identityMatrix(), localMatrix),
    rotation: Number(parent?.rotation || 0) + rotation,
    flipH: Boolean(parent?.flipH) !== flipH,
    flipV: Boolean(parent?.flipV) !== flipV,
  };
};
const applyGroupTransform = (transform, group) => {
  if (!group) return transform;
  const center = applyMatrix(group.matrix, transform.x + transform.width / 2, transform.y + transform.height / 2);
  const scaleX = Math.hypot(group.matrix.a, group.matrix.b);
  const scaleY = Math.hypot(group.matrix.c, group.matrix.d);
  const width = transform.width * scaleX;
  const height = transform.height * scaleY;
  return {
    ...transform,
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
    rotation: Number(transform.rotation || 0) + Number(group.rotation || 0),
    flipH: Boolean(transform.flipH) !== Boolean(group.flipH),
    flipV: Boolean(transform.flipV) !== Boolean(group.flipV),
  };
};

const placeholderIdentity = (shape) => {
  const placeholder = firstDescendant(child(shape, 'nvSpPr') || shape, 'ph');
  return placeholder ? { type: attr(placeholder, 'type', 'body'), index: String(attr(placeholder, 'idx', '0')) } : null;
};
const placeholderKey = (identity) => identity ? `${identity.type}:${identity.index}` : '';
const placeholderShapes = (tree) => new Map(children(tree).filter((entry) => localName(entry['#name']) === 'sp').map((shape) => [placeholderKey(placeholderIdentity(shape)), shape]).filter(([key]) => key));
const inheritedPlaceholderShapes = (shape, layoutPlaceholders, masterPlaceholders) => {
  const key = placeholderKey(placeholderIdentity(shape));
  return key ? [layoutPlaceholders.get(key), masterPlaceholders.get(key)].filter(Boolean) : [];
};
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
const runFormatting = (run, themeColors, themeFonts, issues, context, defaultTextColor, inheritedProperties = null) => {
  const properties = child(run, 'rPr') || child(run, 'defRPr') || inheritedProperties;
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
const textContentFrom = (shape, relationships, themeColors, themeFonts, issues, context, fontScale, canvasScale, inheritedShapes = []) => {
  const body = child(shape, 'txBody') || inheritedShapes.map((entry) => child(entry, 'txBody')).find(Boolean);
  if (!body) return null;
  const bodyPropertyChain = [shape, ...inheritedShapes]
    .map((entry) => child(child(entry, 'txBody'), 'bodyPr'))
    .filter(Boolean);
  const inheritedBodyAttribute = (name, fallback) => {
    for (const properties of bodyPropertyChain) {
      const value = attr(properties, name, undefined);
      if (value !== undefined) return value;
    }
    return fallback;
  };
  const paragraphs = childList(body, 'p');
  const fontReference = [shape, ...inheritedShapes].map((entry) => child(child(entry, 'style'), 'fontRef')).find(Boolean);
  const inheritedRunProperties = [shape, ...inheritedShapes]
    .map((entry) => firstDescendant(child(entry, 'txBody'), 'defRPr'))
    .find(Boolean);
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
    let inlineEquation = false;
    for (const run of children(paragraph).filter((entry) => ['r', 'fld', 'br', 'oMath', 'oMathPara'].includes(localName(entry['#name'])))) {
      if (localName(run['#name']) === 'br') { plain.push('\n'); fragments.push('<br>'); continue; }
      if (['oMath', 'oMathPara'].includes(localName(run['#name']))) {
        const linear = officeMathValue(run, 'linear');
        plain.push(linear);
        fragments.push('<span>' + escapeHtml(linear) + '</span>');
        inlineEquation = true;
        continue;
      }
      const value = normalizeOfficeSymbols(textValue(child(run, 't')));
      const format = runFormatting(run, themeColors, themeFonts, issues, context, defaultTextColor, inheritedRunProperties);
      if (!firstFormat) firstFormat = format;
      const linkNode = firstDescendant(child(run, 'rPr') || run, 'hlinkClick');
      const relationship = relationships.get(attr(linkNode, 'id'));
      const escaped = escapeHtml(value).replace(/\n/g, '<br>');
      const span = `<span style="${styleString(format, fontScale)}">${escaped}</span>`;
      const safeLink = relationship?.external && /^(?:https?:|mailto:)/i.test(relationship.target) ? relationship.target : null;
      fragments.push(safeLink ? `<a href="${escapeHtml(safeLink)}">${span}</a>` : span);
      plain.push(value);
    }
    if (inlineEquation) issues.push(importIssue({
      severity: 'warning', code: 'PPTX_INLINE_EQUATION_LINEARIZED',
      message: 'An equation inside a text paragraph was preserved as editable linear math text; standalone equations import as equation objects',
      sourceScreenId: context.screenId, sourceElementId: context.elementId, fallbackApplied: 'linear-math-text',
    }));
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
    verticalAlignment: ({ ctr: 'middle', b: 'bottom' }[inheritedBodyAttribute('anchor')] || 'top'),
    margins: {
      left: Number((Number(inheritedBodyAttribute('lIns', 91440)) * canvasScale).toFixed(3)),
      right: Number((Number(inheritedBodyAttribute('rIns', 91440)) * canvasScale).toFixed(3)),
      top: Number((Number(inheritedBodyAttribute('tIns', 45720)) * canvasScale).toFixed(3)),
      bottom: Number((Number(inheritedBodyAttribute('bIns', 45720)) * canvasScale).toFixed(3)),
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

const customGeometryPath = (geometry) => {
  if (!geometry) return null;
  const paths = descendants(geometry, 'path');
  if (!paths.length) return null;
  const guideDefinitions = new Map(descendants(geometry, 'gd').map((guide) => [String(attr(guide, 'name', '')), String(attr(guide, 'fmla', ''))]).filter(([name]) => name));
  const unsupported = new Set();
  const output = [];
  for (const pathNode of paths) {
    const pathWidth = positive(numberAttr(pathNode, 'w', 21600), 21600);
    const pathHeight = positive(numberAttr(pathNode, 'h', 21600), 21600);
    const env = new Map(Object.entries({
      w: pathWidth, h: pathHeight, l: 0, t: 0, r: pathWidth, b: pathHeight,
      hc: pathWidth / 2, vc: pathHeight / 2, wd2: pathWidth / 2, hd2: pathHeight / 2,
      wd3: pathWidth / 3, hd3: pathHeight / 3, wd4: pathWidth / 4, hd4: pathHeight / 4,
      ss: Math.min(pathWidth, pathHeight), ls: Math.max(pathWidth, pathHeight),
    }));
    const resolving = new Set();
    const valueOf = (token) => {
      const raw = String(token ?? '0').trim();
      const numeric = Number(raw);
      if (Number.isFinite(numeric)) return numeric;
      if (env.has(raw)) return env.get(raw);
      const formula = guideDefinitions.get(raw);
      if (!formula || resolving.has(raw)) { unsupported.add(raw || 'empty-guide'); return 0; }
      resolving.add(raw);
      const [operator, ...parts] = formula.trim().split(/\s+/);
      const values = parts.map(valueOf);
      const angle = (entry) => entry / 60000 * Math.PI / 180;
      const result = ({
        val: () => values[0],
        '*/': () => values[2] ? values[0] * values[1] / values[2] : 0,
        '+-': () => values[0] + values[1] - values[2],
        '+/': () => values[2] ? (values[0] + values[1]) / values[2] : 0,
        '?:': () => values[0] > 0 ? values[1] : values[2],
        abs: () => Math.abs(values[0]),
        min: () => Math.min(values[0], values[1]),
        max: () => Math.max(values[0], values[1]),
        sqrt: () => Math.sqrt(Math.max(0, values[0])),
        mod: () => Math.hypot(values[0], values[1], values[2]),
        pin: () => Math.max(values[0], Math.min(values[2], values[1])),
        sin: () => values[0] * Math.sin(angle(values[1])),
        cos: () => values[0] * Math.cos(angle(values[1])),
        tan: () => values[0] * Math.tan(angle(values[1])),
      })[operator]?.() ?? 0;
      resolving.delete(raw);
      if (!Number.isFinite(result)) { unsupported.add(raw); return 0; }
      env.set(raw, result);
      return result;
    };
    const point = (node) => ({ x: valueOf(attr(node, 'x')), y: valueOf(attr(node, 'y')) });
    const nx = (value) => Number((value / pathWidth * 200).toFixed(3));
    const ny = (value) => Number((value / pathHeight * 120).toFixed(3));
    let current = { x: 0, y: 0 };
    for (const command of children(pathNode)) {
      const commandName = localName(command['#name']);
      const points = childList(command, 'pt').map(point);
      if (commandName === 'moveTo' && points[0]) {
        current = points[0]; output.push(`M${nx(current.x)} ${ny(current.y)}`);
      } else if (commandName === 'lnTo' && points[0]) {
        current = points[0]; output.push(`L${nx(current.x)} ${ny(current.y)}`);
      } else if (commandName === 'cubicBezTo' && points.length >= 3) {
        output.push(`C${nx(points[0].x)} ${ny(points[0].y)} ${nx(points[1].x)} ${ny(points[1].y)} ${nx(points[2].x)} ${ny(points[2].y)}`);
        current = points[2];
      } else if (commandName === 'quadBezTo' && points.length >= 2) {
        output.push(`Q${nx(points[0].x)} ${ny(points[0].y)} ${nx(points[1].x)} ${ny(points[1].y)}`);
        current = points[1];
      } else if (commandName === 'arcTo') {
        const radiusX = Math.abs(valueOf(attr(command, 'wR')));
        const radiusY = Math.abs(valueOf(attr(command, 'hR')));
        const start = valueOf(attr(command, 'stAng')) / 60000 * Math.PI / 180;
        const sweepDegrees = valueOf(attr(command, 'swAng')) / 60000;
        const end = start + sweepDegrees * Math.PI / 180;
        const centerX = current.x - radiusX * Math.cos(start);
        const centerY = current.y - radiusY * Math.sin(start);
        current = { x: centerX + radiusX * Math.cos(end), y: centerY + radiusY * Math.sin(end) };
        output.push(`A${nx(radiusX)} ${ny(radiusY)} 0 ${Math.abs(sweepDegrees) > 180 ? 1 : 0} ${sweepDegrees >= 0 ? 1 : 0} ${nx(current.x)} ${ny(current.y)}`);
      } else if (commandName === 'close') output.push('Z');
      else if (!['extLst'].includes(commandName)) unsupported.add(commandName);
    }
  }
  return output.length ? { path: output.join(' '), unsupported: [...unsupported].filter(Boolean) } : null;
};

const shapeStyle = (shape, themeColors, hasText = false, inheritedShapes = []) => {
  const propertyChain = [shape, ...inheritedShapes].map((entry) => child(entry, 'spPr')).filter(Boolean);
  const properties = propertyChain[0] || {};
  const fillProperties = propertyChain.find((entry) => child(entry, 'noFill') || child(entry, 'solidFill') || child(entry, 'gradFill')) || properties;
  const line = propertyChain.map((entry) => child(entry, 'ln')).find(Boolean);
  const preset = child(child(properties, 'prstGeom') || {}, 'avLst');
  void preset;
  const opacityNode = firstDescendant(firstDescendant(fillProperties, 'solidFill') || {}, 'alpha');
  const effects = propertyChain.map((entry) => firstDescendant(entry, 'effectLst')).find(Boolean);
  const glow = effects && firstDescendant(effects, 'glow');
  const shadow = effects && firstDescendant(effects, 'outerShdw');
  const shapeEffect = glow ? 'glow'
    : shadow ? 'shadow'
      : 'none';
  return {
    fill: child(fillProperties, 'noFill') ? 'transparent' : colorFrom(child(fillProperties, 'solidFill') || child(fillProperties, 'gradFill'), themeColors, hasText ? 'transparent' : '#ffffff'),
    gradient: gradientFrom(fillProperties, themeColors),
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
  pptx_shape_id: String(attr(nonVisual(shape), 'id', '') || ''),
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
const tableFromGraphicFrame = (entry, context) => {
  const table = firstDescendant(entry, 'tbl');
  if (!table) return null;
  const tableProperties = child(table, 'tblPr');
  const sourceRows = childList(table, 'tr');
  if (!sourceRows.length) return null;
  const rows = [];
  const cellStyles = [];
  const merges = [];
  sourceRows.forEach((row, rowIndex) => {
    const cells = childList(row, 'tc');
    const cellText = cells.map((cell) => textContentFrom(cell, context.relationships, context.themeColors, context.themeFonts, context.issues, context.textContext, context.fontScale, context.canvasScale));
    rows[rowIndex] = cells.map((cell, columnIndex) => String(cellText[columnIndex]?.text || plainTextWithMath(child(cell, 'txBody') || cell)).trim());
    cellStyles[rowIndex] = cells.map((cell, columnIndex) => {
      const properties = child(cell, 'tcPr');
      const text = cellText[columnIndex];
      const formattedRuns = [...String(text?.richTextHtml || '').matchAll(/<span style="([^"]*)">/g)].map((match) => match[1]);
      if (new Set(formattedRuns).size > 1) context.issues.push(importIssue({
        severity: 'warning', code: 'PPTX_TABLE_RICH_TEXT_APPROXIMATED',
        message: 'Multiple text formats within a PowerPoint table cell were flattened to one cell style',
        sourceScreenId: context.textContext.screenId, sourceElementId: context.textContext.elementId, fallbackApplied: 'editable-cell-text',
      }));
      const fill = colorFrom(properties, context.themeColors, undefined);
      const run = firstDescendant(child(cell, 'txBody') || cell, 'rPr');
      const style = run ? runFormatting({ $: {}, $$: [{ '#name': 'a:rPr', $: run.$, $$: run.$$ }] }, context.themeColors, context.themeFonts, context.issues, context.textContext, '#0f2747') : null;
      const verticalAlignment = ({ t: 'top', ctr: 'middle', b: 'bottom' })[String(attr(properties, 'anchor', 'ctr'))] || 'middle';
      if (fill || text || style) return {
        ...(fill ? { fill } : {}),
        ...(text?.color ? { color: text.color } : {}),
        ...(text?.alignment ? { alignment: text.alignment } : {}),
        verticalAlignment,
        ...(text?.fontSize ? { fontSize: text.fontSize } : {}),
        ...(style ? { bold: style.bold, italic: style.italic } : {}),
      };
      return {};
    });
    cells.forEach((cell, columnIndex) => {
      const properties = child(cell, 'tcPr');
      const colSpan = Math.max(1, numberAttr(child(properties, 'gridSpan'), 'val', 1));
      const rowSpan = Math.max(1, numberAttr(child(properties, 'rowSpan'), 'val', 1));
      if (colSpan > 1 || rowSpan > 1) merges.push({ row: rowIndex, column: columnIndex, colSpan, rowSpan });
    });
  });
  const width = Math.max(1, ...rows.map((row) => row.length));
  const normalizedRows = rows.map((row) => Array.from({ length: width }, (_, index) => row[index] || ''));
  const normalizedStyles = cellStyles.map((row) => Array.from({ length: width }, (_, index) => row[index] || {}));
  if (child(tableProperties, 'tableStyleId')) context.issues.push(importIssue({
    severity: 'info', code: 'PPTX_TABLE_STYLE_SIMPLIFIED',
    message: 'The PowerPoint table style preset was simplified to editable cell fills and text formatting',
    sourceScreenId: context.textContext.screenId, sourceElementId: context.textContext.elementId, fallbackApplied: 'editable-table-style',
  }));
  return {
    content: {
      visualType: 'table', rows: normalizedRows, cellStyles: normalizedStyles, merges,
      headerRow: String(attr(tableProperties, 'firstRow', '0')) === '1',
      firstColumn: String(attr(tableProperties, 'firstCol', '0')) === '1',
      bandedRows: String(attr(tableProperties, 'bandRow', '0')) === '1',
      bandedColumns: String(attr(tableProperties, 'bandCol', '0')) === '1',
      fontSize: 22, borderColor: '#64748b', borderWidth: 1, cellMargin: 8, alignment: 'left', verticalAlignment: 'middle',
    },
    sourceRows: rows.length,
    sourceColumns: width,
  };
};
const chartPoints = (owner) => {
  const points = descendants(owner, 'pt').map((point) => ({
    index: numberAttr(point, 'idx', 0),
    value: String(textValue(firstDescendant(point, 'v')) || ''),
  })).filter((point) => point.value !== '').sort((left, right) => left.index - right.index);
  return points.map((point) => point.value);
};
const chartText = (owner) => descendants(owner, 't').map(textValue).join('').trim()
  || descendants(owner, 'v').map(textValue).join('').trim();
const excelColumnIndex = (letters) => String(letters || '').toUpperCase().split('').reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0) - 1;
const workbookRangeValues = (workbook, formula) => {
  const match = String(formula || '').replace(/^=/, '').match(/^(?:'([^']+)'|([^!]+))!\$?([A-Z]+)\$?(\d+)(?::\$?([A-Z]+)\$?(\d+))?/i);
  if (!match) return [];
  const sheet = workbook?.get(String(match[1] || match[2] || '').replaceAll("''", "'"));
  if (!sheet) return [];
  const startColumn = excelColumnIndex(match[3]);
  const startRow = Number(match[4]) - 1;
  const endColumn = excelColumnIndex(match[5] || match[3]);
  const endRow = Number(match[6] || match[4]) - 1;
  const values = [];
  for (let row = startRow; row <= endRow; row += 1) for (let column = startColumn; column <= endColumn; column += 1) {
    const value = sheet.get(`${column}:${row}`);
    if (value !== undefined && value !== null && String(value) !== '') values.push(String(value));
  }
  return values;
};
const workbookDataFrom = async (buffer) => {
  if (!Buffer.isBuffer(buffer) || !buffer.length) return null;
  let zip;
  try { zip = new AdmZip(buffer); } catch { return null; }
  const text = (name) => zip.getEntry(name)?.getData().toString('utf8') || '';
  const workbookXml = text('xl/workbook.xml');
  if (!workbookXml || UNSAFE_XML.test(workbookXml)) return null;
  const sharedXml = text('xl/sharedStrings.xml');
  const shared = sharedXml ? descendants(rootOf(await parseXml(sharedXml, 'xl/sharedStrings.xml')), 'si').map((entry) => descendants(entry, 't').map(textValue).join('')) : [];
  const relationshipXml = text('xl/_rels/workbook.xml.rels');
  const relationshipTargets = new Map([...relationshipXml.matchAll(/<Relationship\b([^>]*)\/?\s*>/gi)].map((match) => {
    const row = match[1];
    return [row.match(/\bId="([^"]+)"/i)?.[1], row.match(/\bTarget="([^"]+)"/i)?.[1]];
  }).filter(([id, target]) => id && target));
  const workbookRoot = rootOf(await parseXml(workbookXml, 'xl/workbook.xml'));
  const result = new Map();
  for (const sheetNode of descendants(workbookRoot, 'sheet')) {
    const name = String(attr(sheetNode, 'name', 'Sheet'));
    const target = relationshipTargets.get(attr(sheetNode, 'id'));
    if (!target) continue;
    const part = path.posix.normalize(path.posix.join('xl', String(target).replace(/^\//, '')));
    const sheetXml = text(part);
    if (!sheetXml || UNSAFE_XML.test(sheetXml)) continue;
    const sheetRoot = rootOf(await parseXml(sheetXml, part));
    const cells = new Map();
    for (const cell of descendants(sheetRoot, 'c')) {
      const reference = String(attr(cell, 'r', ''));
      const coordinate = reference.match(/^([A-Z]+)(\d+)$/i);
      if (!coordinate) continue;
      const raw = String(textValue(firstDescendant(cell, 'v')) || descendants(firstDescendant(cell, 'is'), 't').map(textValue).join(''));
      const value = attr(cell, 't') === 's' ? shared[Number(raw)] ?? raw : raw;
      cells.set(`${excelColumnIndex(coordinate[1])}:${Number(coordinate[2]) - 1}`, value);
    }
    result.set(name, cells);
  }
  return result;
};
const chartFormula = (owner) => String(textValue(firstDescendant(owner, 'f')) || '');
const chartFromPart = (chartRoot, themeColors, workbook = null) => {
  const supportedChartTypes = new Set(['barChart', 'bar3DChart', 'lineChart', 'line3DChart', 'pieChart', 'pie3DChart', 'doughnutChart', 'areaChart', 'area3DChart', 'scatterChart', 'bubbleChart', 'radarChart', 'stockChart', 'surfaceChart']);
  const chartTypeNodes = allDescendants(chartRoot).filter((entry) => supportedChartTypes.has(localName(entry['#name'])));
  const chartTypeNode = chartTypeNodes[0];
  if (!chartTypeNode) return null;
  const sourceType = localName(chartTypeNode['#name']);
  const chartType = sourceType.toLowerCase().includes('pie') ? 'pie'
    : sourceType.toLowerCase().includes('doughnut') ? 'doughnut'
      : sourceType.toLowerCase().includes('line') || sourceType.toLowerCase().includes('scatter') || sourceType.toLowerCase().includes('area') ? 'line' : 'bar';
  const series = descendants(chartTypeNode, 'ser').map((seriesNode, index) => {
    const tx = child(seriesNode, 'tx');
    const categoryOwner = child(seriesNode, 'cat') || child(seriesNode, 'xVal');
    const valueOwner = child(seriesNode, 'val') || child(seriesNode, 'yVal');
    const name = chartText(tx) || workbookRangeValues(workbook, chartFormula(tx))[0] || 'Series ' + (index + 1);
    const categories = chartPoints(categoryOwner).length ? chartPoints(categoryOwner) : workbookRangeValues(workbook, chartFormula(categoryOwner));
    const rawValues = chartPoints(valueOwner).length ? chartPoints(valueOwner) : workbookRangeValues(workbook, chartFormula(valueOwner));
    const values = rawValues.map((value) => Number(value)).filter((value) => Number.isFinite(value));
    const seriesColor = colorFrom(child(seriesNode, 'spPr'), themeColors, undefined);
    return { name, categories, values, color: seriesColor };
  }).filter((dataset) => dataset.values.length);
  if (!series.length) return null;
  const labels = series[0].categories.length
    ? series[0].categories
    : series[0].values.map((_, index) => String(index + 1));
  const datasets = series.map((dataset) => ({
    label: dataset.name,
    data: labels.map((_, index) => dataset.values[index] ?? 0),
    ...(dataset.color ? { color: dataset.color } : {}),
  }));
  return {
    chartType,
    title: chartText(firstDescendant(chartRoot, 'title')) || 'Imported chart',
    data: { labels, datasets },
    sourceChartType: sourceType,
    sourceChartTypes: [...new Set(chartTypeNodes.map((entry) => localName(entry['#name'])))],
  };
};
const smartDiagramLayout = (title) => {
  const value = String(title || '').toLowerCase();
  if (/organization|org chart/.test(value)) return { category: 'hierarchy', layout: 'organization-chart' };
  if (/hierarch/.test(value)) return { category: 'hierarchy', layout: 'horizontal-hierarchy' };
  if (/cycle/.test(value)) return { category: 'cycle', layout: 'basic-cycle' };
  if (/matrix|grid/.test(value)) return { category: 'matrix', layout: 'basic-matrix' };
  if (/pyramid/.test(value)) return { category: 'pyramid', layout: 'basic-pyramid' };
  if (/funnel/.test(value)) return { category: 'funnel', layout: 'basic-funnel' };
  if (/timeline|milestone/.test(value)) return { category: 'timeline', layout: 'basic-timeline' };
  if (/comparison|balance|opposing/.test(value)) return { category: 'comparison', layout: 'side-by-side-comparison' };
  if (/relationship|radial|venn|target/.test(value)) return { category: 'relationship', layout: 'radial-relationship' };
  if (/picture|image/.test(value)) return { category: 'picture', layout: 'picture-grid' };
  if (/process|chevron|step/.test(value)) return { category: 'process', layout: 'basic-process' };
  return { category: 'list', layout: 'basic-list' };
};
const smartDiagramFromParts = async ({ entry, relationships, packageView, themeColors, issues, screenId, elementId, metadata }) => {
  const relationIds = firstDescendant(entry, 'relIds');
  if (!relationIds && !/diagram|smartart/i.test(String(attr(firstDescendant(entry, 'graphicData'), 'uri', '')))) return null;
  const dataRelationship = relationships.get(attr(relationIds, 'dm'))
    || [...relationships.values()].find((relationship) => /diagramData$/i.test(String(relationship?.type || '')));
  if (!dataRelationship?.target || !packageView.entries.has(dataRelationship.target)) return null;
  const layoutRelationship = relationships.get(attr(relationIds, 'lo'))
    || [...relationships.values()].find((relationship) => /diagramLayout$/i.test(String(relationship?.type || '')));
  const dataDocument = await parseXml(packageView.text(dataRelationship.target), dataRelationship.target);
  const dataRoot = rootOf(dataDocument);
  const layoutDocument = layoutRelationship?.target && packageView.entries.has(layoutRelationship.target)
    ? await parseXml(packageView.text(layoutRelationship.target), layoutRelationship.target)
    : null;
  const layoutRoot = layoutDocument ? rootOf(layoutDocument) : {};
  const layoutTitle = String(attr(firstDescendant(layoutRoot, 'title'), 'val', '') || attr(layoutRoot, 'uniqueId', '') || metadata.name || 'SmartArt');
  const { category, layout } = smartDiagramLayout(layoutTitle);
  const points = descendants(firstDescendant(dataRoot, 'ptLst'), 'pt');
  const candidateNodes = points.map((point, index) => {
    const id = String(attr(point, 'modelId', `node-${index + 1}`));
    const type = String(attr(point, 'type', '')).toLowerCase();
    const text = normalizeOfficeSymbols(descendants(point, 't').map(textValue).join('') || plainTextWithMath(point)).trim();
    return { id, type, text, point };
  }).filter((point) => !['doc', 'pres', 'partrans', 'sibtrans'].includes(point.type));
  if (!candidateNodes.length) return null;
  const retained = candidateNodes.slice(0, 50);
  if (candidateNodes.length > retained.length) issues.push(importIssue({
    severity: 'warning', code: 'PPTX_SMARTART_NODE_LIMIT',
    message: 'SmartArt contained more than 50 text nodes; the remaining nodes were reported but not imported',
    sourceScreenId: screenId, sourceElementId: elementId, fallbackApplied: 'first-50-nodes',
    details: { source_nodes: candidateNodes.length, imported_nodes: retained.length },
  }));
  const retainedIds = new Set(retained.map((node) => node.id));
  const parentByChild = new Map();
  const assistantIds = new Set();
  for (const connection of descendants(firstDescendant(dataRoot, 'cxnLst'), 'cxn')) {
    const source = String(attr(connection, 'srcId', ''));
    const destination = String(attr(connection, 'destId', ''));
    const type = String(attr(connection, 'type', 'parOf')).toLowerCase();
    if (!retainedIds.has(source) || !retainedIds.has(destination)) continue;
    if (type.includes('parof') || type === '') parentByChild.set(destination, source);
    if (type.includes('asst')) { parentByChild.set(destination, source); assistantIds.add(destination); }
  }
  const levelOf = (id, trail = new Set()) => {
    const parentId = parentByChild.get(id);
    if (!parentId || trail.has(id)) return 0;
    return Math.min(5, 1 + levelOf(parentId, new Set([...trail, id])));
  };
  const emptyTextNodes = retained.filter(({ text }) => !text).length;
  const nodes = retained.map(({ id, text, point }) => {
    const parentId = parentByChild.get(id);
    const fill = colorFrom(firstDescendant(point, 'spPr'), themeColors, undefined);
    const textColor = colorFrom(firstDescendant(firstDescendant(point, 't'), 'rPr'), themeColors, undefined);
    return {
      id: `pptx-smartart-${id}`.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 145),
      // PowerPoint often stores SmartArt labels in its cached drawing rather
      // than the data model. Keep the editable node in that case instead of
      // dropping the entire diagram; the placeholder is intentionally clear.
      text: (text || '[Text]').slice(0, 240),
      level: levelOf(id),
      parentId: parentId && retainedIds.has(parentId) ? `pptx-smartart-${parentId}`.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 145) : null,
      role: assistantIds.has(id) ? 'assistant' : 'normal',
      ...(fill ? { fill } : {}),
      ...(textColor ? { textColor } : {}),
    };
  });
  issues.push(importIssue({
    severity: 'info', code: 'PPTX_SMARTART_STYLE_APPROXIMATED',
    message: 'SmartArt text and hierarchy remain editable; PowerPoint-specific layout and style details use the closest Spectropy diagram design',
    sourceScreenId: screenId, sourceElementId: elementId, fallbackApplied: 'editable-smart-diagram',
    details: { source_layout: layoutTitle, mapped_layout: layout, data_part: dataRelationship.target, empty_text_placeholders: emptyTextNodes },
  }));
  return {
    visualType: 'smart_diagram', schemaVersion: 1, category, layout, nodes,
    direction: /rtl|fromr|righttoleft/i.test(layoutRelationship?.target && packageView.entries.has(layoutRelationship.target)
      ? packageView.text(layoutRelationship.target) : '') ? 'rtl' : 'ltr',
    themeId: 'spectropy', styleId: 'soft', connectorStyle: category === 'list' ? 'none' : 'straight',
    revealMode: 'as-one-object', reverseAnimation: false,
    altText: metadata.alt_text || `${layoutTitle} SmartArt diagram`, text: metadata.name || layoutTitle,
    sourceLayout: layoutTitle,
  };
};
const mediaRelationshipFor = (entry, relationships) => {
  for (const mediaNode of descendants(entry, 'videoFile').concat(descendants(entry, 'audioFile'), descendants(entry, 'media'))) {
    const relationshipId = attr(mediaNode, 'embed') || attr(mediaNode, 'link') || attr(mediaNode, 'id');
    const relationship = relationships.get(relationshipId);
    const mediaType = relationship?.target ? mediaTypeFor(relationship.target) : null;
    const kind = localName(mediaNode['#name']).toLowerCase().includes('audio') || relationship?.type?.toLowerCase().includes('audio') || mediaType?.startsWith('audio/')
      ? 'audio' : 'video';
    if (relationship && !relationship.external && relationship.target && mediaType?.startsWith(kind + '/')) return { relationship, kind, mediaType };
  }
  return null;
};
const model3DRelationshipFor = (entry, relationships) => {
  const modelNode = allDescendants(entry).find((node) => localName(node?.['#name']).toLowerCase() === 'model3d');
  const graphicUri = String(attr(firstDescendant(entry, 'graphicData'), 'uri', ''));
  if (!modelNode && !/model3d|3dmodel/i.test(graphicUri)) return null;
  const relationshipId = modelNode && (attr(modelNode, 'embed') || attr(modelNode, 'link') || attr(modelNode, 'id'));
  const direct = relationshipId ? relationships.get(relationshipId) : null;
  const inferred = [...relationships.values()].find((relationship) => /model3d/i.test(String(relationship?.type || ''))
    && relationship?.target && path.posix.extname(relationship.target).toLowerCase() === '.glb');
  const relationship = direct || inferred;
  if (!relationship || relationship.external || !relationship.target || path.posix.extname(relationship.target).toLowerCase() !== '.glb') return null;
  const camera = modelNode ? firstDescendant(modelNode, 'camera') : null;
  const lightRig = modelNode ? firstDescendant(modelNode, 'lightRig') : null;
  const rotation = modelNode ? firstDescendant(modelNode, 'rot') : null;
  const cameraPreset = String(attr(camera, 'prst', '') || attr(camera, 'preset', ''));
  const lightPreset = String(attr(lightRig, 'rig', '') || attr(lightRig, 'type', ''));
  return {
    relationship,
    content: {
      model3d: {
        cameraOrbit: '', cameraTarget: '', fieldOfView: '', exposure: 1.15,
        shadowIntensity: /flat|none/i.test(lightPreset) ? 0 : 0.35,
        shadowSoftness: 0.85, autoRotate: false, rotationPerSecond: 18,
        environment: /none|flat/i.test(lightPreset) ? 'none' : /soft|balanced|threept/i.test(lightPreset) ? 'soft' : 'neutral',
        variant: '', animationName: '', animationSpeed: 1, hotspots: [],
      },
      source3d: {
        cameraPreset: cameraPreset || null, lightPreset: lightPreset || null,
        rotation: rotation ? { x: numberAttr(rotation, 'lat'), y: numberAttr(rotation, 'lon'), z: numberAttr(rotation, 'rev') } : null,
      },
    },
  };
};
const effectFromFilter = (filter, transition) => {
  const value = String(filter || '').toLowerCase();
  const directionName = (value.match(/\(([^)]+)\)/)?.[1] || '').replace(/[^a-z]/g, '');
  const directions = {
    left: 'left', right: 'right', up: 'top', down: 'bottom', top: 'top', bottom: 'bottom',
    horizontal: 'horizontal', vertical: 'vertical', w: 'left', e: 'right', n: 'top', s: 'bottom',
    topleft: 'top-left', upperleft: 'top-left', northwest: 'top-left', topright: 'top-right', upperright: 'top-right', northeast: 'top-right',
    bottomleft: 'bottom-left', lowerleft: 'bottom-left', southwest: 'bottom-left', bottomright: 'bottom-right', lowerright: 'bottom-right', southeast: 'bottom-right',
  };
  const splitOrientation = /^(horizontal|vertical)/.exec(directionName)?.[1];
  const direction = directions[directionName] || splitOrientation;
  const isFloat = value.startsWith('float');
  const effect = value.startsWith('fade') ? 'fade'
    : value.startsWith('fly') ? 'fly-in'
      : isFloat ? 'float-in'
      : value.startsWith('wipe') ? 'wipe'
        : value.startsWith('zoom') || value.startsWith('stretch') ? 'zoom'
          : value.startsWith('wheel') ? 'wheel'
            : value.startsWith('split') ? 'split'
              : value.startsWith('blinds') ? 'blinds'
                : value.startsWith('random') || value.startsWith('strips') ? 'random-bars'
                  : value.startsWith('box') ? 'box'
                    : value.startsWith('diamond') ? 'shape' : null;
  if (!effect) return null;
  const exit = String(transition || 'in').toLowerCase() === 'out';
  const splitMode = directionName.includes('out') ? 'out' : 'in';
  const result = {
    effect: exit ? ({ fade: 'fade-out', 'fly-in': 'fly-out', 'float-in': 'float-out', wipe: 'wipe-out', zoom: 'zoom-out', wheel: 'wheel-out', split: 'split-out', blinds: 'split-out', 'random-bars': 'random-bars-out', box: 'shape-out', shape: 'shape-out' })[effect] || effect : effect,
    ...(direction ? { direction } : {}),
    ...(effect === 'split' ? { splitMode } : {}),
    ...(value.startsWith('diamond') ? { shapeKind: 'diamond' } : {}),
  };
  const wheelSpokes = Number(directionName);
  if (effect === 'wheel' && [1, 2, 3, 4, 8].includes(wheelSpokes)) result.spokes = wheelSpokes;
  return result;
};
const directionFromTransition = (effectNode) => {
  const direction = String(attr(effectNode, 'dir', '') || '').toLowerCase();
  return ({ l: 'left', r: 'right', u: 'top', d: 'bottom', horz: 'horizontal', horizontal: 'horizontal', vert: 'vertical', vertical: 'vertical' })[direction] || undefined;
};
const transitionForSlide = (slideRoot, issues, slidePart, enabled, packageView, slideRelationships, resources) => {
  const transition = firstDescendant(slideRoot, 'transition');
  if (!transition) return undefined;
  if (!enabled) {
    issues.push(importIssue({ severity: 'info', code: 'PPTX_TRANSITION_DEFERRED', message: 'PowerPoint transition import was disabled in Import settings', sourceScreenId: slidePart, fallbackApplied: 'disabled-by-option' }));
    return undefined;
  }
  const effectAliases = new Map(Object.entries({
    fade: 'fade', push: 'push', wipe: 'wipe', split: 'split', dissolve: 'dissolve', cover: 'cover', pull: 'uncover',
    randombar: 'random-bars', wheel: 'clock', zoom: 'zoom', morph: 'morph', cut: 'cut', blinds: 'blinds',
    checker: 'checkerboard', checkerboard: 'checkerboard', circle: 'shape', diamond: 'shape', plus: 'shape', comb: 'comb',
    wedge: 'clock', random: 'random', strips: 'random-bars', newsflash: 'flash', flash: 'flash', fallover: 'fall-over',
    drape: 'drape', curtains: 'curtains', wind: 'wind', prestige: 'prestige', fracture: 'fracture', crush: 'crush',
    peeloff: 'peel-off', pagecurl: 'page-curl', pagecurlsingle: 'page-curl', airplane: 'airplane', origami: 'origami', conveyor: 'conveyor',
    doors: 'doors', ferris: 'ferris-wheel', ferriswheel: 'ferris-wheel', flip: 'flip', flythrough: 'fly-through',
    gallery: 'gallery', glitter: 'glitter', honeycomb: 'honeycomb', pan: 'pan', ripple: 'ripple', rotate: 'rotate',
    shred: 'shred', switch: 'switch', vortex: 'vortex', warp: 'fly-through', prism: 'cube', cube: 'cube', window: 'window',
  }));
  const effectNode = [transition, ...allDescendants(transition)].find((entry) => {
    const name = localName(entry?.['#name']).toLowerCase();
    return effectAliases.has(name) || name === 'prsttrans';
  });
  const nodeName = localName(effectNode?.['#name'] || '');
  const effectName = nodeName.toLowerCase() === 'prsttrans' ? String(attr(effectNode, 'prst', '')) : nodeName;
  const effect = effectAliases.get(effectName.toLowerCase());
  if (!effect) {
    issues.push(importIssue({ severity: 'warning', code: 'PPTX_TRANSITION_UNSUPPORTED', message: 'This PowerPoint transition is not mapped to a supported Spectropy transition', sourceScreenId: slidePart, fallbackApplied: 'no-transition', details: { effect: effectName || 'unknown' } }));
    return undefined;
  }
  const speed = String(attr(transition, 'spd', 'med')).toLowerCase();
  const explicitDuration = Number(attr(transition, 'dur'));
  const duration = Number.isFinite(explicitDuration) && explicitDuration > 0
    ? Math.max(0.1, Math.min(20, explicitDuration / 1000))
    : speed === 'slow' ? 1.2 : speed === 'fast' ? 0.4 : 0.7;
  const advanceAfter = attr(transition, 'advTm');
  const direction = String(attr(effectNode, 'invX', '0')) === '1' ? 'left' : directionFromTransition(effectNode) || 'right';
  const option = effect === 'split'
    ? `${String(attr(effectNode, 'orient', 'vertical')).startsWith('h') ? 'horizontal' : 'vertical'}-${String(attr(effectNode, 'dir', 'out')).toLowerCase() === 'in' ? 'in' : 'out'}`
    : effect === 'shape' ? ({ circle: 'circle', diamond: 'diamond', plus: 'plus' })[effectName.toLowerCase()] || 'circle'
      : effect === 'clock' && effectName.toLowerCase() === 'wedge' ? 'wedge'
        : effect === 'morph' ? ({ byobject: 'objects', byword: 'words', bychar: 'characters' })[String(attr(effectNode, 'option', 'byObject')).toLowerCase()] || 'objects'
        : direction;
  const transitionSoundNode = firstDescendant(transition, 'snd');
  const transitionSoundRelationship = transitionSoundNode
    ? slideRelationships?.get(attr(transitionSoundNode, 'embed'))
    : null;
  const transitionSoundPart = transitionSoundRelationship?.target;
  const transitionSoundType = transitionSoundPart ? mediaTypeFor(transitionSoundPart) : null;
  let customSound;
  if (transitionSoundPart && transitionSoundType?.startsWith('audio/') && packageView?.entries.has(transitionSoundPart)) {
    const resourceSourceId = `pptx:${transitionSoundPart}`;
    if (!resources.some((resource) => resource.source_id === resourceSourceId)) {
      const bytes = packageView.bytes(transitionSoundPart);
      resources.push({
        source_id: resourceSourceId,
        file_name: path.posix.basename(transitionSoundPart),
        media_type: transitionSoundType,
        bytes,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        metadata: { name: path.posix.basename(transitionSoundPart), package_part: transitionSoundPart, resource_type: 'audio', usage: 'transition_sound' },
      });
    }
    customSound = { resourceSourceId, name: path.posix.basename(transitionSoundPart), mimeType: transitionSoundType };
  }
  return {
    effect, option, direction: option, duration,
    advanceOnClick: String(attr(transition, 'advClick', '1')) !== '0',
    advanceAfterEnabled: advanceAfter !== undefined,
    advanceAfterSeconds: advanceAfter === undefined ? 0 : Math.max(0, Number(advanceAfter) || 0) / 1000,
    ...(customSound ? { sound: 'custom', customSound } : {}),
  };
};
const animationsForSlide = (slideRoot, elements, issues, slidePart, enabled) => {
  const timing = firstDescendant(slideRoot, 'timing');
  if (!timing) return;
  if (!enabled) {
    issues.push(importIssue({ severity: 'info', code: 'PPTX_ANIMATIONS_DEFERRED', message: 'PowerPoint animation import was disabled in Import settings', sourceScreenId: slidePart, fallbackApplied: 'disabled-by-option' }));
    return;
  }
  const byPptxId = new Map(elements.filter((element) => element.metadata?.pptx_shape_id).map((element) => [String(element.metadata.pptx_shape_id), element]));
  const behaviorKinds = new Set(['animEffect', 'set', 'animMotion', 'anim', 'animRot', 'animScale']);
  const animationEntries = [];
  const visit = (parent, ancestors = []) => {
    for (const entry of children(parent)) {
      const path = [...ancestors, entry];
      if (behaviorKinds.has(localName(entry['#name']))) animationEntries.push({ node: entry, ancestors });
      visit(entry, path);
    }
  };
  visit(timing);
  const parsedEntries = animationEntries.map(({ node, ancestors }) => {
    const behavior = firstDescendant(node, 'cBhvr');
    const targetId = String(attr(firstDescendant(behavior, 'spTgt'), 'spid', '') || '');
    const target = byPptxId.get(targetId);
    const timingNode = firstDescendant(node, 'cTn');
    const timingGroup = [...ancestors].reverse().find((entry) => localName(entry['#name']) === 'cTn' &&
      children(entry).some((childEntry) => localName(childEntry['#name']) === 'childTnLst'))
      || [...ancestors].reverse().find((entry) => ['par', 'seq'].includes(localName(entry['#name'])))
      || timing;
    const groupCtn = [...ancestors].reverse().find((entry) => localName(entry['#name']) === 'cTn' && attr(entry, 'nodeType'))
      || (localName(timingGroup['#name']) === 'cTn' ? timingGroup : undefined);
    const animationKind = localName(node['#name']);
    let mapped = null;
    let property = null;
    let value = null;
    if (animationKind === 'set') {
      const attributeName = String(attr(behavior, 'attrName', '') || textValue(firstDescendant(behavior, 'attrName')) || '');
      property = attributeName;
      const toNode = firstDescendant(node, 'to');
      const valueNode = firstDescendant(toNode, 'strVal') || firstDescendant(toNode, 'intVal') || toNode;
      value = String(attr(valueNode, 'val', textValue(valueNode)) || '').toLowerCase();
      if (attributeName === 'style.visibility' && ['visible', 'hidden', '1', '0'].includes(value)) {
        mapped = { effect: ['visible', '1'].includes(value) ? 'appear' : 'none', setupVisibility: true, visibilityValue: value };
      }
    } else if (animationKind === 'animEffect') mapped = effectFromFilter(attr(node, 'filter'), attr(node, 'transition'));
    else if (animationKind === 'animMotion') {
      const rawPath = String(attr(node, 'path', '') || '');
      const values = [...rawPath.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0])).filter(Number.isFinite);
      const pairs = [];
      for (let index = 0; index + 1 < values.length; index += 2) pairs.push({ x: values[index], y: values[index + 1] });
      const points = pairs.length >= 2 ? pairs : [{ x: 0, y: 0 }, { x: numberAttr(node, 'byX', 0.2), y: numberAttr(node, 'byY', 0) }];
      const normalized = points.map((point) => ({
        x: Math.round((Math.abs(point.x) <= 4 ? point.x * 1920 : point.x) - (Math.abs(points[0].x) <= 4 ? points[0].x * 1920 : points[0].x)),
        y: Math.round((Math.abs(point.y) <= 4 ? point.y * 1080 : point.y) - (Math.abs(points[0].y) <= 4 ? points[0].y * 1080 : points[0].y)),
      }));
      mapped = { effect: 'path-custom', motionPath: normalized, pathRotate: String(attr(node, 'rAng', '0')) !== '0' };
    } else if (animationKind === 'animRot') {
      const rotation = numberAttr(node, 'by', numberAttr(firstDescendant(node, 'by'), 'val', 21600000)) / 60000;
      mapped = { effect: 'spin', rotation: Math.abs(rotation) || 360, clockwise: rotation >= 0 };
    } else if (animationKind === 'animScale') {
      const by = firstDescendant(node, 'by') || node;
      const amount = (Math.abs(numberAttr(by, 'x', 100000)) + Math.abs(numberAttr(by, 'y', 100000))) / 2000;
      mapped = { effect: 'grow-shrink', amount: amount || 100 };
    } else if (animationKind === 'anim') {
      const attributeName = String(attr(behavior, 'attrName', '') || textValue(firstDescendant(behavior, 'attrName')) || '').toLowerCase();
      property = attributeName;
      const toNode = firstDescendant(node, 'to');
      const valueNode = firstDescendant(toNode, 'strVal') || firstDescendant(toNode, 'fltVal') || firstDescendant(toNode, 'intVal') || toNode;
      value = String(attr(valueNode, 'val', textValue(valueNode)) || '').toLowerCase();
      if (attributeName.includes('visibility')) {
        const visibilityValues = descendants(node, 'strVal').map((entry) => String(attr(entry, 'val', textValue(entry)) || '').toLowerCase()).filter(Boolean);
        value = visibilityValues.at(-1) || value;
      }
      const numericValue = Number(value);
      mapped = attributeName.includes('visibility') && ['visible', 'hidden', '1', '0'].includes(value)
        ? { effect: ['visible', '1'].includes(value) ? 'appear' : 'none', setupVisibility: true, visibilityValue: value }
        : attributeName.includes('opacity')
        ? { effect: 'transparency', amount: Number.isFinite(numericValue) ? Math.round((1 - numericValue) * 100) : 50 }
        : attributeName.includes('fillcolor') || attributeName.includes('fill.color')
          ? { effect: 'fill-color' }
          : null;
    }
    return { node, ancestors, behavior, target, targetId, timingNode, timingGroup, groupCtn, animationKind, mapped, property, value };
  });
  const supportedGroupTargets = new Map();
  for (const entry of parsedEntries) {
    if (!entry.target || !entry.mapped || entry.animationKind === 'set') continue;
    if (!supportedGroupTargets.has(entry.timingGroup)) supportedGroupTargets.set(entry.timingGroup, new Set());
    supportedGroupTargets.get(entry.timingGroup).add(entry.targetId);
  }
  let sequenceOrder = 0;
  const previousByGroupAndTarget = new Map();
  const lastEffectByTarget = new Map();
  const groupIds = new Map();
  let nextGroupId = 0;
  for (const entry of parsedEntries) {
    const { node, behavior, target, targetId, timingNode, timingGroup, groupCtn, animationKind, mapped } = entry;
    if (!target) continue;
    const hasMappedVisualSibling = supportedGroupTargets.get(timingGroup)?.has(targetId) === true;
    if (['set', 'anim'].includes(animationKind) && mapped?.setupVisibility && (mapped.visibilityValue === 'hidden' || hasMappedVisualSibling)) continue;
    if (animationKind === 'set' && entry.property === 'style.opacity') {
      const opacity = Number(entry.value);
      const previousEffect = lastEffectByTarget.get(target.source_id);
      if (previousEffect && Number.isFinite(opacity)) {
        if (opacity <= 0.01) previousEffect.afterAnimation = 'hide-after';
        else if (opacity < 0.5) previousEffect.afterAnimation = 'dim';
      }
      // Opacity setters encode PowerPoint's after-animation state. The player
      // models that state on the preceding cue, so it is not a second click.
      continue;
    }
    if (!mapped) {
      issues.push(importIssue({ severity: 'warning', code: 'PPTX_ANIMATION_UNSUPPORTED', message: 'A PowerPoint animation was preserved in the import report but has no Spectropy mapping', sourceScreenId: slidePart, sourceElementId: target.source_id, fallbackApplied: 'animation-skipped', details: { animation: localName(node['#name']), filter: attr(node, 'filter') || null, property: entry.property || null, value: entry.value || null } }));
      continue;
    }
    if (mapped.effect === 'none') continue;
    const durationMs = Number(attr(timingNode, 'dur', attr(groupCtn, 'dur')));
    const condition = firstDescendant(timingNode, 'cond') || firstDescendant(groupCtn, 'cond');
    const rawDelay = Number(attr(condition, 'delay'));
    const nodeType = String(attr(groupCtn, 'nodeType', attr(timingNode, 'nodeType', '')) || '').toLowerCase();
    const triggerId = String(attr(firstDescendant(condition, 'spTgt'), 'spid', '') || '');
    const triggerTarget = byPptxId.get(triggerId);
    const mappedStart = triggerTarget ? 'trigger' : nodeType.includes('after') ? 'after-previous' : nodeType.includes('with') ? 'with-previous' : 'on-click';
    if (!groupIds.has(timingGroup)) groupIds.set(timingGroup, nextGroupId++);
    const groupAndTarget = `${groupIds.get(timingGroup)}:${targetId}`;
    const start = triggerTarget ? 'trigger' : previousByGroupAndTarget.has(groupAndTarget) ? 'with-previous' : mappedStart;
    const repeatCount = attr(timingNode, 'repeatCount', attr(groupCtn, 'repeatCount'));
    const repeat = repeatCount === 'indefinite'
      ? (nodeType.includes('click') ? 'until-next-click' : 'until-end')
      : repeatCount !== undefined && Number(repeatCount) > 0 ? Number(repeatCount) : undefined;
    const effect = {
      id: 'pptx-animation-' + sequenceOrder,
      effect: mapped.effect,
      duration: Number.isFinite(durationMs) && durationMs > 0 ? durationMs / 1000 : 0.8,
      delay: Number.isFinite(rawDelay) && rawDelay > 0 ? rawDelay / 1000 : 0,
      start,
      sequenceOrder,
      ...(repeat !== undefined ? { repeat } : {}),
      ...(String(attr(timingNode, 'autoRev', '0')) === '1' ? { autoReverse: true } : {}),
      ...(mapped.direction ? { direction: mapped.direction } : {}),
      ...(mapped.shapeKind ? { shapeKind: mapped.shapeKind } : {}),
      ...(mapped.splitMode ? { splitMode: mapped.splitMode } : {}),
      ...(mapped.spokes ? { spokes: mapped.spokes } : {}),
      ...(mapped.motionPath ? { motionPath: mapped.motionPath, lockPathOrigin: true, pathRotate: mapped.pathRotate } : {}),
      ...(mapped.rotation ? { rotation: mapped.rotation, clockwise: mapped.clockwise } : {}),
      ...(mapped.amount ? { amount: mapped.amount } : {}),
      ...(triggerTarget ? { triggerSourceElementId: triggerTarget.source_id } : {}),
      ...(firstDescendant(node, 'iterate') ? {
        textSequence: String(attr(firstDescendant(node, 'iterate'), 'type', '')).toLowerCase().includes('word') ? 'word'
          : String(attr(firstDescendant(node, 'iterate'), 'type', '')).toLowerCase().includes('letter') ? 'letter' : 'paragraph',
      } : {}),
    };
    const current = target.content.animation && typeof target.content.animation === 'object' ? target.content.animation : {};
    const effects = Array.isArray(current.effects) ? current.effects : [];
    target.content.animation = { ...current, effects: [...effects, effect], effect: String(effects[0]?.effect || effect.effect), duration: Number(effects[0]?.duration) || effect.duration, delay: Number(effects[0]?.delay) || effect.delay };
    sequenceOrder += 1;
    previousByGroupAndTarget.set(groupAndTarget, effect.id);
    lastEffectByTarget.set(target.source_id, effect);
  }
};

const imageTreatmentFrom = (blip) => {
  const filters = [];
  if (firstDescendant(blip, 'grayscl')) filters.push('grayscale(1)');
  const luminance = firstDescendant(blip, 'lum');
  if (luminance) {
    const brightness = Math.max(0, 1 + Math.max(-1, Math.min(1, numberAttr(luminance, 'bright', 0) / 100000)));
    const contrast = Math.max(0, 1 + Math.max(-1, Math.min(1, numberAttr(luminance, 'contrast', 0) / 100000)));
    if (Math.abs(brightness - 1) > 0.001) filters.push(`brightness(${brightness})`);
    if (Math.abs(contrast - 1) > 0.001) filters.push(`contrast(${contrast})`);
  }
  const alpha = firstDescendant(blip, 'alphaModFix');
  const opacity = alpha ? Math.max(0, Math.min(1, numberAttr(alpha, 'amt', 100000) / 100000)) : undefined;
  const supported = new Set(['embed', 'link', 'grayscl', 'lum', 'alphaModFix', 'extLst']);
  const unsupported = [...new Set(children(blip).map((entry) => localName(entry['#name'])).filter((name) => !supported.has(name)))];
  return { ...(filters.length ? { filter: filters.join(' ') } : {}), ...(opacity !== undefined ? { opacity } : {}), unsupported };
};

const collectSlideElements = async ({
  packageView, slidePart, slideRoot, slideRelationships, layoutPlaceholders, masterPlaceholders,
  themeColors, themeFonts, issues, resources, fallback,
  fontScale, canvasScale,
}) => {
  const tree = firstDescendant(slideRoot, 'spTree');
  const output = [];
  const seenResources = new Set(resources.map((resource) => resource.source_id));
  const screenId = slidePart;
  let zIndex = 0;
  const visit = async (entry, groupContext = null, groupPath = []) => {
    const kind = localName(entry?.['#name']);
    if (['nvGrpSpPr', 'grpSpPr'].includes(kind)) return;
    if (kind === 'AlternateContent') {
      const selectedBranch = child(entry, 'Choice') || child(entry, 'Fallback');
      if (selectedBranch) {
        for (const nested of children(selectedBranch)) await visit(nested, groupContext, groupPath);
      }
      return;
    }
    if (kind === 'grpSp') {
      const groupSourceId = `${sourceElementId(entry, `group-${zIndex}`)}-${zIndex}`;
      const nextContext = groupContextFrom(entry, groupContext);
      const nextPath = [...groupPath, groupSourceId];
      for (const nested of children(entry)) await visit(nested, nextContext, nextPath);
      return;
    }
    const baseTransform = kind === 'sp' ? inheritedTransform(entry, layoutPlaceholders, masterPlaceholders) : transformFrom(entry);
    if (!baseTransform) return;
    const transform = applyGroupTransform(baseTransform, groupContext);
    const bounds = { x: transform.x, y: transform.y, width: transform.width, height: transform.height };
    const id = `${kind}-${sourceElementId(entry, zIndex + 1)}-${zIndex + 1}`;
    const metadata = metadataFor(entry);
    const inheritedShapes = kind === 'sp' ? inheritedPlaceholderShapes(entry, layoutPlaceholders, masterPlaceholders) : [];
    const group = groupPath.length ? {
      source_id: groupPath[0],
      leaf_source_id: groupPath[groupPath.length - 1],
      hierarchy: groupPath,
    } : undefined;
    if (kind === 'pic') {
      const embeddedModel = model3DRelationshipFor(entry, slideRelationships);
      if (embeddedModel && packageView.entries.has(embeddedModel.relationship.target)) {
        const modelPart = embeddedModel.relationship.target;
        const modelBytes = packageView.bytes(modelPart);
        const resourceId = `pptx:${modelPart}`;
        if (!seenResources.has(resourceId)) {
          resources.push({
            source_id: resourceId, file_name: path.posix.basename(modelPart), media_type: 'model/gltf-binary', bytes: modelBytes,
            sha256: createHash('sha256').update(modelBytes).digest('hex'),
            metadata: { name: metadata.name || path.posix.basename(modelPart), alt_text: metadata.alt_text, package_part: modelPart, resource_type: 'model_3d' },
          });
          seenResources.add(resourceId);
        }
        issues.push(importIssue({ severity: 'info', code: 'PPTX_3D_VIEW_APPROXIMATED', message: 'The embedded 3D model remains interactive; PowerPoint camera and lighting metadata use the closest Spectropy view', sourceScreenId: screenId, sourceElementId: id, fallbackApplied: 'interactive-3d-model' }));
        output.push({
          source_id: id, kind: 'embedded_object', bounds, rotation: transform.rotation,
          flip: { horizontal: transform.flipH, vertical: transform.flipV }, z_index: zIndex,
          content: { text: metadata.name || path.posix.basename(modelPart), altText: metadata.alt_text, source: 'pptx', ...embeddedModel.content },
          resource_reference: { source_id: resourceId, fit: 'contain' }, metadata: { ...metadata, model_part: modelPart }, ...(group ? { group } : {}),
        });
        zIndex += 1;
        return;
      }
      const embeddedMedia = mediaRelationshipFor(entry, slideRelationships);
      if (embeddedMedia && packageView.entries.has(embeddedMedia.relationship.target)) {
        const mediaPart = embeddedMedia.relationship.target;
        const mediaBytes = packageView.bytes(mediaPart);
        const resourceId = 'pptx:' + mediaPart;
        if (!seenResources.has(resourceId)) {
          resources.push({
            source_id: resourceId, file_name: path.posix.basename(mediaPart), media_type: embeddedMedia.mediaType, bytes: mediaBytes,
            sha256: createHash('sha256').update(mediaBytes).digest('hex'),
            metadata: { name: metadata.name || path.posix.basename(mediaPart), alt_text: metadata.alt_text, package_part: mediaPart, resource_type: embeddedMedia.kind },
          });
          seenResources.add(resourceId);
        }
        output.push({
          source_id: id, kind: embeddedMedia.kind, bounds, rotation: transform.rotation,
          flip: { horizontal: transform.flipH, vertical: transform.flipV }, z_index: zIndex,
          content: { text: metadata.name || path.posix.basename(mediaPart), altText: metadata.alt_text, mimeType: embeddedMedia.mediaType, source: 'pptx' },
          resource_reference: { source_id: resourceId, fit: 'contain' }, metadata, ...(group ? { group } : {}),
        });
        zIndex += 1;
        return;
      }
      const blip = firstDescendant(entry, 'blip');
      const relationship = slideRelationships.get(attr(blip, 'embed'));
      const mediaPart = relationship?.target;
      const mediaType = mediaPart ? mediaTypeFor(mediaPart) : null;
      if (!mediaPart || !packageView.entries.has(mediaPart) || !mediaType) {
        issues.push(importIssue({ severity: 'warning', code: 'PPTX_IMAGE_UNSUPPORTED', message: `Image ${metadata.name || id} could not be converted`, sourceScreenId: screenId, sourceElementId: id, fallbackApplied: effectiveFallback(fallback) }));
        if (fallback !== 'skip') output.push(placeholderElement({ id, bounds, zIndex, message: 'Unsupported PowerPoint image', metadata, groupId: groupPath[0] }));
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
      const imageTreatment = imageTreatmentFrom(blip);
      if (imageTreatment.unsupported.length) {
        issues.push(importIssue({
          severity: 'warning', code: 'PPTX_IMAGE_TREATMENT_UNSUPPORTED',
          message: 'Some PowerPoint image treatments are not reproduced by the editable image renderer',
          sourceScreenId: screenId, sourceElementId: id, fallbackApplied: 'base-image-preserved',
          details: { treatments: imageTreatment.unsupported },
        }));
      }
      const cropLeft = Math.max(0, Math.min(90, numberAttr(sourceRect, 'l') / 1000));
      const cropRight = Math.max(0, Math.min(90 - cropLeft, numberAttr(sourceRect, 'r') / 1000));
      const cropTop = Math.max(0, Math.min(90, numberAttr(sourceRect, 't') / 1000));
      const cropBottom = Math.max(0, Math.min(90 - cropTop, numberAttr(sourceRect, 'b') / 1000));
      const remainingWidth = Math.max(0.1, 1 - (cropLeft + cropRight) / 100);
      const remainingHeight = Math.max(0.1, 1 - (cropTop + cropBottom) / 100);
      const crop = sourceRect ? {
        cropped: true, edgeCrop: false, cropGeometry: true,
        cropLeft, cropRight, cropTop, cropBottom,
        cropScaleX: Math.min(10, 1 / remainingWidth), cropScaleY: Math.min(10, 1 / remainingHeight),
        cropOffsetX: -(cropLeft / 100) / remainingWidth, cropOffsetY: -(cropTop / 100) / remainingHeight,
      } : undefined;
      const mediaTransform = {
        ...(crop || {}),
        ...(imageTreatment.filter ? { filter: imageTreatment.filter } : {}),
        ...(imageTreatment.opacity !== undefined ? { opacity: imageTreatment.opacity } : {}),
      };
      output.push({
        source_id: id, kind: 'image', bounds, rotation: transform.rotation, flip: { horizontal: transform.flipH, vertical: transform.flipV }, z_index: zIndex,
        content: { ...(Object.keys(mediaTransform).length ? { mediaTransform } : {}), altText: metadata.alt_text, ...(metadata.name ? { text: metadata.name } : {}) },
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
      const customPath = customGeometryPath(customGeometry);
      const shapeKind = customPath ? 'custom-geometry' : SHAPE_KIND[geometry] || shapeKindFromName(metadata.name);
      const mathNodes = descendants(child(entry, 'txBody'), 'oMath');
      const nonMathText = textOutsideMath(child(entry, 'txBody')).trim();
      if (mathNodes.length && !nonMathText) {
        const latex = mathNodes.map((equation) => officeMathValue(equation, 'latex')).filter(Boolean).join(' \\quad ');
        if (latex) {
          output.push({
            source_id: id, kind: 'equation', bounds, rotation: transform.rotation,
            flip: { horizontal: transform.flipH, vertical: transform.flipV }, z_index: zIndex,
            content: { latex, text: latex, altText: metadata.alt_text, fontSize: 42, color: '#0f2747', alignment: 'center' },
            metadata: { ...metadata, equation_format: 'office-math-ml' }, ...(group ? { group } : {}),
          });
          zIndex += 1;
          return;
        }
      }
      const textContent = textContentFrom(entry, slideRelationships, themeColors, themeFonts, issues, { screenId, elementId: id }, fontScale, canvasScale, inheritedShapes);
      const style = shapeStyle(entry, themeColors, Boolean(textContent), inheritedShapes);
      const line = child(shapeProperties, 'ln');
      const connector = kind === 'cxnSp' ? {
        arrowStart: !['', 'none'].includes(String(attr(child(line, 'headEnd'), 'type', 'none'))),
        arrowEnd: !['', 'none'].includes(String(attr(child(line, 'tailEnd'), 'type', 'none'))),
        startConnectionId: String(attr(firstDescendant(child(entry, 'nvCxnSpPr'), 'stCxn'), 'id', '') || ''),
        endConnectionId: String(attr(firstDescendant(child(entry, 'nvCxnSpPr'), 'endCxn'), 'id', '') || ''),
      } : null;
      if (customPath?.unsupported.length) issues.push(importIssue({
        severity: 'info', code: 'PPTX_CUSTOM_GEOMETRY_APPROXIMATED',
        message: 'A custom PowerPoint geometry was reconstructed with unsupported guide details approximated',
        sourceScreenId: screenId, sourceElementId: id, fallbackApplied: 'editable-custom-path',
        details: { unsupported: customPath.unsupported },
      }));
      if (!shapeKind && !textContent) {
        issues.push(importIssue({ severity: 'warning', code: 'PPTX_SHAPE_UNSUPPORTED', message: `Shape ${geometry || metadata.name || id} is not editable`, sourceScreenId: screenId, sourceElementId: id, fallbackApplied: effectiveFallback(fallback) }));
        if (fallback !== 'skip') output.push(placeholderElement({ id, bounds, zIndex, message: `Unsupported shape: ${geometry || 'custom'}`, metadata, groupId: groupPath[0] }));
      } else {
        const elementKind = textContent ? 'text' : 'shape';
        output.push({
          source_id: id, kind: elementKind, bounds, rotation: transform.rotation,
          flip: { horizontal: transform.flipH, vertical: transform.flipV }, z_index: zIndex,
          content: textContent
            ? { ...textContent, altText: metadata.alt_text, ...(shapeKind ? { kind: shapeKind, ...style, ...(customPath ? { customPath: customPath.path } : {}), ...(connector || {}) } : {}) }
            : { kind: shapeKind || 'rectangle', altText: metadata.alt_text, ...style, ...(customPath ? { customPath: customPath.path } : {}), ...(connector || {}) },
          style: { fill: { color: style.fill, opacity: style.opacity }, line: { color: style.stroke, width: style.strokeWidth } },
          metadata: { ...metadata, geometry, ...(connector ? { connector } : {}) }, ...(group ? { group } : {}),
        });
      }
      zIndex += 1;
      return;
    }
    if (kind === 'graphicFrame') {
      const embeddedModel = model3DRelationshipFor(entry, slideRelationships);
      if (embeddedModel && packageView.entries.has(embeddedModel.relationship.target)) {
        const modelPart = embeddedModel.relationship.target;
        const modelBytes = packageView.bytes(modelPart);
        const resourceId = `pptx:${modelPart}`;
        if (!seenResources.has(resourceId)) {
          resources.push({
            source_id: resourceId, file_name: path.posix.basename(modelPart), media_type: 'model/gltf-binary', bytes: modelBytes,
            sha256: createHash('sha256').update(modelBytes).digest('hex'),
            metadata: { name: metadata.name || path.posix.basename(modelPart), alt_text: metadata.alt_text, package_part: modelPart, resource_type: 'model_3d' },
          });
          seenResources.add(resourceId);
        }
        issues.push(importIssue({ severity: 'info', code: 'PPTX_3D_VIEW_APPROXIMATED', message: 'The embedded 3D model remains interactive; PowerPoint camera and lighting metadata use the closest Spectropy view', sourceScreenId: screenId, sourceElementId: id, fallbackApplied: 'interactive-3d-model' }));
        output.push({
          source_id: id, kind: 'embedded_object', bounds, rotation: transform.rotation, z_index: zIndex,
          content: { text: metadata.name || path.posix.basename(modelPart), altText: metadata.alt_text, source: 'pptx', ...embeddedModel.content },
          resource_reference: { source_id: resourceId, fit: 'contain' }, metadata: { ...metadata, model_part: modelPart }, ...(group ? { group } : {}),
        });
        zIndex += 1;
        return;
      }
      const table = tableFromGraphicFrame(entry, {
        relationships: slideRelationships, themeColors, themeFonts, issues,
        textContext: { screenId, elementId: id }, fontScale, canvasScale,
      });
      if (table) {
        output.push({ source_id: id, kind: 'table', bounds, rotation: transform.rotation, z_index: zIndex, content: table.content, metadata: { ...metadata, source_rows: table.sourceRows, source_columns: table.sourceColumns }, ...(group ? { group } : {}) });
        zIndex += 1;
        return;
      }
      try {
        const diagram = await smartDiagramFromParts({
          entry, relationships: slideRelationships, packageView, themeColors, issues,
          screenId, elementId: id, metadata,
        });
        if (diagram) {
          output.push({
            source_id: id, kind: 'diagram', bounds, rotation: transform.rotation, z_index: zIndex,
            content: diagram, metadata: { ...metadata, smartart: true }, ...(group ? { group } : {}),
          });
          zIndex += 1;
          return;
        }
      } catch (error) {
        issues.push(importIssue({
          severity: 'warning', code: 'PPTX_SMARTART_READ_FAILED',
          message: 'SmartArt data could not be reconstructed from this PowerPoint package',
          sourceScreenId: screenId, sourceElementId: id, fallbackApplied: effectiveFallback(fallback),
          details: { error: String(error?.message || error) },
        }));
      }
      const chartNode = firstDescendant(entry, 'chart');
      const chartRelationship = chartNode ? slideRelationships.get(attr(chartNode, 'id')) : null;
      if (chartRelationship?.target && packageView.entries.has(chartRelationship.target)) {
        try {
          const chartDocument = await parseXml(packageView.text(chartRelationship.target), chartRelationship.target);
          const chartRelationships = await relationshipsFor(packageView, chartRelationship.target);
          const workbookRelationship = [...chartRelationships.values()].find((relationship) => relationship?.target
            && /package|embeddedpackage/i.test(String(relationship.type || ''))
            && /\.xlsx$/i.test(relationship.target));
          const workbook = workbookRelationship?.target && packageView.entries.has(workbookRelationship.target)
            ? await workbookDataFrom(packageView.bytes(workbookRelationship.target)) : null;
          const chart = chartFromPart(rootOf(chartDocument), themeColors, workbook);
          if (chart) {
            issues.push(importIssue({ severity: 'info', code: 'PPTX_CHART_STYLE_SIMPLIFIED', message: 'Cached chart data remains editable; PowerPoint axis, legend, and detailed chart styling may be simplified', sourceScreenId: screenId, sourceElementId: id, fallbackApplied: 'editable-data-chart' }));
            if (!['barChart', 'lineChart', 'pieChart', 'doughnutChart'].includes(chart.sourceChartType)) issues.push(importIssue({ severity: 'info', code: 'PPTX_CHART_APPROXIMATED', message: 'A 3D, area, or scatter chart was mapped to the closest editable Spectropy chart type', sourceScreenId: screenId, sourceElementId: id, fallbackApplied: 'editable-2d-chart', details: { source_type: chart.sourceChartType } }));
            if (chart.sourceChartTypes.length > 1) issues.push(importIssue({ severity: 'warning', code: 'PPTX_COMBO_CHART_APPROXIMATED', message: 'This combination chart was reconstructed using its first chart type; additional chart types are not represented', sourceScreenId: screenId, sourceElementId: id, fallbackApplied: 'first-chart-type-preserved', details: { source_types: chart.sourceChartTypes } }));
            if (workbook) issues.push(importIssue({ severity: 'info', code: 'PPTX_CHART_WORKBOOK_IMPORTED', message: 'Embedded workbook values were used to reconstruct editable chart data', sourceScreenId: screenId, sourceElementId: id, fallbackApplied: 'editable-workbook-chart', details: { workbook_part: workbookRelationship.target } }));
            output.push({ source_id: id, kind: 'chart', bounds, rotation: transform.rotation, z_index: zIndex, content: { ...chart, visualType: 'chart', altText: metadata.alt_text }, metadata: { ...metadata, chart_part: chartRelationship.target }, ...(group ? { group } : {}) });
            zIndex += 1;
            return;
          }
          issues.push(importIssue({ severity: 'warning', code: 'PPTX_CHART_CACHE_EMPTY', message: 'This chart has no cached data that Spectropy can reconstruct', sourceScreenId: screenId, sourceElementId: id, fallbackApplied: effectiveFallback(fallback), details: { chart_part: chartRelationship.target } }));
        } catch {
          issues.push(importIssue({ severity: 'warning', code: 'PPTX_CHART_READ_FAILED', message: 'Chart data could not be read from its PowerPoint package part', sourceScreenId: screenId, sourceElementId: id, fallbackApplied: effectiveFallback(fallback) }));
        }
      }
      const graphicUri = attr(firstDescendant(entry, 'graphicData'), 'uri', 'graphic-frame');
      issues.push(importIssue({ severity: 'warning', code: 'PPTX_GRAPHIC_FRAME_DEFERRED', message: `${metadata.name || 'PowerPoint object'} is outside the editable MVP`, sourceScreenId: screenId, sourceElementId: id, fallbackApplied: effectiveFallback(fallback), details: { graphic_uri: graphicUri } }));
      if (fallback !== 'skip') output.push(placeholderElement({ id, bounds, zIndex, message: 'Unsupported PowerPoint object', metadata, groupId: groupPath[0] }));
      zIndex += 1;
    }
  };
  for (const entry of children(tree)) await visit(entry);
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
    const elements = await collectSlideElements({
      packageView, slidePart, slideRoot, slideRelationships,
      layoutPlaceholders: placeholderShapes(layoutTree), masterPlaceholders: placeholderShapes(masterTree),
      themeColors, themeFonts, issues, resources, fallback,
      fontScale: EMU_PER_POINT * canvasScale,
      canvasScale,
    });
    const importAnimations = options.animations !== false;
    animationsForSlide(slideRoot, elements, issues, slidePart, importAnimations);
    const transition = transitionForSlide(slideRoot, issues, slidePart, importAnimations, packageView, slideRelationships, resources);
    const notesRelationship = [...slideRelationships.values()].find((relationship) => /notesSlide$/i.test(relationship.type));
    let speakerNotes = '';
    if (notesRelationship?.target && packageView.entries.has(notesRelationship.target)) {
      const notesDocument = await parseXml(packageView.text(notesRelationship.target), notesRelationship.target);
      const noteTree = firstDescendant(rootOf(notesDocument), 'spTree');
      const notes = children(noteTree).filter((entry) => localName(entry['#name']) === 'sp' && !['sldNum', 'hdr', 'ftr', 'dt'].includes(placeholderIdentity(entry)?.type));
      speakerNotes = notes.map((shape) => {
        const body = child(shape, 'txBody');
        return children(body).filter((entry) => localName(entry['#name']) === 'p').map((paragraph) => plainTextWithMath(paragraph).trim()).filter(Boolean).join('\n');
      }).filter(Boolean).join('\n').trim();
    }
    slides.push({
      source_id: slidePart,
      title: titleFromElements(elements, index + 1), width, height,
      background: backgroundFrom(slideRoot, layoutRoot, masterRoot, themeColors),
      elements, notes: { speaker_notes: speakerNotes }, ...(transition ? { transition } : {}),
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
  table_count: slide.elements.filter((element) => element.kind === 'table').length,
  equation_count: slide.elements.filter((element) => element.kind === 'equation').length,
  chart_count: slide.elements.filter((element) => element.kind === 'chart').length,
  diagram_count: slide.elements.filter((element) => element.kind === 'diagram').length,
  media_count: slide.elements.filter((element) => ['audio', 'video'].includes(element.kind)).length,
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
    defaults: { selected_slide_ids: summaries.map((slide) => slide.source_id), formatting: 'source', fit_mode: 'fit', fallback: 'picture', animations: true },
  };
};

export const buildPptxImportDocument = async ({ file, options = {} }) => {
  const model = await packageModel(file?.buffer, file?.originalname, options);
  const sourceSha256 = createHash('sha256').update(file.buffer).digest('hex');
  const sourceResourceId = `pptx:source:${sourceSha256}`;
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
  const referenced = new Set(screens.flatMap((screen) => [
    ...screen.elements.map((element) => element.resource_reference?.source_id).filter(Boolean),
    screen.transition?.customSound?.resourceSourceId,
  ].filter(Boolean)));
  return {
    schema_version: IMPORT_SCHEMA_VERSION,
    source: {
      kind: 'pptx', name: cleanFileName(file.originalname),
      sha256: sourceSha256,
      resource_source_id: sourceResourceId,
      options: { formatting: options.formatting || 'source', fit_mode: options.fit_mode || 'fit', fallback: options.fallback || 'picture', animations: options.animations !== false },
    },
    screens,
    resources: [
      ...model.resources.filter((resource) => referenced.has(resource.source_id)),
      {
        source_id: sourceResourceId,
        file_name: cleanFileName(file.originalname),
        media_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        bytes: file.buffer,
        sha256: sourceSha256,
        metadata: { name: cleanFileName(file.originalname), resource_type: 'presentation', usage: 'pptx_round_trip_source' },
      },
    ],
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
        tables: document.screens.reduce((total, screen) => total + screen.elements.filter((element) => element.kind === 'table').length, 0),
        equations: document.screens.reduce((total, screen) => total + screen.elements.filter((element) => element.kind === 'equation').length, 0),
        charts: document.screens.reduce((total, screen) => total + screen.elements.filter((element) => element.kind === 'chart').length, 0),
        diagrams: document.screens.reduce((total, screen) => total + screen.elements.filter((element) => element.kind === 'diagram').length, 0),
        media: document.screens.reduce((total, screen) => total + screen.elements.filter((element) => ['audio', 'video'].includes(element.kind)).length, 0),
        resources: document.resources.length,
        warnings: document.issues.filter((issue) => issue.severity === 'warning').length,
      },
    },
  };
};

export { LIMITS as PPTX_IMPORT_LIMITS };
