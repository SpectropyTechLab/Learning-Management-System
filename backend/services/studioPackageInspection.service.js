import path from 'node:path';
import AdmZip from 'adm-zip';
import { load } from 'cheerio';
import mime from 'mime-types';
import { AppError } from '../utils/errors.js';

const MAX_FILES = Number(process.env.STUDIO_PACKAGE_MAX_FILES || 500);
const MAX_FILE_BYTES = Number(process.env.STUDIO_PACKAGE_MAX_FILE_BYTES || 25 * 1024 * 1024);
const MAX_TOTAL_BYTES = Number(process.env.STUDIO_PACKAGE_MAX_TOTAL_BYTES || 100 * 1024 * 1024);
const MAX_COMPRESSION_RATIO = Number(process.env.STUDIO_PACKAGE_MAX_COMPRESSION_RATIO || 200);
const BLOCKED_EXTENSIONS = new Set([
  '.asp', '.aspx', '.bat', '.cgi', '.class', '.cmd', '.com', '.dll', '.exe', '.htaccess',
  '.jar', '.jsp', '.msi', '.php', '.pl', '.ps1', '.py', '.rb', '.sh', '.war',
]);
const DEPENDENCY_ATTRIBUTES = [
  ['script[src]', 'src'],
  ['link[href]', 'href'],
  ['img[src]', 'src'],
  ['audio[src]', 'src'],
  ['video[src]', 'src'],
  ['source[src]', 'src'],
  ['track[src]', 'src'],
  ['iframe[src]', 'src'],
  ['object[data]', 'data'],
];

const positiveLimit = (value, fallback) => Number.isFinite(value) && value > 0 ? value : fallback;
const limits = {
  maxFiles: positiveLimit(MAX_FILES, 500),
  maxFileBytes: positiveLimit(MAX_FILE_BYTES, 25 * 1024 * 1024),
  maxTotalBytes: positiveLimit(MAX_TOTAL_BYTES, 100 * 1024 * 1024),
  maxCompressionRatio: positiveLimit(MAX_COMPRESSION_RATIO, 200),
};

export const normalizeStudioRuntimePath = (value, label = 'Package path') => {
  const raw = String(value || '').replaceAll('\\', '/').trim();
  if (!raw || raw.includes('\0') || raw.startsWith('/') || /^[a-zA-Z]:/.test(raw)) {
    throw new AppError(`${label} is unsafe`, 400);
  }
  const segments = raw.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new AppError(`${label} is unsafe`, 400);
  }
  const normalized = path.posix.normalize(raw);
  if (normalized === '..' || normalized.startsWith('../')) {
    throw new AppError(`${label} is unsafe`, 400);
  }
  return normalized;
};

const isSymbolicLink = (entry) => {
  const attributes = Number(entry?.attr ?? entry?.header?.attr ?? 0);
  const unixMode = (attributes >>> 16) & 0xffff;
  return (unixMode & 0o170000) === 0o120000;
};

const assertAllowedExtension = (filePath) => {
  const extension = path.posix.extname(filePath).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(extension)) {
    throw new AppError(`Package contains a blocked file type: ${filePath}`, 400);
  }
};

const resolveDependency = (reference, entryPoint) => {
  const raw = String(reference || '').trim();
  if (!raw || raw.startsWith('#') || raw.startsWith('data:') || raw.startsWith('blob:')) return null;
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(raw) || /^[a-z][a-z0-9+.-]*:/i.test(raw)) {
    throw new AppError(`External package dependency is not allowed: ${raw}`, 400);
  }
  const withoutQuery = raw.split('#')[0].split('?')[0];
  let decoded;
  try {
    decoded = decodeURIComponent(withoutQuery);
  } catch {
    throw new AppError(`Package dependency has invalid encoding: ${raw}`, 400);
  }
  if (!decoded) return null;
  if (decoded.startsWith('/')) {
    throw new AppError(`Package dependency must use a relative path: ${raw}`, 400);
  }
  return normalizeStudioRuntimePath(
    path.posix.join(path.posix.dirname(entryPoint), decoded),
    `Package dependency ${raw}`
  );
};

const inspectHtmlDependencies = ({ html, entryPoint, availablePaths }) => {
  const $ = load(html);
  if ($('base[href]').length) {
    throw new AppError('HTML packages cannot define a base URL', 400);
  }
  const dependencies = new Set();
  for (const [selector, attribute] of DEPENDENCY_ATTRIBUTES) {
    $(selector).each((_index, element) => {
      const resolved = resolveDependency($(element).attr(attribute), entryPoint);
      if (resolved) dependencies.add(resolved);
    });
  }
  for (const dependency of dependencies) {
    if (!availablePaths.has(dependency.toLowerCase())) {
      throw new AppError(`Package dependency not found: ${dependency}`, 400);
    }
  }
  return [...dependencies].sort();
};

const chooseEntryPoint = (files, requestedEntryPoint) => {
  const byLowerPath = new Map(files.map((file) => [file.path.toLowerCase(), file.path]));
  if (requestedEntryPoint) {
    const requested = normalizeStudioRuntimePath(requestedEntryPoint, 'entry_point');
    const actual = byLowerPath.get(requested.toLowerCase());
    if (!actual) throw new AppError(`Package entry point not found: ${requested}`, 400);
    if (!/\.html?$/i.test(actual)) throw new AppError('entry_point must be an HTML file', 400);
    return actual;
  }

  const indexFiles = files
    .filter((file) => path.posix.basename(file.path).toLowerCase() === 'index.html')
    .sort((left, right) => left.path.split('/').length - right.path.split('/').length ||
      left.path.localeCompare(right.path));
  if (indexFiles.length) return indexFiles[0].path;

  const htmlFiles = files.filter((file) => /\.html?$/i.test(file.path));
  if (htmlFiles.length === 1) return htmlFiles[0].path;
  throw new AppError('ZIP must contain index.html or an explicit HTML entry_point', 400);
};

const inspectScormManifest = ({ files, availablePaths }) => {
  const manifest = files.find((candidate) => candidate.path.toLowerCase() === 'imsmanifest.xml');
  if (!manifest) throw new AppError('SCORM package must contain imsmanifest.xml at its root', 400);
  const $ = load(manifest.buffer.toString('utf8'), { xmlMode: true });
  const schemaVersion = $('schemaversion').first().text().trim();
  const edition = /2004/i.test(schemaVersion) ? '2004' : /1\.2/i.test(schemaVersion) ? '1.2' : null;
  if (!edition) throw new AppError(`Unsupported SCORM schema version: ${schemaVersion || 'missing'}`, 400);

  const resources = new Map();
  $('resources > resource').each((_index, element) => {
    const node = $(element);
    const identifier = String(node.attr('identifier') || '').trim();
    const href = String(node.attr('href') || '').trim();
    const scormType = String(node.attr('adlcp:scormtype') || node.attr('adlcp:scormType') || '').toLowerCase();
    if (identifier && href && (!scormType || scormType === 'sco')) {
      resources.set(identifier, normalizeStudioRuntimePath(href, `SCORM Resource ${identifier} href`));
    }
  });

  const organization = $('organizations > organization').first();
  if (!organization.length) throw new AppError('SCORM manifest has no default Organization', 400);
  const scos = [];
  organization.find('item').each((_index, element) => {
    const node = $(element);
    const resourceRef = String(node.attr('identifierref') || '').trim();
    const launchPath = resources.get(resourceRef);
    if (!launchPath) return;
    if (!availablePaths.has(launchPath.toLowerCase())) {
      throw new AppError(`SCORM launch file not found: ${launchPath}`, 400);
    }
    scos.push({
      identifier: String(node.attr('identifier') || resourceRef).trim(),
      resource_identifier: resourceRef,
      title: node.children('title').first().text().trim() || launchPath,
      launch_path: launchPath,
      order: scos.length,
    });
  });
  if (!scos.length) throw new AppError('SCORM manifest contains no launchable SCOs', 400);

  const dependencies = new Set();
  for (const sco of scos) {
    if (!/\.html?$/i.test(sco.launch_path)) continue;
    const launchFile = files.find((candidate) => candidate.path.toLowerCase() === sco.launch_path.toLowerCase());
    for (const dependency of inspectHtmlDependencies({
      html: launchFile.buffer.toString('utf8'),
      entryPoint: launchFile.path,
      availablePaths,
    })) dependencies.add(dependency);
  }
  return {
    edition,
    schemaVersion,
    profile: edition === '1.2' ? 'SCORM 1.2' : `SCORM ${schemaVersion}`,
    scos,
    dependencies: [...dependencies].sort(),
  };
};

const inspectZip = ({ file, requestedEntryPoint, resourceType = 'zip' }) => {
  let zip;
  try {
    zip = new AdmZip(file.buffer);
  } catch {
    throw new AppError('The uploaded file is not a valid ZIP package', 400);
  }

  const entries = zip.getEntries().filter((entry) => !entry.isDirectory);
  if (!entries.length) throw new AppError('ZIP package contains no files', 400);
  if (entries.length > limits.maxFiles) {
    throw new AppError(`ZIP package exceeds the ${limits.maxFiles} file limit`, 400);
  }

  const seen = new Set();
  let totalBytes = 0;
  const files = entries.map((entry) => {
    if (isSymbolicLink(entry)) throw new AppError(`ZIP symbolic links are not allowed: ${entry.entryName}`, 400);
    const filePath = normalizeStudioRuntimePath(entry.entryName);
    const comparisonPath = filePath.toLowerCase();
    if (seen.has(comparisonPath)) throw new AppError(`ZIP contains a duplicate path: ${filePath}`, 400);
    seen.add(comparisonPath);
    assertAllowedExtension(filePath);

    const declaredSize = Number(entry.header?.size || 0);
    const compressedSize = Number(entry.header?.compressedSize || 0);
    if (declaredSize > limits.maxFileBytes) {
      throw new AppError(`Package file exceeds the size limit: ${filePath}`, 400);
    }
    if (declaredSize > 1024 * 1024 && compressedSize > 0 && declaredSize / compressedSize > limits.maxCompressionRatio) {
      throw new AppError(`Suspicious ZIP compression ratio: ${filePath}`, 400);
    }

    let buffer;
    try {
      buffer = entry.getData();
    } catch {
      throw new AppError(`Unable to extract package file: ${filePath}`, 400);
    }
    if (buffer.length > limits.maxFileBytes) {
      throw new AppError(`Package file exceeds the size limit: ${filePath}`, 400);
    }
    totalBytes += buffer.length;
    if (totalBytes > limits.maxTotalBytes) {
      throw new AppError('ZIP package exceeds the total extracted-size limit', 400);
    }
    return {
      path: filePath,
      buffer,
      size: buffer.length,
      mimeType: mime.lookup(filePath) || 'application/octet-stream',
    };
  });

  const availablePaths = new Set(files.map((candidate) => candidate.path.toLowerCase()));
  if (resourceType === 'scorm') {
    const scorm = inspectScormManifest({ files, availablePaths });
    return {
      kind: 'scorm',
      entryPoint: scorm.scos[0].launch_path,
      files,
      dependencies: scorm.dependencies,
      extractedSize: totalBytes,
      scorm,
    };
  }

  const entryPoint = chooseEntryPoint(files, requestedEntryPoint);
  const entryFile = files.find((candidate) => candidate.path === entryPoint);
  const dependencies = inspectHtmlDependencies({
    html: entryFile.buffer.toString('utf8'),
    entryPoint,
    availablePaths,
  });

  return {
    kind: 'browser_zip',
    entryPoint,
    files,
    dependencies,
    extractedSize: totalBytes,
  };
};

const inspectSingleHtml = ({ file }) => {
  if (!/\.html?$/i.test(String(file.originalname || '')) && file.mimetype !== 'text/html') {
    throw new AppError('HTML Resources require an .html or .htm file', 400);
  }
  if (!file.buffer?.length) throw new AppError('HTML file is empty', 400);
  if (file.buffer.includes(0)) throw new AppError('HTML file contains invalid binary data', 400);
  const entryPoint = 'index.html';
  const dependencies = inspectHtmlDependencies({
    html: file.buffer.toString('utf8'),
    entryPoint,
    availablePaths: new Set([entryPoint]),
  });
  return {
    kind: 'single_html',
    entryPoint,
    files: [],
    dependencies,
    extractedSize: file.buffer.length,
  };
};

export const inspectRuntimePackage = ({ resourceType, file, requestedEntryPoint = null }) => {
  if (!['html', 'zip', 'scorm'].includes(resourceType)) return null;
  if (!file?.buffer?.length) throw new AppError(`${resourceType} Resources require a file`, 400);
  return ['zip', 'scorm'].includes(resourceType)
    ? inspectZip({ file, requestedEntryPoint, resourceType })
    : inspectSingleHtml({ file });
};

export const getStudioPackageLimits = () => ({ ...limits });
