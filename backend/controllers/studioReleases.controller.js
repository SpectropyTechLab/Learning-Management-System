import * as releases from '../services/studioReleases.service.js';
import { createRuntimeLaunch, getRuntimePreview } from '../services/studioResourceRuntime.service.js';
import { handleServiceError } from '../utils/errors.js';

const sendError = (res, error) => {
  if (error?.details && error?.status) {
    return res.status(error.status).json({ error: error.message, details: error.details });
  }
  return handleServiceError(res, error, 'Studio release request failed');
};

const asciiFileName = (value) => String(value || 'document').replace(/[^\x20-\x7E]|["\\]/g, '_');

export const publishSessionRelease = async (req, res) => {
  try {
    const release = await releases.publishSessionRelease({ sessionId: req.params.sessionId, user: req.user });
    return res.status(201).json({ release });
  } catch (error) {
    return sendError(res, error);
  }
};

export const listPublishedChapters = async (req, res) => {
  try {
    return res.json({ data: await releases.listPublishedChapters({ user: req.user }) });
  } catch (error) {
    return sendError(res, error);
  }
};

export const listPublishedSessions = async (req, res) => {
  try {
    return res.json({ data: await releases.listPublishedSessions({ user: req.user }) });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getCurrentPublishedRelease = async (req, res) => {
  try {
    const release = await releases.getCurrentPublishedRelease({
      sessionId: req.params.sessionId,
      user: req.user,
    });
    return res.json({ release });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getPublishedReleaseByNumber = async (req, res) => {
  try {
    const release = await releases.getPublishedReleaseByNumber({
      sessionId: req.params.sessionId,
      releaseNumber: req.params.releaseNumber,
      user: req.user,
    });
    return res.json({ release });
  } catch (error) {
    return sendError(res, error);
  }
};

export const launchPublishedResource = async (req, res) => {
  try {
    const { versionId } = await releases.assertPinnedPublishedResourceAccess({
      releaseId: req.params.releaseId,
      versionId: req.params.versionId,
      user: req.user,
    });
    const data = await createRuntimeLaunch({ versionId, user: req.user, allowAuthorizedReader: true });
    return res.json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const previewPublishedResource = async (req, res) => {
  try {
    const { versionId } = await releases.assertPinnedPublishedResourceAccess({
      releaseId: req.params.releaseId,
      versionId: req.params.versionId,
      user: req.user,
    });
    const data = await getRuntimePreview({ versionId, user: req.user, allowAuthorizedReader: true });
    return res.json({ data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getPublishedTeachingMaterials = async (req, res) => {
  try {
    const materials = await releases.getPublishedTeachingMaterials({
      releaseId: req.params.releaseId,
      user: req.user,
    });
    return res.json({ data: materials });
  } catch (error) {
    return sendError(res, error);
  }
};

export const downloadPublishedSessionPlan = async (req, res) => {
  try {
    const result = await releases.downloadPublishedSessionPlan({ releaseId: req.params.releaseId, user: req.user });
    const encodedName = encodeURIComponent(result.fileName);
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Length', String(result.sizeBytes));
    res.setHeader('Content-Disposition', `attachment; filename="${asciiFileName(result.fileName)}"; filename*=UTF-8''${encodedName}`);
    res.setHeader('X-Content-SHA256', result.sha256);
    res.setHeader('X-Studio-Document-Revision', String(result.revisionNo));
    return res.send(result.bytes);
  } catch (error) {
    return sendError(res, error);
  }
};

export const getCurrentTeacherRelease = async (req, res) => {
  try {
    const release = await releases.getCurrentTeacherRelease({ sessionId: req.params.sessionId, user: req.user });
    return res.json({ release });
  } catch (error) {
    return sendError(res, error);
  }
};

export const listTeacherReleases = async (req, res) => {
  try {
    const releaseList = await releases.listTeacherReleases({ sessionId: req.params.sessionId, user: req.user });
    return res.json({ releases: releaseList });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getTeacherReleaseByNumber = async (req, res) => {
  try {
    const release = await releases.getTeacherReleaseByNumber({
      sessionId: req.params.sessionId,
      releaseNumber: req.params.releaseNumber,
      user: req.user,
    });
    return res.json({ release });
  } catch (error) {
    return sendError(res, error);
  }
};
