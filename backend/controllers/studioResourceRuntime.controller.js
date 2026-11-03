import {
  createRuntimeLaunch,
  getRuntimeDownload,
  getRuntimePreview,
  loadRuntimeAsset,
} from '../services/studioResourceRuntime.service.js';
import { handleServiceError } from '../utils/errors.js';
import { studioCdnOrigins } from '../utils/studioCdnOrigins.js';

const respond = (action) => async (req, res) => {
  try {
    // Signed URLs are short-lived credentials and must never be reused from a
    // browser, proxy or service-worker cache after their expiry.
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    return res.json({ data: await action(req) });
  } catch (error) {
    return handleServiceError(res, error, 'Studio runtime request failed');
  }
};

export const launchResourceVersion = respond((req) => createRuntimeLaunch({
  versionId: req.params.versionId,
  user: req.user,
}));

export const downloadResourceVersion = respond((req) => getRuntimeDownload({
  versionId: req.params.versionId,
  user: req.user,
}));

export const previewResourceVersion = respond((req) => getRuntimePreview({
  versionId: req.params.versionId,
  user: req.user,
}));

const frameAncestors = () => {
  const configured = String(process.env.STUDIO_RUNTIME_FRAME_ANCESTORS || process.env.CORS_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => /^https?:\/\//i.test(value));
  const development = process.env.NODE_ENV === 'production'
    ? []
    : ['http://localhost:5100', 'http://localhost:5173'];
  return ["'self'", ...new Set([...configured, ...development])].join(' ');
};

export const serveRuntimeAsset = async (req, res) => {
  // A sandboxed iframe has an opaque origin. Apply these headers before token
  // validation so error responses are visible instead of being replaced by
  // ERR_BLOCKED_BY_RESPONSE.NotSameOrigin in browser developer tools.
  res.removeHeader('X-Frame-Options');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  try {
    const asset = await loadRuntimeAsset({
      launchToken: req.params.launchToken,
      requestedPath: req.params[0],
    });
    const cdnSources = studioCdnOrigins().join(' ');
    res.setHeader(
      'Content-Security-Policy',
      `sandbox allow-scripts allow-popups allow-top-navigation-by-user-activation allow-pointer-lock; ` +
      `default-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval' ${cdnSources}; ` +
      `style-src 'self' 'unsafe-inline' ${cdnSources}; img-src 'self' data: blob: ${cdnSources}; ` +
      `media-src 'self' data: blob: ${cdnSources}; font-src 'self' data: ${cdnSources}; ` +
      `connect-src 'self' ${cdnSources}; frame-src 'self' ${cdnSources}; ` +
      `worker-src 'self' blob: ${cdnSources}; object-src 'none'; ` +
      `base-uri 'none'; form-action 'none'; frame-ancestors ${frameAncestors()}`
    );
    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader('Content-Length', String(asset.buffer.length));
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('ETag', `"${asset.etag}"`);
    return res.status(200).send(asset.buffer);
  } catch (error) {
    return handleServiceError(res, error, 'Unable to serve Studio runtime asset');
  }
};
