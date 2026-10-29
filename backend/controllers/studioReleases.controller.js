import * as releases from '../services/studioReleases.service.js';
import { handleServiceError } from '../utils/errors.js';

const sendError = (res, error) => {
  if (error?.details && error?.status) {
    return res.status(error.status).json({ error: error.message, details: error.details });
  }
  return handleServiceError(res, error, 'Studio release request failed');
};

export const publishSessionRelease = async (req, res) => {
  try {
    const release = await releases.publishSessionRelease({ sessionId: req.params.sessionId, user: req.user });
    return res.status(201).json({ release });
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
