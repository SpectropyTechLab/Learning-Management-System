import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import mime from 'mime-types';
import supabase from '../config/supabaseClient.js';
import { query as dbQuery } from '../repositories/db.repository.js';
import { AppError } from '../utils/errors.js';
import { normalizeStudioRuntimePath } from './studioPackageInspection.service.js';

const BUCKET = process.env.STUDIO_RESOURCES_BUCKET || 'studio-resources';
const TOKEN_SECRET = process.env.STUDIO_RUNTIME_SECRET || process.env.JWT_SECRET;
const rawTokenSeconds = Number(process.env.STUDIO_RUNTIME_TOKEN_SECONDS || 300);
const TOKEN_SECONDS = Number.isFinite(rawTokenSeconds)
  ? Math.min(Math.max(rawTokenSeconds, 60), 900)
  : 300;
const AUTHOR_ROLES = new Set(['super_admin', 'content_authorizer']);

const parseId = (value, label) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(`${label} must be a positive integer`, 400);
  return id;
};

const canAccessTenant = (clientId, user) => (
  user?.role === 'super_admin' ||
  (user?.role === 'content_authorizer' && !user?.client_id) ||
  clientId === null ||
  (user?.client_id !== undefined && user?.client_id !== null && Number(clientId) === Number(user.client_id))
);

const loadVersion = async (versionId) => {
  const result = await dbQuery(
    `SELECT rv.*, r.client_id, r.resource_type, r.is_active, r.name AS resource_name
     FROM resource_versions rv
     JOIN resources r ON r.id = rv.resource_id
     WHERE rv.id = $1`,
    [versionId]
  );
  return result.rows[0] || null;
};

const runtimeMetadata = (version) => {
  const metadata = version?.metadata_json && typeof version.metadata_json === 'object'
    ? version.metadata_json
    : {};
  if (metadata.runtime && typeof metadata.runtime === 'object') return metadata.runtime;
  if (version?.resource_type === 'html' && version?.storage_key) {
    return {
      kind: 'single_html',
      entry_point: version.entry_point || 'index.html',
      package_prefix: null,
      files: [{
        path: version.entry_point || 'index.html',
        size: Number(version.file_size || 0),
        mime_type: version.mime_type || 'text/html',
      }],
    };
  }
  return null;
};

const encodeRuntimePath = (value) => value.split('/').map(encodeURIComponent).join('/');
const fallbackFor = (versionId) => ({
  type: 'download',
  endpoint: `/api/studio/resource-versions/${versionId}/download`,
});

export const createRuntimeLaunch = async ({
  versionId: rawVersionId,
  user,
  allowAuthorizedReader = false,
  entryPointOverride = null,
  attemptId = null,
}) => {
  if (!AUTHOR_ROLES.has(user?.role) && !allowAuthorizedReader) {
    throw new AppError('Only Studio authors can preview draft executable Resources', 403);
  }
  const versionId = parseId(rawVersionId, 'Resource version ID');
  const version = await loadVersion(versionId);
  if (!version || !canAccessTenant(version.client_id, user)) {
    throw new AppError('Resource version not found', 404);
  }
  if (!version.is_active) throw new AppError('Inactive Resources cannot be launched', 409);
  if (!['html', 'zip', 'scorm', 'simulation'].includes(version.resource_type)) {
    throw new AppError('This Resource type is not executable by the package runtime', 422);
  }

  const runtime = runtimeMetadata(version);
  if (!runtime || (['browser_zip', 'scorm'].includes(runtime.kind) && !runtime.package_prefix)) {
    return {
      launchable: false,
      error_code: 'PACKAGE_NOT_PREPARED',
      message: 'This Resource version was uploaded before browser-package preparation was available.',
      fallback: fallbackFor(version.id),
    };
  }
  const entryPoint = normalizeStudioRuntimePath(
    entryPointOverride || runtime.entry_point || version.entry_point,
    'entry_point',
  );
  if (entryPointOverride) {
    const allowed = (runtime.files || []).some((file) =>
      String(file?.path || '').toLowerCase() === entryPoint.toLowerCase());
    if (!allowed) throw new AppError('Requested SCO launch path is not part of the package', 404);
  }
  if (!TOKEN_SECRET) throw new AppError('Studio runtime signing is not configured', 503);
  const launchToken = jwt.sign(
    {
      purpose: 'studio-resource-runtime',
      resourceVersionId: version.id,
      requestedBy: user.id,
      ...(attemptId ? { scormAttemptId: Number(attemptId) } : {}),
    },
    TOKEN_SECRET,
    { expiresIn: TOKEN_SECONDS }
  );
  return {
    launchable: true,
    resource_id: version.resource_id,
    resource_version_id: version.id,
    launch_url: `/api/studio/runtime/${encodeURIComponent(launchToken)}/${encodeRuntimePath(entryPoint)}`,
    expires_in_seconds: TOKEN_SECONDS,
    sandbox: [
      'allow-scripts',
      'allow-popups',
      'allow-top-navigation-by-user-activation',
      'allow-pointer-lock',
    ],
    controls: {
      reload: true,
      fullscreen: true,
      download: true,
    },
    ...(runtime.kind === 'scorm' ? { scorm: runtime.scorm } : {}),
    fallback: fallbackFor(version.id),
  };
};

const verifyLaunchToken = (launchToken) => {
  if (!TOKEN_SECRET) throw new AppError('Studio runtime signing is not configured', 503);
  try {
    const payload = jwt.verify(launchToken, TOKEN_SECRET);
    if (payload?.purpose !== 'studio-resource-runtime') throw new Error('Wrong token purpose');
    return payload;
  } catch (error) {
    if (error?.name === 'TokenExpiredError') throw new AppError('Runtime launch token expired', 401);
    throw new AppError('Invalid runtime launch token', 401);
  }
};

export const loadRuntimeAsset = async ({ launchToken, requestedPath }) => {
  const payload = verifyLaunchToken(launchToken);
  const versionId = parseId(payload.resourceVersionId, 'Resource version ID');
  const version = await loadVersion(versionId);
  if (!version || !version.is_active) throw new AppError('Resource version is unavailable', 404);
  const runtime = runtimeMetadata(version);
  if (!runtime) throw new AppError('Resource version is not prepared for runtime delivery', 422);

  const assetPath = normalizeStudioRuntimePath(requestedPath, 'Runtime asset path');
  const files = Array.isArray(runtime.files) ? runtime.files : [];
  const file = files.find((candidate) =>
    String(candidate?.path || '').toLowerCase() === assetPath.toLowerCase()
  );
  if (!file) throw new AppError('Runtime asset not found', 404);

  const manifestPath = normalizeStudioRuntimePath(file.path, 'Runtime manifest path');
  const storageKey = runtime.kind === 'single_html'
    ? version.storage_key
    : `${normalizeStudioRuntimePath(runtime.package_prefix, 'Runtime package prefix')}/${manifestPath}`;
  if (!storageKey) throw new AppError('Runtime asset storage is unavailable', 404);
  const { data, error } = await supabase.storage.from(BUCKET).download(storageKey);
  if (error || !data) throw new AppError('Unable to load runtime asset', 502);
  const buffer = Buffer.from(await data.arrayBuffer());
  return {
    buffer,
    mimeType: file.mime_type || mime.lookup(file.path) || 'application/octet-stream',
    etag: createHash('sha256').update(buffer).digest('hex'),
  };
};

export const getRuntimeDownload = async ({ versionId: rawVersionId, user }) => {
  if (!AUTHOR_ROLES.has(user?.role)) throw new AppError('Access denied', 403);
  const versionId = parseId(rawVersionId, 'Resource version ID');
  const version = await loadVersion(versionId);
  if (!version || !canAccessTenant(version.client_id, user)) {
    throw new AppError('Resource version not found', 404);
  }
  if (!version.storage_key) throw new AppError('This Resource version has no downloadable file', 404);
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(version.storage_key, 60, {
      download: version.original_file_name || 'resource',
    });
  if (error || !data?.signedUrl) throw new AppError('Unable to create Resource download link', 502);
  return {
    url: data.signedUrl,
    expires_in_seconds: 60,
    file_name: version.original_file_name,
  };
};

export const getRuntimePreview = async ({ versionId: rawVersionId, user, allowAuthorizedReader = false }) => {
  if (!AUTHOR_ROLES.has(user?.role) && !allowAuthorizedReader) throw new AppError('Access denied', 403);
  const versionId = parseId(rawVersionId, 'Resource version ID');
  const version = await loadVersion(versionId);
  if (!version || !canAccessTenant(version.client_id, user)) {
    throw new AppError('Resource version not found', 404);
  }
  if (!version.storage_key) throw new AppError('This Resource version has no previewable file', 404);
  const previewSeconds = 300;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(version.storage_key, previewSeconds);
  if (error || !data?.signedUrl) throw new AppError('Unable to create Resource preview link', 502);
  return {
    url: data.signedUrl,
    expires_in_seconds: previewSeconds,
    mime_type: version.mime_type,
  };
};
